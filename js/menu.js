/* MenuCubo – página do menu em cubo 3D */
(function () {
  'use strict';
  const MC = window.MenuCubo;
  const $ = s => document.querySelector(s);

  const isPreview = new URLSearchParams(location.search).has('preview');
  if (isPreview) document.body.classList.add('preview');

  const els = {
    bg: $('#bg'), fx: $('#fx'), overlay: $('#overlay'),
    workspace: $('#workspace'), cubePane: $('#cubePane'),
    scene: $('#scene'), cube: $('#cube'), nav: $('#facenav'),
    title: $('#faceTitle'), controls: $('#controls'), toggle: $('#btnToggle'),
    hint: $('#hint'), clock: $('#clock'), clockTime: $('#clockTime'), clockDate: $('#clockDate'),
    viewSwitch: $('#viewSwitch'), sideList: $('#sideList'),
    contentPane: $('#contentPane'), contentHead: $('#contentHead'), contentBody: $('#contentBody'),
    contentToolbar: $('#contentToolbar'),
    searchInput: $('#searchInput'), scopeSwitch: $('#scopeSwitch'),
    embedView: $('#embedView'), embedBar: $('#embedBar'),
    embedIc: $('#embedIc'), embedTitle: $('#embedTitle'), embedUrl: $('#embedUrl'),
    embedReload: $('#embedReload'), embedExternal: $('#embedExternal'), embedClose: $('#embedClose'),
    embedFrame: $('#embedFrame')
  };

  let cfg = MC.load();
  const urlLayout = new URLSearchParams(location.search).get('layout');
  const defaultLayout = document.body.dataset.defaultLayout;
  if (urlLayout === 'sidebar' || urlLayout === 'center') cfg.page.layout = urlLayout;
  else if (!isPreview && (defaultLayout === 'sidebar' || defaultLayout === 'center')) cfg.page.layout = defaultLayout;

  /* ---------- Estado da rotação ---------- */
  const FACE_ROT = {
    front: [0, 0], right: [0, -90], back: [0, 180],
    left: [0, 90], top: [-90, 0], bottom: [90, 0]
  };
  const NORMALS = {
    front: [0, 0, 1], right: [1, 0, 0], back: [0, 0, -1],
    left: [-1, 0, 0], top: [0, -1, 0], bottom: [0, 1, 0]
  };
  const FACE_BASE_TRANSFORM = {
    front:  'translateZ(var(--half))',
    right:  'rotateY(90deg) translateZ(var(--half))',
    back:   'rotateY(180deg) translateZ(var(--half))',
    left:   'rotateY(-90deg) translateZ(var(--half))',
    top:    'rotateX(90deg) translateZ(var(--half))',
    bottom: 'rotateX(-90deg) translateZ(var(--half))'
  };
  let faceEls = {};

  let rx = cfg.rotation.tilt, ry = 25;
  let tween = null;
  let dragging = false, down = null, justDragged = false;
  let hovering = false, userPaused = false;
  let lastInteract = -1e9;
  let autoVel = 0, wobbleT = 0, stepTimer = 0;
  let lastFrame = performance.now();
  let currentFace = null;
  let activePanelFace = 'front';
  let activeEmbed = null;
  let searchScope = 'face';
  let searchQuery = '';
  let velRx = 0, velRy = 0;

  function getOpenMode(s) {
    if (s && s.openMode && s.openMode !== 'default') return s.openMode;
    if (cfg.page && cfg.page.defaultOpenMode) return cfg.page.defaultOpenMode;
    return s && s.newTab === false ? 'self' : 'tab';
  }

  function openEmbed(s, f) {
    if (!s || !s.url) return;
    activeEmbed = { shortcut: s, face: f };
    const url = MC.normalizeUrl(s.url);

    // Se estiver no modo central, migra para o menu lateral!
    if (cfg.page.layout !== 'sidebar') {
      setLayout('sidebar', true);
    }

    if (f && f.id) {
      interact();
      goTo(f.id);
    }

    document.body.classList.add('embed-active');
    if (els.embedView) els.embedView.classList.remove('hidden');
    if (els.embedFrame) els.embedFrame.src = url;
    if (els.embedTitle) els.embedTitle.textContent = s.label || domainOf(s.url) || 'Atalho';
    if (els.embedUrl) els.embedUrl.textContent = s.url;
    if (els.embedExternal) els.embedExternal.href = url;
    if (els.embedIc) els.embedIc.innerHTML = iconHtml(s);
    if (els.embedBar && f) {
      els.embedBar.style.borderLeft = `4px solid ${f.bg1 || '#7c5cff'}`;
    }
  }

  function closeEmbed() {
    activeEmbed = null;
    document.body.classList.remove('embed-active');
    if (els.embedView) els.embedView.classList.add('hidden');
    if (els.embedFrame) els.embedFrame.src = 'about:blank';
  }

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const rad = d => d * Math.PI / 180;
  const interact = () => { lastInteract = performance.now(); };

  function detectFace() {
    const a = rad(rx), b = rad(ry);
    let best = 'front', bestZ = -Infinity;
    for (const id of MC.FACE_IDS) {
      const [nx, ny, nz] = NORMALS[id];
      const z1 = -nx * Math.sin(b) + nz * Math.cos(b);
      const z = ny * Math.sin(a) + z1 * Math.cos(a);
      if (z > bestZ) { bestZ = z; best = id; }
    }
    return best;
  }

  function updateCubeTransforms() {
    const a = rad(rx), b = rad(ry);
    let best = 'front', bestZ = -Infinity;
    const rotPrefix = `rotateX(${rx}deg) rotateY(${ry}deg) `;
    for (const id of MC.FACE_IDS) {
      const [nx, ny, nz] = NORMALS[id];
      const z1 = -nx * Math.sin(b) + nz * Math.cos(b);
      const z = ny * Math.sin(a) + z1 * Math.cos(a);
      if (z > bestZ) { bestZ = z; best = id; }
      const el = faceEls[id];
      if (el) {
        el.style.transform = rotPrefix + FACE_BASE_TRANSFORM[id];
        el.style.pointerEvents = z > 0.05 ? 'auto' : 'none';
        el.style.zIndex = String(Math.round((z + 1) * 100));
      }
    }
    return best;
  }

  function goTo(id, dur, fromAuto = false) {
    const [tx, tyBase] = FACE_ROT[id];
    const ty = tyBase + 360 * Math.round((ry - tyBase) / 360);
    tween = {
      fromRx: rx, fromRy: ry, toRx: tx, toRy: ty,
      start: performance.now(), dur: dur ?? cfg.rotation.transitionMs,
      fromAuto, targetId: id
    };
    if (!fromAuto || cfg.sidebar.followRotation) {
      activePanelFace = id;
      if (cfg.page.layout === 'sidebar') renderSidebarContent();
    }
  }

  function snapTo(px, py) {
    if (px < -45) return goTo('top');
    if (px > 45) return goTo('bottom');
    const ty = Math.round(py / 90) * 90;
    tween = { fromRx: rx, fromRy: ry, toRx: 0, toRy: ty, start: performance.now(), dur: cfg.rotation.transitionMs * 0.7, fromAuto: false };
  }

  function step(dir) { // dir: 'left' | 'right' | 'up' | 'down'
    interact();
    const f = detectFace();
    const baseRy = Math.round(ry / 90) * 90;
    if (dir === 'left' || dir === 'right') {
      const ty = (f === 'top' || f === 'bottom' ? Math.round(ry / 360) * 360 : baseRy) + (dir === 'right' ? -90 : 90);
      tween = { fromRx: rx, fromRy: ry, toRx: 0, toRy: ty, start: performance.now(), dur: cfg.rotation.transitionMs, fromAuto: false };
    } else {
      const sideRx = f === 'top' ? -90 : f === 'bottom' ? 90 : 0;
      const tx = clamp(sideRx + (dir === 'up' ? -90 : 90), -90, 90);
      const ty = tx === 0 ? baseRy : Math.round(ry / 360) * 360;
      tween = { fromRx: rx, fromRy: ry, toRx: tx, toRy: ty, start: performance.now(), dur: cfg.rotation.transitionMs, fromAuto: false };
    }
  }

  function autoActive(now) {
    const R = cfg.rotation;
    return R.autoRotate && !userPaused && !dragging &&
      !(R.pauseOnHover && hovering) &&
      (now - lastInteract) > R.resumeDelay * 1000;
  }

  function nextStepFace() {
    const list = cfg.faces.filter(f => f.inRotation).map(f => f.id);
    if (!list.length) return;
    const cur = detectFace();
    const idx = list.indexOf(cur);
    const dirList = cfg.rotation.direction === -1 ? list.slice().reverse() : list;
    const i2 = idx < 0 ? 0 : (dirList.indexOf(cur) + 1) % dirList.length;
    goTo(dirList[i2], undefined, true);
  }

  function frame(now) {
    const dt = Math.min(0.05, (now - lastFrame) / 1000);
    lastFrame = now;
    const R = cfg.rotation;

    if (tween) {
      const p = Math.min(1, (now - tween.start) / Math.max(1, tween.dur));
      const e = ease(p);
      rx = tween.fromRx + (tween.toRx - tween.fromRx) * e;
      ry = tween.fromRy + (tween.toRy - tween.fromRy) * e;
      if (p >= 1) tween = null;
    } else if (autoActive(now)) {
      if (R.mode === 'continuous') {
        autoVel = Math.min(1, autoVel + dt * 0.8);
        ry += R.speed * R.direction * dt * autoVel;
        wobbleT += dt * autoVel;
        const target = R.tilt + (R.wobble ? Math.sin(wobbleT * 0.5) * R.wobbleAmp : 0);
        rx += (target - rx) * Math.min(1, dt * 1.5 * autoVel);
      } else {
        stepTimer += dt;
        if (stepTimer >= R.stepInterval) { stepTimer = 0; nextStepFace(); }
      }
    } else if (!dragging && !R.snap && (Math.abs(velRx) > 1 || Math.abs(velRy) > 1)) {
      // inércia quando o encaixe automático está desligado
      ry += velRy * dt; rx = clamp(rx + velRx * dt, -90, 90);
      velRx *= Math.pow(0.04, dt); velRy *= Math.pow(0.04, dt);
      autoVel = 0; stepTimer = 0;
    } else {
      autoVel = 0; stepTimer = 0;
    }

    const isAutoMove = !dragging && ((tween && tween.fromAuto) || (!tween && autoActive(now)));
    const f = updateCubeTransforms();
    if (f !== currentFace) {
      currentFace = f;
      if ((!tween || !tween.targetId) && (!isAutoMove || cfg.sidebar.followRotation)) activePanelFace = f;
      updateActive();
    }
    updateToggle(now);
    requestAnimationFrame(frame);
  }

  /* ---------- Renderização ---------- */
  function iconHtml(s) {
    const icon = (s.icon || '').trim();
    const fallback = esc((s.label || '?').trim().charAt(0).toUpperCase() || '?');
    if (icon && MC.isImageIcon(icon)) {
      return `<img src="${esc(icon)}" alt="" draggable="false" onerror="this.replaceWith(document.createTextNode('${fallback}'))">`;
    }
    if (icon) return esc(icon);
    const fav = MC.faviconFor(s.url);
    return fav ? `<img src="${fav}" alt="" draggable="false" onerror="this.replaceWith(document.createTextNode('${fallback}'))">` : fallback;
  }

  function esc(t) {
    return String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function domainOf(url) {
    try {
      const u = new URL(MC.normalizeUrl(url));
      return (u.hostname || url).replace(/^www\./, '');
    } catch { return url || ''; }
  }

  function renderCube() {
    const C = cfg.cube;
    const isSide = cfg.page.layout === 'sidebar';
    els.cube.innerHTML = '';
    els.cube.style.transform = '';
    faceEls = {};
    for (const f of cfg.faces) {
      const el = document.createElement('section');
      el.className = 'face face-' + f.id;
      el.dataset.face = f.id;
      el.style.background = MC.faceBackground(f, C.faceOpacity);
      el.style.setProperty('--text', f.textColor);
      el.style.setProperty('--tile', MC.hexToRgba(f.tileColor, f.tileOpacity));
      el.style.setProperty('--tile-hover', MC.hexToRgba(f.tileColor, Math.min(1, f.tileOpacity + 0.15)));
      el.style.setProperty('--border', MC.hexToRgba(f.borderColor, f.borderOpacity));
      el.style.setProperty('--bw', f.borderWidth + 'px');
      el.style.setProperty('--radius', f.radius + 'px');
      el.style.setProperty('--cols', f.columns);
      if (C.glow) el.style.boxShadow = `0 0 ${C.glowStrength}px ${MC.hexToRgba(f.bg1, 0.55)}`;

      const showTileLabels = isSide ? !!cfg.sidebar.cubeLabels : !!f.showLabels;
      const tiles = f.shortcuts.map(s => {
        const mode = getOpenMode(s);
        const style = s.color ? ` style="background:${MC.hexToRgba(s.color, Math.max(.35, f.tileOpacity + .25))}"` : '';
        const target = mode === 'tab' ? ' target="_blank" rel="noopener noreferrer"' : ' target="_self"';
        const modeBadge = mode === 'embed' ? ' (Embutido ◧)' : mode === 'self' ? ' (Mesma janela ↩)' : '';
        return `<a class="tile" href="${esc(MC.normalizeUrl(s.url))}"${target}${style} draggable="false"
          data-shortcut-id="${esc(s.id)}" data-face-id="${esc(f.id)}" data-open-mode="${esc(mode)}"
          title="${esc(s.label)}\n${esc(s.url)}${modeBadge}">
          <span class="ic">${iconHtml(s)}</span>${showTileLabels ? `<span class="lb">${esc(s.label)}</span>` : ''}</a>`;
      }).join('');

      el.innerHTML = `<div class="face-head"><span class="fi">${esc(f.icon)}</span><span>${esc(f.title)}</span></div>
        <div class="grid">${tiles || '<div class="empty">Nenhum atalho.<br>Adicione em ⚙ Configurações.</div>'}</div>`;
      els.cube.appendChild(el);
      faceEls[f.id] = el;
    }
    updateCubeTransforms();
  }

  function renderNav() {
    els.nav.innerHTML = '';
    cfg.faces.forEach((f, i) => {
      const b = document.createElement('button');
      b.dataset.face = f.id;
      b.title = `${f.title} (${i + 1})`;
      b.innerHTML = `<span class="dot" style="background:linear-gradient(135deg,${f.bg1},${f.bg2})"></span><span>${esc(f.icon)}</span><span class="lbl">${esc(f.title)}</span>`;
      b.addEventListener('click', () => { interact(); goTo(f.id); });
      els.nav.appendChild(b);
    });
    updateActive();
  }

  function renderSidebarList(f) {
    if (!els.sideList) return;
    els.sideList.classList.toggle('hidden', !cfg.sidebar.showList);
    if (!cfg.sidebar.showList) return;

    const items = f.shortcuts.map(s => {
      const mode = getOpenMode(s);
      const target = mode === 'tab' ? ' target="_blank" rel="noopener noreferrer"' : ' target="_self"';
      const accent = s.color || f.bg1;
      const arrow = mode === 'embed' ? '◧' : mode === 'self' ? '↩' : '↗';
      const modeTip = mode === 'embed' ? 'Embutir na tela' : mode === 'self' ? 'Abrir na própria janela' : 'Abrir em nova aba';
      return `<a class="side-item" href="${esc(MC.normalizeUrl(s.url))}"${target} style="--face-accent:${esc(accent)}"
        data-shortcut-id="${esc(s.id)}" data-face-id="${esc(f.id)}" data-open-mode="${esc(mode)}"
        title="${esc(s.label)}\n${esc(s.url)} (${modeTip})">
        <span class="side-item-ic">${iconHtml(s)}</span>
        <span class="side-item-lbl">${esc(s.label || domainOf(s.url) || 'Atalho')}</span>
        <span class="side-item-go" title="${modeTip}">${arrow}</span>
      </a>`;
    }).join('');

    els.sideList.innerHTML = `<div class="side-list-head"><span>${esc(f.icon)} ${esc(f.title)}</span><span>${f.shortcuts.length}</span></div>` +
      (items || '<div class="side-empty">Sem atalhos nesta face.</div>');
  }

  function renderContentHead(f) {
    if (!els.contentHead) return;
    els.contentHead.style.background = MC.faceBackground(f);
    els.contentHead.style.color = f.textColor || '#fff';
    els.contentHead.innerHTML = `
      <div class="content-head-info">
        <div class="content-head-ic">${esc(f.icon)}</div>
        <div>
          <h1 class="content-head-title">${esc(f.title)}</h1>
          <div class="content-head-sub">${f.shortcuts.length} atalho${f.shortcuts.length === 1 ? '' : 's'} • Face ${esc(MC.FACE_LABELS[f.id])}</div>
        </div>
      </div>
      <div class="content-head-nav">
        <button type="button" data-step-face="-1" title="Face anterior">◀ Anterior</button>
        <button type="button" data-step-face="1" title="Próxima face">Próxima ▶</button>
      </div>`;
  }

  function shortcutCardHtml(s, f) {
    const mode = getOpenMode(s);
    const target = mode === 'tab' ? ' target="_blank" rel="noopener noreferrer"' : ' target="_self"';
    const accent = s.color || f.bg1;
    const dom = domainOf(s.url);
    const modeLabel = mode === 'embed' ? '◧ Embutir' : mode === 'self' ? '↩ Janela' : '↗ Nova aba';
    return `<a class="shortcut-card" href="${esc(MC.normalizeUrl(s.url))}"${target} style="--card-accent:${esc(accent)}"
      data-shortcut-id="${esc(s.id)}" data-face-id="${esc(f.id)}" data-open-mode="${esc(mode)}"
      title="${esc(s.label)}\n${esc(s.url)} (${modeLabel})">
      <span class="shortcut-card-ic">${iconHtml(s)}</span>
      <span class="shortcut-card-info">
        <div class="shortcut-card-lbl">${esc(s.label || dom || 'Atalho')}</div>
        <div class="shortcut-card-url">${esc(dom)} • <span style="opacity:.85">${modeLabel}</span></div>
      </span>
    </a>`;
  }

  function renderContentBody(activeFace) {
    if (!els.contentBody) return;
    const q = searchQuery.trim().toLowerCase();
    const match = s => !q || (s.label || '').toLowerCase().includes(q) || (s.url || '').toLowerCase().includes(q);

    if (searchScope === 'all') {
      const groups = cfg.faces.map(f => {
        const list = f.shortcuts.filter(match);
        if (!list.length) return '';
        return `<div class="sc-group">
          <div class="sc-group-title"><span class="sc-group-dot" style="background:${esc(f.bg1)}"></span><span>${esc(f.icon)} ${esc(f.title)}</span></div>
          <div class="card-grid">${list.map(s => shortcutCardHtml(s, f)).join('')}</div>
        </div>`;
      }).join('');
      els.contentBody.innerHTML = groups || '<div class="content-empty">Nenhum atalho encontrado para a busca.</div>';
      return;
    }

    const list = activeFace.shortcuts.filter(match);
    els.contentBody.innerHTML = list.length
      ? `<div class="card-grid">${list.map(s => shortcutCardHtml(s, activeFace)).join('')}</div>`
      : `<div class="content-empty">${q ? 'Nenhum atalho encontrado nesta face.' : 'Nenhum atalho nesta face. Adicione em ⚙ Configurações.'}</div>`;
  }

  function renderSidebarContent() {
    if (cfg.page.layout !== 'sidebar') return;
    const f = cfg.faces.find(x => x.id === activePanelFace) || cfg.faces[0];
    renderSidebarList(f);
    if (els.contentPane) {
      els.contentPane.classList.toggle('hidden', !cfg.sidebar.showContent);
      if (cfg.sidebar.showContent) {
        renderContentHead(f);
        renderContentBody(f);
      }
    }
  }

  function updateActive() {
    els.nav.querySelectorAll('button').forEach(b => b.classList.toggle('active', b.dataset.face === currentFace));
    const f = cfg.faces.find(x => x.id === currentFace);
    els.title.textContent = f ? `${f.icon} ${f.title}` : '';
    renderSidebarContent();
  }

  let toggleState = '';
  function updateToggle(now) {
    const s = !cfg.rotation.autoRotate ? 'off' : userPaused ? 'paused' : autoActive(now) ? 'running' : 'waiting';
    if (s === toggleState) return;
    toggleState = s;
    els.toggle.classList.toggle('hidden', s === 'off');
    els.toggle.textContent = s === 'paused' ? '▶' : '⏸';
    els.toggle.title = s === 'paused' ? 'Retomar rotação automática (Espaço)' : 'Pausar rotação automática (Espaço)';
  }

  function applyLayoutClasses() {
    const layout = cfg.page.layout === 'sidebar' ? 'sidebar' : 'center';
    const S = cfg.sidebar;
    document.body.classList.toggle('layout-center', layout === 'center');
    document.body.classList.toggle('layout-sidebar', layout === 'sidebar');
    document.body.classList.toggle('side-left', S.position !== 'right');
    document.body.classList.toggle('side-right', S.position === 'right');
    document.body.classList.toggle('side-glass', S.glass !== false);
    document.body.classList.toggle('no-content', !S.showContent);
    document.body.classList.toggle('custom-content-cols', Number(S.contentColumns) > 0);

    if (els.viewSwitch) {
      els.viewSwitch.classList.toggle('hidden', !cfg.page.showLayoutToggle);
      els.viewSwitch.querySelectorAll('.view-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.layout === layout);
      });
    }
  }

  function setLayout(layout, save = true) {
    const next = layout === 'sidebar' ? 'sidebar' : 'center';
    if (next === 'center' && activeEmbed) closeEmbed();
    if (cfg.page.layout === next && document.body.classList.contains('layout-' + next)) return;
    cfg.page.layout = next;
    if (save && !isPreview) MC.save(cfg);
    applyLayoutClasses();
    applySizes();
    renderCube();
    renderSidebarContent();
  }

  function applySizes() {
    const C = cfg.cube;
    const S = cfg.sidebar;
    const isSide = cfg.page.layout === 'sidebar';
    const root = document.documentElement.style;
    const sideW = Math.round(Math.max(240, Math.min(S.width || 340, window.innerWidth * 0.85)));
    root.setProperty('--side-w', sideW + 'px');
    root.setProperty('--content-cols', String(Number(S.contentColumns || 0) || 3));

    const size = isSide
      ? Math.round(Math.max(120, Math.min(S.cubeSize || 250, sideW - 56, window.innerHeight * 0.45)))
      : Math.round(Math.max(160, Math.min(C.size, window.innerWidth * 0.8, (window.innerHeight - 220) * 0.8)));

    root.setProperty('--size', size + 'px');
    root.setProperty('--half', (size / 2 + Number(C.gap || 0)) + 'px');
    root.setProperty('--persp', C.perspective + 'px');
  }

  function applyBackground() {
    const B = cfg.background;
    const bg = els.bg;
    bg.className = 'bg';
    bg.style.filter = '';
    bg.style.inset = '0';
    bg.style.background = '';
    switch (B.type) {
      case 'solid':
        bg.style.background = B.color1; break;
      case 'gradient':
        bg.style.background = `linear-gradient(${B.angle}deg, ${B.color1}, ${B.color2})`; break;
      case 'animated':
        bg.style.background = `linear-gradient(${B.angle}deg, ${B.color1}, ${B.color2}, ${B.color3}, ${B.color1})`;
        bg.style.setProperty('--anim', B.animSpeed + 's');
        bg.classList.add('animated'); break;
      case 'image': {
        const fit = B.imageFit === 'repeat' ? 'auto' : B.imageFit;
        const rep = B.imageFit === 'repeat' ? 'repeat' : 'no-repeat';
        bg.style.background = B.image ? `${B.color1} url("${B.image}") center / ${fit} ${rep}` : B.color1;
        if (B.blur > 0) { bg.style.filter = `blur(${B.blur}px)`; bg.style.inset = `-${B.blur * 2}px`; }
        break;
      }
    }
    els.overlay.style.background = MC.hexToRgba(B.overlayColor, B.overlayOpacity);
    FX.set(B.effect, B.effectColor, B.effectDensity);
  }

  function applyPage() {
    const P = cfg.page;
    document.title = P.title || 'Menu Cubo';
    els.clock.classList.toggle('hidden', !P.showClock);
    els.hint.classList.toggle('hidden', !P.showHint);
    els.nav.classList.toggle('hidden', !P.showNav);
    els.controls.classList.toggle('hidden', !P.showControls);
    applyLayoutClasses();
  }

  function rebuild() {
    applyPage(); applySizes(); applyBackground();
    renderCube(); renderNav(); renderSidebarContent(); toggleState = '';
  }

  /* ---------- Efeitos de partículas ---------- */
  const FX = (() => {
    const cv = els.fx, ctx = cv.getContext('2d');
    let type = 'none', color = '#ffffff', parts = [], raf = 0, density = 120;
    function resize() {
      const dpr = window.devicePixelRatio || 1;
      cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
    }
    function seed() {
      const n = Math.round(density * (innerWidth * innerHeight) / (1400 * 800));
      parts = Array.from({ length: type === 'bubbles' ? Math.round(n / 3) : n }, () => make(true));
    }
    function make(initial) {
      if (type === 'bubbles') return {
        x: Math.random() * innerWidth, y: initial ? Math.random() * innerHeight : innerHeight + 40,
        r: 6 + Math.random() * 28, v: 10 + Math.random() * 30, a: .05 + Math.random() * .15, ph: Math.random() * 6
      };
      return {
        x: Math.random() * innerWidth, y: Math.random() * innerHeight,
        r: Math.random() * 1.6 + .2, a: Math.random(), s: .3 + Math.random() * 1.5, v: Math.random() * 6 + 1
      };
    }
    let last = 0;
    function loop(t) {
      const dt = Math.min(.05, (t - last) / 1000 || 0); last = t;
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      ctx.fillStyle = color; ctx.strokeStyle = color;
      for (const p of parts) {
        if (type === 'stars') {
          p.a += p.s * dt * (Math.random() > .5 ? 1 : -1);
          p.a = clamp(p.a, .1, 1);
          p.y -= p.v * dt * .3; if (p.y < -2) { p.y = innerHeight + 2; p.x = Math.random() * innerWidth; }
          ctx.globalAlpha = p.a;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
        } else {
          p.y -= p.v * dt; p.ph += dt; const x = p.x + Math.sin(p.ph) * 10;
          if (p.y < -p.r * 2) Object.assign(p, make(false));
          ctx.globalAlpha = p.a;
          ctx.beginPath(); ctx.arc(x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
          ctx.globalAlpha = p.a * 2; ctx.lineWidth = 1; ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(loop);
    }
    window.addEventListener('resize', () => { if (type !== 'none') resize(); });
    return {
      set(t, c, d) {
        cancelAnimationFrame(raf);
        type = t || 'none'; color = c || '#fff'; density = d || 120;
        if (type === 'none') { ctx.clearRect(0, 0, cv.width, cv.height); return; }
        resize(); raf = requestAnimationFrame(loop);
      }
    };
  })();

  /* ---------- Interação ---------- */
  els.scene.addEventListener('pointerenter', () => { hovering = true; });
  els.scene.addEventListener('pointerleave', () => { hovering = false; });

  els.scene.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    down = { x: e.clientX, y: e.clientY, rx, ry, t: performance.now(), lastX: e.clientX, lastY: e.clientY };
    velRx = velRy = 0;
  });

  window.addEventListener('pointermove', e => {
    if (!down) return;
    const dx = e.clientX - down.x, dy = e.clientY - down.y;
    if (!dragging && Math.hypot(dx, dy) > 6) {
      dragging = true; tween = null;
      down.rx = rx; down.ry = ry; down.x = e.clientX; down.y = e.clientY;
      els.scene.classList.add('dragging');
      return;
    }
    if (!dragging) return;
    const k = cfg.rotation.dragSensitivity;
    const now = performance.now();
    const pdt = Math.max(1, now - down.t) / 1000;
    const nRy = down.ry + (e.clientX - down.x) * k;
    const nRx = clamp(down.rx - (e.clientY - down.y) * k, -90, 90);
    velRy = velRy * 0.6 + ((nRy - ry) / pdt) * 0.4;
    velRx = velRx * 0.6 + ((nRx - rx) / pdt) * 0.4;
    ry = nRy; rx = nRx; down.t = now;
    interact();
  });

  function endDrag() {
    if (dragging) {
      dragging = false; justDragged = true;
      setTimeout(() => { justDragged = false; }, 60);
      els.scene.classList.remove('dragging');
      interact();
      if (cfg.rotation.snap) snapTo(rx + velRx * 0.12, ry + velRy * 0.12);
    }
    down = null;
  }
  window.addEventListener('pointerup', endDrag);
  window.addEventListener('pointercancel', endDrag);

  function handleShortcutClick(e) {
    const a = e.target.closest('a[data-open-mode]');
    if (!a) return;
    const mode = a.dataset.openMode;
    if (mode === 'embed') {
      e.preventDefault();
      e.stopPropagation();
      const scId = a.dataset.shortcutId;
      const faceId = a.dataset.faceId;
      const f = cfg.faces.find(x => x.id === faceId);
      const s = f ? f.shortcuts.find(x => x.id === scId) : null;
      if (s) openEmbed(s, f);
      else openEmbed({ label: a.textContent.trim(), url: a.href, icon: '' }, f || cfg.faces[0]);
    }
  }

  els.scene.addEventListener('click', e => {
    if (justDragged) { e.preventDefault(); e.stopPropagation(); return; }
    if (e.target.closest('.tile')) interact();
    handleShortcutClick(e);
  }, true);
  els.scene.addEventListener('dragstart', e => e.preventDefault());

  if (els.sideList) els.sideList.addEventListener('click', handleShortcutClick);
  if (els.contentBody) els.contentBody.addEventListener('click', handleShortcutClick);

  if (els.embedReload) {
    els.embedReload.addEventListener('click', () => {
      if (activeEmbed && els.embedFrame) els.embedFrame.src = MC.normalizeUrl(activeEmbed.shortcut.url);
    });
  }
  if (els.embedClose) {
    els.embedClose.addEventListener('click', () => closeEmbed());
  }

  els.controls.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    const act = b.dataset.act;
    if (act === 'toggle') { userPaused = !userPaused; if (!userPaused) lastInteract = -1e9; return; }
    step(act);
  });

  if (els.viewSwitch) {
    els.viewSwitch.addEventListener('click', e => {
      const b = e.target.closest('.view-btn'); if (!b) return;
      setLayout(b.dataset.layout);
    });
  }

  if (els.searchInput) {
    els.searchInput.addEventListener('input', e => {
      searchQuery = e.target.value;
      const f = cfg.faces.find(x => x.id === activePanelFace) || cfg.faces[0];
      renderContentBody(f);
    });
    els.searchInput.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        if (els.searchInput.value) {
          els.searchInput.value = '';
          searchQuery = '';
          const f = cfg.faces.find(x => x.id === activePanelFace) || cfg.faces[0];
          renderContentBody(f);
        } else {
          els.searchInput.blur();
        }
      }
    });
  }

  if (els.scopeSwitch) {
    els.scopeSwitch.addEventListener('click', e => {
      const b = e.target.closest('button[data-scope]'); if (!b) return;
      searchScope = b.dataset.scope;
      els.scopeSwitch.querySelectorAll('button').forEach(btn => btn.classList.toggle('active', btn === b));
      const f = cfg.faces.find(x => x.id === activePanelFace) || cfg.faces[0];
      renderContentBody(f);
    });
  }

  if (els.contentHead) {
    els.contentHead.addEventListener('click', e => {
      const b = e.target.closest('button[data-step-face]'); if (!b) return;
      const delta = parseInt(b.dataset.stepFace, 10) || 0;
      const idx = cfg.faces.findIndex(x => x.id === activePanelFace);
      const nextIdx = (idx + delta + cfg.faces.length) % cfg.faces.length;
      interact();
      goTo(cfg.faces[nextIdx].id);
    });
  }

  window.addEventListener('keydown', e => {
    if (e.target.matches('input, textarea, select')) return;
    const map = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' };
    if (map[e.key]) { e.preventDefault(); step(map[e.key]); return; }
    if (/^[1-6]$/.test(e.key)) { interact(); goTo(cfg.faces[+e.key - 1].id); return; }
    if (e.key === ' ') { e.preventDefault(); userPaused = !userPaused; if (!userPaused) lastInteract = -1e9; }
    if (e.key === 'Home') { interact(); goTo('front'); }
    if ((e.key === 'v' || e.key === 'V') && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      setLayout(cfg.page.layout === 'sidebar' ? 'center' : 'sidebar');
    }
  });

  window.addEventListener('resize', applySizes);

  /* ---------- Atualização ao vivo ---------- */
  window.addEventListener('storage', e => {
    if (e.key === MC.KEY) { cfg = MC.load(); rebuild(); }
  });
  window.addEventListener('message', e => {
    const d = e.data || {};
    if (d.type === 'menucubo:config' && d.config) { cfg = MC.normalize(d.config); rebuild(); }
    if (d.type === 'menucubo:goto' && FACE_ROT[d.face]) { interact(); goTo(d.face); }
  });

  /* ---------- Relógio ---------- */
  function tick() {
    const d = new Date();
    els.clockTime.textContent = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    els.clockDate.textContent = d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  }
  tick(); setInterval(tick, 1000);

  activePanelFace = detectFace();
  rebuild();
  requestAnimationFrame(frame);
})();
