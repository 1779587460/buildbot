const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

// ============ 配置（支持独立的环境变量）============
const FRONTEND_PORT = process.env.FRONTEND_PORT || 8008; // 前端监听端口
const BACKEND_PORT = process.env.BACKEND_PORT || 8009;   // 后端端口
const BACKEND = `http://localhost:${BACKEND_PORT}`;      // 动态拼接后端地址
const STATIC_ROOT = '/var/apps/CloudSaver/target/html';

// 简易 MIME 类型映射（常见前端文件）
const mimeMap = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};
const defaultMime = 'application/octet-stream';

// ============ 工具函数 ============
function getMime(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return mimeMap[ext] || defaultMime;
}

// 静态文件服务（含 SPA 回退）
function serveStatic(req, res) {
  const parsed = url.parse(req.url);
  let filePath = path.join(STATIC_ROOT, parsed.pathname);

  // 安全检查：防止目录遍历
  if (!filePath.startsWith(STATIC_ROOT)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  // 如果是目录，尝试读取目录下的 index.html（对应 nginx 的 $uri/）
  function tryFile(file, callback) {
    fs.stat(file, (err, stats) => {
      if (err) return callback(err);
      if (stats.isDirectory()) {
        // 尝试目录下的 index.html
        const indexFile = path.join(file, 'index.html');
        fs.stat(indexFile, (err2, stats2) => {
          if (err2 || !stats2.isFile()) return callback(new Error('not found'));
          callback(null, indexFile);
        });
      } else {
        callback(null, file);
      }
    });
  }

  tryFile(filePath, (err, finalFile) => {
    if (err) {
      // 文件或目录都不存在 -> 回退到 index.html (SPA)
      const fallback = path.join(STATIC_ROOT, 'index.html');
      fs.readFile(fallback, (err2, data) => {
        if (err2) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Not Found');
          return;
        }
        // 添加禁用缓存头
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.setHeader('Content-Type', 'text/html');
        res.end(data);
      });
    } else {
      // 找到了具体文件
      fs.readFile(finalFile, (err2, data) => {
        if (err2) {
          res.writeHead(500);
          res.end('Internal Server Error');
          return;
        }
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.setHeader('Content-Type', getMime(finalFile));
        res.end(data);
      });
    }
  });
}

// 反向代理工具函数
function proxyRequest(req, res, targetPath, rewritePath) {
  const backendUrl = new URL(targetPath, BACKEND);
  const options = {
    hostname: backendUrl.hostname,
    port: backendUrl.port || 80,
    path: rewritePath || backendUrl.pathname + (backendUrl.search || ''),
    method: req.method,
    headers: {
      ...req.headers,
      // 覆盖或添加代理必需的请求头
      'Host': req.headers.host || backendUrl.host,
      'X-Real-IP': req.socket.remoteAddress || '',
      'X-Forwarded-For': (req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'] + ', ' : '') + req.socket.remoteAddress,
      'X-Forwarded-Proto': 'http',   // 假设前端是 http
      'X-Original-URI': req.url,
      'X-Forwarded-Host': req.headers.host || '',
    },
  };

  // 删除可能冲突的 hop-by-hop 头（简单处理）
  delete options.headers['connection'];

  const proxyReq = http.request(options, (proxyRes) => {
    // 复制状态码和头
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    console.error('Proxy error:', err);
    res.writeHead(502);
    res.end('Bad Gateway');
  });

  // 如果请求有 body，管道过去
  req.pipe(proxyReq);
}

// ============ 创建服务器 ============
const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url);
  const pathname = parsed.pathname;

  // 1. /api/ 代理（去除 /api 前缀）
  if (pathname.startsWith('/api/')) {
    const newPath = pathname.replace(/^\/api/, '') + (parsed.search || '');
    proxyRequest(req, res, newPath);
    return;
  }

  // 2. /tele-images/ 代理（路径不动）
  if (pathname.startsWith('/tele-images/')) {
    proxyRequest(req, res, pathname + (parsed.search || ''));
    return;
  }

  // 3. 其他全部走静态文件服务（包含 SPA 回退）
  serveStatic(req, res);
});

// 监听 IPv6 和 IPv4（默认双栈），端口及后端地址均由环境变量控制
server.listen(FRONTEND_PORT, '::', () => {
  console.log(`Server running on http://[::]:${FRONTEND_PORT} (IPv4+IPv6)`);
  console.log(`Backend API target: ${BACKEND}`);
});
