# V1.9.32｜工作之家 V2.0 第一次升级验证记录

日期：2026-08-27

## 自动验证
- `node --check js/pages/miwa-work-home.js`
- `node --check js/config/route-registry.js`
- `node --check js/config/sidebar-registry.js`
- `node --check js/miwa-system.js`
- `node tests/verify-work-home-v1.9.29.1.mjs`
- `node tests/verify-work-execution-loop-v1.9.30.mjs`
- `node tests/verify-work-attention-v1.9.30.2.mjs`
- `node tests/verify-work-home-v1.9.32.mjs`

## Windows人工验收
1. `#/work`确认V2七项Sidebar和出版物式活手册。
2. `#/work-today`确认工作卡简化与首版自动排序。
3. `#/work-mine` / `#/work-all`确认状态进入Main筛选。
4. 打开正式工作确认“美和工作9问”及原执行按钮、证据、结果仍存在。
5. 验证开始执行→执行记录→提交完成→人工确认→Header提醒同步→美和AI复盘。
