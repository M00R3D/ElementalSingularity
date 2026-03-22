// ========================================
// DayNightCycle - Time System
// Tracks day/night with glow effects
// ========================================

export class DayNightCycle {
  constructor(cycleDurationSeconds = 200) {
    this.cycleDuration = cycleDurationSeconds;
    this.elapsed = 0;
    this.isNight = false;
    this.glowIntensity = 0; // 0-1, higher at night
  }

  update(dt) {
    this.elapsed += dt;
    
    // Loop cycle
    if (this.elapsed >= this.cycleDuration) {
      this.elapsed = 0;
    }

    // Calculate phase: 0-1 across full cycle
    const phase = this.elapsed / this.cycleDuration;

    // Night: 0.3-0.7 (middle 40% of cycle)
    // Smooth sine wave for glow
    const nightStart = 0.3;
    const nightEnd = 0.7;

    if (phase >= nightStart && phase <= nightEnd) {
      this.isNight = true;
      // Peak glow at 0.5 (middle of night)
      const nightPhase = (phase - nightStart) / (nightEnd - nightStart);
      this.glowIntensity = Math.sin(nightPhase * Math.PI); // 0->1->0
    } else {
      this.isNight = false;
      this.glowIntensity = 0;
    }
  }

  // Returns sky color based on time
  getSkyColor() {
    if (!this.isNight) {
      return 'rgba(40, 60, 80, 0.3)'; // Day: light blue
    }
    const darkness = 0.4 + this.glowIntensity * 0.2;
    return `rgba(10, 15, 30, ${darkness})`; // Night: dark blue-black
  }

  // Returns ambient light multiplier (darker at night)
  getAmbientLight() {
    if (!this.isNight) return 1.0;
    return 0.4; // 40% brightness at night
  }

  getTimePercentage() {
    return (this.elapsed / this.cycleDuration);
  }

  getTimeString() {
    const hours = Math.floor((this.getTimePercentage() * 24) % 24);
    const minutes = Math.floor(((this.getTimePercentage() * 24) % 1) * 60);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }
}

export default DayNightCycle;
