export class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.angle = -Math.PI / 2;
        this.radius = 4;
        this.health = 100;
        this.maxHealth = 100;
        this.cooldown = 0;
        this.invulnerableFrames = 0;
        
        this.healDelay = 0;
        this.spinAccumulator = 0;
        this.lastAngle = this.angle;
        this.isShooting = false;
    }

    update(keys, mapWidth, mapHeight, wave) {
        if (keys['ArrowLeft'] || keys['a'] || keys['A']) this.angle -= 0.05;
        if (keys['ArrowRight'] || keys['d'] || keys['D']) this.angle += 0.05;
        
        // Calcular cuánto está girando para la IA enemiga
        let angleDiff = this.angle - this.lastAngle;
        angleDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));
        this.spinAccumulator = (this.spinAccumulator * 0.95) + Math.abs(angleDiff);
        this.lastAngle = this.angle;

        if (keys['ArrowUp'] || keys['w'] || keys['W']) {
            this.vx += Math.cos(this.angle) * 0.12;
            this.vy += Math.sin(this.angle) * 0.12;
        }
        if (keys['ArrowDown'] || keys['s'] || keys['S']) {
            this.vx *= 0.92;
            this.vy *= 0.92;
        }

        this.vx *= 0.985;
        this.vy *= 0.985;
        this.x += this.vx;
        this.y += this.vy;

        if (this.x < 0) this.x += mapWidth;
        if (this.x >= mapWidth) this.x -= mapWidth;
        if (this.y < 0) this.y += mapHeight;
        if (this.y >= mapHeight) this.y -= mapHeight;

        // Curación constante al 100% sin penalización a partir de la oleada 4
        if (this.healDelay > 0) {
            this.healDelay--;
        } else if (this.health > 0 && this.health < this.maxHealth) {
            this.health = Math.min(this.maxHealth, this.health + 0.03); 
        }

        if (this.invulnerableFrames > 0) this.invulnerableFrames--;
        if (this.cooldown > 0) this.cooldown--;
    }

    damage(amount) {
        if (this.invulnerableFrames > 0) return false;
        this.health -= amount;
        this.invulnerableFrames = 72;
        this.healDelay = 150; // 2.5 segundos de bloqueo al recibir daño
        if (this.health <= 0) this.health = 0;
        return true;
    }
    
    shoot() {
        this.healDelay = 150; // 2.5 segundos de bloqueo al disparar
    }
}