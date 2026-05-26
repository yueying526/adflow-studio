# Setup Guide

This guide explains how to run AdFlow Studio locally.

## Prerequisites

- Node.js 20+
- n8n running locally, usually at `http://localhost:5678`
- A Feishu or Lark self-built app with Base permissions
- A Feishu Base with four tables:
  - `产品工作台`
  - `Hook角度池`
  - `脚本工作台`
  - `视频任务`
- Firecrawl API key
- DeepSeek API key
- KIE API key

## Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Fill these values:

```bash
N8N_API_KEY=
N8N_BASE_URL=http://localhost:5678

FEISHU_APP_ID=
FEISHU_APP_SECRET=
FEISHU_BASE_TOKEN=

FIRECRAWL_API_KEY=
DEEPSEEK_API_KEY=
KIE_API_KEY=
```

The frontend reads Feishu and n8n configuration from local environment variables. n8n nodes should also receive the same provider keys through n8n credentials or Docker environment variables.

## Feishu Base

Create four tables and keep the business meaning consistent:

- `产品工作台`: one row per product URL and product brief.
- `Hook角度池`: one row per hook angle.
- `脚本工作台`: one row per generated script.
- `视频任务`: one row per generated UGC video task.

Use the public schema template as the source of truth:

- Human-readable guide: [FEISHU_TEMPLATE.md](FEISHU_TEMPLATE.md)
- Machine-readable schema: [`config/feishu_base_schema.template.json`](../config/feishu_base_schema.template.json)

After creating the tables, copy the example config and fill your Base token and table IDs:

```bash
cp config/final_base_config.example.json config/final_base_config.json
```

`config/final_base_config.json` is ignored by git because it contains your real Feishu workspace coordinates.

## n8n Workflows

Import the templates in `n8n/`:

- `adflow-generate-hooks.template.json`
- `adflow-generate-script.template.json`
- `adflow-create-video-task.template.json`
- `adflow-generate-video.template.json`

Before activating them:

1. Replace placeholder Feishu values such as `YOUR_FEISHU_BASE_TOKEN`, `YOUR_PRODUCT_TABLE_ID`, and `YOUR_FEISHU_APP_ID`.
2. Configure the Feishu app secret through `FEISHU_APP_SECRET`.
3. Configure `DEEPSEEK_API_KEY`, `FIRECRAWL_API_KEY`, and `KIE_API_KEY` in n8n.
4. Confirm webhook paths match `final_base_config.json`.

## Run Frontend

```bash
npm install
npm run dev -- --port 3000
```

Open:

```text
http://localhost:3000
```

## Smoke Test

1. Paste a product URL.
2. Generate a product brief.
3. Edit or confirm the six product brief fields.
4. Generate hooks.
5. Select one hook and generate a script.
6. Confirm the 8-second spoken line.
7. Generate a video.

For cost control, run the first smoke test only to script generation. Trigger KIE video generation after confirming the prompt and model settings.
