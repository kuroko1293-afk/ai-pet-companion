# AI Pet Companion Pages v1

GitHub Pages にそのまま置ける、完全静的な 3D ペット版です。

## 入っているもの

- `index.html`
- `style.css`
- `app.js`
- `assets/model.glb`
- `.nojekyll`

## この版の特徴

- Python / FastAPI なし
- GitHub Pages 向け
- 会話はフロント内のダミー応答
- 3D ペットは有限空間を自律移動
- 歩行アニメは `Armature` 系クリップを優先使用
- ジャンプ / 傾き / 回転 / キラキラは JS 演出
- 会話ログは `localStorage` に保存

## ローカルで確認する方法

VS Code の Live Server か、簡易サーバーで開いてください。

PowerShell 例:

```powershell
py -m http.server 8010
```

そのあとブラウザで以下を開きます。

```text
http://127.0.0.1:8010
```

## GitHub Pages に置く時の流れ

1. 新しい GitHub リポジトリを作る
2. このフォルダの中身をそのままアップロードする
3. Pages で公開する
4. 公開 URL が出たら、その URL をスマホで開く

## 次に足しやすいもの

- 本物の API 連携
- 表情モーフ
- 音声入力 / 音声合成
- 状態メモリ
- スマホ向け UI の微調整
