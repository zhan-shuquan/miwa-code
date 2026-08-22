import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const must = (cond, msg) => { if (!cond) throw new Error(msg); };
const registry = read('js/config/route-registry.js');
const routeIds = new Set([...registry.matchAll(/route\("([^"]+)"/g)].map((m) => m[1]));
const pagePaths = [...registry.matchAll(/page:\s*"([^"]+)"/g)].map((m) => m[1]);

for (const page of pagePaths) {
  const normalized = page.replace(/^\.\//, '');
  must(fs.existsSync(path.join(root, normalized)), `Route page缺失：${page}`);
}

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return /\.(html|js)$/.test(entry.name) ? [full] : [];
  });
}

const files = walk(root);
let checked = 0;
const bad = [];
for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  for (const m of text.matchAll(/#\/([A-Za-z0-9_-]+)/g)) {
    checked += 1;
    if (!routeIds.has(m[1])) bad.push(`${path.relative(root, file)} -> ${m[1]}`);
  }
}
must(!bad.length, `发现未注册内部路由：\n${bad.join('\n')}`);

const shellChecks = [
  ['class="miwa-header-main"', 'components/shell/header/desktop-header.html', 'Header'],
  ['class="desktop-sidebar"', 'components/shell/primary-navigation/sidebar.html', 'Sidebar'],
  ['class="desktop-aside"', 'components/shell/aside/aside.html', 'Aside'],
  ['class="desktop-footer"', 'components/shell/footer/footer.html', 'Footer']
];
for (const [marker, expected, label] of shellChecks) {
  const copies = files.filter((file) => file.endsWith('.html') && fs.readFileSync(file, 'utf8').includes(marker));
  must(copies.length === 1 && path.relative(root, copies[0]) === expected,
    `Global ${label}不是唯一来源：${copies.map((f) => path.relative(root, f)).join(', ')}`);
}

console.log(`V1.3 route integrity passed: ${checked} internal route references checked; Global Shell single-source verified.`);
