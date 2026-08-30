// 旧浏览器兼容垫片（pdf.js 4.x 需要，微信内置内核等老浏览器没有）
if (typeof Promise.withResolvers !== 'function') {
  Promise.withResolvers = function () { let resolve, reject; const promise = new Promise((res, rej) => { resolve = res; reject = rej; }); return { promise, resolve, reject }; };
}

const skinPresets = {
  paper: {label:'纸本', note:'干净、克制，适合长时间阅读', paper:'#fbfaf7', ink:'#252522', muted:'#898982', line:'#deddd6', accent:'#c45c36', soft:'#eee8df', panel:'#f8f7f3'},
  ink: {label:'墨黑', note:'低亮度，适合夜间沉浸阅读', paper:'#20201d', ink:'#ece9e2', muted:'#a5a299', line:'#403f3a', accent:'#dc7952', soft:'#302d28', panel:'#1b1b19'},
  ocean: {label:'夜读蓝', note:'冷静、清晰，适合资料型阅读', paper:'#f4f7fa', ink:'#172535', muted:'#687786', line:'#d5dee6', accent:'#2d7194', soft:'#e7eff4', panel:'#edf3f7'},
  sand: {label:'暖沙', note:'柔和、低刺激，适合慢读和复盘', paper:'#f8f3ea', ink:'#342d26', muted:'#928579', line:'#e1d7c8', accent:'#a45c3b', soft:'#eee4d5', panel:'#f3ece1'}
};

let chosenSkin = { name: 'paper', custom: null };
function applySkin(name, custom = null, persist = true) {
  const skin = custom || skinPresets[name];
  if (!skin) return;
  const root = document.documentElement;
  Object.entries({paper:skin.paper, ink:skin.ink, muted:skin.muted, line:skin.line, accent:skin.accent, soft:skin.soft, panel:skin.panel}).forEach(([key, value]) => root.style.setProperty(`--${key}`, value));
  document.body.classList.toggle('dark-mode', name === 'ink');
  document.getElementById('focusMode').classList.toggle('active', name === 'ink');
  if (name !== 'ink') chosenSkin = { name, custom };
  if (persist) localStorage.setItem('reading-room-skin', JSON.stringify({name, custom}));
  document.querySelectorAll('.skin-option').forEach(option => option.classList.toggle('selected', option.dataset.skin === name));
}

function initSkinPicker() {
  const grid = document.getElementById('skinGrid');
  grid.innerHTML = Object.entries(skinPresets).map(([key, skin]) => `<button type="button" class="skin-option" data-skin="${key}"><span class="skin-swatch" style="--swatch-paper:${skin.paper};--swatch-ink:${skin.ink};--swatch-accent:${skin.accent}"><i></i><b></b></span><span><strong>${skin.label}</strong><small>${skin.note}</small></span></button>`).join('');
  grid.querySelectorAll('.skin-option').forEach(option => option.addEventListener('click', () => applySkin(option.dataset.skin)));
  document.getElementById('applyCustomSkin').addEventListener('click', () => applySkin('custom', {paper:customPaper.value, ink:customInk.value, muted:'#77736c', line:'#d8d2c8', accent:customAccent.value, soft:'#eee8df', panel:customPaper.value}));
  const saved = JSON.parse(localStorage.getItem('reading-room-skin') || 'null');
  if (saved?.custom) { customPaper.value = saved.custom.paper; customInk.value = saved.custom.ink; customAccent.value = saved.custom.accent; applySkin(saved.name, saved.custom); }
  else applySkin(saved?.name || 'paper');
}

const skinDialog = document.getElementById('skinDialog');
const customPaper = document.getElementById('customPaper');
const customInk = document.getElementById('customInk');
const customAccent = document.getElementById('customAccent');
const skinStatus = document.getElementById('skinStatus');
const skinFileInput = document.getElementById('skinFileInput');
const skinKeys = ['paper', 'ink', 'muted', 'line', 'accent', 'soft', 'panel'];
const colorPattern = /^#[0-9a-f]{6}$/i;
function validImportedSkin(value) {
  return value && typeof value === 'object' && skinKeys.every(key => colorPattern.test(value[key] || ''));
}
document.getElementById('importSkin').addEventListener('click', () => skinFileInput.click());
skinFileInput.addEventListener('change', async event => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    const imported = JSON.parse(await file.text());
    const skin = imported.colors || imported;
    if (!validImportedSkin(skin)) throw new Error('皮肤文件格式不正确，需要包含 7 个十六进制颜色字段。');
    customPaper.value = skin.paper;
    customInk.value = skin.ink;
    customAccent.value = skin.accent;
    applySkin('imported', skin);
    skinStatus.textContent = `已导入：${imported.name || file.name}`;
  } catch (error) {
    skinStatus.textContent = error.message.includes('JSON') ? '皮肤文件不是有效的 JSON。' : error.message;
  }
  event.target.value = '';
});
document.getElementById('exportSkin').addEventListener('click', () => {
  const saved = JSON.parse(localStorage.getItem('reading-room-skin') || 'null');
  const colors = saved?.custom || skinPresets[saved?.name] || skinPresets.paper;
  const payload = {name: saved?.name === 'custom' || saved?.name === 'imported' ? '我的云阅皮肤' : colors.label, version: 1, colors: Object.fromEntries(skinKeys.map(key => [key, colors[key]]))};
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], {type:'application/json'}));
  link.download = 'reading-room-skin.json';
  link.click();
  URL.revokeObjectURL(link.href);
  skinStatus.textContent = '已导出当前皮肤。';
});
document.getElementById('skinSettings').addEventListener('click', () => { skinStatus.textContent = ''; if (typeof skinDialog.showModal === 'function') skinDialog.showModal(); else { skinDialog.classList.add('fallback-open'); skinDialog.setAttribute('open', ''); } });
document.querySelectorAll('#skinForm [value="cancel"]').forEach(button => button.addEventListener('click', () => skinDialog.close ? skinDialog.close() : skinDialog.classList.remove('fallback-open')));

const SESSION_STORAGE_KEY = 'reading-room-session-id';
function getSessionId() {
  let sessionId = localStorage.getItem(SESSION_STORAGE_KEY);
  if (!sessionId || !/^[a-zA-Z0-9_-]{24,128}$/.test(sessionId)) {
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    sessionId = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
    localStorage.setItem(SESSION_STORAGE_KEY, sessionId);
  }
  return sessionId;
}
const sessionId = getSessionId();
const DOC_SECRET_KEY = 'reading-room-doc-secret';
function getDocSecret() {
  let s = localStorage.getItem(DOC_SECRET_KEY);
  if (!s || !/^[a-f0-9]{32,128}$/.test(s)) {
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    s = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
    localStorage.setItem(DOC_SECRET_KEY, s);
  }
  return s;
}
const docSecret = getDocSecret();
const apiHeaders = {'Content-Type': 'application/json', 'X-Reading-Room-Session': sessionId, 'X-Doc-Secret': docSecret};
const providerInfo = {
  volcengine: '火山引擎使用 Endpoint ID 作为模型名',
  deepseek: '默认使用 deepseek-chat',
  kimi: '默认使用 moonshot-v1-8k',
  glm: '默认使用 glm-4-flash',
  qwen: '默认使用 qwen-plus'
};

async function api(path, options = {}) {
  const headers = {...apiHeaders, ...(options.headers || {})};
  const res = await fetch(path, {...options, headers});
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `请求失败（${res.status}）`);
  return data;
}
const sections = [
  { label: '第一节 · 先别急着怪注意力', title: '先别急着怪注意力', paragraphs: [
    '我们常说，今天的人看不了长文章，是因为注意力被短视频毁掉了。这个解释有一部分是真的，但它太方便了，方便到几乎不用再想。',
    '一个人可以连续刷两个小时短视频，却读不完一篇二十分钟的文章。这不一定说明他没有注意力，而是两种活动要求的东西根本不同。短视频不断给你新的画面、新的声音和新的反馈；长文章却要求你记住前面讲过的人、事实和问题，在答案还没有出现的时候继续往下走。',
    '所以第一个问题不是“你还能集中多久”，而是“你愿不愿意把注意力交给一个暂时不会立刻奖励你的问题”。'
  ], quote: '长文章要求的，不只是专注，而是允许理解晚一点发生。' },
  { label: '第二节 · 你失去的可能不是时间', title: '你失去的可能不是时间', paragraphs: [
    '长文阅读最难的地方，不在字数，而在它要求你持续维持一个上下文。你读到第三页时，仍然要记得第一段提出的疑问；作者换了一个例子，你要判断它是在证明前面的判断，还是正在偷偷改变问题。',
    '这是一种很慢的能力。它让人能够暂时不急着表态，容忍材料不完整，等更多事实出现之后再判断。可我们每天接触的信息，越来越鼓励另一种反应：看见标题就表态，看见冲突就站队，看见结论就转发。',
    '当一个人逐渐无法在复杂问题上停留，他失去的未必只是读完一篇文章的时间，也可能是把不同事实放在一起，形成自己判断的机会。'
  ], quote: '快速知道很多事情，不等于真正理解任何一件事情。' },
  { label: '第三节 · 文章也要承担责任', title: '文章也要承担责任', paragraphs: [
    '当然，不能把所有责任都推给读者。很多长文章读不下去，是因为它根本没有值得读下去的东西。开头绕很久，中间反复换词，作者迟迟不说自己到底判断了什么，所谓深度只是把一句话拉长。',
    '好的长内容不是把短内容简单加长。它应该让读者知道自己正在追踪什么问题，同时不断提供新的事实、现场或冲突。路标有用，但路标不是终点；小标题有用，但不能把文章切成一堆互不相干的段落。',
    '对读者来说，重新训练阅读不是每天硬读一百页。可以从一篇真正和自己有关的文章开始，读之前写下一个问题，读完用自己的话复述，再说出一个不同意的地方。对作者来说，则要问一句更难的问题：如果删掉一半字数，判断还站得住吗？'
  ], quote: '长内容的价值，不是让人读得更久，而是让人理解得更深。' }
];

let current = 0;
let completed = new Set();
const recallNotes = [];
let fullArticleText = sections.flatMap(section => section.paragraphs).join('\n\n');
const READING_DB = 'reading-room-db';
const DOC_STORE = 'documents';   // 旧版单文档
const LIB_STORE = 'library';     // 书架全文
const META_STORE = 'meta';       // 书架元信息
function openReadingDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(READING_DB, 2);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(DOC_STORE)) db.createObjectStore(DOC_STORE);
      if (!db.objectStoreNames.contains(LIB_STORE)) db.createObjectStore(LIB_STORE, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(META_STORE)) db.createObjectStore(META_STORE, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
function dbPut(db, store, value, key) { return new Promise((resolve, reject) => { const req = key !== undefined ? db.transaction(store, 'readwrite').objectStore(store).put(value, key) : db.transaction(store, 'readwrite').objectStore(store).put(value); req.onsuccess = resolve; req.onerror = () => reject(req.error); }); }
function dbGet(db, store, key) { return new Promise((resolve, reject) => { const req = db.transaction(store, 'readonly').objectStore(store).get(key); req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); }); }
function dbAll(db, store) { return new Promise((resolve, reject) => { const req = db.transaction(store, 'readonly').objectStore(store).getAll(); req.onsuccess = () => resolve(req.result || []); req.onerror = () => reject(req.error); }); }
function dbDelete(db, store, key) { return new Promise((resolve, reject) => { const req = db.transaction(store, 'readwrite').objectStore(store).delete(key); req.onsuccess = resolve; req.onerror = () => reject(req.error); }); }
function genDocId() { return 'd' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
function kindOfFilename(name) { const lower = String(name || '').toLowerCase(); return /\.pdf$/.test(lower) ? 'pdf' : /\.(docx|doc)$/.test(lower) ? 'doc' : /\.epub$/.test(lower) ? 'epub' : /\.(md|markdown)$/.test(lower) ? 'md' : 'txt'; }
const kindLabels = { pdf: 'PDF 文件', doc: 'Word 文档', md: 'Markdown', txt: '文本文件', article: '公众号文章', link: '网页文章', file: '已导入文档', epub: 'EPUB 电子书' };
// 每篇文档独立进度
const progKey = id => `reading-room-prog-${id}`;
function saveDocProgress(id, currentIndex, doneSet) { try { localStorage.setItem(progKey(id), JSON.stringify({ current: currentIndex, done: [...doneSet] })); } catch (_) {} }
function loadDocProgress(id) { try { return JSON.parse(localStorage.getItem(progKey(id)) || 'null'); } catch (_) { return null; } }
function clearDocProgress(id) { try { localStorage.removeItem(progKey(id)); } catch (_) {} }
let activeDocId = localStorage.getItem('reading-room-active-doc') || '';
let lastSavedProgress = '';
async function saveImportedDocument(docData) {
  activeDocId = docData.id;
  localStorage.setItem('reading-room-active-doc', docData.id);
  clearDocProgress(docData.id);
  lastSavedProgress = '';
  const meta = { id: docData.id, title: docData.title || '已导入文章', source: docData.source || 'file', kind: docData.kind || kindOfFilename(docData.filename), savedAt: docData.savedAt || Date.now(), characters: docData.characters || (docData.text || '').length, images: docData.images || 0, chunkCount: docData.chunkCount || 0, doneCount: 0, serverId: docData.serverId || '', folder: docData.folder || '', cloudOnly: false, bytes: docData.bytes || JSON.stringify(docData).length };
  try {
    const db = await openReadingDb();
    await dbPut(db, LIB_STORE, docData);
    await dbPut(db, META_STORE, meta);
    db.close();
  } catch (error) {
    console.warn('书架保存失败', error);
    try { localStorage.setItem('reading-room-document-fallback', JSON.stringify(docData)); } catch (_) {}
  }
  renderShelf();
}
async function loadImportedDocument() {
  try {
    if (activeDocId) {
      const db = await openReadingDb();
      const doc = await dbGet(db, LIB_STORE, activeDocId); db.close();
      if (doc?.text) return doc;
    }
    const db = await openReadingDb();
    const legacy = await dbGet(db, DOC_STORE, 'current'); db.close();
    if (legacy?.text) {
      const id = genDocId();
      const doc = { ...legacy, id, source: 'file', kind: 'file', savedAt: Date.now() };
      const meta = { id, title: legacy.title || '已导入文章', source: 'file', kind: 'file', savedAt: doc.savedAt, characters: legacy.characters || legacy.text.length, images: legacy.images || 0, chunkCount: 0, doneCount: 0 };
      const wdb = await openReadingDb();
      await dbPut(wdb, LIB_STORE, doc); await dbPut(wdb, META_STORE, meta); wdb.close();
      activeDocId = id; localStorage.setItem('reading-room-active-doc', id);
      return doc;
    }
  } catch (error) { console.warn('书架读取失败', error); }
  try { return JSON.parse(localStorage.getItem('reading-room-document-fallback') || 'null'); } catch (_) { return null; }
}
async function updateDocMeta(id, patch) {
  try { const db = await openReadingDb(); const meta = await dbGet(db, META_STORE, id); if (meta) { Object.assign(meta, patch); await dbPut(db, META_STORE, meta); } db.close(); } catch (_) {}
}
async function deleteShelfDoc(id) {
  const wasActive = activeDocId === id;
  let serverId = '';
  try { const db = await openReadingDb(); const meta = await dbGet(db, META_STORE, id); if (meta?.serverId) serverId = meta.serverId; await dbDelete(db, LIB_STORE, id); await dbDelete(db, META_STORE, id); db.close(); } catch (_) {}
  clearDocProgress(id);
  if (serverId) api('./api/doc-delete', { method: 'POST', body: JSON.stringify({ did: serverId }) }).catch(() => {});
  if (wasActive) {
    activeDocId = ''; localStorage.removeItem('reading-room-active-doc');
    api('./api/document-delete', { method: 'POST' }).catch(() => {});
    await new Promise(r => setTimeout(r, 300));
  }
}
async function loadShelfMetas() { try { const db = await openReadingDb(); const metas = await dbAll(db, META_STORE); db.close(); return metas; } catch (_) { return []; } }
let shelfRenderSeq = 0;
async function renderShelf() {
  const seq = ++shelfRenderSeq;
  const metas = await loadShelfMetas();
  if (seq !== shelfRenderSeq) return;
  metas.sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
  const groups = new Map();
  for (const m of metas) { const k = m.folder || ''; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(m); }
  const folderNames = [...groups.keys()].sort((a, b) => (!a ? 1 : !b ? -1 : a.localeCompare(b, 'zh')));
  let collapsed = []; try { collapsed = JSON.parse(localStorage.getItem('reading-room-shelf-folders') || '[]'); } catch (_) {}
  const collapsedSet = new Set(collapsed);
  const emptyTip = '<div class="readlater-empty">书架还是空的。点右上角「导入」选一种导入方式。</div>';
  const itemHtml = m => {
    const progress = m.chunkCount ? Math.min(100, Math.round((m.doneCount || 0) / m.chunkCount * 100)) : 0;
    const date = new Date(m.savedAt || Date.now()).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
    const active = m.id === activeDocId;
    const size = m.bytes ? ` · ${(m.bytes / 1024).toFixed(0)}KB` : '';
    return `<div class="library-item shelf-item${active ? ' active' : ''}" data-id="${m.id}"><div class="item-kicker"><span class="kicker-label">${escapeHtml(kindLabels[m.kind] || '已导入文档')}${m.serverId ? `<i class="shelf-cloud${m.cloudOnly ? ' on' : ''}" data-cloud="${m.id}" title="${m.cloudOnly ? '仅保留云端副本，点此取回本机' : '本机与云端都有副本，点击仅保留云端'}">☁</i>` : ''}</span><button type="button" class="shelf-mini" data-folder-set="${m.id}" title="设置分类">${escapeHtml(m.folder || '分类')}</button><button type="button" class="shelf-remove" data-del="${m.id}" title="从书架移除">×</button></div><strong>${escapeHtml(m.title)}</strong><div class="item-meta"><span>${active ? Math.round((completed.size / sections.length) * 100) + '%' : progress + '%'}</span><span>${escapeHtml(date)}${size}</span></div><div class="progress-track"><span style="width:${progress}%"></span></div></div>`;
  };
  let html = metas.length ? folderNames.map(name => {
    const list = groups.get(name);
    const isCol = collapsedSet.has(name);
    return `<div class="shelf-folder${isCol ? ' collapsed' : ''}" data-folder="${escapeHtml(name)}"><button type="button" class="shelf-folder-head" data-fold="${escapeHtml(name)}"><span>${escapeHtml(name || '未分类')}</span><span class="shelf-folder-count">${list.length}</span><span class="toc-caret" aria-hidden="true">▾</span></button>${isCol ? '' : list.map(itemHtml).join('')}</div>`;
  }).join('') : emptyTip;
  ['shelfList', 'shelfDialogList'].forEach(elId => { const el = document.getElementById(elId); if (el) el.innerHTML = html; });
  document.querySelectorAll('.shelf-folder-head').forEach(head => head.addEventListener('click', () => {
    const name = head.dataset.fold;
    const set = new Set(collapsed);
    if (set.has(name)) set.delete(name); else set.add(name);
    localStorage.setItem('reading-room-shelf-folders', JSON.stringify([...set]));
    renderShelf();
  }));
  document.querySelectorAll('.shelf-item').forEach(item => item.addEventListener('click', event => {
    const del = event.target.closest('[data-del]');
    if (del) { event.stopPropagation(); handleShelfDelete(del.dataset.del, del); return; }
    const cloud = event.target.closest('[data-cloud]');
    if (cloud) { event.stopPropagation(); toggleCloudOnly(cloud.dataset.cloud); return; }
    const fold = event.target.closest('[data-folder-set]');
    if (fold) { event.stopPropagation(); openFolderDialog(fold.dataset.folderSet); return; }
    openShelfDoc(item.dataset.id);
  }));
}
async function toggleCloudOnly(id) {
  try {
    const db = await openReadingDb();
    const meta = await dbGet(db, META_STORE, id);
    if (!meta?.serverId) { db.close(); return; }
    if (!meta.cloudOnly) {
      await dbDelete(db, LIB_STORE, id);
      meta.cloudOnly = true;
      await dbPut(db, META_STORE, meta);
      db.close();
      setResponse('已切换为仅云端', `《${meta.title}》本机副本已清除，打开时从服务端拉取。`);
    } else {
      db.close();
      const remote = await api('./api/doc-load?did=' + encodeURIComponent(meta.serverId));
      if (!remote.document) throw new Error('服务端副本已不存在');
      const db2 = await openReadingDb();
      await dbPut(db2, LIB_STORE, { ...remote.document, id, serverId: meta.serverId });
      meta.cloudOnly = false;
      await dbPut(db2, META_STORE, meta);
      db2.close();
      setResponse('已取回本机', `《${meta.title}》已从服务端恢复本地副本。`);
    }
  } catch (error) { setResponse('云端副本操作失败', error.message); }
  renderShelf();
}
let folderTargetId = '';
async function openFolderDialog(id) {
  folderTargetId = id;
  const metas = await loadShelfMetas();
  const meta = metas.find(m => m.id === id);
  const names = [...new Set(metas.map(m => m.folder).filter(Boolean))];
  const input = document.getElementById('folderName');
  const list = document.getElementById('folderOptions');
  if (input) input.value = meta?.folder || '';
  if (list) list.innerHTML = names.map(n => `<option value="${escapeHtml(n)}">`).join('');
  const dlg = document.getElementById('folderDialog');
  if (dlg) { if (typeof dlg.showModal === 'function') dlg.showModal(); else { dlg.classList.add('fallback-open'); dlg.setAttribute('open', ''); } }
}
let shelfDeleteArmed = '';
async function handleShelfDelete(id, btn) {
  if (shelfDeleteArmed !== id) {
    shelfDeleteArmed = id;
    btn.textContent = '确认删除'; btn.classList.add('armed');
    setTimeout(() => { if (shelfDeleteArmed === id) { shelfDeleteArmed = ''; renderShelf(); } }, 2500);
    return;
  }
  const wasActive = id === activeDocId;
  await deleteShelfDoc(id);
  shelfDeleteArmed = '';
  if (wasActive) { location.reload(); return; }
  renderShelf();
  setResponse('已从书架移除', '文章已删除，重新导入即可找回。');
}
async function openShelfDoc(id) {
  try {
    const db = await openReadingDb();
    let doc = await dbGet(db, LIB_STORE, id); db.close();
    if (!doc?.text) {
      const meta = (await loadShelfMetas()).find(m => m.id === id);
      if (meta?.serverId) {
        const remote = await api('./api/doc-load?did=' + encodeURIComponent(meta.serverId));
        if (remote.document) doc = { ...remote.document, id, serverId: meta.serverId };
      }
    }
    if (!doc?.text) throw new Error('本机与云端都没有内容，请重新导入');
    closeShelfDialog();
    restoreDocument(doc);
    setResponse('已打开', `《${doc.title}》· 进度已恢复。`);
  } catch (error) { setResponse('打不开这一篇', error.message); }
}
function buildChunks(allBlocks) {
  const chunks = [];
  const CHUNK_MAX = 1500;
  let pendingImage = null;
  let pendingHeads = [];
  let bodyBuf = '';
  const isTocEntry = t => { const s = String(t || '').trim(); return /\.{4,}/.test(s) || (/^[§第部卷篇章ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩ]/.test(s) && s.length < 40 && /\d+\s*$/.test(s)); };
  const cleanToc = t => t.replace(/\.{4,}/g, ' ').replace(/[ \t]+/g, ' ').trim();
  let tocBuf = [];
  const pushText = (text) => {
    const clean = String(text || '').trim();
    if (!clean) return;
    const blocks = [];
    if (pendingImage) { blocks.push(pendingImage); pendingImage = null; }
    while (pendingHeads.length) blocks.push(pendingHeads.shift());
    blocks.push({ type: 'text', text: clean });
    chunks.push({ blocks, paragraphs: [clean] });
  };
  const cutBody = () => {
    while (bodyBuf.length >= CHUNK_MAX) {
      const window = bodyBuf.slice(0, CHUNK_MAX + 50);
      let cut = -1;
      for (const sep of '。！？；!?;') {
        const i = window.lastIndexOf(sep);
        if (i > cut) cut = i;
      }
      if (cut >= CHUNK_MAX - 250) {
        pushText(bodyBuf.slice(0, cut + 1));
        bodyBuf = bodyBuf.slice(cut + 1).replace(/^\s+/, '');
      } else {
        pushText(bodyBuf.slice(0, CHUNK_MAX));
        bodyBuf = bodyBuf.slice(CHUNK_MAX);
      }
    }
  };
  const flushBody = () => { if (bodyBuf.trim()) { pushText(bodyBuf); bodyBuf = ''; } };
  const flushToc = () => { if (tocBuf.length) { pushText(tocBuf.join('\n')); tocBuf = []; } };
  for (const block of allBlocks) {
    if (block.type === 'image') { flushToc(); flushBody(); pendingImage = block; continue; }
    const text = String(block.text || '');
    if (!text.trim()) continue;
    if (/^\s*\d+\s*$/.test(text)) continue;
    if (isTocEntry(text)) {
      flushBody();
      for (const line of text.split('\n')) {
        const cleaned = cleanToc(line);
        if (!cleaned) continue;
        tocBuf.push(cleaned);
        if (tocBuf.join('\n').length >= CHUNK_MAX) flushToc();
      }
      continue;
    }
    flushToc();
    if (/^[”’]\s*\d{1,3}\s*$/.test(text.trim())) continue;
    if (block.heading) { flushBody(); pendingHeads.push(block); continue; }
    bodyBuf += (bodyBuf ? '\n\n' : '') + text;
    cutBody();
  }
  flushToc();
  flushBody();
  while (pendingHeads.length) { const h = pendingHeads.shift(); chunks.push({ blocks: [h], paragraphs: [h.text] }); }
  if (pendingImage) chunks.push({ blocks: [pendingImage], paragraphs: [] });
  if (!chunks.length) chunks.push({ blocks: [], paragraphs: [] });
  return chunks;
}
function restoreDocument(data) {
  if (!data?.text) return false;
  const title = data.title || '已导入文章';
  document.getElementById('articleTitle').textContent = title;
  document.getElementById('eyebrow').textContent = data.kind === 'article' ? '公众号文章 · 伴读模式' : data.kind === 'link' ? '网页文章 · 伴读模式' : '已导入 · 伴读模式';
  if (data.id) { activeDocId = data.id; localStorage.setItem('reading-room-active-doc', data.id); }
  fullArticleText = data.text;
  const dekEl = document.getElementById('articleDek');
  dekEl.textContent = ''; dekEl.style.display = 'none';
  const allBlocks = data.blocks?.length ? data.blocks : data.text.split(/\n\s*\n/).filter(Boolean).map(text => ({type:'text', text}));
  const importedSections = buildChunks(allBlocks).map((chunk, i) => ({ label: `第 ${i + 1} 块`, title, blocks: chunk.blocks, paragraphs: chunk.paragraphs, quote: '' }));
  sections.splice(0, sections.length, ...importedSections);
  const prog = data.id ? loadDocProgress(data.id) : null;
  current = Math.min(prog?.current || 0, importedSections.length - 1);
  completed = new Set((prog?.done || []).filter(i => i >= 0 && i < importedSections.length));
  recallNotes.length = 0; render(); renderRecallNotes();
  if (data.id) updateDocMeta(data.id, { chunkCount: importedSections.length, doneCount: completed.size });
  const chars = data.characters || data.text.length;
  const minutes = Math.max(1, Math.round(chars / 400));
  document.getElementById('articleMetaTime').textContent = `约 ${minutes} 分钟`;
  document.getElementById('articleMetaSections').textContent = `${sections.length} 块`;
  return true;
}
const body = document.getElementById('articleBody');
const sectionLabel = document.getElementById('sectionLabel');
const footerProgress = document.getElementById('footerProgress');
const shelfDialog = document.getElementById('shelfDialog');
function closeShelfDialog() { if (typeof shelfDialog.close === 'function' && shelfDialog.open) shelfDialog.close(); else shelfDialog.classList.remove('fallback-open'); }
document.getElementById('shelfClose').addEventListener('click', closeShelfDialog);
const readState = document.getElementById('readState');
const response = document.getElementById('coachResponse');
const note = document.getElementById('sessionNote');
const tocToggle = document.getElementById('tocToggle');
const tocList = document.getElementById('tocList');

function renderRecallNotes() {
  if (!recallNotes.length) { note.innerHTML = '本次阅读还没有留下笔记'; return; }
  note.innerHTML = recallNotes.map(n => `<div class="recall-note"><span class="rn-meta">${escapeHtml(n.sectionLabel)} · ${escapeHtml(n.time)}</span><p>${escapeHtml(n.text.length > 60 ? n.text.slice(0, 60) + '…' : n.text)}</p></div>`).join('');
}

function render() {
  const section = sections[current];
  sectionLabel.textContent = section.label;
  const contentHtml = section.blocks ? section.blocks.map(block => block.type === 'image' ? `<figure class="article-image"><img src="${escapeHtml(block.src)}" alt="${escapeHtml(block.alt || '文中配图')}" decoding="async"><figcaption>${escapeHtml(block.alt || '文中配图')}</figcaption></figure>` : block.heading ? `<h4 class="doc-h${block.heading}">${escapeHtml(block.text)}</h4>` : String(block.text || '').split(/\n\s*\n/).filter(Boolean).map(p => `<p>${escapeHtml(p).replace(/\n/g, '<br>')}</p>`).join('')).join('') : section.paragraphs.map(p => `<p>${escapeHtml(p)}</p>`).join('');
  body.innerHTML = `<h3>${escapeHtml(section.label)}</h3>${contentHtml}${section.quote ? `<div class="pullquote">${escapeHtml(section.quote)}</div>` : ''}`;
  body.querySelectorAll('.article-image img').forEach(img => {
    const src = img.getAttribute('src') || '';
    if (/^data:/i.test(src)) img.addEventListener('error', () => img.closest('.article-image').classList.add('img-failed'));
    else hydrateImage(img, src);
  });
  const isMobileViewport = window.matchMedia('(max-width: 700px)').matches;
  if (isMobileViewport) window.scrollTo({ top: 0, behavior: 'auto' });
  else body.scrollTop = 0;
  const progress = Math.round((completed.size / sections.length) * 100);
  footerProgress.textContent = completed.has(current) ? `这一块已读完 · 总进度 ${progress}%` : `读到 ${progress}%`;
  readState.textContent = completed.size === 0 ? '刚开始' : completed.size === sections.length ? '已读完' : `已读 ${completed.size} 块`;
  const nextButton = document.getElementById('nextSection');
  if (nextButton) nextButton.textContent = current === sections.length - 1 ? '✓ 标记读完' : '下一块 →';
  const prevButton = document.getElementById('prevSection');
  if (prevButton) prevButton.disabled = current === 0;
  renderToc();
  if (activeDocId) {
    const sig = `${current}:${completed.size}:${sections.length}`;
    if (sig !== lastSavedProgress) {
      lastSavedProgress = sig;
      saveDocProgress(activeDocId, current, completed);
      updateDocMeta(activeDocId, { chunkCount: sections.length, doneCount: completed.size });
      renderShelf();
    }
  }
}

function renderToc() {
  if (!tocList) return;
  tocList.innerHTML = sections.map((s, i) => {
    const preview = s.paragraphs && s.paragraphs.length ? s.paragraphs[0].replace(/\s+/g, '').slice(0, 16) : '配图';
    const active = i === current ? ' active' : '';
    return `<button type="button" class="toc-item${active}" data-index="${i}"><span class="toc-num">${i + 1}</span><span class="toc-preview">${escapeHtml(preview)}</span></button>`;
  }).join('');
}

tocToggle.addEventListener('click', () => {
  const expanded = tocList.hidden;
  tocList.hidden = !expanded;
  tocToggle.setAttribute('aria-expanded', String(expanded));
  tocToggle.querySelector('.toc-caret').textContent = expanded ? '▾' : '▸';
});

tocList.addEventListener('click', (event) => {
  const item = event.target.closest('.toc-item');
  if (!item) return;
  current = Number(item.dataset.index);
  render();
  const articleBody = document.getElementById('articleBody');
  if (articleBody) articleBody.scrollTop = 0;
});

// 配图用 fetch + 会话头加载成 blob，绕开安卓 WebView 的防盗链/缓存/加载中断问题
async function hydrateImage(img, src, viaProxy = false) {
  const fig = () => img.closest('.article-image');
  try {
    const res = await fetch(src, { headers: apiHeaders });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const blob = await res.blob();
    if (!/^image\//i.test(blob.type)) throw new Error('返回内容不是图片');
    img.src = URL.createObjectURL(blob);
  } catch (err) {
    if (!viaProxy && /^https?:/i.test(src)) return hydrateImage(img, `./api/image-proxy?u=${encodeURIComponent(src)}&sid=${sessionId}&k=${docSecret}`, true);
    if (!viaProxy && img.dataset.retried !== '1') { img.dataset.retried = '1'; return hydrateImage(img, src + (src.includes('?') ? '&' : '?') + 'r=1'); }
    fig().classList.add('img-failed');
    const cap = fig().querySelector('figcaption');
    if (cap) cap.textContent = `配图加载失败（${err.message}）· 点图重试`;
    fig().onclick = () => { fig().classList.remove('img-failed'); delete img.dataset.retried; hydrateImage(img, src); };
  }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
}

function renderInlineMarkdown(value) {
  return escapeHtml(value)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/__([^_]+)__/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>');
}

function renderMarkdown(value) {
  const lines = String(value || '').replace(/\r/g, '').split('\n');
  const output = [];
  let listType = '';
  const closeList = () => { if (listType) output.push(`</${listType}>`); listType = ''; };
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) { closeList(); continue; }
    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    const unordered = line.match(/^[-*]\s+(.+)$/);
    const ordered = line.match(/^\d+[.)]\s+(.+)$/);
    if (heading) { closeList(); output.push(`<h${heading[1].length + 2}>${renderInlineMarkdown(heading[2])}</h${heading[1].length + 2}>`); continue; }
    if (unordered || ordered) {
      const nextType = unordered ? 'ul' : 'ol';
      if (listType !== nextType) { closeList(); listType = nextType; output.push(`<${listType}>`); }
      output.push(`<li>${renderInlineMarkdown((unordered || ordered)[1])}</li>`);
      continue;
    }
    closeList();
    output.push(`<p>${renderInlineMarkdown(line)}</p>`);
  }
  closeList();
  return output.join('');
}

function setResponse(title, text) {
  response.innerHTML = `<div class="response-label">${escapeHtml(title)}</div><div class="response-content">${renderMarkdown(text)}</div>`;
}

function setActivePrompt(button, busy = false) {
  document.querySelectorAll('.prompt-card').forEach(card => {
    const selected = card === button;
    card.classList.toggle('selected', selected);
    card.classList.toggle('busy', selected && busy);
    card.setAttribute('aria-pressed', String(selected));
  });
}

async function askCompanion(action, selection = '', selectionQuestion = '') {
  const section = sections[current];
  const mode = getActiveMode();
  const modePrompt = mode ? `【伴读模式：${mode.name}】\n${mode.prompt}\n\n` : '';
  const actionText = selection ? `读者划线选中了下面这段文字，并提出问题：“${selectionQuestion}”。请立足划线原文和当前章节直接回答；如果原文不足以支持答案，明确指出，不要脱离原文扩写。` : action === 'explain' ? '解释这一节在说什么，不剧透全文。' : action === 'question' ? '给我一个需要读者自己思考的阅读问题，不要直接给答案。' : action === 'summary' ? '这是读者主动请求的读后梳理。请给出：1. 全文要解决的核心问题；2. 论证推进的三到五步；3. 最重要的证据；4. 一个可能的漏洞或待验证之处。不要写成泛泛摘要，不要替读者下最终结论。' : '帮我找出这一节一个可能的漏洞或未经证明的跳跃，并说明为什么。';
  const sourceText = selection || (action === 'summary' ? fullArticleText : section.paragraphs.join('\n\n'));
  const sourceLabel = selection ? `划线原文（来自${section.label}）` : action === 'summary' ? '全文' : `当前章节：${section.label}`;
  setResponse(selection ? '正在回答划线内容' : action === 'summary' ? '正在梳理全文' : '伴读处理中', '模型正在阅读，请稍等。');
  try {
    const data = await api('./api/companion', {method:'POST', body: JSON.stringify({prompt: `${modePrompt}${actionText}\n\n${sourceLabel}\n\n正文：${sourceText}`})});
    setResponse(`${data.provider} · ${selection ? '划线提问' : action === 'summary' ? '全文梳理' : '伴读回应'}`, data.answer);
  } catch (error) {
    setResponse('模型调用失败', error.message);
  }
}


document.getElementById('prevSection').addEventListener('click', () => { current = Math.max(0, current - 1); render(); });
document.getElementById('nextSection').addEventListener('click', () => {
  completed.add(current);
  if (current < sections.length - 1) current += 1;
  render();
});

document.querySelectorAll('.prompt-card').forEach(button => button.addEventListener('click', async () => {
  const action = button.dataset.action;
  setActivePrompt(button, document.body.dataset.modelConfigured === 'true');
  if (document.body.dataset.modelConfigured === 'true') {
    await askCompanion(action);
    button.classList.remove('busy');
    return;
  }
  if (action === 'summary') { setResponse('先配置模型', '全文梳理需要真实模型。请先点右上角“模型设置”，保存 API key。'); return; }
  setResponse('先配置模型', '伴读需要接入模型，才能围绕你当前的文章回答。请先点右上角“模型设置”，保存 API key。');
}));

const selectionAsk = document.getElementById('selectionAsk');
const selectionPreview = document.getElementById('selectionPreview');
const selectionQuestion = document.getElementById('selectionQuestion');
let selectedPassage = '';

function hideSelectionAsk() {
  selectionAsk.hidden = true;
}

function updateSelectionAsk() {
  const selection = window.getSelection();
  const text = selection ? selection.toString().trim() : '';
  if (!selection || selection.rangeCount === 0 || text.length < 2 || !body.contains(selection.anchorNode) || !body.contains(selection.focusNode)) {
    hideSelectionAsk();
    return;
  }
  selectedPassage = text.slice(0, 3000);
  selectionPreview.textContent = selectedPassage.length > 24 ? `${selectedPassage.slice(0, 24)}…` : selectedPassage;
  const rect = selection.getRangeAt(0).getBoundingClientRect();
  selectionAsk.style.left = `${Math.min(window.innerWidth - 12, Math.max(12, rect.left + rect.width / 2))}px`;
  selectionAsk.style.top = `${Math.max(12, rect.top - 12)}px`;
  selectionAsk.hidden = false;
}

body.addEventListener('pointerup', () => setTimeout(updateSelectionAsk, 0));
body.addEventListener('keyup', updateSelectionAsk);

// 手机端：长按整段选中（原生划词已在跑就不抢）
let lpTimer = null, lpPoint = null, lpTarget = null;
body.addEventListener('touchstart', event => {
  if (event.touches.length !== 1) return;
  const target = event.target.closest('p, .pullquote, .article-image figcaption');
  if (!target) return;
  lpPoint = { x: event.touches[0].clientX, y: event.touches[0].clientY };
  lpTarget = target;
  lpTimer = setTimeout(() => {
    lpTimer = null;
    const sel = window.getSelection();
    if (sel && !sel.isCollapsed) return;
    const range = document.createRange();
    range.selectNodeContents(lpTarget);
    sel.removeAllRanges(); sel.addRange(range);
    updateSelectionAsk();
  }, 450);
}, { passive: true });
body.addEventListener('touchmove', event => {
  if (!lpTimer || !lpPoint) return;
  const t = event.touches[0];
  if (Math.abs(t.clientX - lpPoint.x) > 12 || Math.abs(t.clientY - lpPoint.y) > 12) { clearTimeout(lpTimer); lpTimer = null; }
}, { passive: true });
['touchend', 'touchcancel'].forEach(type => body.addEventListener(type, () => { if (lpTimer) { clearTimeout(lpTimer); lpTimer = null; } }, { passive: true }));

// 手机原生划词也能唤起提问条（iOS 划词结束不一定触发 pointerup）
let scTimer = null;
document.addEventListener('selectionchange', () => {
  clearTimeout(scTimer);
  scTimer = setTimeout(() => {
    const askFocused = selectionAsk.contains(document.activeElement);
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) { if (!askFocused && !selectionAsk.hidden) hideSelectionAsk(); return; }
    if (selectionAsk.contains(sel.anchorNode)) return;
    if (!body.contains(sel.anchorNode) || !body.contains(sel.focusNode)) { if (!askFocused && !selectionAsk.hidden) hideSelectionAsk(); return; }
    updateSelectionAsk();
  }, 200);
});
document.addEventListener('pointerdown', event => { if (!selectionAsk.contains(event.target) && !body.contains(event.target)) hideSelectionAsk(); });
document.getElementById('askSelection').addEventListener('click', submitSelectionQuestion);
selectionQuestion.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); submitSelectionQuestion(); } });

async function submitSelectionQuestion() {
  const question = selectionQuestion.value.trim();
  if (!selectedPassage) return;
  if (!question) { selectionQuestion.focus(); return; }
  hideSelectionAsk();
  selectionQuestion.value = '';
  if (document.body.dataset.modelConfigured !== 'true') {
    setResponse('先配置模型', '划线提问需要真实模型。请先点右上角“模型设置”，保存 API key。');
    return;
  }
  setActivePrompt(null);
  await askCompanion('selection', selectedPassage, question);
}

// 划线分享卡片
const shareDialog = document.getElementById('shareDialog');
const shareCardImg = document.getElementById('shareCardImg');
let shareCardDataUrl = '';
function wrapText(text, charsPerLine) {
  const lines = []; let cur = '';
  for (const ch of text) { if (cur.length >= charsPerLine) { lines.push(cur); cur = ''; } cur += ch; }
  if (cur) lines.push(cur);
  return lines.length ? lines : [''];
}
function buildShareCard(text, title) {
  return new Promise(resolve => {
    const W = 750, padX = 60, padTop = 54, padBottom = 48;
    const excerpt = text.length > 140 ? text.slice(0, 140) + '……' : text;
    const textLines = wrapText(excerpt, 14);
    const shortTitle = title.length > 18 ? title.slice(0, 18) + '…' : title;
    const textSize = 40, textLineH = 62, titleSize = 24;
    const brandH = 32, gap = 46;
    const textBlockH = textLines.length * textLineH;
    const H = padTop + brandH + gap + textBlockH + 14 + titleSize + 14 + 34 + padBottom;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#fbfaf7'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#c45c36'; ctx.fillRect(padX, padTop, 4, 28);
    ctx.font = '600 24px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif';
    ctx.fillText('云阅', padX + 16, padTop + 2);
    ctx.fillStyle = '#252522';
    ctx.font = `500 ${textSize}px Georgia, "Songti SC", serif`;
    let y = padTop + brandH + gap;
    textLines.forEach(line => { ctx.fillText(line, padX, y); y += textLineH; });
    y += 14;
    ctx.fillStyle = '#898982';
    ctx.font = `400 ${titleSize}px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif`;
    ctx.fillText(`—— 《${shortTitle}》`, padX, y);
    const footerTop = H - padBottom - 6;
    ctx.strokeStyle = '#deddd6'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(padX, footerTop); ctx.lineTo(W - padX, footerTop); ctx.stroke();
    ctx.fillStyle = '#c45c36';
    ctx.font = '400 22px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif';
    ctx.fillText('云阅 · 长文伴读', padX, footerTop + 18);
    resolve(canvas.toDataURL('image/png'));
  });
}
document.getElementById('shareSelection').addEventListener('click', async () => {
  if (!selectedPassage) return;
  const title = document.getElementById('articleTitle').textContent;
  hideSelectionAsk();
  shareCardDataUrl = await buildShareCard(selectedPassage, title);
  shareCardImg.src = shareCardDataUrl;
  if (typeof shareDialog.showModal === 'function') shareDialog.showModal();
  else { shareDialog.classList.add('fallback-open'); shareDialog.setAttribute('open', ''); }
});
document.getElementById('shareClose').addEventListener('click', () => { if (typeof shareDialog.close === 'function') shareDialog.close(); else shareDialog.classList.remove('fallback-open'); });
document.getElementById('downloadShare').addEventListener('click', () => {
  const a = document.createElement('a');
  a.href = shareCardDataUrl;
  a.download = '云阅分享.png';
  a.click();
});
document.getElementById('copyShareText').addEventListener('click', async () => {
  const title = document.getElementById('articleTitle').textContent;
  const text = `「${selectedPassage}」\n—— 来自《${title}》· 云阅`;
  try { await navigator.clipboard.writeText(text); setResponse('已复制', '划线内容已复制，去微信、QQ 粘贴即可。'); }
  catch (_) { setResponse('复制失败', '请用「保存图片」后手动分享。'); }
});
document.getElementById('webShare').addEventListener('click', async () => {
  const title = document.getElementById('articleTitle').textContent;
  const text = `「${selectedPassage}」\n—— 来自《${title}》· 云阅`;
  try {
    const blob = await (await fetch(shareCardDataUrl)).blob();
    const file = new File([blob], '云阅分享.png', { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) await navigator.share({ files: [file], title: '云阅分享', text });
    else if (navigator.share) await navigator.share({ title: '云阅分享', text });
    else throw new Error('not supported');
  } catch (e) { if (e.name !== 'AbortError') setResponse('无法唤起分享', '当前浏览器不支持系统分享，请用「保存图片」后手动分享。'); }
});

document.getElementById('checkRecall').addEventListener('click', () => {
  const text = document.getElementById('recallInput').value.trim();
  if (!text) { setResponse('先写两句', '用自己的话说说，作者这一节最想说的是什么。'); return; }
  setResponse('已记录', '');
  recallNotes.push({ sectionLabel: sections[current].label, text, time: new Date().toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'}) });
  renderRecallNotes();
  document.getElementById('recallInput').value = '';
});

document.getElementById('focusMode').addEventListener('click', () => {
  const isDark = document.body.classList.contains('dark-mode');
  if (isDark) applySkin(chosenSkin.name, chosenSkin.custom, true);
  else applySkin('ink', null, false);
});
const importArticleBtn = document.getElementById('importArticle');
if (importArticleBtn) importArticleBtn.addEventListener('click', () => document.getElementById('fileInput').click());
let pdfjsPromise = null;
function loadPdfJs() { const v = '4.6.82'; return (pdfjsPromise ||= import(`https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${v}/pdf.min.mjs`).then(m => { m.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${v}/pdf.worker.min.mjs`; return m; })); }
function loadScript(src) { return new Promise((resolve, reject) => { const s = document.createElement('script'); s.src = src; s.onload = resolve; s.onerror = () => reject(new Error('解析组件加载失败，请检查网络后重试')); document.head.appendChild(s); }); }
function shrinkDataUrl(dataUrl, maxW = 1400) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      try {
        const scale = Math.min(1, maxW / img.naturalWidth);
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.naturalWidth * scale)); canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
        const ctx = canvas.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', .82));
      } catch (_) { resolve(dataUrl); }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}
async function extractPdfImage(page, name) {
  const draw = obj => {
    if (!obj) return null;
    const width = obj.width || (obj.bitmap && obj.bitmap.width), height = obj.height || (obj.bitmap && obj.bitmap.height);
    if (!width || width < 120 || height < 90) return null;
    const scale = Math.min(1, 1400 / width);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(width * scale); canvas.height = Math.round(height * scale);
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (obj.bitmap) { ctx.drawImage(obj.bitmap, 0, 0, canvas.width, canvas.height); return canvas.toDataURL('image/jpeg', .82); }
    const comp = obj.data.length === width * height ? 1 : obj.data.length === width * height * 3 ? 3 : obj.data.length === width * height * 4 ? 4 : 0;
    if (!comp) return null;
    const rgb = ctx.createImageData(width, height);
    for (let i = 0; i < width * height; i++) { const s = i * comp; rgb.data[i * 4] = obj.data[s]; rgb.data[i * 4 + 1] = obj.data[s + Math.min(1, comp - 1)]; rgb.data[i * 4 + 2] = obj.data[s + Math.min(2, comp - 1)]; rgb.data[i * 4 + 3] = 255; }
    ctx.putImageData(rgb, 0, 0); return canvas.toDataURL('image/jpeg', .82);
  };
  return new Promise(resolve => {
    let tries = 0;
    const check = () => { try { const r = draw(page.objs.get(name)); if (r !== null || ++tries > 30) resolve(r); else setTimeout(check, 40); } catch (_) { if (++tries > 30) resolve(null); else setTimeout(check, 40); } };
    check();
  }).then(url => url);
}
async function parsePdfFile(file, onProgress, signal) {
  setResponse('正在导入', 'PDF 解析中…');
  const throwIfAborted = () => { if (signal?.aborted) throw new DOMException('已取消', 'AbortError'); };
  const pdfjs = await loadPdfJs();
  throwIfAborted();
  const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  throwIfAborted();
  const pageCount = Math.min(pdf.numPages, 120);
  const CONCURRENCY = 4;
  const MAX_IMAGES = 30;
  const results = new Array(pageCount);
  let nextPage = 0;
  let donePages = 0;
  let imageCount = 0;

  async function processPage(p) {
    throwIfAborted();
    const page = await pdf.getPage(p);
    const pageBlocks = [];
    const content = await page.getTextContent();
    const lines = [];
    for (const item of content.items) {
      const str = item.str;
      if (!str || !str.trim()) continue;
      const y = item.transform[5];
      const size = Math.abs(item.transform[3]) || Math.hypot(item.transform[0], item.transform[1]) || 10;
      const last = lines[lines.length - 1];
      if (last && Math.abs(y - last.y) < 3) { last.text += str; last.size = Math.max(last.size, size); if (item.fontName) last.fontName = item.fontName; }
      else lines.push({ y, text: str, size, fontName: item.fontName || '' });
    }
    const lineSizes = lines.map(l => l.size).sort((a, b) => a - b);
    const bodySize = lineSizes.length ? lineSizes[Math.floor(lineSizes.length / 2)] : 10;
    const fontCount = {};
    for (const l of lines) { fontCount[l.fontName] = (fontCount[l.fontName] || 0) + l.text.length; }
    const bodyFont = Object.entries(fontCount).sort((a, b) => b[1] - a[1])[0]?.[0] || '';
    const gaps = [];
    for (let i = 1; i < lines.length; i++) gaps.push(Math.abs(lines[i].y - lines[i - 1].y));
    gaps.sort((a, b) => a - b);
    const lineHeight = gaps.length ? gaps[Math.floor(gaps.length / 2)] : 12;
    const paraGap = Math.max(lineHeight * 1.5, 10);
    const needSpace = (prev, next) => /[A-Za-z0-9]$/.test(prev) && /^[A-Za-z0-9]/.test(next);
    const isSentenceEnd = t => /[。！？…」』”’）】〗]$/.test(t) || /[.!?]$/.test(t);
    const isTocLine = t => /\.{4,}/.test(t);
    let paragraph = [];
    const flush = () => {
      if (!paragraph.length) return;
      const linesInPara = paragraph.slice();
      paragraph = [];
      let text = '';
      for (let i = 0; i < linesInPara.length; i++) {
        if (i > 0) {
          if (isTocLine(linesInPara[i - 1].text) && isTocLine(linesInPara[i].text)) text += '\n';
          else if (needSpace(linesInPara[i - 1].text, linesInPara[i].text)) text += ' ';
        }
        text += linesInPara[i].text;
      }
      const cleaned = text.trim();
      if (!cleaned) return;
      const headLike = s => s.length <= 60 && !/[。；;，,！””]$/.test(s);
      const allHead = linesInPara.every(l => l.size >= bodySize * 1.3 || (l.fontName && l.fontName !== bodyFont)) && headLike(cleaned) && cleaned.length >= 2;
      if (allHead) pageBlocks.push({ type: 'text', text: cleaned, heading: linesInPara[0].size >= bodySize * 1.6 ? 2 : 3 });
      else pageBlocks.push({ type: 'text', text: cleaned });
    };
    for (let i = 0; i < lines.length; i++) {
      const lineText = lines[i].text.trim();
      const isHeadLine = lineText.length >= 2 && lineText.length <= 60 && !/[。；;，,！””]$/.test(lineText) && (lines[i].size >= bodySize * 1.3 || (lines[i].fontName && lines[i].fontName !== bodyFont));
      if (isHeadLine) { flush(); paragraph.push(lines[i]); flush(); continue; }
      paragraph.push(lines[i]);
      const gap = i + 1 < lines.length ? Math.abs(lines[i + 1].y - lines[i].y) : 0;
      if (gap > paraGap) flush();
    }
    flush();
    if (/^\s*\d+\s*$/.test(pageBlocks[pageBlocks.length - 1]?.text || '')) pageBlocks.pop();
    const ops = await page.getOperatorList();
    const seen = new Set();
    for (let i = 0; i < ops.fnArray.length; i++) {
      const fn = ops.fnArray[i];
      if (fn !== pdfjs.OPS.paintImageXObject && fn !== pdfjs.OPS.paintImageXObjectRepeat) continue;
      const name = String(ops.argsArray[i][0]);
      if (seen.has(name) || name === 'g_' || name.startsWith('g_')) continue; seen.add(name);
      if (imageCount >= MAX_IMAGES) break;
      const dataUrl = await extractPdfImage(page, name);
      if (dataUrl) { pageBlocks.push({ type: 'image', src: dataUrl, alt: `第 ${p} 页配图` }); imageCount += 1; }
    }
    page.cleanup?.();
    throwIfAborted();
    return pageBlocks;
  }

  async function worker() {
    while (nextPage < pageCount) {
      throwIfAborted();
      const p = nextPage++;
      results[p] = await processPage(p + 1);
      donePages += 1;
      onProgress?.(Math.round((donePages / pageCount) * 90), `解析 PDF · ${donePages}/${pageCount} 页 · 已提取配图 ${imageCount} 张`);
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, pageCount) }, () => worker()));
  const blocks = [];
  results.forEach(pageBlocks => blocks.push(...pageBlocks));
  return blocks;
}
async function parseDocxFile(file) {
  if (!window.mammoth) await loadScript('https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.8.0/mammoth.browser.min.js');
  const result = await window.mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() });
  const dom = new DOMParser().parseFromString(result.value, 'text/html');
  const blocks = [];
  dom.querySelectorAll('img').forEach(img => { const src = img.getAttribute('src') || ''; if (/^data:image\//.test(src)) blocks.push({ type: '__img__', src, alt: img.getAttribute('alt') || '' }); img.remove(); });
  const texts = [...dom.body.children].map(el => {
    const tag = el.tagName.toLowerCase();
    if (/^(p|h[1-6]|blockquote|pre|div)$/.test(tag)) return el.textContent.trim();
    if (/^(ul|ol)$/.test(tag)) return [...el.querySelectorAll('li')].map(li => li.textContent.trim()).filter(Boolean).join('\n');
    if (tag === 'table') return [...el.querySelectorAll('tr')].map(tr => [...tr.querySelectorAll('td,th')].map(td => td.textContent.trim()).join('　')).filter(Boolean).join('\n');
    return el.textContent.trim();
  });
  const finalBlocks = []; let textQueue = 0;
  const pushText = t => { if (!t) return; finalBlocks.push({ type: 'text', text: t }); };
  const mergedTexts = texts.flatMap(t => t.split(/\n{2,}/)).map(t => t.trim()).filter(Boolean);
  const imageSlots = blocks.splice(0);
  mergedTexts.forEach(t => { finalBlocks.push({ type: 'text', text: t }); });
  imageSlots.forEach((slot, idx) => { const at = Math.min(finalBlocks.length, idx + 1); finalBlocks.splice(at, 0, { type: 'image', src: slot.src, alt: slot.alt || '文中配图' }); });
  const docImages = finalBlocks.filter(b => b.type === 'image' && /^data:image\//.test(b.src));
  await Promise.all(docImages.map(async b => { b.src = await shrinkDataUrl(b.src); }));
  return finalBlocks.slice(0, 800);
}
async function parseMarkdownFile(text) {
  const blocks = [];
  for (const chunk of text.split(/\n\s*\n/)) {
    const trimmed = chunk.trim(); if (!trimmed) continue;
    const lines = trimmed.split('\n'); let buffer = [];
    for (const line of lines) {
      const m = /^!\[([^\]]*)\]\(([^)]+)\)\s*$/.exec(line.trim());
      if (m) { if (buffer.length) { blocks.push({ type: 'text', text: buffer.join('\n').trim() }); buffer = []; } blocks.push({ type: 'image', src: m[2], alt: m[1] || '文中配图' }); }
      else buffer.push(line);
    }
    if (buffer.length) { const rest = buffer.join('\n').trim(); if (rest) blocks.push({ type: 'text', text: rest }); }
  }
  return blocks.slice(0, 800);
}
async function parseEpubFile(file, onProgress) {
  setResponse('正在导入', 'EPUB 解析中…');
  if (!window.JSZip) await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js');
  const zip = await window.JSZip.loadAsync(await file.arrayBuffer());
  const findFile = pred => Object.keys(zip.files).find(pred);
  const containerName = findFile(n => /^META-INF\/container\.xml$/i.test(n));
  if (!containerName) throw new Error('这不是有效的 EPUB（缺少 container.xml）');
  const container = new DOMParser().parseFromString(await zip.files[containerName].async('string'), 'application/xml');
  const opfPath = container.querySelector('rootfile')?.getAttribute('full-path');
  if (!opfPath || !zip.files[opfPath]) throw new Error('EPUB 结构不完整（找不到 OPF 清单）');
  const opfDir = opfPath.includes('/') ? opfPath.slice(0, opfPath.lastIndexOf('/') + 1) : '';
  const opf = new DOMParser().parseFromString(await zip.files[opfPath].async('string'), 'application/xml');
  const bookTitle = opf.getElementsByTagName('dc:title')[0]?.textContent?.trim() || '';
  const resolveHref = href => {
    const clean = decodeURIComponent(href.split('#')[0]);
    const parts = (opfDir + clean).split('/');
    const out = [];
    for (const p of parts) { if (p === '.' || !p) continue; if (p === '..') out.pop(); else out.push(p); }
    return out.join('/');
  };
  const manifest = {};
  for (const item of opf.querySelectorAll('manifest > item')) manifest[item.getAttribute('id')] = { href: resolveHref(item.getAttribute('href') || ''), type: item.getAttribute('media-type') || '' };
  const spineDocs = [];
  for (const ref of opf.querySelectorAll('spine > itemref')) {
    const item = manifest[ref.getAttribute('idref')];
    if (item && /x?html/i.test(item.type) && zip.files[item.href]) spineDocs.push(item.href);
  }
  if (!spineDocs.length) throw new Error('EPUB 里没有可读的章节内容');
  const SKIP_TAGS = 'script,style,noscript,svg,head,link,meta';
  const MAX_IMAGES = 100;
  let imageCount = 0;
  const blocks = [];
  const pushText = t => { const clean = String(t || '').replace(/\s+/g, ' ').trim(); if (clean && /[0-9A-Za-z\u4e00-\u9fff]/.test(clean)) blocks.push({ type: 'text', text: clean }); };
  const imgPromises = [];
  const handleImg = imgEl => {
    if (imageCount >= MAX_IMAGES) return;
    const raw = imgEl.getAttribute('src') || imgEl.getAttribute('xlink:href') || '';
    if (!raw || /^data:/i.test(raw)) return;
    const entry = zip.files[resolveHref(raw)] || zip.files[Object.keys(zip.files).find(n => n.toLowerCase().endsWith(decodeURIComponent(raw).split('/').pop().toLowerCase()))] ;
    if (!entry) return;
    const ext = (raw.split('.').pop() || '').toLowerCase();
    if (!/^(png|jpe?g|gif|webp|svg)$/.test(ext)) return;
    imageCount += 1;
    const idx = blocks.length;
    blocks.push({ type: 'image', src: '', alt: (imgEl.getAttribute('alt') || '书中插图').slice(0, 120), __pendingIdx: idx });
    imgPromises.push(entry.async('base64').then(b64 => { const mime = ext === 'svg' ? 'image/svg+xml' : ext === 'jpg' ? 'image/jpeg' : 'image/' + ext; blocks[idx].src = 'data:' + mime + ';base64,' + b64; }).catch(() => { blocks[idx].src = ''; }));
  };
  const walk = el => {
    for (const node of el.children) {
      const tag = node.tagName.toLowerCase();
      if (node.matches(SKIP_TAGS)) continue;
      if (tag === 'img' || tag === 'image') { handleImg(node); continue; }
      if (tag === 'br') continue;
      const hasBlockChildren = [...node.children].some(c => /^(p|div|section|article|blockquote|ul|ol|table|h[1-6]|figure|li|img|image)$/i.test(c.tagName));
      if (tag === 'img' || hasBlockChildren || /^(section|article|div|figure|blockquote|ul|ol|table|tbody|tr|nav|aside|main|body)$/i.test(tag)) { walk(node); continue; }
      pushText(node.textContent);
    }
  };
  for (let i = 0; i < spineDocs.length; i++) {
    onProgress?.(Math.round((i / spineDocs.length) * 80), `解析 EPUB · 第 ${i + 1}/${spineDocs.length} 节 · 已提取插图 ${imageCount} 张`);
    const html = await zip.files[spineDocs[i]].async('string');
    const dom = new DOMParser().parseFromString(html, 'text/html');
    const headingEl = dom.querySelector('h1,h2,h3');
    if (headingEl) { const h = headingEl.textContent.replace(/\s+/g, ' ').trim(); if (h && h.length <= 60 && /[0-9A-Za-z\u4e00-\u9fff]/.test(h)) blocks.push({ type: 'text', text: h, heading: /^h1$/i.test(headingEl.tagName) ? 2 : 3 }); headingEl.remove(); }
    walk(dom.body);
    if (blocks.length >= 800) break;
  }
  await Promise.all(imgPromises);
  const keptImages = blocks.filter(b => b.type === 'image');
  onProgress?.(90, `压缩插图 ${keptImages.length} 张…`);
  await Promise.all(keptImages.map(async b => { if (b.src && /^data:image\//.test(b.src)) b.src = await shrinkDataUrl(b.src, 1200); }));
  const finalBlocks = blocks.filter(b => b.type !== 'image' || b.src).slice(0, 800).map(b => { delete b.__pendingIdx; return b; });
  if (!finalBlocks.some(b => b.type === 'text')) throw new Error('没能从这本书里提取出文字内容');
  return { title: bookTitle, blocks: finalBlocks, chapters: spineDocs.length, images: keptImages.length };
}
async function parseFileForImport(file, onProgress, signal) {
  const title = (file.name || '').replace(/\.[^.]+$/, '') || '已导入文章';
  const lower = file.name.toLowerCase();
  let blocks; let mdTitle = '';
  if (lower.endsWith('.pdf')) blocks = await parsePdfFile(file, onProgress, signal);
  else if (/\.epub$/.test(lower)) { const epub = await parseEpubFile(file, onProgress); blocks = epub.blocks; if (epub.title) mdTitle = epub.title; }
  else if (/\.(docx|doc)$/.test(lower)) blocks = await parseDocxFile(file);
  else if (/\.(md|markdown)$/.test(lower)) { const raw = await file.text(); blocks = await parseMarkdownFile(raw); const h1 = raw.match(/^#\s+(\S.*)$/m); if (h1) mdTitle = h1[1].trim().slice(0, 120); }
  else { const bytes = new Uint8Array(await file.arrayBuffer()); let binary = ''; for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return { filename: file.name, content: btoa(binary) }; }
  blocks = blocks.filter(Boolean).slice(0, 800).filter(b => b.type !== 'text' || (b.text && b.text.trim()));
  if (!blocks.length) throw new Error('没能从文件里提取出内容（可能是扫描版 PDF，需要 OCR）');
  return { filename: file.name, title: mdTitle || title, blocks };
}
function apiUpload(path, body, onPercent, signal) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', path);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('X-Reading-Room-Session', getSessionId());
    xhr.setRequestHeader('X-Doc-Secret', getDocSecret());
    if (signal) signal.addEventListener('abort', () => xhr.abort());
    xhr.upload.onprogress = e => { if (e.lengthComputable && onPercent) onPercent(Math.round((e.loaded / e.total) * 100)); };
    xhr.onload = () => { let data = {}; try { data = JSON.parse(xhr.responseText); } catch (_) {} if (xhr.status >= 200 && xhr.status < 300) resolve(data); else reject(new Error(data.error || '上传失败')); };
    xhr.onerror = () => reject(new Error('网络错误，上传失败'));
    xhr.onabort = () => reject(new DOMException('已取消', 'AbortError'));
    xhr.send(body);
  });
}
let importAbort = null;
async function importFiles(files) {
  const list = [...files];
  if (!list.length) return;
  const progressBox = document.getElementById('importProgress');
  const progressBar = document.getElementById('importProgressBar');
  const progressText = document.getElementById('importProgressText');
  const cancelButton = document.getElementById('importCancel');
  const showProgress = (pct, text) => { progressBox.hidden = false; progressBar.style.width = `${Math.max(3, pct)}%`; progressText.textContent = text; };
  importAbort = new AbortController();
  cancelButton.hidden = false;
  cancelButton.onclick = () => importAbort.abort();
  const tag = i => list.length > 1 ? `(${i + 1}/${list.length}) ` : '';
  try {
    progressBox.hidden = false; showProgress(2, '读取文件…');
    for (let i = 0; i < list.length; i++) {
      const file = list[i];
      const payload = await parseFileForImport(file, (pct, text) => showProgress(pct / list.length * 92 + (i / list.length) * 92, `${tag(i)}${text}`), importAbort.signal);
      payload.doc_id = genDocId();
      showProgress(92 + (i / list.length) * 8, `${tag(i)}上传到服务端…`);
      const data = await apiUpload('./api/import', JSON.stringify(payload), pct => showProgress(92 + ((i + pct / 100) / list.length) * 8, `${tag(i)}上传中 · ${Math.round(pct)}%`), importAbort.signal);
      const title = data.title;
      const id = payload.doc_id;
      const doc = { ...data, id, title, savedAt: Date.now(), source: 'file', kind: kindOfFilename(file.name), serverId: data.serverId };
      await saveImportedDocument(doc);
      if (i === list.length - 1) {
        showProgress(100, '导入完成');
        if (restoreDocument(doc)) setResponse('导入完成', list.length > 1 ? `共导入 ${list.length} 个文件，当前显示《${title}》。` : `${title} · 已提取 ${data.characters} 个字符${data.images ? `、${data.images} 张配图` : ''}，已放入书架。`);
      } else {
        setResponse('批量导入中', `已完成 ${i + 1}/${list.length}：《${title}》`);
      }
    }
    setTimeout(() => { progressBox.hidden = true; }, 900);
  } catch (error) {
    progressBox.hidden = true;
    if (error?.name === 'AbortError') setResponse('已取消导入', '导入已中止，之前完成的文件仍在书架里。');
    else setResponse('导入失败', error.message);
  }
  cancelButton.hidden = true;
}
document.getElementById('fileInput').addEventListener('change', async e => {
  const files = e.target.files;
  if (!files?.length) return;
  await importFiles(files);
  e.target.value = '';
});

// 书架弹窗与链接导入
function openLinkDialog() { document.getElementById('linkStatus').textContent = ''; document.getElementById('linkUrl').value = ''; const lf = document.getElementById('linkFolder'); if (lf) lf.value = ''; if (typeof linkDialog.showModal === 'function') linkDialog.showModal(); else { linkDialog.classList.add('fallback-open'); linkDialog.setAttribute('open', ''); } }
const importLinkBtnEl = document.getElementById('importLinkBtn');
if (importLinkBtnEl) importLinkBtnEl.addEventListener('click', openLinkDialog);
document.getElementById('menuShelf').addEventListener('click', () => { openMenu(false); renderShelf(); if (typeof shelfDialog.showModal === 'function') shelfDialog.showModal(); else { shelfDialog.classList.add('fallback-open'); shelfDialog.setAttribute('open', ''); } });
document.getElementById('menuLink').addEventListener('click', () => { openMenu(false); openLinkDialog(); });
document.querySelectorAll('#linkForm [value="cancel"]').forEach(button => button.addEventListener('click', () => linkDialog.close ? linkDialog.close() : linkDialog.classList.remove('fallback-open')));
document.getElementById('linkForm').addEventListener('submit', async event => {
  event.preventDefault();
  const linkStatus = document.getElementById('linkStatus');
  const url = document.getElementById('linkUrl').value.trim();
  if (!/^https?:\/\//.test(url)) { linkStatus.textContent = '请输入以 https:// 开头的文章链接'; return; }
  const submitButton = document.getElementById('importLink');
  submitButton.disabled = true;
  linkStatus.textContent = '正在抓取文章…';
  try {
    const data = await api('./api/fetch-article', { method: 'POST', body: JSON.stringify({ url }) });
    linkStatus.textContent = `已抓到《${data.title}》，正在放入书架…`;
    const imp = await api('./api/import', { method: 'POST', body: JSON.stringify({ filename: `${data.title}.html`, title: data.title, blocks: data.blocks, doc_id: genDocId(), folder: (document.getElementById('linkFolder')?.value || '').trim().slice(0, 20) }) });
    const id = imp.serverId || genDocId();
    const doc = { ...imp, id, title: imp.title || data.title, savedAt: Date.now(), source: 'link', kind: 'article', serverId: imp.serverId, folder: (document.getElementById('linkFolder')?.value || '').trim().slice(0, 20) };
    await saveImportedDocument(doc);
    restoreDocument(doc);
    if (typeof linkDialog.close === 'function') linkDialog.close(); else linkDialog.classList.remove('fallback-open');
    setResponse('链接已导入', `《${doc.title}》· 已放入书架，共 ${doc.characters} 字${doc.images ? `、${doc.images} 张配图` : ''}。`);
  } catch (error) { linkStatus.textContent = error.message; }
  submitButton.disabled = false;
});

const settingsDialog = document.getElementById('settingsDialog');
const providerSelect = document.getElementById('providerSelect');
const modelInput = document.getElementById('modelInput');
const apiKeyInput = document.getElementById('apiKeyInput');
const baseUrlRow = document.getElementById('baseUrlRow');
const baseUrlInput = document.getElementById('baseUrlInput');
const settingsStatus = document.getElementById('settingsStatus');
let providers = {};
async function loadProviders() {
  try {
    const data = await api('./api/providers'); providers = data.providers;
    providerSelect.innerHTML = Object.entries(providers).map(([key, item]) => `<option value="${key}">${item.label}</option>`).join('');
    if (data.configured) { providerSelect.value = data.configured; modelInput.value = data.model || ''; if (data.base_url) baseUrlInput.value = data.base_url; document.body.dataset.modelConfigured = 'true'; }
    updateProviderHint();
  } catch (_) { settingsStatus.textContent = '本地服务未连接，模型功能暂不可用。'; }
}
function updateProviderHint() { const key = providerSelect.value; const item = providers[key]; if (key === 'custom') { baseUrlRow.hidden = false; document.getElementById('providerHint').textContent = '填你的中转站地址，需兼容 OpenAI 接口（以 https:// 开头，一般以 /v1 结尾）'; modelInput.placeholder = '必填，例如 gpt-4o-mini'; return; } baseUrlRow.hidden = true; document.getElementById('providerHint').textContent = item ? `${item.base_url} · ${providerInfo[key]}` : ''; if (item && !modelInput.value) modelInput.placeholder = item.model; }
document.getElementById('modelSettings').addEventListener('click', () => { settingsStatus.textContent = ''; if (typeof settingsDialog.showModal === 'function') settingsDialog.showModal(); else { settingsDialog.classList.add('fallback-open'); settingsDialog.setAttribute('open', ''); } });
providerSelect.addEventListener('change', () => { modelInput.value = ''; updateProviderHint(); });
document.getElementById('settingsForm').addEventListener('submit', async event => {
  event.preventDefault();
  settingsStatus.textContent = '正在保存...';
  try { const data = await api('./api/settings', {method:'POST', body: JSON.stringify({provider: providerSelect.value, api_key: apiKeyInput.value, model: modelInput.value, base_url: baseUrlInput.value})}); document.body.dataset.modelConfigured = 'true'; apiKeyInput.value = ''; settingsStatus.textContent = `已连接 ${providers[data.provider].label} · ${data.model}`; setTimeout(() => settingsDialog.close(), 600); }
  catch (error) { settingsStatus.textContent = error.message; }
});
document.querySelectorAll('[value="cancel"]').forEach(button => button.addEventListener('click', () => { settingsDialog.close ? settingsDialog.close() : settingsDialog.classList.remove('fallback-open'); }));

// 移动端抽屉菜单
const mobileMenu = document.getElementById('mobileMenu');
const menuToggle = document.getElementById('menuToggle');
const openMenu = open => { mobileMenu.classList.toggle('open', open); menuToggle.setAttribute('aria-expanded', String(open)); };
menuToggle.addEventListener('click', () => openMenu(!mobileMenu.classList.contains('open')));
document.getElementById('menuClose').addEventListener('click', () => openMenu(false));
document.getElementById('menuSkin').addEventListener('click', () => { openMenu(false); document.getElementById('skinSettings').click(); });
document.getElementById('menuModel').addEventListener('click', () => { openMenu(false); document.getElementById('modelSettings').click(); });
document.getElementById('menuImport').addEventListener('click', () => { openMenu(false); pickFiles(false); });
document.getElementById('menuBatch')?.addEventListener('click', () => { openMenu(false); pickFiles(true); });
document.addEventListener('pointerdown', event => { if (mobileMenu.classList.contains('open') && !mobileMenu.contains(event.target) && !menuToggle.contains(event.target)) openMenu(false); });

// 稍后阅读
const READ_LATER_KEY = 'reading-room-readlater';
const getReadLater = () => { try { return JSON.parse(localStorage.getItem(READ_LATER_KEY) || '[]'); } catch (_) { return []; } };
const setReadLater = list => localStorage.setItem(READ_LATER_KEY, JSON.stringify(list));
function renderReadLater() {
  const list = getReadLater();
  const container = document.getElementById('readLaterList');
  if (!list.length) { container.innerHTML = '<div class="readlater-empty">还没有保存的进度</div>'; return; }
  container.innerHTML = list.map((item, idx) => `<div class="readlater-item"><strong>${escapeHtml(item.title)}</strong><div class="rl-meta"><span>${escapeHtml(item.sectionLabel)} · ${item.progress}%</span><span><button type="button" class="rl-remove" data-idx="${idx}">移除</button> · ${escapeHtml(item.savedAtText)}</span></div></div>`).join('');
  container.querySelectorAll('.readlater-item').forEach((el, idx) => {
    el.addEventListener('click', async event => {
      if (event.target.closest('.rl-remove')) { list.splice(idx, 1); setReadLater(list); renderReadLater(); return; }
      const item = list[idx];
      if (item.docId && item.docId !== activeDocId) {
        try {
          const db = await openReadingDb();
          const doc = await dbGet(db, LIB_STORE, item.docId); db.close();
          if (!doc?.text) throw new Error('这本书已不在书架上，可能被删除了');
          restoreDocument(doc);
        } catch (error) { setResponse('打不开这篇', error.message); return; }
      } else if (!item.docId) {
        const metas = await loadShelfMetas();
        const match = metas.find(m => m.title === item.title);
        if (match) {
          const db = await openReadingDb();
          const doc = await dbGet(db, LIB_STORE, match.id); db.close();
          if (doc?.text) { item.docId = match.id; setReadLater(list); restoreDocument(doc); }
        }
      }
      current = Math.min(item.sectionIndex, sections.length - 1);
      render();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setResponse('回到稍后阅读的位置', `《${item.title}》· ${item.sectionLabel}。`);
    });
  });
}
document.getElementById('saveLater').addEventListener('click', () => {
  const section = sections[current];
  const list = getReadLater();
  const item = {
    title: document.getElementById('articleTitle').textContent,
    docId: activeDocId || undefined,
    sectionLabel: section.label,
    sectionIndex: current,
    progress: Math.round((completed.size / sections.length) * 100),
    savedAt: Date.now(),
    savedAtText: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  };
  const filtered = list.filter(entry => !(entry.title === item.title && entry.sectionIndex === item.sectionIndex));
  filtered.unshift(item);
  setReadLater(filtered.slice(0, 20));
  renderReadLater();
  setResponse('已加入稍后阅读', `《${item.title}》· ${section.label} 已保存，可在左侧“稍后阅读”找回。`);
});
document.getElementById('newArticle').addEventListener('click', () => document.getElementById('fileInput').click());

// 导入二级菜单（文件 / 批量 / 链接）与分类弹窗
function pickFiles(multiple) {
  const input = document.getElementById('fileInput');
  if (multiple) input.setAttribute('multiple', ''); else input.removeAttribute('multiple');
  input.click();
}
const importMenuPanel = document.getElementById('importMenuPanel');
if (importMenuPanel) {
  document.getElementById('importMenuBtn').addEventListener('click', event => { event.stopPropagation(); importMenuPanel.hidden = !importMenuPanel.hidden; });
  document.addEventListener('pointerdown', event => { if (!event.target.closest('#importDropdown')) importMenuPanel.hidden = true; });
  importMenuPanel.addEventListener('click', event => {
    const btn = event.target.closest('[data-imp]'); if (!btn) return;
    importMenuPanel.hidden = true;
    if (btn.dataset.imp === 'file') pickFiles(false);
    else if (btn.dataset.imp === 'batch') pickFiles(true);
    else openLinkDialog();
  });
}
const folderDialog = document.getElementById('folderDialog');
if (folderDialog) {
  document.querySelectorAll('#folderDialog [value="cancel"]').forEach(button => button.addEventListener('click', () => folderDialog.close ? folderDialog.close() : folderDialog.classList.remove('fallback-open')));
  document.getElementById('saveFolder').addEventListener('click', event => {
    event.preventDefault();
    const val = (document.getElementById('folderName').value || '').trim().slice(0, 20);
    if (folderTargetId) updateDocMeta(folderTargetId, { folder: val }).then(renderShelf);
    if (typeof folderDialog.close === 'function') folderDialog.close(); else folderDialog.classList.remove('fallback-open');
  });
}

// 本周阅读时长
const WEEKLY_KEY = 'reading-room-weekly';
const weekKey = (date = new Date()) => { const d = new Date(date.getFullYear(), date.getMonth(), date.getDate()); const day = d.getDay() || 7; d.setDate(d.getDate() - day + 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
function getWeekly() { try { const v = JSON.parse(localStorage.getItem(WEEKLY_KEY) || '{}'); if (v.week !== weekKey()) return { week: weekKey(), seconds: 0 }; return v; } catch (_) { return { week: weekKey(), seconds: 0 }; } }
let weekly = getWeekly();
function updateWeeklyDisplay() { const minutes = Math.round(weekly.seconds / 60); const el = document.getElementById('weeklyMinutes'); el.textContent = minutes >= 60 ? `${Math.floor(minutes / 60)} 小时 ${minutes % 60} 分` : `${minutes} 分钟`; }
setInterval(() => { if (document.visibilityState !== 'visible') return; if (weekly.week !== weekKey()) weekly = { week: weekKey(), seconds: 0 }; weekly.seconds += 5; localStorage.setItem(WEEKLY_KEY, JSON.stringify(weekly)); updateWeeklyDisplay(); }, 5000);

// 伴读模式
const defaultModes = [
  { id: 'balanced', name: '均衡伴读', prompt: '你是一位耐心的阅读伴读。请客观、准确地解释内容，不替读者下结论，不剧透，不添加原文没有的意思。' },
  { id: 'close', name: '精读拆解', prompt: '你是一位精读导师。请逐段拆解作者的论证：这一段在说什么、为什么这么说、和上下文是什么关系、哪里是关键证据。' },
  { id: 'critical', name: '批判质疑', prompt: '你是一位挑剔的批评者。请专门指出内容里的漏洞、未经证明的跳跃、偷换概念，以及用修辞代替论证的地方。' },
  { id: 'plain', name: '通俗转述', prompt: '你是一位翻译。请把这段内容转述成通俗易懂的大白话，保留原意，不添加自己的观点，不评判对错。' },
  { id: 'socratic', name: '苏格拉底', prompt: '你是一位苏格拉底式的提问者。不要直接给答案，只用一连串层层递进的问题，引导读者自己发现和理解。' }
];
const MODES_KEY = 'reading-room-modes';
const ACTIVE_MODE_KEY = 'reading-room-active-mode';
const getCustomModes = () => { try { return JSON.parse(localStorage.getItem(MODES_KEY) || '[]'); } catch (_) { return []; } };
const setCustomModes = list => localStorage.setItem(MODES_KEY, JSON.stringify(list));
const allModes = () => [...defaultModes, ...getCustomModes()];
const getActiveMode = () => allModes().find(m => m.id === localStorage.getItem(ACTIVE_MODE_KEY)) || defaultModes[0];
function renderModes() {
  const container = document.getElementById('modeChips');
  const active = getActiveMode();
  container.innerHTML = allModes().map(m => {
    const removable = !defaultModes.some(d => d.id === m.id);
    return `<button type="button" class="mode-chip${m.id === active.id ? ' selected' : ''}" data-mode="${m.id}">${escapeHtml(m.name)}${removable ? '<span class="mode-remove" data-remove="1" title="删除此模式">×</span>' : ''}</button>`;
  }).join('');
  container.querySelectorAll('.mode-chip').forEach(chip => chip.addEventListener('click', event => {
    if (event.target.closest('[data-remove]')) { const id = chip.dataset.mode; setCustomModes(getCustomModes().filter(m => m.id !== id)); if (localStorage.getItem(ACTIVE_MODE_KEY) === id) localStorage.removeItem(ACTIVE_MODE_KEY); renderModes(); return; }
    localStorage.setItem(ACTIVE_MODE_KEY, chip.dataset.mode);
    renderModes();
  }));
}
const modeDialog = document.getElementById('modeDialog');
const modeNameInput = document.getElementById('modeName');
const modePromptInput = document.getElementById('modePromptInput');
const modeStatus = document.getElementById('modeStatus');
document.getElementById('customModeBtn').addEventListener('click', () => { modeStatus.textContent = ''; modeNameInput.value = ''; modePromptInput.value = ''; if (typeof modeDialog.showModal === 'function') modeDialog.showModal(); else { modeDialog.classList.add('fallback-open'); modeDialog.setAttribute('open', ''); } });
document.getElementById('importModeFile').addEventListener('click', () => document.getElementById('modeFileInput').click());
document.getElementById('modeFileInput').addEventListener('change', async e => {
  const file = e.target.files[0]; if (!file) return;
  try {
    const text = await file.text();
    let prompt = text;
    if (file.name.toLowerCase().endsWith('.json')) { const obj = JSON.parse(text); prompt = obj.prompt || obj.content || text; if (!modeNameInput.value && obj.name) modeNameInput.value = obj.name; }
    modePromptInput.value = prompt;
    modeStatus.textContent = `已读取：${file.name}`;
  } catch (err) { modeStatus.textContent = err.message.includes('JSON') ? '不是有效的 JSON 文件。' : err.message; }
  e.target.value = '';
});
document.getElementById('modeForm').addEventListener('submit', event => {
  event.preventDefault();
  const name = modeNameInput.value.trim();
  const prompt = modePromptInput.value.trim();
  if (!name || !prompt) { modeStatus.textContent = '模式名和提示词都要填。'; return; }
  const id = 'custom-' + Date.now().toString(36);
  const modes = getCustomModes();
  modes.push({ id, name, prompt });
  setCustomModes(modes);
  localStorage.setItem(ACTIVE_MODE_KEY, id);
  renderModes();
  modeStatus.textContent = `已保存「${name}」，已设为当前模式。`;
  setTimeout(() => { if (typeof modeDialog.close === 'function') modeDialog.close(); else modeDialog.classList.remove('fallback-open'); }, 600);
});
document.querySelectorAll('#modeForm [value="cancel"]').forEach(button => button.addEventListener('click', () => { if (typeof modeDialog.close === 'function') modeDialog.close(); else modeDialog.classList.remove('fallback-open'); }));

  initSkinPicker();
  renderShelf();
  renderReadLater();
  updateWeeklyDisplay();
  renderModes();
  loadProviders();
  loadImportedDocument().then(async data => {
    if (restoreDocument(data)) { setResponse('已恢复上次阅读', `${data.title} · 刷新后继续保留在本机。`); return; }
    try {
      const remote = await api('./api/document');
      if (restoreDocument(remote.document)) setResponse('已恢复上次阅读', `${remote.document.title} · 已从云阅服务恢复。`);
      else render();
    } catch (_) { render(); }
  });
