/**
 * sendNotify.js - 青龙通知模块兼容文件
 *
 * 在青龙面板中运行时，会使用青龙内置的 sendNotify 函数
 * 本地运行时，此文件提供降级处理
 */

/**
 * 发送通知
 * 在青龙环境中此函数会被覆盖，这里仅做空实现防止重复通知
 * @param {string} _title 通知标题
 * @param {string} _content 通知内容
 */
async function sendNotify(_title, _content) {
    // 空实现 - 青龙面板会覆盖此函数
    // 钉钉通知由 index.js 中的 sendDingTalkNotification 处理
}

module.exports = {
    sendNotify
};