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

        this.burstCount = 0;
        this.burstLocked = false;
        this.wasShootingHeld = false;

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

        this.burstCount = 0;
        this.burstLocked = false;
        this.wasShootingHeld = false;

        this.player = new Player(this.width / 2, this.height / 2, this.getDifficultySettings());
        this.bullets = [];
        this.enemyBullets = [];
        this.enemies = [];
        this.asteroids = [];

        this.spawnAsteroids(15, 180);
    }

    spawnAsteroids(count, invulnerableFrames = 180) {
        const speedMultiplier = this.getDifficultySettings().speedMultiplier;
        for (let i = 0; i < count; i++) {
            const radius = 25 + Math.random() * 35;
            let x, y;
            let valid = false;
            let attempts = 0;

            while (!valid && attempts < 80) {
                x = Math.random() * this.width;
                y = Math.random() * this.height;
                attempts++;

                let pdx = x - this.player.x;
                if (pdx > this.width / 2) pdx -= this.width; else if (pdx < -this.width / 2) pdx += this.width;
                let pdy = y - this.player.y;
                if (pdy > this.height / 2) pdy -= this.height; else if (pdy < -this.height / 2) pdy += this.height;
                if (Math.hypot(pdx, pdy) < 450) continue;

                let overlapsOther = false;
                for (let j = 0; j < this.asteroids.length; j++) {
                    const other = this.asteroids[j];
                    let adx = x - other.x;
                    if (adx > this.width / 2) adx -= this.width; else if (adx < -this.width / 2) adx += this.width;
                    let ady = y - other.y;
                    if (ady > this.height / 2) ady -= this.height; else if (ady < -this.height / 2) ady += this.height;
                    if (Math.hypot(adx, ady) < radius + other.radius + 40) {
                        overlapsOther = true;
                        break;
                    }
                }
                if (!overlapsOther) valid = true;
            }

            const angle = Math.random() * Math.PI * 2;
            const speed = (0.5 + Math.random() * 1.5) * speedMultiplier;
            const asteroid = new Asteroid(
                x, y,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                radius,
                speedMultiplier
            );
            asteroid.invulnerableTimer = invulnerableFrames;
            this.asteroids.push(asteroid);
        }
    }

    resolveAsteroidBounces() {
        const speedMultiplier = this.getDifficultySettings().speedMultiplier;
        const maxSpeed = 4.2 * speedMultiplier;
        const minSpeed = 0.25 * speedMultiplier;
        const len = this.asteroids.length;

        for (let i = 0; i < len; i++) {
            const a = this.asteroids[i];
            for (let j = i + 1; j < len; j++) {
                const b = this.asteroids[j];

                let dx = b.x - a.x;
                if (dx > this.width / 2) dx -= this.width; else if (dx < -this.width / 2) dx += this.width;
                let dy = b.y - a.y;
                if (dy > this.height / 2) dy -= this.height; else if (dy < -this.height / 2) dy += this.height;

                const minDist = a.radius + b.radius;
                const distSq = dx * dx + dy * dy;

                if (distSq < minDist * minDist) {
                    let dist = Math.sqrt(distSq);
                    let nx, ny;

                    if (dist < 0.0001) {
                        const randAng = Math.random() * Math.PI * 2;
                        nx = Math.cos(randAng);
                        ny = Math.sin(randAng);
                        dist = 0;
                    } else {
                        nx = dx / dist;
                        ny = dy / dist;
                    }

                    const massA = a.radius * a.radius;
                    const massB = b.radius * b.radius;
                    const totalMass = massA + massB;

                    const overlap = (minDist - dist) + 0.5;
                    a.x -= nx * overlap * (massB / totalMass);
                    a.y -= ny * overlap * (massB / totalMass);
                    b.x += nx * overlap * (massA / totalMass);
                    b.y += ny * overlap * (massA / totalMass);

                    a.x = ((a.x % this.width) + this.width) % this.width;
                    a.y = ((a.y % this.height) + this.height) % this.height;
                    b.x = ((b.x % this.width) + this.width) % this.width;
                    b.y = ((b.y % this.height) + this.height) % this.height;

                    const rvx = b.vx - a.vx;
                    const rvy = b.vy - a.vy;
                    const velAlongNormal = rvx * nx + rvy * ny;

                    if (velAlongNormal < 0) {
                        const restitution = 0.95;
                        const impulse = -(1 + restitution) * velAlongNormal / (1 / massA + 1 / massB);

                        a.vx -= (impulse / massA) * nx;
                        a.vy -= (impulse / massA) * ny;
                        b.vx += (impulse / massB) * nx;
                        b.vy += (impulse / massB) * ny;

                        for (const ast of [a, b]) {
                            const spd = Math.hypot(ast.vx, ast.vy);
                            if (spd > maxSpeed) {
                                ast.vx = (ast.vx / spd) * maxSpeed;
                                ast.vy = (ast.vy / spd) * maxSpeed;
                            } else if (spd < minSpeed) {
                                const ang = spd > 0.001 ? Math.atan2(ast.vy, ast.vx) : Math.random() * Math.PI * 2;
                                ast.vx = Math.cos(ang) * minSpeed;
                                ast.vy = Math.sin(ang) * minSpeed;
                            }
                        }
                    }
                }
            }
        }
    }

    getDifficultySettings() { return this.difficultySettings[this.difficulty]; }

    bindEvents() {
        window.addEventListener('keydown', e => {
            if (e.key === ' ' || e.code === 'Space') {
                if (document.activeElement && (document.activeElement.tagName === 'BUTTON' || document.activeElement.tagName === 'SELECT')) {
                    document.activeElement.blur();
                    e.preventDefault();
                }
            }
            if (e.key.toLowerCase() === 'p' || e.key === 'Escape') this.togglePause();
        });
        
        window.addEventListener('mouseup', () => {
            if (document.activeElement && (document.activeElement.tagName === 'BUTTON' || document.activeElement.tagName === 'SELECT')) {
                document.activeElement.blur();
            }
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
                this.width = 2400;
                this.height = 1600;
                this.squad.mw = 2400;
                this.squad.mh = 1600;
                this.player.x = 1200;
                this.player.y = 800;
                this.player.vx = 0;
                this.player.vy = 0;
                this.squad.leader.x = 1200;
                this.squad.leader.y = 200;
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
                    this.ui.ui.sandboxPlayerBtn.textContent = 'NAVE: ON';
                    this.ui.ui.sandboxPlayerBtn.style.color = '#00f3ff';
                    this.ui.ui.sandboxAsteroidsBtn.textContent = 'ROCAS: OFF';
                    this.ui.ui.sandboxAsteroidsBtn.style.color = '#00f3ff';
                }
                this.returnToMainMenu();
            },
            onToggleAutoPilot: () => {
                this.sandboxAuto = !this.sandboxAuto;
                if (!this.sandboxAuto) {
                    this.player.x = 1200; 
                    this.player.y = 800;
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
                    }
                } else {
                    this.player.x = 1200;
                    this.player.y = 800;
                    this.player.vx = 0;
                    this.player.vy = 0;
                    this.player.angle = -Math.PI / 2; 
                }
                return this.sandboxPlayerActive;
            },
            onToggleAsteroids: () => {
                this.sandboxAsteroids = !this.sandboxAsteroids;
                if (this.sandboxAsteroids) this.spawnAsteroids(25, 180); 
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
            const formDropdown = document.getElementById('sandbox-formation');
            if (formDropdown) forcedFormation = formDropdown.value;
            this.squad.choreoTimer = 9999; 
            
            const countInput = document.getElementById('sandbox-enemy-count');
            let targetEnemies = countInput ? parseInt(countInput.value) : 5;
            if (isNaN(targetEnemies)) targetEnemies = 5;
            targetEnemies = Math.max(1, Math.min(targetEnemies, 50)); 
            this.waveEnemiesTotal = targetEnemies;

            if (this.enemies.length < targetEnemies) {
                let newEnemy = new Enemy(this.enemyIdCounter++, this.squad.leader.x, this.squad.leader.y, this.squad.leader.angle, forcedFormation || 'DYNAMIC_V');
                newEnemy.invulnerableTimer = 120; 
                newEnemy.cooldown = 120; 
                this.enemies.push(newEnemy);
            } else if (this.enemies.length > targetEnemies) {
                this.enemies.pop();
            }
            
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
                this.spawnAsteroids(15, 180); 
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
            
            this.player.vx += Math.cos(this.player.angle) * 0.25; 
            this.player.vy += Math.sin(this.player.angle) * 0.25;
            
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
            const holdingShoot = this.input.isPressed(' ') || this.input.touch.isShooting;
            this.player.isShooting = holdingShoot;
            tryToShoot = holdingShoot;

            const thrustKey = this.input.isPressed('w') || this.input.isPressed('W') || this.input.isPressed('ArrowUp');
            const turnKey = this.input.isPressed('a') || this.input.isPressed('A') || this.input.isPressed('ArrowLeft') ||
                            this.input.isPressed('d') || this.input.isPressed('D') || this.input.isPressed('ArrowRight');
            this.player.isThrustingInput = thrustKey || this.input.touch.joystickActive;
            this.player.isTurningInput = turnKey || this.input.touch.joystickActive;
        }

        if (tryToShoot && this.sandboxPlayerActive) {
            if (!this.wasShootingHeld) {
                this.wasShootingHeld = true;
                this.burstCount = 0;
                this.burstLocked = false;
            }

            if (!this.burstLocked && this.burstCount < 3 && this.player.cooldown === 0) {
                this.player.shoot();
                this.bullets.push(new Projectile(
                    this.player.x + Math.cos(this.player.angle) * 12,
                    this.player.y + Math.sin(this.player.angle) * 12,
                    Math.cos(this.player.angle) * 12,
                    Math.sin(this.player.angle) * 12,
                    this.player.angle, 12, 100, true
                ));
                this.burstCount++;
                if (this.burstCount >= 3) {
                    this.burstLocked = true;
                    this.player.cooldown = 8;
                } else {
                    this.player.cooldown = 7;
                }
            }
        } else {
            this.wasShootingHeld = false;
            this.burstCount = 0;
            this.burstLocked = false;
        }

        let maxActive = this.state === 'SANDBOX' ? 50 : Math.min(4 + Math.floor((this.wave - 1) * 0.5), 12);

        if (this.state !== 'SANDBOX' && this.enemies.length < maxActive && this.enemiesSpawnedThisWave < this.waveEnemiesTotal && Math.random() < 0.06) {
            let spawnX, spawnY;
            let visibleAsteroids = this.asteroids.filter(a => Math.hypot(a.x - this.player.x, a.y - this.player.y) < 700);
            
            if (visibleAsteroids.length > 0 && Math.random() < 0.7) {
                let chosenAst = visibleAsteroids[Math.floor(Math.random() * visibleAsteroids.length)];
                spawnX = chosenAst.x;
                spawnY = chosenAst.y;
            } else {
                let angle = Math.random() * Math.PI * 2;
                let dist = 300 + Math.random() * 350;
                spawnX = this.player.x + Math.cos(angle) * dist;
                spawnY = this.player.y + Math.sin(angle) * dist;
            }

            let newEnemy = new Enemy(this.enemyIdCounter++, spawnX, spawnY, this.squad.leader.angle, this.squad.currentChoreo);
            newEnemy.invulnerableTimer = 120; 
            newEnemy.cooldown = 120; 
            this.enemies.push(newEnemy);
            this.enemiesSpawnedThisWave++;
        }

        this.bullets.forEach(b => b.update(this.width, this.height));
        this.enemyBullets.forEach(b => b.update(this.width, this.height));
        
        for (let i = 0; i < this.asteroids.length; i++) {
            let a = this.asteroids[i];
            if (a.invulnerableTimer > 0) a.invulnerableTimer--; 
            if (!a.shrinkCooldown) a.shrinkCooldown = 0;
            if (a.shrinkCooldown > 0) a.shrinkCooldown--; 
            a.update(this.width, this.height);
        }
        this.resolveAsteroidBounces();

        for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
            let b = this.enemyBullets[i];
            let hit = false;
            for (let j = this.asteroids.length - 1; j >= 0; j--) {
                let a = this.asteroids[j];
                if (a.invulnerableTimer > 0) continue;
                let dx = b.x - a.x;
                if (dx > this.width / 2) dx -= this.width; else if (dx < -this.width / 2) dx += this.width;
                let dy = b.y - a.y;
                if (dy > this.height / 2) dy -= this.height; else if (dy < -this.height / 2) dy += this.height;
                if (dx * dx + dy * dy < (a.radius + 15) * (a.radius + 15)) {
                    hit = true;
                    if (a.shrinkCooldown <= 0) {
                        a.radius -= 1.5; 
                        a.shrinkCooldown = 15; 
                        if (a.radius < 18) this.asteroids.splice(j, 1);
                    }
                    break;
                }
            }
            if (hit) b.life = 0; 
        }
        
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            let b = this.bullets[i];
            let hit = false;
            for (let j = this.asteroids.length - 1; j >= 0; j--) {
                let a = this.asteroids[j];
                if (a.invulnerableTimer > 0) continue;
                let dx = b.x - a.x;
                if (dx > this.width / 2) dx -= this.width; else if (dx < -this.width / 2) dx += this.width;
                let dy = b.y - a.y;
                if (dy > this.height / 2) dy -= this.height; else if (dy < -this.height / 2) dy += this.height;
                if (dx * dx + dy * dy < (a.radius + 15) * (a.radius + 15)) {
                    hit = true;
                    if (a.shrinkCooldown <= 0) {
                        a.radius -= 6.0; 
                        a.shrinkCooldown = 15; 
                        if (a.radius < 18) this.asteroids.splice(j, 1);
                    }
                    break;
                }
            }
            if (hit) b.life = 0;
        }

        this.bullets = this.bullets.filter(b => b.life > 0);
        this.enemyBullets = this.enemyBullets.filter(b => b.life > 0);

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