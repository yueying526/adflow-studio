import { getAppConfig, urlValue } from './config';

let tokenCache = null;

async function requestJson(url, options = {}, label = 'Feishu request') {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs || 20_000);
  const response = await fetch(url, {
    ...options,
    signal: controller.signal,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...(options.headers || {}),
    },
    cache: 'no-store',
  }).finally(() => clearTimeout(timeout));
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok || data.code) {
    throw new Error(`${label} failed: ${text.slice(0, 800)}`);
  }
  return data;
}

function isTransientFeishuError(error) {
  const message = String(error?.message || error || '');
  return message.includes('1254607')
    || message.includes('Client network socket disconnected')
    || message.includes('socket hang up')
    || message.includes('ECONNRESET')
    || message.includes('ETIMEDOUT')
    || message.includes('EAI_AGAIN');
}

async function withFeishuRetry(operation, attempts = 8) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (!isTransientFeishuError(error) || attempt >= attempts) throw error;
      await new Promise((resolve) => {
        setTimeout(resolve, 1200 * attempt);
      });
    }
  }
  throw lastError;
}

export async function feishuToken() {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) return tokenCache.token;
  const { feishuAppId, feishuAppSecret } = getAppConfig();
  if (!feishuAppId || !feishuAppSecret) {
    throw new Error('缺少 FEISHU_APP_ID 或 FEISHU_APP_SECRET。请在 .env.local 中配置。');
  }
  const data = await requestJson(
    'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal',
    { method: 'POST', body: JSON.stringify({ app_id: feishuAppId, app_secret: feishuAppSecret }) },
    'Feishu token',
  );
  tokenCache = {
    token: data.tenant_access_token,
    expiresAt: Date.now() + Number(data.expire || 7200) * 1000,
  };
  return tokenCache.token;
}

function apiUrl(tableId, suffix = '') {
  const { baseToken } = getAppConfig();
  return `https://open.feishu.cn/open-apis/bitable/v1/apps/${baseToken}/tables/${tableId}/records${suffix}`;
}

export async function createRecord(tableId, fields) {
  const token = await feishuToken();
  const data = await withFeishuRetry(() => requestJson(
    apiUrl(tableId),
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ fields }),
    },
    'Feishu create record',
  ));
  return data?.data?.record;
}

export async function updateRecord(tableId, recordId, fields) {
  const token = await feishuToken();
  const data = await withFeishuRetry(() => requestJson(
    apiUrl(tableId, `/${recordId}`),
    {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ fields }),
    },
    'Feishu update record',
  ));
  return data?.data?.record;
}

export async function getRecord(tableId, recordId) {
  const token = await feishuToken();
  const data = await withFeishuRetry(() => requestJson(
    apiUrl(tableId, `/${recordId}`),
    { headers: { Authorization: `Bearer ${token}` } },
    'Feishu get record',
  ));
  return data?.data?.record || null;
}

export async function listRecords(tableId, pageSize = 200) {
  const token = await feishuToken();
  const items = [];
  let pageToken = '';
  do {
    const suffix = `?page_size=${pageSize}${pageToken ? `&page_token=${encodeURIComponent(pageToken)}` : ''}`;
    const data = await withFeishuRetry(() => requestJson(
      apiUrl(tableId, suffix),
      { headers: { Authorization: `Bearer ${token}` } },
      'Feishu list records',
    ));
    items.push(...(data?.data?.items || []));
    pageToken = data?.data?.page_token || '';
  } while (pageToken);
  return items;
}

export function textCell(value) {
  if (Array.isArray(value)) return value.map((item) => item?.text || item?.name || item?.link || item).join('');
  if (value && typeof value === 'object') return value.text || value.link || '';
  return String(value || '');
}

export function urlCell(value) {
  if (Array.isArray(value)) return value[0]?.link || value[0]?.text || '';
  if (value && typeof value === 'object') return value.link || value.text || '';
  return String(value || '');
}

export function firstSelect(value) {
  if (Array.isArray(value)) return String(value[0]?.text || value[0]?.name || value[0] || '');
  return String(value || '');
}

export function linkIds(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => item?.record_id || item?.id || item?.record_ids?.[0] || item).filter(Boolean);
}

export function productFieldsFromInput({ productUrl }) {
  return {
    产品链接: urlValue(productUrl),
    状态: '待生成',
    错误信息: '',
  };
}

export function normalizeProduct(record) {
  const fields = record?.fields || {};
  return {
    id: record?.record_id,
    productUrl: urlCell(fields['产品链接']),
    status: firstSelect(fields['状态']),
    name: textCell(fields['产品名称']),
    brand: textCell(fields['品牌名']),
    category: textCell(fields['品类']),
    price: textCell(fields['价格信息']),
    imageUrl: urlCell(fields['产品主图URL']),
    coreFunctions: textCell(fields['核心功能']),
    sellingPoints: textCell(fields['核心卖点']),
    mechanism: textCell(fields['独特机制']),
    targetAudience: textCell(fields['目标人群']),
    painPoints: textCell(fields['刺骨痛点']),
    objections: textCell(fields['购买阻力']),
    visualHooks: textCell(fields['视觉抓手']),
    offer: textCell(fields['优惠促销保障']),
    manualNotes: textCell(fields['用户手动备注']),
    error: textCell(fields['错误信息']),
  };
}

export function normalizeHook(record) {
  const fields = record?.fields || {};
  return {
    id: record?.record_id,
    productIds: linkIds(fields['关联产品']),
    category: firstSelect(fields['Hook分类']),
    concept: textCell(fields['Hook概念']),
    scriptZh: textCell(fields['开头脚本_zh']),
    scriptEn: textCell(fields['开头脚本_en']),
    awareness: firstSelect(fields['认知阶段']),
    emotion: textCell(fields['情绪触发']),
    visualHook: textCell(fields['视觉开场']),
    benefitBridge: textCell(fields['收益桥接']),
    rationale: textCell(fields['分类理由']),
    score: Number(fields['自评分'] || 0),
    scriptStatus: firstSelect(fields['脚本状态']),
    error: textCell(fields['错误信息']),
  };
}

export function normalizeScript(record) {
  const fields = record?.fields || {};
  return {
    id: record?.record_id,
    productIds: linkIds(fields['关联产品']),
    hookIds: linkIds(fields['关联Hook']),
    title: textCell(fields['脚本标题']),
    status: firstSelect(fields['生成状态']),
    confirmation: firstSelect(fields['确认状态']),
    scriptZh: textCell(fields['完整脚本_zh']),
    scriptEn: textCell(fields['完整脚本_en']),
    ctaZh: textCell(fields['CTA_zh']),
    ctaEn: textCell(fields['CTA_en']),
    error: textCell(fields['错误信息']),
  };
}

export function normalizeVideo(record) {
  const fields = record?.fields || {};
  return {
    id: record?.record_id,
    productIds: linkIds(fields['关联产品']),
    hookIds: linkIds(fields['关联Hook']),
    scriptIds: linkIds(fields['关联脚本']),
    title: textCell(fields['视频标题']),
    status: firstSelect(fields['视频状态']),
    language: firstSelect(fields['语言']),
    productImageUrl: urlCell(fields['产品图URL']),
    persona: textCell(fields['达人偏好']),
    voiceScript: textCell(fields['Veo口播脚本']),
    ugcImageUrl: urlCell(fields['UGC关键图URL']),
    videoUrl: urlCell(fields['视频URL']),
    error: textCell(fields['错误信息']),
  };
}
