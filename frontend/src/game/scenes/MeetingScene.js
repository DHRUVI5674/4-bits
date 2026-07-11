import Phaser from 'phaser';

export default class MeetingScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MeetingScene' });
    this.avatarsMap = new Map();
    this.socket = null;
    this.roomCode = null;
    this.playerId = null;
    this.players = [];
    this.clues = [];
    this.lastPositions = {};
    this.seatAssignments = {};
    this.revealPolicy = 'immediate';
    this.voiceParticipants = {};
    this.isVotingMode = false;
    this.hasVoted = false;
    
    // Seat locations
    this.seatPositions = [];
  }

  init(data) {
    this.socket = data.socket;
    this.roomCode = data.roomCode;
    this.playerId = data.playerId;
    this.players = data.players || [];
    this.clues = data.clues || [];
    this.lastPositions = data.lastPositions || {};
    this.seatAssignments = data.seatAssignments || {};
    this.revealPolicy = data.revealPolicy || 'immediate';
    this.voiceParticipants = data.voiceParticipants || {};
  }

  create() {
    const centerX = 400;
    const centerY = 270;
    const rx = 220;
    const ry = 110;

    // 1. Draw Table and Ambient Noir Lighting Vignette
    const bgGfx = this.add.graphics();
    bgGfx.fillStyle(0x0a0809, 1);
    bgGfx.fillRect(0, 0, 800, 600);

    // Draw aged wood oval table
    const tableGfx = this.add.graphics();
    tableGfx.fillStyle(0x271c19, 1); // Dark rich mahogany wood
    tableGfx.lineStyle(6, 0xb45309, 1); // Brass detailing
    tableGfx.fillEllipse(centerX, centerY, rx * 1.6, ry * 1.6);
    tableGfx.strokeEllipse(centerX, centerY, rx * 1.6, ry * 1.6);

    // Inner shadow table groove
    tableGfx.fillStyle(0x18110f, 0.4);
    tableGfx.fillEllipse(centerX, centerY, rx * 1.3, ry * 1.3);

    // Draw spotlight effect vignette
    this.vignette = this.add.graphics();
    this.vignette.fillStyle(0x000000, 0.45);
    this.vignette.fillRect(0, 0, 800, 600);

    // 2. Shared Case Summary Panel (parchment clipboard) in the center of the table
    const docGfx = this.add.graphics();
    docGfx.fillStyle(0xe2e0d9, 0.95); // Parchment paper
    docGfx.lineStyle(2, 0x854d0e, 1); // Brass border
    docGfx.fillRoundedRect(centerX - 110, centerY - 50, 220, 100, 4);
    docGfx.strokeRoundedRect(centerX - 110, centerY - 50, 220, 100, 4);

    this.add.text(centerX, centerY - 40, "DISCOVERED EVIDENCE", {
      fontSize: '9px',
      fontFamily: 'Courier Prime, Courier, monospace',
      color: '#713f12',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const clueTitles = this.clues.map(c => `• ${c.title || c.name}`).slice(0, 4).join('\n') || "No evidence discovered yet.";
    this.add.text(centerX - 95, centerY - 25, clueTitles, {
      fontSize: '8px',
      fontFamily: 'Courier Prime, Courier, monospace',
      color: '#1c1917',
      lineSpacing: 4,
      wordWrap: { width: 190 }
    });

    // 3. Layout seat positions
    const numSeats = Math.max(this.players.length, 5);
    for (let i = 0; i < numSeats; i++) {
      const angle = (i / numSeats) * Math.PI * 2 - Math.PI / 2;
      const x = centerX + Math.cos(angle) * rx;
      const y = centerY + Math.sin(angle) * ry;
      this.seatPositions.push({ x, y });
    }

    // 4. Spawn Seated Avatars
    this.players.forEach((p, idx) => {
      const pId = p.id || p.playerId;
      const seatIdx = this.seatAssignments[pId] !== undefined ? this.seatAssignments[pId] : idx;
      const seatPos = this.seatPositions[seatIdx] || { x: centerX, y: centerY + 180 };
      const lastPos = this.lastPositions[pId] || { x: centerX, y: centerY + 180 };

      // Avatar Container
      const container = this.add.container(lastPos.x, lastPos.y);

      // Speaking glowing pulsing circle behind player
      const speakRing = this.add.graphics();
      speakRing.lineStyle(3, 0x22c55e, 1);
      speakRing.strokeCircle(0, 0, 24);
      speakRing.setVisible(false);
      container.add(speakRing);
      container.speakRing = speakRing;

      // Player body sprite
      const tintColor = this.getColorFromId(pId);
      const sprite = this.add.sprite(0, 0, 'character_spritesheet', 0);
      sprite.setScale(1.8);
      sprite.setTint(tintColor);
      container.add(sprite);
      container.sprite = sprite;

      // Player name label
      const nameTxt = this.add.text(0, -32, p.name, {
        fontSize: '9px',
        color: '#ffffff',
        backgroundColor: 'rgba(0,0,0,0.65)',
        padding: { x: 4, y: 1 }
      }).setOrigin(0.5);
      container.add(nameTxt);

      // Role subtitle label
      const isMe = pId === this.playerId;
      const roleTxt = this.add.text(0, 26, isMe ? 'YOU' : '', {
        fontSize: '8px',
        color: isMe ? '#fbbf24' : '#9ca3af',
        backgroundColor: 'rgba(0,0,0,0.65)',
        padding: { x: 3, y: 0.5 }
      }).setOrigin(0.5);
      container.add(roleTxt);
      container.roleTxt = roleTxt;

      // Animate transition from last position to oval seat
      this.tweens.add({
        targets: container,
        x: seatPos.x,
        y: seatPos.y,
        duration: 1400,
        ease: 'Cubic.easeOut'
      });

      this.avatarsMap.set(pId, container);
    });

    // 5. Abstain Button (only visible in voting mode)
    this.abstainBtn = this.add.text(centerX, centerY + 175, "ABSTAIN", {
      fontSize: '11px',
      color: '#ffffff',
      backgroundColor: '#78716c',
      padding: { x: 10, y: 5 },
      fontStyle: 'bold'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setVisible(false);

    this.abstainBtn.on('pointerdown', () => {
      this.submitVote('abstain');
    });

    // 6. Socket listeners for voting and speaking activity
    if (this.socket) {
      this.socket.on('meeting:vote-updated', (data) => {
        // Show tick next to players who already voted
        data.votedPlayerIds.forEach(voterId => {
          const avatar = this.avatarsMap.get(voterId);
          if (avatar && !avatar.votedTick) {
            const tick = this.add.text(18, -18, "✓", {
              fontSize: '11px',
              color: '#22c55e',
              fontStyle: 'bold'
            }).setOrigin(0.5);
            avatar.add(tick);
            avatar.votedTick = tick;
          }
        });
      });

      this.socket.on('vote:resolved', (data) => {
        this.resolveVotingReveal(data);
      });

      this.socket.on('voice:participants-updated', (participants) => {
        this.voiceParticipants = participants;
      });

      this.socket.on('chat:received', (msg) => {
        this.displaySpeechBubble(msg.senderId, msg.text);
      });
    }

    // Set transition trigger
    this.game.events.on('toggle-voting', (votingOn) => {
      if (votingOn) this.enterVotingPhase();
    });
  }

  update(time) {
    // Pulse speaking glow effect for voice participants who are active
    this.avatarsMap.forEach((avatar, pId) => {
      const isVoiceActive = this.voiceParticipants[pId];
      if (isVoiceActive) {
        avatar.speakRing.setVisible(true);
        avatar.speakRing.setScale(1 + Math.sin(time / 80) * 0.08);
      } else {
        avatar.speakRing.setVisible(false);
      }
    });
  }

  enterVotingPhase() {
    if (this.isVotingMode) return;
    this.isVotingMode = true;

    // Show abstain button if local player has not voted yet
    if (this.players.some(p => (p.id || p.playerId) === this.playerId)) {
      this.abstainBtn.setVisible(true);
    }

    // Render "VOTE" buttons underneath other players' seats
    this.avatarsMap.forEach((avatar, targetPlayerId) => {
      // Don't render vote button under yourself or if eliminated
      if (targetPlayerId === this.playerId) return;

      const voteBtn = this.add.text(0, 42, "VOTE", {
        fontSize: '9px',
        color: '#ffffff',
        backgroundColor: '#7f1d1d',
        padding: { x: 5, y: 2.5 }
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });

      voteBtn.on('pointerdown', () => {
        this.submitVote(targetPlayerId);
      });

      avatar.add(voteBtn);
      avatar.voteBtn = voteBtn;
    });
  }

  submitVote(targetPlayerId) {
    if (this.hasVoted) return;
    this.hasVoted = true;

    // Emit vote via socket
    if (this.socket) {
      this.socket.emit('meeting:vote', { targetId: targetPlayerId });
    }

    // Hide vote buttons
    this.abstainBtn.setVisible(false);
    this.avatarsMap.forEach(avatar => {
      if (avatar.voteBtn) avatar.voteBtn.destroy();
    });
  }

  resolveVotingReveal(data) {
    const { votes, eliminatedId, eliminatedRole } = data;

    // Play a dramatic spotlight effect on the eliminated seat
    const spotlight = this.add.graphics();
    spotlight.fillStyle(0xfef08a, 0.25); // Yellow glow
    spotlight.lineStyle(3, 0xfacc15, 0.85);

    if (eliminatedId) {
      const avatar = this.avatarsMap.get(eliminatedId);
      if (avatar) {
        const ax = avatar.x;
        const ay = avatar.y;
        
        spotlight.fillCircle(ax, ay, 40);
        spotlight.strokeCircle(ax, ay, 40);
        
        // Flip card 3D effect: scale container X to 0, update text/texture, and scale back to 1
        this.tweens.add({
          targets: avatar,
          scaleX: 0,
          duration: 650,
          yoyo: true,
          onYoyo: () => {
            // Gray out eliminated player avatar
            avatar.sprite.setTint(0x4b5563);
            if (eliminatedRole) {
              avatar.roleTxt.setText(`ELIMINATED: ${eliminatedRole.occupation}`).setColor('#ef4444');
            } else {
              avatar.roleTxt.setText(`ELIMINATED`).setColor('#9ca3af');
            }
          },
          onComplete: () => {
            spotlight.destroy();
          }
        });
      }
    } else {
      // Tie / No elimination message
      const tieTxt = this.add.text(400, 380, "TIE VOTE - NO ELIMINATION", {
        fontSize: '16px',
        fontFamily: 'Special Elite, monospace',
        color: '#f87171',
        backgroundColor: '#000000',
        padding: { x: 12, y: 6 }
      }).setOrigin(0.5);

      this.tweens.add({
        targets: tieTxt,
        alpha: { from: 1, to: 0 },
        delay: 3000,
        duration: 800,
        onComplete: () => {
          tieTxt.destroy();
        }
      });
    }
  }

  displaySpeechBubble(senderId, text) {
    const avatar = this.avatarsMap.get(senderId);
    if (!avatar) return;

    if (avatar.speechBubble) avatar.speechBubble.destroy();

    const bubble = this.add.text(0, -60, text, {
      fontSize: '8px',
      fontFamily: 'Courier Prime, Courier, monospace',
      color: '#ffffff',
      backgroundColor: '#1c1917',
      padding: { x: 5, y: 3 },
      wordWrap: { width: 100 }
    }).setOrigin(0.5);

    avatar.add(bubble);
    avatar.speechBubble = bubble;

    this.time.delayedCall(4000, () => {
      if (bubble.active) bubble.destroy();
    });
  }

  getColorFromId(id) {
    if (!id) return 0xffffff;
    let hash = 0;
    const idStr = String(id);
    for (let i = 0; i < idStr.length; i++) {
      hash = idStr.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colors = [
      0xef4444, 0x3b82f6, 0x10b981, 0xf59e0b,
      0x8b5cf6, 0xec4899, 0x06b6d4, 0x14b8a6
    ];
    return colors[Math.abs(hash) % colors.length];
  }

  shutdown() {
    if (this.socket) {
      this.socket.off('meeting:vote-updated');
      this.socket.off('vote:resolved');
      this.socket.off('voice:participants-updated');
      this.socket.off('chat:received');
    }
  }
}
