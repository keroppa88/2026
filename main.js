import { TitleScene } from "./scenes/TitleScene.js";
import { GameScene } from "./scenes/GameScene.js";
import { EndScene } from "./scenes/EndScene.js";

console.log("main.js loaded");

// UI状態（Phaserから参照）
window.__INPUT = {
  up: false, down: false, left: false, right: false,
  aPressed: false,
  aHeld: false
};



// ★キーボードをブラウザで直接拾って __INPUT を更新（Phaser依存を断つ）
const KEY = { LEFT: 37, UP: 38, RIGHT: 39, DOWN: 40, SPACE: 32, ENTER: 13 };

document.addEventListener("keydown", (e) => {
  if ([KEY.LEFT, KEY.UP, KEY.RIGHT, KEY.DOWN, KEY.SPACE, KEY.ENTER].includes(e.keyCode)) {
    e.preventDefault();
  }
  switch (e.keyCode) {
    case KEY.LEFT: window.__INPUT.left = true; break;
    case KEY.RIGHT: window.__INPUT.right = true; break;
    case KEY.UP: window.__INPUT.up = true; break;
    case KEY.DOWN: window.__INPUT.down = true; break;
    case KEY.SPACE:
    case KEY.ENTER:
      if (!window.__INPUT.aHeld) window.__INPUT.aPressed = true;
      window.__INPUT.aHeld = true;
      break;
  }
});

document.addEventListener("keyup", (e) => {
  switch (e.keyCode) {
    case KEY.LEFT: window.__INPUT.left = false; break;
    case KEY.RIGHT: window.__INPUT.right = false; break;
    case KEY.UP: window.__INPUT.up = false; break;
    case KEY.DOWN: window.__INPUT.down = false; break;
    case KEY.SPACE:
    case KEY.ENTER:
      window.__INPUT.aHeld = false;
      break;
  }
});

const config = {
  type: Phaser.CANVAS,
  width: 360,
  height: 360,
  parent: "game-container",
  pixelArt: true,
  scene: [TitleScene, GameScene, EndScene],
};

const game = new Phaser.Game(config);

// ===== 画像UI入力（pad + A）=====
const bindDir = (id, dirKey) => {
  const el = document.getElementById(id);
  if (!el) return;

  const down = (e) => {
    e.preventDefault();
    window.__INPUT[dirKey] = true;
  };

  const up = (e) => {
    e.preventDefault();
    window.__INPUT[dirKey] = false;
  };

  el.addEventListener("pointerdown", down, { passive: false });
  el.addEventListener("pointerup", up, { passive: false });
  el.addEventListener("pointercancel", up, { passive: false });
  el.addEventListener("pointerleave", up, { passive: false });
  el.addEventListener("pointerout", up, { passive: false }); // ★これを足す
};

bindDir("btn-up", "up");
bindDir("btn-down", "down");
bindDir("btn-left", "left");
bindDir("btn-right", "right");

// A（押下1回＋押しっぱ管理）
const btnImgA = document.getElementById("btn-a");
if (btnImgA) {
  const down = (e) => {
    e.preventDefault();
    if (!window.__INPUT.aHeld) window.__INPUT.aPressed = true;
    window.__INPUT.aHeld = true;
  };
  const up = (e) => {
    e.preventDefault();
    window.__INPUT.aHeld = false;
  };

  btnImgA.addEventListener("pointerdown", down, { passive: false });
  btnImgA.addEventListener("pointerup", up, { passive: false });
  btnImgA.addEventListener("pointercancel", up, { passive: false });
  btnImgA.addEventListener("pointerleave", up, { passive: false });
  btnImgA.addEventListener("pointerout", up, { passive: false }); // ★追加
}


// 念のためフォーカス
setTimeout(() => window.focus(), 0);
