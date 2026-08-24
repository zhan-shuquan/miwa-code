import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  extract1688OfferId,
  parseApiDescriptor,
  buildSigned1688Request,
  normalize1688Product
} from '../backend/src/integrations/alibaba1688-client.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const aioneRoot = path.resolve(here, '..');
const repoRoot = path.resolve(aioneRoot, '../../..');
const read = (relative) => fs.readFileSync(path.join(aioneRoot, relative), 'utf8');
const must = (condition, message) => { if (!condition) throw new Error(message); };

const url = 'https://detail.1688.com/offer/826154588274.html';
must(extract1688OfferId(url) === '826154588274', '1688 offer id extraction failed');
must(extract1688OfferId('826154588274') === '826154588274', 'direct offer id extraction failed');

const descriptor = parseApiDescriptor('com.alibaba.product:alibaba.cross.productInfo-1');
must(descriptor.namespace === 'com.alibaba.product', 'descriptor namespace mismatch');
must(descriptor.apiName === 'alibaba.cross.productInfo', 'descriptor api name mismatch');
must(descriptor.version === '1', 'descriptor version mismatch');

const signed = buildSigned1688Request({
  appKey: '123456',
  appSecret: 'test-secret',
  accessToken: 'test-token',
  params: { productId: '826154588274' }
});
must(signed.url.includes('/param2/1/com.alibaba.product/alibaba.cross.productInfo/123456?_aop_signature='), 'signed API path mismatch');
must(/^[A-F0-9]{40}$/.test(signed.signature), 'signature must be uppercase HMAC-SHA1 hex');
must(signed.body.access_token === 'test-token', 'access token missing from signed body');
must(signed.body.productId === '826154588274', 'productId missing from signed body');

const fixture = {
  result: {
    productInfo: {
      productId: 826154588274,
      subject: '测试商品标题',
      image: { images: ['https://cbu01.alicdn.com/test-main.jpg', 'https://cbu01.alicdn.com/test-2.jpg'] },
      saleInfo: {
        unit: '件',
        priceRanges: [
          { startQuantity: 2, price: '8.80' },
          { startQuantity: 100, price: '7.50' }
        ]
      },
      supplierInfo: { companyName: '测试供应商', memberId: 'member-1' },
      weight: '0.2',
      weightUnit: 'kg',
      categoryName: '测试类目',
      categoryId: '1001',
      attributes: [{ name: '材质', value: '棉' }],
      skuInfos: [{ skuId: 'sku-1', spec: '黑色', price: '8.80', stock: 500 }]
    }
  }
};
const normalized = normalize1688Product(fixture, '826154588274', url);
must(normalized.productId === '826154588274', 'normalized product id mismatch');
must(normalized.title === '测试商品标题', 'normalized title mismatch');
must(normalized.mainImage === 'https://cbu01.alicdn.com/test-main.jpg', 'normalized image mismatch');
must(normalized.purchasePrice === 8.8, 'normalized price mismatch');
must(normalized.minOrderQuantity === 2, 'normalized MOQ mismatch');
must(normalized.weight.valueGrams === 200, 'normalized explicit weight mismatch');
must(normalized.supplier.name === '测试供应商', 'normalized supplier mismatch');
must(normalized.attributeCount === 1 && normalized.attributes[0].name === '材质', 'normalized attributes mismatch');
must(normalized.skuCount === 1, 'normalized SKU mismatch');

const server = read('backend/server.js');
must(server.includes('/api/v1/integrations/1688'), '1688 backend router is not mounted');
const route = read('backend/src/routes/integrations-1688.js');
must(route.includes('/product-by-url'), 'product-by-url route missing');

const page = read('pages/selection-workbench/record-detail/index.html');
must(page.includes("/api/v1/integrations/1688/product-by-url"), 'selection page is not connected to 1688 backend');
must(page.includes('aione:selection:source-data:${opportunityId}'), 'selection source API data cache missing');
must(page.includes('读取并自动填充'), 'selection auto-fill entry missing');

const router = read('js/ai/ai-context-router.js');
must(router.includes('aione:selection:source-data:${objectId}'), 'MIWA AI router does not read source API facts');
must(router.includes('sourceFacts'), 'MIWA AI context does not expose source facts');
must(router.includes('sourceData.sourceUrl === sourceUrl'), 'MIWA AI source facts are not protected from stale URL data');

const config = read('js/config/system-config.js');
must(config.includes('1688-source-api-bridge') || config.includes('1688-oauth-bridge') || config.includes('1688-permanent-token-direct'), '1688 source bridge asset marker missing');
const envExample = read('backend/.env.example');
for (const key of ['ALIBABA_1688_APP_KEY=', 'ALIBABA_1688_APP_SECRET=', 'ALIBABA_1688_ACCESS_TOKEN=', 'ALIBABA_1688_REFRESH_TOKEN=']) {
  must(envExample.includes(key), `missing env template ${key}`);
}

const launcher = fs.readFileSync(path.join(repoRoot, 'START_MIWA_AI_REAL_MODEL.ps1'));
must(launcher[0] === 0xef && launcher[1] === 0xbb && launcher[2] === 0xbf, 'real-model PowerShell launcher lost UTF-8 BOM');
const launcherText = launcher.toString('utf8');
must(launcherText.includes('Read-Host "ALIBABA_1688_APP_KEY"'), 'launcher does not prompt optional 1688 AppKey');
must(launcherText.includes('Read-Host "ALIBABA_1688_APP_SECRET" -AsSecureString'), 'launcher does not securely prompt 1688 AppSecret');
must(!/Set-Content|Out-File/.test(launcherText), 'launcher must not persist secrets');

console.log('PASS V1.9.18 1688 source API bridge');
