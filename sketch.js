// Simple "Fetch!" vibe game — throw a ball, the dog brings it back.
// Fixes: (1) score increments once per return, (2) stronger throws.

let W = 900, H = 560;
const GROUND_Y = 480;
const BALL_R = 10;

let player, dog, ball, score, aiming, aimVec, justScored;

function setup() {
  // Attach canvas into the wrap div to keep page tidy
  const holder = document.querySelector('.wrap') || document.body;
  const c = createCanvas(W, H);
  c.parent(holder);
  textFont('Arial, sans-serif');
  resetGame(true);
}

function resetGame(resetScore = false) {
  player = createVector(120, GROUND_Y);
  dog = {
    pos: createVector(180, GROUND_Y - 10),
    speed: 4.6,              // a hair faster
    hasBall: false,
    mood: 'ready'            // ready | chasing | returning
  };
  ball = {
    pos: player.copy(),
    vel: createVector(0, 0),
    inAir: false,
    atRest: true,
    carried: false
  };
  if (resetScore || score == null) score = 0;
  aiming = false;
  aimVec = createVector(0, 0);
  justScored = false;        // guard to prevent multi-increment
}

function draw() {
  drawBackdrop();
  drawHud();

  // Aiming guide
  if (aiming && !ball.inAir && !dog.hasBall) {
    push();
    stroke(255);
    strokeWeight(2);
    line(player.x, player.y - 30, mouseX, mouseY);
    noStroke();
    fill(255);
    const pwr = constrain(aimVec.mag(), 0, 420);
    textAlign(LEFT, CENTER);
    textSize(12);
    text('power: ' + nf(pwr, 1, 0), 20, 26);
    pop();
  }

  updateBall();
  updateDog();

  drawPlayer();
  drawBall();
  drawDog();
}

/* ---------------------- Input ---------------------- */
function mousePressed() {
  // start aiming only if near the player
  if (dist(mouseX, mouseY, player.x, player.y - 30) < 100 && !ball.inAir && !dog.hasBall) {
    aiming = true;
  }
}

function mouseDragged() {
  if (aiming) {
    aimVec.set(mouseX - player.x, mouseY - (player.y - 30));
    // allow bigger throws
    aimVec.limit(420);
  }
}

function mouseReleased() {
  if (aiming) {
    // stronger throw
    const powerScale = 0.12; // ↑ was 0.05
    ball.pos.set(player.x, player.y - 30);
    ball.vel = aimVec.copy().mult(powerScale);
    ball.inAir = true;
    ball.atRest = false;
    ball.carried = false;
    dog.mood = 'ready';
    aiming = false;
    justScored = false; // new throw => ready to score next return
  }
}

function keyPressed() {
  if (key.toLowerCase() === 'r') {
    resetGame(true);
  }
}

/* ---------------------- Game Objects ---------------------- */
function updateBall() {
  if (ball.carried) {
    // stick ball to dog's mouth
    ball.pos.x = dog.pos.x + 12;
    ball.pos.y = dog.pos.y - 18;
    ball.vel.set(0, 0);
    ball.inAir = false;
    ball.atRest = true;
    return;
  }

  if (ball.inAir) {
    // gravity
    ball.vel.y += 0.5;
    // integrate
    ball.pos.add(ball.vel);

    // ground collision
    if (ball.pos.y + BALL_R >= GROUND_Y) {
      ball.pos.y = GROUND_Y - BALL_R;
      ball.vel.y *= -0.55;       // a bit bouncier
      ball.vel.x *= 0.985;       // less horizontal loss on bounce
      if (abs(ball.vel.y) < 1.2) ball.vel.y = 0;
    }

    // gentle floor roll/friction once it's basically grounded
    if (abs(ball.pos.y - (GROUND_Y - BALL_R)) < 0.5 && ball.vel.y === 0) {
      ball.vel.x *= 0.985;       // slow, smooth roll
      if (abs(ball.vel.x) < 0.08) ball.vel.x = 0;
    }

    // stop condition
    if (ball.vel.mag() < 0.12 && ball.pos.y >= GROUND_Y - BALL_R - 0.5) {
      ball.inAir = false;
      ball.atRest = true;
      ball.vel.set(0, 0);
    }

    // world bounds
    if (ball.pos.x < BALL_R) { ball.pos.x = BALL_R; ball.vel.x *= -0.4; }
    if (ball.pos.x > width - BALL_R) { ball.pos.x = width - BALL_R; ball.vel.x *= -0.4; }
  }
}

function updateDog() {
  // decide state
  if (!dog.hasBall) {
    if (ball.atRest && (ball.pos.x !== player.x || ball.pos.y !== player.y - 30)) {
      dog.mood = 'chasing'; // ball is somewhere out there
    }
  }

  // chase ball
  if (dog.mood === 'chasing' && !dog.hasBall) {
    moveToward(dog.pos, ball.pos, dog.speed);
    if (p5.Vector.dist(dog.pos, ball.pos) < 16) {
      dog.hasBall = true;
      ball.carried = true;
      dog.mood = 'returning';
    }
  }

  // return to player
  if (dog.mood === 'returning' && dog.hasBall) {
    const hand = createVector(player.x, player.y - 30);
    moveToward(dog.pos, hand, dog.speed * 1.08);
    if (p5.Vector.dist(dog.pos, hand) < 18) {
      // drop the ball and score ONCE
      dog.hasBall = false;
      ball.carried = false;
      ball.atRest = true;
      ball.inAir = false;
      ball.pos.set(player.x + 8, player.y - 30);
      if (!justScored) {
        score++;
        justScored = true; // prevent repeat increments while overlapping
      }
      dog.mood = 'ready';
    }
  }

  // idle wiggle
  if (dog.mood === 'ready') {
    dog.pos.y = GROUND_Y - 10 + sin(frameCount * 0.07) * 1.2;
  }
}

function moveToward(pos, target, speed) {
  const v = p5.Vector.sub(target, pos);
  const d = v.mag();
  if (d < speed) { pos.set(target); return; }
  v.normalize().mult(speed);
  pos.add(v);
}

/* ---------------------- Drawing ---------------------- */
function drawBackdrop() {
  // sky
  const r = map(sin(frameCount * 0.01), -1, 1, 150, 230);
  const g = map(cos(frameCount * 0.01), -1, 1, 200, 255);
  background(r, g, 255);

  // sun
  noStroke();
  fill(255, 240, 180, 180);
  ellipse(width - 90, 80, 80);

  // ground
  fill(60, 170, 90);
  rect(0, GROUND_Y, width, height - GROUND_Y);
}

function drawHud() {
  fill(0, 80);
  noStroke();
  rect(12, 12, 220, 60, 10);

  fill(255);
  textAlign(LEFT, TOP);
  textSize(14);
  text('Fetches: ' + score, 20, 18);
  text('Drag from player to throw', 20, 36);
  text('Press R to reset', 20, 54);
}

function drawPlayer() {
  push();
  fill(40);
  rect(player.x - 10, player.y - 60, 20, 50, 6); // body
  fill(230);
  ellipse(player.x, player.y - 80, 22);          // head
  ellipse(player.x, player.y - 30, 10);          // hand
  pop();
}

function drawBall() {
  push();
  fill(255, 120, 80);
  ellipse(ball.pos.x, ball.pos.y, BALL_R * 2);
  pop();
}

function drawDog() {
  push();
  const x = dog.pos.x, y = dog.pos.y;
  fill(120, 90, 60);
  rect(x - 18, y - 22, 36, 18, 8);               // body
  rect(x + 10, y - 30, 18, 16, 6);               // head
  rect(x + 12, y - 36, 6, 10, 3);                // ear
  rect(x - 14, y - 6, 6, 8, 3);                  // legs
  rect(x + 8, y - 6, 6, 8, 3);
  push();
  translate(x - 18, y - 24);                     // tail
  rotate(sin(frameCount * 0.4) * (dog.mood === 'returning' ? 0.5 : 0.9));
  rect(-10, -2, 12, 4, 2);
  pop();
  if (dog.hasBall) {
    fill(255, 120, 80);
    ellipse(x + 12, y - 18, BALL_R * 2);
  }
  pop();
}
