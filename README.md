# Cursor AI 学習支援ツール

Cursor AIと連携して簿記学習をサポートするシンプルなウェブアプリケーション（テスト版）。

## 概要

このツールは、Cursorエディタ内のAIアシスタントと連携して動作する簿記学習支援ツールです。外部APIに頼らず、シンプルなインターフェースで質問応答や問題解説を行います。

## 主な機能

- 簿記問題の練習と回答確認
- AIによる問題解説と質問応答
- 学習進捗の記録と管理
- サーバー状態の監視と再起動

## 使い方

1. サーバーを起動: `npm start`
2. ブラウザで http://localhost:3000 にアクセス
3. 「簿記」タブで問題を選択して解答
4. 質問があれば「AIに質問する」ボタンを押す
5. Cursorエディタ内でAIアシスタントに回答を作成してもらう

## インストール

```bash
# 必要なパッケージをインストール
npm install

# サーバーを起動
npm start
```

## 動作環境

- Node.js
- Cursorエディタ
- モダンなWebブラウザ

## ご注意

このアプリケーションはテスト版であり、Cursorエディタの機能と連携することで最大限に活用できます。 