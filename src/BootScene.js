// src/BootScene.js
// The loading scene: responsible for creating placeholder assets and moving to the menu.

export default class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }

    preload() {
        // Create placeholder textures via graphics.
        this.createRectTexture('player', 40, 40, 0x00ff00);
        this.createRectTexture('log', 100, 20, 0x8b4513);
        this.createRectTexture('oysterCage', 60, 40, 0x4b4b4b);
        this.createRectTexture('jetSki', 80, 30, 0xff0000);
        this.createRectTexture('oyster', 20, 20, 0xffffff);
        this.createRectTexture('fireworks', 25, 25, 0xffff00);
        this.createRectTexture('sunglasses', 30, 15, 0x000000);

        // Simple blue water tile for scrolling background
        this.createRectTexture('water', 64, 64, 0x1e90ff);
    }

    create() {
        this.scene.start('MenuScene');
    }

    /**
     * Helper to generate a solid-colour rectangle texture.
     * @param {string} key - The texture key.
     * @param {number} width - Texture width in px.
     * @param {number} height - Texture height in px.
     * @param {number} color - Hex colour value.
     */
    createRectTexture(key, width, height, color) {
        const gfx = this.add.graphics();
        gfx.fillStyle(color, 1);
        gfx.fillRect(0, 0, width, height);
        gfx.generateTexture(key, width, height);
        gfx.destroy();
    }
} 