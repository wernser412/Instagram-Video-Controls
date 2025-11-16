// ==UserScript==
// @name         Instagram Video Controls
// @namespace    http://tampermonkey.net/
// @version      2025.11.16
// @description  Añade controles personalizados a los videos de Instagram, incluyendo la opción de descargar una imagen del video, y los hace visibles solo cuando el ratón pasa por encima. Incluye opciones de velocidad de reproducción adicionales y muestra microsegundos.
// @author       wernser412
// @downloadURL  https://github.com/wernser412/Instagram-Video-Controls/raw/refs/heads/main/Instagram%20Video%20Controls.user.js
// @match        https://www.instagram.com/*
// @icon         https://github.com/wernser412/Instagram-Video-Controls/blob/main/ICONO.png?raw=true
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const STORAGE_KEY = 'ig_auto_volume_level';
    const DEBUG = true;

    function log(...args){ if(DEBUG) console.log('[IG-Controls+Vol]', ...args); }

    function getSavedVolume() {
        const v = localStorage.getItem(STORAGE_KEY);
        const n = parseFloat(v);
        return (isFinite(n) && n >= 0 && n <= 1) ? n : 1.0;
    }

    function saveVolume(v) {
        try { localStorage.setItem(STORAGE_KEY, String(v)); } catch(e) {}
    }

    let userInteracted = false;

    function forceUnmute(video) {
        if (!video) return;
        try {
            if (video.dataset._ig_unmute_processing === '1') return;
            video.dataset._ig_unmute_processing = '1';

            video.removeAttribute('muted');
            video.muted = false;
            const vol = getSavedVolume();
            if(typeof video.volume === 'number') video.volume = vol;

            setTimeout(() => {
                video.removeAttribute('muted');
                video.muted = false;
                if(typeof video.volume === 'number') video.volume = getSavedVolume();
                setTimeout(()=>{ video.dataset._ig_unmute_processing='0'; }, 1500);
            }, 150);

        } catch(e) { video.dataset._ig_unmute_processing='0'; console.error(e); }
    }

    function formatTime(time) {
        const minutes = Math.floor(time/60);
        const seconds = Math.floor(time%60);
        const ms = Math.floor((time%1)*1000);
        return `${minutes}:${seconds<10?'0':''}${seconds}.${ms.toString().padStart(3,'0')}`;
    }

    // Crear controles personalizados para un video
    function addCustomControls(video){
        if(!video || video.dataset.customControlsAdded) return;
        video.dataset.customControlsAdded='1';

        const wrapper = document.createElement('div');
        wrapper.style.position='relative';
        video.parentNode.insertBefore(wrapper, video);
        wrapper.appendChild(video);

        const controls = document.createElement('div');
        controls.style.position='absolute';
        controls.style.top='10px';
        controls.style.left='10px';
        controls.style.background='rgba(0,0,0,0.3)';
        controls.style.color='white';
        controls.style.padding='10px';
        controls.style.borderRadius='5px';
        controls.style.zIndex='1000';
        controls.style.display='flex';
        controls.style.flexDirection='column';
        controls.style.alignItems='flex-start';
        controls.style.cursor='default';
        controls.style.opacity='0';
        controls.style.transition='opacity 0.3s';

        wrapper.addEventListener('mouseenter',()=>controls.style.opacity='1');
        wrapper.addEventListener('mouseleave',()=>controls.style.opacity='0');

        const unlockAudio = ()=>{ userInteracted=true; };

        // Play/Pause
        const playBtn = document.createElement('button');
        playBtn.textContent='Play';
        playBtn.style.marginBottom='5px';
        playBtn.addEventListener('click', ()=>{
            unlockAudio();
            if(video.paused){ video.play(); playBtn.textContent='Pause'; }
            else{ video.pause(); playBtn.textContent='Play'; }
        });

        // Velocidad
        const speedSelect = document.createElement('select');
        speedSelect.style.marginBottom='5px';
        speedSelect.innerHTML=`
            <option value="0.05">0.05x</option>
            <option value="0.1">0.1x</option>
            <option value="0.25">0.25x</option>
            <option value="0.5">0.5x</option>
            <option value="0.75">0.75x</option>
            <option value="1" selected>1x</option>
            <option value="1.25">1.25x</option>
            <option value="1.5">1.5x</option>
            <option value="1.75">1.75x</option>
            <option value="2">2x</option>
            <option value="3">3x</option>
        `;
        speedSelect.addEventListener('change', e=>{
            unlockAudio();
            video.playbackRate=parseFloat(e.target.value);
        });

        // Fullscreen
        const fsBtn=document.createElement('button');
        fsBtn.textContent='Fullscreen';
        fsBtn.style.marginBottom='5px';
        fsBtn.addEventListener('click', ()=>{
            unlockAudio();
            if(document.fullscreenElement) document.exitFullscreen();
            else if(video.requestFullscreen) video.requestFullscreen();
            else if(video.webkitRequestFullscreen) video.webkitRequestFullscreen();
            else if(video.msRequestFullscreen) video.msRequestFullscreen();
        });

        // Descargar imagen
        const dlBtn=document.createElement('button');
        dlBtn.textContent='Download Image';
        dlBtn.style.marginBottom='5px';
        dlBtn.addEventListener('click',()=>{
            unlockAudio();
            const canvas=document.createElement('canvas');
            canvas.width=video.videoWidth;
            canvas.height=video.videoHeight;
            const ctx=canvas.getContext('2d');
            ctx.drawImage(video,0,0,canvas.width,canvas.height);
            canvas.toBlob(blob=>{
                const url=URL.createObjectURL(blob);
                const link=document.createElement('a');
                link.href=url;
                link.download=`frame_${Math.floor(video.currentTime*1000)}ms.png`;
                link.click();
                URL.revokeObjectURL(url);
            },'image/png');
        });

        // Volumen
        const volContainer=document.createElement('div');
        volContainer.style.marginBottom='5px';
        volContainer.style.display='flex';
        volContainer.style.flexDirection='column'; // porcentaje debajo
        volContainer.style.alignItems='flex-start';
        volContainer.style.gap='2px';

        const volSlider=document.createElement('input');
        volSlider.type='range';
        volSlider.min=0; volSlider.max=1; volSlider.step=0.01;
        volSlider.value=getSavedVolume();
        volSlider.style.accentColor=volSlider.value==0?'grey':'limegreen';

        const volPercent = document.createElement('span');
        volPercent.style.fontSize='12px';
        volPercent.textContent = `${Math.round(volSlider.value*100)}%`;

        volSlider.addEventListener('input',()=>{
            unlockAudio();
            const v=parseFloat(volSlider.value);
            video.volume=v;
            video.muted=v===0;
            saveVolume(v);
            volSlider.style.accentColor=v===0?'grey':'limegreen';
            volPercent.textContent=`${Math.round(v*100)}%`;
        });

        volContainer.appendChild(volSlider);
        volContainer.appendChild(volPercent);

        // Barra de progreso
        const progress=document.createElement('input');
        progress.type='range';
        progress.min=0; progress.max=100; progress.value=0;
        progress.style.marginBottom='5px';
        progress.addEventListener('input',()=>{
            unlockAudio();
            video.currentTime=(video.duration*progress.value)/100;
        });

        // Tiempo con microsegundos
        const timeDisplay=document.createElement('span');
        timeDisplay.style.marginBottom='5px';
        timeDisplay.textContent='0:00.000';
        video.addEventListener('timeupdate',()=>{
            timeDisplay.textContent=formatTime(video.currentTime);
            progress.value=(video.currentTime/video.duration)*100;
        });

        // Forzar volumen persistente y auto-unmute
        const applyVolume=()=>{
            const v=getSavedVolume();
            video.volume=v;
            video.muted=v===0 && userInteracted;
            volSlider.value=v;
            volSlider.style.accentColor=v===0?'grey':'limegreen';
            volPercent.textContent=`${Math.round(v*100)}%`;
            forceUnmute(video);
        };

        video.addEventListener('loadedmetadata', applyVolume);
        video.addEventListener('play', applyVolume);
        applyVolume();

        controls.appendChild(playBtn);
        controls.appendChild(speedSelect);
        controls.appendChild(fsBtn);
        controls.appendChild(dlBtn);
        controls.appendChild(volContainer);
        controls.appendChild(progress);
        controls.appendChild(timeDisplay);

        wrapper.appendChild(controls);
    }

    function setupVideo(video){
        if(!video || video.dataset._ig_autovol_setup==='1') return;
        video.dataset._ig_autovol_setup='1';

        video.addEventListener('volumechange',()=>{
            const v=video.volume;
            saveVolume(v);
        });

        video.addEventListener('play', ()=>{ setTimeout(()=>forceUnmute(video),50); });

        addCustomControls(video);
    }

    function handleNode(node){
        if(!node || node.nodeType!==1) return;
        if(node.tagName==='VIDEO'){ setupVideo(node); forceUnmute(node); }
        else if(node.querySelectorAll){
            node.querySelectorAll('video').forEach(v=>{ setupVideo(v); forceUnmute(v); });
        }
    }

    const observer=new MutationObserver(mutations=>{
        mutations.forEach(m=>{
            m.addedNodes.forEach(node=>handleNode(node));
        });
    });

    observer.observe(document.documentElement||document.body,{childList:true,subtree:true});
    document.querySelectorAll('video').forEach(v=>{ setupVideo(v); forceUnmute(v); });

    document.addEventListener('click',()=>{ userInteracted=true; document.querySelectorAll('video').forEach(forceUnmute); },{capture:true,passive:true});
    document.addEventListener('touchstart',()=>{ userInteracted=true; document.querySelectorAll('video').forEach(forceUnmute); },{capture:true,passive:true});
    document.addEventListener('keydown',()=>{ userInteracted=true; document.querySelectorAll('video').forEach(forceUnmute); },{capture:true,passive:true});

    setInterval(()=>{ document.querySelectorAll('video').forEach(v=>{ if(v.dataset._ig_unmute_processing!=='1') forceUnmute(v); }); },1200);

    log('Instagram Video Controls + Auto Volume + Volume Percent loaded.');
})();
