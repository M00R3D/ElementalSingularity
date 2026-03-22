export class ElementSystem{
  constructor(){
    this.elements = ['Fire'];
    this.base = ['Fire','Air','Electricity'];
    this.pickupTimer = 0; this.pickupInterval = 8;
  }
  update(dt){
    this.pickupTimer += dt;
    if(this.pickupTimer >= this.pickupInterval){ this.pickupTimer = 0; this.addRandomElement(); }
  }
  addRandomElement(){
    const e = this.base[Math.floor(Math.random()*this.base.length)];
    if(!this.elements.includes(e)) this.elements.push(e);
    else if(Math.random()<0.25) this.elements.push(e);
  }
  getAttackType(){
    const has = n=> this.elements.includes(n);
    if(has('Fire') && has('Air')) return 'explosion';
    if(has('Fire') && has('Electricity')) return 'incendiary';
    if(has('Air') && has('Electricity')) return 'storm';
    if(has('Fire')) return 'fire';
    return 'physical';
  }
}
