// src/BootScene.js
// The loading scene: responsible for creating placeholder assets and moving to the menu.

export default class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }

    preload() {
        // Create placeholder textures via graphics.
        // this.createRectTexture('player', 40, 40, 0x00ff00); // removed to avoid key conflict; player will use PNG
        // this.createRectTexture('log', 100, 20, 0x8b4513); // replaced by PNG
        this.createRectTexture('oysterCage', 60, 40, 0x4b4b4b);
        this.createRectTexture('jetSki', 80, 30, 0xff0000);
        this.createRectTexture('oyster', 20, 20, 0xffffff);
        this.createRectTexture('fireworks', 25, 25, 0xffff00);
        this.createRectTexture('sunglasses', 30, 15, 0x000000);
        // this.createRectTexture('kayaker', 60, 30, 0x00ffff); // disabled to allow kayaker.png to load
        // Placeholder for geese (disabled when PNG present)
        // this.createRectTexture('geese', 80, 40, 0xffffff);

        // Simple blue water tile for scrolling background
        this.createRectTexture('water', 64, 64, 0x1e90ff);

        // Placeholder texture for the bridge goal
        this.createRectTexture('bridge', 240, 40, 0xaaaaaa);

        // Load external images (if present). If the files are missing, the generated rectangle textures will be used instead.
        this.load.image('player', 'assets/images/powerboat.png');
        this.load.image('buoy', 'assets/images/buoy.png');
        this.load.image('kayaker', 'assets/images/kayaker.png');
        this.load.image('log', 'assets/images/log.png');
        this.load.image('geese', 'assets/images/geese.png');
        this.load.image('jetski', 'assets/images/jetski.png');
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