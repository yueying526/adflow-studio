import fs from 'node:fs';
import path from 'node:path';

const configRoot = path.join(process.cwd(), 'config');

function readJsonIfExists(filename) {
  const file = path.join(configRoot, filename);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

const finalConfig = readJsonIfExists('final_base_config.json') || readJsonIfExists('final_base_config.example.json');

export function getAppConfig() {
  const tables = {
    product: {
      ...finalConfig.tables.product,
      id: process.env.FEISHU_PRODUCT_TABLE_ID || finalConfig.tables.product.id,
    },
    hook: {
      ...finalConfig.tables.hook,
      id: process.env.FEISHU_HOOK_TABLE_ID || finalConfig.tables.hook.id,
    },
    script: {
      ...finalConfig.tables.script,
      id: process.env.FEISHU_SCRIPT_TABLE_ID || finalConfig.tables.script.id,
    },
    video: {
      ...finalConfig.tables.video,
      id: process.env.FEISHU_VIDEO_TABLE_ID || finalConfig.tables.video.id,
    },
  };

  return {
    baseToken: process.env.FEISHU_BASE_TOKEN || finalConfig.baseToken,
    tables,
    n8nBaseUrl: process.env.N8N_BASE_URL || 'http://localhost:5678',
    n8nApiKey: process.env.N8N_API_KEY || '',
    feishuAppId: process.env.FEISHU_APP_ID || finalConfig.feishuAppId || '',
    feishuAppSecret: process.env.FEISHU_APP_SECRET || finalConfig.feishuAppSecret || '',
  };
}

export function urlValue(url) {
  return url ? { text: url, link: url } : null;
}
