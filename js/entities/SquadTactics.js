export class SquadTactics {
    constructor() {
        this.tacticalMemory = {
            'V_QUINTET': 10, 'SNAKE_COLUMN': 10, 'RING_FIVE': 10, 'PINCER_SQUAD': 10
        };
        this.currentChoreo = 'V_QUINTET';
        this.activeTactic = 'V_QUINTET';
        this.choreoTimer = 600;
        this.choreoPhaseAngle = 0;
        
        this.isAntiCharge = false;
        this.isHarassing = false;
        this.turretTimer = 0;
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

    updateTimers() {
        this.choreoTimer--;
        this.choreoPhaseAngle += 0.015;
        if (this.choreoTimer <= 0) {
            this.currentChoreo = this.selectNextChoreo();
            this.choreoTimer = 550 + Math.random() * 150;
        }
        return (this.choreoTimer > 200) ? 'SETUP' : 'STRIKE';
    }

    analyzePlayer(player, leader, distToPlayer, mw, mh) {
        let dx = player.x - leader.x;
        if (dx > mw / 2) dx -= mw; else if (dx < -mw / 2) dx += mw;
        let dy = player.y - leader.y;
        if (dy > mh / 2) dy -= mh; else if (dy < -mh / 2) dy += mh;

        let pSpeedSq = player.vx * player.vx + player.vy * player.vy;
        let pVelNormX = player.vx / (Math.sqrt(pSpeedSq) || 1);
        let pVelNormY = player.vy / (Math.sqrt(pSpeedSq) || 1);
        let pDirX = Math.cos(player.angle);
        let pDirY = Math.sin(player.angle);
        
        let toLeaderNormX = -dx / distToPlayer; 
        let toLeaderNormY = -dy / distToPlayer;
        
        let dotProductAim = (pVelNormX * pDirX) + (pVelNormY * pDirY);
        let dotProductLeader = (pVelNormX * toLeaderNormX) + (pVelNormY * toLeaderNormY);

        this.isAntiCharge = (dotProductLeader > 0.65 && pSpeedSq > 3.0 && distToPlayer < 750);
        this.isHarassing = (distToPlayer > 650);
        
        if (player.spinAccumulator > 0.05 && player.isShooting) {
            this.turretTimer++;
        } else {
            this.turretTimer = 0;
        }

        let isTurret = (player.spinAccumulator > 0.08 && player.isShooting && pSpeedSq < 1.0) || (this.turretTimer > 90);
        let isStraightCharge = (pSpeedSq > 3.5 && player.isShooting && dotProductAim > 0.80);

        this.activeTactic = this.currentChoreo;
        if (isTurret) this.activeTactic = 'ANTI_TURRETS';
        else if (isStraightCharge) this.activeTactic = 'SPLIT_FLANKS';
    }

    getFormationSlot(index, totalEnemies, leader, player, cosL, sinL) {
        let slotX, slotY;
        let overrideSpeed = null;

        if (this.activeTactic === 'ANTI_TURRETS') {
            let safeRadius = 500;
            let step = (Math.PI * 2) / Math.max(1, totalEnemies);
            let orbitAngle = (step * index) + (this.choreoPhaseAngle * 0.3);
            slotX = player.x + Math.cos(orbitAngle) * safeRadius;
            slotY = player.y + Math.sin(orbitAngle) * safeRadius;
        } 
        else if (this.activeTactic === 'SPLIT_FLANKS' || this.isAntiCharge) {
            let side = (index % 2 === 0) ? 1 : -1;
            let flankDistance = 400 + (index * 20);
            slotX = player.x + Math.cos(player.angle + (Math.PI/2 * side)) * flankDistance;
            slotY = player.y + Math.sin(player.angle + (Math.PI/2 * side)) * flankDistance;
            overrideSpeed = 4.0;
        } 
        else if (totalEnemies >= 8) {
            let wingGroup = index % 3; 
            let groupIndex = Math.floor(index / 3);
            
            let relX = 0, relY = 0;
            if (wingGroup === 0) {
                relX = -groupIndex * 50 - 40;
                relY = (groupIndex % 2 === 0 ? 1 : -1) * (groupIndex * 35 + 20);
            } else if (wingGroup === 1) {
                relX = -groupIndex * 45 - 90;
                relY = -70 - (groupIndex * 35);
            } else {
                relX = -groupIndex * 45 - 90;
                relY = 70 + (groupIndex * 35);
            }
            slotX = leader.x + (relX * cosL - relY * sinL);
            slotY = leader.y + (relX * sinL + relY * cosL);
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
            slotX = leader.x + (relX * cosL - relY * sinL);
            slotY = leader.y + (relX * sinL + relY * cosL);
        }

        return { slotX, slotY, overrideSpeed };
    }
}