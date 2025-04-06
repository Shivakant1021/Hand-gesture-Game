const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// Canvas size setup
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Balloons and lasers state
const balloons = [];
const lasers = [];
let action = null;
let handPosition = { x: canvas.width / 2, y: canvas.height / 2 }; // Default position

// Initialize MediaPipe Hands
const hands = new Hands({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
});

hands.setOptions({
  maxNumHands: 1,
  modelComplexity: 1,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5,
});

hands.onResults(onResults);

const camera = new Camera(video, {
  onFrame: async () => {
    await hands.send({ image: video });
  },
  width: 1280,
  height: 720,
});

camera.start();

// Detect gestures
function onResults(results) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawObjects();

  if (results.multiHandLandmarks) {
    results.multiHandLandmarks.forEach((landmarks) => {
      const thumb = landmarks[4];
      const index = landmarks[8];
      const middle = landmarks[12];
      const palm = landmarks[0]; // Use the palm landmark for laser starting position

      // Update hand position
      handPosition.x = palm.x * canvas.width;
      handPosition.y = palm.y * canvas.height;

      const thumbIndexDistance = getDistance(thumb, index);
      const thumbMiddleDistance = getDistance(thumb, middle);

      if (thumbIndexDistance < 0.02) {
        action = 'balloon';
      } else if (thumbMiddleDistance < 0.02) {
        action = 'laser';
      } else {
        action = null;
      }
    });
  }

  if (action === 'balloon') {
    spawnBalloon();
  } else if (action === 'laser') {
    spawnLaser();
  }

  checkCollisions(); // Check for collisions after drawing objects
}

// Utility: Calculate distance between two landmarks
function getDistance(p1, p2) {
  return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
}

// Balloons logic
function spawnBalloon() {
  balloons.push({ x: Math.random() * canvas.width, y: canvas.height, radius: 20 });
}

function drawBalloons() {
  balloons.forEach((balloon, index) => {
    balloon.y -= 2; // Move up
    ctx.beginPath();
    ctx.arc(balloon.x, balloon.y, balloon.radius, 0, Math.PI * 2);
    ctx.fillStyle = 'red';
    ctx.fill();
    ctx.closePath();

    if (balloon.y < -balloon.radius) {
      balloons.splice(index, 1);
    }
  });
}

// Lasers logic
function spawnLaser() {
  lasers.push({ x: handPosition.x, y: handPosition.y }); // Start laser at hand position
}

function drawLasers() {
  lasers.forEach((laser, index) => {
    laser.y -= 10; // Move up
    ctx.beginPath();
    ctx.rect(laser.x - 2, laser.y, 4, 20);
    ctx.fillStyle = 'blue';
    ctx.fill();
    ctx.closePath();

    if (laser.y < -20) {
      lasers.splice(index, 1);
    }
  });
}

// Check for collisions
function checkCollisions() {
  balloons.forEach((balloon, balloonIndex) => {
    lasers.forEach((laser, laserIndex) => {
      const dist = Math.sqrt(
        (laser.x - balloon.x) ** 2 + (laser.y - balloon.y) ** 2
      );

      if (dist < balloon.radius) {
        // Remove the balloon and laser if they collide
        balloons.splice(balloonIndex, 1);
        lasers.splice(laserIndex, 1);
      }
    });
  });
}

// Draw all objects
function drawObjects() {
  drawBalloons();
  drawLasers();
}
