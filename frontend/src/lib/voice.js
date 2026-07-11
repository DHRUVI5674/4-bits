export class VoiceManager {
  constructor(socket, roomCode, playerId, { onStream, onTalking, onParticipantsUpdated }) {
    this.socket = socket;
    this.roomCode = roomCode;
    this.playerId = playerId;
    this.onStream = onStream;
    this.onTalking = onTalking;
    this.onParticipantsUpdated = onParticipantsUpdated;

    this.localStream = null;
    this.pcs = new Map(); // targetId -> RTCPeerConnection
    this.active = false;
    
    // WebRTC Config
    this.iceConfig = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    };

    this.setupListeners();
  }

  async start() {
    if (this.active) return;
    this.active = true;

    try {
      // 1. Obtain local microphone stream
      this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      
      // Setup local audio analysis
      this.setupVolumeAnalysis(this.playerId, this.localStream, this.onTalking);
      
      // Call visual stream handler for self if needed
      if (this.onStream) {
        this.onStream(this.playerId, this.localStream);
      }

      // 2. Emit voice:join to notify others in the room
      this.socket.emit('voice:join');
      console.log('[VoiceManager] Joined voice chat successfully.');
    } catch (error) {
      console.error('[VoiceManager] Failed to get user media / join voice:', error);
      this.active = false;
      // Fail silently fallback: do not block text chat
    }
  }

  stop() {
    if (!this.active) return;
    this.active = false;

    // Stop local tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    // Emit voice:leave
    this.socket.emit('voice:leave');

    // Close all peer connections
    this.pcs.forEach((pc, targetId) => {
      pc.close();
    });
    this.pcs.clear();
    console.log('[VoiceManager] Left voice chat.');
  }

  toggleMic(micOn) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = micOn;
      });
      this.socket.emit('voice:toggle-mic', { micOn });
    }
  }

  setupListeners() {
    // Other player joined: newly joined peer handles initiating connections
    this.socket.on('voice:join', async ({ playerId }) => {
      if (!this.active || playerId === this.playerId) return;
      console.log(`[VoiceManager] Peer ${playerId} joined voice. Creating offer...`);
      await this.initiateConnection(playerId);
    });

    // Offer received
    this.socket.on('voice:offer', async ({ senderId, offer }) => {
      if (!this.active) return;
      console.log(`[VoiceManager] Offer received from peer ${senderId}`);
      await this.handleOffer(senderId, offer);
    });

    // Answer received
    this.socket.on('voice:answer', async ({ senderId, answer }) => {
      if (!this.active) return;
      console.log(`[VoiceManager] Answer received from peer ${senderId}`);
      const pc = this.pcs.get(senderId);
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      }
    });

    // ICE Candidate received
    this.socket.on('voice:ice-candidate', async ({ senderId, candidate }) => {
      if (!this.active) return;
      const pc = this.pcs.get(senderId);
      if (pc && candidate) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.warn('[VoiceManager] Failed to add ICE candidate', e);
        }
      }
    });

    // Peer left voice
    this.socket.on('voice:leave', ({ playerId }) => {
      console.log(`[VoiceManager] Peer ${playerId} left voice`);
      this.closeConnection(playerId);
    });
  }

  async initiateConnection(targetId) {
    if (this.pcs.has(targetId)) return;

    const pc = new RTCPeerConnection(this.iceConfig);
    this.pcs.set(targetId, pc);

    // Add local tracks to peer connection
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => pc.addTrack(track, this.localStream));
    }

    // ICE candidates handler
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.socket.emit('voice:ice-candidate', { targetId, candidate: event.candidate });
      }
    };

    // Track stream received from other player
    pc.ontrack = (event) => {
      console.log(`[VoiceManager] Remote track received from peer ${targetId}`);
      const remoteStream = event.streams[0];
      if (this.onStream) {
        this.onStream(targetId, remoteStream);
      }
      this.setupVolumeAnalysis(targetId, remoteStream, this.onTalking);
    };

    // Create SDP Offer
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      this.socket.emit('voice:offer', { targetId, offer });
    } catch (e) {
      console.error('[VoiceManager] Error initiating connection', e);
    }
  }

  async handleOffer(senderId, offer) {
    let pc = this.pcs.get(senderId);
    if (!pc) {
      pc = new RTCPeerConnection(this.iceConfig);
      this.pcs.set(senderId, pc);

      if (this.localStream) {
        this.localStream.getTracks().forEach(track => pc.addTrack(track, this.localStream));
      }

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          this.socket.emit('voice:ice-candidate', { targetId: senderId, candidate: event.candidate });
        }
      };

      pc.ontrack = (event) => {
        console.log(`[VoiceManager] Remote track received from peer ${senderId}`);
        const remoteStream = event.streams[0];
        if (this.onStream) {
          this.onStream(senderId, remoteStream);
        }
        this.setupVolumeAnalysis(senderId, remoteStream, this.onTalking);
      };
    }

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      this.socket.emit('voice:answer', { targetId: senderId, answer });
    } catch (e) {
      console.error('[VoiceManager] Error handling offer', e);
    }
  }

  closeConnection(targetId) {
    const pc = this.pcs.get(targetId);
    if (pc) {
      pc.close();
      this.pcs.delete(targetId);
    }
  }

  setupVolumeAnalysis(playerId, stream, callback) {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const checkVolume = () => {
        if (!this.active || !this.pcs.has(playerId) && playerId !== this.playerId) {
          audioContext.close();
          return;
        }
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        const isTalking = average > 15; // Volume threshold
        callback(playerId, isTalking);
        setTimeout(checkVolume, 100);
      };
      
      checkVolume();
    } catch (e) {
      console.warn("[VoiceManager] Failed to set up volume analysis", e);
    }
  }
}
