import { getAppConfig, urlValue } from './config';
import {
  createRecord,
  getRecord,
  listRecords,
  normalizeHook,
  normalizeProduct,
  normalizeScript,
  normalizeVideo,
  updateRecord,
} from './feishu';
import { triggerN8n } from './n8n';

const SOUNDCORE_URL = 'https://www.amazon.com/Soundcore-Cancelling-Powerful-Playtime-Bluetooth/dp/B0CRTYZG5C/ref=sr_1_9?crid=2FHUPRN2ZS5M6&dib=eyJ2IjoiMSJ9.rw83g9nDI8_SIoWBkAtG5ZJO1Drj-hyD2dP6OAYWvzzIz7UJlMtSRLFy1cH9pOU4k1SJSgsCrj85MqjQXy-xZy6mzyJ5_JSJPcBld53xDsNPcOeub2SiEgY3WpNMhXPeRN9AJsektKx3YPwBTRWDkBE4h3anQMRJGYc2vIGXN1f680Sd975qJowAr1DTMxaohb-0MFPFie2cvTFfHNSCn_tIjcjXMzTIRORq6n_sZ3A.LqC7yTb_TIGBxBImq-kKb9sW1_hmVJi9-OzWlYrQO-Y&dib_tag=se&keywords=Anker&qid=1779278080&sprefix=anker%2Caps%2C641&sr=8-9';

export { SOUNDCORE_URL };

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function briefFieldCount(product) {
  return [
    product.name,
    product.category,
    product.sellingPoints,
    product.painPoints,
    product.targetAudience,
    product.objections,
  ].filter((value) => String(value || '').trim()).length;
}

export function getTables() {
  return getAppConfig().tables;
}

export async function createProductAndGenerateBrief(productUrl) {
  const { tables } = getAppConfig();
  const record = await createRecord(tables.product.id, {
    产品链接: urlValue(productUrl),
    状态: '待生成',
    错误信息: '',
  });
  const productId = record.record_id;
  await sleep(2500);
  await triggerN8n('final-generate-hooks', { mode: 'brief_only', product_record_id: productId });
  return productId;
}

export async function generateHooksForProduct(productId, { manualNotes, brief } = {}) {
  const { tables } = getAppConfig();
  const fields = {
    用户手动备注: manualNotes?.trim() || '',
    错误信息: '',
  };
  if (brief) {
    fields['产品名称'] = brief.name?.trim() || '';
    fields['品类'] = brief.category?.trim() || '';
    fields['核心卖点'] = brief.sellingPoints?.trim() || '';
    fields['刺骨痛点'] = brief.painPoints?.trim() || '';
    fields['目标人群'] = brief.targetAudience?.trim() || '';
    fields['购买阻力'] = brief.objections?.trim() || '';
  }
  await updateRecord(tables.product.id, productId, fields);
  await sleep(2500);
  await triggerN8n('final-generate-hooks', { mode: 'hooks_only', product_record_id: productId });
  return { productId, status: 'Generating' };
}

export async function getWorkbench(productId) {
  const { tables } = getAppConfig();
  const [productRecord, hookRecords, scriptRecords, videoRecords] = await Promise.all([
    getRecord(tables.product.id, productId),
    listRecords(tables.hook.id),
    listRecords(tables.script.id),
    listRecords(tables.video.id),
  ]);

  if (!productRecord) throw new Error('找不到产品记录。');
  const product = normalizeProduct(productRecord);
  const hooks = hookRecords.map(normalizeHook).filter((hook) => hook.productIds.includes(productId));
  const scripts = scriptRecords.map(normalizeScript).filter((script) => script.productIds.includes(productId));
  const videos = videoRecords.map(normalizeVideo).filter((video) => video.productIds.includes(productId));

  return { product, hooks, scripts, videos };
}

export async function getLatestBriefProduct() {
  const { tables } = getAppConfig();
  const records = await listRecords(tables.product.id);
  const candidates = records
    .map((record, index) => ({ record, product: normalizeProduct(record), index }))
    .filter(({ product }) => product.status !== '失败' && briefFieldCount(product) >= 2)
    .sort((left, right) => {
      const rightTime = Number(right.record?.last_modified_time || right.record?.created_time || 0);
      const leftTime = Number(left.record?.last_modified_time || left.record?.created_time || 0);
      if (rightTime !== leftTime) return rightTime - leftTime;
      return right.index - left.index;
    });
  return candidates[0]?.product || null;
}

export async function generateScriptForHook(hookId) {
  await triggerN8n('final-generate-script', { hook_record_id: hookId });
  return { hookId, status: 'Generating' };
}

function normalizedLanguage() {
  return '英文';
}

export async function createVideoTaskForScript(scriptId, { persona, productImageUrl, language, voiceScript } = {}) {
  const response = await triggerN8n('final-create-video-task', { script_record_id: scriptId });
  const videoId = response.videoId || response?.data?.videoId;
  if (!videoId) return response;

  const { tables } = getAppConfig();
  const fields = { 语言: normalizedLanguage(language) };
  if (persona) fields['达人偏好'] = persona;
  if (productImageUrl) fields['产品图URL'] = urlValue(productImageUrl);
  if (voiceScript) fields['Veo口播脚本'] = voiceScript;
  await updateRecord(tables.video.id, videoId, fields);
  return { videoId };
}

export async function generateVideo(videoId, { persona, productImageUrl, language, voiceScript } = {}) {
  const { tables } = getAppConfig();
  const fields = { 语言: normalizedLanguage(language), 视频状态: '生成关键图中', 错误信息: '' };
  if (persona) fields['达人偏好'] = persona;
  if (productImageUrl) fields['产品图URL'] = urlValue(productImageUrl);
  if (voiceScript) fields['Veo口播脚本'] = voiceScript;
  await updateRecord(tables.video.id, videoId, fields);
  await triggerN8n('final-generate-video', {
    video_record_id: videoId,
    language: normalizedLanguage(language),
    reference_url: productImageUrl,
    persona,
    final_dialogue: voiceScript,
  });
  return { videoId, status: 'Generating' };
}
