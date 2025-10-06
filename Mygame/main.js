const canvas = document.getElementById('gameCanvas'); 
const ctx = canvas.getContext('2d'); 
const startBtn = document.getElementById('startBtn'); 
const menuOverlay = document.getElementById('menuOverlay'); 
const soundBtn = document.getElementById('soundBtn'); 
const pauseBtn = document.getElementById('pauseBtn'); 
const levelText = document.getElementById('levelText'); 
const scoreText = document.getElementById('scoreText'); 
const joystickContainer = document.getElementById('joystickContainer'); 
const bgMusic = document.getElementById('bgMusic');

let gameState = 'menu'; // menu, playing, paused, levelup, gameover
let soundEnabled = true; // Start with sound on, per user request
let currentLevel = 1; 
let score = 0; 

// canvas 
const CANVAS_WIDTH = 800; 
const CANVAS_HEIGHT = 600; 
canvas.width = CANVAS_WIDTH; 
canvas.height = CANVAS_HEIGHT; 


let player = { x: CANVAS_WIDTH/2, y: CANVAS_HEIGHT/2, size:40, speed:4, sanity:100, speedBoostTimer:0, invulnerableTimer:0 }; 


let enemies=[], orbs=[], powerups=[], particles=[], bullets=[]; // NEW: bullets array
let keys={}, shakeAmount=0, glitchTimer=0, backgroundHue=0, gameTime=0; 
let enemySpawnTimer=0, orbSpawnTimer=0, powerupSpawnTimer=0; 
let fireRateTimer = 0; 
const FIRE_RATE_DELAY = 10; 

// timer
let lastTime = 0; 
let levelDuration = 30; // 30 seconds 
let levelTimeRemaining = levelDuration; 
const targetFPS = 60; 
const frameDuration = 1000 / targetFPS; // millis 

const enemyEmojis=['😈','👻','💀','👾','🦠','🧟','👹','🎃','🐛','🦂']; 
const powerupTypes=['calm','speed','bomb']; 
const powerupEmojis={calm:'✨',speed:'⚡',bomb:'💣'}; 


//the main logic

function calculateFinalScore(currentLevel, gameTime, sanity) { 
    // Score based on time, level, sanity, and points from destroying enemies
    return score + currentLevel * 1000 + Math.floor(gameTime * 60) + sanity * 100; 
} 

function initLevel(levelNum){ 
    currentLevel = levelNum; 
    enemies=[]; orbs=[]; powerups=[]; particles=[]; bullets=[]; // Reset bullets too
    levelTimeRemaining = levelDuration; 
    player.x=CANVAS_WIDTH/2; player.y=CANVAS_HEIGHT/2; 
    player.sanity=Math.min(100,player.sanity+20); 
    enemySpawnTimer=0; orbSpawnTimer=0; powerupSpawnTimer=0; 
    for(let i=0;i<Math.min(3+levelNum*2,30);i++) spawnEnemy(); 
    for(let i=0;i<3;i++) spawnOrb(); 
} 

function spawnEnemy(){ 
    const side=Math.floor(Math.random()*4); 
    let x,y; 
    switch(side){ 
        case 0: x=Math.random()*CANVAS_WIDTH; y=-40; break; 
        case 1: x=CANVAS_WIDTH+40; y=Math.random()*CANVAS_HEIGHT; break; 
        case 2: x=Math.random()*CANVAS_WIDTH; y=CANVAS_HEIGHT+40; break; 
        case 3: x=-40; y=Math.random()*CANVAS_HEIGHT; break; 
    } 
    enemies.push({x,y,size:40,speed:1+currentLevel*0.3,emoji:enemyEmojis[Math.floor(Math.random()*enemyEmojis.length)],rotation:0,wobble:0}); 
} 

function spawnOrb(){ orbs.push({x:50+Math.random()*(CANVAS_WIDTH-100),y:50+Math.random()*(CANVAS_HEIGHT-100),size:20,pulse:0}); } 
function spawnPowerup(){ 
    const type=powerupTypes[Math.floor(Math.random()*powerupTypes.length)]; 
    powerups.push({x:50+Math.random()*(CANVAS_WIDTH-100),y:50+Math.random()*(CANVAS_HEIGHT-100),size:30,type,emoji:powerupEmojis[type],rotation:0}); 
} 


function shoot() {
    // Only allow firing if the game is playing and the fire rate timer is zero
    if (fireRateTimer <= 0 && gameState === 'playing') {
        const bulletSize = 10;
        const bulletSpeed = 10;
        
        // Simple bullet shot straight up from the player's center
        bullets.push({
            x: player.x,
            y: player.y - player.size / 2, // Start slightly above the player
            size: bulletSize,
            speed: bulletSpeed,
        });

        // Reset the fire rate timer
        fireRateTimer = FIRE_RATE_DELAY; 
    }
}

function createParticles(x,y,color,count=10){ 
    for(let i=0;i<count;i++){ 
        particles.push({x,y,vx:(Math.random()-0.5)*8,vy:(Math.random()-0.5)*8,size:2+Math.random()*8,color,life:1}); 
    } 
} 

function checkCollision(a,b){ return Math.hypot(a.x-b.x,a.y-b.y) < (a.size+b.size)/2; } 


// --- EVENT LISTENERS ---

// keyboard
window.addEventListener('keydown',e=>{ 
    keys[e.key.toLowerCase()]=true; 
    if(e.key===' '){
        e.preventDefault(); // Prevent spacebar from scrolling page
        shoot(); // Call shoot function immediately on press
    }
    // REMOVED: if(e.key===' ' && gameState==='playing') gameState='paused'; 
    if(e.key==='p' && gameState==='playing') gameState='paused'; // Assuming 'p' is the intended pause key
}); 
window.addEventListener('keyup',e=>{ keys[e.key.toLowerCase()]=false; }); 


// touch 
const dpadButtons = document.querySelectorAll('.dpad-button'); 
dpadButtons.forEach(btn => { 
    const key = btn.getAttribute('data-key'); 
    if (key) { 
        // Handles movement (w, a, s, d) and shooting (space)
        const eventHandler = (e) => {
            e.preventDefault(); 
            if (e.type.startsWith('touch')) {
                 // Use preventDefault to stop default mobile behavior
            }
            keys[key] = (e.type === 'touchstart' || e.type === 'mousedown');
            if (key === 'p' && keys[key]) {

            } else if (key === ' ' && keys[key]) {
                shoot();
            }
        };

        btn.addEventListener('touchstart', eventHandler, { passive: false }); 
        btn.addEventListener('touchend', (e) => { e.preventDefault(); keys[key] = false; }, { passive: false }); 
        
        btn.addEventListener('mousedown', eventHandler); 
        btn.addEventListener('mouseup', (e) => { e.preventDefault(); keys[key] = false; }); 
        btn.addEventListener('mouseleave', (e) => { if (keys[key]) keys[key] = false; }); 
    } 
}); 


// canvas 
function resizeCanvas() { 
    const container = document.querySelector('.game-container'); 
    if (!container) return; 

    const containerWidth = container.clientWidth; 
    const containerHeight = window.innerHeight * 0.7; 
    
    const aspectRatio = CANVAS_WIDTH / CANVAS_HEIGHT; 

    let newWidth = containerWidth; 
    let newHeight = newWidth / aspectRatio; 

    if (newHeight > containerHeight) { 
        newHeight = containerHeight; 
        newWidth = newHeight * aspectRatio; 
    } 
    
    canvas.style.width = `${newWidth}px`; 
    canvas.style.height = `${newHeight}px`; 

    // Only show the joystick on small screens (e.g., mobile) 
    if (window.innerWidth < 768 && joystickContainer) { 
        joystickContainer.style.display = 'flex'; 
    } else if (joystickContainer) { 
        joystickContainer.style.display = 'none'; 
    } 
} 
window.addEventListener('resize', resizeCanvas); 

document.addEventListener('DOMContentLoaded', () => { 
    resizeCanvas(); 
    // Re-check after a brief delay in case initial DOM load hasn't fully computed styles 
    setTimeout(resizeCanvas, 100); 
    // Start music automatically if sound is enabled (modern browsers may block this until user interaction)
    toggleMusic(soundEnabled);
}); 

// --- MUSIC/SOUND TOGGLE ---
function toggleMusic(play) {
    if (!bgMusic) return;

    if (play) {
        // Must check if the audio is paused before attempting to play
        if (bgMusic.paused) {
            bgMusic.play().catch(e => {
                console.warn("Autoplay prevented or failed. User interaction is required to start music.", e);
            });
        }
    } else {
        bgMusic.pause();
    }
}


// --- GAME LOOP --- 
function gameLoop(timestamp){ 
    if(gameState!=='playing'){ requestAnimationFrame(gameLoop); return; } 

    const deltaTime = timestamp - lastTime; 
    lastTime = timestamp; 

    if(deltaTime > 500) { 
        requestAnimationFrame(gameLoop); 
        return; 
    } 

    levelTimeRemaining -= deltaTime / 1000; 
    gameTime += deltaTime / 1000; 

    const factor = (deltaTime / frameDuration); // Factor is ~1.0 at 60 FPS 

    // Update Timers
    fireRateTimer = Math.max(0, fireRateTimer - factor); // Decrement fire rate timer

    // Background drawing
    ctx.fillStyle='#000'; ctx.fillRect(0,0,CANVAS_WIDTH,CANVAS_HEIGHT); 
    backgroundHue=(backgroundHue+2*factor)%360; ctx.fillStyle=`hsla(${backgroundHue},80%,15%,0.3)`; ctx.fillRect(0,0,CANVAS_WIDTH,CANVAS_HEIGHT); 

    // Camera Shake and Glitch Effects
    if(shakeAmount>0){ ctx.save(); ctx.translate((Math.random()-0.5)*shakeAmount,(Math.random()-0.5)*shakeAmount); shakeAmount*=0.9; } 
    if(glitchTimer>0){ glitchTimer-=factor; if(Math.random()>0.7){ ctx.fillStyle=`rgba(255,0,${Math.random()*255},0.1)`; ctx.fillRect(Math.random()*CANVAS_WIDTH,Math.random()*CANVAS_HEIGHT,Math.random()*200,Math.random()*50); } } 

    // Player Movement
    let moveSpeed=player.speed * factor; 
    if(player.speedBoostTimer>0){ moveSpeed*=1.8; player.speedBoostTimer-=factor; } 
    if(keys['w']) player.y=Math.max(player.size/2,player.y-moveSpeed); 
    if(keys['s']) player.y=Math.min(CANVAS_HEIGHT-player.size/2,player.y+moveSpeed); 
    if(keys['a']) player.x=Math.max(player.size/2,player.x-moveSpeed); 
    if(keys['d']) player.x=Math.min(CANVAS_WIDTH-player.size/2,player.x+moveSpeed); 


    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        
        // 1. Movement
        bullet.y -= bullet.speed * factor;
        
        // 2. Collision check with enemies
        let hit = false;
        for (let j = enemies.length - 1; j >= 0; j--) {
            const enemy = enemies[j];
            if (checkCollision(bullet, enemy)) {
                // Enemy Hit!
                createParticles(enemy.x, enemy.y, '#ffffff', 20); 
                enemies.splice(j, 1);
                score += 50; // Bonus score for destroying enemy
                hit = true;
                break; // Break the inner loop since the bullet is spent
            }
        }

        if (hit || bullet.y < -bullet.size / 2) {
            // Remove bullet if it hit an enemy or went off screen
            bullets.splice(i, 1);
            continue; 
        }

        // 3. Draw bullet
        ctx.fillStyle = '#ff00ff';
        ctx.fillRect(bullet.x - bullet.size / 2, bullet.y - bullet.size / 2, bullet.size, bullet.size);
    }

    // enemy 
    enemies.forEach((enemy,i)=>{ 
        const dx=player.x-enemy.x, dy=player.y-enemy.y, dist=Math.hypot(dx,dy); 
        enemy.x+=(dx/dist)*enemy.speed * factor; enemy.y+=(dy/dist)*enemy.speed * factor; enemy.rotation+=0.05*factor; 
        
        // Player-Enemy Collision
        if(player.invulnerableTimer<=0 && checkCollision(player,enemy)){ 
            player.sanity-=10; player.invulnerableTimer=60; shakeAmount=20; glitchTimer=30; createParticles(player.x,player.y,'#ff0066',15); 
            if(player.sanity<=0){ 
                gameState='gameover'; 
                score = calculateFinalScore(currentLevel, gameTime, 0); 
                toggleMusic(false); // Stop music on game over
                showGameOver(); 
                return; 
            } 
        } 
        
        // Draw Enemy
        ctx.save(); ctx.translate(enemy.x,enemy.y); ctx.rotate(enemy.rotation); 
        ctx.fillStyle='rgba(0,0,0,0.5)'; ctx.fillRect(-enemy.size/2+3,-enemy.size/2+3,enemy.size,enemy.size); 
        ctx.fillStyle='#000'; ctx.fillRect(-enemy.size/2-2,-enemy.size/2-2,enemy.size+4,enemy.size+4); 
        const enemyHue=(backgroundHue+i*30)%360; ctx.fillStyle=`hsl(${enemyHue},100%,50%)`; 
        ctx.fillRect(-enemy.size/2,-enemy.size/2,enemy.size,enemy.size); 
        ctx.font=`${enemy.size*0.8}px Arial`; ctx.textAlign='center'; ctx.textBaseline='middle'; 
        ctx.fillText(enemy.emoji,0,0); ctx.restore(); 
    }); 

    if (gameState === 'gameover') { 
        requestAnimationFrame(gameLoop); 
        return; 
    } 

    // draw obs 
    orbs.forEach((orb,i)=>{ 
        orb.pulse+=0.1*factor; 
        if(checkCollision(player,orb)){ player.sanity=Math.min(100,player.sanity+15); createParticles(orb.x,orb.y,'#00ff88',12); orbs.splice(i,1); } 
        const pulseSize=orb.size+Math.sin(orb.pulse)*5; 
        ctx.save(); ctx.translate(orb.x,orb.y); ctx.shadowBlur=20; ctx.shadowColor='#00ff88'; 
        ctx.fillStyle='#000'; ctx.beginPath(); ctx.arc(0,0,pulseSize/2+3,0,Math.PI*2); ctx.fill(); 
        ctx.fillStyle='#00ff88'; ctx.beginPath(); ctx.arc(0,0,pulseSize/2,0,Math.PI*2); ctx.fill(); 
        ctx.restore(); 
    }); 

    // power 
    powerups.forEach((p,i)=>{ 
        p.rotation+=0.05*factor; 
        if(checkCollision(player,p)){ 
            if(p.type==='calm'){ player.sanity=100; createParticles(p.x,p.y,'#ffff00',20); } 
            else if(p.type==='speed'){ player.speedBoostTimer=300; createParticles(p.x,p.y,'#00ffff',20); } 
            else if(p.type==='bomb'){ enemies=[]; shakeAmount=30; createParticles(p.x,p.y,'#ff0000',30); } 
            powerups.splice(i,1); 
        } 
        ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.rotation); 
        ctx.fillStyle='rgba(0,0,0,0.5)'; ctx.fillRect(-p.size/2+4,-p.size/2+4,p.size,p.size); 
        ctx.fillStyle='#000'; ctx.fillRect(-p.size/2-3,-p.size/2-3,p.size+6,p.size+6); 
        const colors={calm:'#ffff00',speed:'#00ffff',bomb:'#ff0000'}; 
        ctx.fillStyle=colors[p.type]; ctx.fillRect(-p.size/2,-p.size/2,p.size,p.size); 
        ctx.font=`${p.size*0.7}px Arial`; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(p.emoji,0,0); 
        ctx.restore(); 
    }); 

    // Par 
    particles=particles.filter(p=>{ p.x+=p.vx*factor; p.y+=p.vy*factor; p.vy+=0.2*factor; p.life-=0.02*factor; if(p.life>0){ ctx.fillStyle=p.color; ctx.globalAlpha=p.life; ctx.fillRect(p.x-p.size/2,p.y-p.size/2,p.size,p.size); ctx.globalAlpha=1; return true;} return false; }); 

    // Player draw 
    if(player.invulnerableTimer>0){ player.invulnerableTimer-=factor; if(Math.floor(player.invulnerableTimer/10)%2===1) ctx.globalAlpha=0.5; } 
    ctx.save(); ctx.translate(player.x,player.y); 
    if(player.speedBoostTimer>0){ ctx.strokeStyle='#00ffff'; ctx.lineWidth=3; ctx.beginPath(); ctx.arc(0,0,player.size/2+10,0,Math.PI*2); ctx.stroke(); } 
    ctx.fillStyle='rgba(0,0,0,0.5)'; ctx.fillRect(-player.size/2+4,-player.size/2+4,player.size,player.size); 
    ctx.fillStyle='#000'; ctx.fillRect(-player.size/2-3,-player.size/2-3,player.size+6,player.size+6); 
    ctx.fillStyle='#00ff00'; ctx.fillRect(-player.size/2,-player.size/2,player.size,player.size); 
    ctx.font=`${player.size*0.8}px Arial`; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('😎',0,0); 
    ctx.restore(); ctx.globalAlpha=1; 

    if(shakeAmount>0) ctx.restore(); 

    // UI bar (inside canvas) 
    const barWidth=300, barHeight=30, barX=CANVAS_WIDTH/2-barWidth/2, barY=20; 
    ctx.fillStyle='rgba(0,0,0,0.7)'; ctx.fillRect(barX+5,barY+5,barWidth,barHeight); 
    ctx.fillStyle='#000'; ctx.fillRect(barX-4,barY-4,barWidth+8,barHeight+8); 
    ctx.fillStyle='#333'; ctx.fillRect(barX,barY,barWidth,barHeight); 
    const sanityColor=player.sanity>60?'#00ff00':player.sanity>30?'#ffff00':'#ff0000'; 
    ctx.fillStyle=sanityColor; ctx.fillRect(barX,barY,(player.sanity/100)*barWidth,barHeight); 
    ctx.fillStyle='#fff'; ctx.font='bold 16px Arial'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.strokeStyle='#000'; ctx.lineWidth=4; 
    ctx.strokeText(`SANITY: ${Math.floor(player.sanity)}%`,CANVAS_WIDTH/2,barY+barHeight/2); 
    ctx.fillText(`SANITY: ${Math.floor(player.sanity)}%`,CANVAS_WIDTH/2,barY+barHeight/2); 
    ctx.font='bold 24px Arial'; ctx.textAlign='left'; ctx.strokeText(`LEVEL ${currentLevel}`,20,80); ctx.fillText(`LEVEL ${currentLevel}`,20,80); 
    ctx.textAlign='right'; 
    const timeLeft=Math.max(0,Math.ceil(levelTimeRemaining)); 
    const timeDisplay = levelTimeRemaining > 0 ? `${timeLeft}s` : 'CLEAR!'; 
    ctx.strokeText(`TIME: ${timeDisplay}`,CANVAS_WIDTH-20,80); 
    ctx.fillText(`TIME: ${timeDisplay}`,CANVAS_WIDTH-20,80); 

    //timers 
    enemySpawnTimer+=factor; if(enemySpawnTimer>Math.max(60-currentLevel*2,20)){ spawnEnemy(); enemySpawnTimer=0; } 
    orbSpawnTimer+=factor; if(orbSpawnTimer>180 && orbs.length<5){ spawnOrb(); orbSpawnTimer=0; } 
    powerupSpawnTimer+=factor; if(powerupSpawnTimer>300 && powerups.length<2){ spawnPowerup(); powerupSpawnTimer=0; } 

    //complete logic 
    if(levelTimeRemaining<=0){ 
        const nextLevel = currentLevel + 1; 
        if(nextLevel<=20){ 
            showLevelUp(); 
            score = calculateFinalScore(currentLevel, gameTime, player.sanity); 
            setTimeout(()=>{ initLevel(nextLevel); gameState='playing'; lastTime = performance.now(); },2000); 
            gameState='levelup'; 
        } else { 
            gameState='gameover'; 
            score=calculateFinalScore(currentLevel, gameTime, player.sanity); 
            toggleMusic(false); // Stop music on win
            showGameOver(); 
        } 
    } 

    levelText.innerText=`LEVEL: ${currentLevel}/20`; 
    // Show current running score
    scoreText.innerText=`SCORE: ${score + currentLevel*1000 + Math.floor(gameTime*60)}`; 

    requestAnimationFrame(gameLoop); 
} 


startBtn.onclick=()=>{ 
    // Start game and music
    menuOverlay.style.display='none'; 
    initLevel(1); 
    score=0; 
    gameTime=0; 
    gameState='playing'; 
    lastTime = performance.now(); 
    toggleMusic(soundEnabled);
    requestAnimationFrame(gameLoop); 
}; 

// sound
soundBtn.onclick=()=>{ 
    soundEnabled=!soundEnabled; 
    soundBtn.innerText=soundEnabled?'🔊':'🔇'; 
    toggleMusic(soundEnabled);
}; 

// Pause 
pauseBtn.onclick=()=>{ 
    if(gameState === 'playing'){ 
        gameState='paused'; 
        toggleMusic(false); 
        showPause(); 
    } 
}; 

// --- OVERLAYS ---
function showPause(){ 
    const div=document.createElement('div'); div.className='overlay'; div.style.background='rgba(0,0,0,0.8)'; 
    div.innerHTML=`<h2 style="font-size:3rem;color:#facc15;text-shadow:4px 4px 0 #000;">PAUSED</h2>`; 
    const btn=document.createElement('button'); btn.className='button'; btn.style.background='#22c55e'; btn.innerText='RESUME'; 
    btn.onclick=()=>{ 
        div.remove(); 
        gameState='playing'; 
        toggleMusic(soundEnabled); 
        lastTime = performance.now(); 
        requestAnimationFrame(gameLoop); 
    }; 
    div.appendChild(btn); 
    document.querySelector('.game-container').appendChild(div); 
} 

function showLevelUp(){ 
    const div=document.createElement('div'); div.className='overlay'; div.style.background='linear-gradient(to bottom right, rgba(124,58,237,0.95), rgba(236,72,153,0.95), rgba(250,204,21,0.95))'; 
    div.innerHTML=`<div style="font-size:5rem;">🎉</div><h2 style="font-size:4rem;color:white;text-shadow:6px 6px 0 #000;">LEVEL UP!</h2><p style="font-size:2rem;color:#06b6d4;">LEVEL ${currentLevel+1}</p>`; 
    document.querySelector('.game-container').appendChild(div); 
    setTimeout(()=>{ div.remove(); },2000); 
} 

function showGameOver(){ 
    const div=document.createElement('div'); div.className='overlay'; div.style.background='rgba(0,0,0,0.95)'; 
    const finalScore = isNaN(score) ? 0 : score; 

    const isWin = currentLevel >= 20 && player.sanity > 0; 
    const emoji = isWin ? '👑' : '🤯'; 
    const titleColor = isWin ? '#00ff88' : '#ef4444'; 
    const titleText = isWin ? 'YOU ESCAPED THE VIRUS!' : 'YOU LOST YOUR MIND!'; 

    div.innerHTML=`<div style="font-size:5rem;">${emoji}</div><h2 style="font-size:4rem;color:${titleColor};text-shadow:5px 5px 0 #000;">${titleText}</h2><p style="font-size:2rem;color:#facc15;">LEVEL REACHED: ${currentLevel}</p><p style="font-size:2rem;color:#06b6d4;">SCORE: ${finalScore}</p>`; 

    const btn=document.createElement('button'); 
    btn.className='button'; 
    btn.style.background='#06b6d4'; 
    btn.innerText='PLAY AGAIN'; 

    btn.onclick=()=>{ 
div.remove(); 
        initLevel(1); 
        score=0; 
        gameTime=0; 
        gameState='playing'; 
        lastTime = performance.now(); 
        toggleMusic(soundEnabled); 
        requestAnimationFrame(gameLoop); 
    }; 

    div.appendChild(btn); 
    document.querySelector('.game-container').appendChild(div); 
} 