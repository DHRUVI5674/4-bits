import Phaser from 'phaser';
import LobbyScene from './scenes/LobbyScene';
import InvestigationScene from './scenes/InvestigationScene';
import MeetingScene from './scenes/MeetingScene';
import VirtualJoystickScene from './plugins/VirtualJoystick';

export const createGameConfig = (parentContainerId, onGameReady) => {
  return {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: parentContainerId,
    audio: {
      noAudio: true
    },
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { y: 0 },
        debug: false,
      },
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [LobbyScene, InvestigationScene, MeetingScene, VirtualJoystickScene],
    callbacks: {
      postBoot: (game) => {
        if (onGameReady) {
          onGameReady(game);
        }
      }
    }
  };
};
