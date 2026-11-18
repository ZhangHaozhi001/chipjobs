// Static server for the ChipJobs site (https form). Serves src/ so that
// /tapekit-site/ and /data/ resolve exactly like the DeWEB bundle layout.
// Usage: npm run demo:site  (PORT env, default 8077)
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const srcRoot = join(dirname(fileURLToPath(import.meta.url)), '..', 'src');
const port = Number(process.env.PORT || 8077);
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };

createServer(async (req, res) => {
  let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (path === '/') path = '/tapekit-site/';
  if (path.endsWith('/')) path += 'index.html';
  const file = normalize(join(srcRoot, path));
  if (!file.startsWith(srcRoot)) { res.writeHead(403).end(); return; }
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': types[file.slice(file.lastIndexOf('.'))] || 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404).end('not found'); }
}).listen(port, () => console.log(`ChipJobs site at http://127.0.0.1:${port}/tapekit-site/`));
