<div align="center">
  <img src="./assets/apple-touch-icon.png" width="96" height="96" alt="ClueArk Logo" />

  <h1>ClueArk</h1>

  <p>
    <a href="./README.md">简体中文</a> |
    <a href="./README_EN.md">English</a>
  </p>

  <p>
    <strong>An AI-powered intelligence aggregation platform for individuals and teams.</strong>
  </p>

  <p>
    ClueArk organizes information around topic monitoring, continuously collects public sources such as RSS feeds, web pages, and hot-topic APIs, and combines LLM enrichment, embedding-based semantic matching, and similar-story clustering to help users discover high-value signals from noisy information streams.
  </p>
</div>

ClueArk is designed as a lightweight, self-hostable intelligence workspace for industry research, trend tracking, public event monitoring, competitive intelligence, and personal knowledge intake.

Repository: [https://github.com/lqomg/ClueArk](https://github.com/lqomg/ClueArk)

Demo: [http://114.132.246.171](http://114.132.246.171/)

> Built with React + TypeScript + NestJS + MongoDB + Docker, ClueArk is also a practical full-stack reference project for frontend developers who want to learn backend services, crawling pipelines, AI enrichment, and self-hosted deployment.

<img width="1920" height="919" alt="ClueArk preview" src="/assets/demo.png" />

## Highlights

ClueArk is more than a simple RSS reader. It is built around topic-driven intelligence workflows:

- **AI topic monitoring**: Create monitors from topics or keywords. ClueArk recommends relevant sources and filters content with semantic similarity.
- **Unified source model**: Built-in official sources and user-created sources share the same data model, fingerprinting, and deduplication strategy.
- **Multiple ingestion paths**: Supports RSS / Atom, web list crawling, and JSON hot-topic APIs.
- **LLM enrichment**: Optionally enriches items with tags, recommendation reasons, and priority scores through DeepSeek-compatible chat APIs.
- **Embedding-based clustering**: Groups similar reports with title and content embeddings to reduce duplicate reading.
- **One-command Docker Compose deployment**: MongoDB, backend API, frontend web app, and crawler service are started as one stack.

## Use Cases

- Track industries, companies, public events, or technical trends over time.
- Aggregate public sources and reduce manual browsing, searching, and filtering.
- Build a lightweight intelligence dashboard for individuals or small teams.
- Learn a complete React + NestJS + MongoDB + Docker full-stack project.
- Use the project as a reference for combining RSS, web crawling, LLMs, and embeddings in a real product.

## Features

### Topic Monitoring

Users can create monitors such as "AI coding assistant updates", "Iran and US conflict developments", or "company news". ClueArk recommends related sources from the source pool and uses semantic matching to show only relevant items from those sources.

### Unified Feed

Items collected from all sources enter a unified feed. The feed can be browsed by time and can group similar reports into clusters, making repeated coverage easier to scan.

### Source Types

| Type | Description | Typical Use |
|------|-------------|-------------|
| RSS / Atom | Incremental ingestion from standard feed URLs | News sites, blogs, official announcements |
| Web | Website URL with optional CSS selectors | Sites that expose list pages but no stable RSS feed |
| Hot API | JSON HTTP API with configurable field mapping | Rankings, trending lists, structured public endpoints |

Built-in source seeds are stored in `data/built-in-catalog.json`. You can point `BUILTIN_CATALOG_PATH` to your own source catalog during deployment.

### AI Enrichment and Clustering

AI features are optional:

- Configure DeepSeek to generate tags, recommendation reasons, and priority scores.
- Configure an OpenAI-compatible embedding API to enable similar-story clustering and monitor matching.
- Basic source ingestion and browsing can still work without AI keys.

## Tech Stack

| Area | Stack |
|------|-------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, Zustand, React Router |
| Backend | NestJS, MongoDB / Mongoose, JWT, scheduled tasks |
| Crawler | NestJS, Cheerio, CSS selectors |
| AI | DeepSeek Chat, OpenAI-compatible Embedding API |
| Deployment | Docker Compose, Nginx |

## Repository Structure

```text
├── backend/           # Main API service
├── crawler/           # Web list crawler service
├── frontend/          # Web frontend
├── data/              # Built-in source seed data
├── docker-compose.yml # Recommended deployment entry
├── .env.example       # Root environment template
└── LICENSE            # MIT
```

`frontend/`, `backend/`, and `crawler/` are independent subprojects. There is no unified root `package.json`.

## Quick Deployment

### Requirements

- Recommended: Docker and Docker Compose v2
- Local development: Node.js 20+ and MongoDB

### Start with Docker Compose

```bash
git clone <repository-url>
cd <cloned-directory>

cp .env.example .env
# Edit .env before production deployment. At minimum, change MongoDB passwords,
# JWT_SECRET, ADMIN_PASSWORD, and crawler-related secrets.

docker compose up -d --build
```

If you need to reset all data during the first deployment or testing:

```bash
docker compose down -v
docker compose up -d --build
```

Warning: `docker compose down -v` removes the MongoDB data volume.

## Access

- Web UI: `http://<server-ip-or-domain>:<WEB_PORT>`
- HTTP API: proxied by the frontend through `/api`
- By default, `backend` and `crawler` are not directly exposed to the public network in the Compose setup.

## Demo Account

Demo URL: [http://114.132.246.171/app/feed](http://114.132.246.171/app/feed)

Demo administrator:

```text
admin@clueark.local / lin123456qian
```

Do not use the demo credentials in production.

## Crawler Service

The crawler service is built and started by default with `docker compose up`. It fetches configured web sources and reports parsed items back to the main backend service.

For manual usage, API details, and scheduling behavior, see [crawler/README.md](crawler/README.md).

If you only need the main app and database, you can adjust the Compose services according to your deployment strategy.

## Environment Variables

See `/.env.example` for the full root configuration. `backend/.env.example` and `crawler/.env.example` are also available for local development.

| Category | Description |
|----------|-------------|
| Required for production | MongoDB root password, `JWT_SECRET`, `ADMIN_PASSWORD`, `CRAWLER_INGEST_SECRET`, `CRAWLER_SECRET` |
| Optional | DeepSeek, embedding API, RSS / hot API switches, and related keys |

## Security Notes

Before production deployment, change at least:

- `MONGO_INITDB_ROOT_PASSWORD`
- `JWT_SECRET`
- `ADMIN_PASSWORD`
- `CRAWLER_INGEST_SECRET`
- `CRAWLER_SECRET`

If MongoDB is exposed on the host, restrict access with a firewall or security group. Do not expose the database to the public internet without protection.

## Local Development

Each subproject installs and runs independently. Prepare a MongoDB instance and configure environment variables before starting the backend.

```bash
# Backend
cd backend
cp .env.example .env
npm install
npm run start:dev

# Frontend
cd frontend
npm install
npm run dev

# Crawler
cd crawler
cp .env.example .env
npm install
npm run start:dev
```

During local integration, make sure API addresses, proxies, and environment variables match the Vite and NestJS configurations.

## Compliance

When using ClueArk to crawl or access third-party websites, follow applicable laws, website terms of service, robots.txt policies, and reasonable usage limits. Do not use this project for unauthorized bulk crawling or activities that infringe on the rights of others. Users are responsible for compliance.

If you discover security issues such as default secrets or risky exposure settings, please contact the maintainer privately when appropriate. Contributions that improve documentation or default security settings are welcome.

## License

This project is open source under the [MIT License](LICENSE).

## Contributing

Issues and pull requests are welcome. Please keep commit messages concise and explain the intent of the change. Internal collaboration can use conventional prefixes such as `fix` and `feature`.
