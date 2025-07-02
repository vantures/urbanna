// src/GameScene.js
// Main gameplay scene for Rivah Dash.

const PLAYER_SPEED = 250; // Pixels per second for directional movement
const SPAWN_INTERVAL = 1200; // ms between obstacle spawns
const POWERUP_INTERVAL = 8000; // ms between magic oyster spawns (rarer)

// Top-down mode: constant scales
const PLAYER_SCALE = 0.4;
const BUOY_SCALE   = 0.45; // 5x smaller than before
const KAYAKER_SCALE = 0.4 ; // very small kayaker
const OBSTACLE_SCALE = 1.0;
const BASE_OBSTACLE_SPEED = 200; // starting speed in px/s
const SPEED_GROWTH_PER_SEC = 5; // additional px/s per second elapsed
const LOG_SCALE      = 1.0;   // <- new
const CAGE_SCALE     = 0.5;   // oysterCage what is this
const GEESE_SCALE = 1.0;
const GEESE_HORIZONTAL_SPEED = 60;
const JETSKI_SCALE = .9;
const JETSKI_SPEED = 250;
const INVINCIBILITY_DURATION = 5000; // ms of invulnerability granted by magic oyster
const OSPREY_NEST_SCALE = 0.5; // scale for osprey nest pole obstacle5
const WAKE_FREQ = 70;

export default class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        this.score = 0;
        this.isGameOver = false;
        this.invincible = false;
        this.invincibleEndTime = 0;
        this.invincibleText = null;
        this.invincibleTween = null;
        this.oysterCount = 0; // number of magic oysters collected
    }

    create() {
        // Reset state
        this.score = 0;
        this.isGameOver = false;
        this.startTimestamp = this.time.now; // used for speed scaling

        // Reset invincibility state
        this.invincible = false;
        this.invincibleEndTime = 0;
        if (this.invincibleText) {
            this.invincibleText.destroy();
        }
        this.invincibleText = null;

        // Reset oyster counter
        this.oysterCount = 0;

        // Simple water background (no perspective tint)
        this.water = this.add.tileSprite(0, 0, this.scale.width, this.scale.height, 'water').setOrigin(0);

        // Player setup
        this.player = this.physics.add.sprite(this.scale.width / 2, this.scale.height - 80, 'player');
        this.player.setScale(PLAYER_SCALE);
        this.player.setCollideWorldBounds(true);
        this.player.clearTint();

        // Collision body spans the entire visible boat sprite
        this.player.body.setSize(this.player.displayWidth, this.player.displayHeight, true);

        // Create obstacle & power-up groups
        this.obstacles = this.physics.add.group();
        this.powerups = this.physics.add.group();

        // Overlap / collision handlers
        this.physics.add.overlap(this.player, this.powerups, this.collectPowerUp, null, this);
        this.physics.add.overlap(this.player, this.obstacles, this.hitObstacle, null, this);

        // Score text
        this.scoreText = this.add.text(10, 10, 'Score: 0', {
            fontFamily: 'Arial',
            fontSize: '24px',
            color: '#ffffff',
        });

        // Oyster counter text (top-right)
        this.oysterText = this.add.text(this.scale.width - 10, 10, 'Oysters: 0', {
            fontFamily: 'Arial',
            fontSize: '24px',
            color: '#00ffff',
        }).setOrigin(1, 0);

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

        // Increment score over time only if game is active
        if (!this.isGameOver) {
            this.score += delta * 0.01; // 0.01 points per ms => 10 pts per second
            this.scoreText.setText('Score: ' + Math.floor(this.score));
        }

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

        // Destroy off-screen objects (after physics)
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

        if (this.invincible) {
            const remaining = Math.ceil((this.invincibleEndTime - time) / 1000);
            if (remaining <= 0) {
                this.invincible = false;
                if (this.invincibleText) {
                    this.invincibleText.destroy();
                    this.invincibleText = null;
                }
                this.player.clearTint();
                if (this.invincibleTween) {
                    this.invincibleTween.stop();
                    this.invincibleTween = null;
                }
            } else if (this.invincibleText) {
                this.invincibleText.setText(remaining.toString());
            }
        }
    }

    spawnObstacle() {
        const obstacleTypes = ['log', 'buoy', 'kayaker', 'geese', 'jetski', 'osprey_nest'];
        const key = Phaser.Utils.Array.GetRandom(obstacleTypes);
        let xPos = Phaser.Math.Between(40, this.scale.width - 40);
        let yPos = -50;

        const sprite = this.obstacles.create(xPos, yPos, key);

        // Compute current speed based on elapsed time
        const elapsedSec = (this.time.now - this.startTimestamp) / 1000;
        const curSpeed = BASE_OBSTACLE_SPEED + elapsedSec * SPEED_GROWTH_PER_SEC;

        // Default downward motion
        sprite.setVelocityY(curSpeed);

        // Horizontal kayaker hazard
        if (key === 'kayaker') {
            const fromLeft = Phaser.Math.Between(0, 1) === 0;
            sprite.y = -50;
            sprite.x = fromLeft ? -50 : this.scale.width + 50;
            sprite.setVelocityX(fromLeft ? 120 : -120); // horizontal drift, keep downward speed
            sprite.setScale(KAYAKER_SCALE);
            // Flip sprite to face travel direction (right-facing image by default)
            if (!fromLeft) {
                sprite.setFlipX(true);
            } else {
                sprite.setFlipX(false);
            }
            // Update body size to match scaling
            sprite.body.setSize(sprite.displayWidth, sprite.displayHeight);

            // Subtle bobbing tilt (kayaker)
            this.tweens.add({
                targets: sprite,
                angle: {
                    from: -4,
                    to: 4,
                },
                duration: Phaser.Math.Between(900, 1300),
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut',
            });
        } else if (key === 'geese') {
            const fromLeft = Phaser.Math.Between(0, 1) === 0;
            sprite.y = -50;
            sprite.x = fromLeft ? -50 : this.scale.width + 50;
            sprite.setVelocityX(fromLeft ? GEESE_HORIZONTAL_SPEED : -GEESE_HORIZONTAL_SPEED);
            sprite.setScale(GEESE_SCALE);

            // Flip so geese look in travel direction (default faces left)
            if (fromLeft) {
                sprite.setFlipX(true);
            } else {
                sprite.setFlipX(false);
            }

            sprite.body.setSize(sprite.displayWidth, sprite.displayHeight);
        } else if (key === 'jetski') {
            // Spawn from top, left, or right (not bottom)
            const edge = Phaser.Utils.Array.GetRandom(['top', 'left', 'right']);

            if (edge === 'top') {
                sprite.x = Phaser.Math.Between(40, this.scale.width - 40);
                sprite.y = -50;
                sprite.setVelocityY(curSpeed + 50); // aggressive downward speed
                sprite.setVelocityX(Phaser.Math.Between(-150, 150));
            } else if (edge === 'left') {
                sprite.x = -50;
                sprite.y = Phaser.Math.Between(60, this.scale.height / 2);
                sprite.setVelocityX(JETSKI_SPEED);
                sprite.setVelocityY(curSpeed * 0.5);
            } else {
                sprite.x = this.scale.width + 50;
                sprite.y = Phaser.Math.Between(60, this.scale.height / 2);
                sprite.setVelocityX(-JETSKI_SPEED);
                sprite.setVelocityY(curSpeed * 0.5);
                sprite.setFlipX(true); // face left when coming from right
            }

            sprite.setScale(JETSKI_SCALE);
            // Faster random spin (3x)
            sprite.setAngularVelocity(Phaser.Math.Between(-540, 540));

            sprite.body.setSize(sprite.displayWidth, sprite.displayHeight);
        } else if (key === 'buoy') {
            sprite.setScale(BUOY_SCALE);
            // Rectangle body matching sprite size
            sprite.body.setSize(sprite.displayWidth, sprite.displayHeight);
            sprite.body.setOffset((sprite.displayWidth - sprite.body.width) / 2, (sprite.displayHeight - sprite.body.height) / 2);

            // Subtle bobbing tilt (buoy)
            this.tweens.add({
                targets: sprite,
                angle: {
                    from: -3,
                    to: 3,
                },
                duration: Phaser.Math.Between(1000, 1400),
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut',
            });
        } else if (key === 'log') {
            sprite.setScale(LOG_SCALE);
            sprite.body.setSize(sprite.displayWidth, sprite.displayHeight);

            // Subtle vertical bobbing to mimic floating effect
            this.tweens.add({
                targets: sprite,
                y: '+=6', // move down 6 px (will yoyo back up)
                duration: Phaser.Math.Between(900, 1200),
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut',
            });
        } else if (key === 'osprey_nest') {
            sprite.setScale(OSPREY_NEST_SCALE);
            // No horizontal drift; just falls straight like default
            sprite.body.setSize(sprite.displayWidth, sprite.displayHeight);
        } else {
            // Default obstacle types now only include logs; apply log scale if needed
            sprite.setScale(LOG_SCALE);
            sprite.body.setSize(sprite.displayWidth, sprite.displayHeight);
        }

        sprite.body.setOffset((sprite.displayWidth - sprite.body.width) / 2, (sprite.displayHeight - sprite.body.height) / 2);

        sprite.setImmovable(true);

        // after each spawn
        const newDelay = Math.max(400, SPAWN_INTERVAL - elapsedSec * 30);  // example ramp
        this.obstacleTimer.delay = newDelay;
    }

    spawnPowerUp() {
        const powerupTypes = ['magic_oyster'];
        const key = Phaser.Utils.Array.GetRandom(powerupTypes);
        const xPos = Phaser.Math.Between(20, this.scale.width - 20);
        const sprite = this.powerups.create(xPos, -50, key);
        const elapsedSec = (this.time.now - this.startTimestamp) / 1000;
        const curSpeed = BASE_OBSTACLE_SPEED + elapsedSec * SPEED_GROWTH_PER_SEC;
        sprite.setVelocityY(curSpeed);
        sprite.setData('type', key);
        sprite.setScale(PLAYER_SCALE * 1.5);

        // Make the magic oyster flash rainbow colours so it stands out
        this.tweens.addCounter({
            from: 0,
            to: 360,
            duration: 1000, // 1-second colour cycle
            repeat: -1,
            onUpdate: (twn) => {
                const hue = twn.getValue();
                const color = Phaser.Display.Color.HSLToColor(hue / 360, 1, 0.5).color;
                sprite.setTint(color);
            },
        });

        // Add a subtle wiggle to bring the oyster to life
        this.tweens.add({
            targets: sprite,
            angle: { from: -10, to: 10 },
            duration: Phaser.Math.Between(600, 800),
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });
    }

    collectPowerUp(player, powerup) {
        const type = powerup.getData('type');
        powerup.destroy();
        // Simple effect: increase score by different amounts
        switch (type) {
            case 'magic_oyster':
                // Bonus points
                this.score += 100;
                // Increment oyster count and update UI
                this.oysterCount += 1;
                if (this.oysterText) {
                    this.oysterText.setText('Oysters: ' + this.oysterCount);
                }

                // +100 popup at player position
                const popup = this.add.text(player.x, player.y - 30, '+100', {
                    fontFamily: 'Arial',
                    fontSize: '26px',
                    color: '#ffff00',
                    stroke: '#000000',
                    strokeThickness: 3,
                }).setOrigin(0.5);
                this.tweens.add({
                    targets: popup,
                    y: popup.y - 40,
                    alpha: 0,
                    duration: 800,
                    ease: 'Cubic.easeOut',
                    onComplete: () => popup.destroy(),
                });

                this.activateInvincibility();
                break;
        }
    }

    hitObstacle(player, obstacle) {
        if (this.invincible) {
            obstacle.destroy();
            return;
        }
        if (this.isGameOver) return;
        this.isGameOver = true;

        // Stop physics and timers
        this.physics.pause();
        this.obstacleTimer.remove(false);
        this.powerupTimer.remove(false);

        // Highlight collision
        player.setTint(0xff0000);

        // Display final score message & prompt
        this.add.text(this.scale.width / 2, this.scale.height / 2 - 40, `Game Over`, {
            fontFamily: 'Arial',
            fontSize: '48px',
            color: '#ff3333',
            align: 'center',
        }).setOrigin(0.5);

        this.add.text(this.scale.width / 2, this.scale.height / 2 + 10, `Score: ${Math.floor(this.score)}`, {
            fontFamily: 'Arial',
            fontSize: '32px',
            color: '#ffff00',
            align: 'center',
        }).setOrigin(0.5);

        const promptText = this.add.text(this.scale.width / 2, this.scale.height / 2 + 60, 'Press SPACE or Tap to return', {
            fontFamily: 'Arial',
            fontSize: '20px',
            color: '#ffffff',
            align: 'center',
        }).setOrigin(0.5);

        // Wait for user input to go back to menu
        this.input.keyboard.once('keydown-SPACE', () => {
            this.scene.start('MenuScene');
        });
        this.input.once('pointerdown', () => {
            this.scene.start('MenuScene');
        });
    }

    activateInvincibility() {
        this.invincible = true;
        this.invincibleEndTime = this.time.now + INVINCIBILITY_DURATION;

        // Create / reset countdown indicator
        if (this.invincibleText) {
            this.invincibleText.destroy();
        }
        this.invincibleText = this.add.text(this.scale.width / 2, 10, '5', {
            fontFamily: 'Arial',
            fontSize: '32px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3,
        }).setOrigin(0.5);

        // Cycle tint for rainbow aura
        if (this.invincibleTween) {
            this.invincibleTween.stop();
        }
        this.invincibleTween = this.tweens.addCounter({
            from: 0,
            to: 360,
            duration: INVINCIBILITY_DURATION,
            onUpdate: (tween) => {
                const hue = tween.getValue();
                const color = Phaser.Display.Color.HSLToColor(hue / 360, 1, 0.5).color;
                this.player.setTint(color);
                if (this.invincibleText) {
                    this.invincibleText.setTint(color);
                }
            },
            onComplete: () => {
                this.player.clearTint();
            },
        });
    }
} 