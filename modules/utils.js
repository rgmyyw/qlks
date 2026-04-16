// 设置中国时间
process.env.TZ = "Asia/Shanghai";

const crypto = require("crypto");
const axios = require("axios");
const querystring = require("querystring");
const { SocksProxyAgent } = require("socks-proxy-agent");
const dns = require("dns");

dns.setDefaultResultOrder("ipv4first");
dns.setServers(["8.8.8.8", "114.114.114.114", "223.5.5.5"]);

console.log(`安装 nodejs 依赖 axios socks-proxy-agent`);

// ==============================================
// 自定义签名接口：KUAISHOU=81 端口  NEBULA=82 端口
// ==============================================
// 默认留空，需要用户通过环境变量配置远程签名 API 地址
const SIGN_API_KUAISHOU = process.env.SIGN_API_KUAISHOU || "";
const SIGN_API_NEBULA = process.env.SIGN_API_NEBULA || "";
if (SIGN_API_KUAISHOU) console.log("💡 普通版签名 API: " + SIGN_API_KUAISHOU);
if (SIGN_API_NEBULA) console.log("💡 极速版签名 API: " + SIGN_API_NEBULA);
if (!SIGN_API_KUAISHOU && !SIGN_API_NEBULA) {
    console.log("⚠️ 未配置签名 API，请在环境变量中设置 SIGN_API_KUAISHOU 或 SIGN_API_NEBULA");
}

// 简单的 apien 实现 - base64 编码
function apien(data) {
    return Buffer.from(data).toString("base64");
}

// 常量定义
const DEFAULT_MAX_REWARD = 30 * 1000;
const DEFAULT_TASKS = ["look", "food", "box"];
const DEFAULT_SEARCH_KEYS = ["短剧", "好货", "百度极速版"];
const DEFAULT_DAILY_TASKS = ["signin", "box", "huge"];

const REQUIRED_COOKIE_KEYS = [
    "kpn",
    "kpf",
    "userId",
    "did",
    "c",
    "appver",
    "language",
    "mod",
    "did_tag",
    "egid",
    "oDid",
    "androidApiLevel",
    "newOc",
    "browseType",
    "socName",
    "ftt",
    "abi",
    "userRecoBit",
    "device_abi",
    "grant_browse_type",
    "iuid",
    "rdid",
    "kuaishou.api_st",
];

const PHONE_MODEL_MAP = {
    MI: [
        "8 Lite",
        "9 Pro",
        "10 Ultra",
        "11T",
        "12X",
        "Note 10",
        "Mix 4",
        "CC9",
        "Pad 5",
    ],
    Huawei: ["P50 Pro", "Mate 40", "Nova 9", "P40 Lite", "MatePad 11", "Enjoy 20e"],
    OPPO: ["Reno 6", "Find X3", "A95", "K9", "Reno 5 Lite", "A74 5G"],
    Vivo: ["X70 Pro", "Y53s", "V21", "S10", "Y20", "X60 Lite"],
    Samsung: ["Galaxy S21", "A52 5G", "M32", "F62", "Z Flip3", "Note 20 Ultra"],
    OnePlus: ["9R", "Nord 2", "8T", "9 Pro", "Nord CE"],
    Realme: ["8 Pro", "GT Neo", "X7 Max", "C25", "Narzo 30"],
    Xiaomi: ["11 Lite", "Redmi Note 10", "Poco X3", "Black Shark 4", "Mi 11i"],
    Nokia: ["G50", "X100", "C20", "5.4", "8.3 5G"],
    Sony: ["Xperia 1 III", "Xperia 5 II", "Xperia 10 III", "Xperia Pro"],
};

const PHONE_MODEL_BRANDS = Object.keys(PHONE_MODEL_MAP);

// 环境读取工具函数
function readEnvString(name, fallback = "") {
    const value = process.env[name];
    if (value === undefined || value === null || value === "") {
        return fallback;
    }
    return String(value);
}

function readEnvNumber(name, fallback, { min = -Infinity, max = Infinity } = {}) {
    const value = process.env[name];
    if (value === undefined || value === null || value === "") {
        return fallback;
    }
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
        return fallback;
    }
    return Math.min(max, Math.max(min, Math.floor(parsed)));
}

function readEnvBooleanString(name, fallback = false) {
    const value = process.env[name];
    if (value === undefined || value === null || value === "") {
        return fallback ? "true" : "false";
    }
    return String(value).toLowerCase() === "true" ? "true" : "false";
}

function parseCsvList(value, fallback = []) {
    if (Array.isArray(value)) {
        return value.filter(Boolean);
    }
    if (typeof value !== "string") {
        return [...fallback];
    }
    const parsed = value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    return parsed.length > 0 ? parsed : [...fallback];
}

function parseCookieString(cookieText, { encodeValues = false } = {}) {
    const cookieObj = {};
    if (!cookieText) {
        return cookieObj;
    }

    cookieText.split(";").forEach((cookieItem) => {
        const segment = cookieItem.trim();
        if (!segment) {
            return;
        }

        const separatorIndex = segment.indexOf("=");
        if (separatorIndex < 0) {
            return;
        }

        const name = segment.slice(0, separatorIndex).trim();
        let value = segment.slice(separatorIndex + 1);
        if (!name) {
            return;
        }

        if (encodeValues && value) {
            value = encodeURIComponent(value);
        }
        cookieObj[name] = value;
    });

    return cookieObj;
}

function buildCookieString(cookieObj) {
    return Object.entries(cookieObj)
        .map(([key, value]) => `${key}=${value}`)
        .join("; ");
}

function getRandomItem(list) {
    if (!Array.isArray(list) || list.length === 0) {
        return "";
    }
    return list[Math.floor(Math.random() * list.length)];
}

function splitIntoChunks(list, chunkSize) {
    const chunks = [];
    for (let i = 0; i < list.length; i += chunkSize) {
        chunks.push(list.slice(i, i + chunkSize));
    }
    return chunks;
}

function shuffleList(list) {
    const shuffled = Array.isArray(list) ? [...list] : [];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

function generateRandomPhoneModel() {
    const brand =
        PHONE_MODEL_BRANDS[Math.floor(Math.random() * PHONE_MODEL_BRANDS.length)];
    const modelList = PHONE_MODEL_MAP[brand] || [];
    const model = modelList[Math.floor(Math.random() * modelList.length)] || "8 Lite";
    return `${brand} ${model} Build/QKQ1.190910.002`;
}

function MD5(str) {
    return crypto.createHash("md5").update(str).digest("hex");
}

module.exports = {
    SIGN_API_KUAISHOU,
    SIGN_API_NEBULA,
    DEFAULT_MAX_REWARD,
    DEFAULT_TASKS,
    DEFAULT_SEARCH_KEYS,
    DEFAULT_DAILY_TASKS,
    REQUIRED_COOKIE_KEYS,
    PHONE_MODEL_MAP,
    PHONE_MODEL_BRANDS,
    apien,
    readEnvString,
    readEnvNumber,
    readEnvBooleanString,
    parseCsvList,
    parseCookieString,
    buildCookieString,
    getRandomItem,
    splitIntoChunks,
    shuffleList,
    generateRandomPhoneModel,
    MD5,
};
