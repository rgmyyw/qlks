const axios = require("axios");

// 任务动作相关方法模块（签到、宝箱、打卡、邀请等）
module.exports = {
    // 触发任务动作
    async triggerTaskAction(type) {
        let reqdata = {};
        if (type == "look") {
            reqdata = {
                actionType: 1,
                resourceSlotInfo: this.eventTrackingLogInfo,
            };
        }
        if (type == "openbox") {
            reqdata = {
                actionType: 1,
                resourceSlotInfo: {
                    eventTrackingTaskId: 20035,
                    resourceId: "earnPage_treasureBox_1",
                    extParams: {
                        isServerRecordClickAction: true,
                    },
                },
            };
        }
        if (type == "signIn") {
            reqdata = {
                actionType: 1,
                resourceSlotInfo: this.eventTrackingLogInfo,
            };
        }
        try {
            let sig68 = await this.getSig68(
                Buffer.from(JSON.stringify({})).toString("base64"),
                Buffer.from(JSON.stringify(reqdata)).toString("base64"),
                "POST",
                "json",
                this.ck
            );

            if (!sig68) {
                this.$.log(`❌ 账号[${this.index}] 获取 look 任务触发签名失败`);
                return false;
            }

            const options = {
                method: "POST",
                url:
                    `https://nebula.kuaishou.com/rest/wd/usergrowth/encourage/matrix/resource/action?` +
                    sig68,
                headers: {
                    "User-Agent": this.getAndroidWebViewUA(),
                    "Content-Type": "application/json",
                    Cookie: this.ck,
                },
                data: reqdata,
                httpAgent: this.socks5,
                httpsAgent: this.socks5,
                proxy: false,
                timeout: 30 * 1000,
            };

            let { data: res } = await axios.request(options);
            if (res && res.result === 1) {
                return true;
            } else {
                this.$.log(
                    `❌ 账号[${this.index}] 触发 look 任务动作失败：${res?.errorMsg || "未知错误"
                    }`
                );
                return false;
            }
        } catch (error) {
            this.$.log(`❌ 账号[${this.index}] 触发 look 任务动作异常：${error.message}`);
            return false;
        }
    },

    // 检查 look 任务是否在冷却中
    async checkLookTaskCooling() {
        try {
            const taskList = await this.getTaskList();
            if (!taskList) {
                return { cooling: true, reason: "获取任务列表失败" };
            }
            if (this.ksdailytask.includes("signin")) {
                const signTask =
                    taskList.dailyTasks?.find((task) => task.id === 20022) || {};
                // 如果该对象里面 finish 为 false 则证明未签到
                this.eventTrackingLogInfo = {
                    eventTrackingTaskId: 20022,
                    resourceId: "earnPage_cardArea_1",
                    extParams: {
                        isServerRecordClickAction: true,
                    },
                };

                if (!signTask["finish"]) {
                    this.$.log(`❌ 账号[${this.index}] 未完成签到任务 执行签到`);
                    await this.triggerTaskAction("signIn");
                    await this.signIn();
                }
            }
            // 查找 look 任务（id 为 17 的任务）
            const lookTask = taskList.dailyTasks?.find((task) => task.id === 17);

            if (!lookTask) {
                return { cooling: true, reason: "未找到看广告任务" };
            }

            if (!lookTask.linkUrl) {
                return { cooling: true, reason: "广告任务正在冷却中，linkUrl 不存在" };
            }

            this.taskStages = lookTask.stages || 200;
            this.taskCompletedStages = lookTask.completedStages || 0;
            this.eventTrackingLogInfo = lookTask["eventTrackingLogInfo"] || {
                deliverOrderId: "422",
                materialKey: "TASK_LIST_17_672_PROGRESSING",
                eventTrackingTaskId: 17,
                resourceId: "earnPage_taskList_1",
                extParams: {
                    isServerRecordClickAction: true,
                },
            };

            // 新增：检查 materialKey 是否包含"20251111"字符串
            if (
                this.eventTrackingLogInfo.materialKey &&
                this.eventTrackingLogInfo.materialKey.includes("20251111")
            ) {
                this.$.log(`🎯 账号[${this.index}] 检测到特殊广告类型，切换到 look2 任务`);
                // 设置广告类型为 look2
                this.currentAdConfig = this.adConfigs.look2;
            } else {
                // 否则使用默认的 look 配置
                this.currentAdConfig = this.adConfigs.look;
            }

            // 如果 linkUrl 存在，设置 neoParams 和 extParams
            this.neoParams = lookTask.linkUrl;
            try {
                const base64 = Buffer.from(lookTask.linkUrl, "base64").toString(
                    "utf-8"
                );
                const parsed = JSON.parse(base64);
                this.extParams = parsed.extParams;
            } catch (e) {
                this.$.log(`❌ 账号[${this.index}] 解析 linkUrl 失败：${e.message}`);
                return { cooling: true, reason: "解析任务参数失败" };
            }

            return { cooling: false, reason: "" };
        } catch (error) {
            this.$.log(`❌ 账号[${this.index}] 检查 look 任务状态失败：${error.message}`);
            return { cooling: true, reason: "检查任务状态失败" };
        }
    },

    // 获取任务列表
    async getTaskList() {
        try {
            let { data: res } = await axios.request({
                url: "https://nebula.kuaishou.com/rest/n/nebula/activity/earn/overview/tasks",
                httpAgent: this.socks5,
                httpsAgent: this.socks5,
                method: "GET",
                proxy: false,
                headers: {
                    Cookie: this.ck,
                },
            });

            if (res.result == 1) {
                return res.data;
            } else {
                this.$.log(`❌ 账号[${this.index}] 获取任务列表失败：${res.errorMsg}`);
                return null;
            }
        } catch (error) {
            this.$.log(`❌ 账号[${this.index}] 请求任务列表失败：${error.message}`);
            return null;
        }
    },

    // 收益汇总方法
    getCoinSummary() {
        const config = this.adConfigs;
        let summary = `\n🎉 账号[${this.index}] 任务完成汇总\n`;
        summary += `═`.repeat(40) + `\n`;
        summary += `💰 总收益：${this.coinStats.total} 金币\n\n`;

        // 显示最大金币限制信息
        if (this.maxReward > 0) {
            summary += `🎯 最大金币限制：${this.maxReward} 金币\n`;
            const remaining = this.maxReward - this.coinStats.total;
            if (remaining > 0) {
                summary += `📊 剩余额度：${remaining} 金币\n`;
            } else {
                summary += `✅ 已达到最大金币限制\n`;
            }
            summary += `\n`;
        }

        // 按广告类型统计
        summary += `📈 按任务类型统计:\n`;
        Object.keys(this.coinStats.byType).forEach((type) => {
            if (this.coinStats.byType[type] > 0) {
                summary += `  ${config[type].emoji} ${config[type].name}: ${this.coinStats.byType[type]} 金币\n`;
            }
        });

        // 显示 look 任务冷却状态
        if (this.lookTaskCooling) {
            summary += `\n⚠️  look 任务状态：冷却中 - ${this.lookTaskCoolingReason}\n`;
        }

        // 显示停止原因
        if (this.shouldStop && this.stopReason) {
            summary += `\n⏹️  停止原因：${this.stopReason}\n`;
        }

        // 估算现金价值 (按常见比例 10000 金币 ≈ 1 元)
        const estimatedCash = (this.coinStats.total / 10000).toFixed(2);
        summary += `\n💵 预估现金价值：约 ${estimatedCash} 元\n`;

        summary += `═`.repeat(40);
        return summary;
    },

    async userInfoApi() {
        let options = {
            method: "GET",
            url: "https://nebula.kuaishou.com/rest/n/nebula/activity/earn/overview/basicInfo?source=",
            httpAgent: this.socks5,
            httpsAgent: this.socks5,
            proxy: false,
            headers: {
                "User-Agent":
                    "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.31(0x18001E2D) NetType/WIFI Language/zh_CN",
                Referer:
                    "https://nebula.kuaishou.com/nebula/task/earning?layoutType=4&hyId=nebula_earning_ug_cdn&source=bottom_guide_second",
                Cookie: "" + this.ck,
            },
        };
        let { data: res } = await axios.request(options);
        if (res?.data) {
            this.$.log(`------------[${res.data.userData.nickname}]------------`);
            this.nickname = res.data.userData.nickname;
            this.$.log(
                `账号[${this.index}] [${this.userId}] 【${res.data.totalCash}】金币【${res.data.totalCoin}】`
            );
            // 记录当前收益
            this.currentEarnings =
                Number(res.data.totalCash) * 10000 + Number(res.data.totalCoin) || 0;
            return true;
        } else {
            this.currentEarnings = 0;
            return false;
        }
    },

    async hugeSignInInfo() {
        let options = {
            method: "GET",
            url: "https://encourage.kuaishou.com/rest/ug-regular/hugeSignIn/home?source=task&sourceToken=",
            httpAgent: this.socks5,
            httpsAgent: this.socks5,
            proxy: false,
            headers: {
                "User-Agent": "",
                Referer: "",
                Cookie: "" + this.ck,
            },
        };

        let { data: res } = await axios.request(options);

        if (res?.result == 1) {
            if (res.data.productId == 0 && res.data.templateId == 0) {
                //未选择打卡
            } else {
                this.$.log(
                    `账号 [${this.index}] 获取打卡任务成功 [${res.data.productView.productName}]`
                );
                this.$.log(
                    `账号 [${this.index}] 当前签到状态：${res.data.productView.signInDays}/${res.data.productView.allSignedDays}`
                );
                this.userFeatureParm = res.data.task.hugeSignInTaskToken;
                this.userSnapshotExtParam = res.data.task.taskSnapshotToken;
                this.userSubbizId = res.data.task.subbizId;
                await this.hugeSignTriggerList();
            }
        } else {
        }
    },

    //选择奖品
    async hugeSignInSelectProduct() {
        let data = {
            productId: 1141,
            templateId: 2013,
            source: "",
            rawSource: "task",
            autoSelect: false,
            idfa: "",
            oaid: this.oaid,
        };
        let sig68 = await this.getSig68(
            Buffer.from(JSON.stringify({})).toString("base64"),
            Buffer.from(JSON.stringify(data)).toString("base64"),
            "POST",
            "json",
            this.ck
        );
        let options = {
            method: "POST",
            url:
                "https://encourage.kuaishou.com/rest/ug-regular/hugeSignIn/selectProduct?" +
                sig68,
            httpAgent: this.socks5,
            httpsAgent: this.socks5,
            proxy: false,
            headers: {
                "Content-Type": "application/json",
                "User-Agent":
                    "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.31(0x18001E2D) NetType/WIFI Language/zh_CN",
                Referer:
                    "https://encourage.kuaishou.com/huge-sign-in/home?layoutType=4&bizId=huge-sign-in&source=task&encourageTaskValidityTrack=eyJhY3Rpdml0eV9pZCI6MjAyNDMsInJlc291cmNlX2lkIjoiZWFyblBhZ2VfdGFza0xpc3RfMSIsImV4dF9wYXJhbXMiOnsiaXNTZXJ2ZXJSZWNvcmRDbGlja0FjdGlvbiI6dHJ1ZX19",
                Cookie: "" + this.ck,
            },
            data: data,
        };
        let { data: res } = await axios.request(options);
    },

    async hugeSignTriggerList() {
        let data = {
            subBizId: this.userSubbizId,
            idfa: "",
            oaid: this.oaid,
            userFeatureParam: this.userFeatureParm,
            snapshotExtParam: this.userSnapshotExtParam,
            selfReportParam:
                '{"pushSwitchStatus":true,"hugeSignInWidgetStatus":false,"ignoringBatteryOptimizationsStatus":true}',
        };
        let sig56 = await this.getSig56_1(
            Buffer.from(JSON.stringify(data)).toString("base64")
        );
        let options = {
            method: "POST",
            url:
                "https://encourage.kuaishou.com/rest/wd/zt/task/list/trigger?__NS_sig3=" +
                sig56,
            httpAgent: this.socks5,
            httpsAgent: this.socks5,
            proxy: false,
            headers: {
                "Content-Type": "application/json",
                "User-Agent":
                    "Mozilla/5.0 (Linux; Android 10; MI 8 Lite Build/QKQ1.190910.002; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/121.0.6167.212 KsWebView/1.8.121.896 (rel;r) Mobile Safari/537.36 Yoda/3.2.17-rc2 ksNebula/13.9.30.10756 OS_PRO_BIT/64 MAX_PHY_MEM/5724 KDT/PHONE AZPREFIX/az3 ICFO/0 StatusHT/29 TitleHT/44 NetType/WIFI ISLP/0 ISDM/0 ISLB/0 locale/zh-cn DPS/4.036 DPP/9 SHP/2068 SWP/1080 SD/2.75 CT/0 ISLM/1",
                Referer:
                    "https://encourage.kuaishou.com/huge-sign-in/home?layoutType=4&bizId=huge-sign-in&source=task&encourageTaskValidityTrack=eyJhY3Rpdml0eV9pZCI6MjAyNDMsInJlc291cmNlX2lkIjoiZWFyblBhZ2VfdGFza0xpc3RfMSIsImV4dF9wYXJhbXMiOnsiaXNTZXJ2ZXJSZWNvcmRDbGlja0FjdGlvbiI6dHJ1ZX19&encourageEventTracking=W3siZW5jb3VyYWdlX3Rhc2tfaWQiOjIwMjQzLCJ0YXNrX2lkIjoyMDI0MywiZW5jb3VyYWdlX3Jlc291cmNlX2lkIjoiZWFyblBhZ2VfdGFza0xpc3RfMSIsImV2ZW50VHJhY2tpbmdMb2dJbmZvIjpbeyJkZWxpdmVyT3JkZXJJZCI6IjcxMCIsIm1hdGVyaWFsS2V5IjoiVEFTS19MSVNUXzIwMjQzX0hVR0VfU0lHTl9JTl9ORVciLCJldmVudFRyYWNraW5nVGFza0lkIjoyMDI0MywicmVzb3VyY2VJZCI6ImVhcm5QYWdlX3Rhc2tMaXN0XzEiLCJleHRQYXJhbXMiOnsiaXNTZXJ2ZXJSZWNvcmRDbGlja0FjdGlvbiI6dHJ1ZX19XX1d",
                Cookie: "" + this.ck,
            },
            data: data,
        };
        let { data: res } = await axios.request(options);
        if (res?.result == 1) {
            this.$.log(
                `账号 [${this.index}] 获取打卡任务列表成功 正在检测打卡任务是否完成`
            );
            let tasks = res.data.tasks;
            for (let task of tasks) {
                if (task.taskId == 29951 && task.taskStatus != "TASK_COMPLETED") {
                    //去完成签到任务
                    await this.encourageReport(task.subBizId, task.taskId);
                } else {
                    this.$.log(`账号 [${this.index}] 检测到打卡任务已完成`);
                }
            }
        } else {
        }
    },

    async encourageReport(subBizId, taskId) {
        let data = { reportCount: 1, subBizId: subBizId, taskId: taskId };
        let sig56 = await this.getSig56_1(
            Buffer.from(JSON.stringify(data)).toString("base64")
        );
        let options = {
            method: "POST",
            url:
                "https://encourage.kuaishou.com/rest/wd/zt/task/report?__NS_sig3=" +
                sig56,
            httpAgent: this.socks5,
            httpsAgent: this.socks5,
            proxy: false,
            headers: {
                "Content-Type": "application/json",
                "User-Agent":
                    "Mozilla/5.0 (Linux; Android 10; MI 8 Lite Build/QKQ1.190910.002; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/121.0.6167.212 KsWebView/1.8.121.896 (rel;r) Mobile Safari/537.36 Yoda/3.2.17-rc2 ksNebula/13.9.30.10756 OS_PRO_BIT/64 MAX_PHY_MEM/5724 KDT/PHONE AZPREFIX/az3 ICFO/0 StatusHT/29 TitleHT/44 NetType/WIFI ISLP/0 ISDM/0 ISLB/0 locale/zh-cn DPS/4.036 DPP/9 SHP/2068 SWP/1080 SD/2.75 CT/0 ISLM/1",
                Referer:
                    "https://encourage.kuaishou.com/huge-sign-in/home?layoutType=4&bizId=huge-sign-in&source=task&encourageTaskValidityTrack=eyJhY3Rpdml0eV9pZCI6MjAyNDMsInJlc291cmNlX2lkIjoiZWFyblBhZ2VfdGFza0xpc3RfMSIsImV4dF9wYXJhbXMiOnsiaXNTZXJ2ZXJSZWNvcmRDbGlja0FjdGlvbiI6dHJ1ZX19&encourageEventTracking=W3siZW5jb3VyYWdlX3Rhc2tfaWQiOjIwMjQzLCJ0YXNrX2lkIjoyMDI0MywiZW5jb3VyYWdlX3Jlc291cmNlX2lkIjoiZWFyblBhZ2VfdGFza0xpc3RfMSIsImV2ZW50VHJhY2tpbmdMb2dJbmZvIjpbeyJkZWxpdmVyT3JkZXJJZCI6IjcxMCIsIm1hdGVyaWFsS2V5IjoiVEFTS19MSVNUXzIwMjQzX0hVR0VfU0lHTl9JTl9ORVciLCJldmVudFRyYWNraW5nVGFza0lkIjoyMDI0MywicmVzb3VyY2VJZCI6ImVhcm5QYWdlX3Rhc2tMaXN0XzEiLCJleHRQYXJhbXMiOnsiaXNTZXJ2ZXJSZWNvcmRDbGlja0FjdGlvbiI6dHJ1ZX19XX1d",
                Cookie: "" + this.ck,
            },
            data: data,
        };

        let { data: res } = await axios.request(options);

        if (res?.result == 1 && res.data.taskCompleted == true) {
            this.$.log(`账号 [${this.index}] 打卡签到成功`);
        } else {
        }
    },

    async signIn() {
        let sig68 = await this.getSig68(
            Buffer.from(JSON.stringify({})).toString("base64"),
            Buffer.from(JSON.stringify({})).toString("base64"),
            "GET",
            "json",
            this.ck
        );

        if (!sig68) return this.$.log(`获取 sig 失败`);
        let options = {
            method: "GET",
            url:
                `https://nebula.kuaishou.com/rest/wd/encourage/unionTask/signIn/report?` +
                sig68,
            httpAgent: this.socks5,
            httpsAgent: this.socks5,
            proxy: false,
            headers: {
                "Content-Type": "application/json",
                "User-Agent":
                    "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.31(0x18001E2D) NetType/WIFI Language/zh_CN",

                Referer:
                    "https://nebula.kuaishou.com/nebula/task/earning?layoutType=4&hyId=nebula_earning_ug_cdn&source=bottom_guide_second",
                Cookie: "" + this.ck,
            },
        };

        try {
            let { data: res } = await axios.request(options);

            if (res?.data) {
                this.$.log(
                    `✅ 账号[${this.index}] 签到成功 获得${res.data.reportRewardResult.eventTrackingAwardInfo.awardInfo[0].amount}金币`
                );
            } else if (res.result == 50) {
                this.$.log(
                    `❌ 账号[${this.index}] 签到失败  ${res.error_msg} 请确认 CK 中某一项是否存在空格是否被编码成功 比如 mod socName`
                );
            } else {
                this.$.log(`❌ 账号[${this.index}] 签到失败  ${res.error_msg}`);
            }
        } catch (e) { }
    },

    async openboxInfo() {
        let sig68 = await this.getSig68(
            Buffer.from(JSON.stringify({})).toString("base64"),
            Buffer.from(JSON.stringify({})).toString("base64"),
            "GET",
            "json",
            this.ck
        );
        if (!sig68) return this.$.log(`获取 sig 失败`);
        let options = {
            method: "GET",
            url:
                "https://nebula.kuaishou.com/rest/wd/encourage/unionTask/treasureBox/info?" +
                sig68,

            httpAgent: this.socks5,
            httpsAgent: this.socks5,
            proxy: false,
            headers: {
                "User-Agent":
                    "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.31(0x18001E2D) NetType/WIFI Language/zh_CN",

                "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",

                Referer:
                    "https://nebula.kuaishou.com/nebula/task/earning?layoutType=4&hyId=nebula_earning_ug_cdn&source=bottom_guide_second",
                Cookie: "" + this.ck,
            },
        };
        let { data: res } = await axios.request(options);
        if (res?.data) {
            if (res.data.status == 3) {
                this.$.log(`账号[${this.index}] 快手开宝箱  执行`);
                await this.triggerTaskAction("openbox");
                await this.openbox();
            }
            if (res.data.status == 2) {
                this.$.log(`账号[${this.index}] 快手开宝箱  未到时间`);
            }
            if (res.data.status == 4) {
                this.$.log(`账号[${this.index}] 快手开宝箱  今日领取完毕`);
            }
        }
    },

    async openbox() {
        let data = {};
        let sig68 = await this.getSig68(
            Buffer.from(JSON.stringify({})).toString("base64"),
            Buffer.from(JSON.stringify(data)).toString("base64"),
            "post",
            "json",
            this.ck
        );
        if (!sig68) return this.$.log(`获取 Sig 失败`);
        let options = {
            method: "POST",
            url:
                `https://nebula.kuaishou.com/rest/wd/encourage/unionTask/treasureBox/report?` +
                sig68,
            headers: {
                "Content-Type": "application/json",
                "User-Agent":
                    "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.31(0x18001E2D) NetType/WIFI Language/zh_CN",

                Origin: "https://nebula.kuaishou.com",

                Referer:
                    "https://nebula.kuaishou.com/nebula/task/earning?layoutType=4&hyId=nebula_earning_ug_cdn&source=bottom_guide_second",
                Cookie: "" + this.ck,
            },
            data: data,
        };

        try {
            let { data: res } = await axios.request(options);

            if (res?.data) {
                this.$.log(
                    `✅ 账号[${this.index}] 快手开宝箱  成功 获得${res.data.title.rewardCount}金币`
                );
            } else if (res.result == 50) {
                this.$.log(
                    `❌ 账号[${this.index}] 开宝箱失败  ${res.error_msg} 请确认 CK 中某一项是否存在空格是否被编码成功 比如 mod socName`
                );
            } else {
                this.$.log(`❌ 账号[${this.index}] 开宝箱失败  ${res.error_msg}`);
            }
        } catch (e) { }
    },

    async taskInvite1(data) {
        try {
            let url =
                "https://nebula.kuaishou.com/rest/wd/zt/task/report/assist/match?__NS_sig3=";
            if (data.activityId == "turntable_o1") {
                url =
                    "https://encourage.kuaishou.com/rest/wd/zt/task/report/assist/match?__NS_sig3=";
            }

            let sig56_1 = await this.getSig56_1(
                Buffer.from(JSON.stringify(data)).toString("base64")
            );
            let options = {
                method: "POST",
                url: url + sig56_1,
                headers: {
                    "User-Agent": this.getAndroidWebViewUA(),
                    "Content-Type": "application/json",
                    Cookie: this.ck,
                },
                data: data,
            };

            let { data: res } = await axios.request(options);
        } catch (e) { }
    },

    async taskInvite2(data) {
        try {
            let url = "https://az3-api.ksapisrv.com/rest/nebula/inviteCode/bind";
            let newData = {
                cs: "false",
                client_key: "2ac2a76d",
                videoModelCrowdTag: "",
                os: "android",
                "kuaishou.api_st": this.api_st,
                uQaTag: this.uQaTag,
            };
            Object.assign(data, newData);
            let reqParams = await this.loadReqParams(
                "/rest/nebula/inviteCode/bind",
                data,
                this.salt
            );
            if (!reqParams) return;
            let options = {
                method: "POST",
                url: url,
                params: reqParams.queryData,
                headers: {
                    kaw: reqParams.headersData.kaw,
                    kas: reqParams.headersData.kas,
                    "User-Agent": "kwai-android aegon/4.28.0",
                    "Content-Type": "application/x-www-form-urlencoded",
                    Cookie: "kuaishou.api_st=" + this.api_st,
                },
                data: data,
            };

            let { data: res } = await axios.request(options);
        } catch (e) { }
    },

    async exchangeCoinsInfo() {
        let options = {
            method: "POST",
            url: "https://nebula.kuaishou.com/rest/n/nebula/exchange/coinToCash/overview",
            httpAgent: this.socks5,
            httpsAgent: this.socks5,
            proxy: false,
            headers: {
                "User-Agent": this.getAndroidWebViewUA(),
                "content-type": "application/json",
                Referer: "https://www.kuaishou.com/",
                Cookie: this.ck,
            },
            data: "",
        };
        let { data: res } = await axios.request(options);
        if (res.result == 1) {
            if (Number(res.data.coinBalance) > 200) {
                await this.exchangeCoinsApi(Number(res.data.coinBalance));
            }
        }
    },

    async exchangeCoinsApi(coinAmount) {
        let options = {
            method: "POST",
            url: "https://nebula.kuaishou.com/rest/n/nebula/exchange/coinToCash/submit",
            httpAgent: this.socks5,
            httpsAgent: this.socks5,
            proxy: false,
            headers: {
                "User-Agent": this.getAndroidWebViewUA(),
                "content-type": "application/json",
                Referer: "https://www.kuaishou.com/",
                Cookie: this.ck,
            },
            data: {
                coinAmount: coinAmount,
                token: "rE2zK-Cmc82uOzxMJW7LI2-wTGcKMqqAHE0PhfN0U4bJY4cAM5Inxw",
            },
        };
        let { data: res } = await axios.request(options);
        if (res.result == 1) {
            //兑换成功
        }
    },

    async exchangeCoinsType() {
        let options = {
            method: "POST",
            url: "https://nebula.kuaishou.com/rest/wd/encourage/unionTask/coinExchange/changeStatus",
            httpAgent: this.socks5,
            httpsAgent: this.socks5,
            proxy: false,
            headers: {
                "User-Agent": this.getAndroidWebViewUA(),
                "content-type": "application/json",
                Referer: "https://www.kuaishou.com/",
                Cookie: this.ck,
            },
            data: {
                exchangeCoinState: 2,
            },
        };
        let { data: res } = await axios.request(options);
        if (res.result == 1) {
            await this.exchangeCoinsInfo();
        }
    },

    // 单次执行所有任务
    async executeAdTasksSingleRun() {
        this.$.log(`\n========== 开始执行单次任务 ==========`);

        // 检查是否已经达到最大金币限制
        if (this.checkMaxReward()) {
            this.$.log(`⏹️ 账号[${this.index}] 已达到最大金币限制，停止执行任务`);
            return;
        }

        const hasEnabledAdTypes = Object.values(this.adTypesEnabled).some(
            (enabled) => enabled
        );
        if (!hasEnabledAdTypes) {
            this.$.log(`❌ 账号[${this.index}] 所有广告类型都已停止，结束任务`);
            return;
        }

        // 按顺序执行三种广告任务
        const adTypes = ["look", "food", "box", "search"];
        for (const adType of adTypes) {
            // 每次执行前检查是否应该停止
            if (this.shouldStop) {
                this.$.log(`⏹️ 账号[${this.index}] 任务已停止：${this.stopReason}`);
                break;
            }

            if (this.task.includes(adType) && this.adTypesEnabled[adType]) {
                await this.executeAdTypeSingle(adType);
            } else if (!this.adTypesEnabled[adType]) {
                this.$.log(`⏸️  ${this.adConfigs[adType].name}任务已停止`);
            }
        }

        this.$.log(`========== 单次任务完成 ==========\n`);
    },

    // 单次执行广告类型
    async executeAdTypeSingle(adType) {
        if (this.shouldStop) {
            this.$.log(`⏹️  ${this.adConfigs[adType].name}任务已停止：${this.stopReason}`);
            return;
        }

        const baseConfig = this.adConfigs[adType];
        let runConfig = baseConfig;

        // 如果是 look 任务，先检查是否在冷却中
        if (adType === "look") {
            const coolingStatus = await this.checkLookTaskCooling();
            if (coolingStatus.cooling) {
                this.$.log(`⏸️  ${baseConfig.name}任务正在冷却中：${coolingStatus.reason}`);
                this.lookTaskCooling = true;
                this.lookTaskCoolingReason = coolingStatus.reason;
                return;
            } else {
                this.lookTaskCooling = false;
                this.lookTaskCoolingReason = "";

                if (!this.lookTaskTriggered) {
                    await this.triggerTaskAction("look");
                    this.lookTaskTriggered = true;
                }
            }

            if (this.currentAdConfig && this.currentAdConfig.type === "look2") {
                runConfig = this.currentAdConfig;
            }
        }

        this.currentAdConfig = runConfig;
        this.$.log(
            `${runConfig.emoji} 开始执行${runConfig.name}任务 (${runConfig.count}个)`
        );
        let successCount = 0;

        for (let i = 1; i <= runConfig.count; i++) {
            if (this.shouldStop) {
                this.$.log(`⏹️  ${runConfig.name}任务已停止：${this.stopReason}`);
                break;
            }

            this.$.log(`账号[${this.index}] 第${i}次请求 [${runConfig.name}]`);
            this.currentAdConfig = runConfig;

            const result = await this.executeSingleAd(runConfig.type);

            // 修改：处理重试情况
            if (result === "retry") {
                // 重试情况，不算成功但继续下一次
                i--; // 重试不算次数，所以不减 i
                continue;
            }

            if (result === "stop") {
                this.adTypesEnabled[adType] = false;
                break;
            } else if (result === "success") {
                successCount++;

                // 修改：广告追加次数限制为 4 次
                if (this.isAdAddEnabled && runConfig.isAdadd) {
                    this.$.log(`✅  ${runConfig.name} 开启追加模式`);
                    this.adaddnum++;
                } else {
                    this.adaddnum = 0;
                }

                if (this.checkMaxReward()) {
                    this.$.log(`⏹️ 已达到最大金币限制 ${this.maxReward}，停止后续任务`);
                    break;
                }

                if (adType === "look" && i % 10 === 0 && i < runConfig.count) {
                    const restTime = Math.floor(Math.random() * (90 - 60) + 60);
                    this.$.log(`⏰ 已完成${i}次看广告，休息${restTime}秒`);
                    await this.$.wait(restTime * 1000);
                } else if (i < runConfig.count) {
                    const waitTime =
                        adType === "look" ? Math.floor(Math.random() * (8 - 6) + 6) : 10;
                    await this.$.wait(waitTime * 1000);
                }
            }
        }

        this.$.log(
            `✅ ${runConfig.name}任务完成，成功${successCount}/${runConfig.count}个`
        );
    },

    // 执行单个广告
    async executeSingleAd(adType) {
        const adinfo = await this.loadAd(adType);
        const startTime = Date.now();

        if (!adinfo) {
            this.$.log(`❌ 账号[${this.index}] 获取广告信息失败，跳过本次广告`);
            return "skip";
        }

        await this.$.wait(2000);
        const pre = await this.preSub(
            adinfo.cid,
            adinfo.llsid,
            adinfo.liveStreamId
        );

        if (!pre) {
            this.$.log(`❌ 账号[${this.index}] 预加载失败，跳过本次广告`);
            return "skip";
        }

        if (Array.isArray(adinfo.track)) {
            for (let track of adinfo.track) {
                await this.trackApi(track.url);
            }
        }

        const randomTime = Math.floor(
            (adinfo.watchAdTime + Math.floor(Math.random() * (3000 - 1000) + 1000)) /
            1000
        );
        this.$.log(`账号[${this.index}] 随机延迟${randomTime}秒`);
        await this.$.wait(randomTime * 1000);

        const subResult = await this.subAd(
            adinfo.cid,
            adinfo.llsid,
            adinfo.adExtInfo,
            startTime,
            randomTime,
            adinfo.materialTime,
            adinfo.watchAdTime,
            adinfo.liveStreamId
        );

        // 修改：处理重试情况
        if (subResult === "retry_no_reward") {
            // 如果是重试情况，不算作成功但也不停止，继续下一次
            return "retry";
        }

        if (subResult > 0) {
            // 记录收益
            this.coinStats.total += subResult;
            this.coinStats.byType[adType] += subResult;
            this.pendingCoins += subResult;
        }

        if (subResult == 0) {
            this.$.log(`❌ 账号[${this.index}] 领取金币失败`);
            return "stop";
        }
        if (this.ksnoDelay != "true") {
            if (subResult == 1) {
                this.$.log(`❌ 账号[${this.index}] [${subResult}] 金币风控 暂停领取`);
                return "stop";
            }
        }
        if (this.ksnoDelay != "true") {
            if (subResult == 10) {
                this.$.log(`❌ 账号[${this.index}] [${subResult}] 金币风控 暂停领取`);
                return "stop";
            }
        }

        if (this.shouldStop) {
            this.$.log(`⏹️  ${this.currentAdConfig.name}任务已停止：${this.stopReason}`);
            return "stop";
        }

        if (subResult == 5) {
            this.$.log(`✅ 账号[${this.index}] [${subResult}] 领取直播间金币 5`);
            return "success";
        } else {
            this.$.log(`✅ 账号[${this.index}] 领取金币成功 [${subResult}]`);
            return "success";
        }
    },

    // 运行主方法
    async run(userDataManager) {
        // 初始化时显示最大金币限制和广告追加设置

        const cookieCheckResult = this.checkCookieVariables();
        const missingVariables = Object.keys(cookieCheckResult).filter(
            (key) => !cookieCheckResult[key]
        );

        if (missingVariables.length > 0) {
            return this.$.log(
                `账号[${this.index}] COOKIE 中缺少变量：${missingVariables.join(", ")}`
            );
        }

        if (!this.salt) {
            return this.$.log(`账号[${this.index}] salt 不存在`);
        }

        await this.setupProxy();
        this.setupOaidAndOsVersion();

        this.$.log(`账号[${this.index}] 获取设备标识 [${this.oaid}]`);
        let getPuidRes = await this.getPuid();
        if (!getPuidRes) {
            this.$.log(`账号[${this.index}] 获取神秘参数失败 使用默认参数 `);
        }
        await this.executeInviteTasks();
        if (this.ksdailytask.includes("huge")) {
            await this.hugeSignInInfo();
        }
        // 执行邀请任务

        let flag = await this.userInfoApi();
        if (!flag) {
            return this.$.log(`账号[${this.index}] 获取用户信息失败 请尝试重新抓包`);
        }

        // 在执行任务前更新用户记录
        if (userDataManager) {
            userDataManager.updateUserRecord(this.userId, this.currentEarnings);
        }

        await this.exchangeCoinsType();
        if (this.ksdailytask.includes("box")) {
            await this.openboxInfo();
        }
        //从 searchKey 随机抽取
        this.searchKey = getRandomItem(this.kssearch) || DEFAULT_SEARCH_KEYS[0];
        this.$.log(`账号[${this.index}] 搜索关键词 [${this.searchKey}]`);
        // 执行广告任务 - 改为单次执行
        await this.executeAdTasksSingleRun();

        // 强制上报剩余的金币
        await this.exchangeCoinsType();
        // 显示收益汇总
        this.$.log(this.getCoinSummary());

        // 如果因为达到最大金币限制而停止，显示提示信息
        if (this.shouldStop && this.stopReason) {
            this.$.log(`⏹️ ${this.stopReason}`);
        }

        this.$.log(`🎉 所有任务完成！`);

        return this.coinStats.total;
    },
};

// 需要从 utils 引入
const { DEFAULT_SEARCH_KEYS } = require("./utils");
const { getRandomItem } = require("./utils");
