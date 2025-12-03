const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Images
const background1 = new Image();
const background2 = new Image();
const walkSprite = new Image();
const regularSprite = new Image();
const jumpSprite = new Image();
const enemySprite = new Image();
const collisionSprite = new Image();

background1.src = 'background1.png';
background2.src = 'background2.png';
walkSprite.src = 'playerWalkSprite.png';
regularSprite.src = 'playerSprite.png';
jumpSprite.src = 'playerJumpSprite.png';
enemySprite.src = 'enemySprite.png';
collisionSprite.src = 'explosionSpriteSheet.png';

// Variables
let bgX1 = 0, bgX2 = canvas.width;
const groundY = 300;
const player = {
    x: 100,
    y: groundY,
    width: 50,
    height: 50,
    frame: 0,
    alive: true,
    jumping: false,
    velocityY: 0,
    gravity: 0.5,
    jumpStrength: -12,
    state: 'walking', // New property to track whether the player is walking or jumping
    lastFrameTime: Date.now(),  // Track the last time the frame was updated
    spriteToggleTime: Date.now(), // Track time for switching sprites
    useWalkSprite: false // Toggle between regular and walk sprite
};
const enemies = [];
const bullets = [];
const enemyBullets = [];
let collisionFrame = 0;
let gameOver = false;
let score = 0;
let lives = 3;
let gameTime = 0;
let enemySpawnInterval = 2000;
let speedMultiplier = 1;
const explosions = [];  // Array to store explosions

// Explosion settings
const explosionFrameWidth = 64; // Width of each frame in explosion sprite sheet
const explosionFrameHeight = 64; // Height of each frame
const explosionFrameCount = 5; // Number of frames in the sprite sheet

// Functions
function drawParallax() {
    // Draw the background images
    ctx.drawImage(background1, bgX1, 0, canvas.width, canvas.height);
    ctx.drawImage(background2, bgX2, 0, canvas.width, canvas.height);

    // Move backgrounds left
    bgX1 -= 2;
    bgX2 -= 2;

    // If a background image moves offscreen, reset it to the right
    if (bgX1 <= -canvas.width) {
        bgX1 = canvas.width;
    }
    if (bgX2 <= -canvas.width) {
        bgX2 = canvas.width;
    }
}

function drawPlayer() {
    if (player.alive) {
        const frameWidth = 144;  // Assuming each frame in the sprite sheet is 144px wide
        const frameHeight = 128; // Assuming the sprite height is 128px

        const currentTime = Date.now();
        
        // Check if it's time to toggle sprite (every second)
        if (currentTime - player.spriteToggleTime >= 250) {
            player.useWalkSprite = !player.useWalkSprite;  // Toggle the sprite state
            player.spriteToggleTime = currentTime;  // Update the last toggle time
        }

        // Draw the appropriate sprite based on state
        if (player.jumping) {
            // If jumping, use the jumping sprite
            ctx.drawImage(
                jumpSprite,
                0, 0, frameWidth, frameHeight, // Assuming only one frame for the jump sprite
                player.x, player.y, player.width, player.height // Positioning the player
            );
        } else if (player.useWalkSprite && player.state === 'walking') {
            // If walking, use the walking sprite
            ctx.drawImage(
                walkSprite,
                player.frame * frameWidth, 0, frameWidth, frameHeight, // Cut out the walking frame
                player.x, player.y, player.width, player.height // Draw on the canvas
            );
        } else {
            // If not walking, use the regular sprite (not jumping)
            ctx.drawImage(
                regularSprite,
                0, 0, frameWidth, frameHeight, // Assuming only one frame for the regular sprite
                player.x, player.y, player.width, player.height // Positioning the player
            );
        }
    } else {
        ctx.font = '30px Arial';
        ctx.fillStyle = 'red';
        ctx.fillText('Game Over!', canvas.width / 2 - 80, canvas.height / 2);
        gameOver = true;
    }
}

function updatePlayer() {
    if (player.jumping) {
        player.velocityY += player.gravity;
        player.y += player.velocityY;

        if (player.y >= groundY) {
            player.y = groundY;
            player.jumping = false;
            player.velocityY = 0;
            player.state = 'walking'; // When player lands, set state to 'walking'
        }
    }
}

function spawnEnemy() {
    const enemyType = Math.random() < 0.5 ? 'normal' : 'fast';
    const enemy = {
        x: canvas.width,
        y: Math.random() * (groundY - 100),
        width: enemyType === 'fast' ? 40 : 50,
        height: enemyType === 'fast' ? 40 : 50,
        speed: (Math.random() * 3 + 1) * speedMultiplier,
        verticalSpeed: Math.random() * 2 + 1,
        direction: Math.random() > 0.5 ? 1 : -1,
        type: enemyType
    };
    enemies.push(enemy);
}

function drawEnemies() {
    enemies.forEach((enemy, index) => {
        enemy.x -= enemy.speed;
        enemy.y += enemy.verticalSpeed * enemy.direction;

        if (enemy.y <= 0 || enemy.y >= groundY - enemy.height) {
            enemy.direction *= -1;
        }

        ctx.drawImage(enemySprite, enemy.x, enemy.y, enemy.width, enemy.height);
        if (checkCollision(player, enemy)) {
            lives--;
            enemies.splice(index, 1);
            if (lives <= 0) player.alive = false;
        }
        if (enemy.x + enemy.width < 0) enemies.splice(index, 1);
        if (Math.random() < 0.01) shootEnemyBullet(enemy);
    });
}


function shootEnemyBullet(enemy) {
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    enemyBullets.push({
        x: enemy.x,
        y: enemy.y,
        velocityX: (dx / distance) * 5,
        velocityY: (dy / distance) * 5,
        width: 8,
        height: 8
    });
}

function drawEnemyBullets() {
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        const bullet = enemyBullets[i];
        ctx.fillStyle = 'red';
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
        bullet.x += bullet.velocityX;
        bullet.y += bullet.velocityY;
        if (checkCollision(player, bullet)) {
            lives--;
            enemyBullets.splice(i, 1);
            if (lives <= 0) player.alive = false;
        }
        if (bullet.x < 0 || bullet.x > canvas.width || bullet.y < 0 || bullet.y > canvas.height) {
            enemyBullets.splice(i, 1);
        }
    }
}

function shootBullet(mouseX, mouseY) {
    // Calculate the correct starting position of the bullet (just to the right of the player)
    const bulletStartX = player.x + player.width; // Starting slightly to the right of the player
    const bulletStartY = player.y + player.height / 2; // Starting from the vertical center of the player

    // Adjust mouse coordinates relative to the canvas
    const canvasRect = canvas.getBoundingClientRect();
    const relativeMouseX = mouseX - canvasRect.left;
    const relativeMouseY = mouseY - canvasRect.top;

    // Calculate the direction (dx, dy) from player to mouse
    const dx = relativeMouseX - bulletStartX;
    const dy = relativeMouseY - bulletStartY;

    // Normalize the direction (get unit vector) and set the bullet velocity
    const distance = Math.sqrt(dx * dx + dy * dy); // Get the distance between player and mouse
    const velocityX = (dx / distance) * 10; // Velocity in the x direction
    const velocityY = (dy / distance) * 10; // Velocity in the y direction

    // Push the bullet to the array, setting its initial position and velocity
    bullets.push({
        x: bulletStartX, // Initial x position just to the right of the player
        y: bulletStartY, // Initial y position in the center of the player
        velocityX, // Horizontal speed
        velocityY  // Vertical speed
    });
}

function drawBullets() {
    for (let bulletIndex = bullets.length - 1; bulletIndex >= 0; bulletIndex--) {
        const bullet = bullets[bulletIndex];
        ctx.fillStyle = 'yellow';
        ctx.fillRect(bullet.x, bullet.y, 10, 5);
        bullet.x += bullet.velocityX;
        bullet.y += bullet.velocityY;

        for (let enemyIndex = enemies.length - 1; enemyIndex >= 0; enemyIndex--) {
            const enemy = enemies[enemyIndex];
            if (checkCollision(bullet, enemy)) {
                // Add explosion effect here
                explosions.push({
                    x: enemy.x,
                    y: enemy.y,
                    frame: 0
                });

                score += 10;
                enemies.splice(enemyIndex, 1);
                bullets.splice(bulletIndex, 1);
                break;
            }
        }
        if (bullet.x > canvas.width || bullet.x < 0 || bullet.y > canvas.height || bullet.y < 0) {
            bullets.splice(bulletIndex, 1);
        }
    }
}



function checkCollision(obj1, obj2) {
    return (
        obj1.x < obj2.x + obj2.width &&
        obj1.x + 10 > obj2.x && // Bullet width
        obj1.y < obj2.y + obj2.height &&
        obj1.y + 5 > obj2.y    // Bullet height
    );
}
let explosionFrameDelay = 200; // Time between each frame in the explosion animation (in ms)

function drawExplosions() {
    const scaledWidth = 100; // New width for the explosion (adjust as needed)
    const scaledHeight = 89; // New height for the explosion (adjust proportionally)

    for (let i = explosions.length - 1; i >= 0; i--) {
        const explosion = explosions[i];
        const currentTime = Date.now();

        // Check if it's time to update the frame
        if (!explosion.lastFrameTime || currentTime - explosion.lastFrameTime >= explosionFrameDelay) {
            explosion.lastFrameTime = currentTime; // Reset the timer
            explosion.frame++; // Move to the next frame
        }

        // Draw the current frame of the explosion
        if (explosion.frame < explosionFrameCount) {
            const frameX = explosion.frame * 200; // Adjust based on sprite sheet frame width
            ctx.drawImage(
                collisionSprite,
                frameX, 0, 200, 179, // Crop the sprite sheet (200px wide, 179px tall)
                explosion.x - scaledWidth / 2, explosion.y - scaledHeight / 2, // Center the smaller explosion
                scaledWidth, scaledHeight // Use the new scaled dimensions
            );
        } else {
            // Remove the explosion if all frames have been displayed
            explosions.splice(i, 1);
        }
    }
}






function drawScoreboard() {
    ctx.font = '20px Arial';
    ctx.fillStyle = 'black';
    ctx.fillText(`Score: ${Math.floor(score)}`, 10, 20); // Round the score down
    ctx.fillText(`Lives: ${lives}`, 10, 40);
}

function gameLoop() {
    if (!gameOver) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);  // Clear the entire canvas
        drawParallax();  // Draw the moving background
        drawPlayer();    // Draw the player
        updatePlayer();  // Update player position
        drawEnemies();   // Draw enemies
        drawBullets();   // Draw player bullets
        drawEnemyBullets(); // Draw enemy bullets
        drawExplosions();  // Draw explosions
        drawScoreboard(); // Draw score/lives

        requestAnimationFrame(gameLoop);  // Call the next frame

        score += 0.1; // Increment score over time
    }
}



setInterval(() => {
    if (!gameOver) {
        spawnEnemy();
        if (enemySpawnInterval > 500) enemySpawnInterval -= 100;
        speedMultiplier += 0.01;
    }
}, enemySpawnInterval);

window.addEventListener('keydown', (event) => {
    if (event.code === 'Space' && !player.jumping && !gameOver) {
        player.jumping = true;
        player.state = 'jumping'; // Switch state to jumping
        player.velocityY = player.jumpStrength;
    }
});

canvas.addEventListener('click', (event) => {
    if (!gameOver) {
        shootBullet(event.clientX, event.clientY);
    }
});

gameLoop();