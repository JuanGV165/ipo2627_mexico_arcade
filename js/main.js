import { Game } from './engine/Game.js';

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gameCanvas');
    const uiElements = {
        mainMenu: document.getElementById('main-menu'),
        helpMenu: document.getElementById('help-menu'),
        pauseMenu: document.getElementById('pause-menu'),
        pauseButton: document.getElementById('btn-pause-hud'),
        pauseButtonLabel: document.getElementById('pause-button-label'),
        gameOver: document.getElementById('game-over'),
        hud: document.getElementById('hud'),
        score: document.getElementById('score'),
        kills: document.getElementById('kills'),
        waveTarget: document.getElementById('wave-target'),
        wave: document.getElementById('wave'),
        choreoName: document.getElementById('choreo-name'),
        healthFill: document.getElementById('health-fill'),
        waveAnnouncement: document.getElementById('wave-announcement'),
        waveText: document.getElementById('wave-text')
    };

    // Inicializar el juego con mundo toroidal perfecto ajustado al canvas
    new Game(canvas, uiElements);
});