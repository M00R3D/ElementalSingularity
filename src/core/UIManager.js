export class UIManager {
  constructor(data, gameState, elementSystem) {
    this.data = data;
    this.gameState = gameState;
    this.elementSystem = elementSystem;
    this.refs = this.createRefs();
    this.dragPayload = null;
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
      closeMenu: document.getElementById('closeMenu'),
      uiLevel: document.getElementById('ui-level'),
      uiEP: document.getElementById('ui-ep'),
      visArms: document.getElementById('vis-arms'),
      visLegs: document.getElementById('vis-legs'),
      presets: document.getElementById('presets'),
      savePreset: document.getElementById('savePreset'),
      spawnerList: document.getElementById('spawnerList')
    };
  }

  bind(player) {
    const refs = this.refs;
    refs.tabShop.onclick = () => {
      this.gameState.setMenuTab('shop');
      this.renderMenu();
    };
    refs.tabEquip.onclick = () => {
      this.gameState.setMenuTab('equip');
      this.renderMenu();
    };
    refs.closeMenu.onclick = () => {
      this.gameState.toggleMenu();
      this.syncMenuVisibility();
    };

    refs.visArms.checked = player.visuals.arms;
    refs.visLegs.checked = player.visuals.legs;
    refs.visArms.onchange = () => { player.visuals.arms = refs.visArms.checked; };
    refs.visLegs.onchange = () => { player.visuals.legs = refs.visLegs.checked; };
    refs.savePreset.onclick = () => {
      const name = prompt('Preset name');
      if (!name) return;
      localStorage.setItem(`elemental-visual-${name}`, JSON.stringify(player.visuals));
      this.renderPresets(player);
    };
  }

  syncMenuVisibility() {
    this.refs.menuOverlay.style.display = this.gameState.isMenuOpen ? 'block' : 'none';
  }

  renderAbilityLibrary(onQuickEquip) {
    const { abilityList } = this.refs;
    abilityList.innerHTML = '';
    for (const ability of this.data.abilities) {
      const card = document.createElement('div');
      card.textContent = ability.name;
      card.draggable = true;
      card.style.cssText = 'display:inline-block;margin:4px;padding:6px 8px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12);border-radius:6px;cursor:grab';
      card.title = `${ability.attackType}  cd ${ability.cooldown}s`;
      card.addEventListener('dragstart', (event) => {
        event.dataTransfer.setData('application/json', JSON.stringify({ kind: 'ability', id: ability.id }));
      });
      card.onclick = () => onQuickEquip({ kind: 'ability', id: ability.id });
      abilityList.appendChild(card);
    }
  }

  renderElementLibrary(onQuickEquip) {
    const { elementPool } = this.refs;
    elementPool.innerHTML = '';
    for (const elementId of this.elementSystem.getOwnedElements()) {
      const element = this.data.elements[elementId];
      const item = document.createElement('div');
      item.textContent = element.name;
      item.draggable = true;
      item.style.cssText = `display:inline-block;margin:4px;padding:6px 8px;background:${element.color}22;border:1px solid ${element.color}55;border-radius:6px;cursor:grab`;
      item.addEventListener('dragstart', (event) => {
        event.dataTransfer.setData('application/json', JSON.stringify({ kind: 'element', id: element.id }));
      });
      item.onclick = () => onQuickEquip({ kind: 'element', id: element.id });
      elementPool.appendChild(item);
    }
  }

  renderHotbar() {
    const { hotbar } = this.refs;
    hotbar.innerHTML = '';
    for (let index = 0; index < this.gameState.hotbarSlots.length; index += 1) {
      const slot = this.gameState.hotbarSlots[index];
      const item = slot ? this.describeSlot(slot) : null;
      const node = document.createElement('div');
      node.style.cssText = `width:56px;height:56px;border:2px solid ${index === this.gameState.hotbarIndex ? '#fff2a8' : 'rgba(255,255,255,0.14)'};background:rgba(4,7,13,0.78);border-radius:8px;display:flex;align-items:center;justify-content:center;position:relative;color:#fff;box-shadow:${index === this.gameState.hotbarIndex ? '0 0 14px rgba(255,242,168,0.35)' : 'none'}`;
      node.dataset.index = String(index);
      node.addEventListener('click', () => {
        this.gameState.setHotbarIndex(index);
        this.renderHotbar();
      });
      node.addEventListener('dragover', (event) => {
        event.preventDefault();
        node.style.outline = '2px dashed #ffffff';
      });
      node.addEventListener('dragleave', () => {
        node.style.outline = 'none';
      });
      node.addEventListener('drop', (event) => {
        event.preventDefault();
        node.style.outline = 'none';
        try {
          const payload = JSON.parse(event.dataTransfer.getData('application/json'));
          this.gameState.equipHotbar(index, payload);
          this.gameState.setHotbarIndex(index);
          this.renderHotbar();
          this.renderMenu();
        } catch (error) {
          // Ignore invalid drag payloads.
        }
      });

      const label = document.createElement('div');
      label.style.cssText = 'text-align:center;font-size:11px;line-height:1.15;padding:6px;pointer-events:none';
      label.textContent = item ? item.shortName : '';
      node.appendChild(label);

      const indexLabel = document.createElement('div');
      indexLabel.style.cssText = 'position:absolute;left:4px;top:4px;font-size:10px;opacity:0.7';
      indexLabel.textContent = String(index + 1);
      node.appendChild(indexLabel);

      hotbar.appendChild(node);
    }
  }

  describeSlot(slot) {
    if (slot.kind === 'ability') {
      const ability = this.data.abilities.find((item) => item.id === slot.id);
      return { name: ability.name, shortName: ability.name.replace(/\s+/g, '\n') };
    }

    const element = this.data.elements[slot.id];
    return { name: element.name, shortName: element.name };
  }

  renderPresets(player) {
    const { presets, visArms, visLegs } = this.refs;
    presets.innerHTML = '';
    Object.keys(localStorage)
      .filter((key) => key.startsWith('elemental-visual-'))
      .sort()
      .forEach((key) => {
        const button = document.createElement('button');
        button.textContent = key.replace('elemental-visual-', '');
        button.style.margin = '4px';
        button.onclick = () => {
          const visuals = JSON.parse(localStorage.getItem(key));
          Object.assign(player.visuals, visuals);
          visArms.checked = player.visuals.arms;
          visLegs.checked = player.visuals.legs;
        };
        presets.appendChild(button);
      });
  }

  renderSpawners(entityManager) {
    this.refs.spawnerList.innerHTML = entityManager.spawners
      .map((spawner) => `${spawner.id} ${Math.max(0, Math.ceil(spawner.hp))}/${spawner.maxHp}`)
      .join('<br>');
  }

  renderMenu() {
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
      for (const entry of this.elementSystem.getShopEntries(this.gameState)) {
        const row = document.createElement('div');
        row.style.marginBottom = '8px';
        row.textContent = `${entry.name} (${entry.kind}) `;
        const button = document.createElement('button');
        button.textContent = `Buy ${entry.cost} EP`;
        button.onclick = () => this.handleShopPurchase(entry);
        row.appendChild(button);
        list.appendChild(row);
      }
      panel.appendChild(list);
    } else {
      const title = document.createElement('div');
      title.textContent = 'Hotbar Loadout';
      panel.appendChild(title);
      const help = document.createElement('div');
      help.style.marginTop = '10px';
      help.style.opacity = '0.85';
      help.textContent = 'Arrastra habilidades o elementos a la hotbar. Usa rueda del mouse, click o teclas 1-9 para cambiar slot.';
      panel.appendChild(help);
      const preview = document.createElement('div');
      preview.style.marginTop = '12px';
      preview.innerHTML = this.gameState.hotbarSlots.map((slot, index) => `${index + 1}: ${slot ? this.describeSlot(slot).name : 'Vacío'}`).join('<br>');
      panel.appendChild(preview);
    }
  }

  handleShopPurchase(entry) {
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
      if (upgrade) {
        this.gameState.applyPurchasedMetaUpgrade(upgrade.modifiers);
      }
      this.gameState.notify(`Bought ${entry.name}`, '#9fffd0', 1.6);
    }

    this.renderElementLibrary((payload) => {
      this.gameState.equipHotbar(this.gameState.hotbarIndex, payload);
      this.renderHotbar();
    });
    this.renderMenu();
  }

  drawHUD(ctx, canvas, entityManager, combatSystem) {
    const stats = this.gameState.playerStats;
    const selected = combatSystem.getSelectedProfile();
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
    ctx.fillText(`Elements: ${this.elementSystem.getOwnedElements().map((id) => this.data.elements[id].name).join(', ')}`, 12, y + 12);
    ctx.fillText(`Selected: ${selected ? selected.name : 'None'}`, 12, y + 30);
    ctx.fillText(`Run Upgrades: ${Object.keys(this.gameState.runUpgrades).join(', ') || 'None'}`, 12, y + 48);

    const boss = entityManager.enemies.find((enemy) => enemy.typeId === 'boss');
    if (boss) {
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(canvas.width * 0.22, 18, canvas.width * 0.56, 18);
      ctx.fillStyle = '#ff5e7f';
      ctx.fillRect(canvas.width * 0.22, 18, canvas.width * 0.56 * (boss.hp / boss.maxHp), 18);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText(`Boss: Harmonic Titan - Phase ${boss.phase}`, canvas.width * 0.36, 31);
    }

    if (this.gameState.damageFlash > 0) {
      ctx.save();
      ctx.globalAlpha = this.gameState.damageFlash * 0.12;
      ctx.fillStyle = '#ff3a3a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
    }

    if (this.gameState.isPaused) {
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.46)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 32px sans-serif';
      ctx.fillText(this.gameState.isMenuOpen ? 'MENU' : 'PAUSED', canvas.width * 0.45, canvas.height * 0.5);
      ctx.restore();
    }

    for (let index = 0; index < this.gameState.notifications.length; index += 1) {
      const item = this.gameState.notifications[index];
      const alpha = 1 - item.age / item.lifetime;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = item.color;
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText(item.text, canvas.width - 260, 60 + index * 24 - item.age * 18);
      ctx.restore();
    }
  }
}
