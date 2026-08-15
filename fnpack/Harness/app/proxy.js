const http = require('http');
const https = require('https');
const net = require('net');
const url = require('url');

// ---------- 配置 ----------
const TARGET_URL = 'http://127.0.0.1:3080';
const PROXY_PORT = Number(process.env.PROXY_PORT) || 3079;
const PROXY_HTTPS = process.env.PROXY_HTTPS === 'true';  // 默认 false（HTTP）
// --------------------------

// ---------- 硬编码证书（PEM 格式） ----------
const CERT_PEM = `-----BEGIN CERTIFICATE-----
MIIDwDCCAqigAwIBAgIGEaAEszCfMA0GCSqGSIb3DQEBCwUAMHAxFjAUBgNVBAMT
DTE5Mi4xNjguMS4xMDAxCzAJBgNVBAYTAkNOMRAwDgYDVQQIEwdCZWlqaW5nMRAw
DgYDVQQHEwdCZWlqaW5nMRgwFgYDVQQKEw9JbnRyYW5ldCBTZXJ2ZXIxCzAJBgNV
BAsTAklUMB4XDTI2MDgxNTA5MTQwN1oXDTI4MDgxNDA5MTQwN1owcDEWMBQGA1UE
AxMNMTkyLjE2OC4xLjEwMDELMAkGA1UEBhMCQ04xEDAOBgNVBAgTB0JlaWppbmcx
EDAOBgNVBAcTB0JlaWppbmcxGDAWBgNVBAoTD0ludHJhbmV0IFNlcnZlcjELMAkG
A1UECxMCSVQwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQCgBBDnRF77
p/pKtdv0FZjPwL3WLkF1l71BOLY78DxelPflWpeM5eCnq2D5f6K7lM5qTREgfZrI
6l3WVXJHTNq/sikmL5pL5Dwv5o57zvT9QHTsBbfhsKnkfk49kdnXnnPvdpXbFU4A
zmW/qDGWF4/aR4USV1sNvwKnpjPt+O41ar6Yg0vcc453YjUxIx9tIvTmLcMyS2NP
O3QsTSRZMwxI8UCuOXI+hyiyTnvFSz2JlP+0h1RLlt3ALw6S9UVbuXDiMhKNupGD
lS/6v8M25A5+DHRu2wpD3NLrgFsEV0xSiNMUx4YyIKYkJ4pdRCl2bD/E/AN2dXFR
QPfL2aIPiFovAgMBAAGjYDBeMAkGA1UdEwQCMAAwCwYDVR0PBAQDAgWgMB0GA1Ud
JQQWMBQGCCsGAQUFBwMBBggrBgEFBQcDAjAlBgNVHREEHjAchwTAqAFkggxzZXJ2
ZXIubG9jYWyCBnNlcnZlcjANBgkqhkiG9w0BAQsFAAOCAQEAJ+KL3P/6rqoowD4H
146H9REbVEluvEneRi5m65DYx61GVRkotx/4GGl67UZeccgAnPxT43udTFyYFwYl
V7NMQ5iiSBEt+Nk/hB8M/Rsp+5JuVjakqW3m0tRZvO4BOkXXzauqXoH1urhT6XFR
lDBfeTOdFMhhL8StwadoUpoFwS2KHKGb5qk25HgljWUzCKQ5l8+Qlwk4dCuZuttE
r3EGf4hjEzzFlfqQYJtFR7SI/E1t4qigPSe9P25f8ZtMn/sSvLc6jnfH2s3IY7K1
blREumLF9++9jGLN4djzT0CDRz86x0luMotfwv+u3WCuHO6QD0y9zbYsDH/HTjiP
r5iAsA==
-----END CERTIFICATE-----`;

const KEY_PEM = `-----BEGIN RSA PRIVATE KEY-----
MIIEogIBAAKCAQEAoAQQ50Re+6f6SrXb9BWYz8C91i5BdZe9QTi2O/A8XpT35VqX
jOXgp6tg+X+iu5TOak0RIH2ayOpd1lVyR0zav7IpJi+aS+Q8L+aOe870/UB07AW3
4bCp5H5OPZHZ155z73aV2xVOAM5lv6gxlheP2keFEldbDb8Cp6Yz7fjuNWq+mINL
3HOOd2I1MSMfbSL05i3DMktjTzt0LE0kWTMMSPFArjlyPocosk57xUs9iZT/tIdU
S5bdwC8OkvVFW7lw4jISjbqRg5Uv+r/DNuQOfgx0btsKQ9zS64BbBFdMUojTFMeG
MiCmJCeKXUQpdmw/xPwDdnVxUUD3y9miD4haLwIDAQABAoIBAFB/WyWMnp/I9D/r
VthmmPZChv2dTW7jw+BwsDRc+XG3TTIDLeRCrI6Mx38cN3hYNrMBTBFlPp2+UTCG
0bOOtSjkbpD4N43gJmsOeDVOeq6AY5FsmwGdhwochC2zFrzCyJ35sQ+CmzgKnOMa
sL9J4SM1AXulmHfE1IgUM2GO7f7Ogcg8SnwKDmnKIDeU8tN+kZ8brx5vv0tdD/ca
sEJyyF0Kht8IlinVnxBkA9hAN77QLNsJJHRusKr477F3CP1rDsvg/yYfFX0GF/N0
xbIbiefZKklDcEW4b96l7lrh2azTCNyCGNMuzCZWxLJ70fWvSUVKV/mNzXPbcuvU
F1m8fWkCgYEA9feVNeznZlg3MNd/PEzYZ2EHeScnSjaA7T6yqqnX3tTK+h8LaXg1
qiKDNV6yYgPinPnNNKA/kiTwtNcu2CO1rcm4GPSaxq3Smg6jvr3dipYZYBMA2d13
OQVrv5ylYqSAANvDDvkUZU5wO8uLxPUejLDCuW6yqz5CnxjZRo0aw5MCgYEApor4
bENThCjylPUlXP4JjVwMOIZoy8H0E+XnQmHsr1aK/JY4EKEkTbp0IMclH0U/v2jE
0+E0bCrJu4dnNdQWlRzPlRyuvSUK7GE+odAxKubwhhphjMUHlFya4opdD87P7jAE
rjggdHJlbxAwwpqHmEExcdF8cn7rEWpiXUAKKHUCgYAHznPN4lb1yJb31d8T6txz
a4DxN2znzhMJdJP3FqzjRZ2rkpCqKEaLv8yqRPckZTssAEGjCfL6kHGTS8EQ2xFJ
Er3lDN5cr+efPBe2VhBR9bGYewHr6DuAc8uXqUEWgGIPpOnr77vV+0dUnoExHxZ5
IKMNf5XsGW3D3uYGdzQCQQKBgD4sT0WLdNg3uSfmxMYMiGBfZqiLdP/sLkRnZYgg
qo1ij4xwQAnlPnpOCyBZeABOh9fbMu+ueTWQW7NIfz1XKf8MvGn8RTeTZpqMSyd5
Y4GSqWRG4Pf+bi/yylecM9W87V8MShMIHQWb10Y5ExrzOX+bhuvour67puHfh00s
pR4pAoGAG0LPuec4ZZvgR1zze7HBubF2qFFxYgX4jmP2nvjLCz71jFXpo2DkxO5C
/67gcYYVQ1ho04z3JHNAmW6efC9BCbtc+vegGKF7UiB05Q6+yBOJfunIkNs0RCN+
OdS1WwmxoX+L20UDO54wr4f4McLGNaI7qg9d1b5vbYCFej0Oen4=
-----END RSA PRIVATE KEY-----`;
// --------------------------------------------------

const target = new URL(TARGET_URL);
const targetHost = target.hostname;
const targetPort = target.port || (target.protocol === 'https:' ? 443 : 80);

// 定义请求处理函数（HTTP 和 HTTPS 共用）
function requestHandler(req, res) {
  const targetReqUrl = new URL(req.url, TARGET_URL);
  const options = {
    hostname: targetHost,
    port: targetPort,
    path: targetReqUrl.pathname + targetReqUrl.search,
    method: req.method,
    headers: { ...req.headers }
  };

  ['origin', 'sec-fetch-site', 'sec-fetch-mode', 'sec-fetch-dest']
    .forEach(h => delete options.headers[h]);

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
}

// 定义 WebSocket 升级处理（两者相同）
function upgradeHandler(req, socket, head) {
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
}

// ---------- 根据环境变量决定协议 ----------
let server;
if (PROXY_HTTPS) {
  // 启用 HTTPS，使用硬编码证书
  let sslOptions;
  try {
    sslOptions = {
      key: KEY_PEM,
      cert: CERT_PEM,
    };
    server = https.createServer(sslOptions, requestHandler);
    console.log('🔒 HTTPS 模式已启用（使用内嵌证书）');
  } catch (err) {
    console.error(`❌ 证书格式异常: ${err.message}，将降级为 HTTP`);
    server = http.createServer(requestHandler);
    console.log('🔓 HTTP 模式已启用（降级）');
  }
} else {
  server = http.createServer(requestHandler);
  console.log('🔓 HTTP 模式已启用（环境变量 PROXY_HTTPS 未设为 true）');
}

server.on('upgrade', upgradeHandler);

server.listen(PROXY_PORT, () => {
  const protocol = (PROXY_HTTPS && server instanceof https.Server) ? 'https' : 'http';
  console.log(`✅ Proxy listening on ${protocol}://localhost:${PROXY_PORT}`);
  console.log(`➡️  Forwarding to ${TARGET_URL}`);
});
