import { Enemy } from './enemy.js';

export class Spawner{
  constructor(def){ this.def = def; this.timer = 0; this.hp = 60; this.r = 18; this.destroyed = false; }
  update(dt,enemies){ if(this.destroyed) return; this.timer += dt; if(this.timer >= (this.def.interval || 3)){ this.timer = 0; const x = (typeof this.def.x === 'function') ? this.def.x() : this.def.x; const y = (typeof this.def.y === 'function') ? this.def.y() : this.def.y; enemies.push(new Enemy(x,y)); } }
  takeDamage(amount){ this.hp -= amount; if(this.hp <= 0){ this.destroyed = true; return true; } return false; }
  draw(ctx){ ctx.save(); if(this.destroyed) { ctx.globalAlpha = 0.25; ctx.fillStyle = 'gray'; } else ctx.fillStyle = '#b36'; ctx.beginPath(); ctx.arc((typeof this.def.x === 'function' ? this.def.x() : this.def.x),(typeof this.def.y === 'function' ? this.def.y() : this.def.y),this.r,0,Math.PI*2); ctx.fill(); ctx.restore(); }
}
