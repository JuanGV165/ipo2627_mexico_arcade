export class UIManager {
    constructor(elements) {
        this.ui = elements;
    }

    bindButtons({ onStart, onRestart, onResume, onTogglePause, onOpenHelp, onCloseHelp }) {
        document.getElementById('btn-start').addEventListener('click', onStart);
        document.getElementById('btn-restart').addEventListener('click', onRestart);
        document.getElementById('btn-resume').addEventListener('click', onResume);
        document.getElementById('btn-pause-hud').addEventListener('click', onTogglePause);
        document.getElementById('btn-help').addEventListener('click', onOpenHelp);
        document.getElementById('btn-close-help').addEventListener('click', onCloseHelp);
    }

    setFinalScore(score) {
        document.getElementById('final-score').textContent = score;
    }

    updateVisibility(state) {
        this.ui.mainMenu.classList.toggle('hidden', state !== 'MENU');
        this.ui.helpMenu.classList.add('hidden');
        this.ui.pauseMenu.classList.toggle('hidden', state !== 'PAUSED');
        this.ui.gameOver.classList.toggle('hidden', state !== 'GAMEOVER');
        const isPaused = state === 'PAUSED';
        this.ui.pauseButton.classList.toggle('is-paused', isPaused);
        this.ui.pauseButtonLabel.textContent = isPaused ? 'Reanudar' : 'Pausa';
        this.ui.pauseButton.setAttribute('aria-label', isPaused ? 'Reanudar juego' : 'Pausar juego');
        
        if (state === 'PLAYING' || state === 'PAUSED') {
            this.ui.hud.classList.remove('hidden')
        }
        else this.ui.hud.classList.add('hidden');
        
        if (state !== 'PLAYING') this.ui.waveAnnouncement.classList.add('hidden');
    }

    toggleHelp(isVisible) {
        this.ui.mainMenu.classList.toggle('hidden', isVisible);
        this.ui.helpMenu.classList.toggle('hidden', !isVisible);
    }

    renderHUD(game) {
        if (game.state !== 'PLAYING') return;
        this.ui.score.textContent = game.score;
        this.ui.kills.textContent = game.waveKills;
        this.ui.waveTarget.textContent = game.waveEnemiesTotal;
        this.ui.wave.textContent = game.wave;

        let tacticName = game.squad.activeTactic.replace(/_/g, ' ');
        if (game.squad.isHarassing) tacticName = 'HOSTIGAMIENTO INDIVIDUAL';
        else if (game.squad.isAntiCharge) tacticName = '¡SATURACIÓN ANTI-CARGA!';
        else if (game.enemies.length >= 8) tacticName = 'TRIPLE V ACTIVA';
        else if (game.squad.choreoTimer > 200) tacticName += ' (AGRUPANDO)';
        else tacticName += ' (ATACANDO)';
        
        this.ui.choreoName.textContent = tacticName;
        if (game.squad.activeTactic === 'ANTI_TURRETS' || game.squad.activeTactic === 'SPLIT_FLANKS' || game.squad.isHarassing || game.squad.isAntiCharge || game.enemies.length >= 8) {
            this.ui.choreoName.style.color = '#ff3366'; 
        } else {
            this.ui.choreoName.style.color = '#fff';
        }

        let hpPercent = (game.player.health / game.player.maxHealth) * 100;
        this.ui.healthFill.style.width = `${hpPercent}%`;
        
        if (hpPercent < 30 || game.player.invulnerableFrames > 0) {
            this.ui.healthFill.style.backgroundColor = '#ff3366';
        } else if (game.player.healDelay > 0) {
            this.ui.healthFill.style.backgroundColor = '#aaaaaa'; 
        } else {
            this.ui.healthFill.style.backgroundColor = '#00f3ff';
        }

        if (game.waveMessageTimer > 0) {
            if (this.ui.waveAnnouncement.classList.contains('hidden')) {
                this.ui.waveAnnouncement.classList.remove('hidden');
                this.ui.waveText.textContent = `¡OLEADA ${game.wave}!`;
                this.ui.waveText.style.animation = 'none';
                void this.ui.waveText.offsetWidth;
                this.ui.waveText.style.animation = 'fadeOut 3s forwards';
            }
        } else {
            this.ui.waveAnnouncement.classList.add('hidden');
        }
    }
}