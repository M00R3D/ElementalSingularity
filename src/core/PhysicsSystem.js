import { COLLISION_DEBUG_COLORS, COLLISION_SETTINGS } from './PhysicsConfig.js';

export class PhysicsSystem {
  constructor({ getWorldBounds, getStaticBodies, getDynamicBodies } = {}) {
    this.getWorldBounds = getWorldBounds || (() => ({ width: 0, height: 0 }));
    this.getStaticBodies = getStaticBodies || (() => []);
    this.getDynamicBodies = getDynamicBodies || (() => []);
  }

  getBodyHitboxes(body) {
    if (!body) return [];
    if (typeof body.getHitboxes === 'function') {
      return body.getHitboxes();
    }

    const offsets = body.hitboxOffsets || [{ x: 0, y: 0 }];
    const radii = body.hitboxRadii || [body.radius || 8];
    const zOffsets = body.hitboxZOffsets || new Array(offsets.length).fill(0);
    const heights = body.hitboxHeights || new Array(offsets.length).fill(body.height || body.radius || 8);
    const bodyZ = body.z || 0;

    return offsets.map((offset, index) => ({
      x: body.x + (offset.x || 0),
      y: body.y + (offset.y || 0),
      z: bodyZ + (zOffsets[index] || 0),
      radius: radii[index] || body.radius || 8,
      height: heights[index] || body.height || body.radius || 8
    }));
  }

  moveBody(body, dx, dy) {
    if (!body || (!dx && !dy)) return;
    body.x += dx;
    body.y += dy;
  }

  clampBodyToWorld(body) {
    if (!body) return;
    const { width, height } = this.getWorldBounds();
    const radii = body.hitboxRadii || [body.radius || 0];
    const maxRadius = Math.max(body.radius || 0, ...radii, 0);
    body.x = Math.max(maxRadius, Math.min(width - maxRadius, body.x));
    body.y = Math.max(maxRadius, Math.min(height - maxRadius, body.y));
  }

  hitboxesOverlap(hitboxA, hitboxB) {
    const dx = hitboxB.x - hitboxA.x;
    const dy = hitboxB.y - hitboxA.y;
    const dist = Math.hypot(dx, dy);
    const minDist = hitboxA.radius + hitboxB.radius;
    if (dist >= minDist) return null;

    const bottomA = hitboxA.z || 0;
    const topA = bottomA + (hitboxA.height || 0);
    const bottomB = hitboxB.z || 0;
    const topB = bottomB + (hitboxB.height || 0);
    if (Math.min(topA, topB) <= Math.max(bottomA, bottomB)) {
      return null;
    }

    return { dx, dy, dist, overlap: minDist - dist };
  }

  resolveCollisionPair(bodyA, bodyB, shareA = 0.5, shareB = 0.5) {
    let resolved = false;
    const hitboxesA = this.getBodyHitboxes(bodyA);
    const hitboxesB = this.getBodyHitboxes(bodyB);

    for (const hitboxA of hitboxesA) {
      for (const hitboxB of hitboxesB) {
        const overlap = this.hitboxesOverlap(hitboxA, hitboxB);
        if (!overlap) continue;

        const nx = overlap.dist > 0.0001 ? overlap.dx / overlap.dist : 1;
        const ny = overlap.dist > 0.0001 ? overlap.dy / overlap.dist : 0;
        if (shareA > 0) this.moveBody(bodyA, -nx * overlap.overlap * shareA, -ny * overlap.overlap * shareA);
        if (shareB > 0) this.moveBody(bodyB, nx * overlap.overlap * shareB, ny * overlap.overlap * shareB);
        resolved = true;
      }
    }

    return resolved;
  }

  resolveWorldCollisions() {
    const dynamicBodies = this.getDynamicBodies().filter((body) => body && !body.dead && body.isAlive !== false);
    const staticBodies = this.getStaticBodies().filter(Boolean);

    for (let iteration = 0; iteration < COLLISION_SETTINGS.resolutionIterations; iteration++) {
      for (const body of dynamicBodies) {
        for (const obstacle of staticBodies) {
          this.resolveCollisionPair(body, obstacle, 1, 0);
        }
        this.clampBodyToWorld(body);
      }

      for (let i = 0; i < dynamicBodies.length; i++) {
        const left = dynamicBodies[i];
        for (let j = i + 1; j < dynamicBodies.length; j++) {
          this.resolveCollisionPair(left, dynamicBodies[j], 0.5, 0.5);
        }
      }
    }
  }

  getHitboxColor(body) {
    return COLLISION_DEBUG_COLORS[body.collisionKind || body.kind] || COLLISION_DEBUG_COLORS.default;
  }

  drawHitboxOverlay(ctx, camera) {
    const bodies = [
      ...this.getStaticBodies(),
      ...this.getDynamicBodies().filter((body) => body && !body.dead && body.isAlive !== false)
    ];

    ctx.save();
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 4]);
    for (const body of bodies) {
      const color = this.getHitboxColor(body);
      for (const hitbox of this.getBodyHitboxes(body)) {
        if (!camera.isVisible(hitbox.x, hitbox.y, hitbox.radius + 8)) continue;
        const screenX = hitbox.x - camera.x;
        const screenY = hitbox.y - camera.y - (hitbox.z || 0);
        ctx.strokeStyle = color;
        ctx.beginPath();
        ctx.arc(screenX, screenY, hitbox.radius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = color;
        ctx.fillRect(screenX - 1.5, screenY - 1.5, 3, 3);
      }
    }
    ctx.restore();
  }
}

export default PhysicsSystem;