const particles = [];
export function spawnParticles(x,y,color,count=10){
  for(let i=0;i<count;i++) particles.push({x,y,vx:(Math.random()-0.5)*300,vy:(Math.random()-0.5)*300,l:0,life:0.6+Math.random()*0.6,color});
}
export function updateParticles(dt){ for(let p of particles){ p.x+=p.vx*dt; p.y+=p.vy*dt; p.l+=dt;} for(let i=particles.length-1;i>=0;i--) if(particles[i].l>particles[i].life) particles.splice(i,1); }
export function drawParticles(ctx){ for(let p of particles){ ctx.save(); ctx.globalAlpha = 1-(p.l/p.life); ctx.fillStyle=p.color; ctx.beginPath(); ctx.arc(p.x,p.y,3,0,Math.PI*2); ctx.fill(); ctx.restore(); } }
