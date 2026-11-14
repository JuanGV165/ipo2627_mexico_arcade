const LEADERBOARD_STORAGE_KEY = 'matamarcianos_leaderboard_top10';

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
        addClick('btn-leaderboard', () => this.toggleLeaderboard(true));
        addClick('btn-close-leaderboard', () => this.toggleLeaderboard(false));
        addClick('btn-help', handlers.onOpenHelp);
        addClick('btn-close-help', handlers.onCloseHelp);
        addClick('btn-pause', handlers.onTogglePause);
        addClick('btn-resume', handlers.onResume);
        addClick('btn-main-menu', handlers.onMainMenu);
        addClick('btn-confirm-main-menu', handlers.onConfirmMainMenu);
        addClick('btn-cancel-main-menu', () => this.hideMainMenuConfirmation());
        addClick('btn-restart', handlers.onRestart);
        addClick('btn-gameover-menu', handlers.onConfirmMainMenu);

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
        const screens = [
            'main-menu',
            'leaderboard-screen',
            'help-screen',
            'pause-screen',
            'confirm-menu-screen',
            'gameover-screen',
            'sandbox-menu',
            'hud',
            'btn-pause',
            'wave-banner'
        ];
        screens.forEach(s => {
            const el = document.getElementById(s);
            if (el) el.classList.add('hidden');
        });

        const borderFx = document.getElementById('screen-border-fx');
        if (borderFx && state !== 'PLAYING' && state !== 'SANDBOX') {
            borderFx.classList.remove('fx-border-small', 'fx-border-large', 'fx-bleed-blink');
        }

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
        const healthItemEl = document.getElementById('hud-health-item');
        const borderFxEl = document.getElementById('screen-border-fx');

        if (scoreEl) scoreEl.textContent = Math.floor(game.score || 0);
        if (waveEl) waveEl.textContent = game.wave || 1;
        if (enemiesEl) {
            const remaining = game.state === 'SANDBOX'
                ? game.enemies.length
                : Math.max(game.enemies.length, (game.waveEnemiesTotal || 0) - (game.waveKills || 0));
            enemiesEl.textContent = remaining;
        }

        if (healthEl && game.player) {
            const rawPct = (game.player.health / game.player.maxHealth) * 100;
            const pct = Math.max(0, Math.round(rawPct));
            healthEl.textContent = pct;

            if (healthItemEl) {
                healthItemEl.classList.remove('health-cooldown-yellow', 'health-cooldown-orange', 'health-healing-green');
                if (game.isHealing) {
                    healthItemEl.classList.add('health-healing-green');
                } else if (game.healCooldown > 0 && game.player.health < game.player.maxHealth) {
                    if (rawPct >= 60) {
                        healthItemEl.classList.add('health-cooldown-yellow');
                    } else {
                        healthItemEl.classList.add('health-cooldown-orange');
                    }
                }
            }
        }

        if (borderFxEl) {
            const now = performance.now();
            const inActiveGame = game.state === 'PLAYING' || game.state === 'SANDBOX';
            const showLarge = inActiveGame && now < (game.damageFlashLargeUntil || 0);
            const showSmall = inActiveGame && !showLarge && (
                Boolean(game.lowHealthBleeding) || now < (game.damageFlashSmallUntil || 0)
            );
            const blinkSmall = showSmall && Boolean(game.lowHealthBleeding) && Boolean(game.isHealing) && now >= (game.damageFlashSmallUntil || 0);

            borderFxEl.classList.toggle('fx-border-large', showLarge);
            borderFxEl.classList.toggle('fx-border-small', showSmall);
            borderFxEl.classList.toggle('fx-bleed-blink', blinkSmall);
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

    getLeaderboardScores() {
        try {
            const raw = localStorage.getItem(LEADERBOARD_STORAGE_KEY);
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed.slice(0, 10) : [];
        } catch {
            return [];
        }
    }

    recordScore(score, wave = 1) {
        const cleanScore = Math.floor(score || 0);
        if (cleanScore <= 0) return false;

        const now = new Date();
        const day = String(now.getDate()).padStart(2, '0');
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const year = String(now.getFullYear()).slice(-2);

        const entry = {
            id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            score: cleanScore,
            wave: Math.max(1, Math.floor(wave || 1)),
            date: `${day}/${month}/${year}`
        };

        const scores = this.getLeaderboardScores();
        scores.push(entry);
        scores.sort((a, b) => (b.score - a.score) || (b.wave - a.wave));
        const top10 = scores.slice(0, 10);

        try {
            localStorage.setItem(LEADERBOARD_STORAGE_KEY, JSON.stringify(top10));
        } catch {
            // Ignorar si el almacenamiento local está bloqueado
        }

        return top10.some(item => item.id === entry.id);
    }

    renderLeaderboard() {
        const tbody = document.getElementById('leaderboard-body');
        if (!tbody) return;

        const scores = this.getLeaderboardScores();
        tbody.innerHTML = '';

        if (scores.length === 0) {
            const row = document.createElement('tr');
            const cell = document.createElement('td');
            cell.colSpan = 4;
            cell.className = 'leaderboard-empty';
            cell.textContent = 'Aún no hay puntuaciones registradas. ¡Juega una partida!';
            row.appendChild(cell);
            tbody.appendChild(row);
            return;
        }

        scores.forEach((item, idx) => {
            const rank = idx + 1;
            const row = document.createElement('tr');
            if (rank === 1) row.classList.add('leaderboard-rank-1');
            else if (rank === 2) row.classList.add('leaderboard-rank-2');
            else if (rank === 3) row.classList.add('leaderboard-rank-3');

            const tdRank = document.createElement('td');
            tdRank.textContent = `#${rank}`;

            const tdScore = document.createElement('td');
            tdScore.className = 'leaderboard-score-cell';
            tdScore.textContent = item.score.toLocaleString('es-ES');

            const tdWave = document.createElement('td');
            tdWave.textContent = `Oleada ${item.wave}`;

            const tdDate = document.createElement('td');
            tdDate.textContent = item.date || '-';

            row.append(tdRank, tdScore, tdWave, tdDate);
            tbody.appendChild(row);
        });
    }

    toggleLeaderboard(show) {
        const board = document.getElementById('leaderboard-screen');
        const menu = document.getElementById('main-menu');
        if (show) {
            this.renderLeaderboard();
            board?.classList.remove('hidden');
            menu?.classList.add('hidden');
        } else {
            board?.classList.add('hidden');
            menu?.classList.remove('hidden');
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
        document.getElementById('pause-screen')?.classList.add('hidden');
        document.getElementById('confirm-menu-screen')?.classList.remove('hidden');
    }

    hideMainMenuConfirmation() {
        document.getElementById('confirm-menu-screen')?.classList.add('hidden');
        document.getElementById('pause-screen')?.classList.remove('hidden');
    }

    setFinalScore(score, isTop10 = false) {
        const el = document.getElementById('final-score');
        if (el) el.textContent = Math.floor(score || 0).toLocaleString('es-ES');
        const badge = document.getElementById('new-record-badge');
        if (badge) badge.classList.toggle('hidden', !isTop10);
    }

    getDifficulty() {
        return 'normal';
    }
}