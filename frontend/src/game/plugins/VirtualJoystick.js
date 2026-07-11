import Phaser from 'phaser';

export default class VirtualJoystickScene extends Phaser.Scene {
  constructor() {
    super({ key: 'VirtualJoystickScene', active: false });
    this.vector = { x: 0, y: 0 };
    this.isDragging = false;
  }

  create() {
    // Positioning details (bottom-left)
    const x = 120;
    const y = 480;
    const outerRadius = 60;
    const innerRadius = 30;

    // Draw joystick base
    const baseGraphics = this.add.graphics();
    baseGraphics.fillStyle(0x333333, 0.4);
    baseGraphics.lineStyle(3, 0x999999, 0.8);
    baseGraphics.fillCircle(x, y, outerRadius);
    baseGraphics.strokeCircle(x, y, outerRadius);

    // Draw joystick knob (stick)
    const knob = this.add.graphics();
    knob.fillStyle(0xdd2233, 0.8); // Oxblood/reddish accent
    knob.fillCircle(0, 0, innerRadius);
    knob.setPosition(x, y);

    // Create an interactive zone over the base
    const hitArea = new Phaser.Geom.Circle(x, y, outerRadius * 1.5);
    const zone = this.add.zone(x, y, outerRadius * 3, outerRadius * 3)
      .setOrigin(0.5)
      .setInteractive(hitArea, Phaser.Geom.Circle.Contains);

    // Track input
    this.input.setDraggable(zone);

    zone.on('pointerdown', (pointer) => {
      this.isDragging = true;
      this.updateKnobPosition(pointer, x, y, outerRadius, knob);
    });

    this.input.on('pointermove', (pointer) => {
      if (!this.isDragging) return;
      this.updateKnobPosition(pointer, x, y, outerRadius, knob);
    });

    this.input.on('pointerup', () => {
      this.isDragging = false;
      knob.setPosition(x, y);
      this.vector = { x: 0, y: 0 };
      this.registry.set('joystickVector', this.vector);
    });

    // Share state initially
    this.registry.set('joystickVector', this.vector);
  }

  updateKnobPosition(pointer, baseX, baseY, maxDistance, knob) {
    const angle = Phaser.Math.Angle.Between(baseX, baseY, pointer.x, pointer.y);
    const distance = Phaser.Math.Distance.Between(baseX, baseY, pointer.x, pointer.y);

    const targetDistance = Math.min(distance, maxDistance);
    const targetX = baseX + Math.cos(angle) * targetDistance;
    const targetY = baseY + Math.sin(angle) * targetDistance;

    knob.setPosition(targetX, targetY);

    // Calculate normalized output vector
    const normalizedDistance = targetDistance / maxDistance;
    this.vector = {
      x: Math.cos(angle) * normalizedDistance,
      y: Math.sin(angle) * normalizedDistance
    };
    this.registry.set('joystickVector', this.vector);
  }
}
