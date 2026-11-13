import { Projectile } from './Projectile.js';

export class SquadManager {
    constructor(mapWidth, mapHeight) {
        this.mw = mapWidth;
        this.mh = mapHeight;
        this.speedMultiplier = 1;
        this.leader = { x: mapWidth - 200, y: 200, angle: 0, speed: 2.0 };
        this.tacticalMemory = {
            'DYNAMIC_V': 20, 'SNAKE_COLUMN': 10, 'PINCER_SQUAD': 10
        };
        this.currentChoreo = 'DYNAMIC_V';
        this.activeTactic = 'DYNAMIC_V';
        this.choreoTimer = 900; 
        this.choreoPhaseAngle = 0;
        
        this.isAntiCharge = false;
        this.isHarassing = false;
        this.turretTimer = 0; 
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
        return 'DYNAMIC_V';
    }

    update(player, enemies, bullets, asteroids, enemyBullets, wave, forcedTactic = null) {
        this.choreoTimer--;
        this.choreoPhaseAngle += 0.012; 
        if (this.choreoTimer <= 0) {
            this.currentChoreo = this.selectNextChoreo();
            this.choreoTimer = 850 + Math.random() * 200; 
        }

        const phase = (this.choreoTimer > 300) ? 'SETUP' : 'STRIKE';
        const isGhost = player.isGhost === true; 

        let dx = player.x - this.leader.x;
        if (dx > this.mw / 2) dx -= this.mw; else if (dx < -this.mw / 2) dx += this.mw;
        let dy = player.y - this.leader.y;
        if (dy > this.mh / 2) dy -= this.mh; else if (dy < -this.mh / 2) dy += this.mh;
        let distToPlayer = Math.hypot(dx, dy);

        let pSpeedSq = player.vx * player.vx + player.vy * player.vy;
        let pVelNormX = player.vx / (Math.sqrt(pSpeedSq) || 1);
        let pVelNormY = player.vy / (Math.sqrt(pSpeedSq) || 1);
        let pDirX = Math.cos(player.angle);
        let pDirY = Math.sin(player.angle);
        
        let toLeaderNormX = -dx / distToPlayer; 
        let toLeaderNormY = -dy / distToPlayer;
        
        let dotProductAim = (pVelNormX * pDirX) + (pVelNormY * pDirY);
        let dotProductLeader = (pVelNormX * toLeaderNormX) + (pVelNormY * toLeaderNormY);

        if (forcedTactic) {
            this.isAntiCharge = false;
            this.isHarassing = false;
        } else {
            if (wave <= 5 || isGhost) {
                this.isAntiCharge = false;
                this.isHarassing = false;
            } else {
                this.isAntiCharge = (dotProductLeader > 0.65 && pSpeedSq > 3.0 && distToPlayer < 750);
                this.isHarassing = (distToPlayer > 650);
            }
        }
        
        if (player.spinAccumulator > 0.05 && player.isShooting && !isGhost) {
            this.turretTimer++;
        } else {
            this.turretTimer = 0;
        }

        let isTurret = (!forcedTactic && wave > 5 && !isGhost) && ((player.spinAccumulator > 0.08 && player.isShooting && pSpeedSq < 1.0) || (this.turretTimer > 90));
        let isStraightCharge = (!forcedTactic && wave > 5 && !isGhost) && (pSpeedSq > 3.5 && player.isShooting && dotProductAim > 0.80);

        this.activeTactic = forcedTactic ? forcedTactic : this.currentChoreo;
        if (!forcedTactic) {
            if (isTurret) this.activeTactic = 'ANTI_TURRETS';
            else if (isStraightCharge && this.activeTactic === 'V_QUINTET') this.activeTactic = 'DUAL_SNAKE';
            else if (isStraightCharge || this.isAntiCharge) this.activeTactic = 'SPLIT_FLANKS';
        }

        let groupEvadeX = 0, groupEvadeY = 0;
        
        for (let i = 0; i < bullets.length; i++) {
            let b = bullets[i];
            let bdx = this.leader.x - b.x;
            if (bdx > this.mw / 2) bdx -= this.mw; else if (bdx < -this.mw / 2) bdx += this.mw;
            let bdy = this.leader.y - b.y;
            if (bdy > this.mh / 2) bdy -= this.mh; else if (bdy < -this.mh / 2) bdy += this.mh;
            if (bdx * bdx + bdy * bdy < 22500) {
                groupEvadeX += bdy * 0.03; groupEvadeY -= bdx * 0.03; 
            }
        }
        
        for (let i = 0; i < asteroids.length; i++) {
            let a = asteroids[i];
            let adx = this.leader.x - a.x;
            if (adx > this.mw / 2) adx -= this.mw; else if (adx < -this.mw / 2) adx += this.mw;
            let ady = this.leader.y - a.y;
            if (ady > this.mh / 2) ady -= this.mh; else if (ady < -this.mh / 2) ady += this.mh;
            if (adx * adx + ady * ady < 60000) {
                groupEvadeX += ady * 0.02; groupEvadeY -= adx * 0.02; 
            }
        }

        let targetAngle = Math.atan2(dy, dx);
        if (this.isAntiCharge) {
            targetAngle += Math.PI / 1.5; 
            this.leader.speed += (1.5 * this.speedMultiplier - this.leader.speed) * 0.05;
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
        this.leader.angle += diffAngle * 0.025; 

        if (!this.isAntiCharge) {
            const targetLeaderSpeed = (phase === 'SETUP' ? 1.8 : 2.5 + (wave * 0.05)) * this.speedMultiplier;
            this.leader.speed += (targetLeaderSpeed - this.leader.speed) * 0.05;
        }
        this.leader.speed = Math.max(2.0 * this.speedMultiplier, this.leader.speed);

        this.leader.x += Math.cos(this.leader.angle) * this.leader.speed;
        this.leader.y += Math.sin(this.leader.angle) * this.leader.speed;
        this.wrap(this.leader);

        const cosL = Math.cos(this.leader.angle);
        const sinL = Math.sin(this.leader.angle);
        const totalEnemies = enemies.length;

        for (let index = 0; index < totalEnemies; index++) {
            let enemy = enemies[index];
            if (enemy.invulnerableTimer > 0) enemy.invulnerableTimer--;

            let slotX, slotY;
            let overrideSpeed = null;
            let overrideTurn = 0.05; 

            if (this.activeTactic === 'ANTI_TURRETS') {
                let safeRadius = 500;
                let step = (Math.PI * 2) / Math.max(1, totalEnemies);
                let orbitAngle = (step * index) + (this.choreoPhaseAngle * 0.3);
                slotX = player.x + Math.cos(orbitAngle) * safeRadius;
                slotY = player.y + Math.sin(orbitAngle) * safeRadius;
            } 
            else if (this.activeTactic === 'SPLIT_FLANKS') {
                let side = (index % 2 === 0) ? 1 : -1;
                let flankDistance = 350 + (Math.floor(index/2) * 40);
                slotX = player.x + Math.cos(player.angle + (Math.PI/2 * side)) * flankDistance + Math.cos(player.angle)*150;
                slotY = player.y + Math.sin(player.angle + (Math.PI/2 * side)) * flankDistance + Math.sin(player.angle)*150;
                overrideSpeed = 3.5 + (wave * 0.1);
            } 
            else if (this.activeTactic === 'DUAL_SNAKE') {
                let side = (index % 2 === 0) ? 1 : -1;
                let row = Math.floor(index / 2);
                let relX = -row * 35;
                let relY = side * 120 + Math.sin(this.choreoPhaseAngle * 4 - row * 0.5) * 20;
                slotX = this.leader.x + (relX * cosL - relY * sinL);
                slotY = this.leader.y + (relX * sinL + relY * cosL);
            }
            else {
                let relX = 0, relY = 0;
                
                if (this.activeTactic === 'SNAKE_COLUMN') {
                    relX = -index * 30; 
                    relY = Math.sin(this.choreoPhaseAngle * 3.0 - index * 0.4) * 45;
                } 
                else if (this.activeTactic === 'PINCER_SQUAD') {
                    let side = (index % 2 === 0) ? 1 : -1;
                    let row = Math.floor(index / 2);
                    let pincerAngle = player.angle + (Math.PI/2 * side);
                    slotX = player.x + Math.cos(pincerAngle) * (200 + row*40) + Math.cos(player.angle) * (150 - row*60);
                    slotY = player.y + Math.sin(pincerAngle) * (200 + row*40) + Math.sin(player.angle) * (150 - row*60);
                    overrideSpeed = 4.0;
                    overrideTurn = 0.08; 
                } 
                else if (this.activeTactic === 'V_QUINTET') {
                    let spacingX = 40; 
                    let spacingY = 35; 
                    if (index === 0) { relX = 0; relY = 0; }
                    else {
                        let row = Math.ceil(index / 2);
                        let side = index % 2 === 0 ? 1 : -1;
                        relX = -row * spacingX;
                        relY = side * row * spacingY;
                    }
                }
                else if (this.activeTactic === 'RING_FIVE') {
                    let step = (Math.PI * 2 / Math.max(1, totalEnemies)) * index + this.choreoPhaseAngle;
                    slotX = player.x + Math.cos(step) * 250;
                    slotY = player.y + Math.sin(step) * 250;
                    overrideSpeed = 3.5;
                }
                else { // DYNAMIC_V
                    let groupIndex = Math.floor(index / 3); 
                    let posInV = index % 3; 
                    let baseX = 0, baseY = 0;
                    
                    if (groupIndex === 1) { baseX = -80; baseY = -100; } 
                    else if (groupIndex === 2) { baseX = -80; baseY = 100; } 
                    else if (groupIndex === 3) { baseX = -160; baseY = 0; } 
                    else if (groupIndex > 3) { 
                        baseX = -160 - Math.floor((groupIndex-4)/2) * 80; 
                        baseY = (groupIndex % 2 === 0 ? 1 : -1) * (100 + Math.floor((groupIndex-4)/2)*100); 
                    }
                    
                    let localX = 0, localY = 0;
                    if (posInV === 1) { localX = -35; localY = -35; }
                    if (posInV === 2) { localX = -35; localY = 35; }
                    
                    relX = baseX + localX;
                    relY = baseY + localY;
                }
                
                if (this.activeTactic !== 'PINCER_SQUAD' && this.activeTactic !== 'RING_FIVE' && this.activeTactic !== 'ANTI_TURRETS' && this.activeTactic !== 'SPLIT_FLANKS') {
                    slotX = this.leader.x + (relX * cosL - relY * sinL);
                    slotY = this.leader.y + (relX * sinL + relY * cosL);
                }
            }

            if (enemy.evadeTimer > 0) enemy.evadeTimer--;

            // --- RADAR DE EVASIÓN INDIVIDUAL DE ROCAS ---
            let rockEvadeX = 0, rockEvadeY = 0;
            for (let i = 0; i < asteroids.length; i++) {
                let a = asteroids[i];
                let adx = enemy.x - a.x;
                if (adx > this.mw / 2) adx -= this.mw; else if (adx < -this.mw / 2) adx += this.mw;
                let ady = enemy.y - a.y;
                if (ady > this.mh / 2) ady -= this.mh; else if (ady < -this.mh / 2) ady += this.mh;
                let distSq = adx * adx + ady * ady;
                if (distSq < 25000) { // Si una roca está a menos de ~150px
                    rockEvadeX += ady * 0.1; 
                    rockEvadeY -= adx * 0.1;
                    enemy.evadeTimer = 20; // Se apartan temporalmente
                }
            }

            let pdx = player.x - enemy.x;
            if (pdx > this.mw / 2) pdx -= this.mw; else if (pdx < -this.mw / 2) pdx += this.mw;
            let pdy = player.y - enemy.y;
            if (pdy > this.mh / 2) pdy -= this.mh; else if (pdy < -this.mh / 2) pdy += this.mh;
            let pDistSqE = pdx * pdx + pdy * pdy;

            let targetX = slotX, targetY = slotY;
            let edx = targetX - enemy.x;
            if (edx > this.mw / 2) edx -= this.mw; else if (edx < -this.mw / 2) edx += this.mw;
            let edy = targetY - enemy.y;
            if (edy > this.mh / 2) edy -= this.mh; else if (edy < -this.mh / 2) edy += this.mh;

            let isRigidFormation = (this.activeTactic === 'V_QUINTET' || this.activeTactic === 'DYNAMIC_V' || this.activeTactic === 'SNAKE_COLUMN' || this.activeTactic === 'DUAL_SNAKE');

            if (enemy.evadeTimer > 0) {
                // Si están esquivando una roca, priorizan el desvío y luego vuelven a su ranura
                let eAngle = Math.atan2(edy + rockEvadeY, edx + rockEvadeX);
                let eDiff = eAngle - enemy.angle;
                enemy.angle += Math.atan2(Math.sin(eDiff), Math.cos(eDiff)) * 0.1; 
                enemy.speed = 3.5 * this.speedMultiplier;
            } else {
                let distToSlot = Math.hypot(edx, edy);
                let eAngle = Math.atan2(edy, edx); 
                
                // Anclaje rígido pero con inercia muy suave (cero trompos)
                if (isRigidFormation && distToSlot < 35) {
                    enemy.angle += (this.leader.angle - enemy.angle) * 0.1; // Se alinean progresivamente con el líder
                    enemy.speed = this.leader.speed;
                    enemy.x += edx * 0.2; 
                    enemy.y += edy * 0.2;
                } else {
                    let eDiff = eAngle - enemy.angle;
                    enemy.angle += Math.atan2(Math.sin(eDiff), Math.cos(eDiff)) * overrideTurn;
                    
                    let eTargetSpeed = overrideSpeed !== null ? overrideSpeed : this.leader.speed;
                    
                    if (phase === 'STRIKE' && index === 0 && overrideSpeed === null) {
                        eTargetSpeed = (!forcedTactic && wave <= 5) ? 2.5 : 3.2 + (wave * 0.1);
                    } else if (isRigidFormation && overrideSpeed === null) {
                        eTargetSpeed = this.leader.speed + Math.min(3.5, distToSlot * 0.08); 
                    }
                    
                    eTargetSpeed *= this.speedMultiplier;
                    eTargetSpeed = Math.max(1.0 * this.speedMultiplier, eTargetSpeed);
                    // Inercia suave (0.12) para evitar balanceos bruscos
                    enemy.speed += (eTargetSpeed - enemy.speed) * 0.12; 
                }
            }

            enemy.x += Math.cos(enemy.angle) * enemy.speed;
            enemy.y += Math.sin(enemy.angle) * enemy.speed;
            this.wrap(enemy);

            if (enemy.cooldown > 0) enemy.cooldown--;
            
            // --- ESTRATEGIAS DE DISPARO ---
            let shouldFire = false;
            let shootAngle = enemy.angle; 
            let spread = 0.05;

            // 1. CORTINA DE FUEGO (V Formations)
            if (this.activeTactic === 'V_QUINTET' || this.activeTactic === 'DYNAMIC_V') {
                shootAngle = this.leader.angle;
                spread = 0.05;
                let angleToP = Math.atan2(pdy, pdx);
                let diffToLeader = Math.abs(Math.atan2(Math.sin(angleToP - this.leader.angle), Math.cos(angleToP - this.leader.angle)));
                
                if (enemy.cooldown <= 0 && (diffToLeader < 1.2 || isGhost)) {
                    shouldFire = true;
                    enemy.cooldown = 70 + (Math.random() * 10); 
                }
            } 
            // 2. ANDANADA LATERAL (SNAKE_COLUMN) - EXACTAMENTE A 60 GRADOS
            else if (this.activeTactic === 'SNAKE_COLUMN' || this.activeTactic === 'DUAL_SNAKE') {
                let angleToP = Math.atan2(pdy, pdx);
                let diff = Math.atan2(Math.sin(angleToP - enemy.angle), Math.cos(angleToP - enemy.angle));
                
                shootAngle = enemy.angle + (diff > 0 ? Math.PI / 3 : -Math.PI / 3);
                spread = 0.15;
                
                if (enemy.cooldown <= 0 && (Math.abs(diff) > 0.3 || isGhost)) {
                    shouldFire = true;
                    enemy.cooldown = 40 + (index * 8); 
                }
            }
            // 3. FUEGO CRUZADO (PINCER, RING, ANTI_TURRETS)
            else {
                shootAngle = Math.atan2(pdy, pdx);
                spread = 0.15;
                if (enemy.cooldown <= 0) {
                    shouldFire = true;
                    enemy.cooldown = Math.max(30, 90 - (wave * 3));
                }
            }

            if (shouldFire && pDistSqE < 600000) {
                shootAngle += (Math.random() - 0.5) * spread;
                enemyBullets.push(new Projectile(
                    enemy.x, enemy.y,
                    Math.cos(shootAngle) * 3.5, Math.sin(shootAngle) * 3.5, 
                    shootAngle, 2, 150, false, this.currentChoreo
                ));
            }
        }
    }
}