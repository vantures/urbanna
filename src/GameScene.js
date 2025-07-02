// src/GameScene.js
// Main gameplay scene for Rivah Dash.

const PLAYER_SPEED = 200; // Pixels per second for directional movement
const SPAWN_INTERVAL = 1200; // ms between obstacle spawns
const POWERUP_INTERVAL = 2500; // ms between power-up spawns

export default class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        this.score = 0;
    }

    create() {
        // Reset score
        this.score = 0;

        // Create tiled water background
        this.water = this.add.tileSprite(0, 0, this.scale.width, this.scale.height, 'water')
            .setOrigin(0);

        // Player setup
        this.player = this.physics.add.sprite(this.scale.width / 2, this.scale.height - 100, 'player');
        this.player.setCollideWorldBounds(true);

        // Create obstacle & power-up groups
        this.obstacles = this.physics.add.group();
        this.powerups = this.physics.add.group();

        // Overlap / collision handlers
        this.physics.add.overlap(this.player, this.powerups, this.collectPowerUp, null, this);
        this.physics.add.collider(this.player, this.obstacles, this.hitObstacle, null, this);

        // Score text
        this.scoreText = this.add.text(10, 10, 'Score: 0', {
            fontFamily: 'Arial',
            fontSize: '24px',
            color: '#ffffff',
        });

        // Input setup
        this.cursors = this.input.keyboard.createCursorKeys();

        // Touch input: follow pointer horizontally
        this.input.on('pointermove', (pointer) => {
            // Smoothly lerp to pointer x position
            this.player.x = Phaser.Math.Clamp(pointer.worldX, this.player.width / 2, this.scale.width - this.player.width / 2);
        });

        // Timers for spawning
        this.obstacleTimer = this.time.addEvent({ delay: SPAWN_INTERVAL, callback: this.spawnObstacle, callbackScope: this, loop: true });
        this.powerupTimer = this.time.addEvent({ delay: POWERUP_INTERVAL, callback: this.spawnPowerUp, callbackScope: this, loop: true });
    }

    update(time, delta) {
        // Scroll background to simulate movement
        this.water.tilePositionY += 0.5 * delta; // 0.5 px per ms ~ 480 px/s

        // Increment score over time
        this.score += delta * 0.01; // 0.01 points per ms => 10 pts per second
        this.scoreText.setText('Score: ' + Math.floor(this.score));

        // Keyboard movement
        if (this.cursors.left.isDown) {
            this.player.setVelocityX(-PLAYER_SPEED);
        } else if (this.cursors.right.isDown) {
            this.player.setVelocityX(PLAYER_SPEED);
        } else {
            this.player.setVelocityX(0);
        }

        if (this.cursors.up.isDown) {
            this.player.setVelocityY(-PLAYER_SPEED * 0.6); // slight up movement
        } else if (this.cursors.down.isDown) {
            this.player.setVelocityY(PLAYER_SPEED * 0.6);
        } else {
            this.player.setVelocityY(0);
        }

        // Destroy off-screen objects
        this.obstacles.children.iterate((child) => {
            if (child && child.y > this.scale.height + 100) {
                child.destroy();
            }
        });
        this.powerups.children.iterate((child) => {
            if (child && child.y > this.scale.height + 100) {
                child.destroy();
            }
        });
    }

    spawnObstacle() {
        const obstacleTypes = ['log', 'oysterCage', 'jetSki'];
        const key = Phaser.Utils.Array.GetRandom(obstacleTypes);
        const xPos = Phaser.Math.Between(40, this.scale.width - 40);
        const sprite = this.obstacles.create(xPos, -50, key);
        sprite.setVelocityY(200 + Phaser.Math.Between(-30, 30));
        sprite.setImmovable(true);
    }

    spawnPowerUp() {
        const powerupTypes = ['oyster', 'fireworks', 'sunglasses'];
        const key = Phaser.Utils.Array.GetRandom(powerupTypes);
        const xPos = Phaser.Math.Between(20, this.scale.width - 20);
        const sprite = this.powerups.create(xPos, -30, key);
        sprite.setVelocityY(180);
        sprite.setData('type', key);
    }

    collectPowerUp(player, powerup) {
        const type = powerup.getData('type');
        powerup.destroy();
        // Simple effect: increase score by different amounts
        switch (type) {
            case 'oyster':
                this.score += 50;
                break;
            case 'fireworks':
                this.score += 100;
                break;
            case 'sunglasses':
                this.score += 75;
                break;
        }
    }

    hitObstacle(player, obstacle) {
        this.physics.pause();
        player.setTint(0xff0000);
        // Delay then go back to menu
        this.time.delayedCall(1000, () => {
            this.scene.start('MenuScene');
        });
    }
} 