const axios = require("axios");

// 签名相关方法模块
module.exports = {
    async getSig56_1(data) {
        // BASE64 解码
        data = JSON.parse(Buffer.from(data, "base64").toString("utf-8"));
        try {
            let { body: res } = await axios.request({
                timeout: 10000,
                url: this.signApi + "/sig56_1",
                headers: {
                    "Content-Type": "application/json",
                    "User-Agent": "Mozilla/5.0",
                },
                method: "POST",
                data: data,
            });
            return res;
        } catch (e) {
            this.$.log(`❌ 账号 [${this.index}] 获取 sig56_1 失败：${e.message}`);
            return null;
        }
    },

    async getSig68(query, data, method, type, cookie) {
        // BASE64 解码
        query = JSON.parse(Buffer.from(query, "base64").toString("utf-8"));
        data = JSON.parse(Buffer.from(data, "base64").toString("utf-8"));
        method = method.toLowerCase();
        try {
            let { body: res } = await axios.request({
                timeout: 10000,
                url: this.signApi + "/sig68",
                headers: {
                    "Content-Type": "application/json",
                    "User-Agent": "Mozilla/5.0",
                },
                method: "POST",
                data: { query, data, method, type, cookie },
            });
            return res?.result;
        } catch (e) {
            this.$.log(`❌ 账号 [${this.index}] 获取 sig68 失败：${e.message}`);
            return null;
        }
    },

    async getSig56_2(data, cookie) {
        try {
            let { body: res } = await axios.request({
                timeout: 10000,
                url: this.signApi + "/sig56_2",
                headers: {
                    "Content-Type": "application/json",
                    "User-Agent": "Mozilla/5.0",
                },
                method: "POST",
                data: { data, cookie },
            });
            return res;
        } catch (e) {
            this.$.log(`❌ 账号 [${this.index}] 获取 sig56_2 失败：${e.message}`);
            return null;
        }
    },

    // 添加重试机制的 loadReqParams 方法
    async loadReqParams(path, postdata, salt) {
        const maxRetries = 3; // 最大重试次数
        let retryCount = 0;

        while (retryCount < maxRetries) {
            try {
                let queryData = {
                    mod: this.mod,
                    appver: this.appver,
                    language: this.language,
                    ud: this.userId,
                    did_tag: this.did_tag,
                    egid: this.egid,
                    kpf: this.kpf,
                    oDid: this.oDid,
                    kpn: this.kpn,
                    newOc: this.newOc,
                    androidApiLevel: this.androidApiLevel,
                    browseType: this.browseType,
                    socName: this.socName,
                    c: this.c,
                    abi: this.abi,
                    ftt: this.ftt,
                    userRecoBit: this.userRecoBit,
                    device_abi: this.device_abi,
                    grant_browse_type: this.grant_browse_type,
                    iuid: this.iuid,
                    rdid: this.rdid,
                    did: this.did,
                    // 使用从 cookie 获取或默认值的参数

                    earphoneMode: "1",
                    isp: "",
                    thermal: "10000",
                    net: "WIFI",
                    kcv: "1599",
                    app: "0",
                    bottom_navigation: "true",
                    ver: this.appver
                        ? this.appver.split(".")[0] + "." + this.appver.split(".")[1]
                        : "13.8",
                    android_os: "0",
                    boardPlatform: "sdm660",
                    slh: "0",
                    country_code: "cn",
                    nbh: "130",
                    hotfix_ver: "",
                    did_gt: "1761129025119",
                    keyconfig_state: "2",
                    cdid_tag: "7",
                    sys: "ANDROID_" + (this.osVersion || "15"),
                    max_memory: "256",
                    cold_launch_time_ms: "1761380491706",
                    oc: this.mod || "XIAOMI",
                    sh: "2280",
                    deviceBit: "0",
                    ddpi: "440",
                    is_background: "0",
                    sw: "1080",
                    apptype: "22",
                    icaver: "1",
                    totalMemory: "5724",
                    sbh: "82",
                    darkMode: "false",
                };

                let reqdata = {
                    path: path,
                    salt: salt,
                    data: this.$.queryStr(postdata) + "&" + this.$.queryStr(queryData),
                };
                let { body: nssig } = await axios.request({
                    timeout: 10000,
                    url: this.signApi + "/nssig",
                    headers: {
                        "Content-Type": "application/json",
                        "User-Agent": "Mozilla/5.0",
                    },
                    method: "POST",
                    data: reqdata,
                });

                if (nssig && nssig.data) {
                    Object.assign(queryData, {
                        sig: nssig.data.sig,
                        __NS_xfalcon: nssig.data.nssig4 || "",
                        __NStokensig: nssig.data.nstokensig,
                        __NS_sig3: nssig.data.nssig3,
                    });
                    return {
                        queryData: queryData,
                        headersData: {
                            kaw: nssig.data.kaw || "默认值",
                            kas: nssig.data.kas || "默认值",
                        },
                    };
                } else {
                    this.$.log(`❌ 账号 [${this.index}] 获取 nssig 失败，状态异常`);
                    throw new Error("nssig 状态异常");
                }
            } catch (e) {
                retryCount++;
                if (retryCount < maxRetries) {
                    const waitTime = Math.floor(Math.random() * (60 - 30 + 1)) + 30; // 30-60 秒随机等待
                    this.$.log(
                        `🔄 账号 [${this.index}] 获取 nssig 失败，第${retryCount}次重试，等待${waitTime}秒后继续...`
                    );
                    await this.$.wait(waitTime * 1000);
                } else {
                    this.$.log(`❌ 账号 [${this.index}] 获取 nssig 失败，已达最大重试次数`);
                    return null;
                }
            }
        }
    },

    // 添加重试机制的 encsign 方法
    async encsign(data) {
        const maxRetries = 3; // 最大重试次数
        let retryCount = 0;

        while (retryCount < maxRetries) {
            try {
                let { body: result } = await axios.request({
                    timeout: 10000,
                    url: this.signApi + "/encsign",
                    headers: {
                        "Content-Type": "application/json",
                        "User-Agent": "Mozilla/5.0",
                    },
                    method: "POST",
                    data: data,
                });

                if (result && result.data) {
                    return result.data;
                } else {
                    this.$.log(`❌ 账号[${this.index}] 获取 encsign 失败，状态异常`);
                    throw new Error("encsign 状态异常");
                }
            } catch (e) {
                retryCount++;
                if (retryCount < maxRetries) {
                    const waitTime = Math.floor(Math.random() * (60 - 30 + 1)) + 30; // 30-60 秒随机等待
                    this.$.log(
                        `🔄 账号[${this.index}] 获取 encsign 失败，第${retryCount}次重试，等待${waitTime}秒后继续...`
                    );
                    await this.$.wait(waitTime * 1000);
                } else {
                    this.$.log(`❌ 账号[${this.index}] 获取 encsign 失败，已达最大重试次数`);
                    return null;
                }
            }
        }
    },
};
