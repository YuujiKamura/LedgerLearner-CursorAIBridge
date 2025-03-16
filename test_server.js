// サーバー自動テストスクリプト
const { exec, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// ログディレクトリ設定
const LOG_DIR = path.join(__dirname, 'data', 'test_logs');
const LOG_FILE = path.join(LOG_DIR, `server_test_${new Date().toISOString().replace(/:/g, '-')}.log`);

// テスト設定
const TEST_COUNT = 5;  // 実行回数
const WAIT_BETWEEN_TESTS = 10000;  // テスト間の待機時間（ミリ秒）
const SERVER_START_TIMEOUT = 8000;  // サーバー起動待機時間（ミリ秒）

// ディレクトリ確認
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// ログ書き込み関数
function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  
  console.log(message);
  fs.appendFileSync(LOG_FILE, logMessage);
}

// サーバープロセスの終了
function killServer(pid) {
  return new Promise((resolve) => {
    log(`サーバープロセス(PID: ${pid})の終了を試みます...`);
    
    try {
      if (process.platform === 'win32') {
        exec(`taskkill /F /PID ${pid}`, (err) => {
          if (err) {
            log(`プロセス終了エラー: ${err.message}`);
          } else {
            log(`サーバープロセス(PID: ${pid})を終了しました`);
          }
          setTimeout(resolve, 3000);  // 少し待機
        });
      } else {
        exec(`kill -9 ${pid}`, (err) => {
          if (err) {
            log(`プロセス終了エラー: ${err.message}`);
          } else {
            log(`サーバープロセス(PID: ${pid})を終了しました`);
          }
          setTimeout(resolve, 3000);  // 少し待機
        });
      }
    } catch (e) {
      log(`プロセス終了中に例外が発生: ${e.message}`);
      setTimeout(resolve, 3000);
    }
  });
}

// サーバーを起動して結果を確認
function startServer() {
  return new Promise((resolve) => {
    log('サーバーを起動します...');
    
    const serverProcess = spawn('node', ['server.js'], {
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false
    });
    
    let output = '';
    let error = '';
    let serverStarted = false;
    
    serverProcess.stdout.on('data', (data) => {
      const text = data.toString();
      output += text;
      log(`[出力] ${text.trim()}`);
      
      // サーバー起動成功の判定
      if (text.includes('サーバーが起動しました') || text.includes('http://localhost:3000')) {
        serverStarted = true;
      }
    });
    
    serverProcess.stderr.on('data', (data) => {
      const text = data.toString();
      error += text;
      log(`[エラー] ${text.trim()}`);
    });
    
    // タイムアウト処理
    const timeout = setTimeout(() => {
      log(`サーバー起動タイムアウト (${SERVER_START_TIMEOUT}ms経過)`);
      
      if (serverProcess.pid) {
        killServer(serverProcess.pid).then(() => {
          resolve({
            success: serverStarted,
            output,
            error,
            pid: serverProcess.pid
          });
        });
      } else {
        resolve({
          success: serverStarted,
          output,
          error,
          pid: null
        });
      }
    }, SERVER_START_TIMEOUT);
    
    // プロセス終了時の処理
    serverProcess.on('close', (code) => {
      clearTimeout(timeout);
      log(`サーバープロセスが終了しました (終了コード: ${code})`);
      
      resolve({
        success: serverStarted,
        output,
        error,
        pid: serverProcess.pid,
        exitCode: code
      });
    });
  });
}

// テスト実行のメイン関数
async function runTests() {
  log('===== サーバー自動テスト開始 =====');
  log(`テスト実行回数: ${TEST_COUNT}`);
  
  const results = [];
  
  for (let i = 0; i < TEST_COUNT; i++) {
    log(`\n----- テスト #${i + 1} 開始 -----`);
    
    const startTime = Date.now();
    const result = await startServer();
    const duration = Date.now() - startTime;
    
    results.push({
      testNumber: i + 1,
      success: result.success,
      duration,
      pid: result.pid,
      exitCode: result.exitCode
    });
    
    log(`テスト #${i + 1} 結果: ${result.success ? '成功' : '失敗'}`);
    log(`実行時間: ${duration}ms`);
    
    // プロセス終了確認
    if (result.pid && !result.exitCode) {
      await killServer(result.pid);
    }
    
    // 次のテストまで待機（最後のテスト以外）
    if (i < TEST_COUNT - 1) {
      log(`次のテストまで ${WAIT_BETWEEN_TESTS}ms 待機します...`);
      await new Promise(r => setTimeout(r, WAIT_BETWEEN_TESTS));
    }
  }
  
  // 結果の要約
  log('\n===== テスト結果の要約 =====');
  const successCount = results.filter(r => r.success).length;
  log(`成功: ${successCount}/${TEST_COUNT} (${(successCount / TEST_COUNT * 100).toFixed(1)}%)`);
  
  // 2回目が成功したかを特別にチェック
  if (results.length >= 2) {
    log(`2回目のテスト結果: ${results[1].success ? '成功' : '失敗'}`);
  }
  
  // 詳細な結果
  log('\n各テストの結果:');
  results.forEach(r => {
    log(`テスト #${r.testNumber}: ${r.success ? '成功' : '失敗'} (${r.duration}ms)`);
  });
  
  log('\n===== サーバー自動テスト終了 =====');
}

// テストの実行
runTests().catch(err => {
  log(`テスト実行中にエラーが発生しました: ${err.message}`);
}); 