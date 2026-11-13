export class UIManager {
    constructor(elements) {
        this.ui = elements;
        this.easterEggCounter = 0;
        this.lastAction = null;
    }

    bindButtons({ onStart, onRestart, onResume, onMainMenu, onConfirmMainMenu, onTogglePause, onOpenHelp, onCloseHelp, onStartSandbox, onCloseSandbox, onToggleAutoPilot, onTogglePlayer, onToggleAsteroids }) {
        document.getElementById('btn-start').addEventListener('click', () => { 
            this.resetEasterEgg(); 
            if (screen.orientation && screen.orientation.lock) {
                screen.orientation.lock('landscape').catch(() => {});
            }
            onStart(); 
        });
        
        document.getElementById('btn-restart').addEventListener('click', () => { this.resetEasterEgg(); onRestart(); });
        document.getElementById('btn-resume').addEventListener('click', () => { this.resetEasterEgg(); onResume(); });
        document.getElementById('btn-main-menu').addEventListener('click', () => { this.resetEasterEgg(); onMainMenu(); });
        
        document.getElementById('btn-cancel-main-menu').addEventListener('click', () => { this.ui.mainMenuDialog.close(); });
        document.getElementById('btn-confirm-main-menu').addEventListener('click', () => {
            onConfirmMainMenu();
            this.ui.mainMenuDialog.close();
        });
        document.getElementById('btn-pause-hud').addEventListener('click', onTogglePause);
        
        document.getElementById('btn-help').addEventListener('click', () => {
            if (this.lastAction === 'close-help' || this.lastAction === null) this.easterEggCounter++;
            else this.easterEggCounter = 1;
            this.lastAction = 'open-help';
            
            if (this.easterEggCounter >= 5) {
                this.resetEasterEgg();
                onStartSandbox();
            } else {
                onOpenHelp();
            }
        });
        
        document.getElementById('btn-close-help').addEventListener('click', () => {
            if (this.lastAction !== 'open-help') this.easterEggCounter = 0;
            this.lastAction = 'close-help';
            onCloseHelp();
        });

        // BOTONES SANDBOX FUNCIONALES
        document.getElementById('btn-sandbox-auto').addEventListener('click', (e) => {
            if(onToggleAutoPilot) {
                const isAuto = onToggleAutoPilot();
                e.target.textContent = `AUTO: ${isAuto ? 'ON' : 'OFF'}`;
                e.target.style.color = isAuto ? '#ff3366' : '#00f3ff';
                e.target.style.borderColor = isAuto ? '#ff3366' : '#00f3ff';
            }
        });

        document.getElementById('btn-sandbox-player').addEventListener('click', (e) => {
            if(onTogglePlayer) {
                const isPlayerOn = onTogglePlayer();
                e.target.textContent = `NAVE: ${isPlayerOn ? 'ON' : 'OFF'}`;
                e.target.style.color = isPlayerOn ? '#00f3ff' : '#aaaaaa';
                e.target.style.borderColor = isPlayerOn ? '#00f3ff' : '#aaaaaa';
                
                const btnAuto = document.getElementById('btn-sandbox-auto');
                if (btnAuto) {
                    btnAuto.style.display = isPlayerOn ? 'inline-flex' : 'none';
                }
            }
        });

        document.getElementById('btn-sandbox-asteroids').addEventListener('click', (e) => {
            if(onToggleAsteroids) {
                const isRocas = onToggleAsteroids();
                e.target.textContent = `ROCAS: ${isRocas ? 'ON' : 'OFF'}`;
                e.target.style.color = isRocas ? '#ff9900' : '#00f3ff';
                e.target.style.borderColor = isRocas ? '#ff9900' : '#00f3ff';
            }
        });

        document.getElementById('btn-close-sandbox').addEventListener('click', () => {
            if (onCloseSandbox) onCloseSandbox();
        });
    }

    resetEasterEgg() {
        this.easterEggCounter = 0;
        this.lastAction = null;
    }

    setFinalScore(score) { document.getElementById('final-score').textContent = score; }
    getDifficulty() { return document.querySelector('input[name="difficulty"]:checked').value; }
    showMainMenuConfirmation() { this.ui.mainMenuDialog.showModal(); }

    updateVisibility(state) {
        this.ui.mainMenu.classList.toggle('hidden', state !== 'MENU');
        this.ui.helpMenu.classList.add('hidden');
        this.ui.sandboxMenu.classList.toggle('hidden', state !== 'SANDBOX');
        this.ui.pauseMenu.classList.toggle('hidden', state !== 'PAUSED');
        this.ui.gameOver.classList.toggle('hidden', state !== 'GAMEOVER');
        
        const isPaused = state === 'PAUSED';
        this.ui.pauseButton.classList.toggle('is-paused', isPaused);
        this.ui.pauseButton.setAttribute('aria-label', isPaused ? 'Reanudar juego' : 'Pausar juego');
        
        if (state === 'PLAYING' || state === 'PAUSED') this.ui.hud.classList.remove('hidden');
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

        let hpPercent = (game.player.health / game.player.maxHealth) * 100;
        this.ui.healthFill.style.width = `${hpPercent}%`;
        
        if (hpPercent < 30 || game.player.invulnerableFrames > 0) this.ui.healthFill.style.backgroundColor = '#ff3366';
        else if (game.player.healDelay > 0) this.ui.healthFill.style.backgroundColor = '#aaaaaa'; 
        else this.ui.healthFill.style.backgroundColor = '#00f3ff';

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