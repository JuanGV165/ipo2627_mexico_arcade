import { Game } from './engine/Game.js';

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gameCanvas');
    const uiElements = {
        mainMenu: document.getElementById('main-menu'),
        helpMenu: document.getElementById('help-menu'),
        pauseMenu: document.getElementById('pause-menu'),
        mainMenuDialog: document.getElementById('main-menu-dialog'),
        sandboxMenu: document.getElementById('sandbox-menu'),
        sandboxAutoBtn: document.getElementById('btn-sandbox-auto'),
        sandboxPlayerBtn: document.getElementById('btn-sandbox-player'),
        sandboxAsteroidsBtn: document.getElementById('btn-sandbox-asteroids'),
        pauseButton: document.getElementById('btn-pause-hud'),
        gameOver: document.getElementById('game-over'),
        hud: document.getElementById('hud'),
        score: document.getElementById('score'),
        kills: document.getElementById('kills'),
        waveTarget: document.getElementById('wave-target'),
        wave: document.getElementById('wave'),
        healthFill: document.getElementById('health-fill'),
        waveAnnouncement: document.getElementById('wave-announcement'),
        waveText: document.getElementById('wave-text')
    };

    const btnFullscreen = document.getElementById('btn-fullscreen');
    btnFullscreen.addEventListener('click', () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => console.log(err));
            if (screen.orientation && screen.orientation.lock) {
                screen.orientation.lock('landscape').catch(() => {});
            }
        } else {
            document.exitFullscreen();
        }
    });

    new Game(canvas, uiElements);
});