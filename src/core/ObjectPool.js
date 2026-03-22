export class ObjectPool {
  constructor(factory, reset) {
    this.factory = factory;
    this.reset = reset;
    this.items = [];
  }

  acquire() {
    return this.items.pop() || this.factory();
  }

  release(item) {
    this.reset(item);
    this.items.push(item);
  }
}
