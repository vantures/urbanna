// src/MenuScene.js
// Displays the main menu with a start button.

export default class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
    }

    create() {
        const { width, height } = this.scale;

        // Title text
        this.add.text(width / 2, height / 2 - 100, 'Rivah Dash', {
            fontFamily: 'Arial',
            fontSize: '48px',
            color: '#ffffff',
        }).setOrigin(0.5);

        // Instruction / start prompt
        const startText = this.add.text(width / 2, height / 2, 'Tap or Press SPACE to Start', {
            fontFamily: 'Arial',
            fontSize: '24px',
            color: '#ffffff',
        }).setOrigin(0.5);

        // Start the game on pointer down or spacebar press
        this.input.once('pointerdown', this.startGame, this);
        this.input.keyboard.once('keydown-SPACE', this.startGame, this);
    }

    startGame() {
        this.scene.start('GameScene');
    }
} 