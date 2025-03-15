/**
 * サーバー再起動スクリプト
 * Gitbash環境でサーバーを再起動するための補助スクリプト
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// ログファイルの設定
const LOG_FILE = path.join(__dirname, 'restart_log.txt');

// 現在の日時を取得
function getTimestamp() {
  return new Date().toISOString();
}

// ログを書き込む関数
function log(message) {
  const timestamp = getTimestamp();
  const logMessage = `[${timestamp}] ${message}\n`;
  
  // コンソールとファイルに出力
  console.log(logMessage);
  fs.appendFileSync(LOG_FILE, logMessage);
}

// メイン処理
try {
  // スクリプト開始ログ
  log('再起動スクリプトを開始します');
  
  // 現在の作業ディレクトリを記録
  const currentDir = process.cwd();
  log(`作業ディレクトリ: ${currentDir}`);

  // ポート3000を使用しているプロセスを確認
  log('ポート3000を使用しているプロセスを確認します...');
  try {
    const netstatOutput = execSync('netstat -ano | findstr :3000 | findstr LISTENING', { encoding: 'utf8' });
    log(`netstat結果:\n${netstatOutput}`);
  } catch (e) {
    log(`netstatコマンドのエラー: ${e.message}`);
  }

  // 5秒待機
  log('5秒待機します...');
  const waitStart = Date.now();
  while (Date.now() - waitStart < 5000) {
    // 待機
  }
  
  // npm startコマンドを実行
  log('サーバーを起動します: npm start');
  try {
    execSync('npm start', { stdio: 'inherit' });
  } catch (e) {
    log(`サーバー起動エラー: ${e.message}`);
  }
  
  log('再起動スクリプトが完了しました');
} catch (error) {
  log(`エラーが発生しました: ${error.message}`);
  process.exit(1);
} 