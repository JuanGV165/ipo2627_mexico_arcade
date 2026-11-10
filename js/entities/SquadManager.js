import { Projectile } from './Projectile.js';

export class SquadManager {
    constructor(mapWidth, mapHeight) {
        this.mw = mapWidth;
        this.mh = mapHeight;
        this.leader = { x: mapWidth - 200, y: 200, angle: 0, speed: 2.0 };
        this.tacticalMemory = {
            'V_QUINTET': 10, 'SNAKE_COLUMN': 10, 'RING_FIVE': 10, 'PINCER_SQUAD': 10
        };
        this.currentChoreo = 'V_QUINTET';
        this.activeTactic = 'V_QUINTET';
        this.choreoTimer = 600;
        this.choreoPhaseAngle = 0;
        
        this.isAntiCharge = false;
        this.isHarassing = false;
    }

    wrap(entity) {
        if (entity.x < 0) entity.x += this.mw;
        else if (entity.x >= this.mw) entity.x -= this.mw;
        if (entity.y < 0) entity.y += this.mh;
        else if (entity.y >= this.mh) entity.y -= this.mh;
    }

    selectNextChoreo() {
        let totalScore = 0;
        for (let k in this.tacticalMemory) totalScore += this.tacticalMemory[k];
        let rand = Math.random() * totalScore, sum = 0;
        for (let k in this.tacticalMemory) {
            sum += this.tacticalMemory[k];
            if (rand <= sum) return k;
        }
        return 'V_QUINTET';
    }

    update(player, enemies, bullets, asteroids, enemyBullets, wave) {
        this.choreoTimer--;
        this.choreoPhaseAngle += 0.015;
        if (this.choreoTimer <= 0) {
            this.currentChoreo = this.selectNextChoreo();
            this.choreoTimer = 550 + Math.random() * 150;
        }

        const phase = (this.choreoTimer > 200) ? 'SETUP' : 'STRIKE';

        let dx = player.x - this.leader.x;
        if (dx > this.mw / 2) dx -= this.mw; else if (dx < -this.mw / 2) dx += this.mw;
        let dy = player.y - this.leader.y;
        if (dy > this.mh / 2) dy -= this.mh; else if (dy < -this.mh / 2) dy += this.mh;
        
        let distToPlayerSq = dx * dx + dy * dy;
        let distToPlayer = Math.sqrt(distToPlayerSq);

        // -- ANÁLISIS DE INTENCIONES DEL JUGADOR --
        let pSpeedSq = player.vx * player.vx + player.vy * player.vy;
        let pVelNormX = player.vx / (Math.sqrt(pSpeedSq) || 1);
        let pVelNormY = player.vy / (Math.sqrt(pSpeedSq) || 1);
        let pDirX = Math.cos(player.angle);
        let pDirY = Math.sin(player.angle);
        
        let toLeaderNormX = -dx / distToPlayer; 
        let toLeaderNormY = -dy / distToPlayer;
        
        let dotProductAim = (pVelNormX * pDirX) + (pVelNormY * pDirY);
        let dotProductLeader = (pVelNormX * toLeaderNormX) + (pVelNormY * toLeaderNormY);

        // 1. Detección PREVIA de carga lineal (incluso antes de que estés cerca)
        this.isAntiCharge = (dotProductLeader > 0.65 && pSpeedSq > 3.0 && distToPlayer < 750);
        this.isHarassing = (distToPlayer > 650);
        
        let isTurret = (player.spinAccumulator > 0.08 && player.isShooting && pSpeedSq < 1.0);
        let isStraightCharge = (pSpeedSq > 3.5 && player.isShooting && dotProductAim > 0.80);

        this.activeTactic = this.currentChoreo;
        if (isTurret) this.activeTactic = 'ANTI_TURRETS';
        else if (isStraightCharge) this.activeTactic = 'SPLIT_FLANKS';

        // LÍDER
        let groupEvadeX = 0, groupEvadeY = 0;
        for (let i = 0; i < bullets.length; i++) {
            let b = bullets[i];
            let bdx = this.leader.x - b.x;
            if (bdx > this.mw / 2) bdx -= this.mw; else if (bdx < -this.mw / 2) bdx += this.mw;
            let bdy = this.leader.y - b.y;
            if (bdy > this.mh / 2) bdy -= this.mh; else if (bdy < -this.mh / 2) bdy += this.mh;
            
            if (bdx * bdx + bdy * bdy < 22500) {
                groupEvadeX += bdy * 0.05; groupEvadeY -= bdx * 0.05;
            }
        }

        let targetAngle = Math.atan2(dy, dx);
        if (this.isAntiCharge) {
            targetAngle += Math.PI / 1.5; // El líder maniobra hacia un flanco preventivo
            this.leader.speed *= 0.85;
        } else if (phase === 'SETUP') {
            if (distToPlayer > 400) targetAngle += 0.3; 
            else if (distToPlayer < 250) targetAngle += 2.5; 
            else targetAngle += Math.PI / 2; 
        } else {
            if (distToPlayer < 180) targetAngle += Math.PI / 2; 
        }
        
        targetAngle = Math.atan2(Math.sin(targetAngle) + groupEvadeY, Math.cos(targetAngle) + groupEvadeX);

        let diffAngle = targetAngle - this.leader.angle;
        diffAngle = Math.atan2(Math.sin(diffAngle), Math.cos(diffAngle));
        this.leader.angle += diffAngle * 0.04; 

        if (!this.isAntiCharge) {
            this.leader.speed += ((phase === 'SETUP' ? 1.8 : 3.0 + (wave * 0.1)) - this.leader.speed) * 0.1;
        }
        this.leader.x += Math.cos(this.leader.angle) * this.leader.speed;
        this.leader.y += Math.sin(this.leader.angle) * this.leader.speed;
        this.wrap(this.leader);

        const cosL = Math.cos(this.leader.angle);
        const sinL = Math.sin(this.leader.angle);

        // Número total de enemigos activos
        const totalEnemies = enemies.length;

        for (let index = 0; index < totalEnemies; index++) {
            let enemy = enemies[index];
            let slotX, slotY;
            let overrideSpeed = null;
            let overrideTurn = null;

            // -- DISTRIBUCIÓN TÁCTICA Y FORMACIONES --
            if (this.activeTactic === 'ANTI_TURRETS') {
                let safeRadius = 500;
                let step = (Math.PI * 2) / Math.max(1, totalEnemies);
                let orbitAngle = (step * index) + (this.choreoPhaseAngle * 0.3);
                slotX = player.x + Math.cos(orbitAngle) * safeRadius;
                slotY = player.y + Math.sin(orbitAngle) * safeRadius;
                
                let currentDistToPlayer = Math.hypot(enemy.x - player.x, enemy.y - player.y);
                if (currentDistToPlayer < 480) {
                    overrideSpeed = -1.5;
                } else {
                    overrideSpeed = 2.5;
                }
            }
            else if (this.activeTactic === 'SPLIT_FLANKS' || this.isAntiCharge) {
                // Flanqueo preventivo por carriles exteriores
                let side = (index % 2 === 0) ? 1 : -1;
                let flankDistance = 400 + (index * 20);
                slotX = player.x + Math.cos(player.angle + (Math.PI/2 * side)) * flankDistance;
                slotY = player.y + Math.sin(player.angle + (Math.PI/2 * side)) * flankDistance;
                overrideSpeed = 4.0;
            } 
            else if (totalEnemies >= 8) {
                // TRIPLE V (V central grande + 2 alas secundarias)
                let wingGroup = index % 3; // 0: Centro, 1: Ala Izquierda, 2: Ala Derecha
                let groupIndex = Math.floor(index / 3);
                
                let relX = 0, relY = 0;
                if (wingGroup === 0) {
                    // V central grande
                    relX = -groupIndex * 50 - 40;
                    relY = (groupIndex % 2 === 0 ? 1 : -1) * (groupIndex * 35 + 20);
                } else if (wingGroup === 1) {
                    // Ala Izquierda
                    relX = -groupIndex * 45 - 90;
                    relY = -70 - (groupIndex * 35);
                } else {
                    // Ala Derecha
                    relX = -groupIndex * 45 - 90;
                    relY = 70 + (groupIndex * 35);
                }
                slotX = this.leader.x + (relX * cosL - relY * sinL);
                slotY = this.leader.y + (relX * sinL + relY * cosL);
            } 
            else {
                let relX = 0, relY = 0;
                switch (this.activeTactic) {
                    case 'V_QUINTET':
                        let r = index % 5;
                        if (r === 1) { relX = -40; relY = -40; } else if (r === 2) { relX = -40; relY = 40; }
                        else if (r === 3) { relX = -80; relY = -80; } else if (r === 4) { relX = -80; relY = 80; }
                        break;
                    case 'SNAKE_COLUMN':
                        relX = -index * 45; relY = Math.sin(this.choreoPhaseAngle * 2 + index) * 25;
                        break;
                    case 'RING_FIVE':
                        let step = (Math.PI * 2 / 5) * index + this.choreoPhaseAngle;
                        relX = Math.cos(step) * 120; relY = Math.sin(step) * 120;
                        break;
                    case 'PINCER_SQUAD':
                        relX = -Math.floor(index / 2) * 50; relY = (index % 2 === 0 ? 1 : -1) * 90;
                        break;
                }
                slotX = this.leader.x + (relX * cosL - relY * sinL);
                slotY = this.leader.y + (relX * sinL + relY * cosL);
            }

            if (enemy.evadeTimer > 0) enemy.evadeTimer--;

            let pdx = player.x - enemy.x;
            if (pdx > this.mw / 2) pdx -= this.mw; else if (pdx < -this.mw / 2) pdx += this.mw;
            let pdy = player.y - enemy.y;
            if (pdy > this.mh / 2) pdy -= this.mh; else if (pdy < -this.mh / 2) pdy += this.mh;
            let pDistSqE = pdx * pdx + pdy * pdy;

            let indEvadeX = 0, indEvadeY = 0;

            // Esquiva individual de balas enemigas cercanas o disparos del jugador
            for (let i = 0; i < bullets.length; i++) {
                let b = bullets[i];
                let bdx = enemy.x - b.x;
                if (bdx > this.mw / 2) bdx -= this.mw; else if (bdx < -this.mw / 2) bdx += this.mw;
                let bdy = enemy.y - b.y;
                if (bdy > this.mh / 2) bdy -= this.mh; else if (bdy < -this.mh / 2) bdy += this.mh;
                
                if (bdx * bdx + bdy * bdy < 14400) { // Si una bala pasa a menos de 120px
                    indEvadeX += bdy * 0.1;
                    indEvadeY -= bdx * 0.1;
                    enemy.evadeTimer = 18;
                    break;
                }
            }

            if (pDistSqE < 3600 && !this.isAntiCharge && this.activeTactic !== 'SPLIT_FLANKS') {
                let pDistE = Math.sqrt(pDistSqE);
                indEvadeX = -(pdx / pDistE) * 3 - (pdy / pDistE) * 2;
                indEvadeY = -(pdy / pDistE) * 3 + (pdx / pDistE) * 2;
                enemy.evadeTimer = 15;
            } else if (indEvadeX === 0 && indEvadeY === 0) {
                for (let i = 0; i < asteroids.length; i++) {
                    let a = asteroids[i];
                    let adx = enemy.x - a.x;
                    if (adx > this.mw / 2) adx -= this.mw; else if (adx < -this.mw / 2) adx += this.mw;
                    let ady = enemy.y - a.y;
                    if (ady > this.mh / 2) ady -= this.mh; else if (ady < -this.mh / 2) ady += this.mh;
                    if (adx * adx + ady * ady < (a.radius + 40) * (a.radius + 40)) {
                        let aDist = Math.sqrt(adx * adx + ady * ady);
                        indEvadeX = (adx / aDist) * 3; indEvadeY = (ady / aDist) * 3;
                        enemy.evadeTimer = 20; break;
                    }
                }
            }

            let targetX = slotX, targetY = slotY;

            if (this.isHarassing && (index === 1 || index === 2)) {
                let side = index === 1 ? 1 : -1;
                targetX = player.x + Math.cos(player.angle + Math.PI/3 * side) * 150;
                targetY = player.y + Math.sin(player.angle + Math.PI/3 * side) * 150;
                overrideSpeed = 4.8 + (wave * 0.15);
                overrideTurn = 0.2;
            } 
            else if (phase === 'STRIKE' && index === 0 && this.activeTactic !== 'ANTI_TURRETS') {
                targetX = player.x; targetY = player.y;
            }

            let edx = targetX - enemy.x;
            if (edx > this.mw / 2) edx -= this.mw; else if (edx < -this.mw / 2) edx += this.mw;
            let edy = targetY - enemy.y;
            if (edy > this.mh / 2) edy -= this.mh; else if (edy < -this.mh / 2) edy += this.mh;

            if (enemy.evadeTimer > 0) {
                let eAngle = Math.atan2(indEvadeY, indEvadeX);
                let eDiff = eAngle - enemy.angle;
                enemy.angle += Math.atan2(Math.sin(eDiff), Math.cos(eDiff)) * 0.25; 
                enemy.speed = 4.2; 
            } else {
                let eAngle = (this.isAntiCharge || this.activeTactic === 'ANTI_TURRETS') ? Math.atan2(pdy, pdx) : Math.atan2(edy, edx);
                let eDiff = eAngle - enemy.angle;
                enemy.angle += Math.atan2(Math.sin(eDiff), Math.cos(eDiff)) * (overrideTurn || 0.12);
                
                let distToSlot = Math.hypot(edx, edy);
                let eTargetSpeed = overrideSpeed !== null ? overrideSpeed : (distToSlot > 30 ? Math.min(4.5, distToSlot * 0.1) : this.leader.speed);
                if (phase === 'STRIKE' && index === 0 && overrideSpeed === null) eTargetSpeed = 3.5 + (wave * 0.1);
                
                enemy.speed += (eTargetSpeed - enemy.speed) * 0.1;
            }

            enemy.x += Math.cos(enemy.angle) * enemy.speed;
            enemy.y += Math.sin(enemy.angle) * enemy.speed;
            this.wrap(enemy);

            if (enemy.cooldown > 0) enemy.cooldown--;
            let fireRange = (this.isAntiCharge || this.isHarassing) ? 450000 : 360000;
            
            if (pDistSqE < fireRange && enemy.cooldown === 0 && (phase === 'STRIKE' || index % 2 === 0 || this.isAntiCharge || this.isHarassing || this.activeTactic === 'ANTI_TURRETS')) {
                // Si están en modo anti-carga, saturan la trayectoria prevista de avance del jugador
                let aimX = pdx;
                let aimY = pdy;
                if (this.isAntiCharge) {
                    aimX += player.vx * 15;
                    aimY += player.vy * 15;
                }
                let shootAngle = Math.atan2(aimY, aimX) + (Math.random() - 0.5) * 0.15;
                enemyBullets.push(new Projectile(
                    enemy.x, enemy.y,
                    Math.cos(shootAngle) * 3.5, Math.sin(shootAngle) * 3.5,
                    shootAngle, 2, 150, false, enemy.sourceChoreo
                ));
                enemy.cooldown = this.isAntiCharge ? 30 : Math.max(45, 120 - (wave * 4));
            }
        }
    }
}