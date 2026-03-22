import { spawnParticles } from './particleSystem.js';

export class Bullet{
  constructor(x,y,angle,type){ this.x=x;this.y=y;this.vx=Math.cos(angle)*600;this.vy=Math.sin(angle)*600;this.r=5;this.dead=false;this.type=type;this.life=2; }
  update(dt,enemies,spawners){ this.x+=this.vx*dt; this.y+=this.vy*dt; this.life-=dt; if(this.life<=0) this.dead=true;
    for(let e of enemies){ if(e.dead) continue; const d=Math.hypot(this.x-e.x,this.y-e.y); if(d < this.r + e.r){ this.applyEffect(e,enemies); this.dead=true; return; } }
    // check spawners
    for(let s of spawners){ if(s.destroyed) continue; const sx = (typeof s.def.x === 'function')? s.def.x() : s.def.x; const sy = (typeof s.def.y === 'function')? s.def.y() : s.def.y; const d2 = Math.hypot(this.x - sx, this.y - sy); if(d2 < this.r + s.r){ // damage spawner
        const destroyed = s.takeDamage(this.type==='incendiary'?30:12); spawnParticles(sx,sy,'orange',8); if(destroyed){ spawnParticles(sx,sy,'#77ff77',24); }
        this.dead = true; return; }
    }
  }
  applyEffect(e,enemies){
    if(this.type==='explosion'){ for(let other of enemies){ if(Math.hypot(other.x-this.x,other.y-this.y) < 80) other.hp -= 18; } spawnParticles(this.x,this.y,'orange',30);
    } else if(this.type==='incendiary'){ e.hp -= 25; spawnParticles(e.x,e.y,'red',8);
    } else if(this.type==='storm'){ e.hp -= 12; for(let o of enemies){ if(o!==e && Math.hypot(o.x-e.x,o.y-e.y)<120) o.hp -= 8; } spawnParticles(e.x,e.y,'cyan',10);
    } else if(this.type==='fire'){ e.hp -= 12; spawnParticles(e.x,e.y,'yellow',6);
    } else { e.hp -= 10; spawnParticles(e.x,e.y,'white',4); }
  }
  draw(ctx){ ctx.save(); if(this.type==='explosion') ctx.fillStyle='rgba(255,140,0,0.9)'; else if(this.type==='incendiary') ctx.fillStyle='rgba(255,60,60,0.95)'; else if(this.type==='storm') ctx.fillStyle='rgba(120,230,255,0.95)'; else ctx.fillStyle='rgba(255,210,120,0.95)'; ctx.beginPath(); ctx.arc(this.x,this.y,this.r,0,Math.PI*2); ctx.fill(); ctx.restore(); }
}
