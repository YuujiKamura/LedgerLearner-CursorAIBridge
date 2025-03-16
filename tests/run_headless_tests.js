#!/usr/bin/env node

/**
 * サーバーヘッドレステスト実行スクリプト
 * 
 * このスクリプトは以下の問題を解決します：
 * 1. ポート競合問題
 * 2. テストデータの混在
 * 3. Jest終了の問題
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const http = require('http');
const net = require('net');

// 利用可能なポートを見つける
function findAvailablePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on('error', reject);
    server.listen(0, () => {
      const port = server.address().port;
      server.close(() => {
        resolve(port);
      });
    });
  });
}

// ポートで実行中のプロセスをキルする
function killProcessOnPort(port) {
  try {
    if (process.platform === 'win32') {
      execSync(`for /f "tokens=5" %a in ('netstat -ano ^| find "LISTENING" ^| find ":${port}"') do taskkill /F /PID %a`);
    } else {
      execSync(`lsof -ti:${port} | xargs kill -9`);
    }
    console.log(`ポート ${port} のプロセスを終了しました`);
  } catch (error) {
    // エラーは無視（既にプロセスがない場合など）
  }
}

// テストデータディレクトリをクリーンアップ
function cleanupTestData() {
  const testDirs = [
    path.join(process.cwd(), 'test_data'),
    path.join(process.cwd(), 'test_data_headless'),
  ];
  
  // タイムスタンプベースのディレクトリも検索して削除
  const baseDir = process.cwd();
  const files = fs.readdirSync(baseDir);
  const timestampDirs = files.filter(file => 
    file.startsWith('test_data_headless_') && 
    fs.statSync(path.join(baseDir, file)).isDirectory()
  );
  
  // すべてのテストディレクトリを削除
  const allDirs = [...testDirs, ...timestampDirs.map(dir => path.join(baseDir, dir))];
  allDirs.forEach(dir => {
    if (fs.existsSync(dir)) {
      try {
        fs.rmSync(dir, { recursive: true, force: true });
        console.log(`テストディレクトリを削除しました: ${dir}`);
      } catch (error) {
        console.error(`ディレクトリ削除エラー: ${dir}`, error);
      }
    }
  });
}

// メイン関数
async function run() {
  try {
    // 1. まず既存のテストデータをクリーンアップ
    cleanupTestData();
    
    // 2. 利用可能なポートを見つける
    const port = await findAvailablePort();
    console.log(`利用可能なポート: ${port}`);
    
    // 3. そのポートのプロセスが万が一実行されていたら終了
    killProcessOnPort(port);
    
    // 4. テスト実行コマンドを構築（環境変数を設定）
    const cmd = `cross-env NODE_ENV=test PORT=${port} jest tests/server_headless.test.js --forceExit --detectOpenHandles`;
    
    // 5. テスト実行
    console.log(`テスト実行: ${cmd}`);
    execSync(cmd, { stdio: 'inherit' });
    
  } catch (error) {
    console.error('テスト実行中にエラーが発生しました:', error);
    process.exit(1);
  } finally {
    // 6. 終了時のクリーンアップ
    cleanupTestData();
    
    // 7. 念のためもう一度ポートの解放を試みる
    if (global.testPort) {
      killProcessOnPort(global.testPort);
    }
  }
}

// スクリプト実行
run().catch(err => {
  console.error('実行エラー:', err);
  process.exit(1);
}); 