# AIONE 数据Schema目录

V1.7.0开始，本目录保存**业务语义到数据库结构**的正式工程资产。

- `aione-core-object-model.v1.json`：见 `contracts/data/`，定义核心对象与关系。
- PostgreSQL DDL实际迁移脚本位于 `data-code/migrations/`。
- `field-to-db.v1.json` 位于 `data-code/mappings/`，用于把V1.6 Field Registry逐步映射到正式存储。

原则：页面不是数据库边界；一份事实只存一次；各“之家”从不同视角读取同一份事实。
