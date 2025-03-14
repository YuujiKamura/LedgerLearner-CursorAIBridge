# LedgerLearner-CursorAIBridge

簿記学習アプリケーションとAIアシスタントを橋渡しするウェブアプリケーション。

## 概要

LedgerLearner-CursorAIBridgeは、簿記の学習を支援するためのインタラクティブな学習プラットフォームです。簿記問題の解答と、AIによる解説を提供することで、ユーザーは効率的に簿記の知識を習得できます。

## 機能

- **簿記問題集**: カテゴリー別に分類された簿記問題を解くことができます
- **進捗管理**: 問題ごとの解答状況を保存し、学習進捗を追跡できます
- **AIアシスタント**: 問題に関する質問をAIに投げかけ、解説を受けられます
- **チャット履歴**: 過去の質問と回答を確認できます
- **サーバー管理**: サーバーの再起動や状態監視などの機能を提供します

## インストール方法

```bash
# リポジトリのクローン
git clone https://github.com/YuujiKamura/LedgerLearner-CursorAIBridge.git
cd LedgerLearner-CursorAIBridge

# 依存パッケージのインストール
npm install

# サーバーの起動
node server.js
```

## 使用方法

1. ブラウザで http://localhost:3000 にアクセスします
2. 「簿記」タブで問題を選択し、解答します
3. わからない問題があれば「AIに質問する」ボタンを押して質問を投げかけます
4. 「履歴」タブで過去の質問と回答を確認できます

## プロジェクト構成

- `server.js`: メインサーバーファイル
- `public/index.html`: メインHTMLファイル
- `public/js/bookkeeping.js`: 簿記問題管理用JavaScript
- `public/data/bookkeeping_problems.json`: 問題データ
- `data/chat_history.json`: チャット履歴保存ファイル
- `data/answer_data.json`: 回答データ保存ファイル

## 技術スタック

- Node.js
- Express
- Vanilla JavaScript
- HTML/CSS

## ライセンス

MITライセンス

# Cursor AI ブリッジWebアプリ

Node.jsを使用して、Cursor AIとブリッジするWebアプリケーションです。HTMLフォームから質問を送信し、Cursor AIからの応答を表示します。

## 機能

- シンプルなWebインターフェースで質問を入力
- Node.jsサーバーがCursor AI APIとの通信を処理
- Cursor AIからの応答をリアルタイムで表示

## インストール方法

1. リポジトリをクローンまたはダウンロードします
2. 必要なパッケージをインストールします

```bash
npm install
```

3. `.env`ファイルを編集して、Cursor AI APIキーを設定します

```
CURSOR_API_KEY=your_cursor_api_key_here
PORT=3000
```

## ディレクトリ構造

```
cursor_ai_gui/
├── .env                     # 環境変数設定ファイル
├── server.js                # メインサーバーファイル
├── package.json             # プロジェクト依存関係
├── package-lock.json        # プロジェクト依存関係のロックファイル
├── README.md                # プロジェクト説明ファイル（本ファイル）
├── data/                    # 本番用データファイル
│   ├── chat_history.json    # 本番環境のチャット履歴を保存するJSONファイル
│   └── answer_data.json     # 本番環境の回答データを保存するJSONファイル
├── test_data/               # テスト用データファイル
│   ├── chat_history.json    # テスト環境のチャット履歴を保存するJSONファイル
│   └── answer_data.json     # テスト環境の回答データを保存するJSONファイル
├── scripts/                 # スクリプトファイル
│   ├── answer_poller.js     # 回答データの更新を監視するポーラー
│   ├── update_answer_data.js # 回答データを更新するスクリプト
│   ├── answer_for_tabs.js   # タブUI用の回答処理スクリプト
│   ├── create_answer.js     # 回答作成用ヘルパースクリプト 
│   ├── test_answer.js       # 回答テスト用スクリプト
│   └── update_answer.js     # 回答更新用スクリプト
├── node_modules/            # Node.jsの依存モジュール
└── public/                  # 静的ファイル
    └── index.html           # フロントエンドのHTMLファイル
```

## ファイルの説明

- **server.js**: 主要なサーバーアプリケーション。質問の受付や回答の処理を行います。
- **data/chat_history.json**: 本番環境の全ての質問と回答の履歴を保存するJSONファイル。
- **data/answer_data.json**: 本番環境のAI回答を保存するJSONファイル。
- **test_data/chat_history.json**: テスト環境の質問と回答の履歴を保存するJSONファイル。
- **test_data/answer_data.json**: テスト環境のAI回答を保存するJSONファイル。
- **scripts/answer_poller.js**: answer_data.jsonの変更を監視し、chat_history.jsonを更新するスクリプト。
- **scripts/update_answer_data.js**: コマンドラインから回答データを更新するためのスクリプト。
- **public/index.html**: ユーザーインターフェースを提供するフロントエンドファイル。

## 使用方法

1. `npm start`でサーバーを起動
2. 別のターミナルで`node scripts/answer_poller.js`を実行してポーラーを起動
3. ブラウザで`http://localhost:3000`にアクセスしてアプリケーションを使用
4. 質問があると、サーバーコンソールに表示されます
5. 質問への回答は以下のコマンドで追加できます：
   ```
   node scripts/update_answer_data.js <質問ID> "<回答テキスト>"
   ```
6. ポーラーが回答の更新を検出し、chat_history.jsonを更新します
7. ブラウザが更新された回答を表示します

## 開発モード

開発中は、ファイル変更時に自動的にサーバーを再起動するnodemonを使用できます：

```bash
npm run dev
```

## 注意事項

- Cursor AI APIキーは.envファイルに保存して、公開リポジトリにアップロードしないようにしてください
- APIのレート制限に注意してください

# Cursor AI ブリッジサーバー

Cursor AIとブリッジするサーバーアプリケーションです。

## インストール

```bash
npm install
```

## 使用方法

```bash
npm start
```

サーバーが起動し、http://localhost:3000 でアクセスできます。

## テスト実行フレームワーク

このプロジェクトには、効率的なテスト実行のためのカスタムフレームワークが含まれています。このフレームワークは以下の機能を提供します：

1. 一度パスしたテストを次回から実行しないモード
2. 失敗したテストのうち、リストの最初のものだけに集中できる仕組み
3. 失敗テストが通った後に全体のテストを再実行し、既存のグリーンテストが壊れていないか確認

### テスト実行コマンド

以下のnpmコマンドを使用してテストを実行できます：

- `npm run test:all` - すべてのテストを実行し、結果を記録します
- `npm run test:focus` - 最初の失敗テストに集中します
- `npm run test:failed` - 失敗したテストのみを実行します
- `npm run test:reset` - テスト結果をリセットします

### 推奨されるテスト実行フロー

1. まず `npm run test:all` を実行して全テストの状態を確認します
2. テストが失敗した場合は `npm run test:focus` を実行して最初の失敗テストに集中します
3. 修正後、テストが通ったら `npm run test:failed` を実行して残りの失敗テストを確認します
4. すべてのテストが通ったら、自動的に全体テストが実行され、既存のテストが壊れていないか確認されます

### テスト実行のベストプラクティス

テスト修正の際には以下のフローを守ることをお勧めします：

1. 一つのテストに集中する - 複数のテストを同時に修正しようとしない
2. 修正したらすぐテストを実行する - 変更の影響を迅速に確認
3. 一つのテストが修正できたら、他のテストへ移行する前に全体テストを実行して副作用がないか確認
4. テストが突然失敗するようになった場合は、最近の変更を元に戻し、再度テストを実行

### 高度な使用法

特定のテストに集中したい場合は、`npm run test:focus [テスト名またはファイル名の一部]` のように指定できます。例えば：

```bash
npm run test:focus server
```

これにより、「server」という単語を含むテストに集中することができます。

## テスト環境の設定

アプリケーションはテスト実行時に自動的にテスト用データディレクトリ (`test_data/`) を使用するように設定されています。これにより、テストデータが本番環境のデータに影響を与えないようになっています。

### テスト用データディレクトリ

テスト実行時に以下のデータディレクトリが使用されます：

- `test_data/chat_history.json` - テスト用チャット履歴
- `test_data/answer_data.json` - テスト用回答データ

### 環境変数による設定

アプリケーションは以下の環境変数を使用して、データファイルの場所を設定できます：

- `NODE_ENV=test` - テスト環境であることを示します（テスト用データディレクトリが使用されます）
- `DATA_DIR` - データファイルが格納されているディレクトリのパス
- `CHAT_HISTORY_FILE` - チャット履歴ファイルの完全パス
- `ANSWER_DATA_FILE` - 回答データファイルの完全パス

例えば、以下のように環境変数を設定してサーバーを起動できます：

```bash
DATA_DIR=./custom_data node server.js
```

または、テスト実行時：

```bash
NODE_ENV=test npm test
```

テスト実行時は自動的に `test_data` ディレクトリが使用されるため、本番環境のデータは変更されません。 