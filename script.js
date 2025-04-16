"use strict";

// Hämta HTML-element
const menu = document.getElementById("menu");
const menuItems = document.querySelectorAll(".menu-item");
const gameContainer = document.getElementById("game-container");
const settingsContainer = document.getElementById("settings-container");
const scoreboardContainer = document.getElementById("scoreboard-container");
const scoreList = document.getElementById("scoreList");

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreDisplay = document.getElementById("scoreDisplay");

// Ljud-element
const eatSound = document.getElementById("eatSound");
const bonusSound = document.getElementById("bonusSound");
const powerupSound = document.getElementById("powerupSound");
const speedBoostSound = document.getElementById("speedBoostSound");
const gameOverSound = document.getElementById("gameOverSound");
const backgroundMusic = document.getElementById("backgroundMusic");
const menuNavigateSound = document.getElementById("menuNavigateSound");

// Menynavigering
let selectedMenuIndex = 0;

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
  menuItems[selectedMenuIndex].classList.remove("selected");
  selectedMenuIndex = (selectedMenuIndex + change + menuItems.length) % menuItems.length;
  menuItems[selectedMenuIndex].classList.add("selected");
  playMenuNavigateSound();
}

function selectMenuOption() {
  const action = menuItems[selectedMenuIndex].getAttribute("data-action");
  switch(action) {
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

function playMenuNavigateSound() {
  if (menuNavigateSound) {
    menuNavigateSound.currentTime = 0;
    menuNavigateSound.play();
  }
}

// Spelvariabler
let snake = [];
let food = { x: 15, y: 15, type: "normal" };
let dx = 1, dy = 0;
let score = 0;
let gameOver = false;
let gameInterval = null;
const normalInterval = 100;  // ms
let invincible = false;

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
  scoreDisplay.innerText = "Score: 0";
}

// Spelloopen
function gameLoop() {
  if (gameOver) return;
  moveSnake();
  draw();
  scoreDisplay.innerText = "Score: " + score;
}

// Flytta ormen
function moveSnake() {
  const head = { x: snake[0].x + dx, y: snake[0].y + dy };

  // Väggkollision
  if (head.x < 0 || head.x >= 30 || head.y < 0 || head.y >= 30) {
    return endGame();
  }
  // Självkollision (om ej osårbar)
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
}

// Lyssna på tangenttryckningar för ormrörelser
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
    let name = prompt("Game Over! Your score: " + score + "\nEnter your name:");
    if (name) {
      saveScore(name, score);
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

// Temporär snabbare spelhastighet
function triggerSpeedBoost() {
  playSound("speedBoostSound");
  clearInterval(gameInterval);
  gameInterval = setInterval(gameLoop, 50);
  setTimeout(() => {
    clearInterval(gameInterval);
    gameInterval = setInterval(gameLoop, normalInterval);
  }, 3000);
}

// Tillfällig osårbarhet
function activateInvincibility() {
  invincible = true;
  setTimeout(() => {
    invincible = false;
  }, 5000);
}

// Spara highscore lokalt via localStorage
function saveScore(name, score) {
  let scores = JSON.parse(localStorage.getItem("snakeScores")) || [];
  scores.push({ name: name, score: score });
  scores.sort((a, b) => b.score - a.score);
  scores = scores.slice(0, 10);
  localStorage.setItem("snakeScores", JSON.stringify(scores));
}

// Visa scoreboard
function showScoreboard() {
  let scores = JSON.parse(localStorage.getItem("snakeScores")) || [];
  updateScoreList(scores);
  menu.style.display = "none";
  gameContainer.style.display = "none";
  settingsContainer.style.display = "none";
  scoreboardContainer.style.display = "flex";
}

function updateScoreList(scores) {
  scoreList.innerHTML = scores.map(s => `<li>${s.name}: ${s.score}</li>`).join("");
}

// Visa settings (placeholder)
function showSettings() {
  menu.style.display = "none";
  gameContainer.style.display = "none";
  scoreboardContainer.style.display = "none";
  settingsContainer.style.display = "flex";
}

// Gå tillbaka till menyn
function returnToMenu() {
  clearInterval(gameInterval);
  gameContainer.style.display = "none";
  settingsContainer.style.display = "none";
  scoreboardContainer.style.display = "none";
  menu.style.display = "flex";
  backgroundMusic.pause();
}

function exitGame() {
  location.reload();
}

// Spela upp ett ljud
function playSound(id) {
  const sound = document.getElementById(id);
  if (sound) {
    sound.currentTime = 0;
    sound.play();
  }
}
