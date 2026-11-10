export class Enemy {
    constructor(id, x, y, angle, sourceChoreo) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.angle = angle;
        this.radius = 10;
        this.cooldown = 0;
        this.speed = 1.8;
        this.sourceChoreo = sourceChoreo;
        this.evadeTimer = 0;
        this.dead = false;
    }
}