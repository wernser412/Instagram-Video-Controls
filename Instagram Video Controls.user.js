// ==UserScript==
// @name         Instagram Video Controls
// @namespace    http://tampermonkey.net/
// @version      2025.09.08
// @description  Añade controles personalizados a los videos de Instagram, incluyendo la opción de descargar una imagen del video, y los hace visibles solo cuando el ratón pasa por encima. Incluye opciones de velocidad de reproducción adicionales y muestra microsegundos.
// @author       wernser412
// @downloadURL  https://github.com/wernser412/Instagram-Video-Controls/raw/refs/heads/main/Instagram%20Video%20Controls.user.js
// @match        https://www.instagram.com/*
// @icon         data:image/png;base64,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
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Función para formatear el tiempo en minutos, segundos y microsegundos (formato 60)
    const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    const microseconds = Math.floor((time % 1) * 60); // Ajuste de microsegundos a un rango de 60
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}:${microseconds < 10 ? '0' : ''}${microseconds}`;
    };

    // Función para añadir controles personalizados a todos los videos
    const addCustomControls = () => {
        const videos = document.querySelectorAll('video:not([data-custom-controls-added])');
        videos.forEach(video => {
            // Añadir atributo para evitar añadir controles más de una vez
            video.setAttribute('data-custom-controls-added', 'true');

            // Crear el contenedor de controles personalizados
            const controlsContainer = document.createElement('div');
            controlsContainer.className = 'custom-controls';
            controlsContainer.style.position = 'absolute';
            controlsContainer.style.top = '10px'; // Alineado al tope
            controlsContainer.style.left = '10px'; // Alineado a la izquierda
            controlsContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.3)'; // Fondo negro transparente
            controlsContainer.style.color = 'white';
            controlsContainer.style.padding = '10px';
            controlsContainer.style.borderRadius = '5px';
            controlsContainer.style.zIndex = '1000';
            controlsContainer.style.display = 'flex';
            controlsContainer.style.flexDirection = 'column';
            controlsContainer.style.alignItems = 'flex-start';
            controlsContainer.style.cursor = 'default'; // Sin cursor de arrastrar
            controlsContainer.style.opacity = '0'; // Invisible por defecto
            controlsContainer.style.transition = 'opacity 0.3s'; // Transición suave

            // Mostrar los controles al pasar el ratón
            controlsContainer.addEventListener('mouseenter', () => {
                controlsContainer.style.opacity = '1';
            });

            controlsContainer.addEventListener('mouseleave', () => {
                controlsContainer.style.opacity = '0';
            });

            // Crear el botón de Play/Pause
            const playPauseButton = document.createElement('button');
            playPauseButton.textContent = 'Play';
            playPauseButton.style.marginBottom = '5px';
            playPauseButton.addEventListener('click', () => {
                if (video.paused) {
                    video.play();
                    playPauseButton.textContent = 'Pause';
                } else {
                    video.pause();
                    playPauseButton.textContent = 'Play';
                }
            });

            // Control de Velocidad de Reproducción
            const speedControl = document.createElement('select');
            speedControl.style.marginBottom = '5px';
            speedControl.innerHTML = `
                <option value="0.1">0.1x</option>
                <option value="0.25">0.25x</option>
                <option value="0.5">0.5x</option>
                <option value="0.75">0.75x</option>
                <option value="1" selected>1x</option>
                <option value="1.25">1.25x</option>
                <option value="1.5">1.5x</option>
                <option value="1.75">1.75x</option>
                <option value="2">2x</option>
            `;
            speedControl.addEventListener('change', (event) => {
                video.playbackRate = parseFloat(event.target.value);
            });

            // Botón de Pantalla Completa
            const fullscreenButton = document.createElement('button');
            fullscreenButton.textContent = 'Fullscreen';
            fullscreenButton.style.marginBottom = '5px';
            fullscreenButton.addEventListener('click', () => {
                if (document.fullscreenElement) {
                    document.exitFullscreen();
                } else {
                    video.requestFullscreen().catch(err => {
                        console.error(`Error al intentar activar el modo de pantalla completa: ${err.message}`);
                    });
                }
            });

            // Botón de Descargar Imagen
            const downloadImageButton = document.createElement('button');
            downloadImageButton.textContent = 'Download Image';
            downloadImageButton.style.marginBottom = '5px';
            downloadImageButton.addEventListener('click', () => {
                const canvas = document.createElement('canvas');
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

                canvas.toBlob((blob) => {
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = 'frame.png'; // Nombre del archivo de imagen
                    link.click();
                    URL.revokeObjectURL(url);
                }, 'image/png');
            });

            // Barra de progreso
            const progress = document.createElement('input');
            progress.type = 'range';
            progress.min = 0;
            progress.max = 100;
            progress.value = 0;
            progress.style.marginBottom = '5px';
            progress.addEventListener('input', () => {
                const value = progress.value;
                video.currentTime = (video.duration * value) / 100;
            });

            // Tiempo transcurrido
            const currentTimeDisplay = document.createElement('span');
            currentTimeDisplay.className = 'current-time';
            currentTimeDisplay.textContent = '0:00.000';
            currentTimeDisplay.style.marginBottom = '5px';

            // Actualizar tiempos
            video.addEventListener('timeupdate', () => {
                currentTimeDisplay.textContent = formatTime(video.currentTime);
                progress.value = (video.currentTime / video.duration) * 100;
            });

            // Añadir controles al contenedor
            controlsContainer.appendChild(playPauseButton);
            controlsContainer.appendChild(speedControl);
            controlsContainer.appendChild(fullscreenButton);
            controlsContainer.appendChild(downloadImageButton);
            controlsContainer.appendChild(progress);
            controlsContainer.appendChild(currentTimeDisplay);

            // Añadir contenedor de controles al DOM
            const videoWrapper = document.createElement('div');
            videoWrapper.style.position = 'relative';
            video.parentNode.insertBefore(videoWrapper, video);
            videoWrapper.appendChild(video);
            videoWrapper.appendChild(controlsContainer);
        });
    };

    // Configurar y iniciar el observador
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
                addCustomControls();
            }
        });
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    // Aplicar controles personalizados cuando la página carga
    window.addEventListener('load', addCustomControls);
})();
