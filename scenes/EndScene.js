export class EndScene extends Phaser.Scene {
  constructor() {
    super("EndScene");
  }

  create() {
    this.add.rectangle(180, 180, 360, 360, 0x000000);

    this.add.text(180, 180, "謹賀新年", {
      fontSize: "44px",
      color: "#fff",
      padding: { top: 16, bottom: 16, left: 16, right: 16 }, // ★これが本命
    }).setOrigin(0.5);
  }
}