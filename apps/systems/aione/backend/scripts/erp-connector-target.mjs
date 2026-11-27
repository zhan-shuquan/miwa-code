import { readFileSync } from 'node:fs';
const targets = JSON.parse(readFileSync(new URL('../config/erp-connector-targets.json', import.meta.url), 'utf8'));

export function connectorTarget(env = process.env) {
  const name = env.AIONE_CONNECTOR_ENV || 'development';
  const target = targets[name];
  if (!target) throw Error('Unknown ERP connector environment');
  if (target.enabled === false) throw Error(target.reason || 'ERP connector target disabled');
  if (env.AIONE_CLOUD_URL && new URL(env.AIONE_CLOUD_URL).origin !== target.origin)
    throw Error('AIONE origin does not match the selected ERP environment');
  if (name === 'production' && env.AIONE_PRODUCTION_CONNECTOR_APPROVED !== '1')
    throw Error('Production connection awaits explicit cutover approval');
  return { ...target, name };
}

export function assertContainerTarget(target, inspection) {
  const labels = inspection.Config?.Labels || {};
  if (labels['com.docker.compose.project'] !== target.project ||
      labels['com.docker.compose.service'] !== 'backend' || !inspection.State?.Running)
    throw Error('ERP container identity or running state does not match configuration');
}
