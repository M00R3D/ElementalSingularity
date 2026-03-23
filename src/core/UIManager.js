export class UIManager {
  constructor(data, gameState, elementSystem) {
    this.data = data;
    this.gameState = gameState;
    this.elementSystem = elementSystem;
    this.refs = this.createRefs();
    this.iconCache = new Map();
    this.abilityFilters = { elementId: 'all', usageType: 'all' };
  }

  createRefs() {
    return {
      abilityList: document.getElementById('abilityList'),
      elementPool: document.getElementById('elementPool'),
      hotbar: document.getElementById('hotbar'),
      menuOverlay: document.getElementById('menuOverlay'),
      menuContent: document.getElementById('menuContent'),
      tabShop: document.getElementById('tab-shop'),
      tabEquip: document.getElementById('tab-equip'),
      tabInventory: document.getElementById('tab-inventory'),
      tabCrafting: document.getElementById('tab-crafting'),
      tabAlchemy: document.getElementById('tab-alchemy'),
      tabMachines: document.getElementById('tab-machines'),
      closeMenu: document.getElementById('closeMenu'),
      uiLevel: document.getElementById('ui-level'),
      uiEP: document.getElementById('ui-ep'),
      visArms: document.getElementById('vis-arms'),
      visLegs: document.getElementById('vis-legs'),
      presets: document.getElementById('presets'),
      savePreset: document.getElementById('savePreset'),
      spawnerList: document.getElementById('spawnerList'),
      inventoryList: document.getElementById('inventoryList'),
      machineList: document.getElementById('machineList'),
      deathOverlay: document.getElementById('deathOverlay'),
      deathSummary: document.getElementById('deathSummary'),
      restartRun: document.getElementById('restartRun')
    };
  }

  bind(player, onRestart) {
    const refs = this.refs;
    refs.tabShop.onclick = () => { this.gameState.setMenuTab('shop'); this.renderMenu(); };
    refs.tabEquip.onclick = () => { this.gameState.setMenuTab('equip'); this.renderMenu(); };
    refs.tabInventory.onclick = () => { this.gameState.setMenuTab('inventory'); this.renderMenu(); };
    refs.tabCrafting.onclick = () => { this.gameState.setMenuTab('crafting'); this.renderMenu(); };
    refs.tabAlchemy.onclick = () => { this.gameState.setMenuTab('alchemy'); this.renderMenu(); };
    refs.tabMachines.onclick = () => { this.gameState.setMenuTab('machines'); this.renderMenu(); };
    refs.closeMenu.onclick = () => { this.gameState.toggleMenu(); this.syncMenuVisibility(); };
    refs.visArms.checked = player.visuals.arms;
    refs.visLegs.checked = player.visuals.legs;
    refs.visArms.onchange = () => { player.visuals.arms = refs.visArms.checked; };
    refs.visLegs.onchange = () => { player.visuals.legs = refs.visLegs.checked; };
    refs.savePreset.onclick = () => {
      const name = prompt('Preset name');
      if (!name) return;
      localStorage.setItem(`elemental-visual-${name}`, JSON.stringify({ arms: player.visuals.arms, legs: player.visuals.legs }));
      this.renderPresets(player);
    };
    refs.restartRun.onclick = onRestart;
    this.renderPresets(player);
    this.renderInventoryPanel();
  }

  syncMenuVisibility() {
    this.refs.menuOverlay.style.display = this.gameState.isMenuOpen ? 'block' : 'none';
  }

  syncDeathOverlay() {
    this.refs.deathOverlay.style.display = this.gameState.isDead ? 'block' : 'none';
  }

  createIconCanvas(size = 28) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    return canvas;
  }

  drawElementGlyph(ctx, elementId, size) {
    const element = this.data.elements[elementId];
    ctx.save();
    ctx.strokeStyle = element.color;
    ctx.fillStyle = element.color;
    ctx.lineWidth = 2;
    if (elementId === 'fire') {
      ctx.beginPath(); ctx.moveTo(0, -size); ctx.lineTo(size * 0.55, 0); ctx.lineTo(size * 0.2, size); ctx.lineTo(-size * 0.55, size * 0.5); ctx.closePath(); ctx.fill();
    } else if (elementId === 'water') {
      ctx.beginPath(); ctx.moveTo(0, -size); ctx.quadraticCurveTo(size * 0.8, 0, 0, size); ctx.quadraticCurveTo(-size * 0.8, 0, 0, -size); ctx.fill();
    } else if (elementId === 'air') {
      for (let i = -1; i <= 1; i += 1) { ctx.beginPath(); ctx.moveTo(-size, i * 4); ctx.quadraticCurveTo(0, i * 2 - size * 0.4, size, i * 4); ctx.stroke(); }
    } else if (elementId === 'earth') {
      ctx.beginPath(); ctx.moveTo(0, -size); ctx.lineTo(size * 0.8, 0); ctx.lineTo(0, size); ctx.lineTo(-size * 0.8, 0); ctx.closePath(); ctx.fill();
    } else if (elementId === 'electricity') {
      ctx.beginPath(); ctx.moveTo(-size * 0.4, -size); ctx.lineTo(size * 0.1, -size * 0.1); ctx.lineTo(-size * 0.1, -size * 0.1); ctx.lineTo(size * 0.5, size); ctx.lineTo(-size * 0.1, size * 0.1); ctx.lineTo(size * 0.1, size * 0.1); ctx.closePath(); ctx.fill();
    } else if (elementId === 'light') {
      ctx.beginPath(); ctx.arc(0, 0, size * 0.72, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-size, 0); ctx.lineTo(size, 0); ctx.moveTo(0, -size); ctx.lineTo(0, size); ctx.stroke();
    } else if (elementId === 'darkness') {
      ctx.beginPath(); ctx.arc(0, 0, size * 0.8, Math.PI * 0.2, Math.PI * 1.8); ctx.stroke(); ctx.beginPath(); ctx.arc(size * 0.24, -size * 0.1, size * 0.34, 0, Math.PI * 2); ctx.fill();
    } else if (elementId === 'ghost') {
      ctx.beginPath(); ctx.arc(0, -size * 0.15, size * 0.58, Math.PI, Math.PI * 2); ctx.lineTo(size * 0.58, size * 0.5); ctx.lineTo(size * 0.18, size * 0.2); ctx.lineTo(-size * 0.18, size * 0.5); ctx.lineTo(-size * 0.58, size * 0.2); ctx.closePath(); ctx.stroke();
    } else {
      ctx.beginPath(); ctx.arc(0, 0, size * 0.72, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-size * 0.5, -size * 0.5); ctx.lineTo(size * 0.5, size * 0.5); ctx.moveTo(size * 0.5, -size * 0.5); ctx.lineTo(-size * 0.5, size * 0.5); ctx.stroke();
    }
    ctx.restore();
  }

  getCachedBaseIcon(key, size, painter) {
    const cacheKey = `${key}:${size}`;
    if (!this.iconCache.has(cacheKey)) {
      const canvas = this.createIconCanvas(size);
      painter(canvas.getContext('2d'), canvas);
      this.iconCache.set(cacheKey, canvas);
    }
    return this.iconCache.get(cacheKey);
  }

  drawElementIcon(canvas, elementId) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    this.drawElementGlyph(ctx, elementId, canvas.width * 0.3);
    ctx.restore();
  }

  drawAbilityIcon(canvas, abilityId, combatSystem, active = false) {
    const ability = this.elementSystem.getAbility(abilityId);
    if (!ability) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = active ? 'rgba(255,255,255,0.12)' : 'rgba(10,14,24,0.9)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    this.drawElementGlyph(ctx, ability.elementId, canvas.width * 0.22);
    ctx.strokeStyle = this.data.elements[ability.elementId].accent;
    ctx.fillStyle = this.data.elements[ability.elementId].accent;
    ctx.lineWidth = 2;
    if (ability.type === 'projectile') {
      ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(-2, 0); ctx.stroke();
    } else if (ability.type === 'burst') {
      [-1, 0, 1].forEach((index) => { ctx.beginPath(); ctx.arc(index * 5, -Math.abs(index) * 2, 3, 0, Math.PI * 2); ctx.fill(); });
    } else if (ability.type === 'aoe') {
      ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.stroke();
    } else if (ability.type === 'dash' || ability.type === 'teleport') {
      ctx.beginPath(); ctx.moveTo(-8, 4); ctx.lineTo(0, -7); ctx.lineTo(8, 4); ctx.stroke();
    } else if (ability.type === 'laser') {
      ctx.beginPath(); ctx.moveTo(-9, 0); ctx.lineTo(9, 0); ctx.stroke();
    } else if (ability.type === 'summon') {
      ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.stroke();
    } else if (ability.type === 'aura') {
      ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.stroke();
    } else if (ability.type === 'buff') {
      ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(6, 0); ctx.lineTo(0, 9); ctx.lineTo(-6, 0); ctx.closePath(); ctx.stroke();
    } else if (ability.type === 'chaos') {
      ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-5, -5); ctx.lineTo(5, 5); ctx.moveTo(5, -5); ctx.lineTo(-5, 5); ctx.stroke();
    }
    ctx.restore();

    const ratio = combatSystem ? combatSystem.getCooldownRatio(abilityId) : 0;
    if (ratio > 0) {
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(0, canvas.height * (1 - ratio), canvas.width, canvas.height * ratio);
      ctx.restore();
    }
  }

  renderAbilityLibrary(combatSystem, onQuickEquip) {
    const { abilityList } = this.refs;
    abilityList.innerHTML = '';

    const filterRow = document.createElement('div');
    filterRow.style.cssText = 'display:flex;gap:6px;align-items:center;margin-bottom:10px';
    const elementFilter = document.createElement('select');
    elementFilter.style.cssText = 'flex:1;background:#101726;color:#dce8ff;border:1px solid rgba(255,255,255,0.18);border-radius:6px;padding:4px';
    elementFilter.innerHTML = `<option value="all">All Elements</option>${Object.keys(this.data.elements).map((id) => `<option value="${id}" ${this.abilityFilters.elementId === id ? 'selected' : ''}>${this.data.elements[id].name}</option>`).join('')}`;
    elementFilter.onchange = () => { this.abilityFilters.elementId = elementFilter.value; this.renderAbilityLibrary(combatSystem, onQuickEquip); };
    const usageFilter = document.createElement('select');
    usageFilter.style.cssText = 'flex:1;background:#101726;color:#dce8ff;border:1px solid rgba(255,255,255,0.18);border-radius:6px;padding:4px';
    const usageTypes = ['all', 'unarmed', 'melee', 'ranged', 'magic', 'tool'];
    usageFilter.innerHTML = usageTypes.map((item) => `<option value="${item}" ${this.abilityFilters.usageType === item ? 'selected' : ''}>${item}</option>`).join('');
    usageFilter.onchange = () => { this.abilityFilters.usageType = usageFilter.value; this.renderAbilityLibrary(combatSystem, onQuickEquip); };
    filterRow.appendChild(elementFilter);
    filterRow.appendChild(usageFilter);
    abilityList.appendChild(filterRow);

    for (const elementId of this.elementSystem.getOwnedElements()) {
      const element = this.data.elements[elementId];
      if (!element) continue;
      if (this.abilityFilters.elementId !== 'all' && this.abilityFilters.elementId !== elementId) continue;
      const wrapper = document.createElement('div');
      wrapper.style.cssText = `margin-bottom:10px;padding:8px;border:1px solid ${element.color}44;border-radius:10px;background:${element.color}11`;
      const header = document.createElement('div');
      header.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:8px';
      const icon = this.createIconCanvas(22);
      this.drawElementIcon(icon, elementId);
      header.appendChild(icon);
      const label = document.createElement('div');
      const count = this.gameState.buildState.elementCounts[elementId] || 0;
      label.innerHTML = `<strong>${element.name}</strong><br><span style="opacity:0.7;font-size:12px">${count}/7 equipped</span>`;
      header.appendChild(label);
      wrapper.appendChild(header);

      const grid = document.createElement('div');
      grid.style.cssText = 'display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px';
      const filteredAbilities = this.elementSystem.getAbilitiesByElementWithAffinity(elementId, this.gameState.affinity[elementId] || 0)
        .filter((ability) => this.abilityFilters.usageType === 'all' || ability.usageType === this.abilityFilters.usageType);
      for (const ability of filteredAbilities) {
        const card = document.createElement('div');
        card.draggable = true;
        card.style.cssText = 'display:flex;gap:8px;align-items:flex-start;padding:6px;border:1px solid rgba(255,255,255,0.08);border-radius:8px;background:rgba(255,255,255,0.04);cursor:grab';
        const abilityIcon = this.createIconCanvas(28);
        this.drawAbilityIcon(abilityIcon, ability.id, combatSystem, false);
        card.appendChild(abilityIcon);
        const text = document.createElement('div');
        text.style.cssText = 'font-size:12px;line-height:1.35';
        const compatible = ability.usageType === this.gameState.equipment.usageType || ability.usageType === 'unarmed';
        text.innerHTML = `<strong>${ability.name}</strong><br><span style="opacity:0.75">${ability.branchId} · ${ability.type} · ${ability.usageType}</span><br><span style="opacity:0.6;color:${compatible ? '#9fffd0' : '#ffb0a7'}">${compatible ? 'compatible' : `needs ${ability.usageType}`}</span>`;
        card.appendChild(text);
        card.title = `${ability.description}\ncd ${ability.cooldown}s`;
        card.onclick = () => onQuickEquip({ kind: 'ability', id: ability.id });
        card.addEventListener('dragstart', (event) => {
          event.dataTransfer.setData('application/json', JSON.stringify({ kind: 'ability', id: ability.id }));
        });
        grid.appendChild(card);
      }
      wrapper.appendChild(grid);
      abilityList.appendChild(wrapper);
    }
  }

  renderElementLibrary() {
    const { elementPool } = this.refs;
    elementPool.innerHTML = '';
    const build = this.gameState.buildState;
    const title = document.createElement('div');
    title.innerHTML = `<strong>${build.buildName}</strong>`;
    elementPool.appendChild(title);
    const equipped = document.createElement('div');
    equipped.style.marginTop = '6px';
    equipped.textContent = `Equipped Abilities: ${build.equipped.length}/${this.data.hotbarSlotCount}`;
    elementPool.appendChild(equipped);

    if (build.activeSetBonuses.length > 0) {
      const bonusRow = document.createElement('div');
      bonusRow.style.marginTop = '8px';
      bonusRow.innerHTML = `<div style="opacity:0.8">Active Archetypes</div>${build.activeSetBonuses.map((bonus) => `<div class="chip">${bonus.name}</div>`).join('')}`;
      elementPool.appendChild(bonusRow);
    }

    if (build.synergyLabels.length > 0) {
      const synergyRow = document.createElement('div');
      synergyRow.style.marginTop = '8px';
      synergyRow.innerHTML = `<div style="opacity:0.8">Synergies</div>${build.synergyLabels.map((label) => `<div class="chip">${label}</div>`).join('')}`;
      elementPool.appendChild(synergyRow);
    }

    const chipRow = document.createElement('div');
    chipRow.style.marginTop = '8px';
    for (const elementId of this.elementSystem.getOwnedElements()) {
      const element = this.data.elements[elementId];
      if (!element) continue;
      const chip = document.createElement('div');
      chip.className = 'chip';
      chip.style.borderColor = `${element.color}66`;
      chip.textContent = `${element.name} ${build.elementCounts[elementId] || 0}/7`;
      chipRow.appendChild(chip);
    }
    elementPool.appendChild(chipRow);
  }

  slotKeyLabel(index) {
    return ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '='][index] || '?';
  }

  renderHotbar(combatSystem) {
    const { hotbar } = this.refs;
    hotbar.innerHTML = '';
    for (let index = 0; index < this.gameState.hotbarSlots.length; index += 1) {
      const slot = this.gameState.hotbarSlots[index];
      const node = document.createElement('div');
      node.style.cssText = `width:64px;height:64px;border:2px solid ${index === this.gameState.hotbarIndex ? '#fff2a8' : 'rgba(255,255,255,0.14)'};background:rgba(4,7,13,0.78);border-radius:8px;display:flex;align-items:center;justify-content:center;position:relative;color:#fff;box-shadow:${index === this.gameState.hotbarIndex ? '0 0 14px rgba(255,242,168,0.35)' : 'none'}`;
      node.onclick = () => { this.gameState.setHotbarIndex(index); this.renderHotbar(combatSystem); this.renderMenu(combatSystem); };
      node.addEventListener('dragover', (event) => { event.preventDefault(); node.style.outline = '2px dashed #ffffff'; });
      node.addEventListener('dragleave', () => { node.style.outline = 'none'; });
      node.addEventListener('drop', (event) => {
        event.preventDefault();
        node.style.outline = 'none';
        try {
          const payload = JSON.parse(event.dataTransfer.getData('application/json'));
          this.gameState.equipHotbar(index, payload);
          this.gameState.setHotbarIndex(index);
          this.renderHotbar(combatSystem);
          this.renderElementLibrary();
          this.renderMenu(combatSystem);
        } catch (error) {
          // Ignore malformed drag data.
        }
      });
      node.addEventListener('contextmenu', (event) => {
        event.preventDefault();
        this.gameState.clearHotbar(index);
        this.renderHotbar(combatSystem);
        this.renderElementLibrary();
        this.renderMenu(combatSystem);
      });

      if (slot?.id) {
        const icon = this.createIconCanvas(34);
        this.drawAbilityIcon(icon, slot.id, combatSystem, index === this.gameState.hotbarIndex);
        node.appendChild(icon);
      }

      const indexLabel = document.createElement('div');
      indexLabel.style.cssText = 'position:absolute;left:4px;top:4px;font-size:10px;opacity:0.7';
      indexLabel.textContent = this.slotKeyLabel(index);
      node.appendChild(indexLabel);

      const nameLabel = document.createElement('div');
      nameLabel.style.cssText = 'position:absolute;left:4px;right:4px;bottom:3px;font-size:8px;text-align:center;opacity:0.82';
      nameLabel.textContent = slot?.id ? this.elementSystem.getAbility(slot.id)?.name || '' : 'Empty';
      node.appendChild(nameLabel);

      hotbar.appendChild(node);
    }
  }

  renderPresets(player) {
    const { presets, visArms, visLegs } = this.refs;
    presets.innerHTML = '';
    Object.keys(localStorage).filter((key) => key.startsWith('elemental-visual-')).sort().forEach((key) => {
      const button = document.createElement('button');
      button.textContent = key.replace('elemental-visual-', '');
      button.style.margin = '4px';
      button.onclick = () => {
        const visuals = JSON.parse(localStorage.getItem(key));
        player.visuals.arms = visuals.arms;
        player.visuals.legs = visuals.legs;
        visArms.checked = player.visuals.arms;
        visLegs.checked = player.visuals.legs;
      };
      presets.appendChild(button);
    });
  }

  renderInventoryPanel() {
    const list = this.refs.inventoryList;
    if (!list) return;
    const orbEntries = Object.entries(this.gameState.inventory.orbs);
    const materialEntries = Object.entries(this.gameState.inventory.materials);
    list.innerHTML = '';

    const gear = document.createElement('div');
    gear.style.cssText = 'font-size:12px;opacity:0.85;margin-bottom:8px';
    gear.innerHTML = `Mode: <strong>${this.gameState.equipment.usageType}</strong>${this.gameState.equipment.itemId ? ` · Item ${this.gameState.equipment.itemId}` : ''}`;
    list.appendChild(gear);

    const orbTitle = document.createElement('div');
    orbTitle.style.cssText = 'opacity:0.75;font-size:12px';
    orbTitle.textContent = 'Orbs';
    list.appendChild(orbTitle);
    if (!orbEntries.length) {
      const empty = document.createElement('div');
      empty.style.cssText = 'font-size:12px;opacity:0.6;margin-top:4px';
      empty.textContent = 'No orbs yet';
      list.appendChild(empty);
    }
    orbEntries.forEach(([key, count]) => {
      const [elementId, rarity] = key.split(':');
      const row = document.createElement('div');
      row.className = 'chip';
      row.style.borderColor = `${this.data.elements[elementId]?.color || '#fff'}66`;
      row.textContent = `${this.data.elements[elementId]?.name || elementId} (${rarity}) x${count}`;
      list.appendChild(row);
    });

    const matTitle = document.createElement('div');
    matTitle.style.cssText = 'opacity:0.75;font-size:12px;margin-top:8px';
    matTitle.textContent = 'Materials';
    list.appendChild(matTitle);
    if (!materialEntries.length) {
      const empty = document.createElement('div');
      empty.style.cssText = 'font-size:12px;opacity:0.6;margin-top:4px';
      empty.textContent = 'No materials';
      list.appendChild(empty);
    }
    materialEntries.forEach(([id, count]) => {
      const row = document.createElement('div');
      row.style.cssText = 'font-size:12px;margin-top:2px';
      row.textContent = `${this.data.materials[id]?.name || id} x${count}`;
      list.appendChild(row);
    });
  }

  renderMachinePanel(entityManager) {
    const list = this.refs.machineList;
    if (!list) return;
    list.innerHTML = '';
    if (!entityManager || !entityManager.machineStructures.length) {
      list.textContent = 'No machines available';
      return;
    }
    entityManager.machineStructures.forEach((machine) => {
      const row = document.createElement('div');
      row.style.cssText = 'font-size:12px;margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid rgba(255,255,255,0.08)';
      row.innerHTML = `<strong>${machine.name}</strong><br><span style="opacity:0.7">${machine.machineType} · ${machine.core ? this.data.elements[machine.core.elementId].name : 'no core'}</span>`;
      const selector = document.createElement('select');
      selector.style.cssText = 'margin-top:4px;width:100%;background:#101726;color:#dce8ff;border:1px solid rgba(255,255,255,0.18);border-radius:6px;padding:4px';
      selector.innerHTML = '<option value="">select orb core</option>';
      Object.entries(this.gameState.inventory.orbs).forEach(([key, count]) => {
        const [elementId, rarity] = key.split(':');
        const option = document.createElement('option');
        option.value = key;
        option.textContent = `${this.data.elements[elementId]?.name || elementId} (${rarity}) x${count}`;
        selector.appendChild(option);
      });
      row.appendChild(selector);
      const button = document.createElement('button');
      button.style.marginTop = '4px';
      button.textContent = 'Socket Core';
      button.onclick = () => {
        if (!selector.value) return;
        const [elementId, rarity] = selector.value.split(':');
        if (entityManager.socketMachineCore(machine.id, elementId, rarity)) {
          this.renderMachinePanel(entityManager);
          this.renderInventoryPanel();
        }
      };
      row.appendChild(button);
      list.appendChild(row);
    });
  }

  renderSpawners(entityManager) {
    this.refs.spawnerList.innerHTML = entityManager.spawners.map((spawner) => `${spawner.id} ${Math.max(0, Math.ceil(spawner.hp))}/${spawner.maxHp}`).join('<br>');
    this.renderInventoryPanel();
    this.renderMachinePanel(entityManager);
  }

  renderMenu(combatSystem = null) {
    this.syncMenuVisibility();
    this.refs.uiLevel.textContent = String(this.gameState.playerStats.level);
    this.refs.uiEP.textContent = String(this.gameState.playerStats.elementPoints);
    const panel = this.refs.menuContent;
    panel.innerHTML = '';

    if (this.gameState.menuTab === 'shop') {
      const title = document.createElement('div');
      title.textContent = 'Element Shop & Meta Progression';
      panel.appendChild(title);
      const list = document.createElement('div');
      list.style.marginTop = '10px';
      for (const entry of this.elementSystem.getShopEntries()) {
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:center;gap:10px;margin-bottom:8px';
        row.innerHTML = `<div style="flex:1">${entry.name} <span style="opacity:0.7">(${entry.kind})</span></div>`;
        const button = document.createElement('button');
        button.textContent = `Buy ${entry.cost} EP`;
        button.onclick = () => this.handleShopPurchase(entry, combatSystem);
        row.appendChild(button);
        list.appendChild(row);
      }
      panel.appendChild(list);
      return;
    }

    if (this.gameState.menuTab === 'inventory') {
      const title = document.createElement('div');
      title.innerHTML = '<strong>Inventory</strong><div style="opacity:0.75;margin-top:4px">Consume orbs to increase element affinity and unlock stronger scaling.</div>';
      panel.appendChild(title);
      const orbRows = document.createElement('div');
      orbRows.style.marginTop = '10px';
      Object.entries(this.gameState.inventory.orbs).forEach(([key, count]) => {
        const [elementId, rarity] = key.split(':');
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:6px';
        row.innerHTML = `<div style="flex:1">${this.data.elements[elementId]?.name || elementId} orb (${rarity}) x${count}</div><div style="opacity:0.7">Affinity ${this.gameState.affinity[elementId] || 0}</div>`;
        const button = document.createElement('button');
        button.textContent = 'Consume';
        button.onclick = () => { if (this.gameState.consumeOrb(elementId, rarity)) { this.renderMenu(combatSystem); this.renderInventoryPanel(); this.renderElementLibrary(); } };
        row.appendChild(button);
        orbRows.appendChild(row);
      });
      if (!orbRows.children.length) {
        const empty = document.createElement('div');
        empty.style.opacity = '0.65';
        empty.textContent = 'No orbs in inventory';
        orbRows.appendChild(empty);
      }
      panel.appendChild(orbRows);
      return;
    }

    if (this.gameState.menuTab === 'crafting') {
      const title = document.createElement('div');
      title.innerHTML = '<strong>Crafting</strong><div style="opacity:0.75;margin-top:4px">Fixed recipes create base tools and weapons.</div>';
      panel.appendChild(title);
      const list = document.createElement('div');
      list.style.marginTop = '10px';
      for (const recipe of this.data.craftingRecipes) {
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:8px';
        const ingredients = recipe.ingredients.map((item) => `${item.id} x${item.count}`).join(', ');
        row.innerHTML = `<div style="flex:1"><strong>${recipe.name}</strong><br><span style="opacity:0.7">${recipe.itemType} · ${ingredients}</span></div>`;
        const button = document.createElement('button');
        button.textContent = 'Craft';
        button.disabled = !this.gameState.canCraftRecipe(recipe);
        button.onclick = () => {
          const crafted = this.gameState.craftRecipe(recipe.id);
          if (crafted) {
            this.gameState.equipItem(crafted.id);
            this.renderMenu(combatSystem);
            this.renderInventoryPanel();
          }
        };
        row.appendChild(button);
        list.appendChild(row);
      }
      panel.appendChild(list);
      return;
    }

    if (this.gameState.menuTab === 'alchemy') {
      const title = document.createElement('div');
      title.innerHTML = '<strong>Alchemy</strong><div style="opacity:0.75;margin-top:4px">Apply orb infusions to player or crafted items. Multi-element stacks are supported.</div>';
      panel.appendChild(title);
      const itemSelect = document.createElement('select');
      itemSelect.style.cssText = 'margin-top:10px;width:100%;background:#101726;color:#dce8ff;border:1px solid rgba(255,255,255,0.18);border-radius:6px;padding:6px';
      itemSelect.innerHTML = `<option value="player">Player</option>${this.gameState.inventory.items.map((item) => `<option value="${item.id}">${item.name} (${item.itemType})</option>`).join('')}`;
      panel.appendChild(itemSelect);
      const list = document.createElement('div');
      list.style.marginTop = '10px';
      Object.entries(this.gameState.inventory.orbs).forEach(([key, count]) => {
        const [elementId, rarity] = key.split(':');
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:6px';
        row.innerHTML = `<div style="flex:1">${this.data.elements[elementId]?.name || elementId} (${rarity}) x${count}</div>`;
        const button = document.createElement('button');
        button.textContent = 'Infuse';
        button.onclick = () => {
          const target = itemSelect.value;
          const targetKind = target === 'player' ? 'player' : 'item';
          const targetId = target === 'player' ? null : target;
          if (this.gameState.applyOrbInfusion(targetKind, targetId, elementId, rarity)) {
            this.renderMenu(combatSystem);
            this.renderInventoryPanel();
          }
        };
        row.appendChild(button);
        list.appendChild(row);
      });
      if (!list.children.length) {
        const empty = document.createElement('div');
        empty.style.opacity = '0.65';
        empty.textContent = 'No orbs available for infusion';
        list.appendChild(empty);
      }
      panel.appendChild(list);
      return;
    }

    if (this.gameState.menuTab === 'machines') {
      const title = document.createElement('div');
      title.innerHTML = '<strong>Machine Cores</strong><div style="opacity:0.75;margin-top:4px">Socket orbs into structures. Turrets fire at enemies, generators convert orbs to mana pulses.</div>';
      panel.appendChild(title);
      const mount = document.createElement('div');
      mount.id = 'machine-config-root';
      mount.style.marginTop = '10px';
      panel.appendChild(mount);
      return;
    }

    const build = this.gameState.buildState;
    const selected = this.gameState.getSelectedAbilityId() ? this.elementSystem.getAbility(this.gameState.getSelectedAbilityId()) : null;
    const header = document.createElement('div');
    header.innerHTML = `<strong>${build.buildName}</strong><div style="opacity:0.75;margin-top:4px">Abilities define the build. Drag any unlocked ability into the hotbar. Right click a hotbar slot to clear it.</div>`;
    panel.appendChild(header);

    const usageTypeRow = document.createElement('div');
    usageTypeRow.style.cssText = 'display:flex;gap:8px;align-items:center;margin-top:10px';
    usageTypeRow.innerHTML = '<div style="opacity:0.75">Weapon/Tool Type</div>';
    const usageSelect = document.createElement('select');
    usageSelect.style.cssText = 'background:#101726;color:#dce8ff;border:1px solid rgba(255,255,255,0.18);border-radius:6px;padding:5px';
    usageSelect.innerHTML = ['unarmed', 'melee', 'ranged', 'magic', 'tool'].map((item) => `<option value="${item}" ${this.gameState.equipment.usageType === item ? 'selected' : ''}>${item}</option>`).join('');
    usageSelect.onchange = () => {
      this.gameState.setUsageType(usageSelect.value);
      this.renderMenu(combatSystem);
      this.renderAbilityLibrary(combatSystem, (payload) => { this.gameState.equipHotbar(this.gameState.hotbarIndex, payload); this.renderHotbar(combatSystem); this.renderElementLibrary(); this.renderMenu(combatSystem); });
      this.renderInventoryPanel();
    };
    usageTypeRow.appendChild(usageSelect);
    panel.appendChild(usageTypeRow);

    // const selectedBlock = document.createElement('div');
    // selectedBlock.style.cssText = 'margin-top:12px;padding:10px;border:1px solid rgba(255,255,255,0.08);border-radius:8px';
    // selectedBlock.innerHTML = selected ? `<strong>Selected Slot: ${selected.name}</strong><br><span style="opacity:0.75">${selected.elementId} · ${selected.branchId} · ${selected.type}</span><br><span style="opacity:0.75">${selected.description}</span>` : 'Selected Slot: Empty';
    // panel.appendChild(selectedBlock);

    const summary = document.createElement('div');
    summary.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px';
    const equipped = document.createElement('div');
    equipped.style.cssText = 'padding:10px;border:1px solid rgba(255,255,255,0.08);border-radius:8px';
    equipped.innerHTML = `<strong>Equipped Abilities</strong><br>${build.equipped.map((ability) => `${ability.name} <span style="opacity:0.7">(${ability.elementId})</span>`).join('<br>') || 'None'}`;
    summary.appendChild(equipped);
    const synergy = document.createElement('div');
    synergy.style.cssText = 'padding:10px;border:1px solid rgba(255,255,255,0.08);border-radius:8px';
    synergy.innerHTML = `<strong>Synergies</strong><br>${build.synergyLabels.join('<br>') || 'No active synergies yet'}${build.activeSetBonuses.length ? `<br><br><strong>Archetype</strong><br>${build.activeSetBonuses.map((item) => item.name).join('<br>')}` : ''}`;
    summary.appendChild(synergy);
    panel.appendChild(summary);
  }

  handleShopPurchase(entry, combatSystem) {
    if (!this.gameState.spendElementPoint(entry.cost)) {
      this.gameState.notify('Not enough Element Points', '#ff8a8a', 1.3);
      return;
    }
    if (entry.kind === 'element') {
      this.elementSystem.unlockElement(entry.id);
      this.elementSystem.gainElement(entry.id);
      this.gameState.notify(`Unlocked ${entry.name}`, '#9fffd0', 1.6);
    } else {
      this.elementSystem.purchaseMetaUpgrade(entry.id);
      const upgrade = this.data.metaUpgrades.find((item) => item.id === entry.id);
      if (upgrade) this.gameState.applyPurchasedMetaUpgrade(upgrade.modifiers);
      this.gameState.notify(`Bought ${entry.name}`, '#9fffd0', 1.6);
    }
    this.gameState.recomputeBuildState();
    this.renderAbilityLibrary(combatSystem, (payload) => { this.gameState.equipHotbar(this.gameState.hotbarIndex, payload); this.renderHotbar(combatSystem); this.renderElementLibrary(); });
    this.renderElementLibrary();
    this.renderMenu(combatSystem);
  }

  renderDeathSummary() {
    this.syncDeathOverlay();
    if (!this.gameState.isDead || !this.gameState.deathSummary) return;
    const summary = this.gameState.deathSummary;
    this.refs.deathSummary.innerHTML = '';
    const title = document.createElement('div');
    title.innerHTML = `<strong>${summary.buildName}</strong><br><span style="opacity:0.75">${summary.timeSurvived.toFixed(1)}s survived · Level ${summary.levelReached} · ${summary.enemiesKilled} kills</span>`;
    this.refs.deathSummary.appendChild(title);

    const iconRow = document.createElement('div');
    iconRow.style.cssText = 'display:flex;gap:10px;align-items:center;margin-top:12px';
    for (const elementId of summary.mainElements.slice(0, 2)) {
      const icon = this.createIconCanvas(36);
      this.drawElementIcon(icon, elementId);
      iconRow.appendChild(icon);
    }
    this.refs.deathSummary.appendChild(iconRow);

    const lines = document.createElement('div');
    lines.style.marginTop = '12px';
    lines.innerHTML = [
      `Main Elements: ${summary.mainElements.map((id) => this.data.elements[id]?.name || id).join(', ') || 'None'}`,
      `Archetypes: ${summary.activeSetBonuses.join(', ') || 'None'}`,
      `Synergies: ${summary.synergyLabels.join(', ') || 'None'}`,
      `Reactions: ${summary.reactions.join(', ') || 'None'}`
    ].join('<br>');
    this.refs.deathSummary.appendChild(lines);

    const buildGrid = document.createElement('div');
    buildGrid.style.cssText = 'display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:12px';
    for (const ability of summary.buildAbilities) {
      const cell = document.createElement('div');
      cell.style.cssText = 'display:flex;gap:6px;align-items:center;padding:6px;border:1px solid rgba(255,255,255,0.08);border-radius:8px;background:rgba(255,255,255,0.04)';
      const icon = this.createIconCanvas(24);
      this.drawAbilityIcon(icon, ability.id, null, false);
      cell.appendChild(icon);
      const text = document.createElement('div');
      text.style.fontSize = '12px';
      text.innerHTML = `<strong>${ability.name}</strong><br><span style="opacity:0.75">${this.data.elements[ability.elementId].name}</span>`;
      cell.appendChild(text);
      buildGrid.appendChild(cell);
    }
    this.refs.deathSummary.appendChild(buildGrid);
  }

  drawHUD(ctx, canvas, entityManager, combatSystem) {
    const stats = this.gameState.playerStats;
    const selectedAbility = this.gameState.getSelectedAbilityId() ? this.elementSystem.getAbility(this.gameState.getSelectedAbilityId()) : null;
    const bars = [
      { label: 'HP', value: stats.hp / stats.maxHp, color: '#d42020' },
      { label: 'MP', value: stats.mp / stats.maxMp, color: '#2f65ff' },
      { label: 'ST', value: stats.stamina / stats.maxStamina, color: '#c6a300' },
      { label: `XP L${stats.level}`, value: stats.xp / stats.xpToNext, color: '#9f2cff' }
    ];
    let y = 12;
    for (const bar of bars) {
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(12, y, 260, 14);
      ctx.fillStyle = bar.color;
      ctx.fillRect(12, y, 260 * Math.max(0, Math.min(1, bar.value)), 14);
      ctx.fillStyle = '#ffffff';
      ctx.font = '11px sans-serif';
      ctx.fillText(bar.label, 16, y + 11);
      y += 20;
    }

    ctx.fillStyle = '#d7e1f1';
    ctx.font = '12px sans-serif';
    ctx.fillText(`Build: ${this.gameState.buildState.buildName}`, 12, y + 14);
    ctx.fillText(`Kills: ${this.gameState.runStats.kills}`, 12, y + 32);
    if (selectedAbility) {
    //   ctx.fillText(`Selected: ${selectedAbility.name}`, 12, y + 50);
    }
    if (this.gameState.buildState.synergyLabels.length > 0) {
      ctx.fillText(`Synergy: ${this.gameState.buildState.synergyLabels[0]}`, 12, y + 68);
    }
    const topAffinity = Object.entries(this.gameState.affinity || {}).sort((left, right) => right[1] - left[1])[0];
    if (topAffinity && topAffinity[1] > 0) {
      ctx.fillText(`Affinity: ${this.data.elements[topAffinity[0]].name} ${topAffinity[1]}`, 12, y + 86);
    }
    ctx.fillText(`Mode: ${this.gameState.equipment.usageType}`, 12, y + 104);

    const hudStartX = 12;
    const hudStartY = y + 120;
    this.gameState.hotbarSlots.slice(0, 6).forEach((slot, index) => {
      const x = hudStartX + index * 42;
      const icon = this.createIconCanvas(34);
      if (slot?.id) this.drawAbilityIcon(icon, slot.id, combatSystem, index === this.gameState.hotbarIndex);
      ctx.fillStyle = 'rgba(10,14,24,0.9)';
      ctx.fillRect(x, hudStartY, 34, 34);
      if (slot?.id) ctx.drawImage(icon, x, hudStartY);
      // Slot key labels removed — they overlapped the day/night indicator.
    });

    const boss = entityManager.enemies.find((enemy) => enemy.typeId === 'boss');
    if (boss) {
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(canvas.width * 0.22, 18, canvas.width * 0.56, 18);
      ctx.fillStyle = '#ff5e7f';
      ctx.fillRect(canvas.width * 0.22, 18, canvas.width * 0.56 * (boss.hp / boss.maxHp), 18);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText(`Boss: Singularity Warden - Phase ${boss.phase}`, canvas.width * 0.34, 31);
    }

    if (this.gameState.damageFlash > 0) {
      ctx.save();
      ctx.globalAlpha = this.gameState.damageFlash * 0.12;
      ctx.fillStyle = '#ff3a3a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
    }

    if (this.gameState.isPaused && !this.gameState.isDead) {
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.46)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 32px sans-serif';
      ctx.fillText(this.gameState.isMenuOpen ? 'MENU' : 'PAUSED', canvas.width * 0.45, canvas.height * 0.5);
      ctx.restore();
    }

    if (this.gameState.isDead) {
      ctx.save();
      ctx.globalAlpha = Math.min(0.8, this.gameState.deathFade);
      ctx.fillStyle = '#03050a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#ff6f88';
      ctx.font = 'bold 38px sans-serif';
      ctx.fillText('Run Ended', canvas.width * 0.42, canvas.height * 0.32);
      ctx.restore();
      this.renderDeathSummary();
    }

    for (let index = 0; index < this.gameState.notifications.length; index += 1) {
      const item = this.gameState.notifications[index];
      const alpha = 1 - item.age / item.lifetime;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = item.color;
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText(item.text, canvas.width - 320, 60 + index * 24 - item.age * 18);
      ctx.restore();
    }
  }
}