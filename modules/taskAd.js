const axios = require("axios");

// 广告相关方法模块
module.exports = {
    // 加载广告信息
    loadAdInfo(type) {
        const config = this.adConfigs[type];

        // 修改：使用标识符来决定 requestSceneType
        let requestSceneType = 1;

        // 否则使用原来的逻辑
        if (this.isAdAddEnabled && this.adaddnum != 0) {
            requestSceneType = 7;
        }

        let impExtData = JSON.stringify({
            openH5AdCount: 0,
            sessionLookedCompletedCount: this.isAdAddEnabled ? this.adaddnum : 0,
            sessionType: "1",
            neoParams: this.neoParams,
        });

        if (this.currentAdConfig["type"] == "search") {
            impExtData = JSON.stringify({
                openH5AdCount: 0,
                sessionLookedCompletedCount: this.isAdAddEnabled ? this.adaddnum : 0,
                sessionType: "1",
                searchKey: this.searchKey,
                triggerType: "2",
                disableReportToast: true,
                businessEnterAction: "7",
                neoParams:
                    "eyJwYWdlSWQiOiAxMTAxNCwgInN1YlBhZ2VJZCI6IDEwMDE2MTUzNywgInBvc0lkIjogMjE2MjY4LCAiYnVzaW5lc3NJZCI6IDcwNzYsICJleHRQYXJhbXMiOiAiIiwgImN1c3RvbURhdGEiOiB7ImV4aXRJbmZvIjogeyJ0b2FzdERlc2MiOiBudWxsLCAidG9hc3RJbWdVcmwiOiBudWxsfX0sICJwZW5kYW50VHlwZSI6IDEsICJkaXNwbGF5VHlwZSI6IDIsICJzaW5nbGVQYWdlSWQiOiAwLCAic2luZ2xlU3ViUGFnZUlkIjogMCwgImNoYW5uZWwiOiAwLCAiY291bnRkb3duUmVwb3J0IjogZmFsc2UsICJ0aGVtZVR5cGUiOiAwLCAibWl4ZWRBZCI6IHRydWUsICJmdWxsTWl4ZWQiOiB0cnVlLCAiYXV0b1JlcG9ydCI6IHRydWUsICJmcm9tVGFza0NlbnRlciI6IHRydWUsICJzZWFyY2hJbnNwaXJlU2NoZW1hSW5mbyI6IG51bGwsICJhbW91bnQiOiAwfQ==",
            });
        }
        let adinfo = {
            appInfo: {
                appId: "kuaishou_nebula",
                name: "快手极速版",
                packageName: "com.kuaishou.nebula",
                version: this.appver,
                versionCode: -1,
            },
            deviceInfo: {
                oaid: this.oaid,
                osType: 1,
                osVersion: this.osVersion,
                language: this.language,
                deviceId: "" + this.did,
                screenSize: { width: 1080, height: 2068 },
                ftt: "",
                supportGyroscope: true,
            },
            networkInfo: { ip: this.nwip, connectionType: 100 },
            geoInfo: { latitude: 0, longitude: 0 },
            userInfo: { userId: this.userId, age: 0, gender: "" },
            impInfo: [
                {
                    pageId: config.pageId,
                    subPageId: config.subPageId,
                    action: 0,
                    width: 0,
                    height: 0,
                    browseType: this.browseType,
                    requestSceneType: requestSceneType,
                    lastReceiveAmount: 0,
                    impExtData: impExtData,
                    mediaExtData: "{}",
                    session: JSON.stringify({
                        id:
                            "adNeo" +
                            "-" +
                            this.userId +
                            "-" +
                            this.currentAdConfig.subPageId +
                            "-" +
                            Date.now(),
                    }),
                },
            ],
            adClientInfo: '{"ipdxIP":"' + "" + '"}',
            recoReportContext:
                '{"adClientInfo":{"shouldShowAdProfileSectionBanner":null,"profileAuthorId":0,"xiaomiCustomMarketInfo":{"support":true,"detailStyle":"1,2,3,5,100,101,102"}}}',
        };
        return adinfo;
    },

    async feedAD() {
        let data = {
            tubeId: "5xmu8x9e6ysv37e",
            appInfo: {
                appId: "kuaishou_nebula",
                name: "快手极速版",
                packageName: "com.kuaishou.nebula",
                version: this.appver,
                versionCode: -1,
            },
            deviceInfo: {
                oaid: this.oaid,
                osType: 1,
                osVersion: this.osVersion,
                language: this.language,
                deviceId: this.did,
                screenSize: { width: 1080, height: 2068 },
            },
            networkInfo: { ip: this.nwip, connectionType: 100 },
            geoInfo: { latitude: 0, longitude: 0 },
            userInfo: { userId: this.userId, age: 0, gender: "" },
            data: data,
        };
        let reqParams = await this.loadReqParams(
            "/rest/e/tube/tubeFeed",
            data,
            this.salt
        );
        let option = {
            url: "https://api.e.kuaishou.com/rest/e/tube/tubeFeed",
            params: reqParams.queryData,
            httpAgent: this.socks5,
            httpsAgent: this.socks5,
            proxy: false,
            timeout: 30 * 1000,
            headers: {
                kaw: reqParams.headersData.kaw,
                kas: reqParams.headersData.kas,
                "page-code": "USER_TAG_SEARCH",
                "X-REQUESTID": Date.now() + Math.floor(Math.random() * 100000),
                "ct-context": {
                    biz_name: "ATTRIBUTION",
                    error_occurred: false,
                    sampled: true,
                    sampled_on_error: true,
                    segment_id: 1197690176,
                    service_name: "CLIENT_TRACE",
                    span_id: 1,
                    trace_id:
                        "My4xMTI5NjA3NDAzMzI0NDA4NzYzMS4yNzU4MC4xNzYxNDYzNjQwODgyLjQ=",
                    upstream_error_occurred: false,
                },
                Host: "api.e.kuaishou.com",
                "Content-Type": "application/json",

                Cookie: "kuaishou.api_st=" + this.api_st,
                "X-Client-Info":
                    "model=" +
                    this.mod +
                    ";os=Android;nqe-score=59;network=WIFI;signal-strength=4;",
                "User-Agent": "kwai-android aegon/4.28.0",
            },
            method: "POST",
            data: data,
        };
        let { data: result } = await axios.request(option);
    },

    async loadAd(type) {
        let adinfo = this.loadAdInfo(type);

        let reqData = await this.encsign(adinfo);
        if (reqData == null) {
            this.$.log(`获取 encsign 失败`);
            return null;
        }

        let formData = {
            encData: reqData.encdata,
            sign: reqData.sign,
            cs: "false",
            client_key: "2ac2a76d",
            videoModelCrowdTag: "1_23",
            os: "android",
            "kuaishou.api_st": this.api_st,
            uQaTag: this.uQaTag,
        };
        if (this.puid) {
            Object.assign(formData, { pUid: this.puid });
        }
        let reqParams = await this.loadReqParams(
            "/rest/e/reward/mixed/ad",
            formData,
            this.salt
        );
        if (reqParams == null) {
            this.$.log(`获取广告信息失败`);
            return null;
        }

        let { data: result } = await axios.request({
            url: "https://api.e.kuaishou.com/rest/e/reward/mixed/ad",
            params: reqParams.queryData,
            httpAgent: this.socks5,
            httpsAgent: this.socks5,
            proxy: false,
            timeout: 30 * 1000,
            method: "POST",
            headers: {
                kaw: reqParams.headersData.kaw,
                kas: reqParams.headersData.kas,
                "page-code": "NEW_TASK_CENTER",
                "X-REQUESTID": Date.now() + Math.floor(Math.random() * 100000),

                "ct-context": {
                    biz_name: "ATTRIBUTION",
                    error_occurred: false,
                    sampled: true,
                    sampled_on_error: true,
                    segment_id: 1959322169,
                    service_name: "CLIENT_TRACE",
                    span_id: 1,
                    trace_id:
                        "My42MTgxMjc3OTA0NTg2OTMyNjA5LjE2NjI1LjE3NjE3MDU0MTYyMzMuMg==",
                    upstream_error_occurred: false,
                },

                Host: "api.e.kuaishou.com",
                "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",

                Cookie: "kuaishou.api_st=" + this.api_st,
                "X-Client-Info":
                    "model=" +
                    this.mod +
                    ";os=Android;nqe-score=22;network=WIFI;signal-strength=4;",
                "User-Agent": "kwai-android aegon/4.28.0",
            },
            data: formData,
        });
        let liveStreamId = "";
        if (
            result.errorMsg === "OK" &&
            result.feeds &&
            result.feeds[0] &&
            result.feeds[0].ad
        ) {
            if (result.feeds[0]["ad"]["adDataV2"]["enableJumpToLive"]) {
                liveStreamId =
                    result["feeds"][0]["ad"]["adDataV2"]["liveStreamId"] ||
                    result["feeds"][0]["liveStreamId"] ||
                    "";
                if (this.ksispasslive == "true") {
                    return null;
                }
                if (this.ksispasslive == "false") {
                    this.$.log(`账号[${this.index}] 获取的广告为直播广告`);
                }
                if (!this.ksispasslive) {
                    return null;
                }
            }
            const caption =
                result.feeds[0].caption ||
                result.feeds[0].ad?.caption ||
                result.feeds[0].user_name ||
                "";
            if (caption) {
                this.$.log(`✅ 账号[${this.index}] 成功获取到广告信息：${caption}`);
            } else {
                this.$.log(
                    `❌ 账号[${this.index}] 获取广告信息失败 可能是直播广 建议打标签 不要搜任何关于直播的`
                );
                return null;
            }

            const expTag = result.feeds[0].exp_tag || "";
            const llsid = expTag.split("/")[1]?.split("_")?.[0] || "";
            let track = "";
            if (result.feeds[0].ad["tracks"]) {
                if (result.feeds[0].ad["tracks"]) {
                    track = result.feeds[0].ad["tracks"];
                }
            }
            let inspireAdInfo = result.feeds[0].ad["adDataV2"]["inspireAdInfo"] || {};
            if (inspireAdInfo["rewardEndInfo"]) {
                if (inspireAdInfo["rewardEndInfo"]["exitDialogInfo"]) {
                    this.adConfigs[type].isAdadd = true;
                }
            }
            this.adConfigs[type].extraTask = false;
            if (
                result.feeds[0]["ad"]["adDataV2"]["templateDatas"] &&
                Array.isArray(result.feeds[0]["ad"]["adDataV2"]["templateDatas"])
            ) {
                for (let template of result.feeds[0]["ad"]["adDataV2"][
                    "templateDatas"
                ]) {
                    if (template.resourceType == 1 && this.ksextratask == "true") {
                        this.$.log(`✅ 账号[${this.index}] 额外广告触发`);
                        this.adConfigs[type].extraTask = true;
                        break;
                    }
                }
            }
            if (result.feeds[0].streamManifest) {
                return {
                    liveStreamId: liveStreamId,
                    photo_id: result["feeds"][0]["photo_id"],
                    user_id: result["feeds"][0]["user_id"],
                    callback: result.feeds[0].ad.callbackParam,
                    track: track,
                    cid: result.feeds[0].ad.creativeId,
                    llsid: llsid,
                    adExtInfo: result.feeds[0].ad.adDataV2.inspireAdInfo.adExtInfo,
                    materialTime:
                        result.feeds[0].streamManifest.adaptationSet[0].duration,
                    watchAdTime:
                        result.feeds[0].ad.adDataV2.inspireAdInfo.inspireAdBillTime,
                };
            } else {
                return {
                    liveStreamId: liveStreamId,
                    photo_id: result["feeds"][0]["photo_id"],
                    callback: result.feeds[0].ad.callbackParam,
                    track: track,
                    user_id: result["feeds"][0]["user_id"],
                    cid: result.feeds[0].ad.creativeId,
                    llsid: llsid,
                    adExtInfo: result.feeds[0].ad.adDataV2.inspireAdInfo.adExtInfo,
                    materialTime: 30 * 1000,
                    watchAdTime:
                        result.feeds[0].ad.adDataV2.inspireAdInfo.inspireAdBillTime,
                };
            }
        } else {
            this.$.log(result);
            this.$.log(
                `❌ 账号[${this.index}] 获取广告信息失败 可能是直播广 建议打标签 不要搜任何关于直播的`
            );
            return null;
        }
    },

    async preSub(cid, llsid, liveStreamId) {
        if (!this.currentAdConfig) {
            this.$.log(`❌ 账号[${this.index}] 当前广告配置未设置`);
            return false;
        }
        let mediaType = "video";
        if (liveStreamId) {
            mediaType = "live";
        }
        const preData = {
            bizStr: JSON.stringify({
                pageId: this.currentAdConfig.pageId,
                subPageId: this.currentAdConfig.subPageId,
                posId: this.currentAdConfig.posId,
                taskId: this.currentAdConfig.businessId,
                items: [
                    {
                        basicType: 2,
                        creativeId: cid,
                        llsid: llsid,
                        mediaType: mediaType,
                    },
                ],
            }),
            cs: "false",
            client_key: "2ac2a76d",
            videoModelCrowdTag: "",
            os: "android",
            "kuaishou.api_st": this.api_st,
            uQaTag: this.uQaTag,
        };
        if (this.puid) {
            Object.assign(preData, { pUid: this.puid });
        }
        let reqParams = await this.loadReqParams(
            "/rest/r/ad/exposure/report",
            preData,
            this.salt
        );
        if (reqParams == null) {
            this.$.log(`获取曝光信息失败`);
            return false;
        }

        let { data: result } = await axios.request({
            url: "https://api.e.kuaishou.com/rest/r/ad/exposure/report",
            params: reqParams.queryData,
            httpAgent: this.socks5,
            httpsAgent: this.socks5,
            proxy: false,
            timeout: 30 * 1000,
            headers: {
                kaw: reqParams.headersData.kaw,
                kas: reqParams.headersData.kas,
                "page-code": "AWARD_VIDEO_AD_PAGE",
                "X-REQUESTID": Date.now() + Math.floor(Math.random() * 100000),

                "ct-context": {
                    biz_name: "ATTRIBUTION",
                    error_occurred: false,
                    sampled: true,
                    sampled_on_error: true,
                    segment_id: 438217262,
                    service_name: "CLIENT_TRACE",
                    span_id: 1,
                    trace_id:
                        "My4xMTEyODcwNTUzNjA1NDkyNTg5LjEzODEyLjE3NjE3MjMzNzk5MzQuMg==",
                    upstream_error_occurred: false,
                },
                Host: "api.e.kuaishou.com",
                "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",

                Cookie: "kuaishou.api_st=" + this.api_st,
                "X-Client-Info":
                    "model=" +
                    this.mod +
                    ";os=Android;nqe-score=27;network=WIFI;signal-strength=4;",
                "User-Agent": "kwai-android aegon/4.28.0",
            },
            method: "POST",
            data: preData,
        });

        if (result.result == 1) {
            return true;
        } else {
            this.$.log(result);
            this.$.log(`❌ 账号[${this.index}] 曝光广告失败`);
            return false;
        }
    },

    async callbackAdPartner(callbackParams) {
        let event_type = Math.random() > 0.5 ? 3 : 6;
        let purchase_amount = Math.floor(Math.random() * 20) + 5;
        let params = {
            callback: callbackParams,
            event_type: event_type,
            event_time: Date.now(),
        };

        if (event_type == 3) {
            Object.assign(params, { purchase_amount: purchase_amount });
        }
        let { data: result } = await axios.request({
            url: "http://ad.partner.gifshow.com/track/activate",
            params: params,
            httpAgent: this.socks5,
            httpsAgent: this.socks5,
            proxy: false,
            timeout: 30 * 1000,
            headers: { "User-Agent": "kwai-android aegon/4.28.0" },
            method: "GET",
        });
    },

    async trackApi(track) {
        try {
            if (!track) return;

            let { data: result } = await axios.request({
                url: track,
                httpAgent: this.socks5,
                httpsAgent: this.socks5,
                proxy: false,
                timeout: 30 * 1000,
                headers: { "User-Agent": "kwai-android aegon/4.28.0" },
                method: "GET",
            });
        } catch (e) { }
    },

    async subAd(
        cid,
        llsid,
        adExtInfo,
        startTime,
        random,
        materialTime,
        watchAdTime,
        liveStreamId
    ) {
        if (!this.currentAdConfig) {
            this.$.log(`❌ 账号[${this.index}] 当前广告配置未设置`);
            return 0;
        }

        // 新增：重试计数器
        if (!this.rewardRetryCount) {
            this.rewardRetryCount = {};
        }

        const adType = this.currentAdConfig.type;
        if (!this.rewardRetryCount[adType]) {
            this.rewardRetryCount[adType] = 0;
        }

        let taskType = 1;
        let requestSceneType = 1;
        if (this.isAdAddEnabled && this.adaddnum != 0) {
            taskType = 2;
            requestSceneType = 7;
        }

        if (this.currentAdConfig.type === "search") {
            adExtInfo = "";
        }
        //直播 neoInfos
        let neoInfos = [];
        let mediaScene = "video";
        if (liveStreamId != "") {
            mediaScene = "live";
            neoInfos = {
                creativeId: cid,
                feedId: liveStreamId,
                llsid: llsid,
                adExtInfo: adExtInfo,
                materialTime: 0,
                watchAdTime: watchAdTime,
                requestSceneType: requestSceneType,
                taskType: taskType,
                watchExpId: "",
                watchStage: 0,
            };
        } else {
            neoInfos = [
                {
                    clientExtInfo: '{"serialPaySuccess":false}',
                    creativeId: cid,
                    extInfo: "",
                    llsid: llsid,
                    adExtInfo: adExtInfo,
                    materialTime: materialTime,
                    watchAdTime: watchAdTime,
                    requestSceneType: requestSceneType,
                    taskType: taskType,
                    watchExpId: "",
                    watchStage: 0,
                },
            ];
        }

        // 修改：严格遵循 ksextratask 设置，重试时也不执行额外任务
        const shouldDoExtraTask = this.ksextratask == "true";

        if (this.currentAdConfig.extraTask && shouldDoExtraTask) {
            neoInfos.push({
                clientExtInfo: '{"serialPaySuccess":false}',
                creativeId: cid,
                extInfo: "",
                llsid: llsid,
                adExtInfo: adExtInfo,
                materialTime: materialTime,
                watchAdTime: watchAdTime,
                requestSceneType: requestSceneType,
                taskType: 3,
                watchExpId: "",
                watchStage: 0,
            });
        }

        const endTime = Date.now();
        const subData = {
            bizStr: JSON.stringify({
                businessId: this.currentAdConfig.businessId,
                endTime: endTime,
                extParams:
                    this.extParams ||
                    "b3151029b4c9c7a5292de15bb3d33a80a70bdf0e138541b1ce3f449f43ec2b54c8e37abe358f8189d66451fb270240048a5822cac88334984240a32d485a35743e09d498053de30f8c1e949939ad69d90d9913d6d841e02f73ea1d130a5800365faf2ca1880653f0ab286275a20104ce1b667a1a0b67b9d7829e18861215dcbff0b3ca801439b7268f39729fb7063043",
                mediaScene: mediaScene,
                neoInfos: neoInfos,
                pageId: this.currentAdConfig.pageId,
                posId: this.currentAdConfig.posId,
                reportType: 0,
                sessionId:
                    "adNeo-" +
                    this.userId +
                    "-" +
                    this.currentAdConfig.subPageId +
                    "-" +
                    Date.now(),
                startTime: startTime,
                subPageId: this.currentAdConfig.subPageId,
            }),
            cs: "false",
            client_key: "2ac2a76d",
            videoModelCrowdTag: "1_52",
            os: "android",
            "kuaishou.api_st": this.api_st,
            uQaTag: this.uQaTag,
            token: this.api_st,
        };

        if (this.puid) {
            Object.assign(subData, { pUid: this.puid });
        }

        let reqParams = await this.loadReqParams(
            "/rest/r/ad/task/report",
            subData,
            this.salt
        );

        if (reqParams == null) {
            this.$.log(`获取 sign 失败 请重试`);
            return 0;
        }

        try {
            let { data: result } = await axios.request({
                url: "https://api.e.kuaishou.com/rest/r/ad/task/report",
                httpAgent: this.socks5,
                httpsAgent: this.socks5,
                proxy: false,
                timeout: 30 * 1000,
                params: reqParams.queryData,
                method: "POST",
                headers: {
                    kaw: reqParams.headersData.kaw,
                    kas: reqParams.headersData.kas,
                    "page-code": "NEW_TASK_CENTER",
                    "X-REQUESTID": Date.now() + Math.floor(Math.random() * 100000),
                    "ct-context": {
                        biz_name: "ATTRIBUTION",
                        error_occurred: false,
                        sampled: true,
                        sampled_on_error: true,
                        segment_id: 2138819607,
                        service_name: "CLIENT_TRACE",
                        span_id: 1,
                        trace_id:
                            "My4xMzk2NDEzNjcwNTg4MDYxNTY2NjQuMTM4NzcuMTc2MTcyMzQ1MTc1Mi40=",
                        upstream_error_occurred: false,
                    },
                    Host: "api.e.kuaishou.com",
                    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                    Cookie: "kuaishou.api_st=" + this.api_st,
                    "X-Client-Info":
                        "model=" +
                        this.mod +
                        ";os=Android;nqe-score=22;network=WIFI;signal-strength=4;",
                    "User-Agent": "kwai-android aegon/4.28.0",
                },
                data: subData,
            });

            // 处理奖励已领完的情况，增加重试逻辑
            if (result.result === 1003 || result.result === 415) {
                this.rewardRetryCount[adType]++;

                if (this.rewardRetryCount[adType] <= 1) {
                    this.$.log(
                        `🔄 账号 [${this.index}] ${this.currentAdConfig.name}任务奖励已领完，进行第${this.rewardRetryCount[adType]}次重试`
                    );
                    // 返回特殊标识，让上层知道这是重试
                    this.ksextratask = "false";
                    this.isAdAddEnabled = false;
                    return "retry_no_reward";
                } else {
                    this.$.log(
                        `❌ 账号 [${this.index}] ${this.currentAdConfig.name}任务连续 3 次奖励已领完，停止该任务类型`
                    );
                    this.adTypesEnabled[this.currentAdConfig.type] = false;
                    return 0;
                }
            }

            if (result.message == "成功") {
                const neoAmount = result.data.neoAmount;

                // 重置重试计数器
                this.rewardRetryCount[adType] = 0;

                // 处理 10 金币逻辑
                if (this.ksnoDelay != "true") {
                    if (neoAmount == 10) {
                        this.$.log(
                            `⚠️ 账号[${this.index}] ${this.currentAdConfig.name}任务 获得 10 金币`
                        );
                        this.adTypesEnabled[this.currentAdConfig.type] = false;
                        return neoAmount;
                    } else if (neoAmount == 1) {
                        this.$.log(
                            `⚠️ 账号[${this.index}] ${this.currentAdConfig.name}任务获得 1 金币 风控，暂停该任务类型`
                        );
                        this.adTypesEnabled[this.currentAdConfig.type] = false;
                        return neoAmount;
                    }
                }

                return neoAmount;
            } else {
                this.$.log(result);
                // 其他错误也重置重试计数器
                this.rewardRetryCount[adType] = 0;
                return 0;
            }
        } catch (e) {
            this.$.log("提交广告失败");
            // 异常情况重置重试计数器
            this.rewardRetryCount[adType] = 0;
            return 0;
        }
    },
};
