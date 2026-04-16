const axios = require("axios");
const {
    REQUIRED_COOKIE_KEYS,
    parseCookieString,
    buildCookieString,
    generateRandomPhoneModel,
    getRandomItem,
    readEnvNumber,
    readEnvString,
    readEnvBooleanString,
    parseCsvList,
} = require("./utils");

class TaskBase {
    constructor(env, config) {
        this.index = config.$.userIdx++;
        this.user = env.split(config.strSplitor);
        //遍历 CK 如果某一项的值存在空格则编码
        this.ck = this.user[0];
        this.salt = this.user[1];
        this.sock = null;
        this.nickname = null;
        this.ksextratask = config.ksextratask;
        // 新增：是否追加广告控制
        this.isAdAddEnabled = config.ksisadadd;
        this.apiac = "";
        // 新增：当前收益属性
        this.currentEarnings = 0;
        // 新增：最大金币限制
        this.maxReward = config.ksmaxreward;
        if (!Number.isFinite(this.maxReward) || this.maxReward < 0) {
            this.maxReward = config.DEFAULT_MAX_REWARD;
        }

        // 新增：待上报金币
        this.pendingCoins = 0;

        // 新增：停止标志
        this.shouldStop = false;
        this.stopReason = "";
        this.puid = "";

        // 广告配置 - 修改为单次运行次数
        this.adConfigs = {
            look: {
                pageId: 11101,
                type: "look",
                name: "看广告",
                businessId: 672,
                subPageId: 100026367,
                posId: 24067,
                isAdadd: false,
                count: config.ksmaxtask_look,
                emoji: "📺",
                extraTask: false,
            },
            look2: {
                pageId: 11101,
                type: "look2",
                name: "看广告 2",
                businessId: 672,
                subPageId: 100026367,
                posId: 0,
                isAdadd: false,
                count: config.ksmaxtask_look,
                emoji: "📺",
                extraTask: false,
            },
            food: {
                pageId: 11101,
                type: "food",
                name: "饭补广告",
                businessId: 9362,
                subPageId: 100029907,
                posId: 29741,
                isAdadd: false,
                count: config.ksmaxtask_food,
                emoji: "🍚",
                extraTask: false,
            },
            box: {
                pageId: 11101,
                type: "box",
                name: "宝箱广告",
                businessId: 606,
                subPageId: 100024064,
                posId: 20346,
                isAdadd: false,
                count: config.ksmaxtask_box,
                emoji: "📦",
                extraTask: false,
            },
            search: {
                type: "search",
                name: "搜索广告",
                pageId: 11014,
                businessId: 7076,
                subPageId: 100161537,
                posId: 216268,
                isAdadd: false,
                count: config.ksmaxtask_search,
                emoji: "🔍",
                extraTask: false,
            },
        };

        // 用户和设备信息
        this.userId = null;
        this.did = null;
        this.socks5 = null;
        this.adaddnum = 0; // 广告追加次数计数器
        this.wwip = "";
        this.nwip = "192.168.31." + "222";

        // 当前广告配置
        this.currentAdConfig = null;

        // 广告类型启用状态
        this.adTypesEnabled = {
            look: true,
            box: true,
            food: true,
            search: true,
        };

        // 收益统计
        this.coinStats = {
            total: 0,
            byType: {
                look: 0,
                look2: 0,
                box: 0,
                food: 0,
                search: 0,
            },
        };

        // look 任务冷却状态
        this.lookTaskCooling = false;
        this.lookTaskCoolingReason = "";

        // look 任务触发状态
        this.lookTaskTriggered = false;

        // Cookie 解析后的属性 - 新增参数初始化
        this.mod = null;
        this.appver = null;
        this.language = null;
        this.did_tag = null;
        this.egid = null;
        this.kpf = null;
        this.oDid = null;
        this.kpn = null;
        this.newOc = null;
        this.androidApiLevel = null;
        this.browseType = null;
        this.socName = null;
        this.c = null;
        this.ftt = null;
        this.abi = null;
        this.userRecoBit = null;
        this.device_abi = null;
        this.grant_browse_type = null;
        this.iuid = null;
        this.rdid = null;

        // 新增参数初始化
        this.earphoneMode = null;
        this.isp = null;
        this.thermal = null;
        this.net = null;
        this.kcv = null;
        this.app = null;
        this.bottom_navigation = null;
        this.ver = null;
        this.android_os = null;
        this.boardPlatform = null;
        this.slh = null;
        this.country_code = null;
        this.nbh = null;
        this.hotfix_ver = null;
        this.did_gt = null;
        this.keyconfig_state = null;
        this.cdid_tag = null;
        this.sys = null;
        this.max_memory = null;
        this.cold_launch_time_ms = null;
        this.oc = null;
        this.sh = null;
        this.deviceBit = null;
        this.ddpi = null;
        this.is_background = null;
        this.sw = null;
        this.apptype = null;
        this.icaver = null;
        this.totalMemory = null;
        this.sbh = null;
        this.darkMode = null;

        // API 签名相关
        this.api_st = "";

        // 广告任务参数
        this.neoParams = "";
        this.extParams = "";

        // 设备标识
        this.oaid = "";
        this.osVersion = "";
        this.uQaTag =
            "16385#33333333338888888888#cmWns:-1#swRs:99#swLdgl:-0#ecPp:-9#cmNt:-1#cmHs:-1";
        this.deviceModel = generateRandomPhoneModel();
        this.cookieMap = null;

        // 配置引用
        this.$ = config.$;
        this.signApi = config.signApi;
        this.ksispasslive = config.ksispasslive;
        this.ksnoDelay = config.ksnoDelay;
        this.task = config.task;
        this.kssearch = config.kssearch;
        this.searchKey = config.searchKey;
        this.invite = config.invite;
        this.invite2 = config.invite2;
        this.ksdailytask = config.ksdailytask;
    }

    // 新增：检查是否达到最大金币限制
    checkMaxReward() {
        if (this.maxReward > 0 && this.coinStats.total >= this.maxReward) {
            this.shouldStop = true;
            this.stopReason = `已达到最大金币限制 ${this.maxReward}`;
            return true;
        }
        return false;
    }

    randomUserAgent() {
        return this.deviceModel;
    }

    getAndroidWebViewUA() {
        return `Mozilla/5.0 (Linux; Android ${this.osVersion}; ${this.randomUserAgent()}; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/80.0.3987.99 Mobile Safari/537.36 Yoda/3.2.16-rc21 ksNebula/13.9.10.10684 OS_PRO_BIT/64 MAX_PHY_MEM/5724 KDT/PHONE AZPREFIX/az3 ICFO/0 StatusHT/29 TitleHT/44 NetType/WIFI ISLP/0 ISDM/0 ISLB/0 locale/zh-cn SHP/2068 SWP/1080 SD/2.75 CT/0 ISLM/0`;
    }

    checkCookieVariables() {
        const cookieObj = parseCookieString(this.ck, { encodeValues: true });
        this.cookieMap = cookieObj;
        if (Object.keys(cookieObj).length > 0) {
            this.ck = buildCookieString(cookieObj);
        }

        const result = {};
        REQUIRED_COOKIE_KEYS.forEach((variable) => {
            result[variable] = Object.prototype.hasOwnProperty.call(cookieObj, variable);
        });

        this.api_st = cookieObj["kuaishou.api_st"] || "";

        REQUIRED_COOKIE_KEYS.forEach((prop) => {
            this[prop] = cookieObj[prop];
        });

        return result;
    }

    getCookieValue(name, fallback = "") {
        const cookieObj = this.cookieMap || parseCookieString(this.ck);
        return cookieObj[name] || fallback;
    }

    getOaid() {
        return this.getCookieValue("oaid", "93ece41c64ee5262");
    }

    getOsVersion() {
        return this.getCookieValue("osVersion", "10");
    }

    setupOaidAndOsVersion() {
        this.oaid = this.getOaid();
        this.osVersion = this.getOsVersion();

        if (this.oaid == "5c15e5ccdf00630110d533a5577a42a98a69d963") {
            this.$.log(
                `账号[${this.index}] 您未在 Cookie 添加 oaid=自己的 OAID; [16 位]; 按默认 oaid=5c15e5ccdf00630110d533a5577a42a98a69d963 执行标准 [OAID 抓包]/overview/tasks 域名中的 oaid`
            );
        }

        if (this.osVersion == "10" || this.oaid == "9e4bb0e5bc326fb1") {
            // 提示用户获取正确的 oaid 和 osVersion
        }
    }

    async setupProxy() {
        if (this.user.length > 2) {
            this.sock = this.user[2];
            if (
                this.sock &&
                (this.sock.includes("socks://") || this.sock.includes("socks5://"))
            ) {
                this.$.log(`账号[${this.index}] socks 代理兼容格式 [${this.sock}]`);
                try {
                    const { SocksProxyAgent } = require("socks-proxy-agent");
                    this.socks5 = new SocksProxyAgent(this.sock, { timeout: 30 * 1000 });
                    let { data: ip } = await axios.request({
                        url: "https://www.baidu.com/",
                        method: "GET",
                        timeout: 30 * 1000,
                        httpsAgent: this.socks5,
                        proxy: false,
                        httpAgent: this.socks5,
                        headers: {
                            "User-Agent":
                                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                        },
                    });
                    this.$.log(`账号[${this.index}] 代理检测 成功 `);
                } catch (error) {
                    this.socks5 = null;
                    this.$.log(`账号[${this.index}] socks 代理错误`);
                }
            } else if (
                this.sock &&
                this.sock.includes("|") &&
                this.sock.split("|").length == 4
            ) {
                this.sock = this.user[2].split("|");
                this.$.log(`账号[${this.index}] socks 代理 万安格式 [${this.sock}]`);
                this.socks5 = new SocksProxyAgent(
                    {
                        hostname: this.sock[0],
                        port: this.sock[1],
                        username: this.sock[2],
                        password: this.sock[3],
                    },
                    { timeout: 30 * 1000 }
                );
            } else {
                this.$.log(
                    `账号[${this.index}] 代理不存在/错误格式 [socks5://] 采用直连模式`
                );
            }
        } else {
            try {
                let { data: ip } = await axios.request({
                    url: "https://www.baidu.com/",
                    method: "GET",
                    timeout: 30 * 1000,
                });

                this.$.log(`账号[${this.index}] 代理不存在 采用直连模式 `);
            } catch (e) { }
        }
    }

    async getPuid() {
        let data = {
            cs: "false",
            client_key: "2ac2a76d",
            videoModelCrowdTag: "1_91",
            os: "android",
            "kuaishou.api_st": this.api_st,
            uQaTag: this.uQaTag,
        };

        // 需要从外部注入 loadReqParams 方法
        let reqParams = await this.loadReqParams(
            "/rest/nebula/user/take/puid",
            data,
            this.salt
        );
        if (reqParams == null) {
            return null;
        }

        let { data: res } = await axios.request({
            url: "https://az1-api-js.gifshow.com/rest/nebula/user/take/puid",
            params: reqParams.queryData,
            proxy: false,
            httpAgent: this.socks5,
            httpsAgent: this.socks5,
            method: "POST",
            timeout: 30 * 1000,
            headers: {
                kaw: reqParams.headersData.kaw,
                kas: reqParams.headersData.kas,
                "Content-Type": "application/x-www-form-urlencoded",
                "User-Agent": "kwai-android aegon/4.28.0",
                Cookie: "kuaishou.api_st=" + this.api_st,
            },
            data: data,
        });
        if (res.result == 1 && res.pUid) {
            this.puid = res.pUid;
            return true;
        }
    }

    async executeInviteTasks() {
        if (this.invite.length > 0) {
            for (let i of this.invite) {
                await this.taskInvite1(i);
            }
        }
        if (this.invite2.length > 0) {
            for (let i of this.invite2) {
                await this.taskInvite2(i);
            }
        }
    }
}

module.exports = TaskBase;
