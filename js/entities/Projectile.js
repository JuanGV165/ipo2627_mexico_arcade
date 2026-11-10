export class Projectile {
    constructor(x, y, vx, vy, angle, radius, life, isPlayerWave = false, sourceChoreo = null) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.angle = angle;
        this.radius = radius;
        this.life = life;
        this.isPlayerWave = isPlayerWave;
        this.sourceChoreo = sourceChoreo;
    }

    update(mapWidth, mapHeight) {
        this.x += this.vx;
        this.y += this.vy;
        this.life--;

        if (this.isPlayerWave) {
            let speedSq = this.vx * this.vx + this.vy * this.vy;
            if (speedSq > 16) {
                this.vx *= 0.96;
                this.vy *= 0.96;
            }
        }

        if (this.x < 0) this.x += mapWidth;
        if (this.x >= mapWidth) this.x -= mapWidth;
        if (this.y < 0) this.y += mapHeight;
        if (this.y >= mapHeight) this.y -= mapHeight;
    }
}