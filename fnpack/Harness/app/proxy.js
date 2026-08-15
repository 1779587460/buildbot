const http = require('http');
const net = require('net');
const url = require('url');

// ---------- 配置 ----------
const TARGET_URL = 'http://127.0.0.1:3080';
const PROXY_PORT = Number(process.env.PROXY_PORT) || 3079;
// --------------------------

const target = new URL(TARGET_URL);
const targetHost = target.hostname;
const targetPort = target.port || (target.protocol === 'https:' ? 443 : 80);

const server = http.createServer((req, res) => {
  const targetReqUrl = new URL(req.url, TARGET_URL);
  const options = {
    hostname: targetHost,
    port: targetPort,
    path: targetReqUrl.pathname + targetReqUrl.search,
    method: req.method,
    headers: { ...req.headers }
  };

  // 删除指定请求头
  ['origin', 'sec-fetch-site', 'sec-fetch-mode', 'sec-fetch-dest']
    .forEach(h => delete options.headers[h]);

  // 强制 Host 头
  options.headers.host = `${targetHost}:${targetPort}`;

  const proxyReq = http.request(options, (proxyRes) => {
    const headers = { ...proxyRes.headers };
    headers['access-control-allow-origin'] = '*';
    res.writeHead(proxyRes.statusCode, headers);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    console.error(`[HTTP Proxy Error] ${err.message}`);
    res.writeHead(500, { 'content-type': 'text/plain' });
    res.end('Proxy error');
  });

  req.pipe(proxyReq);
});

// WebSocket 升级处理
server.on('upgrade', (req, socket, head) => {
  const targetReqUrl = new URL(req.url, TARGET_URL);
  targetReqUrl.protocol = 'ws:';

  const proxySocket = net.connect(targetPort, targetHost, () => {
    const headers = { ...req.headers };
    ['origin', 'sec-fetch-site', 'sec-fetch-mode', 'sec-fetch-dest']
      .forEach(h => delete headers[h]);
    headers.host = `${targetHost}:${targetPort}`;

    let reqLine = `GET ${targetReqUrl.pathname}${targetReqUrl.search} HTTP/1.1\r\n`;
    reqLine += Object.keys(headers)
      .map(k => `${k}: ${headers[k]}`)
      .join('\r\n') + '\r\n\r\n';

    proxySocket.write(reqLine);
    if (head && head.length) proxySocket.write(head);
    socket.pipe(proxySocket).pipe(socket);
  });

  proxySocket.on('error', (err) => {
    console.error(`[WebSocket Proxy Error] ${err.message}`);
    socket.destroy();
  });
  socket.on('error', (err) => {
    console.error(`[Client Socket Error] ${err.message}`);
    proxySocket.destroy();
  });
});

server.listen(PROXY_PORT, () => {
  console.log(`✅ Proxy listening on http://localhost:${PROXY_PORT}`);
  console.log(`➡️  Forwarding to ${TARGET_URL}`);
});