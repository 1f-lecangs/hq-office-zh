// Runtime Chinese shell for the Grok Bot Wallpaper office dashboard.
// Fetches the official modules, translates on-screen text, rewrites imports to blob URLs.
// Official status keys (working, idle, waiting_user, error, stuck, done) are left unchanged.

const OFFICIAL = 'https://bodila51.github.io/grokbot-wallpaper/office/';
const THREE = 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';
const ADDONS = 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/';

const LABEL_BLOCK = `const LABEL = {
  working: '工作中',
  idle: '空闲',
  waiting_user: '等你处理',
  error: '出错',
  stuck: '卡住',
  done: '完成',
};`;

const CHIP_BLOCK = `const CHIP = {
  working: '工作中',
  idle: '空闲',
  waiting_user: '等你处理',
  error: '出错',
  stuck: '卡住',
  done: '完成',
};`;

const WORDS_BLOCK = `const WORDS = {
  working: ['工作中', '工作中'],
  waiting_user: ['等你处理', '等你处理'],
  error: ['出错', '出错'],
  stuck: ['卡住', '卡住'],
  idle: ['空闲', '空闲'],
  done: ['完成', '完成'],
};`;

const FMT_DUR = `function fmtDur(ms) {
  const min = Math.floor(Math.max(0, ms) / 60000);
  if (min < 1) return '不到 1 分钟';
  if (min < 60) return min + ' 分钟';
  const hr = Math.floor(min / 60), m = min % 60;
  if (hr < 24) return m ? hr + ' 小时 ' + m + ' 分钟' : hr + ' 小时';
  const d = Math.floor(hr / 24), hh = hr % 24;
  return hh ? d + ' 天 ' + hh + ' 小时' : d + ' 天';
}`;

const FMT_LEFT = `function fmtLeft(ms) {
  const min = Math.floor(ms / 60000);
  if (min < 1) return '不到 1 分钟';
  const d = Math.floor(min / 1440), hr = Math.floor((min % 1440) / 60), m = min % 60;
  if (d > 0) return d + ' 天 ' + hr + ' 小时';
  if (hr > 0) return hr + ' 小时 ' + m + ' 分钟';
  return m + ' 分钟';
}`;

const REL_AGO = `function relAgo(ms) {
  const diff = nowMs() - ms;
  const min = Math.floor(diff / 60000);
  if (min < 1) return '刚刚';
  if (min < 60) return min + ' 分钟前';
  const hr = Math.floor(min / 60);
  if (hr < 24) return hr + ' 小时前';
  return Math.floor(hr / 24) + ' 天前';
}`;

const REL_SHORT = `function relShort(ms) {
  const min = Math.floor((nowMs() - ms) / 60000);
  if (min < 1) return '现在';
  if (min < 60) return min + '分';
  const hr = Math.floor(min / 60);
  return hr < 24 ? hr + '小时' : Math.floor(hr / 24) + '天';
}`;

const REL_IN = `function relIn(ms) {
  const diff = ms - nowMs();
  if (diff <= 0) return '已到点';
  const min = Math.ceil(diff / 60000);
  if (min < 60) return min + ' 分钟后';
  const hr = Math.floor(min / 60), m = min % 60;
  if (hr < 6) return m ? hr + ' 小时 ' + m + ' 分钟后' : hr + ' 小时后';
  if (hr < 24) return hr + ' 小时后';
  const d = new Date(ms);
  return WEEKDAY[d.getDay()] + ' ' + hhmm(ms);
}`;

const FULL_LOCAL = `function fullLocal(ms) {
  const d = new Date(ms);
  return WEEKDAY[d.getDay()] + ' ' + (d.getMonth() + 1) + '月' + d.getDate() + '日 ' + hhmm(ms);
}`;

const COUNTS_TEXT = `function countsText(c) {
  const parts = [];
  for (const s of ['working', 'waiting_user', 'error', 'stuck', 'done', 'idle']) {
    const n = Number(c && c[s]) || 0;
    if (n > 0) parts.push(n + ' ' + statusWord(s, n));
  }
  return parts.join('，');
}`;

// Display-only quoted strings. Protocol keys are not in this list.
const STRINGS = [
  ['Ask the bots that did not answer to re-read their instructions, or run the setup again.', '请让未回应的 Bot 重新阅读说明，或再运行一次配置。'],
  ['. Each bot ticks off when its own status line arrives.', '。每个 Bot 上报自己的状态后会打勾。'],
  ['Nobody here yet. A bot shows up when it logs its first step.', '这里还没有人。Bot 第一次上报状态后就会出现。'],
  ['Nothing finished in the last 24 hours.', '过去 24 小时内没有完成的工作。'],
  ['Waiting on me, finished work and routines', '等我处理、已完成的工作和定时任务'],
  ['Copying is blocked here. Use Download instead.', '此处无法复制，请改用下载。'],
  ['Sharing did not work here. Use Download instead.', '此处无法分享，请改用下载。'],
  ['The office is still loading. Try again in a moment.', '办公室还在加载，请稍后再试。'],
  ['Download the image, then add it to your post.', '请先下载图片，再添加到帖子里。'],
  ['Copied. Paste it anywhere.', '已复制，可以粘贴到任意地方。'],
  ['Nobody on this floor yet', '这层还没有人'],
  ['Nothing is waiting on you.', '没有等你处理的事项。'],
  ['No routines scheduled.', '没有已安排的定时任务。'],
  ['Demo data, not real bots', '演示数据，不是真实 Bot'],
  ['Share an image of your office', '分享办公室截图'],
  ['Your office, ready to post', '办公室截图已准备好，可以发布'],
  ['Copied — paste it in the chat', '已复制 — 请粘贴到聊天里'],
  ['Could not copy — send: ', '无法复制 — 请发送：'],
  ['Copies "pause routine ', '复制命令 pause routine '],
  ['" and opens the chat', ' 并打开聊天'],
  ['Every bot answered.', '所有 Bot 都已回应。'],
  ['No data on the current step', '当前步骤暂无数据'],
  ['Went quiet after: ', '之后无上报：'],
  ['No chat link yet', '还没有聊天链接'],
  ['No status line yet', '还没有状态记录'],
  ['Last status line ', '最近状态 '],
  ['Framing your office…', '正在取景……'],
  ['Pick a floor on the left', '请在左侧选择楼层'],
  ['Pick a floor above', '请在上方选择楼层'],
  ['No floor selected', '未选择楼层'],
  ['Hide this panel for the camera', '为拍照隐藏此面板'],
  ['Hide for the camera', '为拍照隐藏'],
  ['Show this panel', '显示此面板'],
  ['Bot card and floor team', 'Bot 卡片与楼层团队'],
  ['A live 3D office of your Grok Bot bots: who is working, who waits for you, what got done.', '团队 Bot 的实时 3D 办公室：谁在工作、谁在等你、哪些已经完成。'],
  ['Usage this week', '本周用量'],
  ['Usage today', '今日用量'],
  ['Usage this month', '本月用量'],
  ['Share of total usage', '占总用量的比例'],
  ['Share your office', '分享你的办公室'],
  ['My Grok Bot office', '我的 Bot 办公室'],
  ['Grok Bot Dashboard', '办公室看板'],
  ['Building the office', '正在搭建办公室'],
  ['Activity feed', '动态'],
  ['Event feed', '事件动态'],
  ['Bot statuses', 'Bot 状态'],
  ['Floor team', '楼层团队'],
  ['Close bot card', '关闭 Bot 卡片'],
  ['Close (Esc)', '关闭（Esc）'],
  ['Waiting for you', '等你处理'],
  ['waiting for you', '等你处理'],
  ['Open chat', '打开聊天'],
  ['Recent steps', '最近步骤'],
  ['Scene zoom', '场景缩放'],
  ['Status check', '状态检查'],
  ['Waiting on me', '等我处理'],
  ['Worked (unreported)', '有用量但未上报'],
  ['never reported', '尚未上报'],
  ['Usage limit', '用量上限'],
  ['No events yet.', '还没有动态。'],
  ['No steps yet.', '还没有步骤记录。'],
  ['Expand panel', '展开面板'],
  ['Collapse panel', '收起面板'],
  ['Floor panel', '楼层面板'],
  ['Events by hour', '分时动态'],
  ['events today', '今日动态'],
  ['tasks done', '已完成任务'],
  ['hours worked', '工作小时'],
  ['working now', '正在工作'],
  ['resetting now', '正在重置'],
  ['Updated at ', '更新于 '],
  ['Started ', '开始于 '],
  ['no answer', '未回应'],
  ['waiting…', '等待中…'],
  ['Turn off', '关闭'],
  ['no date', '无日期'],
  ['h worked', '小时工作'],
  [' of all', '（全部）'],
  ['Zoom out', '缩小'],
  ['Zoom in', '放大'],
  ['Copy image', '复制图片'],
  ['Post on X', '发布到 X'],
  ['Share…', '分享…'],
  ['Download', '下载'],
  ['Bot card', 'Bot 卡片'],
  ['seen ', '最近上报：'],
  ['due now', '已到点'],
  ['just now', '刚刚'],
  ['Live · ', '实时 · '],
  ['Today · ', '今日 · '],
  ['Floor ', '楼层 '],
  [' · desk ', ' · 工位 '],
  ['a task', '一项任务'],
  ['elevator car', '电梯轿厢'],
  ['all resting', '全部空闲'],
  ['no bots yet', '还没有 Bot'],
  ['Working', '工作中'],
  ['Resting', '空闲'],
  ['Stuck?', '卡住了？'],
  ['Stuck', '卡住'],
  ['Error', '出错'],
  ['Done', '完成'],
  ['Finished', '已完成'],
  ['Routines', '定时任务'],
  ['Activity', '动态'],
  ['Office', '办公室'],
  ['Floors', '楼层'],
  ['Close', '关闭'],
  ['Show', '显示'],
  ['Share', '分享'],
  ['Sound', '声音'],
  ['Music', '音乐'],
  ['Sounds', '音效'],
  ['Today', '今日'],
  ['Tasks', '任务'],
  ['Task', '任务'],
  ['Usage', '用量'],
  ['Limit', '上限'],
  ['Week', '本周'],
  ['Day', '今日'],
  ['Month', '本月'],
  ['DEMO', '演示'],
  ['Main floor', '主楼层'],
];

function replaceQuoted(src, from, to) {
  const esc = from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return src.replace(new RegExp(`(['"\`])${esc}\\1`, 'g'), (_, q) => q + to + q);
}

function replaceFn(src, name, next) {
  const re = new RegExp(`function ${name}\\([^)]*\\) \\{[\\s\\S]*?\\n\\}`);
  if (!re.test(src)) {
    console.warn('[zh] function not found:', name);
    return src;
  }
  return src.replace(re, next);
}

function replaceConstBlock(src, name, next) {
  const re = new RegExp(`const ${name} = \\{[\\s\\S]*?\\n\\};`);
  if (!re.test(src)) {
    console.warn('[zh] const block not found:', name);
    return src;
  }
  return src.replace(re, next);
}

function patchUi(src) {
  src = replaceConstBlock(src, 'LABEL', LABEL_BLOCK);
  src = replaceConstBlock(src, 'CHIP', CHIP_BLOCK);
  src = replaceConstBlock(src, 'WORDS', WORDS_BLOCK);
  src = src.replace(
    "const USAGE_TITLE = { week: 'Week', day: 'Day', month: 'Month' };",
    "const USAGE_TITLE = { week: '本周', day: '今日', month: '本月' };",
  );
  src = src.replace(
    "const USAGE_SPENT = { week: 'Usage this week', day: 'Usage today', month: 'Usage this month' };",
    "const USAGE_SPENT = { week: '本周用量', day: '今日用量', month: '本月用量' };",
  );
  src = src.replace(
    "const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];",
    "const WEEKDAY = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];",
  );
  src = src.replace("document.documentElement.lang = 'en';", "document.documentElement.lang = 'zh-CN';");
  src = src.replace(/Intl\.(DateTimeFormat|NumberFormat)\('en-GB'/g, "Intl.$1('zh-CN'");
  src = replaceFn(src, 'fmtDur', FMT_DUR);
  src = replaceFn(src, 'fmtLeft', FMT_LEFT);
  src = replaceFn(src, 'relAgo', REL_AGO);
  src = replaceFn(src, 'relShort', REL_SHORT);
  src = replaceFn(src, 'relIn', REL_IN);
  src = replaceFn(src, 'fullLocal', FULL_LOCAL);
  src = replaceFn(src, 'countsText', COUNTS_TEXT);
  src = src.replace(
    "return 'Worked (unreported)' + (b == null ? '' : ' · ' + (a == null ? '' : hhmm(a) + '–') + hhmm(b));",
    "return '有用量但未上报' + (b == null ? '' : ' · ' + (a == null ? '' : hhmm(a) + '–') + hhmm(b));",
  );
  src = src.replace(
    "return t == null ? 'never reported' : 'seen ' + relAgo(t);",
    "return t == null ? '尚未上报' : '最近上报：' + relAgo(t);",
  );
  src = src.replace(
    "resetText = left > 0 ? 'resets in ' + fmtLeft(left) : 'resetting now';",
    "resetText = left > 0 ? fmtLeft(left) + '后重置' : '正在重置';",
  );
  src = src.replace(
    "plural(ids.length, 'bot', 'bots')",
    "plural(ids.length, '个 Bot', '个 Bot')",
  );
  src = src.replace(
    "plural(ev, 'step', 'steps')",
    "plural(ev, '个步骤', '个步骤')",
  );
  src = src.replace(
    "plural(tk, 'task', 'tasks')",
    "plural(tk, '项任务', '项任务')",
  );
  // remaining display strings:
  for (const [from, to] of STRINGS) src = replaceQuoted(src, from, to);
  return src;
}

function patchShare(src) {
  src = src.replace(
    "word: bots.length === 1 ? 'bot' : 'bots'",
    "word: '个 Bot'",
  );
  src = src.replace("word: 'teams'", "word: '个团队'");
  src = src.replace("word: 'working now'", "word: '正在工作'");
  src = src.replace(
    `setNote(phone ? '' : canCopy() ? \`Post on X copies the image: paste it with \${MAC ? '⌘V' : 'Ctrl V'}.\` : '');`,
    `setNote(phone ? '' : canCopy() ? \`「发布到 X」会先复制图片：用 \${MAC ? '⌘V' : 'Ctrl+V'} 粘贴即可。\` : '');`,
  );
  src = src.replace(
    "'Grok Bot Dashboard 0123456789 teams working now'",
    "'办公室看板 0123456789 个团队 正在工作'",
  );
  src = src.replace(
    `setNote(ok ? \`Image copied. In the post, paste it with \${MAC ? '⌘V' : 'Ctrl V'}.\` : 'Download the image, then add it to your post.');`,
    `setNote(ok ? \`图片已复制。在帖子里用 \${MAC ? '⌘V' : 'Ctrl+V'} 粘贴。\` : '请先下载图片，再添加到帖子里。');`,
  );
  src = src.replace(
    `'"Nunito", ui-rounded, system-ui, sans-serif'`,
    `'"Noto Sans SC", "Nunito", ui-rounded, system-ui, sans-serif'`,
  );
  src = src.replace(
    `'"Inter", system-ui, -apple-system, "Segoe UI", sans-serif'`,
    `'"Noto Sans SC", "Inter", system-ui, -apple-system, "Segoe UI", sans-serif'`,
  );
  src = src.replace(/Intl\.(DateTimeFormat|NumberFormat)\('en-GB'/g, "Intl.$1('zh-CN'");
  for (const [from, to] of STRINGS) src = replaceQuoted(src, from, to);
  return src;
}

function patchWalls(src) {
  src = src.replace(
    "const FONT = 'Inter, system-ui, -apple-system, \"Segoe UI\", sans-serif';",
    "const FONT = 'Noto Sans SC, Inter, system-ui, -apple-system, \"Segoe UI\", sans-serif';",
  );
  src = src.replace(
    "document.fonts.load('600 24px Inter', 'Today Tasks 0123456789')",
    "document.fonts.load('600 24px \"Noto Sans SC\"', '今日任务 0123456789')",
  );
  src = src.replace(
    "document.fonts.load('500 24px Inter', 'Working events')",
    "document.fonts.load('500 24px \"Noto Sans SC\"', '正在工作 动态')",
  );
  src = src.replace(
    "document.fonts.load('700 24px Inter', '0123456789')",
    "document.fonts.load('700 24px \"Noto Sans SC\"', '0123456789')",
  );
  src = src.replace(
    '[`${working} of ${bots.length}`, \'working now\']',
    '[`${working}/${bots.length}`, \'正在工作\']',
  );
  // template form may use backticks
  src = src.replace(
    "[`${working} of ${bots.length}`, 'working now']",
    "[`${working}/${bots.length}`, '正在工作']",
  );
  src = src.replace(/Intl\.(DateTimeFormat|NumberFormat)\('en-GB'/g, "Intl.$1('zh-CN'");
  for (const [from, to] of STRINGS) src = replaceQuoted(src, from, to);
  return src;
}

function patchActor(src) {
  src = src.replace(
    "const STATUS_LABEL = { waiting_user: 'Waiting for you', error: 'Error', stuck: 'Stuck?', done: 'Done', working: 'Working', idle: 'Resting' };",
    "const STATUS_LABEL = { waiting_user: '等你处理', error: '出错', stuck: '卡住了？', done: '完成', working: '工作中', idle: '空闲' };",
  );
  for (const [from, to] of STRINGS) src = replaceQuoted(src, from, to);
  return src;
}

function patchWallpaper(src) {
  src = src.replace(
    `const FORMS = {
  working: ['working', 'working'],
  attention: ['waiting for you', 'waiting for you'],
  error: ['error', 'errors'],
};`,
    `const FORMS = {
  working: ['工作中', '工作中'],
  attention: ['等你处理', '等你处理'],
  error: ['出错', '出错'],
};`,
  );
  for (const [from, to] of STRINGS) src = replaceQuoted(src, from, to);
  return src;
}

function patchGeneric(src) {
  for (const [from, to] of STRINGS) src = replaceQuoted(src, from, to);
  src = src.replaceAll('Building the office', '正在搭建办公室');
  src = src.replace(/Intl\.(DateTimeFormat|NumberFormat)\('en-GB'/g, "Intl.$1('zh-CN'");
  src = src.replace("document.documentElement.lang = 'en';", "document.documentElement.lang = 'zh-CN';");
  return src;
}

export function patchModule(url, src) {
  const path = new URL(url).pathname;
  if (path.endsWith('/ui/ui.js')) return patchUi(src);
  if (path.endsWith('/share/share.js')) return patchShare(src);
  if (path.endsWith('/scene/walls.js')) return patchWalls(src);
  if (path.endsWith('/scene/actor.js')) return patchActor(src);
  if (path.endsWith('/wallpaper.js')) return patchWallpaper(src);
  if (path.endsWith('/scene/scene.js') || path.endsWith('/audio/sound.js') || path.endsWith('/lib/state.js') || path.endsWith('/app.js')) {
    return patchGeneric(src);
  }
  return src;
}

function rewriteMetaUrls(src, moduleUrl) {
  return src.replace(
    /new URL\(\s*(['"])(\.\.?\/[^'"]+)\1\s*,\s*import\.meta\.url\s*\)(\.href)?/g,
    (m, q, rel, href) => {
      const abs = new URL(rel, moduleUrl).href;
      return href ? JSON.stringify(abs) : `new URL(${JSON.stringify(abs)})`;
    },
  );
}

function rewriteThree(src) {
  src = src.replace(/from\s+(['"])three\1/g, `from ${JSON.stringify(THREE)}`);
  src = src.replace(
    /from\s+(['"])three\/addons\/([^'"]+)\1/g,
    (_, q, rest) => `from ${JSON.stringify(ADDONS + rest)}`,
  );
  return src;
}

function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[\s;,=(){}])\/\/[^\n]*/g, '$1');
}

function findRelativeJs(raw) {
  const src = stripComments(raw);

  const out = new Set();
  const re = /(?:import\s+(?:type\s+)?(?:[^'"\n]+from\s+)?|import\s*\(\s*|export\s+[^'"\n]*from\s+)(['"])(\.\.?\/[^'"]+)\1/g;
  let m;
  while ((m = re.exec(src))) {
    const spec = m[2];
    if (/\.(js)(\?|$)/.test(spec) || !/\.[a-z0-9]+$/i.test(spec)) out.add(spec);
  }
  // dynamic ternary: import(cond ? './a.js' : './b.js')
  const re2 = /import\s*\(\s*[^)]*(['"])(\.\.?\/[^'"]+\.js)\1/g;
  while ((m = re2.exec(src))) out.add(m[2]);
  return [...out];
}

function rewriteRelativeImports(src, moduleUrl, blobs) {
  const replaceSpec = (spec) => {
    if (!spec.startsWith('.')) return null;
    const abs = new URL(spec, moduleUrl).href;
    if (blobs.has(abs)) return blobs.get(abs);
    return null;
  };
  src = src.replace(
    /((?:import\s+(?:type\s+)?(?:[^'"\n]+from\s+)?|export\s+[^'"\n]*from\s+)|import\s*\(\s*)(['"])(\.\.?\/[^'"]+)\2/g,
    (m, pre, q, spec) => {
      const blob = replaceSpec(spec);
      return blob ? pre + JSON.stringify(blob) : m;
    },
  );
  // leftover quoted relative .js in import() ternaries
  src = src.replace(
    /(['"])(\.\.?\/[^'"]+\.js)\1/g,
    (m, q, spec) => {
      const blob = replaceSpec(spec);
      return blob ? JSON.stringify(blob) : m;
    },
  );
  return src;
}

export async function loadPatchedEntry(entryUrl) {
  const texts = new Map();
  async function fetchOne(url, required = true) {
    if (texts.has(url)) return;
    texts.set(url, null);
    const res = await fetch(url);
    if (!res.ok) {
      texts.delete(url);
      if (!required) {
        console.warn('[zh] skip missing module', res.status, url);
        return;
      }
      throw new Error('无法读取办公室模块：' + res.status + ' ' + url.replace(OFFICIAL, ''));
    }
    let src = await res.text();
    src = rewriteMetaUrls(src, url);
    src = rewriteThree(src);
    src = patchModule(url, src);
    texts.set(url, src);
    for (const rel of findRelativeJs(src)) {
      const abs = new URL(rel, url).href;
      if (abs.startsWith('http') && !abs.startsWith('blob:')) await fetchOne(abs, false);
    }
  }
  await fetchOne(entryUrl);

  const blobs = new Map();
  const pending = new Map();
  function blobify(url) {
    if (blobs.has(url)) return blobs.get(url);
    if (pending.has(url)) return pending.get(url); // should not happen (no cycles)
    let src = texts.get(url);
    if (src == null) throw new Error('模块缺失：' + url);
    // placeholder: first pass collects deps in topo by recursion
    const ph = 'blob:pending:' + url;
    pending.set(url, ph);
    const deps = findRelativeJs(src).map((rel) => new URL(rel, url).href).filter((u) => texts.has(u));
    for (const d of deps) blobify(d);
    src = rewriteRelativeImports(src, url, blobs);
    const blob = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }));
    blobs.set(url, blob);
    pending.delete(url);
    return blob;
  }
  return blobify(entryUrl);
}

function showError(err) {
  const el = document.querySelector('.hq-loading-label') || document.getElementById('scene');
  const msg = '办公室界面加载失败：' + (err && err.message ? err.message : String(err));
  if (el) el.textContent = msg;
  console.error(err);
}

if (typeof document !== 'undefined') {
  const entry = new URL('app.js', OFFICIAL).href;
  loadPatchedEntry(entry)
    .then((blob) => import(blob))
    .catch(showError);
}
