// ==UserScript==
// @name         Instagram Video Controls
// @namespace    http://tampermonkey.net/
// @version      2026.07.14
// @description  Panel flotante, colapsable y con atajos de teclado para controlar videos/Reels de Instagram. Posición y estado guardados.
// @author       wernser412
// @downloadURL  https://github.com/wernser412/Instagram-Video-Controls/raw/refs/heads/main/Instagram%20Video%20Controls.user.js
// @match        https://www.instagram.com/*
// @icon         https://github.com/wernser412/Instagram-Video-Controls/blob/main/ICONO.png?raw=true
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // Evitar duplicados si Tampermonkey inyecta el script más de una vez
    // (p. ej. navegación SPA que vuelve a disparar @run-at document-idle).
    if (window.__IG_CONTROLS__) return;
    window.__IG_CONTROLS__ = true;

    // ========================= CONFIG =========================

    const LS_KEY = {
        x: 'ig_controls_x',
        y: 'ig_controls_y',
        collapsed: 'ig_controls_collapsed',
        volume: 'ig_controls_volume'
    };

    const DEFAULT_POS = { x: 20, y: 100 };
    const MARGIN = 8; // separación mínima con el borde de la ventana

    // ========================= UTILIDADES =========================

    function clamp(n, min, max) {
        return Math.min(Math.max(n, min), max);
    }

    function formatTime(t) {
        if (!t || !isFinite(t)) return '0:00';
        const m = Math.floor(t / 60);
        const s = Math.floor(t % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    }

    // El video "activo" es el más grande visible en pantalla: así el panel
    // siempre controla el Reel que el usuario está viendo, aunque haya
    // varios <video> precargados arriba/abajo en el feed.
    function getActiveVideo() {
        const videos = [...document.querySelectorAll('video')];
        let best = null;
        let bestArea = 0;

        videos.forEach(v => {
            const rect = v.getBoundingClientRect();
            const visible =
                rect.width > 150 &&
                rect.height > 150 &&
                rect.bottom > 0 &&
                rect.top < window.innerHeight;

            if (!visible) return;

            const area = rect.width * rect.height;
            if (area > bestArea) {
                bestArea = area;
                best = v;
            }
        });

        return best;
    }

    function debounce(fn, ms) {
        let t = null;
        return (...args) => {
            clearTimeout(t);
            t = setTimeout(() => fn(...args), ms);
        };
    }

    // ========================= ICONOS (SVG) =========================

    const ICONS = {
        play: '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M8 5v14l11-7z"/></svg>',
        pause: '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M6 5h4v14H6zm8 0h4v14h-4z"/></svg>',
        fsEnter: '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M4 9V4h5v2H6v3H4zm0 6v5h5v-2H6v-3H4zm16-6V4h-5v2h3v3h2zm0 6v5h-5v-2h3v-3h2z"/></svg>',
        fsExit: '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M9 4H4v5h2V6h3V4zm6 0h5v5h-2V6h-3V4zM4 15v5h5v-2H6v-3H4zm16 0h-2v3h-3v2h5v-5z"/></svg>',
        download: '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M12 3v10.6l3.3-3.3 1.4 1.4L12 17l-4.7-4.7 1.4-1.4 3.3 3.3V3h2zM5 19h14v2H5z"/></svg>',
        volume: '<svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M4 9v6h4l5 5V4L8 9H4zm11.5 3a4.5 4.5 0 0 0-2.3-3.9v7.8A4.5 4.5 0 0 0 15.5 12z"/></svg>',
        chevron: '<svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M7 10l5 5 5-5z"/></svg>',
        camera: '<svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M9 2l-1.8 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.2L15 2H9zm3 15a5 5 0 1 1 0-10 5 5 0 0 1 0 10z"/></svg>'
    };

    // ========================= ESTILOS =========================

    const style = document.createElement('style');
    style.textContent = `
        #igvc-panel {
            position: fixed;
            z-index: 2147483647;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            user-select: none;
        }
        #igvc-panel * { box-sizing: border-box; }

        #igvc-card {
            width: 190px;
            background: linear-gradient(180deg, rgba(24,24,27,.92), rgba(15,15,17,.92));
            backdrop-filter: blur(12px);
            border: 1px solid rgba(255,255,255,.08);
            border-radius: 16px;
            box-shadow: 0 8px 28px rgba(0,0,0,.5);
            overflow: hidden;
            transition: width .18s ease;
        }

        #igvc-header {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 9px 10px;
            cursor: grab;
            background: linear-gradient(90deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888);
        }
        #igvc-header:active { cursor: grabbing; }

        #igvc-title {
            flex: 1;
            color: #fff;
            font-size: 11.5px;
            font-weight: 700;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            text-shadow: 0 1px 2px rgba(0,0,0,.35);
        }

        #igvc-toggle {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: rgba(255,255,255,.18);
            color: #fff;
            cursor: pointer;
            flex-shrink: 0;
            transition: transform .2s ease, background .15s ease;
        }
        #igvc-toggle:hover { background: rgba(255,255,255,.3); }
        #igvc-toggle.collapsed { transform: rotate(-90deg); }

        #igvc-body {
            display: flex;
            flex-direction: column;
            gap: 9px;
            padding: 10px;
        }
        #igvc-panel.igvc-collapsed #igvc-body { display: none; }
        #igvc-panel.igvc-collapsed #igvc-card { width: 132px; }

        .igvc-row { display: flex; align-items: center; gap: 6px; }

        .igvc-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 4px;
            flex: 1;
            height: 30px;
            background: rgba(255,255,255,.06);
            border: 1px solid rgba(255,255,255,.09);
            color: #f2f2f2;
            border-radius: 9px;
            cursor: pointer;
            transition: background .15s ease, transform .08s ease;
        }
        .igvc-btn:hover { background: rgba(255,255,255,.14); }
        .igvc-btn:active { transform: scale(.93); }
        .igvc-btn.igvc-active {
            background: linear-gradient(90deg, #dc2743, #bc1888);
            border-color: transparent;
        }
        .igvc-btn:disabled { opacity: .35; cursor: default; pointer-events: none; }

        #igvc-speed {
            flex: 1;
            height: 30px;
            background: rgba(255,255,255,.06);
            border: 1px solid rgba(255,255,255,.09);
            color: #f2f2f2;
            border-radius: 9px;
            font-size: 11px;
            padding: 0 4px;
            cursor: pointer;
        }
        #igvc-speed:focus { outline: none; }
        #igvc-speed option {
            background: #1c1c1e;
            color: #f2f2f2;
        }

        .igvc-slider-row {
            display: flex;
            align-items: center;
            gap: 7px;
            color: #cfcfcf;
        }

        input[type="range"].igvc-range {
            -webkit-appearance: none;
            appearance: none;
            flex: 1;
            height: 4px;
            border-radius: 3px;
            background: rgba(255,255,255,.18);
            cursor: pointer;
        }
        input[type="range"].igvc-range::-webkit-slider-thumb {
            -webkit-appearance: none;
            width: 13px;
            height: 13px;
            border-radius: 50%;
            background: #fff;
            box-shadow: 0 0 0 2px #dc2743;
            margin-top: -4.5px;
            cursor: pointer;
        }
        input[type="range"].igvc-range::-moz-range-thumb {
            width: 13px;
            height: 13px;
            border: none;
            border-radius: 50%;
            background: #fff;
            box-shadow: 0 0 0 2px #dc2743;
            cursor: pointer;
        }
        input[type="range"].igvc-range::-moz-range-track {
            height: 4px;
            border-radius: 3px;
            background: rgba(255,255,255,.18);
        }

        #igvc-time {
            color: #d8d8d8;
            font-size: 10.5px;
            text-align: center;
            font-variant-numeric: tabular-nums;
        }

        #igvc-hint {
            font-size: 9px;
            color: rgba(255,255,255,.35);
            text-align: center;
            line-height: 1.3;
        }
    `;
    document.head.appendChild(style);

    // ========================= DOM =========================

    const panel = document.createElement('div');
    panel.id = 'igvc-panel';

    const card = document.createElement('div');
    card.id = 'igvc-card';
    panel.appendChild(card);

    // ---- Header (drag handle + colapsar) ----
    const header = document.createElement('div');
    header.id = 'igvc-header';

    const title = document.createElement('div');
    title.id = 'igvc-title';
    title.textContent = '🎬 IG Controls';

    const toggle = document.createElement('div');
    toggle.id = 'igvc-toggle';
    toggle.innerHTML = ICONS.chevron;
    toggle.title = 'Colapsar / expandir';

    header.appendChild(title);
    header.appendChild(toggle);
    card.appendChild(header);

    // ---- Body ----
    const body = document.createElement('div');
    body.id = 'igvc-body';
    card.appendChild(body);

    function makeIconBtn(iconHTML, labelTitle) {
        const b = document.createElement('div');
        b.className = 'igvc-btn';
        b.innerHTML = iconHTML;
        b.title = labelTitle;
        return b;
    }

    const row1 = document.createElement('div');
    row1.className = 'igvc-row';

    const playBtn = makeIconBtn(ICONS.play, 'Reproducir / pausar (Espacio)');
    const fsBtn = makeIconBtn(ICONS.fsEnter, 'Pantalla completa (F)');
    const imgBtn = makeIconBtn(ICONS.camera, 'Descargar frame actual');

    row1.appendChild(playBtn);
    row1.appendChild(fsBtn);
    row1.appendChild(imgBtn);
    body.appendChild(row1);

    const speed = document.createElement('select');
    speed.id = 'igvc-speed';
    speed.innerHTML = `
        <option value="0.1">0.1x</option>
        <option value="0.25">0.25x</option>
        <option value="0.5">0.5x</option>
        <option value="0.75">0.75x</option>
        <option value="1" selected>1x</option>
        <option value="1.25">1.25x</option>
        <option value="1.5">1.5x</option>
        <option value="2">2x</option>
        <option value="3">3x</option>
    `;
    speed.title = 'Velocidad de reproducción';
    body.appendChild(speed);

    const volRow = document.createElement('div');
    volRow.className = 'igvc-slider-row';
    const volIcon = document.createElement('span');
    volIcon.innerHTML = ICONS.volume;
    volIcon.style.display = 'flex';
    const volume = document.createElement('input');
    volume.type = 'range';
    volume.className = 'igvc-range';
    volume.min = 0;
    volume.max = 1;
    volume.step = 0.01;
    const savedVolume = parseFloat(localStorage.getItem(LS_KEY.volume));
    volume.value = isFinite(savedVolume) ? savedVolume : 1;
    volRow.appendChild(volIcon);
    volRow.appendChild(volume);
    body.appendChild(volRow);

    const progress = document.createElement('input');
    progress.type = 'range';
    progress.className = 'igvc-range';
    progress.min = 0;
    progress.max = 100;
    progress.value = 0;
    body.appendChild(progress);

    const time = document.createElement('div');
    time.id = 'igvc-time';
    time.textContent = '0:00 / 0:00';
    body.appendChild(time);

    const hint = document.createElement('div');
    hint.id = 'igvc-hint';
    hint.textContent = 'Doble clic en el título: reposicionar';
    body.appendChild(hint);

    document.body.appendChild(panel);

    // ========================= POSICIÓN =========================

    function applyPosition(x, y) {
        const rect = panel.getBoundingClientRect();
        const maxX = window.innerWidth - rect.width - MARGIN;
        const maxY = window.innerHeight - rect.height - MARGIN;
        const cx = clamp(x, MARGIN, Math.max(MARGIN, maxX));
        const cy = clamp(y, MARGIN, Math.max(MARGIN, maxY));
        panel.style.left = cx + 'px';
        panel.style.top = cy + 'px';
        return { x: cx, y: cy };
    }

    const savedX = parseFloat(localStorage.getItem(LS_KEY.x));
    const savedY = parseFloat(localStorage.getItem(LS_KEY.y));
    panel.style.left = (isFinite(savedX) ? savedX : DEFAULT_POS.x) + 'px';
    panel.style.top = (isFinite(savedY) ? savedY : DEFAULT_POS.y) + 'px';

    // Reajustar dentro de la ventana una vez el panel ya tiene tamaño real.
    requestAnimationFrame(() => {
        const rect = panel.getBoundingClientRect();
        applyPosition(rect.left, rect.top);
    });

    const savePosition = debounce((x, y) => {
        localStorage.setItem(LS_KEY.x, x);
        localStorage.setItem(LS_KEY.y, y);
    }, 150);

    // ========================= DRAG (mouse + touch) =========================
    // Se usa Pointer Events en vez de mousedown/mousemove/mouseup: así el
    // mismo código funciona con mouse y con dedo (Tampermonkey en Firefox/
    // Kiwi para Android), y no queda "pegado" arrastrando si el puntero
    // sale del header (setPointerCapture).

    let dragging = false;
    let startX = 0, startY = 0, startLeft = 0, startTop = 0;

    header.addEventListener('pointerdown', e => {
        if (e.target.closest('#igvc-toggle')) return;
        dragging = true;
        header.setPointerCapture(e.pointerId);
        const rect = panel.getBoundingClientRect();
        startX = e.clientX;
        startY = e.clientY;
        startLeft = rect.left;
        startTop = rect.top;
    });

    header.addEventListener('pointermove', e => {
        if (!dragging) return;
        const newX = startLeft + (e.clientX - startX);
        const newY = startTop + (e.clientY - startY);
        const pos = applyPosition(newX, newY);
        savePosition(pos.x, pos.y);
    });

    function endDrag(e) {
        if (!dragging) return;
        dragging = false;
        try { header.releasePointerCapture(e.pointerId); } catch (_) {}
    }
    header.addEventListener('pointerup', endDrag);
    header.addEventListener('pointercancel', endDrag);

    // Doble clic en el título: vuelve a la posición por defecto.
    title.addEventListener('dblclick', () => {
        const pos = applyPosition(DEFAULT_POS.x, DEFAULT_POS.y);
        savePosition(pos.x, pos.y);
    });

    window.addEventListener('resize', () => {
        const rect = panel.getBoundingClientRect();
        applyPosition(rect.left, rect.top);
    });

    // ========================= COLAPSAR =========================

    function setCollapsed(collapsed) {
        panel.classList.toggle('igvc-collapsed', collapsed);
        toggle.classList.toggle('collapsed', collapsed);
        localStorage.setItem(LS_KEY.collapsed, collapsed ? '1' : '0');
    }

    toggle.addEventListener('click', () => {
        setCollapsed(!panel.classList.contains('igvc-collapsed'));
    });

    setCollapsed(localStorage.getItem(LS_KEY.collapsed) === '1');

    // ========================= ACCIONES =========================

    function withVideo(fn) {
        const v = getActiveVideo();
        if (!v) return;
        fn(v);
    }

    playBtn.addEventListener('click', () => withVideo(v => {
        if (v.paused) v.play(); else v.pause();
    }));

    speed.addEventListener('change', () => withVideo(v => {
        v.playbackRate = parseFloat(speed.value);
    }));

    fsBtn.addEventListener('click', () => withVideo(async v => {
        try {
            if (document.fullscreenElement) {
                await document.exitFullscreen();
            } else {
                // Se pone en fullscreen el <video> directamente (no el
                // "article" que lo envuelve): el overlay de controles de
                // Instagram (play, barra de progreso, volumen) vive fuera
                // de ese contenedor y el navegador solo muestra lo que
                // está DENTRO del elemento en fullscreen, así que quedaba
                // sin controles visibles. Activando los controles nativos
                // del <video> mientras dure el fullscreen, sí se ven.
                await v.requestFullscreen();
            }
        } catch (err) {
            console.warn('[IG Controls] No se pudo cambiar pantalla completa:', err);
        }
    }));

    document.addEventListener('fullscreenchange', () => {
        const fsVideo = document.fullscreenElement;
        if (fsVideo && fsVideo.tagName === 'VIDEO') {
            fsVideo.controls = true;
        } else {
            // Puede haberse salido con Esc en vez del botón: igual hay que
            // quitar los controles nativos del video que quedó en pantalla.
            document.querySelectorAll('video').forEach(v => { v.controls = false; });
        }
    });

    imgBtn.addEventListener('click', () => withVideo(v => {
        if (!v.videoWidth || !v.videoHeight) return;
        const canvas = document.createElement('canvas');
        canvas.width = v.videoWidth;
        canvas.height = v.videoHeight;
        canvas.getContext('2d').drawImage(v, 0, 0);
        const a = document.createElement('a');
        a.href = canvas.toDataURL('image/png');
        a.download = `instagram_frame_${Date.now()}.png`;
        a.click();
    }));

    volume.addEventListener('input', () => withVideo(v => {
        const val = parseFloat(volume.value);
        v.volume = val;
        v.muted = val <= 0; // en 0 se silencia de verdad en vez de quedar "sonando en 0"
        localStorage.setItem(LS_KEY.volume, val);
    }));

    // Mientras el usuario arrastra la barra de progreso no debe
    // pisoteársela el loop de actualización (bug del script original:
    // el intervalo sobreescribía progress.value en pleno arrastre).
    let seeking = false;
    progress.addEventListener('pointerdown', () => { seeking = true; });
    ['pointerup', 'pointercancel'].forEach(ev =>
        progress.addEventListener(ev, () => { seeking = false; })
    );
    progress.addEventListener('input', () => withVideo(v => {
        if (!v.duration) return;
        v.currentTime = (progress.value / 100) * v.duration;
    }));

    // ========================= ATAJOS DE TECLADO =========================
    // Se ignoran si el foco está en un campo de texto (comentarios, buscador,
    // etc.) para no interferir con el uso normal de Instagram.

    function isTypingContext() {
        const el = document.activeElement;
        if (!el) return false;
        const tag = el.tagName;
        return tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable;
    }

    document.addEventListener('keydown', e => {
        if (isTypingContext()) return;

        if (e.code === 'Space') {
            withVideo(v => { v.paused ? v.play() : v.pause(); });
            e.preventDefault();
        } else if (e.key === 'f' || e.key === 'F') {
            fsBtn.click();
        } else if (e.key === 'ArrowRight') {
            withVideo(v => { v.currentTime = Math.min(v.duration || 0, v.currentTime + 5); });
        } else if (e.key === 'ArrowLeft') {
            withVideo(v => { v.currentTime = Math.max(0, v.currentTime - 5); });
        } else if (e.key === 'ArrowUp') {
            volume.value = clamp(parseFloat(volume.value) + 0.05, 0, 1);
            volume.dispatchEvent(new Event('input'));
            e.preventDefault();
        } else if (e.key === 'ArrowDown') {
            volume.value = clamp(parseFloat(volume.value) - 0.05, 0, 1);
            volume.dispatchEvent(new Event('input'));
            e.preventDefault();
        }
    });

    // ========================= LOOP DE ACTUALIZACIÓN =========================

    let lastVideo = null;

    setInterval(() => {
        const v = getActiveVideo();

        if (!v) {
            // Sin video visible: reflejar estado vacío en vez de mostrar
            // datos viejos del último video controlado.
            playBtn.classList.remove('igvc-active');
            playBtn.innerHTML = ICONS.play;
            time.textContent = '0:00 / 0:00';
            lastVideo = null;
            return;
        }

        // Al detectar un video nuevo se sincroniza la velocidad guardada
        // en el <select> con la que ya traiga el video.
        if (v !== lastVideo) {
            lastVideo = v;
            speed.value = String(v.playbackRate || 1);
        }

        // Instagram tiene su propia lógica que revierte "muted" a true si
        // no detecta una interacción directa sobre SU botón de sonido; si
        // solo desmuteamos una vez, Instagram gana esa pelea un instante
        // después y el video queda mudo hasta que el usuario mueve el
        // slider (que fuerza el desmuteo muchas veces seguidas). Por eso
        // se reafirma en cada tick, no solo al cambiar de video.
        const vol = parseFloat(volume.value);
        if (v.volume !== vol) v.volume = vol;
        v.muted = vol <= 0;

        playBtn.innerHTML = v.paused ? ICONS.play : ICONS.pause;
        playBtn.classList.toggle('igvc-active', !v.paused);

        fsBtn.innerHTML = document.fullscreenElement ? ICONS.fsExit : ICONS.fsEnter;

        if (v.duration && !seeking) {
            progress.value = (v.currentTime / v.duration) * 100;
        }

        time.textContent = `${formatTime(v.currentTime)} / ${formatTime(v.duration)}`;
    }, 150);

})();
