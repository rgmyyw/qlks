/**
 * 快手极速版任务脚本
 * 原始文件：qlks.js
 * 拆分时间：2026-04-16
 */

const axios = require("axios");

// 引入模块
const {
    SIGN_API_KUAISHOU,
    SIGN_API_NEBULA,
    DEFAULT_MAX_REWARD,
    DEFAULT_TASKS,
    DEFAULT_SEARCH_KEYS,
    DEFAULT_DAILY_TASKS,
    readEnvNumber,
    readEnvString,
    readEnvBooleanString,
    parseCsvList,
    shuffleList,
    splitIntoChunks,
} = require("./modules/utils");

const UserDataManager = require("./modules/userDataManager");
const TaskBase = require("./modules/taskBase");

// 引入 Task 类的方法模块
const taskSignMethods = require("./modules/taskSign");
const taskAdMethods = require("./modules/taskAd");
const taskActionMethods = require("./modules/taskAction");

// 环境变量读取
let banUserId = [];
let ksmaxtask_look = readEnvNumber("ksmaxtask_look", 50, { min: 0 });
let ksmaxtask_food = readEnvNumber("ksmaxtask_food", 5, { min: 0 });
let ksmaxtask_box = readEnvNumber("ksmaxtask_box", 5, { min: 0 });
let ksmaxtask_search = readEnvNumber("ksmaxtask_search", 25, { min: 0 });
let ksnoDelay = readEnvBooleanString("ksnoDelay", false);
let ksmaxreward = readEnvNumber("ksmaxreward", DEFAULT_MAX_REWARD, { min: 0 });
let ksTaskNum = readEnvNumber("ksTaskNum", 10, { min: 1, max: 10 });
let ksispasslive = readEnvString("ksispasslive", "true");
let ksisadadd = process.env["ksisadadd"] !== "false";
let kssearch = parseCsvList(process.env["kssearch"], DEFAULT_SEARCH_KEYS);
let ksextratask = readEnvString("ksextratask", "true");
let kstask = readEnvString("kstask", "look,box,food,search");
let ksdailytask = parseCsvList(process.env["ksdailytask"], DEFAULT_DAILY_TASKS);
let ksuserinvite = parseCsvList(process.env["ksuserinvite"], []);

// 默认使用极速版签名接口
let signApi = SIGN_API_NEBULA;

// 尝试加载 notify
let notify;
try {
    notify = require("./sendNotify.js");
} catch (e) {
    notify = {
        sendNotify: async function (title, content) { },
    };
}

const defaultUserAgent = "kwai-android aegon/4.28.0";

// 创建全局用户数据管理器实例
const userDataManager = new UserDataManager();

// Env 类
function Env(t, s) {
    return new (class {
        constructor(t, s) {
            this.userIdx = 1;
            this.userList = [];
            this.userCount = 0;
            this.name = t;
            this.notifyStr = [];
            this.logSeparator = "\n";
            this.startTime = new Date().getTime();
            Object.assign(this, s);
            this.log(`🔔${this.name},开始!`);
        }

        checkEnv(ckName) {
            let userCookie = (this.isNode() ? process.env[ckName] : "") || "";
            this.userList = userCookie.split(envSplitor.find((o) => userCookie.includes(o)) || "&").filter((n) => n);
            this.userCount = this.userList.length;
            this.log(`共找到${this.userCount}个账号`);
        }

        async sendMsg() {
            this.log("==============📣Center 通知📣==============")
            for (let i = 0; i < this.notifyStr.length; i++) {
                if (Object.prototype.toString.call(this.notifyStr[i]) === '[object Object]' ||
                    Object.prototype.toString.call(this.notifyStr[i]) === '[object Array]') {
                    this.notifyStr[i] = JSON.stringify(this.notifyStr[i]);
                }
            }
            let message = this.notifyStr.join(this.logSeparator);
            if (this.isNode()) {
                await notify.sendNotify(this.name, message);
            }
        }

        isNode() {
            return "undefined" != typeof module && !!module.exports;
        }

        queryStr(options) {
            const querystring = require("querystring");
            return querystring.stringify(options);
        }

        getURLParams(url) {
            const params = {};
            const queryString = url.split("?")[1];
            if (queryString) {
                const paramPairs = queryString.split("&");
                paramPairs.forEach((pair) => {
                    const [key, value] = pair.split("=");
                    params[key] = value;
                });
            }
            return params;
        }

        isJSONString(str) {
            try {
                return JSON.parse(str) && typeof JSON.parse(str) === "object";
            } catch (e) {
                return false;
            }
        }

        isJson(obj) {
            var isjson =
                typeof obj == "object" &&
                Object.prototype.toString.call(obj).toLowerCase() ==
                "[object object]" &&
                !obj.length;
            return isjson;
        }

        randomNumber(length) {
            const characters = "0123456789";
            return Array.from(
                { length },
                () => characters[Math.floor(Math.random() * characters.length)]
            ).join("");
        }

        randomString(length) {
            const characters = "abcdefghijklmnopqrstuvwxyz0123456789";
            return Array.from(
                { length },
                () => characters[Math.floor(Math.random() * characters.length)]
            ).join("");
        }

        uuid() {
            return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
                /[xy]/g,
                function (c) {
                    var r = (Math.random() * 16) | 0,
                        v = c == "x" ? r : (r & 0x3) | 0x8;
                    return v.toString(16);
                }
            );
        }

        time(t) {
            let s = {
                "M+": new Date().getMonth() + 1,
                "d+": new Date().getDate(),
                "H+": new Date().getHours(),
                "m+": new Date().getMinutes(),
                "s+": new Date().getSeconds(),
                "q+": Math.floor((new Date().getMonth() + 3) / 3),
                S: new Date().getMilliseconds(),
            };
            /(y+)/.test(t) &&
                (t = t.replace(
                    RegExp.$1,
                    (new Date().getFullYear() + "").substr(4 - RegExp.$1.length)
                ));
            for (let e in s) {
                new RegExp("(" + e + ")").test(t) &&
                    (t = t.replace(
                        RegExp.$1,
                        1 == RegExp.$1.length
                            ? s[e]
                            : ("00" + s[e]).substr(("" + s[e]).length)
                    ));
            }
            return t;
        }

        log(content) {
            this.notifyStr.push(content)
            console.log(content)
        }

        wait(t) {
            if (ksnoDelay === "true") {
                // 如果开启无延迟模式，立即返回
                return Promise.resolve();
            }
            return new Promise((s) => setTimeout(s, t));
        }

        async done(t = {}) {
            await this.sendMsg();
            const s = new Date().getTime(),
                e = (s - this.startTime) / 1e3;
            this.log(
                `\ud83d\udd14${this.name},\u7ed3\u675f!\ud83d\udd5b ${e}\u79d2`
            );
            if (this.isNode()) {
                process.exit(1);
            }
        }
    })(t, s);
}

const $ = new Env("快手极速版");
let ckName = `ksck`;
const strSplitor = "#";
const envSplitor = ["&", "\n"];

// 钉钉通知配置
const DINGTALK_WEBHOOK = process.env.DINGTALK_WEBHOOK || "";

// 发送钉钉通知
async function sendDingTalkNotification(title, content) {
    if (!DINGTALK_WEBHOOK) {
        console.log("未配置钉钉 Webhook，跳过通知发送");
        return;
    }

    try {
        await axios.post(DINGTALK_WEBHOOK, {
            msgtype: "markdown",
            markdown: {
                title: title,
                text: `## ${title}\n\n${content}\n\n时间：${new Date().toLocaleString("zh-CN")}`
            }
        }, {
            timeout: 5000,
            headers: { "Content-Type": "application/json" }
        });
        console.log("钉钉通知发送成功");
    } catch (e) {
        console.log(`钉钉通知发送失败：${e.message}`);
    }
}

// 测试签名 API
async function testApi(url) {
    try {
        const res = await axios.get(url + "/ping", {
            timeout: 5 * 1000,
            headers: {
                "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
            },
        });
        return res.data.status;
    } catch (e) {
        return false;
    }
}

// 选择可用的签名 API
async function selectAvailableSignApi(candidateUrls) {
    const shuffledUrls = shuffleList(candidateUrls || []);
    $.log(`开始测试签名 API 可用性，共有 ${shuffledUrls.length} 个候选 API`);

    for (const url of shuffledUrls) {
        try {
            const testResult = await testApi(url);
            if (testResult) {
                $.log(`✅ API 测试成功：${url}`);
                return url;
            }
            $.log(`❌ API 测试失败：${url}`);
        } catch (error) {
            $.log(`❌ API 测试异常：${url}, 错误：${error.message}`);
        }
    }

    return null;
}

// 获取服务器时间
async function getServerTime() {
    try {
        const { data: res } = await axios.get(
            "https://vv.video.qq.com/checktime?otype=json"
        );
        if (!res) return false;
        let response = res.split("QZOutputJson=")[1].split(";")[0];

        return JSON.parse(response).t;
    } catch (e) {
        return false;
    }
}

// 构建完整的 Task 类
function createTaskClass(config) {
    class Task extends TaskBase {
        constructor(env) {
            super(env, config);
        }
    }

    // 将方法模块混合到 Task 原型
    Object.assign(Task.prototype, taskSignMethods);
    Object.assign(Task.prototype, taskAdMethods);
    Object.assign(Task.prototype, taskActionMethods);

    return Task;
}

// 主函数
!(async () => {
    // 测试签名 API 可用性
    const signApiUrls = [SIGN_API_NEBULA, SIGN_API_KUAISHOU].filter(Boolean);
    const availableSignApi = await selectAvailableSignApi(signApiUrls);

    if (!availableSignApi) {
        $.log("❌ 所有签名 API 均不可用，脚本退出");
        await sendDingTalkNotification(
            "⚠️ 快手脚本错误通知",
            `**所有签名 API 均不可用**\n\n请检查签名服务是否正常运行。\n\n候选 API 列表:\n${signApiUrls.join("\n")}`
        );
        return;
    }

    signApi = availableSignApi;
    $.log(`🟢 使用签名 API: ${signApi}`);

    $.log(`🔄 强制无延迟模式：${ksnoDelay === "true" ? "开启" : "关闭"}`);
    $.log(`\n📋 脚本配置变量汇总:`);
    $.log(`═`.repeat(50));
    $.log(`📺 看广告任务次数：${ksmaxtask_look}`);
    $.log(`🍚 饭补广告任务次数：${ksmaxtask_food}`);
    $.log(`📦 宝箱广告任务次数：${ksmaxtask_box}`);
    $.log(`🔍 搜索广告任务次数：${ksmaxtask_search}`);
    $.log(`💰 最大金币限制：${ksmaxreward}`);
    $.log(`👥 并发任务数：${ksTaskNum}`);
    $.log(`🎯 执行任务类型：${parseCsvList(kstask, DEFAULT_TASKS).join(",")}`);
    $.log(`⚡ 是否跳过直播：${ksispasslive || "未设置"}`);
    $.log(`🔄 广告追加模式：${ksisadadd ? "开启" : "关闭"}`);
    $.log(`🔧 额外任务开关 [可超 2500]: ${ksextratask} `);
    $.log(`👥 用户邀请码：${ksuserinvite.length > 0 ? "已设置" : "未设置"}`);
    $.log(`═`.repeat(50));

    let loacltime = Math.floor(Date.now() / 1000);
    let serverTime = await getServerTime();

    if (Math.abs(loacltime - serverTime) > 1800) {
        $.log("时间错误，请校准本地时间");
    }
    $.checkEnv(ckName);
    $.log(`正在加载广告配置`);
    const concurrency = ksTaskNum;
    $.log(`设置并发数为：${concurrency} 个账号`);
    $.log("读取到任务变量配置 " + JSON.stringify(parseCsvList(kstask, DEFAULT_TASKS)));
    $.log("读取到搜索词变量配置 " + JSON.stringify(kssearch));
    $.log("读取到日常任务变量配置 " + JSON.stringify(ksdailytask));

    let userEarnings = []; // 存储所有账号收益

    // 创建 Task 类
    const TaskClass = createTaskClass({
        $,
        strSplitor,
        DEFAULT_MAX_REWARD,
        ksmaxtask_look,
        ksmaxtask_food,
        ksmaxtask_box,
        ksmaxtask_search,
        ksmaxreward,
        ksextratask,
        ksisadadd,
        ksispasslive,
        ksnoDelay,
        task: parseCsvList(kstask, DEFAULT_TASKS),
        kssearch,
        searchKey: "",
        invite: [],
        invite2: [],
        ksdailytask,
        signApi,
    });

    // 并发执行账号任务
    const userChunks = splitIntoChunks($.userList, concurrency);

    for (let chunkIndex = 0; chunkIndex < userChunks.length; chunkIndex++) {
        const chunk = userChunks[chunkIndex];
        $.log(
            `\n🚀 开始执行第 ${chunkIndex + 1} 批账号，共 ${chunk.length} 个账号`
        );

        const chunkPromises = chunk.map(async (user) => {
            try {
                let taskInstance = new TaskClass(user);
                let totalCoins = await taskInstance.run(userDataManager);
                userEarnings.push({
                    index: taskInstance.index,
                    total: totalCoins,
                    summary: taskInstance.getCoinSummary(),
                    userId: taskInstance.userId,
                });
            } catch (error) {
                $.log(`❌ 账号执行出错：${error}`);
            }
        });

        // 等待当前批次的所有账号完成
        await Promise.all(chunkPromises);

        // 如果不是最后一批，等待一段时间再执行下一批
        if (chunkIndex < userChunks.length - 1) {
            const waitTime = 10; // 等待 10 秒
            $.log(`⏰ 等待${waitTime}秒后执行下一批账号...`);
            await $.wait(waitTime * 1000);
        }
    }

    // 全局收益汇总
    $.log("\n🎊🎊🎊 全局收益汇总 🎊🎊🎊");
    $.log("═".repeat(50));

    let grandTotal = 0;
    userEarnings.forEach((user) => {
        $.log(`账号[${user.index}] 总收益：${user.total} 金币`);
        grandTotal += user.total;
    });

    $.log("─".repeat(50));
    $.log(`💰 所有账号总收益：${grandTotal} 金币`);

    // 估算现金价值 (按常见比例 10000 金币 ≈ 1 元)
    const estimatedCash = (grandTotal / 10000).toFixed(2);
    $.log(`💵 预估现金价值：约 ${estimatedCash} 元`);
    $.log("═".repeat(50));

    // 显示用户使用统计信息
    $.log("\n📊 用户使用统计:");
    $.log("═".repeat(50));

    const allUserStats = userDataManager.getAllUserStats();
    allUserStats.forEach((userStats) => {
        $.log(`用户 ${userStats.userId}:`);
        $.log(`  🕐 首次使用：${userStats.firstUseTime}`);
        $.log(`  📈 初始收益：${userStats.initialEarnings} 金币`);
        $.log(`  💰 今日收益：${userStats.todayEarnings} 金币`);
        $.log(`  🏆 历史最高：${userStats.totalEarnings} 金币`);
        $.log(`  🔢 使用次数：${userStats.usageCount} 次`);
        $.log(`  ⏰ 最后更新：${userStats.lastUpdate}`);
        $.log("");
    });

    // 保存用户数据
    userDataManager.saveUserData();

    // 将汇总信息添加到通知
    let notifySummary = `【快手极速版任务汇总】\n`;
    notifySummary += `总账号数：${userEarnings.length}\n`;
    notifySummary += `总金币收益：${grandTotal}\n`;
    notifySummary += `预估现金：${estimatedCash}元\n\n`;

    userEarnings.forEach((user) => {
        notifySummary += `账号${user.index}: ${user.total}金币\n`;
    });

    $.notifyStr.push(notifySummary);
    if (banUserId.length > 0) {
        $.log("未进行支付的 userId 列表:" + banUserId.join(","));
    }

    // 发送钉钉完成通知（可选）
    if (DINGTALK_WEBHOOK && userEarnings.length > 0) {
        const notifySummary = `**执行完成**\n\n` +
            `总账号数：${userEarnings.length}\n` +
            `总金币收益：${grandTotal}\n` +
            `预估现金：${estimatedCash}元`;
        await sendDingTalkNotification("✅ 快手脚本执行完成", notifySummary);
    }
})()
    .catch((e) => {
        console.log(e);
        // 发送错误通知
        sendDingTalkNotification("❌ 快手脚本错误通知", `**脚本执行异常**\n\n错误信息：${e.message}`);
    })
    .finally(() => $.done());
