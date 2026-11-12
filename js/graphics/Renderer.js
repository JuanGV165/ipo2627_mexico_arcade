export class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.stars = Array.from({ length: 150 }, () => ({
            x: Math.random() * canvas.width * 2,
            y: Math.random() * canvas.height * 2,
            size: Math.random() * 2, 
            alpha: Math.random() * 0.8 + 0.2
        }));
    }

    getScreenPos(entityX, entityY, playerX, playerY, mw, mh) {
        let dx = entityX - playerX;
        if (dx > mw / 2) dx -= mw; else if (dx < -mw / 2) dx += mw;
        let dy = entityY - playerY;
        if (dy > mh / 2) dy -= mh; else if (dy < -mh / 2) dy += mh;
        return { x: (this.canvas.width / 2) + dx, y: (this.canvas.height / 2) + dy };
    }

    render(game) {
        const cw = this.canvas.width, ch = this.canvas.height;
        const p = game.player;
        const mw = game.width, mh = game.height;

        this.ctx.fillStyle = '#050510';
        this.ctx.fillRect(0, 0, cw, ch);

        this.ctx.fillStyle = '#ffffff';
        for (let i = 0; i < this.stars.length; i++) {
            let s = this.stars[i];
            let pos = this.getScreenPos(s.x, s.y, p.x, p.y, mw, mh);
            if (pos.x >= -5 && pos.x <= cw+5 && pos.y >= -5 && pos.y <= ch+5) {
                this.ctx.globalAlpha = s.alpha;
                this.ctx.fillRect(pos.x, pos.y, s.size, s.size);
            }
        }
        this.ctx.globalAlpha = 1.0;

        if (game.state === 'PLAYING') {
            this.drawAsteroids(game.asteroids, p, mw, mh);
            this.drawEnemies(game.enemies, p, mw, mh);
            this.drawPlayerWaves(game.bullets, p, mw, mh);
            this.drawEnemyBullets(game.enemyBullets, p, mw, mh);
            this.drawPlayerCentered(p, cw, ch);
        }
    }

    drawPlayerCentered(p, cw, ch) {
        if (p.invulnerableFrames > 0 && Math.floor(p.invulnerableFrames / 6) % 2 === 0) return;
        this.ctx.save();
        this.ctx.translate(cw / 2, ch / 2); 
        this.ctx.rotate(p.angle);
        this.ctx.scale(0.5, 0.5);
        
        this.ctx.strokeStyle = '#00f3ff';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.moveTo(20, 0); this.ctx.lineTo(-15, 15);
        this.ctx.lineTo(-5, 0); this.ctx.lineTo(-15, -15);
        this.ctx.closePath(); 
        this.ctx.stroke();

        if (Math.abs(p.vx) > 0.5 || Math.abs(p.vy) > 0.5) {
            this.ctx.fillStyle = '#ff9900';
            this.ctx.beginPath();
            this.ctx.moveTo(-5, 0); this.ctx.lineTo(-20, 8);
            this.ctx.lineTo(-25, 0); this.ctx.lineTo(-20, -8);
            this.ctx.fill();
        }
        this.ctx.restore();
    }

    drawEnemies(enemies, p, mw, mh) {
        this.ctx.fillStyle = '#ff3366';
        for (let i = 0; i < enemies.length; i++) {
            let e = enemies[i];
            let pos = this.getScreenPos(e.x, e.y, p.x, p.y, mw, mh);
            if (pos.x < -30 || pos.x > this.canvas.width+30 || pos.y < -30 || pos.y > this.canvas.height+30) continue;

            this.ctx.save();
            this.ctx.translate(pos.x, pos.y);
            this.ctx.rotate(e.angle);
            this.ctx.scale(0.4, 0.4);
            this.ctx.beginPath();
            this.ctx.moveTo(20, 0); this.ctx.lineTo(-15, 15);
            this.ctx.lineTo(-5, 0); this.ctx.lineTo(-15, -15);
            this.ctx.fill();
            this.ctx.restore();
        }
    }

    drawAsteroids(asteroids, p, mw, mh) {
        this.ctx.lineWidth = 1.5;
        for (let k = 0; k < asteroids.length; k++) {
            let a = asteroids[k];
            let pos = this.getScreenPos(a.x, a.y, p.x, p.y, mw, mh);
            if (pos.x < -60 || pos.x > this.canvas.width+60 || pos.y < -60 || pos.y > this.canvas.height+60) continue;

            this.ctx.save();
            this.ctx.translate(pos.x, pos.y);
            this.ctx.rotate(a.angle);
            this.ctx.beginPath();
            
            // EFECTO DE ESCUDO INVULNERABLE
            if (a.invulnerableTimer > 0) {
                this.ctx.strokeStyle = `hsla(36, 100%, 50%, ${0.5 + Math.abs(Math.sin(Date.now()*0.01))*0.5})`; // Brillo naranja
                this.ctx.fillStyle = '#201000';
            } else {
                this.ctx.strokeStyle = '#a0a0b0';
                this.ctx.fillStyle = '#101018';
            }

            for (let i = 0; i < a.points; i++) {
                let angle = (i / a.points) * Math.PI * 2;
                let r = a.radius * a.offsets[i];
                if (i === 0) this.ctx.moveTo(Math.cos(angle) * r, Math.sin(angle) * r);
                else this.ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
            }
            this.ctx.closePath();
            this.ctx.fill(); 
            this.ctx.stroke();
            this.ctx.restore();
        }
    }

    drawPlayerWaves(bullets, p, mw, mh) {
        this.ctx.strokeStyle = '#00f3ff';
        this.ctx.lineWidth = 3;
        for (let i = 0; i < bullets.length; i++) {
            let b = bullets[i];
            let pos = this.getScreenPos(b.x, b.y, p.x, p.y, mw, mh);
            
            this.ctx.save();
            this.ctx.translate(pos.x, pos.y);
            this.ctx.rotate(b.angle);
            this.ctx.shadowColor = '#00f3ff';
            this.ctx.shadowBlur = 4; 
            this.ctx.beginPath();
            this.ctx.arc(0, 0, b.radius, -Math.PI / 2.2, Math.PI / 2.2);
            this.ctx.stroke();
            this.ctx.restore();
        }
    }

    drawEnemyBullets(bullets, p, mw, mh) {
        this.ctx.fillStyle = '#ff3366';
        for (let i = 0; i < bullets.length; i++) {
            let b = bullets[i];
            let pos = this.getScreenPos(b.x, b.y, p.x, p.y, mw, mh);
            this.ctx.beginPath();
            this.ctx.arc(pos.x, pos.y, 2, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }
}