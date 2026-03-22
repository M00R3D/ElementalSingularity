// Main module: imports and wiring
import { abilities, mapConfig, spawners as spawnerDefs } from './src/config.js';
import { Player } from './src/player.js';
import { Enemy } from './src/enemy.js';
import { Bullet } from './src/bullet.js';
import { Spawner } from './src/spawner.js';
import { spawnParticles, updateParticles, drawParticles } from './src/particleSystem.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const hud = document.getElementById('hud');

function resize(){ canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
window.addEventListener('resize', resize); resize();

// Input state for player movement and mouse
const input = { up:false,down:false,left:false,right:false, mouseX:0, mouseY:0, mouseDown:false };
window.addEventListener('keydown', e=>{ const k=e.key.toLowerCase(); if(k==='w'||k==='arrowup') input.up=true; if(k==='s'||k==='arrowdown') input.down=true; if(k==='a'||k==='arrowleft') input.left=true; if(k==='d'||k==='arrowright') input.right=true; });
window.addEventListener('keyup', e=>{ const k=e.key.toLowerCase(); if(k==='w'||k==='arrowup') input.up=false; if(k==='s'||k==='arrowdown') input.down=false; if(k==='a'||k==='arrowleft') input.left=false; if(k==='d'||k==='arrowright') input.right=false; });
canvas.addEventListener('mousemove', e=>{ input.mouseX = e.clientX; input.mouseY = e.clientY; });
canvas.addEventListener('mousedown', e=>{ input.mouseDown = true; });
window.addEventListener('mouseup', e=>{ input.mouseDown = false; });

// Game state
const player = new Player(canvas.width/2, canvas.height/2);
const enemies = [];
const spawners = spawnerDefs.map(d=>new Spawner(d));
let paused = false;
let lastElementsCount = player.elements.elements.length;

// Menu elements
const menuOverlay = document.getElementById('menuOverlay');
const menuContent = document.getElementById('menuContent');
const tabShop = document.getElementById('tab-shop');
const tabEquip = document.getElementById('tab-equip');
const closeMenu = document.getElementById('closeMenu');
const uiLevel = document.getElementById('ui-level');
const uiEP = document.getElementById('ui-ep');

function updateMenuStats(){ if(uiLevel) uiLevel.textContent = player.level; if(uiEP) uiEP.textContent = player.elementPoints; }

function openMenu(){ if(menuOverlay) menuOverlay.style.display='block'; paused = true; renderMenuShop(); updateMenuStats(); }
function closeMenuFn(){ if(menuOverlay) menuOverlay.style.display='none'; paused = false; }
tabShop.onclick = ()=> renderMenuShop(); tabEquip.onclick = ()=> renderMenuEquip(); closeMenu.onclick = ()=> closeMenuFn();
window.addEventListener('keydown', e=>{ if(e.key === 'Tab'){ e.preventDefault(); if(menuOverlay && menuOverlay.style.display==='block') closeMenuFn(); else openMenu(); } if(e.key === 'Enter'){ paused = !paused; } });

// Ability UI
const abilityListEl = document.getElementById('abilityList');
function renderAbilities(){
  abilityListEl.innerHTML = '';
  abilities.forEach((a,idx)=>{
    const card = document.createElement('div');
    card.textContent = a.name;
    card.draggable = true;
    card.style.margin = '4px';
    card.style.padding = '6px 8px';
    card.style.display = 'inline-block';
    card.style.background = 'rgba(255,255,255,0.08)';
    card.style.border = '1px solid rgba(255,255,255,0.12)';
    card.style.borderRadius = '6px';
    card.style.cursor = 'grab';
    card.title = a.desc || a.name;
    card.addEventListener('dragstart', ev=>{
      ev.dataTransfer.setData('application/json', JSON.stringify({ kind:'ability', abilityId:a.id }));
    });
    card.addEventListener('click', ()=>{
      hotbarSlots[hotbarIndex] = { kind:'ability', id:a.id, name:a.name, type:a.type, cooldown:a.cooldown };
      setSelectedHotbar(hotbarIndex);
      renderHotbar();
    });
    abilityListEl.appendChild(card);
    if(idx===0 && !player.selectedAbility){
      player.selectedAbility = a;
    }
  });
}
renderAbilities();

// Visuals UI
const visArms = document.getElementById('vis-arms'); const visLegs = document.getElementById('vis-legs');
const presetsEl = document.getElementById('presets'); const savePresetBtn = document.getElementById('savePreset');
visArms.checked = player.visuals.arms; visLegs.checked = player.visuals.legs;
visArms.onchange = ()=> player.visuals.arms = visArms.checked; visLegs.onchange = ()=> player.visuals.legs = visLegs.checked;

function renderPresets(){ presetsEl.innerHTML=''; const keys = Object.keys(localStorage).filter(k=>k.startsWith('preset_')); keys.forEach(k=>{ const btn = document.createElement('button'); btn.textContent = k.replace('preset_',''); btn.style.margin='4px'; btn.onclick = ()=>{ const val = JSON.parse(localStorage.getItem(k)); Object.assign(player.visuals, val); visArms.checked = player.visuals.arms; visLegs.checked = player.visuals.legs; }; presetsEl.appendChild(btn); }); }
savePresetBtn.onclick = ()=>{ const name = prompt('Preset name:'); if(!name) return; localStorage.setItem('preset_'+name, JSON.stringify(player.visuals)); renderPresets(); };
renderPresets();

// Spawner UI
const spawnerListEl = document.getElementById('spawnerList'); function renderSpawners(){ spawnerListEl.innerHTML=''; spawnerDefs.forEach(s=>{ const d=document.createElement('div'); d.textContent = `${s.id} interval:${s.interval}s`; spawnerListEl.appendChild(d); }); } renderSpawners();

// Extra UI refs
const elementPoolEl = document.getElementById('elementPool');
const hotbarEl = document.getElementById('hotbar');

// Hotbar state
const HOTBAR_SLOTS = 9;
const hotbarSlots = new Array(HOTBAR_SLOTS).fill(null);
let hotbarIndex = 0;

// Notifications (level-up feedback)
const notifications = [];
window.addEventListener('levelup', e=>{
  const msg = `+${e.detail.ep} EP! Level ${e.detail.level}`;
  notifications.push({text:msg, created: performance.now(), life:1500});
  if(uiEP) { uiEP.style.transition = 'transform 0.3s'; uiEP.style.transform = 'scale(1.3)'; setTimeout(()=>{ uiEP.style.transform=''; },300); }
});

// Render element pool (draggable items)
function renderElementPool(){ if(!elementPoolEl) return; elementPoolEl.innerHTML=''; player.elements.elements.forEach((el,idx)=>{
  const item = document.createElement('div'); item.textContent = el; item.draggable = true; item.style.padding='6px 8px'; item.style.background='rgba(255,255,255,0.06)'; item.style.borderRadius='6px'; item.style.cursor='grab'; item.style.display='inline-block';
  item.addEventListener('dragstart', ev=>{ ev.dataTransfer.setData('application/json', JSON.stringify({kind:'element',name:el})); });
  elementPoolEl.appendChild(item);
}); }

// Initialize hotbar DOM
function renderHotbar(){ if(!hotbarEl) return; hotbarEl.innerHTML=''; for(let i=0;i<HOTBAR_SLOTS;i++){ const s = document.createElement('div'); s.className='hotbar-slot'; s.dataset.index = i; s.style.width='48px'; s.style.height='48px'; s.style.border='2px solid rgba(255,255,255,0.08)'; s.style.borderRadius='6px'; s.style.display='flex'; s.style.alignItems='center'; s.style.justifyContent='center'; s.style.background='rgba(0,0,0,0.25)'; s.style.color='white'; s.style.userSelect='none'; s.style.fontSize='12px'; s.style.position='relative';
    s.addEventListener('dragover', ev=>{ ev.preventDefault(); s.style.outline='2px dashed #fff'; });
    s.addEventListener('dragleave', ev=>{ s.style.outline=''; });
    s.addEventListener('drop', ev=>{
      ev.preventDefault();
      s.style.outline='';
      try{
        const data = JSON.parse(ev.dataTransfer.getData('application/json'));
        if(data.kind==='element'){
          const mapType = { Fire:'fire', Air:'explosion', Electricity:'storm' };
          hotbarSlots[i] = { kind:'element', id:'el_'+data.name, name:data.name, type: mapType[data.name]||'fire', cooldown:0.8 };
        }
        if(data.kind==='ability'){
          const ability = abilities.find(item=>item.id===data.abilityId);
          if(ability) hotbarSlots[i] = { kind:'ability', id:ability.id, name:ability.name, type:ability.type, cooldown:ability.cooldown };
        }
        if(i===hotbarIndex) setSelectedHotbar(i);
        renderHotbar();
      }catch(e){}
    });
    s.addEventListener('click', ()=>{ setSelectedHotbar(i); });
    const content = document.createElement('div'); content.style.pointerEvents='none'; content.style.textAlign='center';
    if(hotbarSlots[i]) content.textContent = hotbarSlots[i].name || hotbarSlots[i].id; else content.textContent = '';
    s.appendChild(content);
    const idxLabel = document.createElement('div'); idxLabel.style.position='absolute'; idxLabel.style.left='4px'; idxLabel.style.top='4px'; idxLabel.style.fontSize='10px'; idxLabel.style.opacity=0.6; idxLabel.textContent = (i+1); s.appendChild(idxLabel);
    hotbarEl.appendChild(s);
  }
  updateHotbarVisual();
}

function updateHotbarVisual(){ if(!hotbarEl) return; const slots = hotbarEl.querySelectorAll('.hotbar-slot'); slots.forEach(s=>{ const i = Number(s.dataset.index); s.style.boxShadow = (i===hotbarIndex) ? '0 0 8px 2px rgba(255,255,255,0.12)' : ''; s.querySelector('div').textContent = hotbarSlots[i]? hotbarSlots[i].name : ''; }); }

function setSelectedHotbar(i){ hotbarIndex = (i+HOTBAR_SLOTS)%HOTBAR_SLOTS; const item = hotbarSlots[hotbarIndex]; if(item){ player.selectedAbility = { id: item.id||item.name, name: item.name, type: item.type, cooldown: item.cooldown||0.6 }; } else { player.selectedAbility = null; } updateHotbarVisual(); }

// Mouse wheel and number key navigation
window.addEventListener('wheel', e=>{ if(e.deltaY>0) setSelectedHotbar(hotbarIndex+1); else setSelectedHotbar(hotbarIndex-1); });
window.addEventListener('keydown', e=>{ if(e.key >= '1' && e.key <= String(HOTBAR_SLOTS)){ const idx = Number(e.key)-1; setSelectedHotbar(idx); } });

function seedHotbar(){
  if(hotbarSlots.some(Boolean)) return;
  abilities.slice(0,4).forEach((ability, index)=>{
    hotbarSlots[index] = { kind:'ability', id:ability.id, name:ability.name, type:ability.type, cooldown:ability.cooldown };
  });
  setSelectedHotbar(0);
}

seedHotbar();
renderHotbar();
renderElementPool();

// Helpers

// Helpers
function findNearestEnemy(source){ let best=null,bd=Infinity; for(let e of enemies){ if(e.dead) continue; const d=Math.hypot(e.x-source.x,e.y-source.y); if(d<bd){bd=d;best=e;} } return best; }

// Game loop
let last = performance.now(); function loop(now){ const dt = Math.min(0.05,(now-last)/1000); last = now; if(!paused) update(dt); draw(); requestAnimationFrame(loop); }

function update(dt){
  player.update(dt,input,enemies,spawners);
  // refresh element pool UI if elements changed
  if(player.elements.elements.length !== lastElementsCount){ lastElementsCount = player.elements.elements.length; renderElementPool(); }
  for(let e of enemies) e.update(dt,player);
  for(let i=enemies.length-1;i>=0;i--){ if(enemies[i].dead){ // award XP on kill
      player.addXP(25);
      spawnParticles(enemies[i].x,enemies[i].y,'#77ff77',12); enemies.splice(i,1); } }
  // spawners
  spawners.forEach(s=>s.update(dt,enemies));
  // firing with mouse: require click
  if(input.mouseDown && player.selectedAbility){ player.fireAt(input.mouseX,input.mouseY,player.selectedAbility); }
  updateParticles(dt);
  updateMenuStats();
}

function renderMenuShop(){
  if(!menuContent) return;
  menuContent.innerHTML='';
  const shopTitle = document.createElement('div'); shopTitle.textContent = 'Element Shop — spend Element Points to buy elements'; menuContent.appendChild(shopTitle);
  const list = document.createElement('div'); list.style.marginTop='8px';
  ['Fire','Air','Electricity'].forEach(el=>{
    const row = document.createElement('div'); row.style.marginBottom='6px';
    const name = document.createElement('span'); name.textContent = el; row.appendChild(name);
    const btn = document.createElement('button'); btn.textContent = 'Buy (1 EP)'; btn.style.marginLeft='10px';
    btn.onclick = ()=>{
      if(player.elementPoints>0 && !player.elements.elements.includes(el)){
        player.elements.elements.push(el);
        player.elementPoints--;
        updateMenuStats();
        renderElementPool();
      } else alert('No EP or already have');
    };
    row.appendChild(btn); list.appendChild(row);
  });
  menuContent.appendChild(list);
}

function renderMenuEquip(){
  if(!menuContent) return;
  menuContent.innerHTML='';
  const title = document.createElement('div');
  title.textContent = 'Equip Abilities — arrastra habilidades o elementos a la hotbar inferior';
  menuContent.appendChild(title);

  const help = document.createElement('div');
  help.style.marginTop = '10px';
  help.style.opacity = '0.8';
  help.textContent = 'Click en una habilidad para ponerla en la ranura seleccionada. Usa rueda del mouse o teclas 1-9 para cambiar ranura.';
  menuContent.appendChild(help);

  const preview = document.createElement('div');
  preview.style.marginTop = '12px';
  preview.innerHTML = hotbarSlots.map((slot, index)=> `<div style="margin-bottom:6px">${index + 1}: ${slot ? slot.name : 'Vacío'}</div>`).join('');
  menuContent.appendChild(preview);
}

function draw(){ ctx.clearRect(0,0,canvas.width,canvas.height); ctx.save(); ctx.fillStyle = mapConfig.backgroundColor; ctx.fillRect(0,0,canvas.width,canvas.height); ctx.fillStyle='rgba(255,255,255,0.02)'; for(let gx=0;gx<canvas.width;gx+=mapConfig.gridSize) ctx.fillRect(gx,0,1,canvas.height); for(let gy=0;gy<canvas.height;gy+=mapConfig.gridSize) ctx.fillRect(0,gy,canvas.width,1); ctx.restore();
  player.draw(ctx); enemies.forEach(e=>e.draw(ctx)); // draw spawners
  spawners.forEach(s=>s.draw(ctx)); drawParticles(ctx);
  // HUD bars
  const pad = 12; const barW = 220; const x0 = 12; let y0 = 12;
  // HP
  ctx.save(); ctx.fillStyle='rgba(255,255,255,0.08)'; ctx.fillRect(x0,y0,barW,14); ctx.fillStyle='red'; const hpPerc = Math.max(0, player.hp)/player.maxHp; ctx.fillRect(x0,y0,barW*hpPerc,14); ctx.fillStyle='white'; ctx.font='12px sans-serif'; ctx.fillText('HP', x0+6, y0+11); ctx.restore(); y0 += 20;
  // MP
  ctx.save(); ctx.fillStyle='rgba(255,255,255,0.08)'; ctx.fillRect(x0,y0,barW,12); ctx.fillStyle='blue'; const mpPerc = Math.max(0, player.mp)/player.maxMp; ctx.fillRect(x0,y0,barW*mpPerc,12); ctx.fillStyle='white'; ctx.font='12px sans-serif'; ctx.fillText('MP', x0+6, y0+10); ctx.restore(); y0 += 18;
  // Stamina
  ctx.save(); ctx.fillStyle='rgba(255,255,255,0.08)'; ctx.fillRect(x0,y0,barW,12); ctx.fillStyle='gold'; const stPerc = Math.max(0, player.stamina)/player.maxStamina; ctx.fillRect(x0,y0,barW*stPerc,12); ctx.fillStyle='white'; ctx.font='12px sans-serif'; ctx.fillText('Stamina', x0+6, y0+10); ctx.restore(); y0 += 18;
  // XP
  ctx.save(); ctx.fillStyle='rgba(255,255,255,0.08)'; ctx.fillRect(x0,y0,barW,10); ctx.fillStyle='purple'; const xpPerc = player.xp / player.xpToNext; ctx.fillRect(x0,y0,barW*Math.min(1,xpPerc),10); ctx.fillStyle='white'; ctx.font='11px sans-serif'; ctx.fillText(`XP L${player.level}`, x0+6, y0+9); ctx.restore();
  // Small textual HUD
  ctx.save(); ctx.fillStyle='white'; ctx.font='12px sans-serif'; ctx.fillText('Elements: '+player.elements.elements.join(', '),12, y0+32); ctx.fillText('Selected: '+(player.selectedAbility?player.selectedAbility.name:'None'),12,y0+48); ctx.restore();
  // paused overlay
  if(paused){ ctx.save(); ctx.fillStyle='rgba(0,0,0,0.5)'; ctx.fillRect(0,0,canvas.width,canvas.height); ctx.fillStyle='white'; ctx.font='28px sans-serif'; ctx.fillText('PAUSED', canvas.width/2-60, canvas.height/2); ctx.restore(); }
  // Notifications (top-right)
  const now = performance.now();
  for(let i=notifications.length-1;i>=0;i--){ const n = notifications[i]; const age = now - n.created; if(age > n.life){ notifications.splice(i,1); continue; } const t = age / n.life; const alpha = 1 - t; ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = 'yellow'; ctx.font = '18px sans-serif'; const x = canvas.width - 180; const y = 60 - (t*30) + (i*22); ctx.fillText(n.text, x, y); ctx.restore(); }
}

requestAnimationFrame(loop);

