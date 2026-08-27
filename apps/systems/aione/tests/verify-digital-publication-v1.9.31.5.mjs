import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const must = (cond, msg) => { if (!cond) throw new Error(msg); };

const index = read('index.html');
const system = read('js/miwa-system.js');
const masterCss = read('css/components/miwa-publication-master.css');
const masterJs = read('js/components/miwa-publication-master.js');
const company = read('js/pages/miwa-company-home-book.js');
const business = read('js/pages/miwa-business-home-book.js');
const sidebar = read('js/config/sidebar-registry.js');
const nav = read('js/shell/primary-navigation.js');

must(index.includes('miwa-publication-master.css?v=20260827-v1.9.31.5'), 'publication CSS cache key missing');
must(system.includes('miwa-company-home-book.js?v=20260827-v1.9.31.5-digital-publication'), 'company publication entry missing');
must(system.includes('miwa-business-home-book.js?v=20260827-v1.9.31.5-digital-publication'), 'business publication entry missing');
must(masterCss.includes('MIWA Editorial Interior System'), 'editorial interior CSS missing');
must(masterCss.includes('.miwa-publication-editorial-grid.cols-3'), 'PPT-style three-column layout missing');
must(masterCss.includes('.miwa-publication-directory-card'), 'publication directory layout missing');
must(masterCss.includes('@page{size:A4 portrait'), 'A4 portrait print rule missing');
must(masterJs.includes('aione:publication:pdf'), 'publication PDF action missing');
must(company.includes('genericBookHtml(routeId)'), 'company chapter publication renderer missing');
must(company.includes('miwa-publication-editorial-grid cols-3'), 'company editorial card composition missing');
must(business.includes('genericBookHtml(routeId)'), 'business chapter publication renderer missing');
must(business.includes('principlesContent(page)'), 'business principle editorial renderer missing');
must(sidebar.includes('label:"打印"') && sidebar.includes('label:"导出PDF"'), 'sidebar publication actions missing');
must(nav.includes('action.startsWith("aione:publication:")'), 'sidebar publication event bridge missing');

console.log('V1.9.31.5 editorial publication chapters validation passed.');
