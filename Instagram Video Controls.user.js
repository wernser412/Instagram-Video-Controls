// ==UserScript==
// @name         Instagram Video Controls
// @namespace    http://tampermonkey.net/
// @version      2025.05.26
// @description  Controles movibles con posición guardada para Instagram Reels
// @author       wernser412
// @match        https://www.instagram.com/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {

    'use strict';

    // =========================================
    // VIDEO ACTIVO
    // =========================================

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

    // =========================================
    // FORMATO TIEMPO
    // =========================================

    function formatTime(time) {

        if (!time) return '0:00.000';

        const m = Math.floor(time / 60);

        const s = Math.floor(time % 60);

        const ms = Math.floor((time % 1) * 1000);

        return `${m}:${s.toString().padStart(2,'0')}.${ms.toString().padStart(3,'0')}`;
    }

    // =========================================
    // CREAR BOTON
    // =========================================

    function createButton(text) {

        const btn = document.createElement('button');

        btn.textContent = text;

        btn.style.background = 'rgba(30,30,30,0.95)';
        btn.style.color = 'white';
        btn.style.border = '1px solid rgba(255,255,255,0.15)';
        btn.style.padding = '6px';
        btn.style.borderRadius = '8px';
        btn.style.cursor = 'pointer';
        btn.style.fontSize = '12px';
        btn.style.width = '100%';

        return btn;
    }

    // =========================================
    // EVITAR DUPLICADOS
    // =========================================

    if (window.__IG_CONTROLS__) return;

    window.__IG_CONTROLS__ = true;

    // =========================================
    // POSICION GUARDADA
    // =========================================

    const savedX =
        localStorage.getItem('ig_controls_x');

    const savedY =
        localStorage.getItem('ig_controls_y');

    // =========================================
    // PANEL
    // =========================================

    const controls =
        document.createElement('div');

    controls.style.position = 'fixed';

    controls.style.left =
        savedX || '20px';

    controls.style.top =
        savedY || '100px';

    controls.style.zIndex = '999999999';

    controls.style.display = 'flex';

    controls.style.flexDirection = 'column';

    controls.style.gap = '6px';

    controls.style.background =
        'rgba(0,0,0,0.85)';

    controls.style.backdropFilter =
        'blur(10px)';

    controls.style.padding = '10px';

    controls.style.borderRadius = '14px';

    controls.style.width = '170px';

    controls.style.userSelect = 'none';

    controls.style.boxShadow =
        '0 0 15px rgba(0,0,0,0.4)';

    document.body.appendChild(controls);

    // =========================================
    // HEADER DRAG
    // =========================================

    const dragBar =
        document.createElement('div');

    dragBar.textContent =
        'Instagram Controls';

    dragBar.style.color = 'white';

    dragBar.style.fontSize = '12px';

    dragBar.style.fontWeight = 'bold';

    dragBar.style.cursor = 'move';

    dragBar.style.padding = '4px';

    dragBar.style.textAlign = 'center';

    dragBar.style.background =
        'rgba(255,255,255,0.08)';

    dragBar.style.borderRadius = '8px';

    controls.appendChild(dragBar);

    // =========================================
    // DRAG SYSTEM
    // =========================================

    let isDragging = false;

    let offsetX = 0;

    let offsetY = 0;

    dragBar.addEventListener('mousedown', e => {

        isDragging = true;

        offsetX =
            e.clientX - controls.offsetLeft;

        offsetY =
            e.clientY - controls.offsetTop;
    });

    document.addEventListener('mousemove', e => {

        if (!isDragging) return;

        const newLeft =
            e.clientX - offsetX;

        const newTop =
            e.clientY - offsetY;

        controls.style.left =
            newLeft + 'px';

        controls.style.top =
            newTop + 'px';
    });

    document.addEventListener('mouseup', () => {

        if (!isDragging) return;

        isDragging = false;

        // GUARDAR POSICION

        localStorage.setItem(
            'ig_controls_x',
            controls.style.left
        );

        localStorage.setItem(
            'ig_controls_y',
            controls.style.top
        );
    });

    // =========================================
    // PLAY / PAUSE
    // =========================================

    const playBtn =
        createButton('Play / Pause');

    playBtn.onclick = () => {

        const v = getActiveVideo();

        if (!v) return;

        if (v.paused) {

            v.play();

        } else {

            v.pause();
        }
    };

    // =========================================
    // VELOCIDAD
    // =========================================

    const speed =
        document.createElement('select');

    speed.style.background =
        'rgba(30,30,30,0.95)';

    speed.style.color = 'white';

    speed.style.border =
        '1px solid rgba(255,255,255,0.15)';

    speed.style.borderRadius = '8px';

    speed.style.padding = '6px';

    speed.innerHTML = `
        <option value="0.05">0.05x</option>
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

    speed.onchange = () => {

        const v = getActiveVideo();

        if (!v) return;

        v.playbackRate =
            parseFloat(speed.value);
    };

    // =========================================
    // FULLSCREEN
    // =========================================

    const fsBtn =
        createButton('Fullscreen');

    fsBtn.onclick = async () => {

        const v = getActiveVideo();

        if (!v) return;

        try {

            if (document.fullscreenElement) {

                await document.exitFullscreen();

            } else {

                const container =
                    v.closest('article') ||
                    v.parentElement ||
                    v;

                await container.requestFullscreen();
            }

        } catch (e) {

            console.log(e);
        }
    };

    // =========================================
    // DOWNLOAD FRAME
    // =========================================

    const imgBtn =
        createButton('Download Frame');

    imgBtn.onclick = () => {

        const v = getActiveVideo();

        if (!v) return;

        const canvas =
            document.createElement('canvas');

        canvas.width = v.videoWidth;

        canvas.height = v.videoHeight;

        const ctx =
            canvas.getContext('2d');

        ctx.drawImage(v, 0, 0);

        const a =
            document.createElement('a');

        a.href =
            canvas.toDataURL('image/png');

        a.download =
            `instagram_frame_${Date.now()}.png`;

        a.click();
    };

    // =========================================
    // VOLUMEN
    // =========================================

    const volume =
        document.createElement('input');

    volume.type = 'range';

    volume.min = 0;

    volume.max = 1;

    volume.step = 0.01;

    volume.value = 1;

    volume.oninput = () => {

        const v = getActiveVideo();

        if (!v) return;

        v.muted = false;

        v.volume =
            parseFloat(volume.value);
    };

    // =========================================
    // PROGRESS
    // =========================================

    const progress =
        document.createElement('input');

    progress.type = 'range';

    progress.min = 0;

    progress.max = 100;

    progress.value = 0;

    progress.oninput = () => {

        const v = getActiveVideo();

        if (!v || !v.duration) return;

        v.currentTime =
            (progress.value / 100) *
            v.duration;
    };

    // =========================================
    // TIEMPO
    // =========================================

    const time =
        document.createElement('div');

    time.style.color = 'white';

    time.style.fontSize = '12px';

    time.style.textAlign = 'center';

    // =========================================
    // UPDATE LOOP
    // =========================================

    setInterval(() => {

        const v = getActiveVideo();

        if (!v) return;

        v.muted = false;

        if (v.duration) {

            progress.value =
                (v.currentTime / v.duration) * 100;
        }

        time.textContent =
            formatTime(v.currentTime);

    }, 100);

    // =========================================
    // APPEND
    // =========================================

    controls.appendChild(playBtn);

    controls.appendChild(speed);

    controls.appendChild(fsBtn);

    controls.appendChild(imgBtn);

    controls.appendChild(volume);

    controls.appendChild(progress);

    controls.appendChild(time);

})();
