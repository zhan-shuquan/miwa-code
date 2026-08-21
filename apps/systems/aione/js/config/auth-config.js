/* ========================================
   AIONE Auth Config｜AIONE認証設定
   Google Client ID は公開識別子としてフロントエンド設定に保持する。
   Client Secret はフロントエンドへ配置しない。
======================================== */

export const authConfig = Object.freeze({
  mode: "google-preview",
  googleClientId: "49629089449-5lkfjfnadvq14f9uuid91chqgjjdihmi.apps.googleusercontent.com",
  googleScriptUrl: "https://accounts.google.com/gsi/client?hl=zh_CN",
  googleButton: Object.freeze({
    theme: "outline",
    size: "large",
    text: "signin_with",
    shape: "rectangular",
    logo_alignment: "left",
    locale: "zh_CN"
  })
});
