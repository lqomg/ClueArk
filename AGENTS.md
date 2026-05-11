# ClueArk 协作说明

本文档归纳仓库布局、部署与本地开发的常用入口。完整功能说明见 **[README.md](./README.md)**、**[README_EN.md](./README_EN.md)**；爬虫服务见 **[crawler/README.md](./crawler/README.md)**。

## 概述

**ClueArk（线索方舟）**：面向个人与团队的 AI 情报聚合平台。围绕话题监控聚合 RSS/Atom、网页列表（独立爬虫）、JSON 热点 API 等公开信源；可选接入 DeepSeek 兼容 API 做条目富化、OpenAI 兼容 Embeddings 做语义匹配与相似报道聚类。技术栈：**React 18 + TypeScript + Vite**（前端）、**NestJS + MongoDB（Mongoose）**（主 API）、**独立 NestJS 爬虫服务（Cheerio）**、**Docker Compose** 部署。

## 仓库结构

| 路径 | 说明 |
|------|------|
| `frontend/` | Web 前端（Vite + React）；根目录无统一 `package.json`，子项目各自维护依赖 |
| `backend/` | 主 HTTP API（NestJS） |
| `crawler/` | Web 列表页爬虫服务，与主站契约对齐上报 |
| `data/` | 内置信源种子等（如 `built-in-catalog.json`） |
| `docker-compose.yml` | 推荐部署入口：MongoDB + backend + web（Nginx）+ crawler |
| `.env.example` | 根目录 Compose 环境变量模板（复制为 `.env`） |
| `backend/.env.example`、`crawler/.env.example` | 本地开发参考 |

## 后端模块（`backend/src/modules/`）

- `feed-items/` — 条目、采集 ingest、RSS/热点等管线
- `sources/` — 统一信源池
- `monitors/` — 话题监控
- `llm/` — 条目富化相关
- `aggregation-policy/` — 聚合策略
- `admin/`、`auth/`、`users/` — 管理与认证

爬虫实现在 `crawler/src/`（详见 `crawler/README.md`）。

## 部署（Docker Compose）

```bash
cp .env.example .env
# 生产务必修改：MONGO_INITDB_ROOT_PASSWORD、JWT_SECRET、ADMIN_PASSWORD、
# CRAWLER_INGEST_SECRET、CRAWLER_SECRET 等（见 .env.example 注释）

docker compose up -d --build
```

- Web：若设置 `WEB_PORT=8080` 一般为 `http://<host>:8080`；未设置 `WEB_PORT` 时可能映射宿主机 **80**。
- API：经 **`/api`** 由 Nginx 反代；默认 Compose 下 backend 不单独对外映射业务端口。
- MongoDB：映射 `MONGO_BIND_PORT`（默认 27017）；公网部署需限制访问面。

完整变量见 **`/.env.example`**；DeepSeek、Embedding、RSS/热点等可选开关见 **`backend/.env.example`**。

## 本地开发

需自备 **MongoDB**，Node **20+**。各子项目独立安装与启动：

```bash
cd backend && cp .env.example .env   # 按本地修改
npm install && npm run start:dev

cd frontend && npm install && npm run dev

cd crawler && cp .env.example .env
npm install && npm run start:dev
```

常用脚本：`frontend` — `npm run dev`、`npm run build`；`backend` — `start:dev`、`start:prod`；`crawler` — `start:dev`、`start:prod`。爬虫与主站联调时需配置一致的 `CRAWLER_INGEST_SECRET` 等。

## 贡献约定

1. **性能**：采集、列表查询、聚类、embedding 批量等路径注意避免不必要开销；大集合查询配合索引与分页（遵循现有 Mongoose 用法）。
2. **安全**：外部 URL、用户输入与 NoSQL 查询保持校验；勿向仓库提交真实密钥；日志勿打印令牌。
3. **范围**：改动围绕需求，避免无关大范围格式化或连带修改无关文件。
4. **模块注册**：新增 Nest 提供方或依赖时，在 `app.module` / 子模块中正确注册，避免运行时未注入。
5. **合规**：抓取须遵守法律、站点条款与 robots；详见 README「合规与安全」。

## 提交信息

建议简洁说明改动意图；团队若有约定，可采用如：`fix(模块): 简述`、`feature(模块): 简述`。

## 许可证

**[MIT License](./LICENSE)**
