// Declarative configuration: abilities, map, spawners
export const abilities = [
  { id: 'firebolt', name: 'Fire Bolt', type: 'fire', cooldown: 0.4, desc: 'Single fast bolt' },
  { id: 'explosion', name: 'Explosion', type: 'explosion', cooldown: 1.2, desc: 'AOE burst' },
  { id: 'shock', name: 'Shock', type: 'storm', cooldown: 0.8, desc: 'Chain lightning' },
  { id: 'incend', name: 'Incendiary', type: 'incendiary', cooldown: 1.0, desc: 'High single-target' }
];

export const mapConfig = {
  gridSize: 60,
  backgroundColor: '#0b0f1a'
};

// Spawner definitions: position (x,y) or edge. interval seconds.
export const spawners = [
  { id: 'left', x: -40, y: 200, interval: 2.5 },
  { id: 'right', x: () => window.innerWidth + 40, y: 300, interval: 2.8 },
  { id: 'top', x: 400, y: -40, interval: 3.2 }
];
