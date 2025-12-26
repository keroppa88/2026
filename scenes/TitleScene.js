export class TitleScene extends Phaser.Scene {
  constructor() {
    super("TitleScene");
  }

  preload() {
    // スタート音（既存SEを流用）
    this.load.audio("start", "assets/sound/start.mp3");
  }

  create() {
    // 背景（黄色）
    this.add.rectangle(180, 180, 360, 360, 0xfff000);

    // タイトル
    this.add.text(180, 110, "2026", {
      fontSize: "48px",
      color: "#000",
      padding: { top: 20, bottom: 20, left: 16, right: 16 },
    }).setOrigin(0.5);

    // タイトル
    this.add.text(180, 170, "謹賀新年", {
      fontSize: "48px",
      color: "#000",
      padding: { top: 20, bottom: 20, left: 16, right: 16 },
    }).setOrigin(0.5);

    // push start
    this.add.text(180, 230, "push start", {
      fontSize: "18px",
      color: "#000",
      padding: { top: 8, bottom: 8, left: 8, right: 8 },
    }).setOrigin(0.5);

    // 多重起動防止
    this._started = false;
    const startGame = () => {
      if (this._started) return;
      this._started = true;

      // スタート音（ブラウザ制約があるので「入力後」再生）
      this.sound.play("start", { volume: 0.6 });

      // 音を聞かせてから遷移
      this.time.delayedCall(120, () => {
        this.scene.start("GameScene");
      });
    };

    // タップ/クリック
    this.input.once("pointerdown", startGame);

    // キーボード（Enter/Spaceのみ）
    this._onKeyDown = (e) => {
      const isEnter = (e.key === "Enter") || (e.code === "Enter") || (e.keyCode === 13);
      const isSpace = (e.key === " ") || (e.code === "Space") || (e.keyCode === 32);
      if (isEnter || isSpace) {
        e.preventDefault();
        startGame();
      }
    };
    document.addEventListener("keydown", this._onKeyDown);

    // シーン終了時に掃除（多重登録防止）
    this.events.once("shutdown", () => {
      document.removeEventListener("keydown", this._onKeyDown);
    });
  }
}
