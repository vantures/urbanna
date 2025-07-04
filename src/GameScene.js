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
const CAGE_SCALE     = 0.5;   // oysterCage what is this
const GEESE_SCALE = 1.0;
const GEESE_HORIZONTAL_SPEED = 60;
const JETSKI_SCALE = .9;
const JETSKI_SPEED = 250;
const INVINCIBILITY_DURATION = 5000; // ms of invulnerability granted by magic oyster
const OSPREY_NEST_SCALE = 0.5; // scale for osprey nest pole obstacle5
const WAKE_FREQ = 70;
const BRANCH_SCALE = 1.0; // scale for branch obstacle
const WATER_SCROLL_FACTOR = 0.25; // portion of obstacle speed applied to background
const SAILBOAT_SCALE = 0.6; // sailboat appears larger

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
        this.elapsedMs = 0;
        this.bgm = null; // background music instance
        this.prevPlayerX = 0; // Added for tilt calculation
    }

    create() {
        // Reset state
        this.score = 0;
        this.isGameOver = false;
        this.elapsedMs = 0;

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

        // Determine selected boat key from registry
        let boatKey = this.registry.get('boatKey') || 'player';
        if (!this.textures.exists(boatKey)) {
            boatKey = 'player'; // fallback if texture missing
        }

        // Player setup
        this.player = this.physics.add.sprite(this.scale.width / 2, this.scale.height - 80, boatKey);

        const scaleToApply = boatKey === 'sailboat' ? SAILBOAT_SCALE : PLAYER_SCALE;
        this.player.setScale(scaleToApply);
        this.player.setCollideWorldBounds(true);
        this.player.clearTint();
        this.player.setDepth(2); // ensure boat renders above wake

        /* Wake particles (Phaser 3.60+ GameObject form) */
        const wake = this.add.particles(0, 0, 'wake', {
            speed: { min: -40, max: 40 },
            angle: { min: 80, max: 100 },
            lifespan: { min: 800, max: 1200 },   /* lasts longer */
            quantity: 10,                        /* richer trail */
            scale: { start: 1.2, end: 0 },
            alpha: { start: 1, end: 0 },
            frequency: 20,                      /* emit more often */
            tint: 0xffffff,
            blendMode: 'ADD'
        });
        wake.setDepth(1); // between water (0) and boat (2)
        wake.startFollow(this.player, 0, this.player.displayHeight * 0.4);

        /* Stern sheet wake – wider but lighter */
        const sternZone = new Phaser.Geom.Rectangle(-this.player.displayWidth / 2, 0, this.player.displayWidth, 2);
        const sternWake = this.add.particles(0, 0, 'wake', {
            emitZone: { type: 'random', source: sternZone },
            speed: { min: -15, max: 15 },
            angle: 90,
            lifespan: { min: 900, max: 1400 }, // longer trail
            quantity: 3,
            scale: { start: 0.8, end: 0 },
            alpha: { start: 0.7, end: 0 },
            frequency: 40,
            tint: 0xffffff,
            blendMode: 'ADD'
        });
        sternWake.setDepth(0.5);
        sternWake.startFollow(this.player, 0, this.player.displayHeight * 0.35);

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
            // Smoothly lerp to pointer x position, constrain fully across screen
            this.player.x = Phaser.Math.Clamp(pointer.worldX, this.player.displayWidth / 2, this.scale.width - this.player.displayWidth / 2);
        });

        // Timers for spawning
        this.obstacleTimer = this.time.addEvent({ delay: SPAWN_INTERVAL, callback: this.spawnObstacle, callbackScope: this, loop: true });
        this.powerupTimer = this.time.addEvent({ delay: POWERUP_INTERVAL, callback: this.spawnPowerUp, callbackScope: this, loop: true });

        // Choose background music per boat
        let bgmKey = 'bgm';
        if (boatKey === 'sailboat' && this.cache.audio.exists('bgm_sail')) {
            bgmKey = 'bgm_sail';
        }
        if (this.bgm) {
            this.bgm.stop();
        }
        this.bgm = this.sound.add(bgmKey, { volume: 0.4, loop: true });
        this.bgm.play();
    }

    update(time, delta) {
        // Scroll water based on current obstacle speed
        const currentSpeed = BASE_OBSTACLE_SPEED + (this.elapsedMs / 1000) * SPEED_GROWTH_PER_SEC;
        const scrollPerMs = currentSpeed * WATER_SCROLL_FACTOR / 1000;
        this.water.tilePositionY -= scrollPerMs * delta; // upward scrolling relative to boat movement

        // Increment score & elapsed time when game is active
        if (!this.isGameOver) {
            this.elapsedMs += delta;
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

        // Disable vertical movement – keep boat fixed on the Y axis
        this.player.setVelocityY(0);

        /* ----- Boat tilt based on horizontal motion (keyboard & touch) ----- */
        const velX = this.player.body.velocity.x;

        // Fallback to positional delta when velocity is near-zero (touch dragging sets x directly)
        const posDeltaX = this.player.x - (this.prevPlayerX || this.player.x);
        const effectiveX = Math.abs(velX) > 20 ? velX : posDeltaX * 60; // posDeltaX per frame → rough px/s

        let targetAngle = 0;
        if (effectiveX < -20) {
            targetAngle = -8; // tilt left
        } else if (effectiveX > 20) {
            targetAngle = 8;  // tilt right
        }

        // Smoothly interpolate current angle toward the target
        this.player.angle = Phaser.Math.Linear(this.player.angle, targetAngle, 0.15);

        // Remember position for next frame
        this.prevPlayerX = this.player.x;
        /* ----------------------------------------------------------------- */

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
        // Weighted obstacle selection – kayaker appears ~20% of spawns
        const nonKayaker = ['branch', 'buoy', 'geese', 'jetski', 'osprey_nest'];
        const key = Phaser.Math.FloatBetween(0, 1) < 0.2 ? 'kayaker' : Phaser.Utils.Array.GetRandom(nonKayaker);
        let xPos = Phaser.Math.Between(40, this.scale.width - 40);
        let yPos = -50;

        const sprite = this.obstacles.create(xPos, yPos, key);

        // Play spawn sound for corresponding obstacle
        const spawnSounds = {
            buoy: 'snd_buoy',
            geese: 'snd_geese',
            jetski: 'snd_jetski',
            osprey_nest: 'snd_osprey',
        };

        if (key === 'kayaker') {
            // delay kayak splash sound by 500ms
            this.time.delayedCall(900, () => {
                this.sound.play('snd_kayak', { volume: 0.3 });
            });
        } else if (spawnSounds[key]) {
            this.sound.play(spawnSounds[key], { volume: 0.5 });
        }

        // Compute current speed based on elapsed time
        const elapsedSec = this.elapsedMs / 1000;
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
            // No additional voice; spawnSounds already played 'snd_kayak'

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

            /* Light horizontal wake for kayaker */
            const kayakDirRight = sprite.body.velocity.x > 0;
            const kayakZone = new Phaser.Geom.Rectangle(
                kayakDirRight ? sprite.displayWidth * -0.5 : 0,
                -2,
                sprite.displayWidth * 0.5,
                4
            );
            const kayakWake = this.add.particles(0, 0, 'wake', {
                emitZone: { type: 'random', source: kayakZone },
                speed: { min: 25, max: 50 },
                angle: kayakDirRight ? 180 : 0, // emit opposite travel direction
                lifespan: { min: 500, max: 900 },
                quantity: 2,
                frequency: 60,
                scale: { start: 0.5, end: 0 },
                alpha: { start: 0.5, end: 0 },
                tint: 0xffffff,
                blendMode: 'ADD',
            });
            kayakWake.setDepth(0.4);
            // Follow sprite slightly above centre so wake trails behind horizontally
            kayakWake.startFollow(sprite, kayakDirRight ? -sprite.displayWidth * 0.3 : sprite.displayWidth * 0.3, 0);
        } else if (key === 'geese') {
            // Match the kayaker pattern: spawn from left/right, horizontal drift, downward fall, and tilt bobbing
            const fromLeft = Phaser.Math.Between(0, 1) === 0;
            sprite.y = -50;
            sprite.x = fromLeft ? -50 : this.scale.width + 50;
            sprite.setVelocityX(fromLeft ? 120 : -120); // same horizontal speed as kayaker
            // vertical velocity remains from the default sprite.setVelocityY(curSpeed) call above
            sprite.setScale(GEESE_SCALE);

            // Flip sprite so geese face travel direction (default faces left)
            if (fromLeft) {
                sprite.setFlipX(true);
            } else {
                sprite.setFlipX(false);
            }

            // Update body size to match scaling
            sprite.body.setSize(sprite.displayWidth, sprite.displayHeight);

            // Subtle tilting (same as kayaker)
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

            /* Light horizontal wake for geese */
            const geeseDirRight = sprite.body.velocity.x > 0;
            const geeseZone = new Phaser.Geom.Rectangle(
                geeseDirRight ? sprite.displayWidth * -0.5 : 0,
                -2,
                sprite.displayWidth * 0.5,
                4
            );
            const geeseWake = this.add.particles(0, 0, 'wake', {
                emitZone: { type: 'random', source: geeseZone },
                speed: { min: 20, max: 35 },
                angle: geeseDirRight ? 180 : 0,
                lifespan: { min: 400, max: 800 },
                quantity: 2,
                frequency: 80,
                scale: { start: 0.4, end: 0 },
                alpha: { start: 0.4, end: 0 },
                tint: 0xffffff,
                blendMode: 'ADD',
            });
            geeseWake.setDepth(0.3);
            geeseWake.startFollow(sprite, geeseDirRight ? -sprite.displayWidth * 0.3 : sprite.displayWidth * 0.3, 0);
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

            /* Wake spray under jetski */
            const zoneWidth = sprite.displayWidth * 1.1; // a bit wider than jetski
            const jetZone = new Phaser.Geom.Rectangle(-zoneWidth / 2, 0, zoneWidth, 2);
            const jetskiWake = this.add.particles(0, 0, 'wake', {
                emitZone: { type: 'random', source: jetZone },
                speed: { min: 60, max: 120 },
                angle: 90, // downward
                lifespan: { min: 500, max: 900 },
                quantity: 4,             /* less dense */
                frequency: 80,           /* emit less often */
                scale: { start: 1.0, end: 0 },
                alpha: { start: 0.8, end: 0 },
                tint: 0xffffff,
                blendMode: 'ADD',
            });
            jetskiWake.setDepth(0.5);
            // Offset upward (-y) so wake originates behind moving jetski
            jetskiWake.startFollow(sprite, 0, -sprite.displayHeight * 0.4);
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
        } else if (key === 'branch') {
            // Same behavior as buoy but with branch sprite & scale
            sprite.setScale(BRANCH_SCALE);

            // Body same size as sprite
            sprite.body.setSize(sprite.displayWidth, sprite.displayHeight);
            sprite.body.setOffset((sprite.displayWidth - sprite.body.width) / 2, (sprite.displayHeight - sprite.body.height) / 2);

            // Gentle bobbing tilt like buoy
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

            /* Subtle wake for branch */
            const branchZone = new Phaser.Geom.Rectangle(-sprite.displayWidth / 2, 0, sprite.displayWidth, 2);
            const branchWake = this.add.particles(0, 0, 'wake', {
                emitZone: { type: 'random', source: branchZone },
                speed: { min: 10, max: 25 },
                angle: 90,
                lifespan: { min: 600, max: 1000 },
                quantity: 1,
                frequency: 120,
                scale: { start: 0.5, end: 0 },
                alpha: { start: 0.35, end: 0 },
                tint: 0xffffff,
                blendMode: 'ADD',
            });
            branchWake.setDepth(0.2);
            branchWake.startFollow(sprite, 0, -sprite.displayHeight * 0.3);
        } else if (key === 'osprey_nest') {
            sprite.setScale(OSPREY_NEST_SCALE);
            // No horizontal drift; just falls straight like default
            sprite.body.setSize(sprite.displayWidth, sprite.displayHeight);
        } else {
            // Generic fallback for any other obstacle types
            sprite.setScale(OBSTACLE_SCALE);
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
        const elapsedSec = this.elapsedMs / 1000;
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

                // Play collection & invincibility sounds
                this.sound.play('snd_oyster', { volume: 0.6 });
                this.sound.play('snd_invincible', { volume: 0.6 });

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

        // Stop background music and play crash/game over sounds
        if (this.bgm) {
            this.bgm.stop();
            this.bgm = null;
        }
        this.sound.play('snd_crash', { volume: 0.8 });
        this.sound.play('snd_gameover', { volume: 0.7, delay: 0.3 });

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
        this.invincibleText = this.add.text(this.scale.width / 2, 50, '5', {
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