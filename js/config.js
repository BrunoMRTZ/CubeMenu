/* MenuCubo – página de configuração */
(function () {
  'use strict';
  const MC = window.MenuCubo;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  let cfg = MC.load();
  let faceIdx = 0;
  const face = () => cfg.faces[faceIdx];

  const frame = $('#previewFrame');
  const statusEl = $('#status');

  const FACE_PRESETS = [
    ['#4f46e5', '#7c3aed', '#ffffff'], ['#0f766e', '#0e7490', '#ffffff'], ['#dc2626', '#ea580c', '#ffffff'],
    ['#db2777', '#9333ea', '#ffffff'], ['#d97706', '#b45309', '#ffffff'], ['#16a34a', '#065f46', '#ffffff'],
    ['#0ea5e9', '#2563eb', '#ffffff'], ['#111827', '#374151', '#f9fafb'], ['#f8fafc', '#cbd5e1', '#0f172a'],
    ['#fde68a', '#f59e0b', '#1f2937'], ['#a7f3d0', '#34d399', '#064e3b'], ['#fbcfe8', '#f472b6', '#500724'],
    ['#1e293b', '#0f172a', '#38bdf8'], ['#7f1d1d', '#450a0a', '#fecaca']
  ];
  const BG_PRESETS = [
    { type: 'animated', color1: '#0f172a', color2: '#1e1b4b', color3: '#312e81', effect: 'stars' },
    { type: 'animated', color1: '#ff6a88', color2: '#ff99ac', color3: '#fcb69f', effect: 'bubbles' },
    { type: 'animated', color1: '#00c6ff', color2: '#0072ff', color3: '#7f00ff', effect: 'bubbles' },
    { type: 'gradient', color1: '#141e30', color2: '#243b55', effect: 'stars' },
    { type: 'gradient', color1: '#134e5e', color2: '#71b280', effect: 'none' },
    { type: 'gradient', color1: '#232526', color2: '#414345', effect: 'none' },
    { type: 'solid', color1: '#000000', effect: 'stars' },
    { type: 'solid', color1: '#f1f5f9', effect: 'none' }
  ];

  /* ---------- Utilidades ---------- */
  const getPath = (o, p) => p.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
  function setPath(o, p, v) {
    const ks = p.split('.'); const last = ks.pop();
    ks.reduce((a, k) => a[k], o)[last] = v;
  }
  function readInput(el) {
    if (el.type === 'checkbox') return el.checked;
    if (el.type === 'range' || el.type === 'number' || el.dataset.type === 'number') return parseFloat(el.value);
    return el.value;
  }
  function writeInput(el, v) {
    if (el.type === 'checkbox') el.checked = !!v;
    else el.value = v ?? '';
    showOutput(el);
  }
  function showOutput(el) {
    const out = el.parentElement && el.parentElement.querySelector('output');
    if (out) out.textContent = el.value;
  }
  function esc(t) {
    return String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 2200);
  }

  /* ---------- Salvamento + pré-visualização ---------- */
  let saveTimer = 0;
  function commit(opts = {}) {
    statusEl.textContent = 'Salvando…'; statusEl.classList.add('saving');
    pushPreview();
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      const ok = MC.save(cfg);
      statusEl.textContent = ok ? 'Tudo salvo ✓' : 'Erro ao salvar ✗';
      statusEl.classList.remove('saving');
    }, 250);
    if (opts.chips !== false) renderChips();
    updateVisibility();
  }
  let pushRaf = 0;
  function pushPreview() {
    cancelAnimationFrame(pushRaf);
    pushRaf = requestAnimationFrame(() => {
      try { frame.contentWindow.postMessage({ type: 'menucubo:config', config: cfg }, '*'); } catch { /* ignore */ }
    });
  }
  function previewGoto(id) {
    try { frame.contentWindow.postMessage({ type: 'menucubo:goto', face: id }, '*'); } catch { /* ignore */ }
  }
  frame.addEventListener('load', () => { pushPreview(); setTimeout(() => previewGoto(face().id), 300); });

  /* ---------- Abas ---------- */
  $('#tabs').addEventListener('click', e => {
    const b = e.target.closest('.tab'); if (!b) return;
    $$('.tab').forEach(t => t.classList.toggle('active', t === b));
    $$('.panel').forEach(p => p.classList.toggle('active', p.dataset.panel === b.dataset.tab));
    if (b.dataset.tab === 'backup') refreshJson();
  });
  $('#togglePreview').addEventListener('click', () => {
    $('#layout').classList.toggle('no-preview');
  });

  /* ---------- Vínculo de campos globais ---------- */
  function fillGlobal() {
    $$('[data-bind]').forEach(el => writeInput(el, getPath(cfg, el.dataset.bind)));
  }
  $$('[data-bind]').forEach(el => {
    const ev = el.tagName === 'SELECT' || el.type === 'checkbox' || el.type === 'color' ? 'change' : 'input';
    el.addEventListener(ev, () => { setPath(cfg, el.dataset.bind, readInput(el)); showOutput(el); commit({ chips: false }); });
    if (el.type === 'color') el.addEventListener('input', () => { setPath(cfg, el.dataset.bind, el.value); commit({ chips: false }); });
  });

  /* ---------- Vínculo de campos da face ---------- */
  function fillFace() {
    const f = face();
    $$('[data-fbind]').forEach(el => writeInput(el, f[el.dataset.fbind]));
    $('#faceName').textContent = MC.FACE_LABELS[f.id];
    const sel = $('#swapWith');
    sel.innerHTML = '<option value="">⇄ Trocar com…</option>' + cfg.faces
      .map((o, i) => i === faceIdx ? '' : `<option value="${i}">${esc(o.icon)} ${esc(o.title)} (${MC.FACE_LABELS[o.id]})</option>`).join('');
  }
  $$('[data-fbind]').forEach(el => {
    const handler = () => { face()[el.dataset.fbind] = readInput(el); showOutput(el); commit(); if (/^(bg1|tileColor)$/.test(el.dataset.fbind)) renderShortcuts(); };
    el.addEventListener(el.tagName === 'SELECT' || el.type === 'checkbox' ? 'change' : 'input', handler);
  });

  /* ---------- Visibilidade condicional ---------- */
  function updateVisibility() {
    const test = (rule, src) => {
      const [path, vals] = rule.split(':');
      const v = String(getPath(src, path));
      return vals.split(',').includes(v);
    };
    $$('[data-show]').forEach(el => el.toggleAttribute('hidden-by-rule', !test(el.dataset.show, cfg)));
    $$('[data-fshow]').forEach(el => el.toggleAttribute('hidden-by-rule', !test(el.dataset.fshow, face())));
  }

  /* ---------- Seletor de faces ---------- */
  function renderChips() {
    const box = $('#faceChips');
    box.innerHTML = '';
    cfg.faces.forEach((f, i) => {
      const b = document.createElement('button');
      b.className = 'chip' + (i === faceIdx ? ' active' : '');
      b.style.background = MC.faceBackground(f);
      b.style.color = f.textColor;
      b.innerHTML = `<span class="cp">${i + 1} · ${MC.FACE_LABELS[f.id]}</span><span class="ci">${esc(f.icon)}</span>
        <span class="ct">${esc(f.title)}</span><span class="cn">${f.shortcuts.length}</span>`;
      b.addEventListener('click', () => selectFace(i));
      box.appendChild(b);
    });
  }
  function selectFace(i) {
    faceIdx = i;
    renderChips(); fillFace(); renderShortcuts(); updateVisibility();
    previewGoto(face().id);
  }

  /* ---------- Paletas ---------- */
  function renderPresets() {
    $('#presets').innerHTML = FACE_PRESETS.map((p, i) =>
      `<button class="swatch" data-i="${i}" title="Aplicar paleta" style="background:linear-gradient(135deg,${p[0]},${p[1]});"></button>`).join('');
    $('#bgPresets').innerHTML = BG_PRESETS.map((p, i) => {
      const bg = p.type === 'solid' ? p.color1 : `linear-gradient(135deg,${p.color1},${p.color2}${p.color3 ? ',' + p.color3 : ''})`;
      return `<button class="swatch" data-i="${i}" title="Aplicar fundo" style="background:${bg}"></button>`;
    }).join('');
  }
  $('#presets').addEventListener('click', e => {
    const b = e.target.closest('.swatch'); if (!b) return;
    const [c1, c2, t] = FACE_PRESETS[b.dataset.i];
    Object.assign(face(), { bg1: c1, bg2: c2, textColor: t, tileColor: t, borderColor: t });
    if (face().bgType === 'solid') face().bgType = 'gradient';
    fillFace(); renderShortcuts(); commit();
  });
  $('#bgPresets').addEventListener('click', e => {
    const b = e.target.closest('.swatch'); if (!b) return;
    Object.assign(cfg.background, BG_PRESETS[b.dataset.i]);
    fillGlobal(); commit({ chips: false });
  });

  /* ---------- Ações da face ---------- */
  const STYLE_KEYS = ['bgType', 'bg1', 'bg2', 'angle', 'bgImage', 'textColor', 'tileColor', 'tileOpacity',
    'borderColor', 'borderOpacity', 'borderWidth', 'radius', 'columns', 'showLabels'];

  $('#copyStyle').addEventListener('click', () => {
    if (!confirm('Aplicar o estilo desta face (cores, bordas, colunas) a todas as outras faces?')) return;
    const src = face();
    cfg.faces.forEach(f => { if (f !== src) STYLE_KEYS.forEach(k => { f[k] = src[k]; }); });
    commit(); toast('Estilo aplicado a todas as faces');
  });

  $('#swapWith').addEventListener('change', e => {
    const j = parseInt(e.target.value, 10);
    if (isNaN(j)) return;
    const a = cfg.faces[faceIdx], b = cfg.faces[j];
    const idA = a.id, idB = b.id;
    cfg.faces[faceIdx] = Object.assign(b, { id: idA });
    cfg.faces[j] = Object.assign(a, { id: idB });
    toast(`Conteúdo trocado: ${MC.FACE_LABELS[idA]} ⇄ ${MC.FACE_LABELS[idB]}`);
    selectFace(faceIdx); commit();
  });

  /* ---------- Atalhos ---------- */
  function previewIcon(s) {
    const icon = (s.icon || '').trim();
    if (icon && MC.isImageIcon(icon)) return `<img src="${esc(icon)}" alt="">`;
    if (icon) return esc(icon);
    const fav = MC.faviconFor(s.url);
    return fav && s.url ? `<img src="${fav}" alt="">` : esc((s.label || '?').charAt(0).toUpperCase() || '?');
  }

  function renderShortcuts() {
    const f = face();
    const list = $('#shortcutList');
    $('#scCount').textContent = f.shortcuts.length;
    if (!f.shortcuts.length) {
      list.innerHTML = '<div class="empty-list">Nenhum atalho nesta face. Clique em <b>＋ Adicionar atalho</b>.</div>';
      return;
    }
    const moveOpts = cfg.faces.map((o, i) => i === faceIdx ? '' :
      `<option value="${i}">${esc(o.icon)} ${esc(o.title)}</option>`).join('');

    list.innerHTML = f.shortcuts.map((s, i) => {
      const mode = s.openMode || (s.newTab === false ? 'self' : 'tab');
      return `
      <div class="sc-row" data-i="${i}">
        <span class="handle" title="Arraste para reordenar">⋮⋮</span>
        <span class="sc-prev" style="background:${MC.faceBackground(f)};color:${f.textColor}">${previewIcon(s)}</span>
        <input type="text" class="sc-icon" data-k="icon" value="${esc(s.icon)}" placeholder="Ícone" title="Emoji ou URL de imagem (vazio = favicon)">
        <input type="text" class="sc-label" data-k="label" value="${esc(s.label)}" placeholder="Nome">
        <input type="text" class="sc-url" data-k="url" value="${esc(s.url)}" placeholder="https://exemplo.com">
        <span class="colorwrap ${s.color ? '' : 'default'}" title="${s.color ? 'Cor própria (clique duplo para voltar ao padrão)' : 'Usando cor padrão da face'}">
          <input type="color" data-k="color" value="${s.color || f.tileColor}">
        </span>
        <select class="sc-openmode" data-k="openMode" title="Ação ao clicar no atalho">
          <option value="tab" ${mode === 'tab' ? 'selected' : ''}>Nova aba ↗</option>
          <option value="self" ${mode === 'self' ? 'selected' : ''}>Mesma janela ↩</option>
          <option value="embed" ${mode === 'embed' ? 'selected' : ''}>Embutir na tela ◧</option>
        </select>
        <div class="tools">
          <select class="move icon-btn" title="Mover para outra face"><option value="">➜</option>${moveOpts}</select>
          <button class="icon-btn" data-act="up" title="Subir">↑</button>
          <button class="icon-btn" data-act="down" title="Descer">↓</button>
          <button class="icon-btn" data-act="dup" title="Duplicar">⧉</button>
          <button class="icon-btn del" data-act="del" title="Excluir">✕</button>
        </div>
      </div>`;
    }).join('');
  }

  const list = $('#shortcutList');
  const rowIndex = el => parseInt(el.closest('.sc-row').dataset.i, 10);

  list.addEventListener('input', e => {
    const k = e.target.dataset.k; if (!k) return;
    const i = rowIndex(e.target);
    const s = face().shortcuts[i];
    s[k] = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    if (k === 'color') e.target.parentElement.classList.remove('default');
    if (k === 'icon' || k === 'url' || k === 'label') {
      const prev = e.target.closest('.sc-row').querySelector('.sc-prev');
      prev.innerHTML = previewIcon(s);
    }
    commit();
  });
  list.addEventListener('change', e => {
    if (e.target.dataset.k === 'openMode') {
      const s = face().shortcuts[rowIndex(e.target)];
      s.openMode = e.target.value;
      s.newTab = s.openMode === 'tab';
      commit();
    }
    if (e.target.type === 'checkbox' && e.target.dataset.k) {
      face().shortcuts[rowIndex(e.target)].newTab = e.target.checked; commit();
    }
    if (e.target.classList.contains('move') && e.target.value !== '') {
      const to = parseInt(e.target.value, 10);
      const [s] = face().shortcuts.splice(rowIndex(e.target), 1);
      cfg.faces[to].shortcuts.push(s);
      toast(`“${s.label || 'Atalho'}” movido para ${cfg.faces[to].title}`);
      renderShortcuts(); commit();
    }
  });
  list.addEventListener('dblclick', e => {
    const w = e.target.closest('.colorwrap'); if (!w) return;
    face().shortcuts[rowIndex(w)].color = '';
    renderShortcuts(); commit();
  });
  list.addEventListener('click', e => {
    const b = e.target.closest('button[data-act]'); if (!b) return;
    const arr = face().shortcuts, i = rowIndex(b);
    switch (b.dataset.act) {
      case 'up': if (i > 0) [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]]; break;
      case 'down': if (i < arr.length - 1) [arr[i + 1], arr[i]] = [arr[i], arr[i + 1]]; break;
      case 'dup': arr.splice(i + 1, 0, Object.assign(MC.clone(arr[i]), { id: MC.uid() })); break;
      case 'del':
        if (!confirm(`Excluir o atalho “${arr[i].label || arr[i].url || 'sem nome'}”?`)) return;
        arr.splice(i, 1); break;
    }
    renderShortcuts(); commit();
  });

  // Reordenação por arrastar (somente pela alça)
  let dragFrom = -1;
  list.addEventListener('mousedown', e => {
    const h = e.target.closest('.handle');
    if (h) h.closest('.sc-row').draggable = true;
  });
  list.addEventListener('dragstart', e => {
    const row = e.target.closest('.sc-row'); if (!row) return;
    dragFrom = +row.dataset.i; row.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(dragFrom));
  });
  list.addEventListener('dragover', e => {
    const row = e.target.closest('.sc-row'); if (!row || dragFrom < 0) return;
    e.preventDefault();
    $$('.sc-row.over', list).forEach(r => r !== row && r.classList.remove('over'));
    row.classList.add('over');
  });
  list.addEventListener('drop', e => {
    const row = e.target.closest('.sc-row'); if (!row || dragFrom < 0) return;
    e.preventDefault();
    const to = +row.dataset.i, arr = face().shortcuts;
    const [s] = arr.splice(dragFrom, 1); arr.splice(to, 0, s);
    dragFrom = -1; renderShortcuts(); commit();
  });
  list.addEventListener('dragend', () => {
    dragFrom = -1;
    $$('.sc-row', list).forEach(r => { r.draggable = false; r.classList.remove('dragging', 'over'); });
  });

  const batchOpenMode = $('#batchOpenMode');
  if (batchOpenMode) {
    batchOpenMode.addEventListener('change', e => {
      const mode = e.target.value;
      if (!mode) return;
      if (!face().shortcuts.length) { e.target.value = ''; return; }
      const labels = { tab: 'Nova aba ↗', self: 'Mesma janela ↩', embed: 'Embutir na tela ◧' };
      if (!confirm(`Definir todos os ${face().shortcuts.length} atalhos da face “${face().title}” como “${labels[mode]}”?`)) {
        e.target.value = '';
        return;
      }
      face().shortcuts.forEach(s => {
        s.openMode = mode;
        s.newTab = mode === 'tab';
      });
      e.target.value = '';
      renderShortcuts();
      commit();
      toast(`Atalhos definidos como: ${labels[mode]}`);
    });
  }

  $('#addShortcut').addEventListener('click', () => {
    const defaultMode = cfg.page.defaultOpenMode || 'tab';
    face().shortcuts.push({
      id: MC.uid(),
      label: 'Novo atalho',
      url: '',
      icon: '',
      color: '',
      newTab: defaultMode === 'tab',
      openMode: defaultMode
    });
    renderShortcuts(); commit();
    const rows = $$('.sc-row', list); const last = rows[rows.length - 1];
    if (last) { last.scrollIntoView({ behavior: 'smooth', block: 'center' }); last.querySelector('.sc-label').select(); }
  });
  $('#clearShortcuts').addEventListener('click', () => {
    if (!face().shortcuts.length) return;
    if (!confirm(`Remover todos os ${face().shortcuts.length} atalhos da face “${face().title}”?`)) return;
    face().shortcuts = []; renderShortcuts(); commit();
  });

  /* ---------- Backup ---------- */
  function refreshJson() { $('#jsonBox').value = JSON.stringify(cfg, null, 2); }
  function loadConfig(newCfg, msg) {
    cfg = MC.normalize(newCfg);
    faceIdx = Math.min(faceIdx, 5);
    renderAll(); commit(); refreshJson(); toast(msg);
  }
  $('#refreshJson').addEventListener('click', refreshJson);
  $('#applyJson').addEventListener('click', () => {
    try { loadConfig(JSON.parse($('#jsonBox').value), 'JSON aplicado ✓'); }
    catch (err) { alert('JSON inválido: ' + err.message); }
  });
  $('#exportBtn').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(cfg, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `menucubo-config-${new Date().toISOString().slice(0, 10)}.json`;
    a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast('Configuração exportada');
  });
  $('#importFile').addEventListener('change', e => {
    const file = e.target.files[0]; if (!file) return;
    const r = new FileReader();
    r.onload = () => {
      try { loadConfig(JSON.parse(r.result), 'Configuração importada ✓'); }
      catch (err) { alert('Arquivo inválido: ' + err.message); }
      e.target.value = '';
    };
    r.readAsText(file);
  });
  $('#resetBtn').addEventListener('click', () => {
    if (!confirm('Restaurar TODAS as configurações para o padrão? Seus atalhos personalizados serão perdidos (exporte antes, se quiser guardar).')) return;
    loadConfig(MC.reset(), 'Configurações restauradas');
  });

  // Sincroniza se a configuração for alterada em outra aba
  window.addEventListener('storage', e => {
    if (e.key === MC.KEY) { cfg = MC.load(); renderAll(); pushPreview(); }
  });

  function renderAll() {
    renderPresets(); renderChips(); fillGlobal(); fillFace(); renderShortcuts(); updateVisibility();
  }
  renderAll();
})();

