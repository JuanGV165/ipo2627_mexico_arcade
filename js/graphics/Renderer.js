export class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.stars = Array.from({ length: 150 }, () => ({
            x: Math.random() * 2400,
            y: Math.random() * 1600,
            size: Math.random() * 2, 
            alpha: Math.random() * 0.8 + 0.2
        }));
    }

    getScreenPos(entityX, entityY, camX, camY, mw, mh) {
        let dx = entityX - camX;
        if (dx > mw / 2) dx -= mw; else if (dx < -mw / 2) dx += mw;
        let dy = entityY - camY;
        if (dy > mh / 2) dy -= mh; else if (dy < -mh / 2) dy += mh;
        return { x: (this.canvas.width / 2) + dx, y: (this.canvas.height / 2) + dy };
    }

    render(game) {
        const cw = this.canvas.width, ch = this.canvas.height;
        const p = game.player;
        const mw = game.width, mh = game.height;
        const isSandbox = game.state === 'SANDBOX';
        
        // En Sandbox el mapa es de 1200x800 (tamaño de la ventana).
        // La cámara siempre está fija en el centro (600, 400) para ver todo sin zoom.
        const fixedCamera = isSandbox; 
        const camX = fixedCamera ? mw / 2 : p.x;
        const camY = fixedCamera ? mh / 2 : p.y;

        this.ctx.fillStyle = '#050510';
        this.ctx.fillRect(0, 0, cw, ch);
        this.ctx.save(); 

        this.ctx.fillStyle = '#ffffff';
        let starMargin = 5;
        for (let i = 0; i < this.stars.length; i++) {
            let s = this.stars[i];
            // Asegurar que las estrellas no se salgan del mapa en modo normal
            let sx = s.x % mw; let sy = s.y % mh; 
            let pos = this.getScreenPos(sx, sy, camX, camY, mw, mh);
            if (pos.x >= -starMargin && pos.x <= cw+starMargin && pos.y >= -starMargin && pos.y <= ch+starMargin) {
                this.ctx.globalAlpha = s.alpha;
                this.ctx.fillRect(pos.x, pos.y, s.size, s.size);
            }
        }
        this.ctx.globalAlpha = 1.0;

        if (game.state === 'PLAYING' || isSandbox) {
            this.drawAsteroids(game.asteroids, camX, camY, mw, mh, fixedCamera);
            this.drawEnemies(game.enemies, camX, camY, mw, mh, fixedCamera);
            this.drawPlayerWaves(game.bullets, camX, camY, mw, mh, fixedCamera);
            this.drawEnemyBullets(game.enemyBullets, camX, camY, mw, mh, fixedCamera);
            
            // Dibuja al jugador solo si está activo
            if (game.sandboxPlayerActive) {
                let pPos = this.getScreenPos(p.x, p.y, camX, camY, mw, mh);
                this.drawPlayerCentered(p, pPos.x, pPos.y);
            }
            
            this.ctx.restore(); 
            
            if (game.input.touch.joystickActive && game.sandboxPlayerActive) {
                this.ctx.save();
                const jx = game.input.touch.joystickOrigin.x;
                const jy = game.input.touch.joystickOrigin.y;
                const cx = game.input.touch.joystickCurrent.x;
                const cy = game.input.touch.joystickCurrent.y;
                
                this.ctx.strokeStyle = 'rgba(0, 243, 255, 0.4)';
                this.ctx.fillStyle = 'rgba(0, 243, 255, 0.15)';
                this.ctx.lineWidth = 3;
                
                this.ctx.beginPath();
                this.ctx.arc(jx, jy, 60, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.stroke();

                this.ctx.beginPath();
                this.ctx.arc(cx, cy, 25, 0, Math.PI * 2);
                this.ctx.fillStyle = 'rgba(0, 243, 255, 0.7)';
                this.ctx.fill();
                this.ctx.restore();
            }
        } else {
            this.ctx.restore(); 
        }
    }

    drawPlayerCentered(p, scrX, scrY) {
        if (p.invulnerableFrames > 0 && Math.floor(p.invulnerableFrames / 6) % 2 === 0) return;
        this.ctx.save();
        this.ctx.translate(scrX, scrY); 
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

    drawEnemies(enemies, camX, camY, mw, mh, fixedCamera) {
        let margin = 30; 
        this.ctx.fillStyle = '#ff3366';
        for (let i = 0; i < enemies.length; i++) {
            let e = enemies[i];
            let pos = this.getScreenPos(e.x, e.y, camX, camY, mw, mh);
            if (pos.x < -margin || pos.x > this.canvas.width+margin || pos.y < -margin || pos.y > this.canvas.height+margin) continue;

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

    drawAsteroids(asteroids, camX, camY, mw, mh, fixedCamera) {
        let margin = 60;
        this.ctx.lineWidth = 1.5;
        for (let k = 0; k < asteroids.length; k++) {
            let a = asteroids[k];
            let pos = this.getScreenPos(a.x, a.y, camX, camY, mw, mh);
            if (pos.x < -margin || pos.x > this.canvas.width+margin || pos.y < -margin || pos.y > this.canvas.height+margin) continue;

            this.ctx.save();
            this.ctx.translate(pos.x, pos.y);
            this.ctx.rotate(a.angle);
            this.ctx.beginPath();
            
            if (a.invulnerableTimer > 0) {
                this.ctx.strokeStyle = `hsla(36, 100%, 50%, ${0.5 + Math.abs(Math.sin(Date.now()*0.01))*0.5})`; 
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

    drawPlayerWaves(bullets, camX, camY, mw, mh, fixedCamera) {
        let margin = 30;
        this.ctx.strokeStyle = '#00f3ff';
        this.ctx.lineWidth = 3;
        for (let i = 0; i < bullets.length; i++) {
            let b = bullets[i];
            let pos = this.getScreenPos(b.x, b.y, camX, camY, mw, mh);
            if (pos.x < -margin || pos.x > this.canvas.width+margin || pos.y < -margin || pos.y > this.canvas.height+margin) continue;
            
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

    drawEnemyBullets(bullets, camX, camY, mw, mh, fixedCamera) {
        let margin = 30;
        this.ctx.fillStyle = '#ff3366';
        for (let i = 0; i < bullets.length; i++) {
            let b = bullets[i];
            let pos = this.getScreenPos(b.x, b.y, camX, camY, mw, mh);
            if (pos.x < -margin || pos.x > this.canvas.width+margin || pos.y < -margin || pos.y > this.canvas.height+margin) continue;

            this.ctx.beginPath();
            this.ctx.arc(pos.x, pos.y, 2, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }
}