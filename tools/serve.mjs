import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = Number(process.env.PORT || 8080);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Geçersiz PORT değeri.');
const mime = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.jpg':'image/jpeg','.jpeg':'image/jpeg','.txt':'text/plain; charset=utf-8','.mp3':'audio/mpeg','.wav':'audio/wav','.woff2':'font/woff2'};
const server = http.createServer(async (request, response) => {
  if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405, {'Allow':'GET, HEAD'}); response.end(); return; }
  try {
    let relative = decodeURIComponent(new URL(request.url, 'http://localhost').pathname).replace(/^\/+/, '');
    if (!relative) relative = 'index.html';
    const target = path.resolve(root, relative);
    if ((relative !== 'index.html' && !relative.startsWith('assets/')) || !target.startsWith(root)) { response.writeHead(404); response.end('Dosya bulunamadı.'); return; }
    const data = await readFile(target);
    response.writeHead(200, {'Content-Type':mime[path.extname(target).toLowerCase()] || 'application/octet-stream','Content-Length':data.length,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
    response.end(request.method === 'HEAD' ? undefined : data);
  } catch {
    response.writeHead(404, {'Content-Type':'text/plain; charset=utf-8'});
    response.end('Dosya bulunamadı.');
  }
});
server.on('error', error => { console.error('Sunucu açılamadı:', error.message); process.exitCode = 1; });
server.listen(port, '127.0.0.1', () => console.log(`BToyun hazır: http://127.0.0.1:${port}/ — Kapatmak için Ctrl+C`));
