export class CollisionSystem {
    static getSqDist(x1, y1, x2, y2, mw, mh) {
        let dx = x1 - x2;
        if (dx > mw / 2) dx -= mw; else if (dx < -mw / 2) dx += mw;
        let dy = y1 - y2;
        if (dy > mh / 2) dy -= mh; else if (dy < -mh / 2) dy += mh;
        return (dx * dx) + (dy * dy);
    }

    static check(game) {
        const p = game.player;
        const mw = game.width;
        const mh = game.height;

        for (let i = game.bullets.length - 1; i >= 0; i--) {
            let b = game.bullets[i];
            let bRadSq = (b.radius + 2) * (b.radius + 2);

            for (let j = game.enemyBullets.length - 1; j >= 0; j--) {
                let eb = game.enemyBullets[j];
                if (this.getSqDist(b.x, b.y, eb.x, eb.y, mw, mh) < bRadSq) eb.life = 0;
            }

            for (let j = game.enemies.length - 1; j >= 0; j--) {
                let e = game.enemies[j];
                if (!e.dead) {
                    let rSq = (e.radius + b.radius) * (e.radius + b.radius);
                    if (this.getSqDist(b.x, b.y, e.x, e.y, mw, mh) < rSq) {
                        e.dead = true; b.life = 0; game.score += 50; game.kills++; game.waveKills++;
                        break;
                    }
                }
            }

            for (let j = game.asteroids.length - 1; j >= 0; j--) {
                let a = game.asteroids[j];
                // Solo rompes el meteorito si ya no es invulnerable
                if (!a.dead && a.invulnerableTimer <= 0) {
                    let rSq = (a.radius + b.radius) * (a.radius + b.radius);
                    if (this.getSqDist(b.x, b.y, a.x, a.y, mw, mh) < rSq) {
                        a.dead = true; b.life = 0; game.score += 10;
                        if (a.radius > 20) {
                            let newAsts = a.split();
                            game.asteroids.push(newAsts[0], newAsts[1]);
                        }
                        break;
                    }
                }
            }
        }

        game.enemies = game.enemies.filter(e => !e.dead);
        game.asteroids = game.asteroids.filter(a => !a.dead);

        for (let i = 0; i < game.enemyBullets.length; i++) {
            let b = game.enemyBullets[i];
            let rSq = (p.radius + 2) * (p.radius + 2);
            if (b.life > 0 && this.getSqDist(b.x, b.y, p.x, p.y, mw, mh) < rSq) {
                b.life = 0; game.damagePlayer(15, b.sourceChoreo);
            }
        }

        for (let i = 0; i < game.enemies.length; i++) {
            let e = game.enemies[i];
            let rSq = (p.radius + e.radius) * (p.radius + e.radius);
            if (this.getSqDist(e.x, e.y, p.x, p.y, mw, mh) < rSq) {
                e.dead = true; game.kills++; game.waveKills++; game.damagePlayer(20, e.sourceChoreo);
            }
        }

        // Aunque el asteroide sea invulnerable a balas, SIEMPRE choca con el jugador
        for (let i = 0; i < game.asteroids.length; i++) {
            let a = game.asteroids[i];
            let rSq = (p.radius + a.radius) * (p.radius + a.radius);
            if (this.getSqDist(a.x, a.y, p.x, p.y, mw, mh) < rSq) {
                a.dead = true; game.damagePlayer(a.radius > 20 ? 15 : 10, null);
                if (a.radius > 20) {
                    let newAsts = a.split();
                    game.asteroids.push(newAsts[0], newAsts[1]);
                }
            }
        }
    }
}