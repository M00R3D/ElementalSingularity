export class Enemy{
  constructor(x,y){ this.x=x;this.y=y;this.r=12;this.speed=80;this.hp=20;this.dead=false; }
  update(dt,player){ const dx=player.x-this.x, dy=player.y-this.y, len=Math.hypot(dx,dy)||1; this.x += (dx/len)*this.speed*dt; this.y += (dy/len)*this.speed*dt; if(this.hp<=0) this.dead=true; }
  draw(ctx){ ctx.save(); ctx.fillStyle='#9bd'; ctx.beginPath(); ctx.rect(this.x-this.r,this.y-this.r,this.r*2,this.r*2); ctx.fill(); ctx.restore(); }
}
