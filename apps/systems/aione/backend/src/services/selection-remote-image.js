import https from "node:https";
import http from "node:http";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
// Images are fetched without user credentials, with DNS pinning and bounded redirects.
export function publicIPv4(ip) {
  if (isIP(ip) !== 4) return false;
  const [a, b, c] = ip.split(".").map(Number);
  return !(
    a === 0 ||
    a === 10 ||
    a === 127 ||
    a >= 224 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0) ||
    (a === 192 && b === 88 && c === 99) ||
    (a === 198 && b === 51 && c === 100) ||
    (a === 203 && b === 0 && c === 113) ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 198 && (b === 18 || b === 19))
  );
}
export async function fetchSelectionImage(
  raw,
  maxBytes,
  depth = 0,
  head = false,
) {
  let url;
  try { url = new URL(raw); } catch { throw Error('请输入有效HTTP或HTTPS图片网址'); }
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    (url.port && url.port !== (url.protocol === 'https:' ? '443' : '80')) ||
    depth > 3
  )
    throw Error("图片地址不支持安全读取");
  const addresses = await lookup(url.hostname, { family: 4, all: true }).catch(() => { throw Error('图片网址域名无法解析'); });
  if (!addresses.length || addresses.some((a) => !publicIPv4(a.address)))
    throw Error("不能读取内部网络图片地址");
  const address = addresses[0].address;
  return new Promise((resolve, reject) => {
    const request = (url.protocol === 'https:' ? https : http).get(
      url,
      {
        method: head ? "HEAD" : "GET",
        lookup: (_host, options, cb) =>
          options.all
            ? cb(null, [{ address, family: 4 }])
            : cb(null, address, 4),
        headers: { Accept: "image/jpeg,image/png,image/webp" },
      },
      (response) => {
        if (
          [301, 302, 303, 307, 308].includes(response.statusCode) &&
          response.headers.location
        ) {
          response.resume();
          resolve(
            fetchSelectionImage(
              new URL(response.headers.location, url).href,
              maxBytes,
              depth + 1,
              head,
            ),
          );
          return;
        }
        if (response.statusCode !== 200) {
          response.resume();
          reject(Error("远程图片读取失败：HTTP " + response.statusCode));
          return;
        }
        if (head) {
          response.resume();
          resolve({ url: url.href });
          return;
        }
        if (Number(response.headers['content-length']) > maxBytes) {
          response.destroy();
          reject(Error('远程图片超过后台大小限制'));
          return;
        }
        let size = 0;
        const chunks = [];
        response.on("data", (chunk) => {
          size += chunk.length;
          if (size > maxBytes) {
            request.destroy(Error("远程图片超过后台大小限制"));
            return;
          }
          chunks.push(chunk);
        });
        response.on("end", () =>
          resolve({
            filename: (url.pathname.split("/").pop() || "source-image").slice(0, 200),
            base64: Buffer.concat(chunks).toString("base64"),
          }),
        );
        response.on("error", reject);
      },
    );
    request.setTimeout(10000, () => request.destroy(Error("远程图片读取超时")));
    const deadline = setTimeout(() => request.destroy(Error('远程图片读取超时')), 12000);
    request.on('close', () => clearTimeout(deadline));
    request.on("error", reject);
  });
}
