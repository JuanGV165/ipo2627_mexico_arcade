export class Asteroid {
    constructor(x, y, vx, vy, radius) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.radius = radius;
        this.angle = 0;
        this.rotSpeed = (Math.random() - 0.5) * 0.02;
        this.points = radius > 20 ? 6 : 5;
        this.offsets = radius > 20 ? [0.8, 1.1, 0.7, 1.0, 0.9, 0.75] : [0.9, 0.7, 1.1, 0.8, 1.0];
        this.dead = false;
        
        // 1.5 Segundos de invulnerabilidad al spawnear/dividirse
        this.invulnerableTimer = 90; 
    }

    update(mapWidth, mapHeight) {
        this.x += this.vx;
        this.y += this.vy;
        this.angle += this.rotSpeed;

        if (this.invulnerableTimer > 0) this.invulnerableTimer--;

        if (this.x < 0) this.x += mapWidth;
        if (this.x >= mapWidth) this.x -= mapWidth;
        if (this.y < 0) this.y += mapHeight;
        if (this.y >= mapHeight) this.y -= mapHeight;
    }

    split() {
        return [
            new Asteroid(this.x, this.y, this.vx + (Math.random() - 0.5) * 3, this.vy + (Math.random() - 0.5) * 3, 12),
            new Asteroid(this.x, this.y, this.vx + (Math.random() - 0.5) * 3, this.vy + (Math.random() - 0.5) * 3, 12)
        ];
    }
}