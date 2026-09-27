/* ============================================================
 * app.js — 流键 TypingFlow 主程序
 * ------------------------------------------------------------
 * 1. 语料生成     2. 渲染与光标     3. 输入处理（含中文输入法）
 * 4. 统计与采样    5. 结果与图表     6. 本地记录与设置
 * 7. 虚拟键盘
 * ============================================================ */

(function () {
  'use strict';

  /* ══════════════════ 0. 工具函数 ══════════════════ */

  const $ = (sel) => document.querySelector(sel);
  const randInt = (n) => Math.floor(Math.random() * n);

  function pick(arr) { return arr[randInt(arr.length)]; }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = randInt(i + 1);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /** 截断到一位小数，去掉多余零 */
  function fmt(n, digits = 0) {
    if (!isFinite(n)) return '0';
    return digits > 0 ? n.toFixed(digits) : String(Math.round(n));
  }

  /* ══════════════════ 1. 设置持久化 ══════════════════ */

  const SETTINGS_KEY = 'typingflow.settings.v1';

  const settings = Object.assign({
    theme: 'light',
    punctuation: false,
    numbers: false,
    strict: false,
    sound: false,
    keyboard: true,
  }, readJSON(SETTINGS_KEY, {}));

  function readJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) { return fallback; }
  }

  function writeJSON(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* 忽略隐私模式 */ }
  }

  function saveSettings() { writeJSON(SETTINGS_KEY, settings); }

  /* ══════════════════ 2. 模式定义 ══════════════════ */

  const MODE_CONFIG = {
    time:    { subs: [15, 30, 60, 120], subLabel: '时长', subUnit: '秒' },
    words:   { subs: [10, 25, 50, 100], subLabel: '词数', subUnit: '词' },
    quote:   { subs: null, subLabel: '句子' },
    code:    { subs: ['javascript', 'python', 'sql', 'cpp'], subLabel: '语言', isCode: true },
    symbols: { subs: [30, 60, 100], subLabel: '长度', subUnit: '个' },
    chinese: { subs: [3, 6, 10], subLabel: '句数', subUnit: '句', isIME: true },
    custom:  { subs: null, subLabel: '自定义文本' },
  };

  const CODE_LANG_LABEL = {
    javascript: 'JavaScript',
    python: 'Python',
    sql: 'SQL',
    cpp: 'C++',
  };

  /* ══════════════════ 3. 运行状态 ══════════════════ */

  const state = {
    mode: 'time',
    sub: 30,
    text: '',
    chars: [],
    typed: [],
    pos: 0,
    active: false,
    finished: false,
    startTs: 0,
    elapsed: 0,
    samples: [],
    keystrokes: { correct: 0, incorrect: 0 },
    keyErrors: {},
    customText: '',
    timerId: null,
    sampleId: null,
  };

  let charEls = [];
  let lastResult = null;
  let currentOffset = 0;
  let caretReady = false;

  /* ══════════════════ 4. DOM 引用 ══════════════════ */

  const wordsEl = $('#words');
  const wrapEl = $('#typingWrap');
  const caretEl = $('#caret');
  const hintEl = $('#hint');
  const subbarEl = $('#subbar');
  const keyboardEl = $('#keyboard');
  const overlayEl = $('#overlay');
  const imeEl = $('#imeInput');

  const sWpm = $('#sWpm');
  const sAcc = $('#sAcc');
  const sProgress = $('#sProgress');
  const sTime = $('#sTime');
  const sTimeLabel = $('#sTimeLabel');

  /* ══════════════════ 5. 语料生成 ══════════════════ */

  const PUNCT_MARKS = [',', ',', '.', '.', '.', ';', ':', '?', '!'];

  /** 给单词加标点 / 首字母大写，制造更真实的输入流 */
  function decorateWord(word) {
    let w = word;
    if (Math.random() < 0.14) w = w[0].toUpperCase() + w.slice(1);
    if (Math.random() < 0.16) w += pick(PUNCT_MARKS);
    else if (Math.random() < 0.08) w += "'s";
    return w;
  }

  /** 生成一批英文单词，返回按空格连接的字符串 */
  function makeWordStream(count) {
    const pool = Math.random() < 0.78
      ? DATA.wordsCommon
      : DATA.wordsCode.concat(DATA.wordsAdvanced);

    const out = [];
    for (let i = 0; i < count; i++) {
      let w = pool[randInt(pool.length)];
      if (settings.punctuation) w = decorateWord(w);
      if (settings.numbers && Math.random() < 0.12) {
        w = String(randInt(10000)) + (settings.punctuation && Math.random() < 0.3 ? '%' : '');
      }
      out.push(w);
    }
    return out.join(' ');
  }

  /** 生成符号练习串：每 5 个一组，组间留空格 */
  function makeSymbolStream(count) {
    const letters = 'abcdefghijklmnopqrstuvwxyz';
    const symbols = DATA.symbolsRaw + '0123456789';
    const out = [];
    for (let i = 0; i < count; i++) {
      // 约 30% 混入小写字母，模拟「Shift 与普通键交替」
      const useLetter = Math.random() < 0.3;
      out.push(useLetter ? letters[randInt(26)] : symbols[randInt(symbols.length)]);
      if ((i + 1) % 5 === 0 && i !== count - 1) out.push(' ');
    }
    return out.join('');
  }

  /** 生成句子模式文本 */
  function makeQuoteText() {
    const n = 3;
    return shuffle(DATA.quotes).slice(0, n).join(' ');
  }

  /** 生成中文练习文本 */
  function makeChineseText(sentences) {
    const picked = shuffle(DATA.chinese).slice(0, Math.min(sentences, DATA.chinese.length));
    return picked.join('');
  }

  /** 根据当前模式生成完整目标文本 */
  function buildText() {
    const cfg = MODE_CONFIG[state.mode];

    switch (state.mode) {
      case 'time':
        return makeWordStream(240);
      case 'words':
        return makeWordStream(state.sub);
      case 'quote':
        return makeQuoteText();
      case 'code':
        return DATA.code[state.sub] || DATA.code.javascript;
      case 'symbols':
        return makeSymbolStream(state.sub);
      case 'chinese':
        return makeChineseText(state.sub);
      case 'custom':
        if (!state.customText.trim()) return '';
        return state.customText.trim().replace(/\r\n/g, '\n');
      default:
        return makeWordStream(25);
    }
  }

  /* ══════════════════ 6. 渲染 ══════════════════ */

  function buildCharSpan(ch) {
    if (ch === '\n') {
      const br = document.createElement('br');
      return br;
    }
    const span = document.createElement('span');
    span.className = 'char' + (ch === ' ' ? ' space' : '');
    span.textContent = ch === ' ' ? '\u00A0' : ch;
    return span;
  }

  function render() {
    charEls = [];
    const frag = document.createDocumentFragment();

    state.chars.forEach((ch) => {
      const node = buildCharSpan(ch);
      if (node.tagName === 'BR') {
        frag.appendChild(node);
        charEls.push(null);
      } else {
        frag.appendChild(node);
        charEls.push(node);
      }
    });

    wordsEl.innerHTML = '';
    wordsEl.appendChild(frag);
    wordsEl.style.transform = 'translateY(0)';
    currentOffset = 0;
    wrapEl.classList.remove('scrolled');

    paintAll();
    requestAnimationFrame(updateCaret);
  }

  /** 增量追加文本（计时模式用不完的补充语料） */
  function appendText(extra) {
    const frag = document.createDocumentFragment();
    const addChars = Array.from(' ' + extra);

    addChars.forEach((ch) => {
      const node = buildCharSpan(ch);
      if (node.tagName === 'BR') {
        frag.appendChild(node);
        charEls.push(null);
      } else {
        frag.appendChild(node);
        charEls.push(node);
      }
      state.chars.push(ch);
      state.typed.push(null);
    });

    wordsEl.appendChild(frag);
  }

  function paintChar(i) {
    const el = charEls[i];
    if (!el) return;
    const target = state.chars[i];
    const typedCh = state.typed[i];

    el.classList.remove('correct', 'incorrect', 'pending');

    if (typedCh == null) {
      el.classList.add('pending');
    } else if (typedCh === target) {
      el.classList.add('correct');
    } else {
      el.classList.add('incorrect');
    }
  }

  function paintAll() {
    for (let i = 0; i < state.chars.length; i++) paintChar(i);
  }

  /** 光标跟随：定位到当前字符 */
  function updateCaret() {
    const el = charEls[state.pos];
    const wr = wordsEl.getBoundingClientRect();
    const offset = currentOffset; // 内容因滚动产生的位移，需要补偿

    // 首次定位直接落位，不要从左上角滑过来
    if (!caretReady) {
      caretReady = true;
      caretEl.style.transition = 'none';
      requestAnimationFrame(() => { caretEl.style.transition = ''; });
    }

    if (!el) {
      // 已到文本末尾：贴在最后一个字符右侧
      const last = [...charEls].reverse().find(Boolean);
      if (last) {
        const r = last.getBoundingClientRect();
        caretEl.style.left = (r.right - wr.left) + 'px';
        caretEl.style.top = (r.top - wr.top - offset) + 'px';
        caretEl.style.height = r.height + 'px';
      }
      return;
    }

    const r = el.getBoundingClientRect();
    caretEl.style.left = (r.left - wr.left) + 'px';
    caretEl.style.top = (r.top - wr.top - offset) + 'px';
    caretEl.style.height = r.height + 'px';

    scrollToLine(el);
  }

  /** 让当前行保持在容器的第二行位置 */
  function scrollToLine(el) {
    const lineH = parseFloat(getComputedStyle(wordsEl).lineHeight);
    if (!lineH) return;

    const lineIndex = Math.round(el.offsetTop / lineH);
    const next = lineIndex >= 2 ? (lineIndex - 1) * lineH : 0;

    if (next !== currentOffset) {
      currentOffset = next;
      wordsEl.style.transform = `translateY(${-next}px)`;
      wrapEl.classList.toggle('scrolled', next > 0);
      requestAnimationFrame(updateCaret);
    }
  }

  /* ══════════════════ 7. 统计 ══════════════════ */

  function countCorrect() {
    let correct = 0;
    let wrong = 0;
    for (let i = 0; i < state.pos; i++) {
      if (state.typed[i] == null) continue;
      if (state.typed[i] === state.chars[i]) correct++;
      else wrong++;
    }
    return { correct, wrong };
  }

  function computeStats() {
    const elapsedSec = Math.max(state.elapsed, 1);
    const minutes = elapsedSec / 60;
    const { correct, wrong } = countCorrect();

    // 中文按「字/分」，其余按 WPM（5 字符 = 1 词）
    const perUnit = state.mode === 'chinese' ? 1 : 5;
    const wpm = (correct / perUnit) / minutes;
    const raw = (state.pos / perUnit) / minutes;

    const totalKeys = state.keystrokes.correct + state.keystrokes.incorrect;
    const acc = totalKeys > 0
      ? (state.keystrokes.correct / totalKeys) * 100
      : 100;

    return {
      wpm: Math.max(0, wpm),
      raw: Math.max(0, raw),
      acc: Math.max(0, Math.min(100, acc)),
      correct,
      wrong,
      typed: state.pos,
      elapsed: state.elapsed,
    };
  }

  /** 一致性：每秒速度的稳定程度（1 - 变异系数） */
  function computeConsistency(samples) {
    const vals = samples.map((s) => s.raw).filter((v) => v > 0);
    if (vals.length < 2) return 100;
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    if (mean <= 0) return 100;
    const variance = vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length;
    const cv = Math.sqrt(variance) / mean;
    return Math.max(0, Math.min(100, (1 - cv) * 100));
  }

  function refreshHud() {
    const st = computeStats();

    sWpm.textContent = fmt(st.wpm);
    sAcc.textContent = fmt(st.acc) + '%';

    const total = state.chars.length;
    sProgress.textContent = state.mode === 'time'
      ? String(st.typed)
      : `${st.typed}/${total}`;

    if (state.mode === 'time') {
      const left = Math.max(0, state.sub - Math.floor(state.elapsed));
      sTime.textContent = left;
      sTimeLabel.textContent = '剩余';
    } else {
      sTime.textContent = fmt(state.elapsed, 1) + 's';
      sTimeLabel.textContent = '用时';
    }
  }

  /* ══════════════════ 8. 音效 ══════════════════ */

  let audioCtx = null;

  function beep(ok) {
    if (!settings.sound) return;
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();

      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      const t = audioCtx.currentTime;

      osc.type = ok ? 'sine' : 'square';
      osc.frequency.setValueAtTime(ok ? 1180 : 190, t);

      gain.gain.setValueAtTime(ok ? 0.035 : 0.05, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + (ok ? 0.045 : 0.09));

      osc.connect(gain).connect(audioCtx.destination);
      osc.start(t);
      osc.stop(t + 0.1);
    } catch (e) { /* 静默失败 */ }
  }

  /* ══════════════════ 9. 计时与生命周期 ══════════════════ */

  function startRun() {
    if (state.active) return;
    state.active = true;
    state.startTs = performance.now();
    wrapEl.classList.remove('idle');
    caretEl.classList.remove('blink');
    hintEl.classList.add('hidden');

    state.timerId = setInterval(onTick, 100);
    state.sampleId = setInterval(takeSample, 500);
  }

  function stopTimers() {
    clearInterval(state.timerId);
    clearInterval(state.sampleId);
    state.timerId = null;
    state.sampleId = null;
  }

  function onTick() {
    if (!state.active || state.finished) return;
    state.elapsed = (performance.now() - state.startTs) / 1000;

    if (state.mode === 'time' && state.elapsed >= state.sub) {
      state.elapsed = state.sub;
      finishRun();
      return;
    }
    refreshHud();
  }

  function takeSample(force) {
    if (!force && (!state.active || state.finished)) return;
    const st = computeStats();
    state.samples.push({
      t: state.elapsed,
      wpm: st.wpm,
      raw: st.raw,
      wrong: st.wrong,
    });
  }

  /** 检查是否已打完（非计时模式） */
  function checkComplete() {
    if (state.mode === 'time') {
      // 计时模式：语料将尽时补充
      if (state.pos >= state.chars.length - 30) {
        appendText(makeWordStream(80));
      }
      return;
    }
    if (state.pos >= state.chars.length) finishRun();
  }

  /* ══════════════════ 10. 输入处理 ══════════════════ */

  function handleChar(ch) {
    if (state.finished) return;
    if (!state.active) startRun();

    const i = state.pos;
    const target = state.chars[i];
    if (target === undefined) return;

    const ok = ch === target;

    if (ok) {
      state.typed[i] = ch;
      state.keystrokes.correct++;
      state.pos++;
      paintChar(i);
      beep(true);
    } else {
      state.keystrokes.incorrect++;
      state.keyErrors[target] = (state.keyErrors[target] || 0) + 1;
      beep(false);

      if (settings.strict) {
        // 严格模式：必须改正才能继续，错误不计入文本
        state.typed[i] = null;
        paintChar(i);
        flashKey(target, false);
        return;
      }

      state.typed[i] = ch;
      state.pos++;
      paintChar(i);
    }

    updateCaret();
    highlightNext();
    flashKey(target, ok);
    refreshHud();
    checkComplete();
  }

  function handleBackspace() {
    if (state.finished) return;

    if (state.pos === 0) return;

    // 退回到上一个位置，清除该位置记录
    state.pos--;
    state.typed[state.pos] = null;
    paintChar(state.pos);
    updateCaret();
    highlightNext();
    refreshHud();
  }

  function finishRun() {
    if (state.finished) return;

    if (state.mode !== 'time') {
      state.elapsed = (performance.now() - state.startTs) / 1000;
    }

    // 先补一个末尾采样，避免曲线断在半路
    takeSample(true);

    state.finished = true;
    state.active = false;
    stopTimers();

    refreshHud();

    caretEl.classList.add('blink');
    wrapEl.classList.add('idle');

    const st = computeStats();
    const consistency = computeConsistency(state.samples);

    lastResult = {
      mode: state.mode,
      sub: state.sub,
      wpm: st.wpm,
      raw: st.raw,
      acc: st.acc,
      consistency,
      correct: st.correct,
      wrong: st.wrong,
      typed: st.typed,
      elapsed: state.elapsed,
      samples: state.samples.slice(),
      keyErrors: Object.assign({}, state.keyErrors),
      ts: Date.now(),
    };

    const best = saveRecord(lastResult);
    lastResult.isBest = best.isBest;
    lastResult.prevBest = best.prevBest;

    setTimeout(() => showResults(lastResult), 220);
  }

  /* ══════════════════ 11. 键盘事件 ══════════════════ */

  const IGNORE_KEYS = new Set([
    'Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'AltGraph',
    'Dead', 'Process', 'Compose', 'ContextMenu', 'Unidentified',
    'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
    'Home', 'End', 'PageUp', 'PageDown', 'Insert',
    'F1', 'F2', 'F3', 'F4', 'F5', 'F6',
    'F7', 'F8', 'F9', 'F10', 'F11', 'F12',
  ]);

  window.addEventListener('keydown', (e) => {
    // 面板打开时：只响应 Esc
    if (overlayEl.classList.contains('show')) {
      if (e.key === 'Escape') closeOverlay();
      return;
    }

    // 正在编辑自定义文本时放行
    if (e.target && (e.target.tagName === 'TEXTAREA' && e.target.id !== 'imeInput')) return;

    if (e.key === 'Tab') {
      e.preventDefault();
      restart();
      return;
    }

    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (IGNORE_KEYS.has(e.key)) return;

    // 中文模式：交给输入法，只处理删除与回车
    if (MODE_CONFIG[state.mode].isIME) {
      // 输入法捕获框失焦时，用户一敲键就把它拉回来
      if (document.activeElement !== imeEl) imeEl.focus();
      if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      }
      return;
    }

    if (e.key === 'Backspace') {
      e.preventDefault();
      handleBackspace();
      return;
    }

    if (e.key === 'Enter') {
      if (state.mode === 'code') {
        e.preventDefault();
        handleChar('\n');
      }
      return;
    }

    if (e.key.length === 1) {
      e.preventDefault();
      handleChar(e.key);
    }
  });

  /* ---------- 中文输入法捕获 ---------- */

  imeEl.addEventListener('input', (e) => {
    if (e.isComposing) return;

    const value = imeEl.value;
    if (!value) return;

    if (e.inputType === 'deleteContentBackward') {
      imeEl.value = '';
      handleBackspace();
      return;
    }

    // 逐字喂给引擎，兼容一次上屏多个汉字
    const chars = Array.from(value);
    imeEl.value = '';
    chars.forEach((ch) => {
      if (ch === '\n') return;
      handleChar(ch);
    });
  });

  imeEl.addEventListener('compositionend', () => {
    // 保底：部分输入法 compositionend 后 input 不触发
    const value = imeEl.value;
    if (!value) return;
    const chars = Array.from(value);
    imeEl.value = '';
    chars.forEach((ch) => handleChar(ch));
  });

  /* ══════════════════ 12. 生命周期控制 ══════════════════ */

  /**
   * 重开一轮。不传参数时会重新生成题目文本；
   * 传入文本则使用该文本（自定义模式）。
   */
  function restart(newText) {
    stopTimers();
    closeOverlay();

    state.pos = 0;
    state.active = false;
    state.finished = false;
    state.startTs = 0;
    state.elapsed = 0;
    state.samples = [];
    state.keystrokes = { correct: 0, incorrect: 0 };
    state.keyErrors = {};

    const text = newText != null ? newText : buildText();
    state.text = text;
    state.chars = Array.from(text);
    state.typed = new Array(state.chars.length).fill(null);

    wrapEl.classList.add('idle');
    wrapEl.classList.remove('scrolled');
    currentOffset = 0;
    caretReady = false;
    caretEl.classList.add('blink');
    hintEl.classList.remove('hidden');

    render();
    refreshHud();
    highlightNext();

    if (MODE_CONFIG[state.mode].isIME) {
      imeEl.value = '';
      imeEl.focus();
    }
  }

  function setMode(mode) {
    state.mode = mode;
    const cfg = MODE_CONFIG[mode];
    state.sub = cfg.subs ? cfg.subs[Math.min(1, cfg.subs.length - 1)] : null;
    if (mode === 'time') state.sub = 30;
    if (mode === 'words') state.sub = 25;
    if (mode === 'code') state.sub = 'javascript';
    if (mode === 'symbols') state.sub = 60;
    if (mode === 'chinese') state.sub = 6;

    document.querySelectorAll('#modeNav button').forEach((b) => {
      b.classList.toggle('active', b.dataset.mode === mode);
    });
    wrapEl.dataset.mode = mode;

    buildSubbar();
    syncKeyboardVisibility();
    restart();
  }

  /* ══════════════════ 13. 子选项栏 ══════════════════ */

  function buildSubbar() {
    const cfg = MODE_CONFIG[state.mode];
    subbarEl.innerHTML = '';

    if (!cfg.subs) {
      if (state.mode === 'custom') {
        const btn = document.createElement('button');
        btn.className = 'chip active';
        btn.textContent = '编辑文本…';
        btn.onclick = openCustomEditor;
        subbarEl.appendChild(btn);

        const tip = document.createElement('span');
        tip.className = 'label';
        tip.textContent = state.customText
          ? `当前自定义文本 ${Array.from(state.customText).length} 字符`
          : '尚未设置文本';
        subbarEl.appendChild(tip);
      } else {
        const tip = document.createElement('span');
        tip.className = 'label';
        tip.textContent = `当前题量：${state.chars.length} 字符`;
        subbarEl.appendChild(tip);
      }
      return;
    }

    const label = document.createElement('span');
    label.className = 'label';
    label.textContent = cfg.subLabel;
    subbarEl.appendChild(label);

    cfg.subs.forEach((sub) => {
      const btn = document.createElement('button');
      btn.className = 'chip' + (sub === state.sub ? ' active' : '');
      btn.textContent = cfg.isCode
        ? CODE_LANG_LABEL[sub]
        : (cfg.subUnit ? sub + cfg.subUnit : sub);
      btn.onclick = () => {
        state.sub = sub;
        buildSubbar();
        restart();
      };
      subbarEl.appendChild(btn);
    });

    // 单词模式追加标点 / 数字开关
    if (state.mode === 'words' || state.mode === 'time') {
      const div = document.createElement('span');
      div.className = 'divider';
      subbarEl.appendChild(div);

      [['punctuation', '标点'], ['numbers', '数字']].forEach(([key, text]) => {
        const btn = document.createElement('button');
        btn.className = 'chip' + (settings[key] ? ' active' : '');
        btn.textContent = text;
        btn.onclick = () => {
          settings[key] = !settings[key];
          saveSettings();
          buildSubbar();
          restart();
        };
        subbarEl.appendChild(btn);
      });
    }
  }

  /* ══════════════════ 14. 结果面板 ══════════════════ */

  function modeLabel(rec) {
    const cfg = MODE_CONFIG[rec.mode];
    if (rec.mode === 'code') return `代码 · ${CODE_LANG_LABEL[rec.sub] || rec.sub}`;
    if (rec.mode === 'custom') return '自定义文本';
    if (rec.mode === 'quote') return '句子';
    if (cfg.subUnit) return `${cfg.subLabel} ${rec.sub}${cfg.subUnit}`;
    return cfg.subLabel;
  }

  function showResults(r) {
    const isChinese = r.mode === 'chinese';
    const speedUnit = isChinese ? '字 / 分' : 'WPM';
    const consistency = fmt(r.consistency);
    const durationTxt = r.mode === 'time' ? `${r.sub}s` : fmt(r.elapsed, 1) + 's';

    const deltaHtml = r.isBest
      ? '<div class="delta up">★ 新纪录</div>'
      : (r.prevBest != null
        ? `<div class="delta">个人最佳 ${fmt(r.prevBest)} ${isChinese ? '字/分' : 'WPM'}</div>`
        : '');

    const speedTxt = fmt(r.wpm);

    const topErrors = Object.entries(r.keyErrors)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([k, v]) => `${k === ' ' ? '空格' : k} ×${v}`)
      .join('　');

    overlayEl.innerHTML = `
      <div class="panel" role="dialog" aria-modal="true">
        <div class="panel-head">
          <div>
            <h2>本轮成绩</h2>
            <div class="sub">${modeLabel(r)}　·　${durationTxt}</div>
          </div>
          <button class="close-btn" data-act="close" title="关闭 (Esc)">
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor"
                 stroke-width="2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div class="result-grid">
          <div class="result-hero">
            <div class="big ${speedTxt.length > 4 ? 'small' : ''}">${speedTxt}</div>
            <div class="unit">${speedUnit}</div>
            ${deltaHtml}
          </div>

          <div class="result-metrics">
            <div class="metric"><b>${fmt(r.acc)}%</b><span>准确率</span></div>
            <div class="metric"><b>${consistency}%</b><span>一致性</span></div>
            <div class="metric"><b>${fmt(r.raw)}</b><span>原始速度</span></div>
            <div class="metric"><b>${r.correct}</b><span>正确字符</span></div>
            <div class="metric"><b>${r.wrong}</b><span>错误字符</span></div>
            <div class="metric"><b>${fmt(r.elapsed, 1)}s</b><span>实际用时</span></div>
          </div>
        </div>

        <div class="chart-box">
          <h3>速度曲线</h3>
          <canvas id="chart"></canvas>
        </div>

        ${topErrors ? `<div class="chart-box" style="margin-top:14px"><h3>易错按键</h3>
          <div style="font-family:var(--mono);font-size:14px;padding-bottom:12px;color:var(--text-soft)">${escapeHtml(topErrors)}</div>
        </div>` : ''}

        <div class="result-actions">
          <button class="btn btn-primary" data-act="again">再来一轮 (Tab)</button>
          <button class="btn btn-ghost" data-act="history">历史记录</button>
          <button class="btn btn-ghost" data-act="close">关闭</button>
        </div>
      </div>
    `;

    overlayEl.classList.add('show');
    drawChart(r.samples);

    overlayEl.querySelectorAll('[data-act]').forEach((btn) => {
      btn.onclick = () => {
        const act = btn.dataset.act;
        if (act === 'again') restart();
        else if (act === 'history') openHistory();
        else closeOverlay();
      };
    });
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
  }

  function closeOverlay() {
    overlayEl.classList.remove('show');
    overlayEl.innerHTML = '';
    if (MODE_CONFIG[state.mode].isIME && !state.finished) imeEl.focus();
  }

  /* ══════════════════ 15. 速度曲线绘制 ══════════════════ */

  function drawChart(samples) {
    const canvas = $('#chart');
    if (!canvas) return;

    const css = getComputedStyle(document.documentElement);
    const accent = css.getPropertyValue('--accent').trim() || '#3d7eff';
    const errorCol = css.getPropertyValue('--error').trim() || '#e5484d';
    const dimCol = css.getPropertyValue('--text-dim').trim() || '#c3c8d2';
    const softCol = css.getPropertyValue('--border').trim() || '#e6e8ee';

    const dpr = window.devicePixelRatio || 1;
    const W = canvas.clientWidth;
    const H = canvas.clientHeight || 150;
    canvas.width = W * dpr;
    canvas.height = H * dpr;

    const ctx = canvas.getContext && canvas.getContext('2d');
    if (!ctx) return; // 环境不支持 canvas 时跳过绘制

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    const pad = { l: 34, r: 10, t: 12, b: 20 };
    const innerW = W - pad.l - pad.r;
    const innerH = H - pad.t - pad.b;

    const data = samples.filter((s) => s.t > 0);
    if (data.length < 2) {
      ctx.fillStyle = dimCol;
      ctx.font = '12px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('数据太少，无法绘制曲线', W / 2, H / 2);
      return;
    }

    let maxV = Math.max(...data.map((s) => Math.max(s.raw, s.wpm)), 10);
    maxV = Math.ceil(maxV / 10) * 10;
    const maxT = Math.max(data[data.length - 1].t, 1);

    const x = (t) => pad.l + (t / maxT) * innerW;
    const y = (v) => pad.t + innerH - (v / maxV) * innerH;

    // 网格与刻度
    ctx.strokeStyle = softCol;
    ctx.lineWidth = 1;
    ctx.fillStyle = dimCol;
    ctx.font = '10px ui-monospace, monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    for (let i = 0; i <= 3; i++) {
      const v = (maxV / 3) * i;
      const yy = Math.round(y(v)) + 0.5;
      ctx.beginPath();
      ctx.moveTo(pad.l, yy);
      ctx.lineTo(W - pad.r, yy);
      ctx.stroke();
      ctx.fillText(String(Math.round(v)), pad.l - 7, yy);
    }

    // 原始速度区域
    ctx.beginPath();
    ctx.moveTo(x(data[0].t), y(data[0].raw));
    data.forEach((s) => ctx.lineTo(x(s.t), y(s.raw)));
    ctx.lineTo(x(data[data.length - 1].t), pad.t + innerH);
    ctx.lineTo(x(data[0].t), pad.t + innerH);
    ctx.closePath();
    ctx.fillStyle = hexToRgba(accent, 0.10);
    ctx.fill();

    // 原始速度线（虚线）
    ctx.beginPath();
    data.forEach((s, i) => {
      const px = x(s.t);
      const py = y(s.raw);
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    });
    ctx.strokeStyle = hexToRgba(accent, 0.45);
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    ctx.stroke();
    ctx.setLineDash([]);

    // 净速度线（实线）
    ctx.beginPath();
    data.forEach((s, i) => {
      const px = x(s.t);
      const py = y(s.wpm);
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    });
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2.2;
    ctx.lineJoin = 'round';
    ctx.stroke();

    // 出错的采样点
    data.forEach((s) => {
      if (s.wrong > 0) {
        ctx.beginPath();
        ctx.arc(x(s.t), y(s.wpm), 2.6, 0, Math.PI * 2);
        ctx.fillStyle = errorCol;
        ctx.fill();
      }
    });

    // 时间轴
    ctx.textAlign = 'left';
    ctx.fillStyle = dimCol;
    ctx.fillText('0s', pad.l, H - 8);
    ctx.textAlign = 'right';
    ctx.fillText(`${fmt(maxT, 1)}s`, W - pad.r, H - 8);
  }

  function hexToRgba(hex, alpha) {
    const h = hex.replace('#', '');
    const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
    const num = parseInt(full.slice(0, 6), 16);
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return `rgba(${r},${g},${b},${alpha})`;
  }

  /* ══════════════════ 16. 本地记录 ══════════════════ */

  const RECORDS_KEY = 'typingflow.records.v1';
  const BESTS_KEY = 'typingflow.bests.v1';
  const MAX_RECORDS = 300;

  function recordKey(mode, sub) { return `${mode}:${sub}`; }

  function saveRecord(r) {
    const records = readJSON(RECORDS_KEY, []);
    const bests = readJSON(BESTS_KEY, {});
    const key = recordKey(r.mode, r.sub);
    const prevBest = typeof bests[key] === 'number' ? bests[key] : null;

    // 只记录有效成绩（避免 0 秒乱点刷榜）
    const valid = r.typed >= 5 && r.elapsed >= 1;

    const entry = {
      mode: r.mode,
      sub: r.sub,
      wpm: r.wpm,
      acc: r.acc,
      consistency: r.consistency,
      typed: r.typed,
      wrong: r.wrong,
      elapsed: r.elapsed,
      ts: r.ts,
    };

    records.unshift(entry);
    if (records.length > MAX_RECORDS) records.length = MAX_RECORDS;
    writeJSON(RECORDS_KEY, records);

    let isBest = false;
    if (valid && (prevBest == null || r.wpm > prevBest)) {
      bests[key] = r.wpm;
      writeJSON(BESTS_KEY, bests);
      isBest = true;
    }

    return { isBest, prevBest };
  }

  function getBest(mode, sub) {
    const bests = readJSON(BESTS_KEY, {});
    const v = bests[recordKey(mode, sub)];
    return typeof v === 'number' ? v : null;
  }

  /* ══════════════════ 17. 记录面板 ══════════════════ */

  function openHistory() {
    const records = readJSON(RECORDS_KEY, []);

    const rows = records.slice(0, 40).map((r) => `
      <div class="record-row">
        <span class="rmode">${modeLabel(r)}</span>
        <span class="rnum">${fmt(r.wpm)} <small style="opacity:.5;font-weight:400">WPM</small></span>
        <span class="rnum">${fmt(r.acc)}%</span>
        <span class="rdate">${formatDate(r.ts)}</span>
      </div>
    `).join('');

    overlayEl.innerHTML = `
      <div class="panel narrow" role="dialog" aria-modal="true" style="max-width:640px">
        <div class="panel-head">
          <div>
            <h2>历史记录</h2>
            <div class="sub">共 ${records.length} 条　·　保存在本机浏览器</div>
          </div>
          <button class="close-btn" data-act="close" title="关闭 (Esc)">
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor"
                 stroke-width="2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div class="records">
          ${records.length ? rows : '<div class="empty">还没有记录，先完成一轮练习吧</div>'}
        </div>

        <div class="result-actions">
          <button class="btn btn-ghost" data-act="clear">清空全部记录</button>
          <button class="btn btn-primary" data-act="close">关闭</button>
        </div>
      </div>
    `;

    overlayEl.classList.add('show');

    overlayEl.querySelectorAll('[data-act]').forEach((btn) => {
      btn.onclick = () => {
        if (btn.dataset.act === 'clear') {
          if (confirm('确定要清空全部历史记录与个人最佳成绩吗？此操作不可撤销。')) {
            writeJSON(RECORDS_KEY, []);
            writeJSON(BESTS_KEY, {});
            openHistory();
          }
          return;
        }
        closeOverlay();
      };
    });
  }

  function formatDate(ts) {
    const d = new Date(ts);
    const p = (n) => String(n).padStart(2, '0');
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    return sameDay
      ? `${p(d.getHours())}:${p(d.getMinutes())}`
      : `${d.getMonth() + 1}/${d.getDate()} ${p(d.getHours())}:${p(d.getMinutes())}`;
  }

  /* ══════════════════ 18. 设置面板 ══════════════════ */

  function openSettings() {
    overlayEl.innerHTML = `
      <div class="panel narrow" role="dialog" aria-modal="true">
        <div class="panel-head">
          <div>
            <h2>设置</h2>
            <div class="sub">偏好会自动保存在本机</div>
          </div>
          <button class="close-btn" data-act="close" title="关闭 (Esc)">
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor"
                 stroke-width="2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div class="setting">
          <div class="setting-text">
            <h4>外观主题</h4>
            <p>浅色适合白天，深色更护眼</p>
          </div>
          <div class="seg" data-seg="theme">
            <button data-val="light" class="${settings.theme === 'light' ? 'active' : ''}">浅色</button>
            <button data-val="dark" class="${settings.theme === 'dark' ? 'active' : ''}">深色</button>
          </div>
        </div>

        ${toggleRow('punctuation', '标点符号', '在词流中随机加入逗号、句号、引号等')}
        ${toggleRow('numbers', '数字', '随机插入数字，练习数字键位')}
        ${toggleRow('strict', '严格模式', '必须改正错误才能继续，强迫准确率')}
        ${toggleRow('sound', '按键音', '用合成音反馈正确与错误')}
        ${toggleRow('keyboard', '虚拟键盘', '在底部显示键位提示并高亮下一个键')}
      </div>
    `;

    overlayEl.classList.add('show');

    overlayEl.querySelectorAll('[data-seg="theme"] button').forEach((btn) => {
      btn.onclick = () => {
        settings.theme = btn.dataset.val;
        applyTheme();
        saveSettings();
        openSettings();
      };
    });

    overlayEl.querySelectorAll('[data-toggle]').forEach((el) => {
      el.onclick = () => {
        const key = el.dataset.toggle;
        settings[key] = !settings[key];
        saveSettings();
        syncKeyboardVisibility();
        el.classList.toggle('on', settings[key]);
        if (key === 'keyboard') highlightNext();
      };
    });

    overlayEl.querySelector('[data-act="close"]').onclick = closeOverlay;
  }

  function toggleRow(key, title, desc) {
    return `
      <div class="setting">
        <div class="setting-text"><h4>${title}</h4><p>${desc}</p></div>
        <div class="switch ${settings[key] ? 'on' : ''}" data-toggle="${key}"></div>
      </div>
    `;
  }

  /* ══════════════════ 19. 自定义文本编辑 ══════════════════ */

  function openCustomEditor() {
    overlayEl.innerHTML = `
      <div class="panel narrow" role="dialog" aria-modal="true" style="max-width:680px">
        <div class="panel-head">
          <div>
            <h2>自定义练习文本</h2>
            <div class="sub">粘贴任意内容：文章、单词表、代码片段皆可</div>
          </div>
          <button class="close-btn" data-act="close" title="关闭 (Esc)">
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor"
                 stroke-width="2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <textarea class="custom-area" id="customArea"
          placeholder="在此粘贴要练习的文本…">${escapeHtml(state.customText)}</textarea>

        <div class="result-actions">
          <button class="btn btn-primary" data-act="save">开始练习</button>
          <button class="btn btn-ghost" data-act="close">取消</button>
        </div>
      </div>
    `;

    overlayEl.classList.add('show');
    const area = $('#customArea');
    area.focus();

    const commit = () => {
      state.customText = area.value.trim();
      closeOverlay();
      buildSubbar();
      if (state.customText) restart();
    };

    overlayEl.querySelector('[data-act="save"]').onclick = commit;
    overlayEl.querySelector('[data-act="close"]').onclick = closeOverlay;
  }

  /* ══════════════════ 20. 虚拟键盘 ══════════════════ */

  const KB_LAYOUT = [
    [['`', '~'], ['1', '!'], ['2', '@'], ['3', '#'], ['4', '$'], ['5', '%'], ['6', '^'],
     ['7', '&'], ['8', '*'], ['9', '('], ['0', ')'], ['-', '_'], ['=', '+'], ['Backspace', '⌫', 'wide']],
    [['Tab', 'Tab', 'wide'], ['q', 'Q'], ['w', 'W'], ['e', 'E'], ['r', 'R'], ['t', 'T'],
     ['y', 'Y'], ['u', 'U'], ['i', 'I'], ['o', 'O'], ['p', 'P'], ['[', '{'], [']', '}'], ['\\', '|']],
    [['CapsLock', 'Caps', 'wide'], ['a', 'A'], ['s', 'S'], ['d', 'D'], ['f', 'F'], ['g', 'G'],
     ['h', 'H'], ['j', 'J'], ['k', 'K'], ['l', 'L'], [';', ':'], ["'", '"'], ['Enter', '↵', 'wide']],
    [['Shift', 'Shift', 'wide'], ['z', 'Z'], ['x', 'X'], ['c', 'C'], ['v', 'V'], ['b', 'B'],
     ['n', 'N'], ['m', 'M'], [',', '<'], ['.', '>'], ['/', '?'], ['Shift', 'Shift', 'wide']],
    [[' ', 'Space', 'space']],
  ];

  const SHIFT_CHARS = '~!@#$%^&*()_+{}|:"<>?';

  const keyNodes = new Map();

  function buildKeyboard() {
    keyboardEl.innerHTML = '';
    keyNodes.clear();

    KB_LAYOUT.forEach((row) => {
      const rowEl = document.createElement('div');
      rowEl.className = 'kb-row';

      row.forEach(([base, label, cls]) => {
        const k = document.createElement('div');
        k.className = 'key' + (cls ? ' ' + cls : '');
        k.textContent = label;
        rowEl.appendChild(k);
        keyNodes.set(base, k);
      });

      keyboardEl.appendChild(rowEl);
    });
  }

  /** 目标字符 → 需要按下的键 */
  function resolveKey(ch) {
    if (ch === ' ') return { key: ' ', shift: false };
    if (ch === '\n') return { key: 'Enter', shift: false };
    if (ch === '\t') return { key: 'Tab', shift: false };

    if (/[A-Z]/.test(ch)) return { key: ch.toLowerCase(), shift: true };
    if (SHIFT_CHARS.includes(ch)) {
      const pairs = {
        '~': '`', '!': '1', '@': '2', '#': '3', '$': '4', '%': '5', '^': '6',
        '&': '7', '*': '8', '(': '9', ')': '0', '_': '-', '+': '=',
        '{': '[', '}': ']', '|': '\\', ':': ';', '"': "'", '<': ',', '>': '.', '?': '/',
      };
      return { key: pairs[ch] || ch, shift: true };
    }
    if (/[a-z0-9`\-=\[\]\\;',./]/.test(ch)) return { key: ch, shift: false };
    return null;
  }

  function highlightNext() {
    if (!settings.keyboard) return;
    clearKeyHighlight();

    const ch = state.chars[state.pos];
    if (ch === undefined) return;
    const info = resolveKey(ch);
    if (!info) return;

    const k = keyNodes.get(info.key);
    if (k) k.classList.add('active');

    if (info.shift) {
      const sk = keyNodes.get('Shift');
      if (sk) sk.classList.add('active');
    }
  }

  function clearKeyHighlight() {
    keyNodes.forEach((k) => k.classList.remove('active'));
  }

  let flashTimers = [];

  function flashKey(target, ok) {
    if (!settings.keyboard) return;
    const info = resolveKey(target);
    if (!info) return;
    const k = keyNodes.get(info.key);
    if (!k) return;

    const cls = ok ? 'hit' : 'error-hit';
    k.classList.add(cls);
    const timer = setTimeout(() => k.classList.remove(cls), 110);
    flashTimers.push(timer);
    if (flashTimers.length > 40) {
      flashTimers = flashTimers.slice(-20);
    }
  }

  function syncKeyboardVisibility() {
    const visible = settings.keyboard && !MODE_CONFIG[state.mode].isIME;
    keyboardEl.classList.toggle('show', visible);
    $('#kbBtn').classList.toggle('on', settings.keyboard);
  }

  /* ══════════════════ 21. 主题 ══════════════════ */

  function applyTheme() {
    document.documentElement.setAttribute('data-theme', settings.theme);
    const btn = $('#themeBtn');
    btn.classList.toggle('on', settings.theme === 'dark');
  }

  /* ══════════════════ 22. 事件绑定 ══════════════════ */

  $('#modeNav').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-mode]');
    if (!btn) return;
    setMode(btn.dataset.mode);
  });

  $('#restartBtn').onclick = () => restart();
  $('#brand').onclick = (e) => { e.preventDefault(); restart(); };
  $('#recordsBtn').onclick = openHistory;
  $('#settingsBtn').onclick = openSettings;

  $('#themeBtn').onclick = () => {
    settings.theme = settings.theme === 'light' ? 'dark' : 'light';
    saveSettings();
    applyTheme();
    if (overlayEl.classList.contains('show') && lastResult && $('#chart')) {
      drawChart(lastResult.samples);
    }
  };

  $('#kbBtn').onclick = () => {
    settings.keyboard = !settings.keyboard;
    saveSettings();
    syncKeyboardVisibility();
    highlightNext();
  };

  // 点击打字区获取焦点（中文模式需要聚焦输入框）
  wrapEl.addEventListener('click', () => {
    if (MODE_CONFIG[state.mode].isIME) imeEl.focus();
  });

  // 失焦提示
  window.addEventListener('blur', () => {
    if (!state.finished && state.active) wrapEl.classList.add('focus-out');
  });
  window.addEventListener('focus', () => wrapEl.classList.remove('focus-out'));

  // 窗口尺寸变化时重绘（行宽变化会影响光标位置）
  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      updateCaret();
      if (overlayEl.classList.contains('show') && lastResult && $('#chart')) {
        drawChart(lastResult.samples);
      }
    }, 120);
  });

  /* ══════════════════ 23. 初始化 ══════════════════ */

  let booted = false;

  function init() {
    if (booted) return;
    booted = true;

    applyTheme();
    buildKeyboard();

    state.mode = 'time';
    state.sub = 30;
    state.customText = readJSON('typingflow.custom.v1', '');

    buildSubbar();
    syncKeyboardVisibility();
    restart();
    refreshHud();

    const best = getBest('time', 30);
    if (best != null) {
      hintEl.textContent =
        `开始输入以计时 ｜ 按 Tab 重开 ｜ 30 秒个人最佳 ${fmt(best)} WPM`;
    }
  }

  // 自定义文本变化时持久化
  window.addEventListener('beforeunload', () => {
    if (state.customText) writeJSON('typingflow.custom.v1', state.customText);
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
