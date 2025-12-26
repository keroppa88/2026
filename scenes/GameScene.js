export class GameScene extends Phaser.Scene {
  constructor() {
    super("GameScene");
  }

  preload() {
    // images

    this.load.image("bg1", "assets/back01.png");
    this.load.image("bg2", "assets/back02.png");
    this.load.image("box", "assets/box.png");
    this.load.image("npc", "assets/inoki.png");

    this.load.image("hero1", "assets/hero01.png");
    this.load.image("hero2", "assets/hero02.png");
    this.load.image("heroSword1", "assets/hero03.png");
    this.load.image("heroSword2", "assets/hero04.png");

    // sounds
    this.load.audio("bgm", "assets/sound/backmusic.m4a");
    this.load.audio("exit", "assets/sound/getout.mp3");

    this.load.audio("talk", "assets/sound/talksound.mp3");
    this.load.audio("open", "assets/sound/open.mp3");
    this.load.audio("itemget", "assets/sound/itemget.mp3");
    this.load.audio("firesword", "assets/sound/firesword.m4a");
    this.load.audio("eat", "assets/sound/eat.mp3");
    this.load.audio("coin", "assets/sound/coinsound.m4a");
  }

  create() {

    this.safePlay = (key) => {
      try {
        if (this.cache.audio && this.cache.audio.exists(key)) {
          const volume = this.soundVolume[key] ?? 0.5;
          this.sound.play(key, { volume });
        }
      } catch (e) {
        console.error("Audio play failed:", key, e);
      }
    };


    // ===== サウンド音量設定 =====
    this.soundVolume = {
      bgm: 0.4,
      talk: 0.4,
      open: 0.8,
      coin: 0.4,
      firesword: 0.4,
      eat: 0.7,
      exit: 0.8,
    };

    if (this.sound.get("bgm")) {
      this.sound.stopByKey("bgm");
    }


    // ===== 当たり判定ヘルパ（create内に追加） =====
    this.getRect = (obj, pad = 0) => {
      // 画像は setOrigin(0.5) 前提（PhaserのImage/Spriteはデフォで0.5）
      const w = obj.displayWidth;
      const h = obj.displayHeight;
      return new Phaser.Geom.Rectangle(
        obj.x - w / 2 + pad,
        obj.y - h / 2 + pad,
        w - pad * 2,
        h - pad * 2
      );
    };

    this.overlaps = (r1, r2) => Phaser.Geom.Intersects.RectangleToRectangle(r1, r2);

    // プレイヤーの当たり判定は見た目より小さめにする（DQっぽく）
    this.playerPad = 3;   // 大きいほど当たりが小さくなる（好みで調整）
    this.blockPad = 13;     // NPC/宝箱側の当たりを少し小さく（好みで調整）



    // ===== ゲーム状態 =====
    this.uiLocked = false;           // 会話/演出中は移動停止
    this.talkCount = 0;              // NPC会話カウンタ
    this.chestOpened = false;        // 最初の1個だけ有効
    this.hasFireSword = false;       // 炎の剣装備状態
    this.money = 100;                // 初期所持金（30円で130円表示に合わせる）
    this.exiting = false;
    this.pendingSound = null; // { text: "行の文字列", key: "soundKey" }

    // ===== 背景切替（400ms） =====
    this.bgKeys = ["bg1", "bg2"];
    this.bgIndex = 0;

    this.bg = this.add.image(180, 180, this.bgKeys[0]);
    this.bg.setDisplaySize(360, 360);
    this.bg.setDepth(0);

    this.time.addEvent({
      delay: 400,
      loop: true,
      callback: () => {
        this.bgIndex = (this.bgIndex + 1) % this.bgKeys.length;
        this.bg.setTexture(this.bgKeys[this.bgIndex]);
        this.bg.setDisplaySize(360, 360);
      },
    });

    // ===== 配置 =====
    this.npc = this.add.image(180, 140, "npc").setDepth(10);

    // 宝箱（現状：右に縦3つ。左/中/右にしたければ座標だけ変える）
    this.chests = [
      this.add.image(300, 190, "box").setDepth(10).setData("id", "left"),
      this.add.image(300, 235, "box").setDepth(10).setData("id", "center"),
      this.add.image(300, 280, "box").setDepth(10).setData("id", "right"),
    ];

    this.player = this.add.sprite(180, 285, "hero1").setDepth(20);

    // ===== 縮小表示 =====
    const fitToWidth = (obj, targetPx) => {
      const w = obj.width;
      if (w > 0) obj.setScale(targetPx / w);
    };

    fitToWidth(this.player, 32);
    fitToWidth(this.npc, 32);
    this.chests.forEach((c) => fitToWidth(c, 28));

    // NPCを少し下へ（要望反映：半分弱下げ）
    this.npc.y += this.npc.displayHeight / 1.5;

    // ===== 主人公アニメ（通常/剣） =====
    this.anims.create({
      key: "heroWalk",
      frames: [{ key: "hero1" }, { key: "hero2" }],
      frameRate: 4,
      repeat: -1,
    });
    this.anims.create({
      key: "heroWalkSword",
      frames: [{ key: "heroSword1" }, { key: "heroSword2" }],
      frameRate: 4,
      repeat: -1,
    });
    this.player.play("heroWalk");

    // ===== テキストボックス（DQ風） =====
    this.textBox = this.add.rectangle(180, 300, 340, 100, 0x000000)
      .setStrokeStyle(2, 0xffffff)
      .setDepth(100)
      .setVisible(false);

    this.textObj = this.add.text(20, 260, "", {
      fontSize: "14px",
      color: "#fff",
      wordWrap: { width: 320 },
    }).setDepth(101).setVisible(false);

    this.dialogActive = false;
    this.dialogQueue = [];
    this.typing = false;
    this.fullText = "";
    this.typeIndex = 0;
    this.typeEvent = null;

    // talksound（短く鳴らす）
    this.talkSe = this.sound.add("talk", { volume: 0.35 });
    this.talkSeGate = 0;

    // ===== BGM（初回入力で開始） =====
    this.bgm = this.sound.add("bgm", { loop: true, volume: 0.6 });
    this.bgmStarted = false;

    const startAudioOnce = () => {
      if (!this.bgmStarted) {
        this.bgmStarted = true;
        this.bgm.play();
      }
    };
    this.input.on("pointerdown", startAudioOnce);
    this.input.keyboard.on("keydown", startAudioOnce);

    // ★HTMLボタン（画面UI）でも音を解禁するため、document側でも拾う（1回だけ）
    document.addEventListener("pointerdown", startAudioOnce, { once: true });
    document.addEventListener("keydown", startAudioOnce, { once: true });
  }

  // =========================================================
  // DQ風ダイアログ
  // =========================================================
  startDialog(lines) {
    this.dialogActive = true;
    this.uiLocked = true;

    this.dialogQueue = Array.isArray(lines) ? [...lines] : [String(lines)];
    this.textBox.setVisible(true);
    this.textObj.setVisible(true);

    this.nextDialogLine();
  }

  nextDialogLine() {
    if (this.typeEvent) {
      this.typeEvent.remove(false);
      this.typeEvent = null;
    }

    const next = this.dialogQueue.shift();
    if (next === undefined) {
      // 終了
      this.dialogActive = false;
      this.uiLocked = false;
      this.typing = false;
      this.fullText = "";
      this.textObj.setText("");
      this.textBox.setVisible(false);
      this.textObj.setVisible(false);
      return;
    }

    this.fullText = String(next);
    this.typeIndex = 0;
    this.textObj.setText("");
    this.typing = true;
    this.currentLineText = this.fullText; // ★いま表示中の行を保持

    this.typeEvent = this.time.addEvent({
      delay: 20,
      loop: true,
      callback: () => {
    if (this.typeIndex >= this.fullText.length) {
      this.typing = false;
      this.typeEvent.remove(false);
      this.typeEvent = null;

    // ★この行が表示し終わった瞬間に、予約サウンドを鳴らす
      if (this.pendingSound && this.pendingSound.text === this.currentLineText) {
        this.safePlay(this.pendingSound.key);
        this.pendingSound = null;
      }

      return;
    }
        const ch = this.fullText[this.typeIndex++];
        this.textObj.setText(this.textObj.text + ch);

        // 文字送りSE（鳴らしすぎ防止：数フレームに1回）
        const now = this.time.now;
        if (now - this.talkSeGate > 35) {
          this.talkSeGate = now;
          if (this.talkSe) this.talkSe.play({ seek: 0 });
        }
      },
    });
  }

  revealAllDialogText() {
    if (!this.typing) return;
    if (this.typeEvent) {
      this.typeEvent.remove(false);
      this.typeEvent = null;
    }
    this.typing = false;
    this.textObj.setText(this.fullText);
  }

  // =========================================================
  // Aアクション：NPC/宝箱判定
  // =========================================================
  tryAction() {
  // 会話中なら：Aで全文→次
  if (this.dialogActive) {
    if (this.typing) this.revealAllDialogText();
    else this.nextDialogLine();
    return;
  }

  // NPC前判定
  if (this.isNear(this.player, this.npc, 28)) {
    this.talkCount += 1;
    if (this.talkCount === 1) {
      this.startDialog(["たむあか\n「あけましておめでとうございます！」"]);
    } else if (this.talkCount === 2) {
      this.startDialog([
        "「さあ！三つの宝箱の中から\n好きなアイテムを選ぶがよい！」",
      ]);
    } else if (this.talkCount === 3) {
      this.startDialog([
        "「このゲームはChatGPTとの問答による\nプログラミングで制作されました」",
        "「詳しくは、\nhttps://github.com/keroppa88\nをご覧ください。」",
        "「いくぞっ、1～2～3～\nダ――ッ！」",
      ]);
    } else {
      this.startDialog(["ダーッ！"]);
    }
    return;
  }

  // ★ここが追加点
  // 宝箱は「会話2回目」以降で解禁
  if (this.talkCount < 2) {
    return;
  }

  // 宝箱前判定
  const nearChest = this.chests.find((c) => this.isNear(this.player, c, 26));
  if (nearChest) {
    this.openChest(nearChest.getData("id"));
    return;
  }
}

  isNear(a, b, r) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return (dx * dx + dy * dy) <= (r * r);
  }

openChest(id) {
  // 開ける音
  this.safePlay("open");

  // 既に1回開けていたら空
  if (this.chestOpened) {
    this.startDialog(["からっぽだ。"]);
    return;
  }

  this.chestOpened = true;

  if (id === "left") {
    // 闘魂の剣
    this.hasFireSword = true;
    this.player.play("heroWalkSword");

    this.startDialog([
      "闘魂の剣を手に入れた。",
      "闘魂の剣を装備した。",
    ]);

    // ★サウンドは「装備した。」の行が表示された瞬間に鳴らす（次項で実装）
    this.pendingSound = { text: "闘魂の剣を装備した。", key: "firesword" };

    return;
  }

  if (id === "center") {
    // お餅
    this.startDialog([
      "お餅を手に入れた。",
      "もぐもぐタイム。",
      "体力が回復した。",
      "HP・7 → 10",
    ]);

    // ★サウンドは回復が確定した行で鳴らす（次項で実装）
    this.pendingSound = { text: "HP・7 → 10", key: "eat" };

    return;
  }

  if (id === "right") {
    // 30円
    this.money += 30;
    this.startDialog([
      "ビットコインのようなものを手に入れた。",
      `+30円 → 所持金＝130円`,
    ]);

    this.safePlay("coin");
    return;
  }
}


  update() {
    const ui = window.__INPUT || {};

    // A押下（会話中の進行もここで扱う）
    if (ui.aPressed) {
      ui.aPressed = false;
      this.tryAction();
    }

    // 会話中は移動停止

    if (this.uiLocked) return;

    const speed = 1.35;

    // まず移動前座標を保持
    const prevX = this.player.x;
    const prevY = this.player.y;

    // 入力に応じて「移動後の仮座標」を作る
    let nextX = prevX;
    let nextY = prevY;

    if (ui.left) nextX -= speed;
    if (ui.right) nextX += speed;
    if (ui.up) nextY -= speed;
    if (ui.down) nextY += speed;

    // ===== 富士山（背景）に入れない：上方向の侵入を禁止 =====
    // 「npcより上＝富士山側」に入れない、が一番DQっぽく安定します
    const topLimit = this.npc.y + this.npc.displayHeight / 2 + 6; // 6は余裕
    nextY = Phaser.Math.Clamp(nextY, topLimit, 344);
    nextX = Phaser.Math.Clamp(nextX, 16, 344);

    // いったん仮移動
    this.player.x = nextX;
    this.player.y = nextY;

    // ===== NPC/宝箱への当たり判定 =====
    const pRect = this.getRect(this.player, this.playerPad);

    // 障害物一覧（NPC + 宝箱）
    const obstacles = [this.npc, ...this.chests];

    // 衝突していたら「軸ごとに」戻して滑らせる（斜め移動でも自然）
    for (const o of obstacles) {
      const oRect = this.getRect(o, this.blockPad);
      if (this.overlaps(pRect, oRect)) {
        // Xだけ戻して再判定
        this.player.x = prevX;
        let pXRect = this.getRect(this.player, this.playerPad);
        if (!this.overlaps(pXRect, oRect)) {
          // X戻しで解決した（Y移動は許可）
          // 何もしない
        } else {
          // Yだけ戻して再判定
          this.player.x = nextX;  // 元に戻して
          this.player.y = prevY;
          let pYRect = this.getRect(this.player, this.playerPad);
          if (!this.overlaps(pYRect, oRect)) {
            // Y戻しで解決した（X移動は許可）
          } else {
            // どっちでもダメなら完全に戻す
            this.player.x = prevX;
            this.player.y = prevY;
          }
        }
        break; // 1つ衝突したら十分
      }
    }

    // 外周制限
    this.player.x = Phaser.Math.Clamp(this.player.x, 16, 344);
    this.player.y = Phaser.Math.Clamp(this.player.y, 90, 344);

    // 下端で終了
    if (this.player.y >= 344) {
  // 多重実行防止
      if (this.exiting) return;
      this.exiting = true;

  // 移動・入力停止
      this.uiLocked = true;

  // BGM停止
      if (this.bgm && this.bgm.isPlaying) this.bgm.stop();

  // getout.mp3 を3回鳴らす
      const interval = 220; // SEの長さに合わせて微調整可
      for (let i = 0; i < 3; i++) {
        this.time.delayedCall(interval * i, () => {
          this.safePlay("exit");
        });
      }

  // 最後のSEが鳴り終わる頃にEndSceneへ
      this.time.delayedCall(interval * 3 + 50, () => {
        this.scene.start("EndScene");
      });

      return;
    }
  }
}

