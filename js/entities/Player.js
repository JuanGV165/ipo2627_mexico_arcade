export class Player {
    constructor(x, y, settings = {}) {
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
        this.healRate = settings.healRate || 0.03;
        this.spinAccumulator = 0;
        this.lastAngle = this.angle;
        this.isShooting = false;
    }

    update(input, mapWidth, mapHeight, wave) {
        if (input.touch.joystickActive) {
            let jx = input.touch.joystickVector.x;
            let jy = input.touch.joystickVector.y;
            let dist = Math.hypot(jx, jy);
            if (dist > 0.1) {
                this.angle = Math.atan2(jy, jx);
                this.vx += Math.cos(this.angle) * 0.12 * dist;
                this.vy += Math.sin(this.angle) * 0.12 * dist;
            }
        } else {
            if (input.keys['ArrowLeft'] || input.keys['a'] || input.keys['A']) this.angle -= 0.05;
            if (input.keys['ArrowRight'] || input.keys['d'] || input.keys['D']) this.angle += 0.05;

            if (input.keys['ArrowUp'] || input.keys['w'] || input.keys['W']) {
                this.vx += Math.cos(this.angle) * 0.12;
                this.vy += Math.sin(this.angle) * 0.12;
            }
            if (input.keys['ArrowDown'] || input.keys['s'] || input.keys['S']) {
                this.vx *= 0.92;
                this.vy *= 0.92;
            }
        }

        let angleDiff = this.angle - this.lastAngle;
        angleDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));
        this.spinAccumulator = (this.spinAccumulator * 0.95) + Math.abs(angleDiff);
        this.lastAngle = this.angle;

        this.vx *= 0.985;
        this.vy *= 0.985;
        this.x += this.vx;
        this.y += this.vy;

        if (this.x < 0) this.x += mapWidth;
        if (this.x >= mapWidth) this.x -= mapWidth;
        if (this.y < 0) this.y += mapHeight;
        if (this.y >= mapHeight) this.y -= mapHeight;

        if (this.healDelay > 0) {
            this.healDelay--;
        } else if (this.health > 0 && this.health < this.maxHealth) {
            this.health = Math.min(this.maxHealth, this.health + this.healRate);
        }

        if (this.invulnerableFrames > 0) this.invulnerableFrames--;
        if (this.cooldown > 0) this.cooldown--;
    }

    damage(amount) {
        if (this.invulnerableFrames > 0) return false;
        this.health -= amount;
        this.invulnerableFrames = 72;
        this.healDelay = 150; 
        if (this.health <= 0) this.health = 0;
        return true;
    }
    
    shoot() {
        this.healDelay = 150; 
    }
}