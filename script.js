"use strict";

// Anslut till Socket.IO-servern (om du använder backend)
// Om du inte använder backend kan du kommentera ut denna rad
const socket = io("http://127.0.0.1:5000");

// Hämta HTML-element
const menu = document.getElementById("menu");
const menuItems = document.querySelectorAll(".menu-item");
const gameContainer = document.getElementById("game-container");
const settingsContainer = document.getElementById("settings-container");
const scoreboardContainer = document.getElementById("scoreboard-container");
const scoreList = document.getElementById("scoreList");
const powerupIndicator = document.getElementById("powerupIndicator");

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreDisplay = document.getElementById("scoreDisplay");
const playerCount = document.getElementById("playerCount");

// Hämta ljud-element
const eatSound = document.getElementById("eatSound");
const powerupSound = document.getElementById("powerupSound");
const gameOverSound = document.getElementById("gameOverSound");
const backgroundMusic = document.getElementById("backgroundMusic");
const bonusSound = document.getElementById("bonusSound");
const speedBoostSound = document.getElementById("speedBoostSound");
const menuNavigateSound = document.getElementById("menuNavigateSound");

// Spelvariabler
let playerID = Math.random().toString(36).substr(2, 9);
let snake = [];
let food = { x: 15, y: 15, type: "normal" };
let dx = 1, dy = 0;
let score = 0;
let gameOver = false;
let gameInterval = null;
let players = {};

let normalInterval = 100;  // Uppdateringsintervall i ms
let invincible = false;      // Tillfällig osårbarhet

// Menynavigering
let selectedMenuIndex = 0;

// Navigering i menyn med piltangenter och Enter
document.addEventListener("keydown", (event) => {
  if (menu.style.display !== "none") {
    if (event.key === "ArrowUp") {
      event.preventDefault();
      changeMenuSelection(-1);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      changeMenuSelection(1);
    } else if (event.key === "Enter") {
      event.preventDefault();
      selectMenuOption();
    }
  }
});

function changeMenuSelection(change) {
  // Spela navigeringsljud
  playMenuNavigateSound();
  menuItems[selectedMenuIndex].classList.remove("selected");
  selectedMenuIndex = (selectedMenuIndex + change + menuItems.length) % menuItems.length;
  menuItems[selectedMenuIndex].classList.add("selected");
}

function selectMenuOption() {
  const action = menuItems[selectedMenuIndex].getAttribute("data-action");
  switch (action) {
    case "start":
      startGame();
      break;
    case "settings":
      showSettings();
      break;
    case "scoreboard":
      showScoreboard();
      break;
    case "exit":
      exitGame();
      break;
  }
}

// Funktion för att spela meny-navigeringsljud
function playMenuNavigateSound() {
  if (menuNavigateSound) {
    menuNavigateSound.currentTime = 0;
    menuNavigateSound.play();
  }
}

// Starta spelet
function startGame() {
  menu.style.display = "none";
  settingsContainer.style.display = "none";
  scoreboardContainer.style.display = "none";
  gameContainer.style.display = "flex";
  backgroundMusic.play();
  resetGame();
  gameInterval = setInterval(gameLoop, normalInterval);
}

// Återställ spelets variabler
function resetGame() {
  gameOver = false;
  snake = [{ x: 10, y: 10 }];
  dx = 1; dy = 0;
  score = 0;
  invincible = false;
  placeFood();
}

// Huvudloopen
function gameLoop() {
  if (gameOver) return;
  moveSnake();
  draw();
  // Om backend används, sänd spelarens position
  socket.emit("move", { id: playerID, position: snake[0] });
  scoreDisplay.innerText = "Score: " + score;
}

// Flytta ormen
function moveSnake() {
  const head = { x: snake[0].x + dx, y: snake[0].y + dy };
  
  // Kontrollera väggkollision
  if (head.x < 0 || head.x >= 30 || head.y < 0 || head.y >= 30) {
    return endGame();
  }
  
  // Kontrollera själv-kollision (om ej osårbar)
  for (let i = 1; i < snake.length; i++) {
    if (head.x === snake[i].x && head.y === snake[i].y && !invincible) {
      return endGame();
    }
  }
  
  // Om ormen äter maten
  if (head.x === food.x && head.y === food.y) {
    if (food.type === "normal") {
      score += 10;
      playSound("eatSound");
    } else if (food.type === "bonus") {
      score += 50;
      playSound("bonusSound");
      triggerSpeedBoost();
    } else if (food.type === "powerup") {
      playSound("powerupSound");
      activateInvincibility();
    }
    placeFood();
  } else {
    snake.pop();
  }
  snake.unshift(head);
}

// Rita spelet
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "lime";
  snake.forEach(segment => {
    ctx.fillRect(segment.x * 20, segment.y * 20, 18, 18);
  });
  
  // Rita maten med färg beroende på typ
  if (food.type === "normal") {
    ctx.fillStyle = "red";
  } else if (food.type === "bonus") {
    ctx.fillStyle = "gold";
  } else if (food.type === "powerup") {
    ctx.fillStyle = "cyan";
  }
  ctx.fillRect(food.x * 20, food.y * 20, 18, 18);
  
  // Rita andra spelare (om backend används)
  ctx.fillStyle = "blue";
  Object.values(players).forEach(playerPos => {
    ctx.fillRect(playerPos.x * 20, playerPos.y * 20, 18, 18);
  });
}

// Lyssna på tangenttryckningar för ormrörelser under spelet
document.addEventListener("keydown", (event) => {
  if (gameContainer.style.display !== "none") {
    switch (event.key) {
      case "ArrowLeft":
        if (dx !== 1) { dx = -1; dy = 0; }
        break;
      case "ArrowUp":
        if (dy !== 1) { dx = 0; dy = -1; }
        break;
      case "ArrowRight":
        if (dx !== -1) { dx = 1; dy = 0; }
        break;
      case "ArrowDown":
        if (dy !== -1) { dx = 0; dy = 1; }
        break;
    }
  }
});

// Avsluta spelet
function endGame() {
  gameOver = true;
  clearInterval(gameInterval);
  backgroundMusic.pause();
  playSound("gameOverSound");
  setTimeout(() => {
    let playerName = prompt("Game Over! Your score: " + score + "\nEnter your name:");
    if (playerName) {
      submitHighscore(playerName, score);
    }
    returnToMenu();
  }, 500);
}

// Placera maten slumpmässigt med slumpmässig typ
function placeFood() {
  let rand = Math.random();
  let type = "normal";
  if (rand < 0.1) {
    type = "bonus";       // 10% chans
  } else if (rand < 0.15) {
    type = "powerup";     // 5% chans
  }
  food = {
    x: Math.floor(Math.random() * 30),
    y: Math.floor(Math.random() * 30),
    type: type
  };
}

// Speed Boost: Temporär ökad spelhastighet
function triggerSpeedBoost() {
  playSound("speedBoostSound");
  powerupIndicator.style.display = "block";
  powerupIndicator.innerText = "Speed Boost!";
  clearInterval(gameInterval);
  gameInterval = setInterval(gameLoop, 50);
  setTimeout(() => {
    clearInterval(gameInterval);
    gameInterval = setInterval(gameLoop, normalInterval);
    powerupIndicator.style.display = "none";
  }, 3000);
}

// Invincibility: Tillfällig osårbarhet
function activateInvincibility() {
  invincible = true;
  powerupIndicator.style.display = "block";
  powerupIndicator.innerText = "Invincible!";
  setTimeout(() => {
    invincible = false;
    powerupIndicator.style.display = "none";
  }, 5000);
}

// Skicka highscore till servern (backend)
function submitHighscore(name, score) {
  fetch("http://127.0.0.1:5000/submit_score", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: name, score: score })
  })
  .then(response => response.json())
  .then(data => updateHighscoreList(data))
  .catch(error => console.error("Error submitting score:", error));
}

// Visa Scoreboard
function showScoreboard() {
  fetch("http://127.0.0.1:5000/get_scores")
  .then(response => response.json())
  .then(data => {
    updateHighscoreList(data);
    menu.style.display = "none";
    gameContainer.style.display = "none";
    settingsContainer.style.display = "none";
    scoreboardContainer.style.display = "flex";
  })
  .catch(error => console.error("Error fetching scores:", error));
}

function updateHighscoreList(scores) {
  scoreList.innerHTML = scores.map(scoreObj => `<li>${scoreObj.name}: ${scoreObj.score}</li>`).join("");
}

// Visa Settings (placeholder)
function showSettings() {
  menu.style.display = "none";
  gameContainer.style.display = "none";
  scoreboardContainer.style.display = "none";
  settingsContainer.style.display = "flex";
}

// Gå tillbaka till huvudmenyn
function returnToMenu() {
  clearInterval(gameInterval);
  gameContainer.style.display = "none";
  settingsContainer.style.display = "none";
  scoreboardContainer.style.display = "none";
  menu.style.display = "flex";
  backgroundMusic.pause();
}

function backToMenu() {
  returnToMenu();
}

// Exit-funktion: Ladda om sidan
function exitGame() {
  location.reload();
}

// Spela upp ett ljud
function playSound(soundId) {
  const sound = document.getElementById(soundId);
  if (sound) {
    sound.currentTime = 0;
    sound.play();
  }
}

// Socket.IO-händelser (om backend används)
socket.on("update_players", data => {
  players = data;
  playerCount.innerText = "Players Online: " + Object.keys(players).length;
});

socket.on("boss_spawned", bossData => {
  playSound("powerupSound");
  // Extra logik för boss-händelser kan läggas till här
});

socket.on("update_boss", bossData => {
  console.log("Boss updated:", bossData);
});
