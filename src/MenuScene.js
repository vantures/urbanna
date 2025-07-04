// src/MenuScene.js
// Displays the main menu with a start button and boat selector.

export default class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
        this.selectedBoatKey = 'player'; // default powerboat
    }

    create() {
        const { width, height } = this.scale;

        // Title logo
        this.add.image(width / 2, height / 2 - 160, 'logo').setOrigin(0.5).setScale(0.8);

        // Boat selector thumbnails
        const powerThumb = this.add.image(width / 2 - 60, height / 2 + 40, 'player').setScale(0.25).setInteractive({ useHandCursor: true });
        const sailThumb  = this.add.image(width / 2 + 60, height / 2 + 40, 'sailboat').setScale(0.45).setInteractive({ useHandCursor: true });

        const highlight = this.add.rectangle(0,0, 10, 10)
            .setStrokeStyle(3, 0xffff00)
            .setOrigin(0.5);

        const selectBoat = (key, img) => {
            this.selectedBoatKey = key;
            highlight.setSize(img.displayWidth + 8, img.displayHeight + 8);
            highlight.setPosition(img.x, img.y);
        };

        powerThumb.on('pointerdown', () => selectBoat('player', powerThumb));
        sailThumb.on('pointerdown', () => selectBoat('sailboat', sailThumb));

        // Initialize highlight based on previously chosen boat (default powerboat)
        const savedKey = this.registry.get('boatKey') || 'player';
        this.selectedBoatKey = savedKey;
        if (savedKey === 'sailboat') {
            selectBoat('sailboat', sailThumb);
        } else {
            selectBoat('player', powerThumb);
        }

        // Instruction / start prompt
        this.add.text(width / 2, height / 2 + 120, 'Tap Screen or Press SPACE to Start', {
            fontFamily: 'Oswald',
            fontSize: '22px',
            color: '#065fad',
        }).setOrigin(0.5);

        // Start the game on pointer down or spacebar press
        this.input.once('pointerdown', this.startGame, this);
        this.input.keyboard.once('keydown-SPACE', this.startGame, this);
    }

    startGame() {
        // store selected boat
        this.registry.set('boatKey', this.selectedBoatKey);
        this.scene.start('GameScene');
    }
} 