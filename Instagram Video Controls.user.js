// ==UserScript==
// @name         Instagram Video Controls
// @namespace    http://tampermonkey.net/
// @version      2024.09.12
// @description  Añade controles personalizados a los videos de Instagram, incluyendo la opción de descargar una imagen del video, y los hace visibles solo cuando el ratón pasa por encima. Incluye opciones de velocidad de reproducción adicionales y muestra microsegundos.
// @author       wernser412
// @match        https://www.instagram.com/*
// @icon         https://static.cdninstagram.com/rsrc.php/v3/yI/r/VsNE-OHk_8a.png
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
