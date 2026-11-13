import { Player } from '../entities/Player.js';
import { Enemy } from '../entities/Enemy.js';
import { Asteroid } from '../entities/Asteroid.js';
import { Projectile } from '../entities/Projectile.js';
import { SquadManager } from '../entities/SquadManager.js';
import { InputHandler } from './InputHandler.js';
import { CollisionSystem } from './CollisionSystem.js';
import { Renderer } from '../graphics/Renderer.js';
import { UIManager } from '../graphics/UIManager.js';

export class Game {
    constructor(canvas, uiElements) {
        this.width = 2400;
        this.height = 1600;
        this.canvas = canvas;
        this.sandboxAuto = false; 
        this.sandboxPlayerActive = true; 
        this.sandboxAsteroids = false; 
        this.difficulty = 'normal';
        this.difficultySettings = {
            easy: { speedMultiplier: 0.7, healRate: 0.03, asteroidDamage: 8 },
            normal: { speedMultiplier: 1, healRate: 0.03, asteroidDamage: 8 },
            hard: { speedMultiplier: 1, healRate: 0.015, asteroidDamage: 14 }
        };
        
        this.input = new InputHandler(this.canvas);
        this.ui = new UIManager(uiElements);
        this.renderer = new Renderer(canvas);
        this.squad = new SquadManager(this.width, this.height);
        this.squad.speedMultiplier = this.getDifficultySettings().speedMultiplier;

        this.bindEvents();
        this.reset();
        this.loop();
    }

    reset() {
        this.state = 'MENU';
        this.width = 2400; 
        this.height = 1600;
        this.squad.mw = this.width;
        this.squad.mh = this.height;

        this.score = 0;
        this.kills = 0;
        this.wave = 1;
        this.waveKills = 0;
        this.waveEnemiesTotal = 4;
        this.enemiesSpawnedThisWave = 0;
        this.waveMessageTimer = 180;
        this.enemyIdCounter = 0;

        this.player = new Player(this.width / 2, this.height / 2, this.getDifficultySettings());
        this.bullets = [];
        this.enemyBullets = [];
        this.enemies = [];
        this.asteroids = [];

        this.spawnAsteroids(15);
    }

    spawnAsteroids(count) {
        const speedMultiplier = this.getDifficultySettings().speedMultiplier;
        for (let i = 0; i < count; i++) {
            this.asteroids.push(new Asteroid(
                Math.random() * this.width, Math.random() * this.height, 
                (Math.random() - 0.5) * 2 * speedMultiplier, (Math.random() - 0.5) * 2 * speedMultiplier,
                30 + Math.random() * 20, speedMultiplier
            ));
        }
    }

    getDifficultySettings() { return this.difficultySettings[this.difficulty]; }

    bindEvents() {
        window.addEventListener('keydown', e => {
            if (e.key.toLowerCase() === 'p' || e.key === 'Escape') this.togglePause();
        });
        
        this.ui.bindButtons({
            onStart: () => {
                if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {});
                this.start(this.ui.getDifficulty());
            },
            onRestart: () => this.start(this.difficulty),
            onResume: () => this.togglePause(),
            onMainMenu: () => this.ui.showMainMenuConfirmation(),
            onConfirmMainMenu: () => this.returnToMainMenu(),
            onTogglePause: () => this.togglePause(),
            onOpenHelp: () => this.ui.toggleHelp(true),
            onCloseHelp: () => this.ui.toggleHelp(false),
            onStartSandbox: () => { 
                this.reset(); 
                this.state = 'SANDBOX'; 
                
                // MÁS PEQUEÑO AÚN: 1000x650
                this.width = 1000;
                this.height = 650;
                this.squad.mw = 1000;
                this.squad.mh = 650;
                this.player.x = 500;
                this.player.y = 325;
                this.player.vx = 0;
                this.player.vy = 0;
                this.squad.leader.x = 500;
                this.squad.leader.y = 100;
                this.asteroids = []; 

                this.sandboxPlayerActive = true;
                this.sandboxAuto = false;
                this.sandboxAsteroids = false;
                this.ui.updateVisibility(this.state); 
            },
            onCloseSandbox: () => {
                this.sandboxAuto = false;
                this.sandboxPlayerActive = true;
                this.sandboxAsteroids = false;
                if (this.ui.ui.sandboxAutoBtn) {
                    this.ui.ui.sandboxAutoBtn.textContent = 'AUTO: OFF';
                    this.ui.ui.sandboxAutoBtn.style.color = '#00f3ff';
                    this.ui.ui.sandboxAutoBtn.style.borderColor = '#00f3ff';
                    this.ui.ui.sandboxPlayerBtn.textContent = 'NAVE: ON';
                    this.ui.ui.sandboxPlayerBtn.style.color = '#00f3ff';
                    this.ui.ui.sandboxPlayerBtn.style.borderColor = '#00f3ff';
                    this.ui.ui.sandboxAsteroidsBtn.textContent = 'ROCAS: OFF';
                    this.ui.ui.sandboxAsteroidsBtn.style.color = '#00f3ff';
                    this.ui.ui.sandboxAsteroidsBtn.style.borderColor = '#00f3ff';
                }
                this.returnToMainMenu();
            },
            onToggleAutoPilot: () => {
                this.sandboxAuto = !this.sandboxAuto;
                if (!this.sandboxAuto) {
                    this.player.x = 500; 
                    this.player.y = 325;
                    this.player.vx = 0;
                    this.player.vy = 0;
                    this.player.angle = -Math.PI / 2; 
                }
                return this.sandboxAuto;
            },
            onTogglePlayer: () => {
                this.sandboxPlayerActive = !this.sandboxPlayerActive;
                if (!this.sandboxPlayerActive) {
                    this.sandboxAuto = false;
                    if (this.ui.ui.sandboxAutoBtn) {
                        this.ui.ui.sandboxAutoBtn.textContent = 'AUTO: OFF';
                        this.ui.ui.sandboxAutoBtn.style.color = '#00f3ff';
                        this.ui.ui.sandboxAutoBtn.style.borderColor = '#00f3ff';
                    }
                } else {
                    this.player.x = 500;
                    this.player.y = 325;
                    this.player.vx = 0;
                    this.player.vy = 0;
                    this.player.angle = -Math.PI / 2; 
                }
                return this.sandboxPlayerActive;
            },
            onToggleAsteroids: () => {
                this.sandboxAsteroids = !this.sandboxAsteroids;
                if (this.sandboxAsteroids) this.spawnAsteroids(3); 
                else this.asteroids = [];
                return this.sandboxAsteroids;
            }
        });
    }

    start(difficulty) {
        this.difficulty = difficulty || 'normal';
        this.squad.speedMultiplier = this.getDifficultySettings().speedMultiplier;
        this.reset();
        this.state = 'PLAYING';
        this.ui.updateVisibility(this.state);
    }

    togglePause() {
        if (this.state === 'PLAYING') this.state = 'PAUSED';
        else if (this.state === 'PAUSED') this.state = 'PLAYING';
        this.ui.updateVisibility(this.state);
    }

    returnToMainMenu() {
        this.reset();
        this.ui.updateVisibility(this.state);
    }

    damagePlayer(amount, sourceChoreo) {
        if (!this.sandboxPlayerActive) return; 
        if (this.player.damage(amount)) {
            if (sourceChoreo && this.squad.tacticalMemory[sourceChoreo]) this.squad.tacticalMemory[sourceChoreo] += 30;
            if (this.player.health <= 0 && this.state !== 'SANDBOX') {
                this.state = 'GAMEOVER';
                this.ui.setFinalScore(this.score);
                this.ui.updateVisibility(this.state);
            }
        }
    }

    update() {
        if (this.state !== 'PLAYING' && this.state !== 'SANDBOX') return;

        let forcedFormation = null;
        let activePlayer = this.player;
        activePlayer.isGhost = false;

        if (this.state === 'SANDBOX') {
            this.player.health = this.player.maxHealth; 
            this.waveEnemiesTotal = 9999; 
            
            const formDropdown = document.getElementById('sandbox-formation');
            if (formDropdown) forcedFormation = formDropdown.value;
            this.squad.choreoTimer = 9999; 
            
            if (!this.sandboxPlayerActive) {
                activePlayer = { 
                    x: this.width / 2, y: this.height / 2, 
                    vx: 0, vy: 0, angle: 0, 
                    isShooting: false, spinAccumulator: 0, lastAngle: 0,
                    isGhost: true 
                };
            }
        } else {
            if (this.waveMessageTimer > 0) this.waveMessageTimer--;
            if (this.waveKills >= this.waveEnemiesTotal) {
                this.wave++;
                this.waveKills = 0;
                this.enemiesSpawnedThisWave = 0;
                if (this.wave <= 10) this.waveEnemiesTotal = 4 + (this.wave * 1.5);
                else this.waveEnemiesTotal = 19 + ((this.wave - 10) * 2.5);
                this.waveEnemiesTotal = Math.floor(this.waveEnemiesTotal);
                this.waveMessageTimer = 180;
                this.player.health = this.player.maxHealth;
                this.asteroids = [];
                this.spawnAsteroids(15); 
                this.squad.currentChoreo = 'SNAKE_COLUMN';
                this.squad.activeTactic = 'SNAKE_COLUMN';
                this.squad.choreoTimer = 600; 
            }
        }

        let tryToShoot = false;

        if (this.state === 'SANDBOX' && this.sandboxAuto && this.sandboxPlayerActive) {
            if (isNaN(this.player.angle)) this.player.angle = -Math.PI / 2;
            if (this.player.targetAutoAngle === undefined) this.player.targetAutoAngle = this.player.angle;
            if (this.player.autoShootTimer === undefined) this.player.autoShootTimer = 0;
            
            let evadeX = 0, evadeY = 0;
            this.asteroids.forEach(a => {
                let dx = this.player.x - a.x; let dy = this.player.y - a.y;
                if (dx*dx + dy*dy < 12000) { evadeX += dx*0.2; evadeY += dy*0.2; }
            });
            this.enemies.forEach(e => {
                let dx = this.player.x - e.x; let dy = this.player.y - e.y;
                if (dx*dx + dy*dy < 20000) { evadeX += dx*0.1; evadeY += dy*0.1; }
            });

            if (Math.random() < 0.03) this.player.targetAutoAngle += (Math.random() - 0.5) * 2.5;

            let finalTargetAngle = this.player.targetAutoAngle;
            if (evadeX !== 0 || evadeY !== 0) {
                finalTargetAngle = Math.atan2(Math.sin(this.player.targetAutoAngle) + evadeY, Math.cos(this.player.targetAutoAngle) + evadeX);
            }

            let diff = finalTargetAngle - this.player.angle;
            diff = Math.atan2(Math.sin(diff), Math.cos(diff));
            this.player.angle += diff * 0.08;
            
            this.player.vx += Math.cos(this.player.angle) * 0.16;
            this.player.vy += Math.sin(this.player.angle) * 0.16;
            
            let angleDiff2 = this.player.angle - this.player.lastAngle;
            angleDiff2 = Math.atan2(Math.sin(angleDiff2), Math.cos(angleDiff2));
            this.player.spinAccumulator = (this.player.spinAccumulator * 0.95) + Math.abs(angleDiff2);
            this.player.lastAngle = this.player.angle;

            this.player.vx *= 0.985;
            this.player.vy *= 0.985;
            this.player.x += this.player.vx;
            this.player.y += this.player.vy;
            if (this.player.x < 0) this.player.x += this.width;
            if (this.player.x >= this.width) this.player.x -= this.width;
            if (this.player.y < 0) this.player.y += this.height;
            if (this.player.y >= this.height) this.player.y -= this.height;
            if (this.player.cooldown > 0) this.player.cooldown--;
            
            this.player.autoShootTimer++;
            let cycle = this.player.autoShootTimer % 120;
            if (cycle < 45) { 
                this.player.isShooting = true;
                tryToShoot = true; 
            } else {
                this.player.isShooting = false;
            }
        } else if (this.sandboxPlayerActive) {
            this.player.update(this.input, this.width, this.height, this.wave);
            this.player.isShooting = this.input.isPressed(' ') || this.input.touch.isShooting; 
            if (this.input.touch.isShooting || this.input.isJustPressed(' ')) tryToShoot = true; 
        }

        if (tryToShoot && this.player.cooldown === 0 && this.sandboxPlayerActive) {
            this.player.shoot();
            this.bullets.push(new Projectile(
                this.player.x + Math.cos(this.player.angle) * 12,
                this.player.y + Math.sin(this.player.angle) * 12,
                Math.cos(this.player.angle) * 12,
                Math.sin(this.player.angle) * 12,
                this.player.angle, 12, 100, true
            ));
            this.player.cooldown = 15;
        }

        let maxActive = this.state === 'SANDBOX' ? 12 : Math.min(4 + Math.floor((this.wave - 1) * 0.5), 12);

        if (this.enemies.length < maxActive && this.enemiesSpawnedThisWave < this.waveEnemiesTotal && Math.random() < 0.05) {
            let spawnX = this.squad.leader.x;
            let spawnY = this.squad.leader.y;
            if (this.asteroids.length > 0) { spawnX = this.asteroids[0].x; spawnY = this.asteroids[0].y; }
            let newEnemy = new Enemy(this.enemyIdCounter++, spawnX, spawnY, this.squad.leader.angle, this.squad.currentChoreo);
            newEnemy.invulnerableTimer = 120; 
            newEnemy.cooldown = 120; 
            this.enemies.push(newEnemy);
            this.enemiesSpawnedThisWave++;
        }

        this.bullets.forEach(b => b.update(this.width, this.height));
        this.enemyBullets.forEach(b => b.update(this.width, this.height));
        this.asteroids.forEach(a => { if (a.invulnerableTimer > 0) a.invulnerableTimer--; a.update(this.width, this.height); });

        this.bullets = this.bullets.filter(b => b.life > 0);
        this.enemyBullets = this.enemyBullets.filter(b => b.life > 0);
        if (this.bullets.length > 150) this.bullets.splice(0, this.bullets.length - 150);
        if (this.enemyBullets.length > 150) this.enemyBullets.splice(0, this.enemyBullets.length - 150);

        this.squad.update(activePlayer, this.enemies, this.bullets, this.asteroids, this.enemyBullets, this.wave, forcedFormation);
        CollisionSystem.check(this);
    }

    loop() {
        this.update();
        this.renderer.render(this);
        this.ui.renderHUD(this);
        this.input.postUpdate(); 
        this.animationId = requestAnimationFrame(() => this.loop());
    }
}