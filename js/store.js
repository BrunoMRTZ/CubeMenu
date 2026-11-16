/* MenuCubo – armazenamento e configuração padrão (compartilhado entre menu e configuração) */
(function (global) {
  'use strict';

  const KEY = 'menucubo.config.v1';
  const FACE_IDS = ['front', 'right', 'back', 'left', 'top', 'bottom'];
  const FACE_LABELS = {
    front: 'Frente', right: 'Direita', back: 'Trás',
    left: 'Esquerda', top: 'Topo', bottom: 'Base'
  };

  let counter = 0;
  const uid = () => 's' + Date.now().toString(36) + (counter++).toString(36) + Math.random().toString(36).slice(2, 6);

  const sc = (label, url, icon = '', openMode = 'tab') => ({
    id: uid(),
    label,
    url,
    icon,
    color: '',
    newTab: openMode === 'tab',
    openMode: openMode || 'tab'
  });

  const FACE_DEFAULTS = {
    id: 'front', title: 'Face', icon: '⭐',
    bgType: 'gradient', bg1: '#4f46e5', bg2: '#7c3aed', angle: 135, bgImage: '',
    textColor: '#ffffff', tileColor: '#ffffff', tileOpacity: 0.14,
    borderColor: '#ffffff', borderOpacity: 0.35, borderWidth: 1,
    radius: 18, columns: 3, showLabels: true, inRotation: true,
    shortcuts: []
  };

  function face(id, title, icon, bg1, bg2, shortcuts, extra = {}) {
    return Object.assign(clone(FACE_DEFAULTS), { id, title, icon, bg1, bg2, shortcuts }, extra);
  }

  function defaults() {
    return {
      version: 1,
      page: {
        title: 'Menu Cubo',
        layout: 'center',            // center | sidebar
        showLayoutToggle: true,
        defaultOpenMode: 'tab',      // tab | self | embed
        showClock: true,
        showHint: true,
        showNav: true,
        showControls: true
      },
      background: {
        type: 'animated',            // solid | gradient | animated | image
        color1: '#0f172a',
        color2: '#1e1b4b',
        color3: '#312e81',
        angle: 135,
        animSpeed: 18,               // segundos por ciclo
        image: '',
        imageFit: 'cover',           // cover | contain | repeat
        blur: 0,
        overlayColor: '#000000',
        overlayOpacity: 0.25,
        effect: 'stars',             // none | stars | bubbles
        effectColor: '#ffffff',
        effectDensity: 120
      },
      rotation: {
        autoRotate: true,
        mode: 'continuous',          // continuous | steps
        speed: 14,                   // graus por segundo
        direction: 1,                // 1 = anti-horário (para a esquerda), -1 = horário
        tilt: -18,                   // inclinação vertical padrão
        wobble: true,
        wobbleAmp: 12,
        stepInterval: 4,             // segundos entre faces (modo por faces)
        pauseOnHover: true,
        resumeDelay: 6,              // segundos sem interação para retomar
        snap: true,
        transitionMs: 900,
        dragSensitivity: 0.4
      },
      sidebar: {
        position: 'left',            // left | right
        width: 340,
        cubeSize: 250,
        cubeLabels: false,           // nomes dos atalhos dentro do cubo pequeno
        showList: true,              // lista de atalhos da face abaixo do cubo
        showContent: true,           // painel grande com os atalhos da face
        followRotation: true,        // painel acompanha a rotação automática
        contentColumns: 0,           // 0 = automático
        glass: true
      },
      cube: {
        size: 380,
        perspective: 1400,
        faceOpacity: 0.96,
        glow: true,
        glowStrength: 45,
        gap: 0
      },
      faces: [
        face('front', 'Trabalho', '💼', '#4f46e5', '#7c3aed', [
          sc('Gmail', 'https://mail.google.com', '📧'),
          sc('Agenda', 'https://calendar.google.com', '📅'),
          sc('Drive', 'https://drive.google.com', '📁'),
          sc('Docs', 'https://docs.google.com', '📝'),
          sc('Planilhas', 'https://sheets.google.com', '📊'),
          sc('Meet', 'https://meet.google.com', '🎥')
        ]),
        face('right', 'Desenvolvimento', '💻', '#0f766e', '#0e7490', [
          sc('GitHub', 'https://github.com', '🐙'),
          sc('Stack Overflow', 'https://stackoverflow.com', '❓'),
          sc('MDN', 'https://developer.mozilla.org', '📘'),
          sc('Can I Use', 'https://caniuse.com', '✅'),
          sc('CodePen', 'https://codepen.io', '✏️'),
          sc('npm', 'https://www.npmjs.com', '📦')
        ]),
        face('back', 'Entretenimento', '🎬', '#dc2626', '#ea580c', [
          sc('YouTube', 'https://www.youtube.com', '▶️'),
          sc('Netflix', 'https://www.netflix.com', '🎞️'),
          sc('Spotify', 'https://open.spotify.com', '🎵'),
          sc('Twitch', 'https://www.twitch.tv', '🎮'),
          sc('Prime Video', 'https://www.primevideo.com', '📺'),
          sc('Globoplay', 'https://globoplay.globo.com', '🌐')
        ]),
        face('left', 'Social', '💬', '#db2777', '#9333ea', [
          sc('WhatsApp', 'https://web.whatsapp.com', '💚'),
          sc('Instagram', 'https://www.instagram.com', '📸'),
          sc('LinkedIn', 'https://www.linkedin.com', '💼'),
          sc('X', 'https://x.com', '✖️'),
          sc('Reddit', 'https://www.reddit.com', '👽'),
          sc('Telegram', 'https://web.telegram.org', '✈️')
        ]),
        face('top', 'Notícias', '📰', '#d97706', '#b45309', [
          sc('G1', 'https://g1.globo.com', '🗞️'),
          sc('Folha', 'https://www.folha.uol.com.br', '📄'),
          sc('BBC Brasil', 'https://www.bbc.com/portuguese', '🌍'),
          sc('Estadão', 'https://www.estadao.com.br', '📰'),
          sc('Hacker News', 'https://news.ycombinator.com', '🧡'),
          sc('The Verge', 'https://www.theverge.com', '🔺')
        ]),
        face('bottom', 'Ferramentas', '🧰', '#16a34a', '#065f46', [
          sc('Tradutor', 'https://translate.google.com', '🔤'),
          sc('Maps', 'https://maps.google.com', '🗺️'),
          sc('Gemini', 'https://gemini.google.com', '✨'),
          sc('Clima', 'https://www.google.com/search?q=clima', '⛅'),
          sc('Câmbio', 'https://www.google.com/search?q=cota%C3%A7%C3%A3o+d%C3%B3lar', '💱'),
          sc('Velocidade', 'https://fast.com', '⚡', 'embed')
        ])
      ]
    };
  }

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function isObj(v) { return v && typeof v === 'object' && !Array.isArray(v); }

  function merge(base, extra) {
    const out = clone(base);
    if (!isObj(extra)) return out;
    for (const k of Object.keys(extra)) {
      if (isObj(out[k]) && isObj(extra[k])) out[k] = merge(out[k], extra[k]);
      else if (extra[k] !== undefined) out[k] = extra[k];
    }
    return out;
  }

  /** Garante que uma configuração (possivelmente parcial/antiga) tenha todos os campos. */
  function normalize(raw) {
    const def = defaults();
    const cfg = merge(def, isObj(raw) ? raw : {});
    const given = Array.isArray(raw && raw.faces) ? raw.faces : [];
    cfg.faces = FACE_IDS.map((id, i) => {
      const src = given.find(f => f && f.id === id) || given[i] || null;
      const base = def.faces[i];
      if (!src) return base;
      const f = merge(FACE_DEFAULTS, src);
      f.id = id;
      f.shortcuts = (Array.isArray(src.shortcuts) ? src.shortcuts : []).map(s => {
        const mode = s.openMode || (s.newTab === false ? 'self' : 'tab');
        return {
          id: s.id || uid(),
          label: String(s.label ?? ''),
          url: String(s.url ?? ''),
          icon: String(s.icon ?? ''),
          color: String(s.color ?? ''),
          newTab: mode === 'tab',
          openMode: mode
        };
      });
      return f;
    });
    return cfg;
  }

  function load() {
    try {
      const txt = localStorage.getItem(KEY);
      if (txt) return normalize(JSON.parse(txt));
    } catch (e) { console.warn('MenuCubo: configuração inválida, usando padrão.', e); }
    return defaults();
  }

  function save(cfg) {
    try { localStorage.setItem(KEY, JSON.stringify(cfg)); return true; }
    catch (e) { console.error('MenuCubo: falha ao salvar', e); return false; }
  }

  function reset() { localStorage.removeItem(KEY); return defaults(); }

  /* ---------- utilidades compartilhadas ---------- */
  function hexToRgba(hex, a = 1) {
    let h = String(hex || '#000').replace('#', '');
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    const n = parseInt(h.slice(0, 6), 16) || 0;
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
  }

  function normalizeUrl(url) {
    const u = String(url || '').trim();
    if (!u) return '#';
    if (/^[a-z][a-z0-9+.-]*:/i.test(u) || u.startsWith('/') || u.startsWith('#') || u.startsWith('.')) return u;
    return 'https://' + u;
  }

  function isImageIcon(icon) {
    return /^(https?:|data:|\.{0,2}\/)/i.test(icon || '') || /\.(png|jpe?g|gif|svg|webp|ico)(\?.*)?$/i.test(icon || '');
  }

  function faviconFor(url) {
    try {
      const host = new URL(normalizeUrl(url)).hostname;
      return host ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=64` : '';
    } catch { return ''; }
  }

  function faceBackground(f) {
    if (f.bgType === 'solid') return f.bg1;
    if (f.bgType === 'image' && f.bgImage) {
      return `linear-gradient(${hexToRgba(f.bg1, 0.55)}, ${hexToRgba(f.bg2, 0.55)}), url("${f.bgImage}") center / cover no-repeat`;
    }
    return `linear-gradient(${f.angle}deg, ${f.bg1}, ${f.bg2})`;
  }

  global.MenuCubo = {
    KEY, FACE_IDS, FACE_LABELS, FACE_DEFAULTS,
    uid, defaults, normalize, load, save, reset, clone,
    hexToRgba, normalizeUrl, isImageIcon, faviconFor, faceBackground
  };
})(window);

