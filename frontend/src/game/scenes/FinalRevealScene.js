import Phaser from 'phaser';

// ---------------------------------------------------------------------------
// FinalRevealScene
// ---------------------------------------------------------------------------
// Handles both end-game outcomes with a shared 4-second misdirection beat,
// then branches into the Investigators Win or Killer Wins sequence.
//
// init() data shape:
//   outcome          "investigators_win" | "killer_wins"
//   accusedId        playerId of the person voted out
//   actualKillerId   playerId of the true murderer
//   killerName       string
//   killerOccupation string
//   killerMotive     string (motiveSummary)
//   murderWeapon     string
//   victim           string
//   location         string
//   causeOfDeath     string
//   timeOfDeath      string
//   roundNumber      number
//   allPlayers       [{ playerId, name, characterName, occupation, isMurderer, isEliminated }]
//   epilogueText     string (fetched from /api/games/:code/epilogue)
//   roundEvents      string[] (fetched from same endpoint)
//   isMuted          boolean (snapshot of mute state)
//   roomCode         string
// ---------------------------------------------------------------------------

export default class FinalRevealScene extends Phaser.Scene {
  constructor() {
    super({ key: 'FinalRevealScene' });

    // Scene data
    this.outcome = null;
    this.accusedId = null;
    this.actualKillerId = null;
    this.killerName = '';
    this.killerOccupation = '';
    this.killerMotive = '';
    this.murderWeapon = '';
    this.victim = '';
    this.location = '';
    this.causeOfDeath = '';
    this.timeOfDeath = '';
    this.roundNumber = 1;
    this.allPlayers = [];
    this.epilogueText = '';
    this.roundEvents = [];
    this.soundEnabled = true;
    this.roomCode = '';

    // Skip state
    this.skipAvailable = false;
    this.skipLocked = false;        // true during the jump-scare window
    this.skipBtn = null;
    this.skipLockTimer = null;

    // Scene object refs for cleanup
    this._objects = [];
  }

  // ---------------------------------------------------------------------------
  init(data) {
    this.outcome          = data.outcome || 'investigators_win';
    this.accusedId        = data.accusedId || null;
    this.actualKillerId   = data.actualKillerId || null;
    this.killerName       = data.killerName || 'The Killer';
    this.killerOccupation = data.killerOccupation || 'Unknown';
    this.killerMotive     = data.killerMotive || 'Motive unknown.';
    this.murderWeapon     = data.murderWeapon || 'Unknown weapon';
    this.victim           = data.victim || 'The Victim';
    this.location         = data.location || 'Unknown location';
    this.causeOfDeath     = data.causeOfDeath || 'Unknown';
    this.timeOfDeath      = data.timeOfDeath || 'Unknown';
    this.roundNumber      = data.roundNumber || 1;
    this.allPlayers       = data.allPlayers || [];
    this.epilogueText     = data.epilogueText || '';
    this.roundEvents      = data.roundEvents || [];
    this.soundEnabled     = !data.isMuted;
    this.roomCode         = data.roomCode || '';
  }

  // ---------------------------------------------------------------------------
  preload() {
    // All assets are procedurally generated — nothing to load from files.
  }

  // ---------------------------------------------------------------------------
  create() {
    const W = this.scale.width;   // 800
    const H = this.scale.height;  // 600

    // ── Deep noir background ─────────────────────────────────────────────────
    const bg = this.add.graphics();
    bg.fillStyle(0x050304, 1);
    bg.fillRect(0, 0, W, H);
    this._track(bg);

    // ── Subtle grain overlay (hand-drawn texture feel) ───────────────────────
    this._drawGrainOverlay(W, H);

    // ── Skip button (hidden until 3s) ────────────────────────────────────────
    this._setupSkipButton(W, H);

    // ── Begin shared spotlight beat ─────────────────────────────────────────
    this._runSharedSpotlight(W, H);
  }

  // ===========================================================================
  // SHARED SPOTLIGHT BEAT  (same first 4 seconds for BOTH outcomes)
  // ===========================================================================

  _runSharedSpotlight(W, H) {
    const cx = W / 2;
    const cy = H / 2 - 30;

    // 1. Dramatic spotlight vignette (bright cone, deep shadow surround)
    const vignette = this._makeVignette(W, H);
    this._track(vignette);

    // 2. Accused portrait (large noir circle illustration)
    const portraitContainer = this._drawPortrait(cx, cy, this.accusedId, 80, false);
    this._track(portraitContainer);
    portraitContainer.setAlpha(0);

    // 3. Portrait label
    const accusedPlayer = this.allPlayers.find(p => p.playerId === this.accusedId);
    const accusedLabel = this.add.text(cx, cy + 110, accusedPlayer?.characterName || accusedPlayer?.name || 'Unknown', {
      fontFamily: 'Special Elite, Courier Prime, monospace',
      fontSize: '18px',
      color: '#e8d5a3',
      letterSpacing: 4,
    }).setOrigin(0.5).setAlpha(0);
    this._track(accusedLabel);

    const accusedSub = this.add.text(cx, cy + 134, (accusedPlayer?.occupation || '').toUpperCase(), {
      fontFamily: 'Courier Prime, Courier, monospace',
      fontSize: '10px',
      color: '#78716c',
      letterSpacing: 6,
    }).setOrigin(0.5).setAlpha(0);
    this._track(accusedSub);

    // ── Fade in portrait at t=0 ──────────────────────────────────────────────
    this.tweens.add({
      targets: [portraitContainer, accusedLabel, accusedSub],
      alpha: 1,
      duration: 900,
      ease: 'Power2.easeIn',
      onComplete: () => {
        // Spotlight narrows — camera flash then vignette tightens
        this.cameras.main.flash(60, 255, 240, 160, true);
        this._tightenVignette(vignette, W, H, cx, cy);
      }
    });

    // ── GUILTY stamp at t=1.6s ───────────────────────────────────────────────
    this.time.delayedCall(1600, () => {
      this._stampGuilty(cx, cy);
    });

    // ── Branch to outcome at t=3.8s ──────────────────────────────────────────
    this.time.delayedCall(3800, () => {
      if (this.outcome === 'investigators_win') {
        this._runInvestigatorsWinSequence(W, H);
      } else {
        this._runKillerWinsSequence(W, H);
      }
    });

    // Enable skip after 3s
    this.time.delayedCall(3000, () => {
      this._enableSkip();
    });
  }

  // ---------------------------------------------------------------------------
  _makeVignette(W, H) {
    const g = this.add.graphics();
    // Full-screen dark overlay with a soft circular "hole" in the center
    g.fillStyle(0x000000, 0.82);
    g.fillRect(0, 0, W, H);
    // Spotlight circle (lighter, slightly warm amber)
    g.fillStyle(0x2a1f0e, 0.0);
    g.fillCircle(W / 2, H / 2 - 30, 160);
    g.setDepth(1);
    return g;
  }

  _tightenVignette(g, W, H, cx, cy) {
    // Pulse vignette to simulate spotlight tightening
    this.tweens.add({
      targets: g,
      alpha: { from: 1, to: 0.92 },
      yoyo: true,
      repeat: 2,
      duration: 200,
    });
  }

  // ---------------------------------------------------------------------------
  _drawPortrait(cx, cy, playerId, radius, isKiller = false) {
    const container = this.add.container(cx, cy);

    // Outer ring glow
    const glow = this.add.graphics();
    const ringColor = isKiller ? 0x7f1d1d : 0xb45309;
    glow.lineStyle(3, ringColor, 0.6);
    glow.strokeCircle(0, 0, radius + 12);
    glow.lineStyle(1, ringColor, 0.25);
    glow.strokeCircle(0, 0, radius + 22);
    container.add(glow);

    // Portrait background circle
    const bg = this.add.graphics();
    const baseColor = isKiller ? 0x1a0505 : 0x12100e;
    bg.fillStyle(baseColor, 1);
    bg.fillCircle(0, 0, radius);
    container.add(bg);

    // Player colour fill (same hash as MeetingScene)
    const tint = this._colorFromId(playerId);
    const fill = this.add.graphics();
    fill.fillStyle(tint, isKiller ? 0.5 : 0.35);
    fill.fillCircle(0, 0, radius - 4);
    container.add(fill);

    // Noir cross-hatch shadow pattern (canvas-drawn texture)
    const hatch = this.add.graphics();
    hatch.lineStyle(1, 0x000000, 0.35);
    for (let i = -radius; i < radius; i += 6) {
      hatch.lineBetween(i, -radius, i + radius, radius);
    }
    container.add(hatch);

    // Silhouette figure — stylised bust
    const figure = this.add.graphics();
    const figColor = isKiller ? 0x1f0000 : 0x1c1917;

    // Head
    figure.fillStyle(figColor, 1);
    figure.fillCircle(0, -radius * 0.38, radius * 0.28);
    // Shoulders / body
    figure.fillEllipse(0, -radius * 0.02, radius * 0.9, radius * 0.55);
    container.add(figure);

    // Tiny glint (eye highlight)
    if (!isKiller) {
      const glint = this.add.graphics();
      glint.fillStyle(0xe8d5a3, 0.7);
      glint.fillCircle(-radius * 0.08, -radius * 0.42, 2.5);
      container.add(glint);
    }

    // For killer portrait: red tint overlay
    if (isKiller) {
      const overlay = this.add.graphics();
      overlay.fillStyle(0x7f1d1d, 0.25);
      overlay.fillCircle(0, 0, radius);
      container.add(overlay);

      // "?" slash across killer face (adds tension)
      const slash = this.add.graphics();
      slash.lineStyle(2, 0xef4444, 0.4);
      slash.lineBetween(-radius * 0.5, radius * 0.5, radius * 0.5, -radius * 0.5);
      container.add(slash);
    }

    container.setDepth(2);
    return container;
  }

  // ---------------------------------------------------------------------------
  _stampGuilty(cx, cy) {
    this.playStampThud();

    const stamp = this.add.container(cx, cy);
    stamp.setDepth(10);
    this._track(stamp);

    // Red stamp rectangle
    const rect = this.add.graphics();
    rect.fillStyle(0x991b1b, 0.92);
    rect.lineStyle(3, 0xef4444, 1);
    rect.fillRect(-90, -22, 180, 44);
    rect.strokeRect(-90, -22, 180, 44);
    stamp.add(rect);

    // "GUILTY" text
    const txt = this.add.text(0, 0, 'GUILTY', {
      fontFamily: 'Special Elite, Impact, monospace',
      fontSize: '32px',
      color: '#ffffff',
      fontStyle: 'bold',
      letterSpacing: 6,
    }).setOrigin(0.5);
    stamp.add(txt);

    // Initial state: scaled big, rotated, alpha 0
    stamp.setAngle(-8);
    stamp.setScale(2.5);
    stamp.setAlpha(0);

    // Slam in animation
    this.tweens.add({
      targets: stamp,
      alpha: { from: 0, to: 1 },
      scale: { from: 2.5, to: 1 },
      duration: 180,
      ease: 'Back.easeOut',
      onComplete: () => {
        // Short bounce
        this.tweens.add({
          targets: stamp,
          scale: { from: 1, to: 1.04 },
          yoyo: true,
          duration: 100,
        });
      }
    });
  }

  // ===========================================================================
  // INVESTIGATORS WIN SEQUENCE
  // ===========================================================================

  _runInvestigatorsWinSequence(W, H) {
    const cx = W / 2;

    // ── Fade bg to deep cool grey-black (less oppressive than pure black) ────
    const bgOverlay = this.add.graphics();
    bgOverlay.fillStyle(0x080c0f, 1);
    bgOverlay.fillRect(0, 0, W, H);
    bgOverlay.setAlpha(0);
    bgOverlay.setDepth(5);
    this._track(bgOverlay);

    this.tweens.add({
      targets: bgOverlay,
      alpha: 1,
      duration: 700,
      delay: 200,
    });

    // ── "CASE — CLOSED" stamps at t+0 ────────────────────────────────────────
    const stampWords = ['CASE', '—', 'CLOSED'];
    const stampOffsets = [-240, 0, 240];
    stampWords.forEach((word, i) => {
      this.time.delayedCall(500 + i * 800, () => {
        this._stampWord(cx + stampOffsets[i], H * 0.22, word, i !== 1);
      });
    });

    // ── Camera pull-back at t+2.8s ───────────────────────────────────────────
    this.time.delayedCall(2800, () => {
      this.cameras.main.zoomTo(0.75, 1400, 'Cubic.easeOut');
      this._animateClosingFolder(W, H);
    });

    // ── Epilogue text at t+4.5s ───────────────────────────────────────────────
    this.time.delayedCall(4500, () => {
      this._showEpilogue(cx, H * 0.52, W);
    });

    // ── Investigators credits at t+6.5s ───────────────────────────────────────
    this.time.delayedCall(6500, () => {
      this._showInvestigatorsCredits(cx, H * 0.62, W);
    });

    // ── Case Summary Dossier at t+9s ─────────────────────────────────────────
    this.time.delayedCall(9000, () => {
      this._showCaseSummaryDossier(W, H);
    });

    // ── Resolving minor motif ─────────────────────────────────────────────────
    this.time.delayedCall(300, () => {
      this.playResolvingMotif();
    });

    // ── Final quiet line at t+18s ─────────────────────────────────────────────
    this.time.delayedCall(18000, () => {
      this._showFinalLine(cx, H - 60, '"The manor grows quiet again. For now."');
    });
  }

  // ---------------------------------------------------------------------------
  _stampWord(x, y, word, playSFX = true) {
    if (playSFX) this.playStampThud();

    const stamp = this.add.text(x, y, word, {
      fontFamily: 'Special Elite, Impact, monospace',
      fontSize: word === '—' ? '36px' : '48px',
      color: '#c8b896',
      fontStyle: 'bold',
      letterSpacing: word === '—' ? 0 : 8,
    }).setOrigin(0.5).setAlpha(0).setScale(1.8).setDepth(6);
    this._track(stamp);

    this.tweens.add({
      targets: stamp,
      alpha: { from: 0, to: 1 },
      scale: { from: 1.8, to: 1 },
      duration: 200,
      ease: 'Back.easeOut',
    });
  }

  // ---------------------------------------------------------------------------
  _animateClosingFolder(W, H) {
    // Simulate desk papers shuffling into a folder — three staggered rectangles
    const papers = [];
    const paperData = [
      { x: W * 0.42, y: H * 0.38, angle: -6, w: 160, h: 110 },
      { x: W * 0.50, y: H * 0.40, angle: 2,  w: 155, h: 108 },
      { x: W * 0.58, y: H * 0.36, angle: 8,  w: 158, h: 112 },
    ];

    paperData.forEach((pd, i) => {
      const g = this.add.graphics();
      g.fillStyle(0xe8e0cc, 0.88);
      g.fillRect(-pd.w / 2, -pd.h / 2, pd.w, pd.h);
      g.lineStyle(1, 0xb0a090, 0.5);
      g.strokeRect(-pd.w / 2, -pd.h / 2, pd.w, pd.h);
      // Faint lines to suggest text
      for (let line = 1; line <= 5; line++) {
        g.lineStyle(0.5, 0xaaaaaa, 0.4);
        g.lineBetween(-pd.w / 2 + 10, -pd.h / 2 + line * 16, pd.w / 2 - 10, -pd.h / 2 + line * 16);
      }
      g.x = pd.x;
      g.y = pd.y;
      g.angle = pd.angle;
      g.setDepth(3);
      this._track(g);
      papers.push(g);

      // Shuffle into center then fade out
      this.tweens.add({
        targets: g,
        x: W / 2,
        y: H * 0.38,
        angle: 0,
        duration: 900,
        delay: i * 150,
        ease: 'Cubic.easeInOut',
        onComplete: () => {
          this.tweens.add({
            targets: g,
            alpha: 0,
            scaleY: 0.05,
            y: H * 0.35,
            duration: 600,
            delay: 400,
            ease: 'Cubic.easeIn',
          });
        }
      });
    });
  }

  // ---------------------------------------------------------------------------
  _showEpilogue(cx, y, W) {
    const text = this.epilogueText ||
      `The evidence was undeniable. ${this.killerName} was taken into custody before dawn, the case sealed in the files of the Metropolitan Detective Bureau.`;

    const epText = this.add.text(cx, y, text, {
      fontFamily: 'Georgia, Special Elite, serif',
      fontSize: '13px',
      fontStyle: 'italic',
      color: '#c8b896',
      lineSpacing: 8,
      wordWrap: { width: W * 0.72 },
      align: 'center',
    }).setOrigin(0.5).setAlpha(0).setDepth(6);
    this._track(epText);

    this.tweens.add({ targets: epText, alpha: 1, duration: 1200, ease: 'Power2' });
  }

  // ---------------------------------------------------------------------------
  _showInvestigatorsCredits(cx, startY, W) {
    const investigators = this.allPlayers.filter(p => !p.isMurderer);
    investigators.forEach((player, i) => {
      this.time.delayedCall(i * 300, () => {
        const status = player.isEliminated ? 'ELIMINATED' : 'INNOCENT';
        const statusColor = player.isEliminated ? '#ef4444' : '#22c55e';
        const label = `${player.name}   ${player.characterName}   `;

        const row = this.add.container(cx, startY + i * 28);
        row.setDepth(6);
        this._track(row);

        const nameTxt = this.add.text(-W * 0.35, 0, label, {
          fontFamily: 'Courier Prime, Courier, monospace',
          fontSize: '11px',
          color: '#a8a29e',
        }).setOrigin(0, 0.5);

        const statusTxt = this.add.text(W * 0.18, 0, status, {
          fontFamily: 'Courier Prime, Courier, monospace',
          fontSize: '11px',
          color: statusColor,
          fontStyle: 'bold',
          letterSpacing: 2,
        }).setOrigin(0, 0.5);

        row.add([nameTxt, statusTxt]);
        row.setAlpha(0);
        this.tweens.add({ targets: row, alpha: 1, duration: 400 });
      });
    });
  }

  // ===========================================================================
  // KILLER WINS SEQUENCE  (includes jump-scare)
  // ===========================================================================

  _runKillerWinsSequence(W, H) {
    const cx = W / 2;
    const cy = H / 2;

    // ── Extended silence hold (+1.8s longer than win pacing) ─────────────────
    // The shared spotlight already ended at t=3.8s, so we wait here

    // ── Jump-scare at t+1.8s ─────────────────────────────────────────────────
    this.time.delayedCall(1800, () => {
      this._executeJumpScare(W, H, cx, cy);
    });
  }

  // ---------------------------------------------------------------------------
  _executeJumpScare(W, H, cx, cy) {
    // Lock the skip button during scare window
    this.skipLocked = true;
    if (this.skipBtn) this.skipBtn.setAlpha(0.3).disableInteractive();

    // ── Full-screen killer portrait (instant swap) ───────────────────────────
    const killerPortrait = this._drawPortrait(cx, cy - 40, this.actualKillerId, 200, true);
    killerPortrait.setDepth(20);
    killerPortrait.setScale(1);
    this._track(killerPortrait);

    // Blood-red full-screen flash overlay
    const flash = this.add.graphics();
    flash.fillStyle(0x3d0000, 0.85);
    flash.fillRect(0, 0, W, H);
    flash.setDepth(19);
    this._track(flash);

    // Killer name in giant type — slams in with the portrait
    const scareName = this.add.text(cx, H * 0.82, this.killerName.toUpperCase(), {
      fontFamily: 'Special Elite, Impact, monospace',
      fontSize: '38px',
      color: '#ef4444',
      fontStyle: 'bold',
      letterSpacing: 6,
    }).setOrigin(0.5).setDepth(21);
    this._track(scareName);

    // ── Screen shake ─────────────────────────────────────────────────────────
    this.cameras.main.shake(110, 0.005);

    // ── Discordant stinger ───────────────────────────────────────────────────
    this.playDiscordantStinger();

    // ── Hold flash for 160ms then hard cut to black ──────────────────────────
    this.time.delayedCall(160, () => {
      // Destroy scare frame
      killerPortrait.destroy();
      flash.destroy();
      scareName.destroy();

      // Pure black
      const blackOut = this.add.graphics();
      blackOut.fillStyle(0x000000, 1);
      blackOut.fillRect(0, 0, W, H);
      blackOut.setDepth(25);
      this._track(blackOut);

      // Unlock skip after scare
      this.time.delayedCall(400, () => {
        this.skipLocked = false;
        if (this.skipBtn && this.skipAvailable) {
          this.skipBtn.setAlpha(1).setInteractive({ useHandCursor: true });
        }
      });

      // ── 1.2s true silence, then text begins ──────────────────────────────
      this.time.delayedCall(1200, () => {
        this._runKillerTextReveal(W, H, blackOut);
      });
    });
  }

  // ---------------------------------------------------------------------------
  _runKillerTextReveal(W, H, blackOverlay) {
    const cx = W / 2;

    // Fade blackOverlay out slowly to reveal very dark bg
    this.tweens.add({
      targets: blackOverlay,
      alpha: 0.7,
      duration: 1500,
      delay: 500,
    });

    // ── "THE KILLER WAS NEVER CAUGHT." ───────────────────────────────────────
    const line1 = this.add.text(cx, H * 0.28, 'THE KILLER WAS NEVER CAUGHT.', {
      fontFamily: 'Special Elite, Impact, monospace',
      fontSize: '22px',
      color: '#c8b896',
      letterSpacing: 4,
    }).setOrigin(0.5).setAlpha(0).setDepth(30);
    this._track(line1);

    this.tweens.add({ targets: line1, alpha: 1, duration: 1200, ease: 'Power2' });

    // ── Killer name — typewriter reveal at +2s ────────────────────────────────
    const nameLine = this.add.text(cx, H * 0.42, '', {
      fontFamily: 'Courier Prime, Courier, monospace',
      fontSize: '28px',
      color: '#ef4444',
      fontStyle: 'bold',
      letterSpacing: 3,
    }).setOrigin(0.5).setDepth(30);
    this._track(nameLine);

    this.time.delayedCall(2000, () => {
      this._typewriterReveal(nameLine, this.killerName, 60);
    });

    // ── Motive line at +4s ────────────────────────────────────────────────────
    const motiveText = this.add.text(cx, H * 0.54, '', {
      fontFamily: 'Georgia, serif',
      fontSize: '13px',
      fontStyle: 'italic',
      color: '#78716c',
      wordWrap: { width: W * 0.65 },
      align: 'center',
      lineSpacing: 6,
    }).setOrigin(0.5).setAlpha(0).setDepth(30);
    this._track(motiveText);

    this.time.delayedCall(4000, () => {
      const motiveDisplay = `"${this.killerMotive}"`;
      motiveText.setText(motiveDisplay);
      this.tweens.add({ targets: motiveText, alpha: 1, duration: 1200 });
    });

    // ── Killer silhouette walk at +6s ─────────────────────────────────────────
    this.time.delayedCall(6000, () => {
      this._animateKillerWalk(W, H);
    });

    // ── Case Summary Dossier at +8.5s ─────────────────────────────────────────
    this.time.delayedCall(8500, () => {
      this._showCaseSummaryDossier(W, H);
    });

    // ── Dissonant hanging motif ───────────────────────────────────────────────
    this.time.delayedCall(500, () => {
      this.playDissonantMotif();
    });
  }

  // ---------------------------------------------------------------------------
  _animateKillerWalk(W, H) {
    const startX = W * 0.12;
    const y = H * 0.72;

    const silhouette = this.add.graphics();
    silhouette.fillStyle(0x1a0505, 1);

    // Stylised walking figure silhouette
    // Head
    silhouette.fillCircle(0, -52, 14);
    // Body
    silhouette.fillRect(-10, -38, 20, 36);
    // Coat flare
    silhouette.fillTriangle(-10, -4, 10, -4, -20, 30);
    silhouette.fillTriangle(-10, -4, 10, -4, 20, 30);
    // Legs
    silhouette.fillRect(-8, 28, 7, 28);
    silhouette.fillRect(1, 28, 7, 28);

    silhouette.x = startX;
    silhouette.y = y;
    silhouette.setAlpha(0);
    silhouette.setDepth(28);
    this._track(silhouette);

    this.tweens.add({
      targets: silhouette,
      alpha: 0.85,
      duration: 600,
      onComplete: () => {
        // Walk off screen to the right
        this.tweens.add({
          targets: silhouette,
          x: W + 60,
          duration: 3200,
          ease: 'Cubic.easeIn',
          onComplete: () => {
            this.tweens.add({ targets: silhouette, alpha: 0, duration: 400 });
          }
        });
      }
    });
  }

  // ===========================================================================
  // CASE SUMMARY DOSSIER  (shared by both outcomes)
  // ===========================================================================

  _showCaseSummaryDossier(W, H) {
    const panelW = Math.min(680, W - 40);
    const panelH = Math.min(490, H - 60);
    const panelX = (W - panelW) / 2;
    const panelY = (H - panelH) / 2;
    const DEPTH = 40;

    // ── Parchment panel ───────────────────────────────────────────────────────
    const panel = this.add.graphics();
    panel.fillStyle(0xf0e8d2, 1);
    panel.lineStyle(2, 0x8b7355, 1);
    panel.fillRoundedRect(panelX, panelY, panelW, panelH, 3);
    panel.strokeRoundedRect(panelX, panelY, panelW, panelH, 3);
    panel.setAlpha(0).setDepth(DEPTH);
    this._track(panel);

    // Inner border
    const innerBorder = this.add.graphics();
    innerBorder.lineStyle(1, 0x8b7355, 0.4);
    innerBorder.strokeRoundedRect(panelX + 8, panelY + 8, panelW - 16, panelH - 16, 2);
    innerBorder.setAlpha(0).setDepth(DEPTH);
    this._track(innerBorder);

    // ── Content: build lines array ─────────────────────────────────────────────
    const verdict = this.outcome === 'investigators_win' ? 'CASE CLOSED' : 'THE KILLER WALKS FREE';
    const verdictColor = this.outcome === 'investigators_win' ? '#991b1b' : '#374151';

    const investigators = this.allPlayers.filter(p => !p.isMurderer);
    const killerPlayer = this.allPlayers.find(p => p.isMurderer);

    // Dossier text blocks — each block: { text, color, size, bold, topPad }
    const blocks = [
      { text: `METROPOLITAN DETECTIVE BUREAU`, size: '10px', color: '#5c4a2a', bold: true, letterSpacing: 4, topPad: 14 },
      { text: `CASE FILE  #${this.roomCode}   ·   CLASSIFIED`, size: '9px', color: '#7a6040', bold: false, letterSpacing: 3, topPad: 4 },
      { text: `─────────────────────────────────────────────────`, size: '10px', color: '#8b7355', bold: false, topPad: 6 },
      { text: `VICTIM:        ${this.victim}`, size: '11px', color: '#2c1f0e', bold: false, topPad: 8 },
      { text: `CAUSE:         ${this.causeOfDeath}`, size: '11px', color: '#2c1f0e', bold: false, topPad: 3 },
      { text: `TIME OF DEATH: ${this.timeOfDeath}`, size: '11px', color: '#2c1f0e', bold: false, topPad: 3 },
      { text: `LOCATION:      ${this.location}`, size: '11px', color: '#2c1f0e', bold: false, topPad: 3 },
      { text: `─────────────────────────────────────────────────`, size: '10px', color: '#8b7355', bold: false, topPad: 8 },
      { text: `INVESTIGATION TIMELINE`, size: '10px', color: '#5c4a2a', bold: true, letterSpacing: 3, topPad: 6 },
      ...(this.roundEvents.length > 0 ? this.roundEvents.map(ev => ({ text: `  •  ${ev}`, size: '10px', color: '#3d2f1a', bold: false, topPad: 3 })) : [{ text: '  •  No round events recorded.', size: '10px', color: '#7a6040', bold: false, topPad: 3 }]),
      { text: `─────────────────────────────────────────────────`, size: '10px', color: '#8b7355', bold: false, topPad: 8 },
      { text: `THE TRUTH`, size: '10px', color: '#5c4a2a', bold: true, letterSpacing: 3, topPad: 6 },
      { text: `Killer:  ${this.killerName}${killerPlayer?.occupation ? ', ' + killerPlayer.occupation : ''}`, size: '11px', color: '#2c1f0e', bold: false, topPad: 3 },
      { text: `Weapon:  ${this.murderWeapon}`, size: '11px', color: '#2c1f0e', bold: false, topPad: 3 },
      { text: `Motive:  ${this.killerMotive}`, size: '10px', color: '#4a3520', bold: false, topPad: 3, wrap: panelW - 80 },
      { text: `─────────────────────────────────────────────────`, size: '10px', color: '#8b7355', bold: false, topPad: 8 },
      { text: `INVESTIGATORS`, size: '10px', color: '#5c4a2a', bold: true, letterSpacing: 3, topPad: 6 },
      ...investigators.map(p => ({
        text: `  ${p.name.padEnd(16)}${p.characterName.padEnd(20)}${p.isEliminated ? 'ELIMINATED' : 'SURVIVED'}`,
        size: '10px',
        color: p.isEliminated ? '#7f1d1d' : '#166534',
        bold: false,
        topPad: 3,
      })),
    ];

    // ── Render blocks one at a time (typewriter feel) ─────────────────────────
    // First fade in the panel itself
    this.tweens.add({
      targets: [panel, innerBorder],
      alpha: 1,
      duration: 800,
      ease: 'Power2',
    });

    let cursorY = panelY + 14;
    const leftX = panelX + 20;

    // Verdict stamp (will be shown after all lines)
    const verdictStamp = this.add.text(panelX + panelW - 24, panelY + 40, verdict, {
      fontFamily: 'Special Elite, Impact, monospace',
      fontSize: '15px',
      color: verdictColor,
      fontStyle: 'bold',
      letterSpacing: 2,
    }).setOrigin(1, 0).setAlpha(0).setDepth(DEPTH + 1).setAngle(-12);
    this._track(verdictStamp);

    // Type in each block with staggered delays
    blocks.forEach((block, idx) => {
      this.time.delayedCall(800 + idx * 55, () => {
        cursorY += block.topPad || 0;
        const t = this.add.text(leftX, cursorY, block.text, {
          fontFamily: 'Courier Prime, Courier, monospace',
          fontSize: block.size || '11px',
          color: block.color || '#2c1f0e',
          fontStyle: block.bold ? 'bold' : 'normal',
          letterSpacing: block.letterSpacing || 0,
          wordWrap: block.wrap ? { width: block.wrap } : undefined,
        }).setAlpha(0).setDepth(DEPTH + 1);
        this._track(t);
        this.tweens.add({ targets: t, alpha: 1, duration: 120 });

        const lineH = parseInt(block.size) || 11;
        cursorY += lineH + 2;
      });
    });

    // Verdict stamp appears after all lines
    this.time.delayedCall(800 + blocks.length * 55 + 400, () => {
      if (this.soundEnabled) this.playStampThud();
      this.tweens.add({
        targets: verdictStamp,
        alpha: 1,
        scale: { from: 1.6, to: 1 },
        duration: 220,
        ease: 'Back.easeOut',
      });
      
      // Add 'NEW GAME' and 'JOIN SAME ONE' buttons
      this.time.delayedCall(1200, () => {
        const btnY = panelY + panelH + 25;
        
        const newGameBtn = this.add.text(panelX + panelW/4, btnY, 'NEW GAME', {
          fontFamily: 'Courier Prime, Courier, monospace',
          fontSize: '12px',
          color: '#ffffff',
          backgroundColor: '#991b1b',
          padding: { x: 16, y: 8 },
          fontStyle: 'bold'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setAlpha(0).setDepth(DEPTH);

        const playAgainBtn = this.add.text(panelX + (panelW * 3/4), btnY, 'JOIN SAME ONE', {
          fontFamily: 'Courier Prime, Courier, monospace',
          fontSize: '12px',
          color: '#ffffff',
          backgroundColor: '#374151',
          padding: { x: 16, y: 8 },
          fontStyle: 'bold'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setAlpha(0).setDepth(DEPTH);

        this._track(newGameBtn);
        this._track(playAgainBtn);

        this.tweens.add({
          targets: [newGameBtn, playAgainBtn],
          alpha: 1,
          duration: 500
        });

        newGameBtn.on('pointerdown', () => {
          window.location.href = '/';
        });

        playAgainBtn.on('pointerdown', () => {
          window.location.href = `/investigation/${this.roomCode}`;
        });
      });
    });
  }

  // ===========================================================================
  // FINAL AMBIENT LINE  (win only)
  // ===========================================================================

  _showFinalLine(cx, y, text) {
    const line = this.add.text(cx, y, text, {
      fontFamily: 'Georgia, Special Elite, serif',
      fontSize: '14px',
      fontStyle: 'italic',
      color: '#5c534a',
      align: 'center',
    }).setOrigin(0.5).setAlpha(0).setDepth(6);
    this._track(line);

    this.tweens.add({ targets: line, alpha: 1, duration: 3000, ease: 'Power1' });
  }

  // ===========================================================================
  // SKIP BUTTON
  // ===========================================================================

  _setupSkipButton(W, H) {
    this.skipBtn = this.add.text(W - 20, H - 20, 'SKIP  ›', {
      fontFamily: 'Courier Prime, Courier, monospace',
      fontSize: '11px',
      color: '#44403c',
      letterSpacing: 3,
      backgroundColor: 'rgba(0,0,0,0.5)',
      padding: { x: 10, y: 5 },
    }).setOrigin(1, 1).setAlpha(0).setDepth(100).setInteractive({ useHandCursor: true });
    this._track(this.skipBtn);

    this.skipBtn.on('pointerover', () => {
      if (!this.skipLocked) this.skipBtn.setColor('#c8b896');
    });
    this.skipBtn.on('pointerout', () => {
      this.skipBtn.setColor('#44403c');
    });
    this.skipBtn.on('pointerdown', () => {
      if (this.skipAvailable && !this.skipLocked) this._handleSkip(W, H);
    });
  }

  _enableSkip() {
    this.skipAvailable = true;
    if (this.skipBtn) {
      this.tweens.add({ targets: this.skipBtn, alpha: 1, duration: 400 });
    }
  }

  _handleSkip(W, H) {
    if (!this.skipAvailable || this.skipLocked) return;
    // Stop all pending timers by scene restart into dossier-only mode
    // Simplest approach: clear scene and jump straight to dossier
    this.children.list.slice().forEach(child => {
      if (child !== this.skipBtn) {
        this.tweens.killTweensOf(child);
        if (child.destroy && child !== this.skipBtn) child.destroy();
      }
    });
    this._objects = [];

    // Redraw minimal bg
    const bg = this.add.graphics();
    bg.fillStyle(0x050304, 1);
    bg.fillRect(0, 0, W, H);

    if (this.skipBtn) {
      this.skipBtn.destroy();
      this.skipBtn = null;
    }

    this._showCaseSummaryDossier(W, H);
  }

  // ===========================================================================
  // AUDIO — Web Audio API  (respects isMuted / soundEnabled)
  // ===========================================================================

  playStampThud() {
    if (!this.soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(90, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(18, ctx.currentTime + 0.28);
      gain.gain.setValueAtTime(0.35, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.28);
    } catch (_) {}
  }

  playDiscordantStinger() {
    if (!this.soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();

      // Dissonant cluster: minor 2nd + tritone — noir gut-punch, not horror scream
      const freqs = [220, 233.08, 311.13, 370];
      freqs.forEach(freq => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.85, ctx.currentTime + 0.45);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.45);
      });

      // Sub bass thud
      const bass = ctx.createOscillator();
      const bassGain = ctx.createGain();
      bass.type = 'sine';
      bass.frequency.setValueAtTime(55, ctx.currentTime);
      bassGain.gain.setValueAtTime(0.55, ctx.currentTime);
      bassGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      bass.connect(bassGain);
      bassGain.connect(ctx.destination);
      bass.start();
      bass.stop(ctx.currentTime + 0.5);
    } catch (_) {}
  }

  playResolvingMotif() {
    if (!this.soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      // A minor chord: A3 C4 E4 — resolving but not triumphant
      const notes = [220, 261.63, 329.63, 440];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.12);
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.045, ctx.currentTime + 0.6 + i * 0.12);
        gain.gain.setValueAtTime(0.045, ctx.currentTime + 5);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 10);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.12);
        osc.stop(ctx.currentTime + 10);
      });
    } catch (_) {}
  }

  playDissonantMotif() {
    if (!this.soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      // A diminished 7th: A3 C4 Eb4 F#4 — hanging, unresolved
      const notes = [220, 261.63, 311.13, 369.99];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.15);
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.038, ctx.currentTime + 0.7 + i * 0.15);
        gain.gain.setValueAtTime(0.038, ctx.currentTime + 6);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 12); // Fades to silence, not cut
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.15);
        osc.stop(ctx.currentTime + 12);
      });
    } catch (_) {}
  }

  // ===========================================================================
  // HELPERS
  // ===========================================================================

  _typewriterReveal(textObj, fullText, msPerChar, onComplete) {
    let i = 0;
    textObj.setText('');
    this.time.addEvent({
      delay: msPerChar,
      repeat: fullText.length - 1,
      callback: () => {
        i++;
        textObj.setText(fullText.slice(0, i));
        if (i >= fullText.length && onComplete) onComplete();
      }
    });
  }

  _drawGrainOverlay(W, H) {
    // Subtle pixel grain — fills a 4x4 grid of semi-transparent dots
    const grain = this.add.graphics();
    grain.fillStyle(0xffffff, 0.012);
    for (let x = 0; x < W; x += 4) {
      for (let y = 0; y < H; y += 4) {
        if (Math.random() > 0.6) grain.fillRect(x, y, 1, 1);
      }
    }
    grain.setDepth(90); // Above scene but below skip button
    this._track(grain);
  }

  _colorFromId(id) {
    if (!id) return 0xb45309;
    let hash = 0;
    const s = String(id);
    for (let i = 0; i < s.length; i++) {
      hash = s.charCodeAt(i) + ((hash << 5) - hash);
    }
    const palette = [
      0xef4444, 0x3b82f6, 0x10b981, 0xf59e0b,
      0x8b5cf6, 0xec4899, 0x06b6d4, 0x14b8a6
    ];
    return palette[Math.abs(hash) % palette.length];
  }

  /** Track a display object for skip-cleanup */
  _track(obj) {
    this._objects.push(obj);
    return obj;
  }

  // ---------------------------------------------------------------------------
  shutdown() {
    // Clean up all tweens and scene objects
    this.tweens.killAll();
    this._objects = [];
  }
}
