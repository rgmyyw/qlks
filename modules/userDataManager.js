class UserDataManager {
    constructor() {
        this.userData = {};
        this.userDataPath = require("path").resolve("./users.json");
        this.loadUserData();
    }

    loadUserData() {
        try {
            const fs = require("fs");
            if (fs.existsSync(this.userDataPath)) {
                const data = fs.readFileSync(this.userDataPath, "utf8");
                this.userData = JSON.parse(data);
                console.log(
                    `✅ 成功加载用户数据，共 ${Object.keys(this.userData).length} 个用户`
                );
            } else {
                this.userData = {};
                console.log("⚠️ 用户数据文件不存在，将创建新文件");
            }
        } catch (e) {
            console.log(`❌ 加载用户数据失败：${e.message}`);
            this.userData = {};
        }
    }

    saveUserData() {
        try {
            const fs = require("fs");
            fs.writeFileSync(
                this.userDataPath,
                JSON.stringify(this.userData, null, 2)
            );
            console.log(`✅ 用户数据已保存到 ${this.userDataPath}`);
        } catch (e) {
            console.log(`❌ 保存用户数据失败：${e.message}`);
        }
    }

    updateUserRecord(userId, currentEarnings) {
        const now = Date.now();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (!this.userData[userId]) {
            // 新用户，第一次使用
            this.userData[userId] = {
                firstUseTimestamp: now,
                initialEarnings: currentEarnings,
                lastUpdate: now,
                totalEarnings: currentEarnings,
                usageCount: 1,
                todayEarnings: currentEarnings,
            };
            console.log(
                `📝 新用户 ${userId} 已记录，初始收益：${currentEarnings} 金币`
            );
        } else {
            const userRecord = this.userData[userId];
            const lastUpdateDate = new Date(userRecord.lastUpdate);
            const isNewDay =
                lastUpdateDate.getDate() !== today.getDate() ||
                lastUpdateDate.getMonth() !== today.getMonth() ||
                lastUpdateDate.getFullYear() !== today.getFullYear();

            if (isNewDay) {
                // 新的一天，重置今日收益
                userRecord.initialEarnings = currentEarnings;
                userRecord.todayEarnings = currentEarnings;
                console.log(`📅 用户 ${userId} 新的一天开始，重置今日收益记录`);
            } else {
                // 同一天，更新今日收益
                userRecord.todayEarnings = currentEarnings;
            }

            // 更新其他信息
            userRecord.lastUpdate = now;
            userRecord.totalEarnings = Math.max(
                userRecord.totalEarnings,
                currentEarnings
            );
            userRecord.usageCount = (userRecord.usageCount || 0) + 1;
            // 计算今日实际收益
            const todayActualEarnings = currentEarnings - userRecord.initialEarnings;
            console.log(
                `📊 用户 ${userId} 今日收益：${todayActualEarnings} 金币，总使用次数：${userRecord.usageCount}`
            );
        }
    }

    getUserStats(userId) {
        if (this.userData[userId]) {
            const record = this.userData[userId];
            const todayEarnings = record.todayEarnings - record.initialEarnings;

            return {
                firstUseTime: new Date(record.firstUseTimestamp).toLocaleString(),
                initialEarnings: record.initialEarnings,
                todayEarnings: todayEarnings,
                totalEarnings: record.totalEarnings,
                usageCount: record.usageCount,
                lastUpdate: new Date(record.lastUpdate).toLocaleString(),
            };
        }
        return null;
    }

    getAllUserStats() {
        const stats = [];
        for (const userId in this.userData) {
            const userStats = this.getUserStats(userId);
            if (userStats) {
                stats.push({
                    userId: userId,
                    ...userStats,
                });
            }
        }
        return stats;
    }
}

module.exports = UserDataManager;
