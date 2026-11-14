export class UIManager {
    constructor(uiElements = {}) {
        if (Array.isArray(uiElements)) {
            this.ui = {};
            uiElements.forEach(id => {
                this.ui[id] = document.getElementById(id);
            });
        } else {
            this.ui = uiElements || {};
        }
    }

    bindButtons(handlers) {
        const addClick = (id, fn) => {
            const el = document.getElementById(id);
            if (el && fn) {
                el.addEventListener('click', e => {
                    e.preventDefault();
                    e.stopPropagation();
                    el.blur();
                    fn();
                });
            }
        };

        addClick('btn-start', handlers.onStart);
        addClick('btn-help', handlers.onOpenHelp);
        addClick('btn-close-help', handlers.onCloseHelp);
        addClick('btn-pause', handlers.onTogglePause);
        addClick('btn-resume', handlers.onResume);
        addClick('btn-main-menu', handlers.onConfirmMainMenu || handlers.onMainMenu);
        addClick('btn-restart', handlers.onRestart);
        addClick('btn-gameover-menu', handlers.onConfirmMainMenu || handlers.onMainMenu);

        addClick('btn-fullscreen', () => {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(() => {});
            } else if (document.exitFullscreen) {
                document.exitFullscreen().catch(() => {});
            }
        });

        document.addEventListener('fullscreenchange', () => {
            const enterIcon = document.getElementById('icon-fs-enter');
            const exitIcon = document.getElementById('icon-fs-exit');
            const isFull = Boolean(document.fullscreenElement);
            if (enterIcon) enterIcon.classList.toggle('hidden', isFull);
            if (exitIcon) exitIcon.classList.toggle('hidden', !isFull);
        });

        addClick('btn-sandbox-auto', () => handlers.onToggleAutoPilot && handlers.onToggleAutoPilot());
        addClick('btn-sandbox-player', () => handlers.onTogglePlayer && handlers.onTogglePlayer());
        addClick('btn-sandbox-asteroids', () => handlers.onToggleAsteroids && handlers.onToggleAsteroids());
        addClick('btn-close-sandbox', handlers.onCloseSandbox);
    }

    updateVisibility(state) {
        const screens = ['main-menu', 'help-screen', 'pause-screen', 'gameover-screen', 'sandbox-menu', 'hud', 'btn-pause', 'wave-banner'];
        screens.forEach(s => {
            const el = document.getElementById(s);
            if (el) el.classList.add('hidden');
        });

        if (state === 'MENU') {
            document.getElementById('main-menu')?.classList.remove('hidden');
        } else if (state === 'PLAYING') {
            document.getElementById('hud')?.classList.remove('hidden');
            document.getElementById('btn-pause')?.classList.remove('hidden');
        } else if (state === 'PAUSED') {
            document.getElementById('hud')?.classList.remove('hidden');
            document.getElementById('btn-pause')?.classList.remove('hidden');
            document.getElementById('pause-screen')?.classList.remove('hidden');
        } else if (state === 'GAMEOVER') {
            document.getElementById('gameover-screen')?.classList.remove('hidden');
        } else if (state === 'SANDBOX') {
            document.getElementById('hud')?.classList.remove('hidden');
            document.getElementById('sandbox-menu')?.classList.remove('hidden');
        }
    }

    renderHUD(game) {
        const scoreEl = document.getElementById('hud-score');
        const enemiesEl = document.getElementById('hud-enemies');
        const waveEl = document.getElementById('hud-wave');
        const healthEl = document.getElementById('hud-health');

        if (scoreEl) scoreEl.textContent = Math.floor(game.score || 0);
        if (waveEl) waveEl.textContent = game.wave || 1;
        if (enemiesEl) {
            const remaining = game.state === 'SANDBOX'
                ? game.enemies.length
                : Math.max(game.enemies.length, (game.waveEnemiesTotal || 0) - (game.waveKills || 0));
            enemiesEl.textContent = remaining;
        }
        if (healthEl && game.player) {
            const pct = Math.max(0, Math.round((game.player.health / game.player.maxHealth) * 100));
            healthEl.textContent = pct;
        }

        const bannerEl = document.getElementById('wave-banner');
        if (bannerEl) {
            if (game.state === 'PLAYING' && game.waveMessageTimer > 0) {
                const titleEl = document.getElementById('wave-banner-title');
                const subEl = document.getElementById('wave-banner-sub');
                const waveNum = game.wave || 1;
                if (titleEl) titleEl.textContent = `OLEADA ${waveNum}`;
                if (subEl) {
                    subEl.textContent = waveNum === 1
                        ? '¡Escudos activos — Elimina a los invasores!'
                        : `¡Refuerzos enemigos en camino (${game.waveEnemiesTotal} naves)!`;
                }
                const fadeAlpha = Math.min(1, game.waveMessageTimer / 35);
                bannerEl.style.opacity = fadeAlpha.toFixed(2);
                bannerEl.classList.remove('hidden');
            } else {
                bannerEl.classList.add('hidden');
            }
        }
    }

    toggleHelp(show) {
        const help = document.getElementById('help-screen');
        const menu = document.getElementById('main-menu');
        if (show) {
            help?.classList.remove('hidden');
            menu?.classList.add('hidden');
        } else {
            help?.classList.add('hidden');
            menu?.classList.remove('hidden');
        }
    }

    showMainMenuConfirmation() {
        this.updateVisibility('MENU');
    }

    setFinalScore(score) {
        const el = document.getElementById('final-score');
        if (el) el.textContent = Math.floor(score || 0);
    }

    getDifficulty() {
        return 'normal';
    }
}