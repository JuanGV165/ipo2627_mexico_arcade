import { Projectile } from './Projectile.js';

export class SquadManager {
    constructor(mapWidth, mapHeight) {
        this.mw = mapWidth;
        this.mh = mapHeight;
        this.leader = { x: mapWidth - 200, y: 200, angle: 0, speed: 2.0 };
        this.tacticalMemory = {
            'DYNAMIC_V': 20, 'SNAKE_COLUMN': 10, 'PINCER_SQUAD': 10
        };
        this.currentChoreo = 'DYNAMIC_V';
        this.activeTactic = 'DYNAMIC_V';
        this.choreoTimer = 900; // Aumentado a 900 frames para que cada formación dure mucho más tiempo estable
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

    update(player, enemies, bullets, asteroids, enemyBullets, wave) {
        this.choreoTimer--;
        this.choreoPhaseAngle += 0.012; // Velocidad de fase más lenta para transiciones fluidas sin tirones
        if (this.choreoTimer <= 0) {
            this.currentChoreo = this.selectNextChoreo();
            this.choreoTimer = 850 + Math.random() * 200; // Duración generosa entre cambios de coreografía
        }

        const phase = (this.choreoTimer > 300) ? 'SETUP' : 'STRIKE';

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

        // IA TORPE EN LAS 5 PRIMERAS OLEADAS: Ignoran cargas frontales y hostigamiento lejano a propósito
        if (wave <= 5) {
            this.isAntiCharge = false;
            this.isHarassing = false;
        } else {
            this.isAntiCharge = (dotProductLeader > 0.65 && pSpeedSq > 3.0 && distToPlayer < 750);
            this.isHarassing = (distToPlayer > 650);
        }
        
        if (player.spinAccumulator > 0.05 && player.isShooting) {
            this.turretTimer++;
        } else {
            this.turretTimer = 0;
        }

        let isTurret = (wave > 5) && ((player.spinAccumulator > 0.08 && player.isShooting && pSpeedSq < 1.0) || (this.turretTimer > 90));
        let isStraightCharge = (wave > 5) && (pSpeedSq > 3.5 && player.isShooting && dotProductAim > 0.80);

        this.activeTactic = this.currentChoreo;
        if (isTurret) this.activeTactic = 'ANTI_TURRETS';
        else if (isStraightCharge || this.isAntiCharge) this.activeTactic = 'SPLIT_FLANKS';

        let groupEvadeX = 0, groupEvadeY = 0;
        for (let i = 0; i < bullets.length; i++) {
            let b = bullets[i];
            let bdx = this.leader.x - b.x;
            if (bdx > this.mw / 2) bdx -= this.mw; else if (bdx < -this.mw / 2) bdx += this.mw;
            let bdy = this.leader.y - b.y;
            if (bdy > this.mh / 2) bdy -= this.mh; else if (bdy < -this.mh / 2) bdy += this.mh;
            
            if (bdx * bdx + bdy * bdy < 22500) {
                groupEvadeX += bdy * 0.03; groupEvadeY -= bdx * 0.03; // Evasión de líder más suave
            }
        }

        let targetAngle = Math.atan2(dy, dx);
        if (this.isAntiCharge) {
            targetAngle += Math.PI / 1.5; 
            this.leader.speed += (1.5 - this.leader.speed) * 0.05; 
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
        this.leader.angle += diffAngle * 0.025; // Giro de líder muy suave y cinematográfico

        if (!this.isAntiCharge) {
            this.leader.speed += ((phase === 'SETUP' ? 1.8 : 2.5 + (wave * 0.05)) - this.leader.speed) * 0.05;
        }
        this.leader.speed = Math.max(2.0, this.leader.speed); 

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
            let overrideTurn = 0.035; // Giro general más suave y amplio para evitar movimientos erráticos

            if (this.activeTactic === 'ANTI_TURRETS') {
                let safeRadius = 500;
                let step = (Math.PI * 2) / Math.max(1, totalEnemies);
                let orbitAngle = (step * index) + (this.choreoPhaseAngle * 0.3);
                slotX = player.x + Math.cos(orbitAngle) * safeRadius;
                slotY = player.y + Math.sin(orbitAngle) * safeRadius;
                
                let currentDistToPlayer = Math.hypot(enemy.x - player.x, enemy.y - player.y);
                if (currentDistToPlayer < 480) {
                    overrideSpeed = 2.0;
                    let outwardAngle = Math.atan2(enemy.y - player.y, enemy.x - player.x);
                    slotX = enemy.x + Math.cos(outwardAngle) * 200;
                    slotY = enemy.y + Math.sin(outwardAngle) * 200;
                } else {
                    overrideSpeed = 3.0;
                }
            } 
            else if (this.activeTactic === 'SPLIT_FLANKS') {
                let side = (index % 2 === 0) ? 1 : -1;
                let flankDistance = 350 + (Math.floor(index/2) * 40);
                slotX = player.x + Math.cos(player.angle + (Math.PI/2 * side)) * flankDistance + Math.cos(player.angle)*150;
                slotY = player.y + Math.sin(player.angle + (Math.PI/2 * side)) * flankDistance + Math.sin(player.angle)*150;
                overrideSpeed = 3.5 + (wave * 0.1);
                overrideTurn = 0.04; 
            } 
            else {
                let relX = 0, relY = 0;
                
                if (this.activeTactic === 'SNAKE_COLUMN') {
                    relX = -index * 24; 
                    relY = Math.sin(this.choreoPhaseAngle * 3.0 - index * 0.4) * 45;
                } 
                else if (this.activeTactic === 'PINCER_SQUAD') {
                    let side = (index % 2 === 0) ? 1 : -1;
                    let row = Math.floor(index / 2);
                    relX = -row * 50; 
                    relY = side * (130 - Math.min(row, 2) * 25);
                } 
                else {
                    let groupIndex = Math.floor(index / 3); 
                    let posInV = index % 3; 
                    let baseX = 0, baseY = 0;
                    
                    if (groupIndex === 1) { baseX = -90; baseY = -110; } 
                    else if (groupIndex === 2) { baseX = -90; baseY = 110; } 
                    else if (groupIndex === 3) { baseX = -180; baseY = 0; } 
                    else if (groupIndex > 3) { 
                        baseX = -180 - Math.floor((groupIndex-4)/2) * 90; 
                        baseY = (groupIndex % 2 === 0 ? 1 : -1) * (110 + Math.floor((groupIndex-4)/2)*110); 
                    }
                    
                    let localX = 0, localY = 0;
                    if (posInV === 1) { localX = -45; localY = -45; }
                    else if (posInV === 2) { localX = -45; localY = 45; }
                    
                    relX = baseX + localX;
                    relY = baseY + localY;
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

            // En las 5 primeras oleadas no esquivan balas para dar ventaja al jugador
            if (wave > 5) {
                for (let i = 0; i < bullets.length; i++) {
                    let b = bullets[i];
                    let bdx = enemy.x - b.x;
                    if (bdx > this.mw / 2) bdx -= this.mw; else if (bdx < -this.mw / 2) bdx += this.mw;
                    let bdy = enemy.y - b.y;
                    if (bdy > this.mh / 2) bdy -= this.mh; else if (bdy < -this.mh / 2) bdy += this.mh;
                    
                    if (bdx * bdx + bdy * bdy < 14400) { 
                        indEvadeX += bdy * 0.08;
                        indEvadeY -= bdx * 0.08;
                        enemy.evadeTimer = 15;
                        break;
                    }
                }
            }

            if (wave > 5 && pDistSqE < 3600 && !this.isAntiCharge && this.activeTactic !== 'SPLIT_FLANKS') {
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

            // En las 5 primeras oleadas no hacen hostigamiento individual agresivo
            if (wave > 5 && this.isHarassing && (index === 1 || index === 2)) {
                let side = index === 1 ? 1 : -1;
                targetX = player.x + Math.cos(player.angle + Math.PI/3 * side) * 150;
                targetY = player.y + Math.sin(player.angle + Math.PI/3 * side) * 150;
                overrideSpeed = 4.5 + (wave * 0.1);
                overrideTurn = 0.04; 
            } 
            else if (phase === 'STRIKE' && index === 0 && this.activeTactic !== 'ANTI_TURRETS') {
                targetX = player.x; targetY = player.y;
                overrideTurn = wave <= 5 ? 0.03 : 0.05; // En las primeras 5 oleadas atacan bajando de forma muy torpe y lenta
            }

            let edx = targetX - enemy.x;
            if (edx > this.mw / 2) edx -= this.mw; else if (edx < -this.mw / 2) edx += this.mw;
            let edy = targetY - enemy.y;
            if (edy > this.mh / 2) edy -= this.mh; else if (edy < -this.mh / 2) edy += this.mh;

            if (enemy.evadeTimer > 0) {
                let eAngle = Math.atan2(indEvadeY, indEvadeX);
                let eDiff = eAngle - enemy.angle;
                enemy.angle += Math.atan2(Math.sin(eDiff), Math.cos(eDiff)) * 0.06; 
                enemy.speed = 3.8; 
            } else {
                let distToSlot = Math.hypot(edx, edy);
                let eAngle = Math.atan2(edy, edx); 

                if (distToSlot < 30 && this.activeTactic !== 'ANTI_TURRETS' && this.activeTactic !== 'SPLIT_FLANKS') {
                    eAngle = this.leader.angle; // Transición muy fluida al unirse a la formación
                }

                let eDiff = eAngle - enemy.angle;
                enemy.angle += Math.atan2(Math.sin(eDiff), Math.cos(eDiff)) * overrideTurn;
                
                let eTargetSpeed = overrideSpeed !== null ? overrideSpeed : (distToSlot > 30 ? Math.min(4.0, distToSlot * 0.08) : this.leader.speed);
                if (phase === 'STRIKE' && index === 0 && overrideSpeed === null) eTargetSpeed = wave <= 5 ? 2.5 : 3.2 + (wave * 0.1);
                
                eTargetSpeed = Math.max(2.0, eTargetSpeed);
                enemy.speed += (eTargetSpeed - enemy.speed) * 0.04; // Inercia ultra suave
            }

            enemy.x += Math.cos(enemy.angle) * enemy.speed;
            enemy.y += Math.sin(enemy.angle) * enemy.speed;
            this.wrap(enemy);

            if (enemy.cooldown > 0) enemy.cooldown--;
            
            let fireRange = (this.isAntiCharge || this.isHarassing) ? 450000 : 360000;
            let angleToPlayer = Math.atan2(pdy, pdx);
            let aimDiff = Math.abs(Math.atan2(Math.sin(angleToPlayer - enemy.angle), Math.cos(angleToPlayer - enemy.angle)));
            
            // IA TORPE: En las 5 primeras oleadas apenas disparan y tienen mucha tolerancia de puntería (fallan a posta)
            let maxAimDiff = wave <= 5 ? 0.2 : 0.5; 
            let fireChance = wave <= 5 ? 0.3 : 1.0;

            if (pDistSqE < fireRange && enemy.cooldown === 0 && aimDiff < maxAimDiff && Math.random() < fireChance &&
                (phase === 'STRIKE' || index % 2 === 0 || this.isAntiCharge || this.isHarassing || this.activeTactic === 'ANTI_TURRETS')) {
                
                let aimX = pdx;
                let aimY = pdy;
                if (this.isAntiCharge || this.activeTactic === 'SPLIT_FLANKS') {
                    aimX += player.vx * 15;
                    aimY += player.vy * 15;
                }
                // Desviación extra en las primeras 5 oleadas para que sus disparos sean inofensivos
                let spread = wave <= 5 ? 0.4 : 0.15;
                let shootAngle = Math.atan2(aimY, aimX) + (Math.random() - 0.5) * spread;
                
                enemyBullets.push(new Projectile(
                    enemy.x, enemy.y,
                    Math.cos(shootAngle) * 3.5, Math.sin(shootAngle) * 3.5, 
                    shootAngle, 2, 150, false, this.currentChoreo
                ));
                // Cadencia de disparo mucho más lenta en las primeras 5 oleadas
                enemy.cooldown = wave <= 5 ? 180 : (this.isAntiCharge ? 30 : Math.max(45, 120 - (wave * 4)));
            }
        }
    }
}