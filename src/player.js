import { ElementSystem } from './elementSystem.js';
import { Bullet } from './bullet.js';

export class Player{
  constructor(x,y){
    this.x=x;this.y=y;this.r=14;this.speed=300;this.hp=100;
    this.bullets=[]; this.elements = new ElementSystem();
    this.selectedAbility = null; this.abilityCooldown = 0;
    // visuals: simple parts that can be toggled
    this.visuals = { arms: true, legs: true, color: '#ff8c42' };
    // RPG stats
    this.maxHp = 100; this.hp = this.maxHp;
    this.maxMp = 60; this.mp = this.maxMp;
    this.maxStamina = 50; this.stamina = this.maxStamina;
    this.level = 1; this.xp = 0; this.xpToNext = 100; this.elementPoints = 0;
    this.equipped = [null, null, null]; // ability slots
  }

  update(dt, input, enemies, spawners){
    let vx=0, vy=0; if(input.up) vy-=1; if(input.down) vy+=1; if(input.left) vx-=1; if(input.right) vx+=1;
    const len = Math.hypot(vx,vy)||1; this.x += (vx/len)*this.speed*dt; this.y += (vy/len)*this.speed*dt;
    this.x = Math.max(this.r, Math.min(window.innerWidth-this.r, this.x)); this.y = Math.max(this.r, Math.min(window.innerHeight-this.r, this.y));

    this.abilityCooldown -= dt; this.elements.update(dt);
    for(let b of this.bullets) b.update(dt,enemies,spawners); this.bullets = this.bullets.filter(b=>!b.dead);
  }

  fireAt(x,y,ability){
    if(!ability) return; if(this.abilityCooldown > 0) return; this.abilityCooldown = ability.cooldown || 0.6;
    const angle = Math.atan2(y - this.y, x - this.x);
    this.bullets.push(new Bullet(this.x,this.y,angle,ability.type));
  }

  addXP(amount){
    this.xp += amount; while(this.xp >= this.xpToNext){ this.xp -= this.xpToNext; this.levelUp(); }
  }
  levelUp(){ this.level++; this.elementPoints += 1; this.xpToNext = Math.floor(this.xpToNext * 1.25); window.dispatchEvent(new CustomEvent('levelup',{detail:{level:this.level, ep:1}})); }

  draw(ctx){
    // body
    ctx.save(); ctx.fillStyle = this.visuals.color || '#ff8c42'; ctx.beginPath(); ctx.arc(this.x,this.y,this.r,0,Math.PI*2); ctx.fill();
    // arms and legs as simple circles
    if(this.visuals.arms){ ctx.beginPath(); ctx.fillStyle='rgba(255,255,255,0.15)'; ctx.arc(this.x-this.r-6,this.y,6,0,Math.PI*2); ctx.arc(this.x+this.r+6,this.y,6,0,Math.PI*2); ctx.fill(); }
    if(this.visuals.legs){ ctx.beginPath(); ctx.fillStyle='rgba(255,255,255,0.12)'; ctx.arc(this.x-6,this.y+this.r+6,5,0,Math.PI*2); ctx.arc(this.x+6,this.y+this.r+6,5,0,Math.PI*2); ctx.fill(); }
    ctx.restore();
    for(let b of this.bullets) b.draw(ctx);
  }
}
