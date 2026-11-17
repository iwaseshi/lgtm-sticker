# LGTM Sticker

[English](README.md) | **日本語**

[LGTM Gifs](https://www.lgtmgifs.com/) のランダムGIFを取得し、Markdown 形式でクリップボードにコピーする Chrome 拡張です。
プルリクエストの承認コメントに貼り付ける用途を想定しています。

## 特徴

- 拡張アイコンをクリックするだけで、ランダムなLGTM GIFを `![名前](URL)` 形式でコピー
- 実行するたびに API を呼び出すため、毎回違うGIFが選ばれる
- ポップアップでGIFをプレビューでき、「Another GIF」ボタンで選び直せる
- キーボードショートカット（`Alt+Shift+L`）にも対応
- 開いているタブで GitHub の「Finish your review」ダイアログが表示されていれば、そのコメント欄にも Markdown を貼り付ける（「Another GIF」を押すと前に貼った GIF を置き換える）

## インストール

1. TypeScript をビルドする: `npm install && npm run build`（`dist/popup.js` が生成される）
2. Chrome で `chrome://extensions` を開く
3. 右上の「デベロッパーモード」をオンにする
4. 「パッケージ化されていない拡張機能を読み込む」をクリックし、このフォルダ（`lgtm-sticker`）を選択する

開発中は `npm run watch` で保存時に自動ビルドされる。変更を反映するには `chrome://extensions` で拡張を再読み込みする。

## 使い方

1. ツールバーの拡張アイコンをクリックする（または `Alt+Shift+L` を押す）
2. 「Copied ✓」と表示されたら、PRのコメント欄などに貼り付ける
3. GIFが気に入らなければ「Another GIF」をクリックする

コピーされる内容の例:

```markdown
![Creed Ship It](https://media.giphy.com/media/xxxxxxxx/giphy.gif)
```

ショートカットは `chrome://extensions/shortcuts` から変更できます。

## 仕組み

lgtmgifs.com の「Random Gif」ボタンは、ページを読み込んだときに一度だけ API を呼び出し、その結果をコピーしています。
そのため、サイトを開き直さない限り同じGIFがコピーされます。

この拡張では、実行のたびに次の API を直接呼び出しています。

```
GET https://lgtm-api.vercel.app/api/gifs/random
```

レスポンスの例:

```json
{
  "id": "...",
  "name": "Creed Ship It",
  "slug": "creed-ship-it",
  "url": "https://media.giphy.com/.../giphy.gif",
  "smallUrl": "https://media.giphy.com/.../200w.webp",
  "mp4Url": "...",
  "width": 200,
  "height": 150,
  "tags": []
}
```

API は CORS ヘッダーを返さないため、`manifest.json` の `host_permissions` で `https://lgtm-api.vercel.app/*` へのアクセスを許可しています。

## ファイル構成

```
lgtm-sticker/
├── manifest.json   # 拡張の設定（Manifest V3）
├── popup.html      # ポップアップの画面
├── popup.css       # ポップアップのスタイル
├── src/popup.ts    # API呼び出しとクリップボードへのコピー（TypeScript）
├── src/insert.ts   # GitHub のレビュー欄への貼り付け
├── dist/           # ビルド成果物（`npm run build` で生成）
├── tsconfig.json   # TypeScript の設定
├── package.json    # ビルドスクリプト
├── icons/          # 拡張アイコン（16/32/48/128px と元のSVG）
├── README.md       # README（英語）
└── README.ja.md    # README（日本語）
```

## 権限

| 権限 | 用途 |
| --- | --- |
| `clipboardWrite` | クリップボードへのコピー |
| `activeTab` / `scripting` | 開いているタブの GitHub レビュー欄への貼り付け |
| `host_permissions: https://lgtm-api.vercel.app/*` | ランダムGIF API の呼び出し |

## 注意事項

- `lgtm-api.vercel.app` は公式に公開されている API ではありません。サイト側の仕様変更により動かなくなる可能性があります。
- GIF の著作権はそれぞれの権利者に帰属します。
