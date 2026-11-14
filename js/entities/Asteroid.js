export class Asteroid {
    constructor(x = 0, y = 0, vxOrRadius = 0, vyOrSpeedMult = 0, radius = null, speedMultiplier = 1) {
        this.x = Number.isFinite(x) ? x : 0;
        this.y = Number.isFinite(y) ? y : 0;

        if (radius === null || radius === undefined) {
            const parsedRadius = (typeof vxOrRadius === 'number' && vxOrRadius > 8)
                ? vxOrRadius
                : (25 + Math.random() * 35);
            const mult = (typeof vyOrSpeedMult === 'number' && vyOrSpeedMult > 0)
                ? vyOrSpeedMult
                : 1;

            this.radius = parsedRadius;
            const angle = Math.random() * Math.PI * 2;
            const speed = (0.5 + Math.random() * 1.5) * mult;
            this.vx = Math.cos(angle) * speed;
            this.vy = Math.sin(angle) * speed;
        } else {
            this.radius = Number.isFinite(radius) && radius > 0 ? radius : (25 + Math.random() * 35);
            const mult = Number.isFinite(speedMultiplier) && speedMultiplier > 0 ? speedMultiplier : 1;
            this.vx = Number.isFinite(vxOrRadius) ? vxOrRadius : (Math.random() - 0.5) * 2 * mult;
            this.vy = Number.isFinite(vyOrSpeedMult) ? vyOrSpeedMult : (Math.random() - 0.5) * 2 * mult;
        }

        this.angle = Math.random() * Math.PI * 2;
        this.rotSpeed = (Math.random() - 0.5) * 0.04;
        this.invulnerableTimer = 30;
        this.shrinkCooldown = 0;
        this.health = Math.ceil(this.radius / 10);

        this.points = 10 + Math.floor(Math.random() * 5);
        this.offsets = Array.from({ length: this.points }, () => 0.7 + Math.random() * 0.5);
    }

    update(mw, mh) {
        if (!Number.isFinite(this.x)) this.x = Math.random() * mw;
        if (!Number.isFinite(this.y)) this.y = Math.random() * mh;
        if (!Number.isFinite(this.vx)) this.vx = (Math.random() - 0.5) * 1.5;
        if (!Number.isFinite(this.vy)) this.vy = (Math.random() - 0.5) * 1.5;

        this.x += this.vx;
        this.y += this.vy;
        this.angle += this.rotSpeed;

        if (this.x < 0) this.x += mw;
        else if (this.x >= mw) this.x -= mw;

        if (this.y < 0) this.y += mh;
        else if (this.y >= mh) this.y -= mh;
    }
}