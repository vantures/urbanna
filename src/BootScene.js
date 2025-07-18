// src/BootScene.js
// The loading scene: responsible for creating placeholder assets and moving to the menu.

export default class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }

    preload() {
        // Create loading bar
        const progressBar = this.add.graphics();
        const progressBox = this.add.graphics();
        progressBox.fillStyle(0x222222, 0.8);
        progressBox.fillRect(240, 270, 320, 50);

        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        const loadingText = this.make.text({
            x: width / 2,
            y: height / 2 - 50,
            text: 'Loading...',
            style: {
                font: '20px monospace',
                fill: '#ffffff'
            }
        });
        loadingText.setOrigin(0.5, 0.5);

        const percentText = this.make.text({
            x: width / 2,
            y: height / 2 - 5,
            text: '0%',
            style: {
                font: '18px monospace',
                fill: '#ffffff'
            }
        });
        percentText.setOrigin(0.5, 0.5);

        const assetText = this.make.text({
            x: width / 2,
            y: height / 2 + 50,
            text: '',
            style: {
                font: '14px monospace',
                fill: '#ffffff'
            }
        });
        assetText.setOrigin(0.5, 0.5);

        // Update progress bar
        this.load.on('progress', function (value) {
            progressBar.clear();
            progressBar.fillStyle(0xffffff, 1);
            progressBar.fillRect(250, 280, 300 * value, 30);
            percentText.setText(parseInt(value * 100) + '%');
        });

        this.load.on('fileprogress', function (file) {
            assetText.setText('Loading asset: ' + file.key);
        });

        this.load.on('complete', () => {
            progressBar.destroy();
            progressBox.destroy();
            loadingText.destroy();
            percentText.destroy();
            assetText.destroy();
            // Start menu scene after all assets are loaded
            this.scene.start('MenuScene');
        });

        // Create placeholder textures via graphics.
        // this.createRectTexture('player', 40, 40, 0x00ff00); // removed to avoid key conflict; player will use PNG
        // this.createRectTexture('log2', 100, 20, 0x8b4513); // replaced by PNG
        this.createRectTexture('oysterCage', 60, 40, 0x4b4b4b);
        this.createRectTexture('jetSki', 80, 30, 0xff0000);
        this.createRectTexture('wake', 4, 4, 0xffffff);
        // this.createRectTexture('oyster', 20, 20, 0xffffff);
        // this.createRectTexture('fireworks', 25, 25, 0xffff00);
        // this.createRectTexture('sunglasses', 30, 15, 0x000000);
        // this.createRectTexture('kayaker', 60, 30, 0x00ffff); // disabled to allow kayaker.png to load
        // Placeholder for geese (disabled when PNG present)
        // this.createRectTexture('geese', 80, 40, 0xffffff);



        // Procedural water texture (64x64) with wave stripes
        this.createWaterTexture('water', 64, 64);

        // Placeholder texture for the bridge goal
        this.createRectTexture('bridge', 240, 40, 0xaaaaaa);

        // Load external images (if present). If the files are missing, the generated rectangle textures will be used instead.
        this.load.image('player', 'assets/images/powerboat.png');
        this.load.image('buoy', 'assets/images/buoy.png');
        this.load.image('kayaker', 'assets/images/kayaker.png');
        // Use existing log.png art for the new log2 obstacle until log2.png is available
        this.load.image('geese', 'assets/images/geese.png');
        this.load.image('jetski', 'assets/images/jetski.png');
        this.load.image('magic_oyster', 'assets/images/magic_oyster.png');
        this.load.image('osprey_nest', 'assets/images/osprey_nest.png');
        this.load.image('logo', 'assets/images/rivahracelogo.png');
        this.load.image('branch', 'assets/images/branch.png');
        this.load.image('sailboat', 'assets/images/sailboat.png');
        // Preload About page photo so it's ready when AboutScene first opens
        this.load.image('about_photo', 'assets/images/about_photo.png');

        // Audio assets
        this.load.audio('snd_buoy', 'assets/audio/buoy.mp3');
        this.load.audio('snd_geese', 'assets/audio/geese.mp3');
        this.load.audio('snd_kayak', 'assets/audio/kayak.mp3');
        this.load.audio('snd_jetski', 'assets/audio/jetski.mp3');
        this.load.audio('snd_osprey', 'assets/audio/osprey.mp3');
        this.load.audio('snd_oyster', 'assets/audio/oyster.mp3');
        this.load.audio('snd_invincible', 'assets/audio/invincible.mp3');
        this.load.audio('bgm', 'assets/audio/background.mp3');
        // Correct filename for sailboat background music
        this.load.audio('bgm_sail', 'assets/audio/background_sailing.mp3');
        this.load.audio('snd_crash', 'assets/audio/crash.mp3');
        this.load.audio('snd_gameover', 'assets/audio/gameover.mp3');
    }

    create() {
        // Debug: confirm textures loaded
        // eslint-disable-next-line no-console
        console.log('Texture exists - branch:', this.textures.exists('branch'));
        // eslint-disable-next-line no-console
        console.log('Texture exists - geese:', this.textures.exists('geese'));
        // eslint-disable-next-line no-console
        console.log('Texture exists - sailboat:', this.textures.exists('sailboat'));

        // Scene start is now handled in the load.complete callback
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

    /**
     * Generates a repeating water texture with subtle wave stripes.
     */
    createWaterTexture(key, w, h) {
        const gfx = this.add.graphics();
        const base = 0x1979d4;      // deeper blue
        const lighter = 0x2a8aed;   // slight tint
        const darker = 0x1268c0;

        // solid base colour
        gfx.fillStyle(base, 1);
        gfx.fillRect(0, 0, w, h);

        // subtle broad gradient stripes – very low alpha
        const stripeHeight = 8;
        for (let y = 0; y < h; y += stripeHeight) {
            const col = y % (stripeHeight * 2) === 0 ? lighter : darker;
            gfx.fillStyle(col, 0.04); // very faint
            gfx.fillRect(0, y, w, stripeHeight);
        }

        // scatter small transparent dots to break repetition
        for (let i = 0; i < 120; i++) {
            const rx = Phaser.Math.Between(0, w);
            const ry = Phaser.Math.Between(0, h);
            const size = Phaser.Math.Between(2, 4);
            gfx.fillStyle(0xffffff, 0.03);
            gfx.fillRect(rx, ry, size, size);
        }

        // few curved ripple arcs
        gfx.lineStyle(1, 0xffffff, 0.05);
        for (let i = 0; i < 4; i++) {
            const cx = Phaser.Math.Between(0, w);
            const cy = Phaser.Math.Between(0, h);
            gfx.beginPath();
            gfx.arc(cx, cy, Phaser.Math.Between(8, 14), 0, Math.PI * 2);
            gfx.strokePath();
        }

        gfx.generateTexture(key, w, h);
        gfx.destroy();
    }

} 