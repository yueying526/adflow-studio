# AdFlow Studio

AdFlow Studio is an AI ad workflow workbench that turns a product URL into a product brief, multiple marketing hooks, a short ad script, and an 8-second UGC-style talking-head video.

It is built as a practical automation stack:

- **Next.js** for the local product interface.
- **Feishu Base** as the editable data workbench.
- **n8n** as the automation engine.
- **Firecrawl** for product page extraction.
- **DeepSeek** for product briefs, hooks, scripts, and prompt preparation.
- **KIE** for GPT Image 2, Seedance 2.0 Fast, and Veo 3.1 Fast generation.

## What It Does

1. Paste a product URL.
2. Generate an editable product strategy brief.
3. Confirm the brief and generate 12 hook angles.
4. Pick one hook and generate a short script.
5. Confirm the final 8-second spoken line.
6. Generate a UGC key image and a vertical talking-head video.

The interface stays in Chinese for operators. The final video language is selected in Step 1:

- **Chinese** routes to Seedance 2.0 Fast with native spoken audio.
- **English** routes to Veo 3.1 Fast with English spoken audio.

## Demo Outputs

These are real 8-second UGC-style videos generated through the AdFlow Studio workflow.

| Apparel / travel scenario | Beauty product scenario |
| --- | --- |
| [![AdFlow Studio apparel demo](public/demo/adflow-demo-01-poster.jpg)](public/demo/adflow-demo-01.mp4) | [![AdFlow Studio beauty demo](public/demo/adflow-demo-02-poster.jpg)](public/demo/adflow-demo-02.mp4) |
| [Watch MP4](public/demo/adflow-demo-01.mp4) | [Watch MP4](public/demo/adflow-demo-02.mp4) |

## Local Frontend

```bash
npm install
npm run dev -- --port 3000
```

Open `http://localhost:3000`.

The workbench has four steps:

1. **Product**: enter product URL and final video language, then generate a product brief.
2. **Hooks**: review or edit the brief, then generate and filter hook angles.
3. **Script**: choose one hook and generate a script.
4. **Video**: fill creator preference, product image URL, and final 8-second spoken line, then generate the video.

The frontend is a local proxy only. API keys are never exposed in the browser.

## Public Setup

See [docs/SETUP.md](docs/SETUP.md) for Feishu, n8n, environment variable, and workflow import steps.

See [docs/FEISHU_TEMPLATE.md](docs/FEISHU_TEMPLATE.md) and [config/feishu_base_schema.template.json](config/feishu_base_schema.template.json) for the Feishu Base schema.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the system design and data flow.

## Repository Contents

- `app/`: Next.js local workbench.
- `lib/`: Feishu and n8n integration helpers.
- `n8n/`: sanitized workflow templates for import.
- `docs/`: public setup and architecture docs.
- `public/demo/`: real generated sample videos and poster images.
- `prompts/`: public prompt templates used by the production workflow.
- `config/final_base_config.example.json`: public Feishu Base config template.
- `config/feishu_base_schema.template.json`: public Feishu table and field schema.
- `.env.example`: required local environment variables.

Internal project notes, Feishu backups, interview scripts, and local generated outputs are intentionally ignored by git.

## Model Routing

- Product brief, hook, script, UGC scene, image prompt, and video prompt: **DeepSeek `deepseek-chat`** in n8n.
- Product page extraction: **Firecrawl**.
- UGC key image: **KIE GPT Image 2**.
- Chinese video: **KIE Seedance 2.0 Fast**.
- English video: **KIE Veo 3.1 Fast**.

Model credentials should be configured in n8n credentials or Docker environment variables. Do not put real API keys in Feishu fields or commit them to GitHub.

## Notes

- KIE result URLs may expire. A production deployment should download and persist generated media to durable storage.
- The included n8n templates are sanitized. Replace placeholder Feishu table IDs and credentials before running.
- This project is designed as a local MVP and interview-ready case study, not a hosted SaaS product.
