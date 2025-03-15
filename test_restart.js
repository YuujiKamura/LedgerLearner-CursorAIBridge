/**
 * サーバーの自動再起動をテストするスクリプト
 * 複数回の再起動を実行し、各回の動作を検証します
 */

const http = require('http');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 設定
const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}`;
const RESTART_ENDPOINT = '/api/restart-server';
const TEST_ROUNDS = 3; // テストラウンド数
const WAIT_AFTER_RESTART = 10000; // 再起動後の待機時間（ミリ秒）を5秒から10秒に増加
const WAIT_BETWEEN_CHECKS = 2000; // サーバー状態確認の間隔（ミリ秒）を1秒から2秒に増加
const MAX_CHECK_RETRIES = 15; // 最大チェック試行回数を10から15に増加

/**
 * HTTP GETリクエストを送信する
 * @param {string} url リクエスト先URL
 * @returns {Promise<Object>} レスポンス
 */
function httpGet(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: data
          });
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', (e) => {
      reject(e);
    });
  });
}

/**
 * HTTP POSTリクエストを送信する
 * @param {string} url リクエスト先URL
 * @param {Object} data 送信データ
 * @returns {Promise<Object>} レスポンス
 */
function httpPost(url, data = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    const req = http.request(url, options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => { responseData += chunk; });
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: responseData
          });
        } catch (e) {
          reject(e);
        }
      });
    });
    
    req.on('error', (e) => {
      reject(e);
    });
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

/**
 * サーバーが実行中かどうかを確認する
 * @returns {Promise<boolean>} サーバーが実行中ならtrue
 */
async function isServerRunning() {
  try {
    const response = await httpGet(BASE_URL);
    return response.statusCode === 200;
  } catch (e) {
    return false;
  }
}

/**
 * サーバーが起動するのを待つ
 * @returns {Promise<boolean>} サーバーが起動したらtrue
 */
async function waitForServer() {
  console.log('サーバーの起動を待機中...');
  
  for (let i = 0; i < MAX_CHECK_RETRIES; i++) {
    if (await isServerRunning()) {
      console.log('サーバーが起動しました！');
      return true;
    }
    
    console.log(`サーバー起動待機中... (${i + 1}/${MAX_CHECK_RETRIES})`);
    await wait(WAIT_BETWEEN_CHECKS);
  }
  
  console.error('サーバーの起動が確認できませんでした');
  return false;
}

/**
 * 指定ポートで実行中のプロセスIDを取得する
 * @returns {Promise<string|null>} プロセスID、見つからない場合はnull
 */
async function getProcessIdByPort() {
  try {
    const isWindows = process.platform === 'win32';
    const command = isWindows 
      ? `netstat -ano | findstr :${PORT} | findstr LISTENING` 
      : `lsof -i :${PORT} | grep LISTEN | awk '{print $2}'`;
    
    const { stdout } = await execAsync(command);
    
    if (!stdout) return null;
    
    // Windowsの場合、最後のカラムからPIDを抽出
    if (isWindows) {
      const lines = stdout.split('\n').filter(line => line.trim());
      if (lines.length > 0) {
        const parts = lines[0].trim().split(/\s+/);
        return parts[parts.length - 1];
      }
    } else {
      // Linux/Macの場合、最初の行を取得
      return stdout.split('\n')[0].trim();
    }
    
    return null;
  } catch (e) {
    console.error('プロセスID取得中にエラー:', e.message);
    return null;
  }
}

/**
 * サーバーの再起動をテストする
 * @returns {Promise<void>}
 */
async function testServerRestart() {
  console.log('=================================================');
  console.log(' サーバー自動再起動テスト');
  console.log('=================================================');
  
  // 初期状態の確認
  const initialPid = await getProcessIdByPort();
  console.log(`初期サーバーのプロセスID: ${initialPid || '不明'}`);
  
  if (!initialPid) {
    console.log('サーバーが起動していない可能性があります。サーバーを先に起動してください。');
    return;
  }
  
  // 複数回のテスト実行
  for (let round = 1; round <= TEST_ROUNDS; round++) {
    console.log(`\n▶ テストラウンド ${round}/${TEST_ROUNDS} 開始`);
    
    // 現在のPIDを取得
    const beforePid = await getProcessIdByPort();
    console.log(`再起動前のプロセスID: ${beforePid || '不明'}`);
    
    // 再起動APIを呼び出す
    console.log('サーバー再起動APIを呼び出します...');
    try {
      const restartResponse = await httpPost(`${BASE_URL}${RESTART_ENDPOINT}`);
      console.log(`再起動APIレスポンス: ${restartResponse.data}`);
      
      // 再起動待機
      console.log(`${WAIT_AFTER_RESTART / 1000}秒待機して再起動を確認します...`);
      await wait(WAIT_AFTER_RESTART);
      
      // サーバーが起動しているか確認
      const isRunning = await waitForServer();
      
      if (isRunning) {
        // 新しいPIDを取得
        const afterPid = await getProcessIdByPort();
        console.log(`再起動後のプロセスID: ${afterPid || '不明'}`);
        
        // PIDが変わっているか確認
        if (beforePid && afterPid && beforePid !== afterPid) {
          console.log('✅ 成功: プロセスIDが変化しました（再起動成功）');
        } else if (!afterPid) {
          console.log('❌ 失敗: 再起動後のプロセスが見つかりません');
        } else if (beforePid === afterPid) {
          console.log('❌ 失敗: プロセスIDが同じです（再起動していない可能性）');
        }
      } else {
        console.log('❌ 失敗: 再起動後にサーバーが応答しません');
      }
    } catch (e) {
      console.error(`再起動中にエラーが発生しました: ${e.message}`);
    }
    
    console.log(`▶ テストラウンド ${round}/${TEST_ROUNDS} 完了`);
  }
  
  console.log('\n=================================================');
  console.log(' サーバー自動再起動テスト完了');
  console.log('=================================================');
}

// テスト実行
(async () => {
  try {
    await testServerRestart();
  } catch (e) {
    console.error('テスト実行中にエラーが発生しました:', e);
  }
})(); 