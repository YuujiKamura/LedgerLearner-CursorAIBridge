#!/bin/bash
# テスト実行用のスクリプト

# カレントディレクトリを確認
echo "Current directory: $(pwd)"

# 環境変数を設定
export NODE_ENV=test

# サーバーテストを実行
echo "Running server tests..."
npm test -- tests/server.test.js --forceExit

# ポーラーテストを実行
echo -e "\nRunning poller tests..."
npm test -- tests/answer_poller.test.js

echo -e "\nAll tests completed!" 