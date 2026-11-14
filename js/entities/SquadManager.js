import { Projectile } from './Projectile.js';

export class SquadManager {
    constructor(mapWidth, mapHeight) {
        this.mw = mapWidth;
        this.mh = mapHeight;
        this.speedMultiplier = 1;
        this.leader = { x: mapWidth - 200, y: 200, angle: 0, speed: 2.0 };
        this.subLeaders = []; 
        
        this.tacticalMemory = {
            'DYNAMIC_V': 20, 'SNAKE_COLUMN': 10, 'PINCER_SQUAD': 10, 'RING_FIVE': 10
        };
        this.currentChoreo = 'DYNAMIC_V';
        this.activeTactic = 'DYNAMIC_V';
        this.prevTactic = 'DYNAMIC_V';
        this.transitionTimer = 0; 
        
        this.choreoTimer = 900; 
        this.choreoPhaseAngle = 0;
        
        this.isAntiCharge = false;
        this.turretTimer = 0;
        this.circleMoveTimer = 0;
        this.antiTurretHold = 0;
        this.lastPlayerAngle = null;
        this.lastTurnDir = 0;
        this.pathHistory = []; 
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
        this.pathHistory.unshift({ x: this.leader.x, y: this.leader.y, angle: this.leader.angle });
        if (this.pathHistory.length > 300) this.pathHistory.pop();

        this.choreoTimer--;
        this.choreoPhaseAngle += 0.012; 
        if (this.choreoTimer <= 0) {
            this.currentChoreo = this.selectNextChoreo();
            this.choreoTimer = 850 + Math.random() * 200; 
        }

        const phase = (this.choreoTimer > 300) ? 'SETUP' : 'STRIKE';
        const isGhost = player.isGhost === true; 
        const isSandbox = (forcedTactic !== null);
        const totalEnemies = enemies.length;

        let dx = player.x - this.leader.x;
        if (dx > this.mw / 2) dx -= this.mw; else if (dx < -this.mw / 2) dx += this.mw;
        let dy = player.y - this.leader.y;
        if (dy > this.mh / 2) dy -= this.mh; else if (dy < -this.mh / 2) dy += this.mh;
        let distToPlayer = Math.hypot(dx, dy);

        let pSpeedSq = player.vx * player.vx + player.vy * player.vy;
        let pVelNormX = player.vx / (Math.sqrt(pSpeedSq) || 1);
        let pVelNormY = player.vy / (Math.sqrt(pSpeedSq) || 1);
        
        let toLeaderNormX = -dx / distToPlayer; 
        let toLeaderNormY = -dy / distToPlayer;
        let dotProductLeader = (pVelNormX * toLeaderNormX) + (pVelNormY * toLeaderNormY);

        if (isSandbox || totalEnemies === 1) {
            this.isAntiCharge = false;
        } else {
            if (wave < 4 || isGhost) {
                this.isAntiCharge = false;
            } else {
                this.isAntiCharge = (dotProductLeader > 0.65 && pSpeedSq > 2.5 && distToPlayer < 700);
            }
        }
        
        // Detección de patrón torreta (girar sobre sí mismo) y giro continuo en círculo (avance + giro lateral)
        let dAngle = 0;
        if (this.lastPlayerAngle !== null && !isGhost) {
            dAngle = Math.atan2(Math.sin(player.angle - this.lastPlayerAngle), Math.cos(player.angle - this.lastPlayerAngle));
        }
        this.lastPlayerAngle = player.angle;

        const absDAngle = Math.abs(dAngle);
        const turnDir = absDAngle > 0.015 ? Math.sign(dAngle) : 0;

        if (!isGhost && totalEnemies > 1) {
            // 1. Giro sobre sí mismo (con o sin disparo)
            if ((player.spinAccumulator > 0.045 || absDAngle > 0.035) && pSpeedSq < 2.2) {
                this.turretTimer += player.isShooting ? 1.6 : 1.1;
            } else {
                this.turretTimer = Math.max(0, this.turretTimer - 1.5);
            }

            // 2. Movimiento en círculo manteniendo avance + giro lateral durante > ~2.5 segundos (150 frames)
            const holdingForwardAndTurn = (player.isThrustingInput && player.isTurningInput && turnDir !== 0) ||
                                          (turnDir !== 0 && absDAngle > 0.02 && pSpeedSq > 1.2);
            if (holdingForwardAndTurn && (this.lastTurnDir === 0 || turnDir === this.lastTurnDir)) {
                this.circleMoveTimer++;
                this.lastTurnDir = turnDir;
            } else {
                this.circleMoveTimer = Math.max(0, this.circleMoveTimer - 2);
                if (this.circleMoveTimer === 0) this.lastTurnDir = 0;
            }
        } else {
            this.turretTimer = 0;
            this.circleMoveTimer = 0;
            this.lastTurnDir = 0;
        }

        const detectedTurretOrCircle = (!isSandbox && wave >= 2 && !isGhost && totalEnemies > 1) &&
            ((player.spinAccumulator > 0.075 && player.isShooting && pSpeedSq < 1.2) ||
             this.turretTimer > 85 ||
             this.circleMoveTimer > 150);

        if (detectedTurretOrCircle) {
            this.antiTurretHold = Math.max(this.antiTurretHold, 150);
        } else if (this.antiTurretHold > 0) {
            this.antiTurretHold--;
        }

        let isTurret = (!isSandbox && wave >= 2 && !isGhost && totalEnemies > 1) &&
            (detectedTurretOrCircle || this.antiTurretHold > 0);

        // Prioridad táctica: ANTI_TURRETS prevalece sobre choreo estándar y anti-charge
        let newTactic = isSandbox ? forcedTactic : this.currentChoreo;
        if (!isSandbox) {
            if (isTurret) newTactic = 'ANTI_TURRETS';
            else if (this.isAntiCharge) newTactic = 'PINCER_SQUAD';
        }

        if (this.activeTactic !== newTactic) {
            this.transitionTimer = 90; 
            this.prevTactic = this.activeTactic;
            this.activeTactic = newTactic;
        }
        if (this.transitionTimer > 0) this.transitionTimer--;

        let groupEvadeX = 0, groupEvadeY = 0;
        for (let i = 0; i < asteroids.length; i++) {
            let a = asteroids[i];
            let adx = this.leader.x - a.x;
            if (adx > this.mw / 2) adx -= this.mw; else if (adx < -this.mw / 2) adx += this.mw;
            let ady = this.leader.y - a.y;
            if (ady > this.mh / 2) ady -= this.mh; else if (ady < -this.mh / 2) ady += this.mh;
            let distSq = adx*adx + ady*ady;
            if (distSq < 250000) { 
                let dist = Math.sqrt(distSq);
                let push = (1 - (dist / 500)) * 6;
                groupEvadeX += (adx/dist) * push; 
                groupEvadeY += (ady/dist) * push; 
            }
        }

        let targetAngle = Math.atan2(dy, dx);
        if (this.isAntiCharge && !isTurret) {
            targetAngle += Math.PI; 
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
        let maxLeaderTurn = (this.activeTactic === 'SNAKE_COLUMN' || this.activeTactic === 'DUAL_SNAKE') ? 0.012 : 0.025;
        this.leader.angle += Math.max(-maxLeaderTurn, Math.min(maxLeaderTurn, diffAngle));

        if (!this.isAntiCharge || isTurret) {
            const targetLeaderSpeed = (phase === 'SETUP' ? 1.8 : 2.5 + (wave * 0.05)) * this.speedMultiplier;
            this.leader.speed += (targetLeaderSpeed - this.leader.speed) * 0.05;
        }
        this.leader.speed = Math.max(2.0 * this.speedMultiplier, this.leader.speed);

        this.leader.x += Math.cos(this.leader.angle) * this.leader.speed;
        this.leader.y += Math.sin(this.leader.angle) * this.leader.speed;
        this.wrap(this.leader);

        const cosL = Math.cos(this.leader.angle);
        const sinL = Math.sin(this.leader.angle);

        let isV = (this.activeTactic === 'V_QUINTET' || this.activeTactic === 'DYNAMIC_V');
        let groupSize = this.activeTactic === 'V_QUINTET' ? 5 : 3;
        let numGroups = Math.ceil(totalEnemies / groupSize);

        if (isV) {
            for (let g = 1; g < numGroups; g++) {
                if (!this.subLeaders[g]) {
                    this.subLeaders[g] = { 
                        x: this.leader.x + (Math.random()-0.5)*200, 
                        y: this.leader.y + (Math.random()-0.5)*200, 
                        angle: this.leader.angle, speed: this.leader.speed 
                    };
                }
                let sl = this.subLeaders[g];
                let pdx = player.x - sl.x; if (pdx > this.mw/2) pdx -= this.mw; else if (pdx < -this.mw/2) pdx += this.mw;
                let pdy = player.y - sl.y; if (pdy > this.mh/2) pdy -= this.mh; else if (pdy < -this.mh/2) pdy += this.mh;
                let pDist = Math.hypot(pdx, pdy);
                
                let slEvadeX = 0, slEvadeY = 0;
                for (let a of asteroids) {
                    let adx = sl.x - a.x; if (adx > this.mw/2) adx -= this.mw; else if (adx < -this.mw/2) adx += this.mw;
                    let ady = sl.y - a.y; if (ady > this.mh/2) ady -= this.mh; else if (ady < -this.mh/2) ady += this.mh;
                    let distSq = adx*adx + ady*ady;
                    if (distSq < 360000) { 
                        let dist = Math.sqrt(distSq);
                        let push = (1 - (dist / 600)) * 12;
                        slEvadeX += (adx/dist) * push; 
                        slEvadeY += (ady/dist) * push; 
                    }
                }

                let slTargetAngle = Math.atan2(pdy, pdx); 
                let side = (g % 2 !== 0) ? 1 : -1;
                if (pDist > 300) slTargetAngle += 0.8 * side; 
                slTargetAngle = Math.atan2(Math.sin(slTargetAngle) + slEvadeY, Math.cos(slTargetAngle) + slEvadeX);

                let slDiff = slTargetAngle - sl.angle;
                slDiff = Math.atan2(Math.sin(slDiff), Math.cos(slDiff));
                sl.angle += Math.max(-0.035, Math.min(0.035, slDiff)); 
                
                let tSpeed = (pDist < 250) ? 2.0 : (3.0 + wave * 0.05);
                sl.speed += (tSpeed * this.speedMultiplier - sl.speed) * 0.1;
                sl.x += Math.cos(sl.angle) * sl.speed;
                sl.y += Math.sin(sl.angle) * sl.speed;
                this.wrap(sl);
            }
        }

        for (let index = 0; index < totalEnemies; index++) {
            let enemy = enemies[index];
            if (enemy.invulnerableTimer > 0) enemy.invulnerableTimer--;

            let groupIdx = Math.floor(index / groupSize);
            let localIdx = index % groupSize;
            let isTail = false; 
            let shipsInLastGroup = totalEnemies % groupSize;
            
            if (isV && groupIdx === Math.floor(totalEnemies / groupSize) && shipsInLastGroup > 0 && shipsInLastGroup < 3) {
                isTail = true; 
            }

            let anchorX = this.leader.x;
            let anchorY = this.leader.y;
            let anchorAngle = this.leader.angle;
            let isSubLeader = false;

            if (isV && groupIdx > 0 && !isTail) {
                let subLeader = enemies[groupIdx * groupSize];
                if (localIdx === 0) isSubLeader = true;
                else if (subLeader) {
                    anchorX = subLeader.x;
                    anchorY = subLeader.y;
                    anchorAngle = subLeader.angle;
                }
            }

            let cosA = Math.cos(anchorAngle);
            let sinA = Math.sin(anchorAngle);
            let relX = 0, relY = 0;
            let slotX = enemy.x, slotY = enemy.y;
            let overrideSpeed = null;
            let overrideTurn = 0.08;

            if (this.activeTactic === 'ANTI_TURRETS') {
                let safeRadius = 460;
                let step = (Math.PI * 2) / Math.max(1, totalEnemies);
                // Orbitar en sentido opuesto al giro del jugador para romper su seguimiento circular
                let counterDir = this.lastTurnDir !== 0 ? -this.lastTurnDir : 1;
                let orbitAngle = (step * index) + (this.choreoPhaseAngle * 0.45 * counterDir);
                slotX = player.x + Math.cos(orbitAngle) * safeRadius;
                slotY = player.y + Math.sin(orbitAngle) * safeRadius;
                overrideTurn = 0.095;
            } 
            else if (this.activeTactic === 'SPLIT_FLANKS') {
                let side = (index % 2 === 0) ? 1 : -1;
                let flankDistance = 350 + (Math.floor(index/2) * 40);
                slotX = player.x + Math.cos(player.angle + (Math.PI/2 * side)) * flankDistance + Math.cos(player.angle)*150;
                slotY = player.y + Math.sin(player.angle + (Math.PI/2 * side)) * flankDistance + Math.sin(player.angle)*150;
            } 
            else if (this.activeTactic === 'SNAKE_COLUMN' || this.activeTactic === 'DUAL_SNAKE') {
                let row = this.activeTactic === 'DUAL_SNAKE' ? Math.floor(index / 2) : index;
                let side = (index % 2 === 0) ? 1 : -1;
                let delay = row * 12; 
                if (delay >= this.pathHistory.length) delay = this.pathHistory.length - 1;
                let hist = this.pathHistory[delay];
                if (hist) {
                    if (this.activeTactic === 'DUAL_SNAKE') {
                        slotX = hist.x + Math.cos(hist.angle + Math.PI/2 * side) * 45;
                        slotY = hist.y + Math.sin(hist.angle + Math.PI/2 * side) * 45;
                    } else {
                        slotX = hist.x; slotY = hist.y;
                    }
                } else {
                    slotX = this.leader.x; slotY = this.leader.y;
                }
            }
            else {
                if (this.activeTactic === 'PINCER_SQUAD') {
                    let side = (index % 2 === 0) ? 1 : -1;
                    let row = Math.floor(index / 2);
                    let pincerAngle = player.angle + (Math.PI/2 * side) - (0.15 * side * row);
                    slotX = player.x + Math.cos(pincerAngle) * (220 + row*45) + Math.cos(player.angle) * (120 - row*50);
                    slotY = player.y + Math.sin(pincerAngle) * (220 + row*45) + Math.sin(player.angle) * (120 - row*50);
                } 
                else if (this.activeTactic === 'RING_FIVE') {
                    let step = (Math.PI * 2 / Math.max(1, totalEnemies)) * index + (this.choreoPhaseAngle * 0.8);
                    slotX = player.x + Math.cos(step) * 250;
                    slotY = player.y + Math.sin(step) * 250;
                }
                else if (isV) {
                    if (isTail) {
                        let prevGroupLeaderIdx = (groupIdx - 1) * groupSize;
                        let prevAnchor = enemies[prevGroupLeaderIdx] || this.leader;
                        relX = -120 - (localIdx * 45); 
                        relY = 0;
                        slotX = prevAnchor.x + (relX * Math.cos(prevAnchor.angle) - relY * Math.sin(prevAnchor.angle));
                        slotY = prevAnchor.y + (relX * Math.sin(prevAnchor.angle) + relY * Math.cos(prevAnchor.angle));
                        overrideTurn = 0.04; 
                    }
                    else if (isSubLeader) {
                        let side = groupIdx % 2 === 0 ? 1 : -1;
                        let tier = Math.ceil(groupIdx / 2);
                        let flankX = (-180 * tier);     
                        let flankY = (side * 220 * tier); 
                        slotX = this.leader.x + (flankX * cosL - flankY * sinL);
                        slotY = this.leader.y + (flankX * sinL + flankY * cosL);
                        overrideSpeed = this.leader.speed + 0.5; 
                    } 
                    else {
                        let spacingX = 45; 
                        let spacingY = 40; 
                        if (this.activeTactic === 'DYNAMIC_V') { spacingX = 40; spacingY = 45; }
                        if (localIdx === 0) { relX = 0; relY = 0; } 
                        else {
                            if (this.activeTactic === 'DYNAMIC_V') {
                                let side = localIdx === 1 ? -1 : 1; 
                                relX = -spacingX;
                                relY = side * spacingY;
                            } else {
                                let row = Math.ceil(localIdx / 2);
                                let side = localIdx % 2 === 0 ? 1 : -1;
                                relX = -row * spacingX;
                                relY = side * row * spacingY;
                            }
                        }
                        slotX = anchorX + (relX * cosA - relY * sinA);
                        slotY = anchorY + (relX * sinA + relY * cosA);
                    }
                }
            }

            if (enemy.evadeTimer > 0) enemy.evadeTimer--;

            let threateningAsteroids = [];
            let pdxE = enemy.x - player.x; if (pdxE > this.mw / 2) pdxE -= this.mw; else if (pdxE < -this.mw / 2) pdxE += this.mw;
            let pdyE = enemy.y - player.y; if (pdyE > this.mh / 2) pdyE -= this.mh; else if (pdyE < -this.mh / 2) pdyE += this.mh;
            let pDistSq = pdxE*pdxE + pdyE*pdyE;
            
            if (pDistSq < 14400 && !isGhost && totalEnemies > 1) { 
                threateningAsteroids.push({ a: player, adx: pdxE, ady: pdyE, distSq: pDistSq, safeZone: 150, isPlayer: true });
            }

            for (let i = 0; i < asteroids.length; i++) {
                let a = asteroids[i];
                let adx = enemy.x - a.x; 
                if (adx > this.mw / 2) adx -= this.mw; else if (adx < -this.mw / 2) adx += this.mw;
                let ady = enemy.y - a.y;
                if (ady > this.mh / 2) ady -= this.mh; else if (ady < -this.mh / 2) ady += this.mh;
                let distSq = adx*adx + ady*ady;
                let safeZone = a.radius + 90; 
                if (distSq < safeZone * safeZone) {
                    threateningAsteroids.push({ a, adx, ady, distSq, safeZone });
                }
            }

            let eAngle;
            let targetX = slotX, targetY = slotY;
            let edx = targetX - enemy.x;
            if (edx > this.mw / 2) edx -= this.mw; else if (edx < -this.mw / 2) edx += this.mw;
            let edy = targetY - enemy.y;
            if (edy > this.mh / 2) edy -= this.mh; else if (edy < -this.mh / 2) edy += this.mh;

            let isSnake = (this.activeTactic === 'SNAKE_COLUMN' || this.activeTactic === 'DUAL_SNAKE');

            if (threateningAsteroids.length >= 2) {
                let avgX = 0, avgY = 0;
                for (let t of threateningAsteroids) { avgX += t.a.x; avgY += t.a.y; }
                avgX /= threateningAsteroids.length; avgY /= threateningAsteroids.length;
                let escapeAngle = Math.atan2(enemy.y - avgY, enemy.x - avgX);
                let eDiff = escapeAngle - enemy.angle;
                enemy.angle += Math.atan2(Math.sin(eDiff), Math.cos(eDiff)) * 0.3; 
                enemy.speed = this.leader.speed + 3.0; 
                enemy.evadeTimer = 30;
            } 
            else if (threateningAsteroids.length === 1) {
                let threat = threateningAsteroids[0];
                let angleToAst = Math.atan2(-threat.ady, -threat.adx); 
                let tang1 = angleToAst + Math.PI/1.8; 
                let tang2 = angleToAst - Math.PI/1.8; 
                let bestEscapeAngle;

                if (isV && !isSubLeader && !isTail && localIdx > 0 && !threat.isPlayer) {
                    let wingSide = (localIdx % 2 === 0) ? 1 : -1;
                    if (this.activeTactic === 'DYNAMIC_V') wingSide = localIdx === 1 ? -1 : 1;
                    bestEscapeAngle = wingSide === 1 ? tang1 : tang2;
                } else {
                    let diff1 = Math.abs(Math.atan2(Math.sin(tang1 - enemy.angle), Math.cos(tang1 - enemy.angle)));
                    let diff2 = Math.abs(Math.atan2(Math.sin(tang2 - enemy.angle), Math.cos(tang2 - enemy.angle)));
                    bestEscapeAngle = (diff1 < diff2) ? tang1 : tang2;
                }
                
                let eDiff = bestEscapeAngle - enemy.angle;
                enemy.angle += Math.atan2(Math.sin(eDiff), Math.cos(eDiff)) * 0.15;
                enemy.speed = this.leader.speed + 1.5;
                enemy.evadeTimer = 10;
            } 
            else {
                let distToSlot = Math.hypot(edx, edy);
                let baseAngle = anchorAngle;
                if (this.activeTactic === 'ANTI_TURRETS') {
                    // Apuntar hacia el centro del anillo (jugador) mientras orbitan el perímetro
                    let pdxCenter = player.x - enemy.x;
                    if (pdxCenter > this.mw / 2) pdxCenter -= this.mw; else if (pdxCenter < -this.mw / 2) pdxCenter += this.mw;
                    let pdyCenter = player.y - enemy.y;
                    if (pdyCenter > this.mh / 2) pdyCenter -= this.mh; else if (pdyCenter < -this.mh / 2) pdyCenter += this.mh;
                    baseAngle = Math.atan2(pdyCenter, pdxCenter);
                } else if (isSnake) {
                    let delay = index * 12;
                    if (this.activeTactic === 'DUAL_SNAKE') delay = Math.floor(index/2) * 12;
                    if (delay >= this.pathHistory.length) delay = this.pathHistory.length - 1;
                    if (this.pathHistory[delay]) baseAngle = this.pathHistory[delay].angle;
                }

                if (distToSlot > 100) eAngle = Math.atan2(edy, edx); 
                else {
                    let weight = distToSlot / 100; 
                    let slotAngle = Math.atan2(edy, edx);
                    let tx = Math.cos(slotAngle) * weight + Math.cos(baseAngle) * (1 - weight);
                    let ty = Math.sin(slotAngle) * weight + Math.sin(baseAngle) * (1 - weight);
                    eAngle = Math.atan2(ty, tx);
                    if (distToSlot < 30) {
                        enemy.x += edx * 0.15;
                        enemy.y += edy * 0.15;
                    }
                }

                let eDiff = eAngle - enemy.angle;
                enemy.angle += Math.max(-overrideTurn, Math.min(overrideTurn, Math.atan2(Math.sin(eDiff), Math.cos(eDiff))));
                
                let eTargetSpeed = overrideSpeed !== null ? overrideSpeed : this.leader.speed;
                if (!isSandbox && totalEnemies === 1 && wave <= 8 && phase === 'STRIKE') {
                    eTargetSpeed = 1.8;
                    overrideTurn = 0.04; 
                } else if (phase === 'STRIKE' && index === 0 && overrideSpeed === null && this.activeTactic !== 'ANTI_TURRETS') {
                    eTargetSpeed = (!forcedTactic && wave <= 5) ? 2.5 : 3.2 + (wave * 0.1);
                } else if (distToSlot > 15 && overrideSpeed === null) {
                    eTargetSpeed = this.leader.speed + Math.min(3.5, distToSlot * 0.05); 
                }
                
                eTargetSpeed *= this.speedMultiplier;
                eTargetSpeed = Math.max(1.0 * this.speedMultiplier, eTargetSpeed);
                enemy.speed += (eTargetSpeed - enemy.speed) * 0.15; 
            }

            enemy.x += Math.cos(enemy.angle) * enemy.speed;
            enemy.y += Math.sin(enemy.angle) * enemy.speed;
            this.wrap(enemy);

            if (enemy.cooldown > 0) enemy.cooldown--;
            
            let shouldFire = false;
            let shootAngle = enemy.angle; 
            let spread = 0.05;
            let canShootAsteroids = ['DYNAMIC_V', 'V_QUINTET', 'ANTI_TURRETS', 'RING_FIVE'].includes(this.activeTactic);
            let asteroidTargetAngle = null;

            if (canShootAsteroids && enemy.cooldown <= 0) {
                for (let a of asteroids) {
                    let adx = a.x - enemy.x; 
                    if (adx > this.mw / 2) adx -= this.mw; else if (adx < -this.mw / 2) adx += this.mw;
                    let ady = a.y - enemy.y;
                    if (ady > this.mh / 2) ady -= this.mh; else if (ady < -this.mh / 2) ady += this.mh;
                    if (adx*adx + ady*ady < 40000) { 
                        let angToAst = Math.atan2(ady, adx);
                        let diffToAst = Math.abs(Math.atan2(Math.sin(angToAst - enemy.angle), Math.cos(angToAst - enemy.angle)));
                        if (diffToAst < 0.25) { 
                            asteroidTargetAngle = angToAst;
                            break;
                        }
                    }
                }
            }

            if (asteroidTargetAngle !== null) {
                shouldFire = true;
                shootAngle = asteroidTargetAngle;
                spread = 0.02;
                enemy.cooldown = 20; 
            } 
            else {
                let pdx = player.x - enemy.x;
                if (pdx > this.mw / 2) pdx -= this.mw; else if (pdx < -this.mw / 2) pdx += this.mw;
                let pdy = player.y - enemy.y;
                if (pdy > this.mh / 2) pdy -= this.mh; else if (pdy < -this.mh / 2) pdy += this.mh;
                let pDistSqE = pdx * pdx + pdy * pdy;

                if (this.activeTactic === 'ANTI_TURRETS') {
                    shootAngle = Math.atan2(pdy, pdx);
                    spread = 0.08;
                    if (enemy.cooldown <= 0) {
                        shouldFire = true;
                        enemy.cooldown = Math.max(45, 95 - (wave * 3)) + (index % 3) * 12;
                    }
                }
                else if (isV) {
                    if (groupIdx > 0 && !isTail) {
                        let angleToP = Math.atan2(pdy, pdx);
                        shootAngle = angleToP;
                        if (localIdx > 0) {
                            let side = localIdx % 2 === 0 ? 1 : -1;
                            if (this.activeTactic === 'DYNAMIC_V') side = localIdx === 1 ? -1 : 1;
                            shootAngle += side * 0.15; 
                        }
                        let diffToP = Math.abs(Math.atan2(Math.sin(angleToP - enemy.angle), Math.cos(angleToP - enemy.angle)));
                        if (enemy.cooldown <= 0 && (diffToP < 1.0 || isGhost)) {
                            shouldFire = true;
                            enemy.cooldown = 50 + (Math.random() * 15); 
                        }
                    } else {
                        shootAngle = isTail ? enemy.angle : anchorAngle;
                        spread = 0.05;
                        let angleToP = Math.atan2(pdy, pdx);
                        let diffToLeader = Math.abs(Math.atan2(Math.sin(angleToP - anchorAngle), Math.cos(angleToP - anchorAngle)));
                        if (enemy.cooldown <= 0 && (diffToLeader < 1.2 || isGhost)) {
                            shouldFire = true;
                            enemy.cooldown = 70 + (Math.random() * 10); 
                        }
                    }
                } 
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
                else {
                    shootAngle = Math.atan2(pdy, pdx);
                    spread = 0.15;
                    if (enemy.cooldown <= 0) {
                        shouldFire = true;
                        enemy.cooldown = Math.max(30, 90 - (wave * 3));
                    }
                }

                if (!shouldFire || pDistSqE > 600000) shouldFire = false;
            }

            if (shouldFire) {
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