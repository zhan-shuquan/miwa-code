import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const mustContain = (text, needle, label) => {
  if (!text.includes(needle)) throw new Error(`${label}: missing ${needle}`);
};
const mustNotContain = (text, needle, label) => {
  if (text.includes(needle)) throw new Error(`${label}: unexpected ${needle}`);
};

const routes = read('js/config/route-registry.js');
const system = read('js/miwa-system.js');
const home = read('pages/sampling-workbench/home.html');
const queue = read('pages/sampling-workbench/queue.html');
const overview = read('pages/sampling-workbench/overview.html');
const samplingJs = read('js/pages/sampling-workbench.js');

mustContain(routes, 'page: "./pages/sampling-workbench/home.html"', 'sampling root route');
mustContain(routes, 'page: "./pages/sampling-workbench/queue.html"', 'sampling queue route');
mustContain(system, 'initSamplingWorkbench();', 'sampling root init');
mustContain(system, 'initSamplingQueue();', 'sampling queue init');
mustContain(home, 'id="sampling-status-grid"', 'sampling status dashboard');
mustContain(home, 'id="sampling-flow-track"', 'sampling flow dashboard');
mustContain(home, 'id="sampling-metrics"', 'sampling metrics dashboard');
mustContain(home, 'id="sampling-dashboard-card-grid"', 'sampling current products');
mustContain(home, 'href="#/sampling-overview"', 'sampling overview child');
mustContain(home, 'href="#/sampling-tasks"', 'sampling tasks child');
mustContain(queue, 'id="sampling-opportunity-list"', 'sampling queue');
mustContain(overview, 'sampling-guide-links--three', 'sampling relationship');
mustNotContain(overview, 'href="#/procurement"', 'sampling overview direct procurement link');
mustNotContain(overview, 'href="#/publishing"', 'sampling overview direct publishing link');
mustContain(samplingJs, 'export function initSamplingWorkbench()', 'sampling dashboard module');
mustContain(samplingJs, 'export function initSamplingQueue()', 'sampling queue module');

console.log('Sampling dashboard validation passed.');
