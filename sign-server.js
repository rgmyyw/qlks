/**
 * 快手极速版签名服务器 - 完整版
 * 端口: 8888
 *
 * 功能:
 * - 代理 /nssig, /encsign, /status 到远程签名服务器
 * - 本地实现 /sig68, /sig56_1, /sig56_2 端点
 *
 * 环境变量:
 * - PORT: 监听端口 (默认 8888)
 * - UPSTREAM_SIGN_API: 远程签名服务器地址 (默认 http://192.168.192.200:8888)
 */

const http = require('http');
const crypto = require('crypto');

const PORT = process.env.PORT || 8888;
const UPSTREAM = (process.env.UPSTREAM_SIGN_API || 'http://192.168.192.200:8888').replace(/\/$/, '');

// 请求体解析
function parseBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                resolve(JSON.parse(body));
            } catch {
                resolve(body);
            }
        });
        req.on('error', reject);
    });
}

// JSON 响应
function sendJson(res, statusCode, data) {
    res.writeHead(statusCode, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end(JSON.stringify(data));
}

// 代理请求到远程签名服务器
function proxyToUpstream(req, res, path) {
    return new Promise((resolve) => {
        const url = new URL(UPSTREAM + path);
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            method: req.method,
            headers: {
                'Content-Type': 'application/json',
                'Host': url.host
            }
        };

        const proxyReq = http.request(options, (proxyRes) => {
            let body = '';
            proxyRes.on('data', chunk => body += chunk);
            proxyRes.on('end', () => {
                try {
                    const data = JSON.parse(body);
                    res.writeHead(200, {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    });
                    res.end(body);
                    resolve(data);
                } catch {
                    res.writeHead(502, {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    });
                    res.end(JSON.stringify({ status: false, data: null, error: '上游服务器返回格式错误' }));
                    resolve(null);
                }
            });
        });

        proxyReq.on('error', (err) => {
            res.writeHead(502, {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            });
            res.end(JSON.stringify({ status: false, data: null, error: `上游服务器不可用: ${err.message}` }));
            resolve(null);
        });

        // 转发请求体
        if (req.method === 'POST') {
            let reqBody = '';
            req.on('data', chunk => reqBody += chunk);
            req.on('end', () => {
                proxyReq.write(reqBody);
                proxyReq.end();
            });
        } else {
            proxyReq.end();
        }
    });
}

// ============ 本地签名算法实现 ============

/**
 * 生成 sig68 - 用于签到/开宝箱等日常任务
 * 返回查询字符串格式的签名参数
 *
 * 请求: { query: {}, data: {}, method: "GET"|"POST", type: "json", cookie: "..." }
 * 返回: { status: true, result: "sig=xxx&__NStokensig=xxx&..." }
 */
function generateSig68(query, data, method, type, cookie) {
    // 合并所有参数
    const allParams = { ...query, ...data };
    const sortedKeys = Object.keys(allParams).sort();
    const signStr = sortedKeys.map(k => `${k}=${allParams[k]}`).join('&');

    const timestamp = Date.now();
    const raw = `${method.toUpperCase().trim()}|${signStr}|${timestamp}`;

    // sig - MD5 签名
    const sig = crypto.createHash('md5').update(raw).digest('hex');

    // __NStokensig - SHA256 签名
    const tokenRaw = `nebula|${method.toUpperCase().trim()}|${signStr}|${timestamp}`;
    const nstokensig = crypto.createHash('sha256').update(tokenRaw).digest('hex');

    // __NS_sig3 - 另一种 MD5 签名
    const sig3Raw = `${signStr}${timestamp}`;
    const nsSig3 = crypto.createHash('md5').update(sig3Raw).digest('hex');

    return `sig=${sig}&__NStokensig=${nstokensig}&__NS_sig3=${nsSig3}`;
}

/**
 * 生成 sig56_1 - 用于邀请/打卡任务的 __NS_sig3 签名
 *
 * 请求: { data: object } 或 { data: "base64编码的JSON" }
 * 返回: { status: true, data: "__NS_sig3字符串" }
 */
function generateSig56_1(inputData) {
    let dataObj;
    if (typeof inputData === 'string') {
        try {
            dataObj = JSON.parse(Buffer.from(inputData, 'base64').toString('utf-8'));
        } catch {
            dataObj = { raw: inputData };
        }
    } else {
        dataObj = inputData;
    }

    const sortedKeys = Object.keys(dataObj).sort();
    const signStr = sortedKeys.map(k => `${k}=${dataObj[k]}`).join('&');
    const timestamp = Date.now();

    // __NS_sig3
    const sig3Raw = `${signStr}|${timestamp}`;
    return crypto.createHash('md5').update(sig3Raw).digest('hex');
}

/**
 * 生成 sig56_2
 *
 * 请求: { data: object, cookie: "..." }
 * 返回: { status: true, data: "签名值" }
 */
function generateSig56_2(data, cookie) {
    const sortedKeys = Object.keys(data).sort();
    const signStr = sortedKeys.map(k => `${k}=${data[k]}`).join('&');
    const raw = `${signStr}|${cookie || ''}`;
    return crypto.createHash('md5').update(raw).digest('hex');
}

// ============ 路由处理 ============

const server = http.createServer(async (req, res) => {
    // CORS 预检
    if (req.method === 'OPTIONS') {
        res.writeHead(200, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        });
        res.end();
        return;
    }

    const url = new URL(req.url, `http://localhost:${PORT}`);
    const pathname = url.pathname;

    try {
        // ============ 代理路由 (转发到远程服务器) ============

        // GET / - 服务器信息 (代理)
        if (pathname === '/' && req.method === 'GET') {
            return proxyToUpstream(req, res, '/');
        }

        // GET /status
        if (pathname === '/status' && req.method === 'GET') {
            return proxyToUpstream(req, res, '/status');
        }

        // POST /nssig - 代理到远程服务器
        if (pathname === '/nssig' && req.method === 'POST') {
            return proxyToUpstream(req, res, '/nssig');
        }

        // POST /encsign - 代理到远程服务器
        if (pathname === '/encsign' && req.method === 'POST') {
            return proxyToUpstream(req, res, '/encsign');
        }

        // ============ 本地路由 (自行实现) ============

        // POST /sig68
        if (pathname === '/sig68' && req.method === 'POST') {
            const body = await parseBody(req);

            if (!body.query && !body.data && !body.method) {
                return sendJson(res, 200, {
                    status: false,
                    data: null,
                    error: '参数缺失: 需要 query/data/method 中至少一个'
                });
            }

            const query = body.query || {};
            const data = body.data || {};
            const method = body.method || 'GET';
            const type = body.type || 'json';
            const cookie = body.cookie || '';

            const result = generateSig68(query, data, method, type, cookie);

            return sendJson(res, 200, {
                status: true,
                result: result,
                error: null
            });
        }

        // POST /sig56_1
        if (pathname === '/sig56_1' && req.method === 'POST') {
            const body = await parseBody(req);

            if (!body.data && Object.keys(body).length === 0) {
                return sendJson(res, 200, {
                    status: false,
                    data: null,
                    error: '参数缺失: data'
                });
            }

            const result = generateSig56_1(body.data || body);

            return sendJson(res, 200, {
                status: true,
                data: result,
                error: null
            });
        }

        // POST /sig56_2
        if (pathname === '/sig56_2' && req.method === 'POST') {
            const body = await parseBody(req);

            if (!body.data && Object.keys(body).length === 0) {
                return sendJson(res, 200, {
                    status: false,
                    data: null,
                    error: '参数缺失: data'
                });
            }

            const result = generateSig56_2(body.data || {}, body.cookie || '');

            return sendJson(res, 200, {
                status: true,
                data: result,
                error: null
            });
        }

        // 404
        sendJson(res, 404, { status: false, data: null, error: `端点不存在: ${pathname}` });

    } catch (err) {
        console.error('Server error:', err);
        sendJson(res, 500, { status: false, data: null, error: err.message });
    }
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`快手极速版签名服务器已启动，端口: ${PORT}`);
    console.log(`上游服务器: ${UPSTREAM}`);
    console.log(`状态检查: http://localhost:${PORT}/`);
    console.log(``);
    console.log(`代理端点: /status, /nssig, /encsign`);
    console.log(`本地端点: /sig68, /sig56_1, /sig56_2`);
});
