export default class AboutScene extends Phaser.Scene {
    constructor() {
        super({ key: 'AboutScene' });
    }

    preload() {
        // Load photo once (ensure it only loads if not already in cache).
        if (!this.textures.exists('about_photo')) {
            this.load.image('about_photo', 'assets/images/about_photo.png'); // Replace with actual image path/format
        }
    }

    create() {
        const { width, height } = this.scale;

        // Simple white background so text remains legible.
        this.cameras.main.setBackgroundColor('#ffffff');

        // --- Back arrow ---
        const backArrow = this.add.text(20, 20, '← Back', {
            fontFamily: 'Oswald',
            fontSize: '26px',
            color: '#065fad',
            fontStyle: 'bold'
        }).setOrigin(0, 0)
          .setInteractive({ useHandCursor: true });

        backArrow.on('pointerdown', () => {
            this.scene.start('MenuScene');
        });

        // --- Photo at the top ---
        let yPos = 60; // below arrow
        if (this.textures.exists('about_photo')) {
            const photo = this.add.image(width / 2, yPos, 'about_photo').setOrigin(0.5, 0);
            const maxWidth = width * 0.7;
            const maxHeight = height * 0.35;
            const scale = Math.min(maxWidth / photo.width, maxHeight / photo.height);
            photo.setScale(scale);
            yPos += photo.displayHeight + 20;
        }

        // --- Descriptive text ---
        const aboutText = `This game was a father-son project that gave my 7-year-old son, Henry, hands-on experience with coding and AI tools. He helped brainstorm ideas, tweak the gameplay, create images and sound effects, and even wrote bits of code alongside me.\n\nThe inspiration came from our visits to Urbanna, VA, where Henry loves spending time with his Pop and Didi, riding around on the boat, catching crabs, and harvesting oysters. We wanted to capture a bit of that adventure and turn it into something fun and chaotic that others could enjoy too.\n\nHope you enjoy playing it as much as we enjoyed making it!\n\nQuestions, comments, or bugs to report?`;

        const bodyText = this.add.text(width / 2, yPos, aboutText, {
            fontFamily: 'Arial',
            fontSize: '18px',
            color: '#000000',
            align: 'center',
            wordWrap: { width: width * 0.85 },
        }).setOrigin(0.5, 0);

        // --- 'Email Us!' link ---
        const emailY = bodyText.y + bodyText.height + 10;
        const emailLink = this.add.text(width / 2, emailY, 'Email Us!', {
            fontFamily: 'Oswald',
            fontSize: '26px',
            color: '#065fad',
            fontStyle: 'bold'
        }).setOrigin(0.5, 0)
          .setInteractive({ useHandCursor: true });

        emailLink.on('pointerdown', () => {
            window.open('mailto:careyvan84@gmail.com');
        });
    }
} 