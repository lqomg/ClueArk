<div align="center">
  <img src="./assets/apple-touch-icon.png" width="96" height="96" alt="ClueArk Logo" />

  <h1>ClueArk 线索方舟</h1>

  <p>
    <a href="./README.md">简体中文</a> |
    <a href="./README_EN.md">English</a>
  </p>

  <p>
    <strong>面向个人与团队的 AI 情报聚合平台</strong>
  </p>

  <p>
    围绕「话题监控」组织信息流：用一句话描述监控意图，系统自动规划说明、绑定信源，并以语义时间线与研判摘要呈现值得关注的线索。底层接入 RSS、网页列表与热点 API 等公开信源，支持私有化部署，适用于行业研究、趋势追踪与个人信息流管理。
  </p>
</div>



开源地址： [https://github.com/lqomg/ClueArk](https://github.com/lqomg/ClueArk)

演示地址： [https://clueark.com](https://clueark.com) 



> React + TypeScript + NestJS + MongoDB + Docker Compose 全栈项目，也可作为前端开发者入门全栈的参考。

<img width="1920" height="919" alt="ClueArk 界面预览" src="/assets/home.png" />

<img width="1920" height="919" alt="ClueArk 界面预览" src="/assets/demo.png" />

## 功能特性

- **AI 话题监控**：一句话创建监控；自动扩写说明、推荐信源，提供语义时间线与异步研判摘要。
- **多类信源**：RSS/Atom、网页列表（可选爬虫规则）、JSON 热点 API，统一资源池管理。
- **独立运营后台**：用户、监控、信源与任务审计；与用户产品分离部署入口。
- **Docker 一键部署**：MongoDB、Redis、Qdrant、API、Worker、用户前端、运营后台与爬虫默认同栈启动。
- **邮箱验证码**：注册 / 登录 / 找回密码；未配置 SMTP 时验证码写入后端日志，便于本地开发。

## 信源类型

| 类型 | 说明 |
|------|------|
| **RSS / Atom** | 标准订阅 Feed 增量拉取 |
| **Web** | 站点或列表页；无 Feed 时可配置爬虫规则 |
| **热点 API** | JSON HTTP 接口，可配置字段映射 |

内置示例见 `data/built-in-catalog.json`。

## 技术栈

| 部分 | 技术 |
|------|------|
| 用户前端 | React 18、TypeScript、Vite、Tailwind CSS |
| 运营后台 | React 18、Vite、Ant Design |
| 后端 | NestJS、MongoDB、Redis、Qdrant |
| 爬虫 | NestJS、Cheerio（详见 [crawler/README.md](crawler/README.md)） |

子项目：`frontend/`、`admin-web/`、`backend/`、`crawler/`（根目录无统一 `package.json`）。

## 快速部署

**环境**：Docker、Docker Compose（v2）。

```bash
git clone <本仓库地址>
cd <克隆后的目录名>

cp .env.example .env
# 编辑 .env：生产务必修改密码与密钥（见 .env.example 注释）
# 须配置 FEED_EMBEDDING_API_KEY、DEEPSEEK_API_KEY

docker compose up -d --build
```

**访问地址**

- 用户产品：`http://<host>:8080`（默认 `WEB_PORT=8080`；未设置时可能映射宿主机 80）
- 运营后台：`http://<host>:8081`（`ADMIN_WEB_PORT`），使用 `ADMIN_EMAIL` / `ADMIN_PASSWORD` 登录
- HTTP API：经前端 Nginx 的 `/api` 反代，不单独对外暴露 backend 端口

完整环境变量见 **[`.env.example`](.env.example)**。

## 本地开发

需 Node.js 20+，自备 MongoDB、Redis、Qdrant，并在 `backend/.env` 中配置连接信息与 API 密钥。

```bash
cd backend && cp .env.example .env && npm install && npm run dev
cd frontend && npm install && npm run dev
cd admin-web && npm install && npm run dev   # 默认 :5174
cd crawler && cp .env.example .env && npm install && npm run start:dev
```

架构约定、模块说明与联调细节见 **[AGENTS.md](AGENTS.md)**；后端与爬虫环境变量见 `backend/.env.example`、`crawler/.env.example`。

## 合规与安全

使用本软件访问第三方网站时，请遵守法律法规及目标站点条款与 robots 协议。**使用者自行承担合规责任**。

## 开源协议

本项目基于 **[MIT License](LICENSE)** 开源。

## 贡献

欢迎 Issue 与 Pull Request。架构与协作约定见 [AGENTS.md](AGENTS.md)。
