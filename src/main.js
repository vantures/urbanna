// src/main.js
// Bootstraps the Phaser game instance and registers scenes.

import BootScene from './BootScene.js';
import MenuScene from './MenuScene.js';
import GameScene from './GameScene.js';

const WIDTH = 480; // Base resolution width
const HEIGHT = 800; // Base resolution height

const config = {
    type: Phaser.AUTO,
    parent: 'game-container',
    backgroundColor: '#87ceeb', // sky-blue placeholder background
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: WIDTH,
        height: HEIGHT,
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false,
        },
    },
    scene: [BootScene, MenuScene, GameScene],
};

// Initialise the game when the page finishes loading.
window.addEventListener('load', () => {
    new Phaser.Game(config);
}); 