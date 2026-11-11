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
        
        this.input = new InputHandler();
        this.ui = new UIManager(uiElements);
        this.renderer = new Renderer(canvas);
        this.squad = new SquadManager(this.width, this.height);

        this.bindEvents();
        this.reset();
        this.loop();
    }

    reset() {
        this.state = 'MENU';
        this.score = 0;
        this.kills = 0;
        this.wave = 1;
        this.waveKills = 0;
        this.waveEnemiesTotal = 4;
        this.enemiesSpawnedThisWave = 0;
        this.waveMessageTimer = 180;
        this.enemyIdCounter = 0;

        this.player = new Player(this.width / 2, this.height / 2);
        this.bullets = [];
        this.enemyBullets = [];
        this.enemies = [];
        this.asteroids = [];

        this.spawnAsteroids(15);
    }

    spawnAsteroids(count) {
        for (let i = 0; i < count; i++) {
            this.asteroids.push(new Asteroid(
                Math.random() * this.width, 
                Math.random() * this.height, 
                (Math.random() - 0.5) * 2, 
                (Math.random() - 0.5) * 2, 
                30 + Math.random() * 20
            ));
        }
    }

    bindEvents() {
        window.addEventListener('keydown', e => {
            if (e.key.toLowerCase() === 'p' || e.key === 'Escape') this.togglePause();
        });
        
        this.ui.bindButtons({
            onStart: () => this.start(),
            onRestart: () => this.start(),
            onResume: () => this.togglePause(),
            onTogglePause: () => this.togglePause() 
        });
    }

    start() {
        this.reset();
        this.state = 'PLAYING';
        this.ui.updateVisibility(this.state);
    }

    togglePause() {
        if (this.state === 'PLAYING') this.state = 'PAUSED';
        else if (this.state === 'PAUSED') this.state = 'PLAYING';
        this.ui.updateVisibility(this.state);
    }

    damagePlayer(amount, sourceChoreo) {
        if (this.player.damage(amount)) {
            if (sourceChoreo && this.squad.tacticalMemory[sourceChoreo]) {
                this.squad.tacticalMemory[sourceChoreo] += 30;
            }
            if (this.player.health <= 0) {
                this.state = 'GAMEOVER';
                this.ui.setFinalScore(this.score);
                this.ui.updateVisibility(this.state);
            }
        }
    }

    update() {
        if (this.state !== 'PLAYING') return;

        if (this.waveMessageTimer > 0) this.waveMessageTimer--;

        if (this.waveKills >= this.waveEnemiesTotal) {
            this.wave++;
            this.waveKills = 0;
            this.enemiesSpawnedThisWave = 0;
            // Multiplicador más suave (por cada oleada suman 2 naves más en total, no 3)
            this.waveEnemiesTotal = 4 + (this.wave * 2);
            this.waveMessageTimer = 180;
            
            this.player.health = this.player.maxHealth;
            this.asteroids = this.asteroids.filter(a => a.radius > 15);
            if (this.asteroids.length < 25) {
                this.spawnAsteroids(8); 
            }
        }

        this.player.update(this.input.keys, this.width, this.height, this.wave);

        // Control de disparo general
        if (this.input.isPressed(' ')) {
            this.player.isShooting = true;
            if (this.player.cooldown === 0) {
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
        } else {
            this.player.isShooting = false;
        }

        // ESCALADO DE ENEMIGOS PROGRESIVO Y SUAVE
        let maxActive = Math.min(4 + Math.floor((this.wave - 1) * 0.75), 12);

        if (this.enemies.length < maxActive && this.enemiesSpawnedThisWave < this.waveEnemiesTotal && Math.random() < 0.05) {
            this.enemies.push(new Enemy(this.enemyIdCounter++, this.squad.leader.x, this.squad.leader.y, this.squad.leader.angle, this.squad.currentChoreo));
            this.enemiesSpawnedThisWave++;
        }

        this.bullets.forEach(b => b.update(this.width, this.height));
        this.enemyBullets.forEach(b => b.update(this.width, this.height));
        this.asteroids.forEach(a => a.update(this.width, this.height));

        this.bullets = this.bullets.filter(b => b.life > 0);
        this.enemyBullets = this.enemyBullets.filter(b => b.life > 0);

        this.squad.update(this.player, this.enemies, this.bullets, this.asteroids, this.enemyBullets, this.wave);
        CollisionSystem.check(this);
    }

    loop() {
        this.update();
        if (this.state === 'PLAYING') {
            this.renderer.render(this);
        }
        this.ui.renderHUD(this);
        requestAnimationFrame(() => this.loop());
    }
}