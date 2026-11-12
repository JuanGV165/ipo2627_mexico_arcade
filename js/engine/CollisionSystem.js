export class CollisionSystem {
    static getSqDist(x1, y1, x2, y2, mw, mh) {
        let dx = Math.abs(x1 - x2);
        if (dx > mw / 2) dx = mw - dx;
        let dy = Math.abs(y1 - y2);
        if (dy > mh / 2) dy = mh - dy;
        return dx * dx + dy * dy;
    }

    static check(game) {
        const mw = game.width;
        const mh = game.height;

        // 1. Jugador vs Asteroides (DAÑO REDUCIDO A 8)
        if (game.player.invulnerableFrames <= 0) {
            for (let k = game.asteroids.length - 1; k >= 0; k--) {
                let a = game.asteroids[k];
                let rSq = (game.player.radius + a.radius) * (game.player.radius + a.radius);
                
                if (this.getSqDist(game.player.x, game.player.y, a.x, a.y, mw, mh) < rSq) {
                    game.damagePlayer(game.getDifficultySettings().asteroidDamage, null);
                    
                    if (a.radius > 20) {
                        let a1 = new a.constructor(a.x, a.y, a.vx + (Math.random()*2 - 1) * a.speedMultiplier, a.vy + (Math.random()*2 - 1) * a.speedMultiplier, a.radius * 0.6, a.speedMultiplier);
                        let a2 = new a.constructor(a.x, a.y, a.vx + (Math.random()*2 - 1) * a.speedMultiplier, a.vy + (Math.random()*2 - 1) * a.speedMultiplier, a.radius * 0.6, a.speedMultiplier);
                        a1.invulnerableTimer = 90;
                        a2.invulnerableTimer = 90;
                        game.asteroids.push(a1, a2);
                    }
                    game.asteroids.splice(k, 1); 
                    break;
                }
            }
        }
        
        // 2. Enemigos vs Asteroides (BUG FIX: AHORA SUMA LA BAJA)
        for (let i = game.enemies.length - 1; i >= 0; i--) {
            let e = game.enemies[i];
            if (e.dead || e.invulnerableTimer > 0) continue; 
            for (let a of game.asteroids) {
                let rSq = (15 + a.radius) * (15 + a.radius); 
                if (this.getSqDist(e.x, e.y, a.x, a.y, mw, mh) < rSq) {
                    e.dead = true;
                    // Sumamos la baja para no quedarnos atascados en la oleada
                    game.kills++; 
                    game.waveKills++;
                    game.score += 25; // Bonus de puntos por kill de entorno
                    e.x = null; 
                    e.y = null;
                    break;
                }
            }
        }

        // 3. Balas jugador vs Asteroides
        for (let i = game.bullets.length - 1; i >= 0; i--) {
            let b = game.bullets[i];
            if (b.life <= 0) continue;
            
            for (let k = game.asteroids.length - 1; k >= 0; k--) {
                let a = game.asteroids[k];
                let rSq = (b.radius + a.radius) * (b.radius + a.radius);
                
                if (this.getSqDist(b.x, b.y, a.x, a.y, mw, mh) < rSq) {
                    b.life = 0; 
                    
                    if (!(a.invulnerableTimer > 0)) {
                        if (a.radius > 20) {
                            let a1 = new a.constructor(a.x, a.y, a.vx + (Math.random()*2 - 1) * a.speedMultiplier, a.vy + (Math.random()*2 - 1) * a.speedMultiplier, a.radius * 0.6, a.speedMultiplier);
                            let a2 = new a.constructor(a.x, a.y, a.vx + (Math.random()*2 - 1) * a.speedMultiplier, a.vy + (Math.random()*2 - 1) * a.speedMultiplier, a.radius * 0.6, a.speedMultiplier);
                            a1.invulnerableTimer = 90;
                            a2.invulnerableTimer = 90;
                            game.asteroids.push(a1, a2);
                        }
                        game.score += 15;
                        game.asteroids.splice(k, 1); 
                    }
                    break; 
                }
            }
        }

        // 4. Balas enemigas vs Asteroides
        for (let i = game.enemyBullets.length - 1; i >= 0; i--) {
            let b = game.enemyBullets[i];
            for (let a of game.asteroids) {
                let rSq = (2 + a.radius) * (2 + a.radius);
                if (this.getSqDist(b.x, b.y, a.x, a.y, mw, mh) < rSq) {
                    b.life = 0;
                    break;
                }
            }
        }

        // 5. Balas enemigas vs Jugador
        if (game.player.invulnerableFrames <= 0) {
            for (let i = game.enemyBullets.length - 1; i >= 0; i--) {
                let b = game.enemyBullets[i];
                let rSq = (game.player.radius + 2) * (game.player.radius + 2);
                if (this.getSqDist(b.x, b.y, game.player.x, game.player.y, mw, mh) < rSq) {
                    if (game.damagePlayer(15, b.sourceChoreo)) b.life = 0;
                    break;
                }
            }
        }

        // 6. Balas jugador vs Enemigos
        for (let i = game.bullets.length - 1; i >= 0; i--) {
            let b = game.bullets[i];
            if (b.life <= 0) continue;
            for (let j = game.enemies.length - 1; j >= 0; j--) {
                let e = game.enemies[j];
                if (!e.dead && !(e.invulnerableTimer > 0)) {
                    let rSq = (15 + b.radius) * (15 + b.radius);
                    if (this.getSqDist(b.x, b.y, e.x, e.y, mw, mh) < rSq) {
                        e.dead = true; 
                        b.life = 0; 
                        game.score += 50; 
                        game.kills++; 
                        game.waveKills++;
                        
                        e.x = null; 
                        e.y = null;
                        break;
                    }
                }
            }
        }

        // 7. Jugador vs Naves Enemigas (BUG FIX: KAMIKAZE AHORA TAMBIÉN SUMA BAJA)
        if (game.player.invulnerableFrames <= 0) {
            for (let e of game.enemies) {
                if (e.dead || e.invulnerableTimer > 0) continue; 
                let rSq = (game.player.radius + 15) * (game.player.radius + 15);
                if (this.getSqDist(game.player.x, game.player.y, e.x, e.y, mw, mh) < rSq) {
                    game.damagePlayer(30, e.currentChoreo); 
                    e.dead = true;
                    // Si se estrellan contra ti, ¡sigue contando como baja tuya!
                    game.kills++; 
                    game.waveKills++;
                    game.score += 50;
                    e.x = null;
                    e.y = null;
                    break;
                }
            }
        }

        game.enemies = game.enemies.filter(e => !e.dead);
    }
}