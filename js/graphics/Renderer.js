export class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        const starColors = ['#ffffff', '#dcf7ff', '#fff4d2', '#cbeaff'];
        this.stars = Array.from({ length: 650 }, () => ({
            x: Math.random() * 2400,
            y: Math.random() * 1600,
            size: 1.3 + Math.random() * 1.2,
            alpha: 0.5 + Math.random() * 0.5,
            twinkleSpeed: 0.02 + Math.random() * 0.03,
            twinklePhase: Math.random() * Math.PI * 2,
            color: starColors[Math.floor(Math.random() * starColors.length)]
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
        const targetW = this.canvas.clientWidth || window.innerWidth;
        const targetH = this.canvas.clientHeight || window.innerHeight;
        if (this.canvas.width !== targetW || this.canvas.height !== targetH) {
            this.canvas.width = targetW;
            this.canvas.height = targetH;
        }

        const cw = this.canvas.width, ch = this.canvas.height;
        const p = game.player;
        const mw = game.width, mh = game.height;
        const isSandbox = game.state === 'SANDBOX';
        
        const fixedCamera = isSandbox || game.state === 'MENU'; 
        const camX = fixedCamera ? mw / 2 : p.x;
        const camY = fixedCamera ? mh / 2 : p.y;

        this.ctx.fillStyle = '#050510';
        this.ctx.fillRect(0, 0, cw, ch);
        this.ctx.save(); 

        const zoom = isSandbox ? 0.5 : 1;
        this.ctx.translate(cw / 2, ch / 2);
        this.ctx.scale(zoom, zoom); 
        this.ctx.translate(-cw / 2, -ch / 2);

        let starMargin = fixedCamera ? 1500 : (150 / zoom);
        const now = performance.now() * 0.05;
        for (let i = 0; i < this.stars.length; i++) {
            let s = this.stars[i];
            let sx = s.x % mw; let sy = s.y % mh; 
            let pos = this.getScreenPos(sx, sy, camX, camY, mw, mh);
            if (pos.x >= -starMargin && pos.x <= cw+starMargin && pos.y >= -starMargin && pos.y <= ch+starMargin) {
                const twinkle = 0.8 + 0.2 * Math.sin(now * s.twinkleSpeed + s.twinklePhase);
                this.ctx.globalAlpha = Math.min(1, s.alpha * twinkle);
                this.ctx.fillStyle = s.color;
                this.ctx.fillRect(pos.x, pos.y, s.size, s.size);
            }
        }
        this.ctx.globalAlpha = 1.0;

        if (game.state === 'MENU') {
            this.ctx.restore();
            if (game.menuFleet) {
                this.drawMenuFleet(game.menuFleet);
            }
            return;
        }

        if (game.state === 'PLAYING' || game.state === 'PAUSED' || isSandbox) {
            this.drawAsteroids(game.asteroids, camX, camY, mw, mh, fixedCamera, zoom);
            this.drawEnemies(game.enemies, camX, camY, mw, mh, fixedCamera, zoom);
            this.drawPlayerWaves(game.bullets, camX, camY, mw, mh, fixedCamera, zoom);
            this.drawEnemyBullets(game.enemyBullets, camX, camY, mw, mh, fixedCamera, zoom);
            
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

    drawMenuFleet(fleet) {
        this.ctx.save();
        if ('filter' in this.ctx) {
            this.ctx.filter = 'blur(2.5px)';
        }
        this.ctx.globalAlpha = 0.64;
        this.ctx.fillStyle = '#e62e5c';

        const cosA = Math.cos(fleet.angle);
        const sinA = Math.sin(fleet.angle);

        for (let i = 0; i < fleet.ships.length; i++) {
            const ship = fleet.ships[i];
            const waveOffsetY = ship.amp > 0
                ? Math.sin(fleet.traveled * ship.freq + ship.phase) * ship.amp
                : 0;
            const localX = ship.localX;
            const localY = ship.localY + waveOffsetY;

            const sx = fleet.x + (localX * cosA - localY * sinA);
            const sy = fleet.y + (localX * sinA + localY * cosA);

            let heading = fleet.angle;
            if (ship.amp > 0) {
                const slope = Math.cos(fleet.traveled * ship.freq + ship.phase) * ship.amp * ship.freq;
                heading += Math.atan(slope);
            }

            this.ctx.save();
            this.ctx.translate(sx, sy);
            this.ctx.rotate(heading);
            this.ctx.scale(0.45, 0.45);
            this.ctx.beginPath();
            this.ctx.moveTo(20, 0);
            this.ctx.lineTo(-15, 15);
            this.ctx.lineTo(-5, 0);
            this.ctx.lineTo(-15, -15);
            this.ctx.closePath();
            this.ctx.fill();
            this.ctx.restore();
        }

        if ('filter' in this.ctx) {
            this.ctx.filter = 'none';
        }
        this.ctx.restore();
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

    drawEnemies(enemies, camX, camY, mw, mh, fixedCamera, zoom) {
        let margin = fixedCamera ? 1500 : (100 / zoom); 
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

    drawAsteroids(asteroids, camX, camY, mw, mh, fixedCamera, zoom) {
        let margin = fixedCamera ? 1500 : (200 / zoom);
        this.ctx.lineWidth = 1.5;
        for (let k = 0; k < asteroids.length; k++) {
            let a = asteroids[k];
            if (!Number.isFinite(a.x) || !Number.isFinite(a.y) || !Number.isFinite(a.radius)) continue;
            let pos = this.getScreenPos(a.x, a.y, camX, camY, mw, mh);
            if (!Number.isFinite(pos.x) || !Number.isFinite(pos.y)) continue;
            if (pos.x < -margin || pos.x > this.canvas.width+margin || pos.y < -margin || pos.y > this.canvas.height+margin) continue;

            this.ctx.save();
            this.ctx.translate(pos.x, pos.y);
            this.ctx.rotate(a.angle);
            this.ctx.beginPath();
            
            if (a.invulnerableTimer > 0) {
                this.ctx.strokeStyle = (Math.floor(Date.now() / 120) % 2 === 0) ? '#ffe600' : '#ffbb00';
                this.ctx.fillStyle = 'rgba(65, 50, 0, 0.45)';
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

    drawPlayerWaves(bullets, camX, camY, mw, mh, fixedCamera, zoom) {
        let margin = fixedCamera ? 1500 : (100 / zoom);
        for (let i = 0; i < bullets.length; i++) {
            let b = bullets[i];
            let pos = this.getScreenPos(b.x, b.y, camX, camY, mw, mh);
            if (pos.x < -margin || pos.x > this.canvas.width+margin || pos.y < -margin || pos.y > this.canvas.height+margin) continue;
            
            this.ctx.save();
            this.ctx.translate(pos.x, pos.y);
            this.ctx.rotate(b.angle);
            
            this.ctx.beginPath();
            this.ctx.arc(0, 0, b.radius, -Math.PI / 2.2, Math.PI / 2.2);
            this.ctx.lineWidth = 6;
            this.ctx.strokeStyle = 'rgba(0, 243, 255, 0.3)';
            this.ctx.stroke();

            this.ctx.beginPath();
            this.ctx.arc(0, 0, b.radius, -Math.PI / 2.2, Math.PI / 2.2);
            this.ctx.lineWidth = 2;
            this.ctx.strokeStyle = '#00f3ff';
            this.ctx.stroke();
            
            this.ctx.restore();
        }
    }

    drawEnemyBullets(bullets, camX, camY, mw, mh, fixedCamera, zoom) {
        let margin = fixedCamera ? 1500 : (100 / zoom);
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