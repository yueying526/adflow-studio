# n8n Workflow Templates

This folder contains sanitized workflow templates for AdFlow Studio.

Import order:

1. `adflow-generate-hooks.template.json`
2. `adflow-generate-script.template.json`
3. `adflow-create-video-task.template.json`
4. `adflow-generate-video.template.json`

Before activation, replace placeholders:

- `YOUR_FEISHU_BASE_TOKEN`
- `YOUR_PRODUCT_TABLE_ID`
- `YOUR_HOOK_TABLE_ID`
- `YOUR_SCRIPT_TABLE_ID`
- `YOUR_VIDEO_TABLE_ID`
- `YOUR_FEISHU_APP_ID`

Required n8n environment variables:

- `FEISHU_APP_SECRET`
- `FIRECRAWL_API_KEY`
- `DEEPSEEK_API_KEY`
- `KIE_API_KEY`

The exported templates are inactive by default.
