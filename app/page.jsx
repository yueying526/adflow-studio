'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

const sampleUrl = 'https://www.amazon.com/Soundcore-Cancelling-Powerful-Playtime-Bluetooth/dp/B0CRTYZG5C/ref=sr_1_9?crid=2FHUPRN2ZS5M6&dib=eyJ2IjoiMSJ9.rw83g9nDI8_SIoWBkAtG5ZJO1Drj-hyD2dP6OAYWvzzIz7UJlMtSRLFy1cH9pOU4k1SJSgsCrj85MqjQXy-xZy6mzyJ5_JSJPcBld53xDsNPcOeub2SiEgY3WpNMhXPeRN9AJsektKx3YPwBTRWDkBE4h3anQMRJGYc2vIGXN1f680Sd975qJowAr1DTMxaohb-0MFPFie2cvTFfHNSCn_tIjcjXMzTIRORq6n_sZ3A.LqC7yTb_TIGBxBImq-kKb9sW1_hmVJi9-OzWlYrQO-Y&dib_tag=se&keywords=Anker&qid=1779278080&sprefix=anker%2Caps%2C641&sr=8-9';

const steps = [
  ['Product', '输入产品链接，生成产品策略简报。'],
  ['Hooks', '筛选并选择一个广告角度。'],
  ['Script', '从选中的 Hook 生成脚本。'],
  ['Video', '补达人偏好，生成 UGC 视频。'],
];

const languageModels = {
  中文: 'Seedance 2.0 Fast · 中文自带口播',
  英文: 'Veo 3.1 Fast · English native voice',
};

const defaultPersona = '真实自然的年轻科技博主，语气像朋友推荐，手持产品开箱试用';
const lastProductStorageKey = 'adflow-studio:last-product-id';
const lastProductUrlStorageKey = 'adflow-studio:last-product-url';
const dialogueLimits = {
  中文: { max: 36, unit: '字' },
  英文: { max: 145, unit: 'characters' },
};

const awarenessLabels = {
  unaware: '1 · 毫无察觉',
  '毫无察觉': '1 · 毫无察觉',
  problem: '2 · 意识到问题',
  '问题': '2 · 意识到问题',
  solution: '3 · 寻找解决方案',
  '解决方案': '3 · 寻找解决方案',
  product: '4 · 正在比较产品',
  '产品': '4 · 正在比较产品',
  most: '5 · 准备购买',
  '最': '5 · 准备购买',
};

const busyStatuses = ['生成关键图中', '生成视频中'];
const emptyBriefDraft = {
  name: '',
  category: '',
  sellingPoints: '',
  painPoints: '',
  targetAudience: '',
  objections: '',
};

function awarenessLabel(value) {
  return awarenessLabels[value] || value || '认知度未知';
}

function isTransientFeishuError(message) {
  return String(message || '').includes('1254607');
}

function isBusyStatus(status) {
  return busyStatuses.includes(status);
}

function hasBrief(product) {
  if (!product || product.status === '失败') return false;
  const fields = [
    product.name,
    product.category,
    product.sellingPoints,
    product.painPoints,
    product.targetAudience,
    product.objections,
  ];
  return fields.filter((value) => String(value || '').trim()).length >= 2;
}

function hasBriefDraft(brief) {
  const fields = [
    brief.name,
    brief.category,
    brief.sellingPoints,
    brief.painPoints,
    brief.targetAudience,
    brief.objections,
  ];
  return fields.filter((value) => String(value || '').trim()).length >= 2;
}

function productToBriefDraft(product) {
  return {
    name: product?.name || '',
    category: product?.category || '',
    sellingPoints: product?.sellingPoints || '',
    painPoints: product?.painPoints || '',
    targetAudience: product?.targetAudience || '',
    objections: product?.objections || '',
  };
}

function statusLabel(workbench) {
  if (!workbench?.product) return 'Queued';
  if (workbench.videos?.some((video) => video.videoUrl)) return 'Ready';
  if (workbench.videos?.some((video) => isBusyStatus(video.status))) return 'Generating video';
  if (workbench.scripts?.length) return 'Script ready';
  if (workbench.hooks?.length) return 'Hooks ready';
  if (workbench.product.status === '失败') return 'Failed';
  if (hasBrief(workbench.product)) return 'Brief ready';
  return workbench.product.status || 'Generating';
}

function workflowHint({ workbench, loading, productId, selectedHook, selectedScript, currentVideo, language, pendingHooks, briefReady }) {
  if (loading === 'product') return '正在创建飞书产品记录，并触发 n8n 抓取产品页与生成产品简报。请不要重复提交。';
  if (loading === 'hooks' || pendingHooks) return 'Hook 生成已触发。后台会读取已确认的产品简报和你的补充信息，页面每 5 秒刷新一次。';
  if (loading === 'script') return '脚本生成请求已提交给 n8n，后台会读取选中的 Hook 并写回脚本表。';
  if (loading === 'video-task') return '正在创建视频任务，并写入语言、达人偏好和产品图。';
  if (loading === 'video') return `视频生成已触发：${languageModels[language]}。后台会先生成 UGC 关键图，再生成带口播视频。`;
  if (!productId) return '输入产品链接后开始。前端会把任务写入飞书，再由 n8n 执行后台流程。';
  if (workbench?.product?.status === '失败') return '产品简报生成失败，请查看错误信息后重新提交。';
  if (workbench?.product && !briefReady) return '产品记录已创建，正在等待产品简报字段写回。完成前不会开放 Hook 生成。';
  if (briefReady && !workbench?.hooks?.length) return '产品简报已生成。你可以补充信息，确认后再生成 Hook。';
  if (!selectedHook) return 'Hook 已生成。请选择一个角度继续生成脚本。';
  if (!selectedScript) return '已选 Hook。点击 Generate script 后，等待脚本写回。';
  if (!currentVideo) return '脚本已准备好。点击 Create video task 后再生成视频。';
  if (currentVideo.status === '生成关键图中') return '后台正在用 GPT Image 2 生成 UGC 关键图，完成后会自动进入视频生成。';
  if (currentVideo.status === '生成视频中') return `后台正在用 ${languageModels[currentVideo.language || language]} 生成带口播视频，完成后会自动显示播放器。`;
  if (currentVideo.status === '视频已生成') return '视频已生成，可以直接播放或复制视频 URL。';
  if (currentVideo.status === '失败') return '视频任务失败，请查看错误信息后重新生成。';
  return `当前视频语言：${language}；模型路由：${languageModels[language]}。`;
}

function uniq(items) {
  return [...new Set(items.filter(Boolean))];
}

function singleSpeakerDialogue(text, language, isDialogueInteractive = false) {
  const value = String(text || '').trim();
  if (!value) return '';
  const hasSpeakerLabels = /(^|\n|\s)(你|我|闺蜜|朋友|A|B|Person\s*\d*)[：:]/i.test(value);
  if (!isDialogueInteractive && !hasSpeakerLabels) return value;

  if (language === '英文') {
    return value
      .replace(/(^|\n|\s)(A|B|Person\s*\d+|Friend|Me|You)\s*[:：]\s*/gi, ' ')
      .replace(/\s+/g, ' ')
      .replace(/^(.{0,120}).*$/s, 'A friend asked why I pack this set every trip. Honestly, it is comfy, easy, and looks put together.');
  }

  const cleaned = value
    .replace(/(^|\n|\s)(你|我|闺蜜|朋友|A|B|Person\s*\d*)[：:]\s*/gi, ' ')
    .replace(/\s+/g, '')
    .replace(/[“”"]/g, '');
  if (/随便切|随便抓|方便|快/.test(cleaned)) return '朋友问我为什么总带它，我说随手一抓就能出门';
  if (/舒服|不勒|不闷|保暖|轻/.test(cleaned)) return '朋友问我为什么常穿它，我说舒服不费劲';
  return '朋友问我为什么推荐它，我说好穿又省心';
}

function stripTimeLabel(line) {
  return String(line || '')
    .replace(/^\s*\d+\s*[-–—~到]\s*\d+\s*(?:秒|s|sec|seconds)?\s*[：:]\s*/i, '')
    .trim();
}

function extractOpening8Seconds(script) {
  const value = String(script || '').trim();
  if (!value) return '';
  const lines = value.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const timedOpening = [];

  for (const line of lines) {
    const match = line.match(/^\s*(\d+)\s*[-–—~到]\s*(\d+)\s*(?:秒|s|sec|seconds)?\s*[：:]\s*(.*)$/i);
    if (!match) continue;
    const start = Number(match[1]);
    if (Number.isFinite(start) && start < 8) timedOpening.push(match[3].trim());
  }

  if (timedOpening.length) return timedOpening.join(' ').replace(/\s+/g, ' ').trim();
  return stripTimeLabel(lines[0] || value);
}

function baseDialogueFrom({ language, selectedHook, selectedScript, currentVideo }) {
  const isDialogueInteractive = selectedHook?.category === '对话互动型';
  if (currentVideo?.voiceScript && (!currentVideo.language || currentVideo.language === language)) {
    return singleSpeakerDialogue(currentVideo.voiceScript, language, isDialogueInteractive);
  }
  if (language === '英文') {
    return singleSpeakerDialogue(
      extractOpening8Seconds(selectedScript?.scriptEn) || selectedHook?.scriptEn || selectedScript?.ctaEn || '',
      language,
      isDialogueInteractive,
    );
  }
  return singleSpeakerDialogue(
    extractOpening8Seconds(selectedScript?.scriptZh) || selectedHook?.scriptZh || selectedScript?.ctaZh || '',
    language,
    isDialogueInteractive,
  );
}

function countDialogueUnits(text) {
  return String(text || '').length;
}

function limitDialogue(text, language) {
  const value = String(text || '');
  const limit = dialogueLimits[language] || dialogueLimits.中文;
  return value.slice(0, limit.max);
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed: ${path}`);
  return data;
}

export default function Page() {
  const [productUrl, setProductUrl] = useState(sampleUrl);
  const [language, setLanguage] = useState('中文');
  const [persona, setPersona] = useState(defaultPersona);
  const [productImageUrl, setProductImageUrl] = useState('');
  const [productId, setProductId] = useState('');
  const [selectedHookId, setSelectedHookId] = useState('');
  const [selectedScriptId, setSelectedScriptId] = useState('');
  const [videoId, setVideoId] = useState('');
  const [workbench, setWorkbench] = useState(null);
  const [loading, setLoading] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [pendingScriptHookId, setPendingScriptHookId] = useState('');
  const [pendingVideoGenerateId, setPendingVideoGenerateId] = useState('');
  const [pendingHooks, setPendingHooks] = useState(false);
  const [manualNotes, setManualNotes] = useState('');
  const [voiceScript, setVoiceScript] = useState('');
  const [voiceScriptSourceKey, setVoiceScriptSourceKey] = useState('');
  const [videoSettingsSourceKey, setVideoSettingsSourceKey] = useState('');
  const [briefDraft, setBriefDraft] = useState(emptyBriefDraft);
  const [briefDraftProductId, setBriefDraftProductId] = useState('');
  const [restoreChecked, setRestoreChecked] = useState(false);
  const [filters, setFilters] = useState({ category: '', awareness: '', emotion: '' });

  const refresh = useCallback(async (id = productId) => {
    if (!id) return;
    const data = await api(`/api/products/${id}`);
    setWorkbench(data);
    if (typeof window !== 'undefined' && data.product?.id) {
      window.localStorage.setItem(lastProductStorageKey, data.product.id);
      if (data.product.productUrl) window.localStorage.setItem(lastProductUrlStorageKey, data.product.productUrl);
    }
    if (!selectedHookId && data.hooks?.[0]?.id) setSelectedHookId(data.hooks[0].id);
    if (!selectedScriptId && data.scripts?.[0]?.id) setSelectedScriptId(data.scripts[0].id);
    if (!videoId && data.videos?.[0]?.id) setVideoId(data.videos[0].id);
  }, [productId, selectedHookId, selectedScriptId, videoId]);

  useEffect(() => {
    if (restoreChecked || productId || typeof window === 'undefined') return;
    setRestoreChecked(true);
    const lastProductId = window.localStorage.getItem(lastProductStorageKey);
    const lastProductUrl = window.localStorage.getItem(lastProductUrlStorageKey);

    async function restoreProduct() {
      let targetProductId = lastProductId;
      let targetProductUrl = lastProductUrl;
      if (!targetProductId) {
        const latest = await api('/api/products?last=1');
        targetProductId = latest.productId;
        targetProductUrl = latest.productUrl;
      }
      if (!targetProductId) return;

      setProductId(targetProductId);
      if (targetProductUrl) setProductUrl(targetProductUrl);
      setNotice('已恢复上次产品简报。可以直接检查简报并生成 Hook，不需要重新生成产品简报。');
      await refresh(targetProductId);
    }

    restoreProduct().catch((err) => {
      window.localStorage.removeItem(lastProductStorageKey);
      window.localStorage.removeItem(lastProductUrlStorageKey);
      setProductId('');
      setError(`上次产品记录恢复失败：${err.message}`);
    });
  }, [productId, refresh, restoreChecked]);

  useEffect(() => {
    if (!productId) return undefined;
    const timer = setInterval(() => {
      refresh(productId).catch((err) => {
        if (isTransientFeishuError(err.message)) {
          setNotice('飞书数据还在同步，页面会继续自动刷新。');
          return;
        }
        setError(err.message);
      });
    }, 5000);
    return () => clearInterval(timer);
  }, [productId, refresh]);

  const selectedHook = useMemo(
    () => workbench?.hooks?.find((hook) => hook.id === selectedHookId) || null,
    [workbench, selectedHookId],
  );

  const scriptsForHook = useMemo(
    () => (workbench?.scripts || []).filter((script) => script.hookIds.includes(selectedHookId)),
    [workbench, selectedHookId],
  );

  const selectedScript = useMemo(
    () => workbench?.scripts?.find((script) => script.id === selectedScriptId) || scriptsForHook[0] || null,
    [workbench, selectedScriptId, scriptsForHook],
  );

  const currentVideo = useMemo(
    () => workbench?.videos?.find((video) => video.id === videoId) || workbench?.videos?.[0] || null,
    [workbench, videoId],
  );

  const briefReady = hasBrief(workbench?.product);
  const briefDraftReady = hasBriefDraft(briefDraft);
  const videoInputLocked = loading === 'video'
    || pendingVideoGenerateId === currentVideo?.id
    || isBusyStatus(currentVideo?.status);
  const dialogueInteractiveSelected = selectedHook?.category === '对话互动型';
  const voiceScriptCount = countDialogueUnits(voiceScript);
  const voiceScriptLimit = dialogueLimits[language] || dialogueLimits.中文;
  const voiceScriptReady = voiceScript.trim().length > 0 && voiceScriptCount <= voiceScriptLimit.max;

  const busy = Boolean(loading)
    || isBusyStatus(currentVideo?.status)
    || pendingHooks;

  const hint = workflowHint({
    workbench,
    loading,
    productId,
    selectedHook,
    selectedScript,
    currentVideo,
    language,
    pendingHooks,
    briefReady,
  });

  const filterOptions = useMemo(() => {
    const hooks = workbench?.hooks || [];
    return {
      categories: uniq(hooks.map((hook) => hook.category)),
      awareness: uniq(hooks.map((hook) => hook.awareness)),
      emotions: uniq(hooks.map((hook) => hook.emotion)),
    };
  }, [workbench]);

  const filteredHooks = useMemo(() => {
    return (workbench?.hooks || []).filter((hook) => (
      (!filters.category || hook.category === filters.category)
      && (!filters.awareness || hook.awareness === filters.awareness)
      && (!filters.emotion || hook.emotion === filters.emotion)
    ));
  }, [workbench, filters]);

  useEffect(() => {
    if (pendingHooks && workbench?.hooks?.length) {
      setPendingHooks(false);
      setError('');
      setNotice('Hook 已生成。请选择一条广告切入角度继续写脚本。');
    }
    if (workbench?.hooks?.length && error.includes('1254607')) {
      setError('');
    }
    if (briefReady && workbench?.product?.id && workbench.product.id !== briefDraftProductId) {
      setBriefDraft(productToBriefDraft(workbench.product));
      setManualNotes('');
      setBriefDraftProductId(workbench.product.id);
    }
    if (pendingScriptHookId && workbench?.scripts?.some((script) => script.hookIds.includes(pendingScriptHookId))) {
      setPendingScriptHookId('');
      setNotice('脚本已生成，可以确认后创建视频任务。');
    }
    if (pendingVideoGenerateId && currentVideo?.id === pendingVideoGenerateId && ['视频已生成', '失败'].includes(currentVideo.status)) {
      setPendingVideoGenerateId('');
      setNotice(currentVideo.status === '视频已生成' ? '视频已生成，可以直接播放。' : '视频生成失败，请查看错误信息。');
    }
  }, [briefDraftProductId, briefReady, currentVideo, error, pendingHooks, pendingScriptHookId, pendingVideoGenerateId, workbench]);

  useEffect(() => {
    if (!selectedScript) return;
    const sourceKey = `${selectedScript.id}:${selectedHook?.id || ''}:${currentVideo?.id || 'new'}:${language}:opening-8s-v3`;
    if (sourceKey === voiceScriptSourceKey) return;
    const defaultDialogue = baseDialogueFrom({ language, selectedHook, selectedScript, currentVideo });
    setVoiceScript(limitDialogue(defaultDialogue, language));
    setVoiceScriptSourceKey(sourceKey);
  }, [currentVideo, language, selectedHook, selectedScript, voiceScriptSourceKey]);

  useEffect(() => {
    if (!currentVideo || videoInputLocked) return;
    const sourceKey = currentVideo.id || '';
    if (!sourceKey || sourceKey === videoSettingsSourceKey) return;
    if (currentVideo.persona) setPersona(currentVideo.persona);
    if (currentVideo.productImageUrl) setProductImageUrl(currentVideo.productImageUrl);
    setVideoSettingsSourceKey(sourceKey);
  }, [currentVideo, videoInputLocked, videoSettingsSourceKey]);

  async function submitProduct(event) {
    event.preventDefault();
    setError('');
    setNotice('已开始：创建产品记录 → Firecrawl 抓取 → DeepSeek 提炼产品简报。简报完成后，你可以确认再生成 Hook。');
    setLoading('product');
    try {
      const data = await api('/api/products', {
        method: 'POST',
        body: JSON.stringify({ productUrl }),
      });
      setProductId(data.productId);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(lastProductStorageKey, data.productId);
        window.localStorage.setItem(lastProductUrlStorageKey, productUrl);
      }
      setWorkbench(null);
      setSelectedHookId('');
      setSelectedScriptId('');
      setVideoId('');
      setPendingHooks(false);
      setManualNotes('');
      setPersona(defaultPersona);
      setProductImageUrl('');
      setVoiceScript('');
      setVoiceScriptSourceKey('');
      setVideoSettingsSourceKey('');
      setBriefDraft(emptyBriefDraft);
      setBriefDraftProductId('');
      await refresh(data.productId);
    } catch (err) {
      if (isTransientFeishuError(err.message)) {
        setNotice('产品记录已创建，飞书数据还在同步，页面会继续自动刷新。');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading('');
    }
  }

  function startNewTask() {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(lastProductStorageKey);
      window.localStorage.removeItem(lastProductUrlStorageKey);
    }
    setProductUrl('');
    setLanguage('中文');
    setPersona(defaultPersona);
    setProductImageUrl('');
    setProductId('');
    setSelectedHookId('');
    setSelectedScriptId('');
    setVideoId('');
    setWorkbench(null);
    setLoading('');
    setError('');
    setNotice('已开始新任务。请输入新的产品链接。');
    setPendingScriptHookId('');
    setPendingVideoGenerateId('');
    setPendingHooks(false);
    setManualNotes('');
    setVoiceScript('');
    setVoiceScriptSourceKey('');
    setVideoSettingsSourceKey('');
    setBriefDraft(emptyBriefDraft);
    setBriefDraftProductId('');
    setFilters({ category: '', awareness: '', emotion: '' });
  }

  async function generateHooks() {
    if (!productId) return;
    setError('');
    setNotice('已确认产品简报，正在生成 12 条 Hook。页面会自动刷新，完成前不需要重复点击。');
    setPendingHooks(true);
    setLoading('hooks');
    try {
      await api(`/api/products/${productId}/hooks`, {
        method: 'POST',
        body: JSON.stringify({ manualNotes, brief: briefDraft }),
      });
      await refresh();
    } catch (err) {
      setPendingHooks(false);
      setError(err.message);
    } finally {
      setLoading('');
    }
  }

  async function generateScript() {
    if (!selectedHookId) return;
    setError('');
    setNotice('脚本生成已提交。后台会根据当前 Hook 生成中英双语脚本，完成后自动出现在 Script 区域。');
    setLoading('script');
    try {
      await api(`/api/hooks/${selectedHookId}/script`, { method: 'POST' });
      setPendingScriptHookId(selectedHookId);
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading('');
    }
  }

  async function generateVideoClick() {
    setError('');
    setLoading('video');
    try {
      let targetVideoId = currentVideo?.id || videoId;
      if (!targetVideoId) {
        setNotice('正在创建视频任务，然后会自动开始生成视频。');
        const task = await api(`/api/scripts/${selectedScript.id}/video-task`, {
          method: 'POST',
          body: JSON.stringify({ persona, productImageUrl, language, voiceScript }),
        });
        targetVideoId = task.videoId;
        if (targetVideoId) setVideoId(targetVideoId);
      }
      if (!targetVideoId) throw new Error('视频任务创建失败，未返回 videoId。');
      setNotice(`视频生成已提交。${language === '中文' ? '中文会走 Seedance 2.0 Fast，自带中文口播。' : '英文会走 Veo 3.1 Fast，自带英文口播。'}先生成关键图，再生成视频，请等待页面自动刷新。`);
      await api(`/api/videos/${targetVideoId}/generate`, {
        method: 'POST',
        body: JSON.stringify({ persona, productImageUrl, language, voiceScript }),
      });
      setPendingVideoGenerateId(targetVideoId);
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading('');
    }
  }

  const stepStatus = [
    briefReady ? 'done' : 'current',
    workbench?.hooks?.length ? (selectedHook ? 'done' : 'current') : briefReady ? 'current' : 'locked',
    selectedScript ? 'done' : selectedHook ? 'current' : 'locked',
    currentVideo?.videoUrl ? 'done' : selectedScript ? 'current' : 'locked',
  ];

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-kicker">Local MVP</div>
          <h1>AdFlow Studio</h1>
          <p>从产品链接到口播视频的 AI 广告工作台。</p>
        </div>
        <nav className="steps">
          {steps.map(([title, copy], index) => (
            <div className={`step ${stepStatus[index]}`} key={title}>
              <div className="step-index">{index + 1}</div>
              <div>
                <div className="step-title">{title}</div>
                <div className="step-copy">{copy}</div>
              </div>
            </div>
          ))}
        </nav>
      </aside>

      <section className="main">
        <div className="topbar">
          <div>
            <h2>从产品链接到口播视频</h2>
            <p>飞书做数据底座，n8n 做自动化编排，前端做清爽操作台。</p>
          </div>
          <div className="status-stack">
            <div className="status-pill">{statusLabel(workbench)}</div>
            <div className="model-pill">{languageModels[language]}</div>
            <button className="button secondary small-button" onClick={startNewTask} type="button">
              新建任务
            </button>
          </div>
        </div>

        {error ? <div className="error">{error}</div> : null}
        <div className={`notice ${busy ? 'notice-busy' : ''}`}>{notice || hint}</div>

        <div className="flow-stack">
          <section className="flow-section">
            <div className="flow-action">
              <div className="step-eyebrow">Step 1 · Product</div>
              <h3>先输入一个产品链接</h3>
              <p>提交后，后台只生成产品简报。界面保持中文，最终视频按这里选择的输出语言生成。</p>
              <form className="form-grid" onSubmit={submitProduct}>
                <div className="field primary-field">
                  <label>Product URL</label>
                  <textarea className="textarea" value={productUrl} onChange={(event) => setProductUrl(event.target.value)} />
                </div>
                <div className="field">
                  <label>视频输出语言</label>
                  <select className="select" disabled={Boolean(productId)} value={language} onChange={(event) => setLanguage(event.target.value)}>
                    <option value="中文">中文 · Seedance 2.0 Fast</option>
                    <option value="英文">English · Veo 3.1 Fast</option>
                  </select>
                </div>
                <div className="actions">
                  <button className="button" disabled={!productUrl.trim() || loading === 'product'} type="submit">
                    {loading === 'product' ? '生成简报中...' : '生成产品简报'}
                  </button>
                  <button className="button secondary" type="button" onClick={() => setProductUrl(sampleUrl)}>
                    Reset sample
                  </button>
                  {productId ? (
                    <button className="button secondary" type="button" onClick={startNewTask}>
                      新建任务
                    </button>
                  ) : null}
                  {briefReady ? <span className="action-note">当前简报已锁定。继续下一步不会重新生成产品简报。</span> : null}
                </div>
              </form>
            </div>
            <div className="flow-output">
              <div className="output-header">
                <span>Output</span>
                <strong>{briefReady ? '产品简报已准备好' : productId ? '正在生成产品简报' : '等待输入产品'}</strong>
              </div>
              {loading === 'product' || (productId && !briefReady && workbench?.product?.status !== '失败') ? (
                <ProgressBlock title="产品简报生成中" detail="后台正在创建产品记录、抓取页面，并用 DeepSeek 提炼产品信息。完成后你可以确认再生成 Hook。" />
              ) : null}
              {workbench?.product?.status === '失败' ? (
                <div className="error inline-error">{workbench.product.error || '产品简报生成失败。'}</div>
              ) : null}
              {briefReady ? (
                <div className="brief-grid editable-brief-grid">
                  <EditableBrief label="产品" value={briefDraft.name} onChange={(name) => setBriefDraft((current) => ({ ...current, name }))} />
                  <EditableBrief label="品类" value={briefDraft.category} onChange={(category) => setBriefDraft((current) => ({ ...current, category }))} />
                  <EditableBrief label="卖点" value={briefDraft.sellingPoints} onChange={(sellingPoints) => setBriefDraft((current) => ({ ...current, sellingPoints }))} multiline />
                  <EditableBrief label="痛点" value={briefDraft.painPoints} onChange={(painPoints) => setBriefDraft((current) => ({ ...current, painPoints }))} multiline />
                  <EditableBrief label="目标受众" value={briefDraft.targetAudience} onChange={(targetAudience) => setBriefDraft((current) => ({ ...current, targetAudience }))} multiline />
                  <EditableBrief label="购买阻力" value={briefDraft.objections} onChange={(objections) => setBriefDraft((current) => ({ ...current, objections }))} multiline />
                </div>
              ) : (
                <div className="empty calm-empty">{productId ? '正在抓取产品页并生成简报。完成后，Hook 区域会自动出现。' : '右侧会展示抓取后的产品简报和卖点。'}</div>
              )}
              {briefReady && !workbench?.hooks?.length ? (
                <div className="confirm-panel">
                  <label className="field">
                    <span>额外要求（可选）</span>
                    <textarea
                      className="textarea compact-textarea"
                      onChange={(event) => setManualNotes(event.target.value)}
                      placeholder="比如：禁说内容、促销信息、品牌语气、特定人群、不希望出现的表达。不填也可以直接确认。"
                      value={manualNotes}
                    />
                  </label>
                  <div className="actions">
                    <button className="button" disabled={!briefDraftReady || pendingHooks || loading === 'hooks'} onClick={generateHooks} type="button">
                      {pendingHooks || loading === 'hooks' ? 'Hook 生成中...' : '确认简报并生成 Hook'}
                    </button>
                    {!briefDraftReady ? <span className="action-note">至少保留 2 个简报字段后才能生成 Hook。</span> : null}
                  </div>
                </div>
              ) : null}
            </div>
          </section>

          {briefReady ? (
            <section className="flow-section revealed">
              <div className="flow-action">
                <div className="step-eyebrow">Step 2 · Hooks</div>
                <h3>再选一个广告切入角度</h3>
                <p>Hook 生成完成后，先筛选分类、认知阶段和情绪触发，再选一条继续写脚本。</p>
                {workbench?.hooks?.length ? (
                  <div className="filters vertical-filters">
                    <Filter value={filters.category} onChange={(category) => setFilters((current) => ({ ...current, category }))} label="Category" options={filterOptions.categories} />
                    <Filter value={filters.awareness} onChange={(awareness) => setFilters((current) => ({ ...current, awareness }))} label="Awareness" options={filterOptions.awareness} />
                    <Filter value={filters.emotion} onChange={(emotion) => setFilters((current) => ({ ...current, emotion }))} label="Emotion" options={filterOptions.emotions} />
                  </div>
                ) : pendingHooks ? (
                  <div className="empty calm-empty">正在生成 12 条 Hook。这里完成后会出现筛选器。</div>
                ) : (
                  <div className="empty calm-empty">确认产品简报后，再生成 Hook。</div>
                )}
              </div>
              <div className="flow-output">
                <div className="output-header">
                  <span>Output</span>
                  <strong>{workbench?.hooks?.length ? `${filteredHooks.length} 条 Hook 可选` : pendingHooks ? '正在生成 Hook' : '等待确认简报'}</strong>
                </div>
                {pendingHooks ? <ProgressBlock title="Hook 生成中" detail="页面每 5 秒自动刷新。生成完成前不需要重复点击。" /> : null}
              {workbench?.hooks?.length ? (
                  <div className="hook-list">
                    {filteredHooks.map((hook) => (
                      <button className={`hook-card ${hook.id === selectedHookId ? 'selected' : ''}`} key={hook.id} onClick={() => setSelectedHookId(hook.id)} type="button">
                        <div className="hook-top">
                          <p className="hook-title">{hook.concept || 'Untitled hook'}</p>
                          <span className="score">{hook.score ? `${hook.score}/10` : '—'}</span>
                        </div>
                        <div className="tags">
                          <span className="tag">{hook.category || 'Category'}</span>
                          <span className="tag">{awarenessLabel(hook.awareness)}</span>
                          <span className="tag">{hook.emotion || 'Emotion'}</span>
                        </div>
                        <p className="hook-copy">{hook.scriptZh || hook.scriptEn}</p>
                        <div className="hook-visual">{hook.visualHook}</div>
                      </button>
                    ))}
                  </div>
              ) : (
                <div className="empty calm-empty">{pendingHooks ? '后台正在工作，页面会自动刷新。' : '确认产品简报后，这里会显示 Hook 列表。'}</div>
              )}
              </div>
            </section>
          ) : null}

          {selectedHook ? (
            <section className="flow-section revealed">
              <div className="flow-action">
                <div className="step-eyebrow">Step 3 · Script</div>
                <h3>把选中的 Hook 扩展成脚本</h3>
                <p>这一段可以作为单独交付，也可以继续生成视频。</p>
                <div className="brief-item">
                  <span>Selected hook</span>
                  <p>{selectedHook.concept}</p>
                </div>
                <div className="actions">
                  <button className="button" disabled={!selectedHookId || loading === 'script' || pendingScriptHookId === selectedHookId} onClick={generateScript} type="button">
                    {loading === 'script' || pendingScriptHookId === selectedHookId ? 'Generating...' : 'Generate script'}
                  </button>
                </div>
              </div>
              <div className="flow-output">
                <div className="output-header">
                  <span>Output</span>
                  <strong>{selectedScript ? '脚本已准备好' : pendingScriptHookId === selectedHookId ? '脚本生成中' : '等待生成脚本'}</strong>
                </div>
                {pendingScriptHookId === selectedHookId || loading === 'script' ? (
                  <ProgressBlock title="脚本生成中" detail="后台正在根据选中的 Hook 生成完整脚本。按钮已锁定，完成后会自动显示脚本。" />
                ) : null}
              {selectedHook ? (
                <div className="script-box">
                  {selectedScript ? (
                    <>
                      <div className="script-content">{selectedScript.scriptZh || selectedScript.scriptEn}</div>
                      <div className="tags">
                        <span className="tag">CTA zh: {selectedScript.ctaZh || '—'}</span>
                        <span className="tag">CTA en: {selectedScript.ctaEn || '—'}</span>
                      </div>
                    </>
                  ) : (
                    <div className="empty">{loading === 'script' ? '脚本生成已触发，稍等片刻。' : '这个 Hook 还没有生成脚本。'}</div>
                  )}
                </div>
              ) : (
                <div className="empty">选择一条 Hook 后继续。</div>
              )}
              </div>
            </section>
          ) : null}

          {selectedScript ? (
            <section className="flow-section revealed">
              <div className="flow-action">
                <div className="step-eyebrow">Step 4 · Video</div>
                <h3>最后生成口播视频</h3>
                <p>这里补充视频生成素材。输出语言已在 Step 1 固定，点击生成时会用下面的值覆盖飞书视频任务。</p>
                <div className="form-grid video-settings-grid">
                  <div className="field">
                    <label>Creator preference</label>
                    <textarea className="textarea compact-textarea" disabled={videoInputLocked} value={persona} onChange={(event) => setPersona(event.target.value)} />
                  </div>
                  <div className="field">
                    <label>Product image URL</label>
                    <input className="input" disabled={videoInputLocked} value={productImageUrl} onChange={(event) => setProductImageUrl(event.target.value)} placeholder={workbench?.product?.imageUrl || '留空则使用产品页主图'} />
                  </div>
                  <div className="field final-dialogue-field">
                    <label>8 秒口播脚本</label>
                    <textarea
                      className="textarea compact-textarea"
                      disabled={videoInputLocked}
                      maxLength={voiceScriptLimit.max}
                      onChange={(event) => setVoiceScript(limitDialogue(event.target.value, language))}
                      value={voiceScript}
                    />
                    <div className={`counter ${voiceScriptReady ? '' : 'counter-warning'}`}>
                      {voiceScriptCount}/{voiceScriptLimit.max} {voiceScriptLimit.unit}
                    </div>
                  </div>
                </div>
                {dialogueInteractiveSelected ? (
                  <div className="inline-note">当前 Hook 是对话互动型。视频生成会自动改写成单人创作者复述式口播，不会生成双人对话场景。</div>
                ) : null}
                <div className="actions">
                  <button className="button" disabled={!selectedScript?.id || videoInputLocked || !voiceScriptReady} onClick={generateVideoClick} type="button">
                    {videoInputLocked ? '生成中...' : currentVideo?.videoUrl ? '按当前设置重新生成' : '按当前设置生成口播视频'}
                  </button>
                  {!voiceScriptReady ? <span className="action-note">先保留一条不超过上限的 8 秒口播脚本。</span> : null}
                </div>
              </div>
              <div className="flow-output">
                <div className="output-header">
                  <span>Output</span>
                  <strong>{currentVideo?.videoUrl ? '视频已生成' : isBusyStatus(currentVideo?.status) ? '视频生成中' : currentVideo ? '准备生成视频' : '等待生成视频'}</strong>
                </div>
                {loading === 'video' || pendingVideoGenerateId === currentVideo?.id || isBusyStatus(currentVideo?.status) ? (
                  <ProgressBlock
                    title={currentVideo?.status === '生成视频中' ? '视频生成中' : '关键图生成中'}
                    detail={currentVideo?.status === '生成视频中' ? '关键图已完成，正在生成带口播的视频。完成后右侧会出现播放器。' : '系统正在生成 UGC 关键图，随后会自动进入视频生成。'}
                  />
                ) : null}
                {currentVideo ? (
                  <div className="brief-grid video-meta">
                    <Brief label="Video status" value={isBusyStatus(currentVideo.status) ? '生成中' : currentVideo.status === '待补素材' ? '准备生成' : currentVideo.status} />
                    <Brief label="Error" value={currentVideo.error} />
                  </div>
                ) : (
                  <div className="empty calm-empty">点击 Create video task 后，这里会显示任务状态。</div>
                )}
                {currentVideo?.videoUrl ? (
                  <video className="video-frame" controls src={currentVideo.videoUrl} />
                ) : currentVideo?.ugcImageUrl ? (
                  <img className="video-frame" alt="UGC key visual" src={currentVideo.ugcImageUrl} />
                ) : (
                  <div className="empty">视频完成后会在这里播放。</div>
                )}
              </div>
            </section>
          ) : null}
        </div>
      </section>
    </main>
  );
}

function Brief({ label, value }) {
  return (
    <div className="brief-item">
      <span>{label}</span>
      <p>{value || '—'}</p>
    </div>
  );
}

function EditableBrief({ label, value, onChange, multiline = false }) {
  return (
    <label className="brief-item editable-brief-item">
      <span>{label}</span>
      {multiline ? (
        <textarea className="brief-edit brief-edit-area" value={value} onChange={(event) => onChange(event.target.value)} />
      ) : (
        <input className="brief-edit" value={value} onChange={(event) => onChange(event.target.value)} />
      )}
    </label>
  );
}

function Filter({ label, options, value, onChange }) {
  return (
    <select className="select" aria-label={label} value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="">{label === 'Awareness' ? '认知度：全部' : `${label}: All`}</option>
      {options.map((option) => (
        <option key={option} value={option}>{label === 'Awareness' ? awarenessLabel(option) : option}</option>
      ))}
    </select>
  );
}

function ProgressBlock({ title, detail }) {
  return (
    <div className="progress-block">
      <div className="progress-row">
        <div className="spinner" />
        <div>
          <strong>{title}</strong>
          <p>{detail}</p>
        </div>
      </div>
      <div className="progress-bar">
        <div />
      </div>
    </div>
  );
}
