# Feishu Base Template

AdFlow Studio uses Feishu Base as the editable data layer. The public repository includes a sanitized schema file:

```text
config/feishu_base_schema.template.json
```

Use it to recreate the four-table workbench in your own Feishu workspace.

## Tables

Create these tables first:

| Table | Purpose |
| --- | --- |
| `产品工作台` | One row per product URL and product strategy brief. |
| `Hook角度池` | One row per generated hook angle. |
| `脚本工作台` | One row per generated script. |
| `视频任务` | One row per UGC video generation task. |

## Setup Order

1. Create the four tables above.
2. Add normal fields first: text, number, url, attachment, single select, created time.
3. Add link fields after all target tables exist.
4. Copy the generated table IDs into `config/final_base_config.json`.
5. Import the n8n templates and replace their Feishu table placeholders with your table IDs.
6. Optional: add formula fields for direct Feishu operation buttons.

## Required Fields

The field names in the schema are intentionally in Chinese because the operator-facing workflow is Chinese. Keep field names unchanged unless you also update the frontend and n8n field mappings.

### 产品工作台

| Field | Type | Notes |
| --- | --- | --- |
| `产品链接` | url | User input. |
| `状态` | single_select | `待生成`, `生成中`, `已生成`, `失败`. |
| `产品名称` | text | Generated, editable before Hook generation. |
| `品牌名` | text | Generated. |
| `品类` | text | Generated, editable. |
| `价格信息` | text | Generated. |
| `产品主图URL` | url | Generated from product page. |
| `产品图附件` | attachment | Optional, mainly for Feishu-side reference. |
| `核心功能` | text | Generated. |
| `材质成分技术` | text | Generated. |
| `规格参数` | text | Generated. |
| `使用方法` | text | Generated. |
| `适用场景` | text | Generated. |
| `核心卖点` | text | Generated, editable. |
| `独特机制` | text | Generated. |
| `差异化优势` | text | Generated. |
| `核心蜕变` | text | Generated. |
| `证据背书` | text | Generated. |
| `目标人群` | text | Generated, editable. |
| `使用者画像` | text | Generated. |
| `购买者画像` | text | Generated. |
| `刺骨痛点` | text | Generated, editable. |
| `情绪触发器` | text | Generated. |
| `购买阻力` | text | Generated, editable. |
| `视觉抓手` | text | Generated. |
| `优惠促销保障` | text | Generated. |
| `推荐Hook分类` | text | Generated. |
| `禁说内容风险点` | text | Generated. |
| `用户手动备注` | text | Optional operator notes. |
| `指定Hook分类` | single_select | Used only by specified-category Hook generation. |
| `已生成分类记录` | text | System bookkeeping. |
| `原始抓取内容` | text | Firecrawl extraction cache. |
| `错误信息` | text | System error output. |
| `创建时间` | created_time | System field. |
| `Hook角度` | link | Links to `Hook角度池`. |
| `脚本记录` | link | Links to `脚本工作台`. |
| `视频任务` | link | Links to `视频任务`. |

`指定Hook分类` options:

```text
对话互动型, 视觉冲击型, 信任构建型, 趋势玩法型, 产品展示型, 特殊场景型, 情感驱动型, 促销型
```

### Hook角度池

| Field | Type | Notes |
| --- | --- | --- |
| `产品名称` | text | Copied from product table for easier scanning. |
| `产品链接` | url | Optional display field; n8n may still write it. |
| `Hook分类` | single_select | Hook category. |
| `认知阶段` | single_select | Awareness level. |
| `情绪触发` | text | Emotional trigger. |
| `Hook概念` | text | Core hook idea. |
| `开头脚本_zh` | text | Chinese opening line. |
| `开头脚本_en` | text | English opening line. |
| `Rehook_zh` | text | Chinese rehook. |
| `Rehook_en` | text | English rehook. |
| `视觉开场` | text | Visual opening concept. |
| `收益桥接` | text | Benefit bridge. |
| `分类理由` | text | Why this category fits. |
| `自评分` | number | Model self score. |
| `生成批次` | text | Batch label. |
| `分类策略` | single_select | Generation strategy. |
| `脚本状态` | single_select | Script generation state. |
| `错误信息` | text | System error output. |
| `创建时间` | created_time | System field. |
| `关联产品` | link | Links to `产品工作台`. |
| `脚本记录` | link | Links to `脚本工作台`. |
| `视频任务` | link | Links to `视频任务`. |

`Hook分类` options:

```text
对话互动型, 视觉冲击型, 信任构建型, 趋势玩法型, 产品展示型, 特殊场景型, 情感驱动型, 促销型
```

`认知阶段` options:

```text
unaware, problem, solution, product, most
```

`分类策略` options:

```text
默认精选, 同类追加, 换分类, 指定分类
```

`脚本状态` options:

```text
未生成, 生成中, 已生成, 失败
```

### 脚本工作台

| Field | Type | Notes |
| --- | --- | --- |
| `脚本标题` | text | Generated. |
| `产品链接` | url | Copied from product table. |
| `语言` | single_select | `中文`, `英文`. |
| `脚本版本` | text | Prompt or model version label. |
| `生成状态` | single_select | `生成中`, `已生成`, `失败`. |
| `确认状态` | single_select | `待确认`, `已确认`, `放弃`. |
| `完整脚本_zh` | text | Chinese script. |
| `完整脚本_en` | text | English script. |
| `CTA_zh` | text | Chinese CTA. |
| `CTA_en` | text | English CTA. |
| `模型信息` | text | Model metadata. |
| `错误信息` | text | System error output. |
| `创建时间` | created_time | System field. |
| `关联产品` | link | Links to `产品工作台`. |
| `关联Hook` | link | Links to `Hook角度池`. |
| `视频任务` | link | Links to `视频任务`. |

### 视频任务

| Field | Type | Notes |
| --- | --- | --- |
| `视频标题` | text | Generated. |
| `产品链接` | url | Copied from product table. |
| `视频状态` | single_select | `待补素材`, `生成关键图中`, `生成视频中`, `视频已生成`, `失败`. |
| `语言` | single_select | `中文`, `英文`. |
| `产品图附件` | attachment | Optional Feishu upload. |
| `产品图URL` | url | Product image reference used by image generation. |
| `产品图来源说明` | text | Source description. |
| `达人偏好` | text | User-specified creator persona. |
| `UGC场景JSON` | text | Generated scene input. |
| `UGC图片Prompt` | text | Generated key image prompt. |
| `UGC关键图URL` | url | Generated key image URL. |
| `UGC关键图分析` | text | Optional analysis. |
| `Veo视频Prompt` | text | Final video prompt, also used for Seedance route. |
| `Veo口播脚本` | text | Human-confirmed 8-second spoken line. |
| `KIE图片任务ID` | text | KIE image task ID. |
| `KIE视频任务ID` | text | KIE video task ID. |
| `视频URL` | url | Final generated video URL. |
| `生成配置` | text | Runtime model/config log. |
| `错误信息` | text | System error output. |
| `创建时间` | created_time | System field. |
| `关联产品` | link | Links to `产品工作台`. |
| `关联Hook` | link | Links to `Hook角度池`. |
| `关联脚本` | link | Links to `脚本工作台`. |

## Optional Feishu Formula Buttons

The frontend can trigger all workflows, so formula buttons are optional. If you want Feishu-side action links, add formula fields after n8n is running.

Use this pattern and replace the webhook URL plus record parameter:

```text
HYPERLINK("http://localhost:5678/webhook/final-generate-hooks?product_record_id=" & RECORD_ID(), "生成Hook")
```

Recommended formula fields:

| Table | Field | Webhook |
| --- | --- | --- |
| `产品工作台` | `生成Hook` | `/webhook/final-generate-hooks?product_record_id=` |
| `Hook角度池` | `生成脚本` | `/webhook/final-generate-script?hook_record_id=` |
| `脚本工作台` | `创建视频任务` | `/webhook/final-create-video-task?script_record_id=` |
| `视频任务` | `生成视频` | `/webhook/final-generate-video?video_record_id=` |

## Configuration Mapping

After the Base is created, update:

```text
config/final_base_config.json
```

with your own table IDs:

```json
{
  "baseToken": "YOUR_FEISHU_BASE_TOKEN",
  "tables": {
    "product": { "id": "YOUR_PRODUCT_TABLE_ID", "name": "产品工作台" },
    "hook": { "id": "YOUR_HOOK_TABLE_ID", "name": "Hook角度池" },
    "script": { "id": "YOUR_SCRIPT_TABLE_ID", "name": "脚本工作台" },
    "video": { "id": "YOUR_VIDEO_TABLE_ID", "name": "视频任务" }
  }
}
```
