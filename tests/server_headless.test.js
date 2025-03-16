const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const express = require('express');
const { exec } = require('child_process');
const http = require('http');
const net = require('net');
const { promisify } = require('util');
const execPromise = promisify(exec);

// テストタイムアウトを60秒に設定
jest.setTimeout(60000);

let browser;
let page;
let server;
// 環境変数からポート番号を取得するか、デフォルトでランダムポートを使用
let PORT = process.env.PORT ? parseInt(process.env.PORT) : null;
const DATA_DIR = path.join(process.cwd(), 'test_data_headless_' + Date.now());
const CHAT_HISTORY_FILE = path.join(DATA_DIR, 'chat_history.json');
const PROBLEM_DATA_FILE = path.join(DATA_DIR, 'bookkeeping_problems.json');

// 利用可能なポートを見つける関数
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

// 指定されたポートを使用しているプロセスを終了
async function killProcessOnPort(port) {
  try {
    if (process.platform === 'win32') {
      await execPromise(`for /f "tokens=5" %a in ('netstat -ano ^| find "LISTENING" ^| find ":${port}"') do taskkill /F /PID %a`);
    } else {
      await execPromise(`lsof -ti:${port} | xargs kill -9`);
    }
    // ポートが解放されるまで少し待つ
    await new Promise(resolve => setTimeout(resolve, 1000));
    return true;
  } catch (error) {
    // エラーは無視（該当プロセスがない場合でも成功とみなす）
    return true;
  }
}

// ポートの可用性を確認
async function isPortAvailable(port) {
  return new Promise((resolve) => {
    const tester = net.createServer()
      .once('error', () => resolve(false))
      .once('listening', () => {
        tester.close();
        resolve(true);
      })
      .listen(port);
  });
}

describe('サーバーヘッドレステスト', () => {
  beforeAll(async () => {
    try {
      console.log('テスト準備を開始します...');
      
      // 事前にリソースをクリーンアップ
      if (browser) {
        await browser.close().catch(() => {});
        browser = null;
      }
      if (server) {
        await new Promise(resolve => server.close(resolve));
        server = null;
      }

      // 使用可能なランダムポートを見つける
      if (!PORT) {
        PORT = await findAvailablePort();
      }
      console.log(`テスト用に利用可能なポート ${PORT} を選択しました`);

      // 既存のプロセスを終了（ポートが使用中なら）
      const isAvailable = await isPortAvailable(PORT);
      if (!isAvailable) {
        await killProcessOnPort(PORT);
        // 再度確認
        const nowAvailable = await isPortAvailable(PORT);
        if (!nowAvailable) {
          throw new Error(`ポート ${PORT} を解放できませんでした`);
        }
      }

      // テスト環境の設定
      process.env.NODE_ENV = 'test';
      process.env.DATA_DIR = DATA_DIR;
      process.env.CHAT_HISTORY_FILE = CHAT_HISTORY_FILE;
      process.env.PROBLEM_DATA_FILE = PROBLEM_DATA_FILE;
      process.env.PORT = PORT.toString();

      console.log('環境変数を設定しました:');
      console.log(`- NODE_ENV: ${process.env.NODE_ENV}`);
      console.log(`- DATA_DIR: ${process.env.DATA_DIR}`);
      console.log(`- CHAT_HISTORY_FILE: ${process.env.CHAT_HISTORY_FILE}`);
      console.log(`- PROBLEM_DATA_FILE: ${process.env.PROBLEM_DATA_FILE}`);
      console.log(`- PORT: ${process.env.PORT}`);

      // 既存のテストデータを完全に削除
      if (fs.existsSync(DATA_DIR)) {
        fs.rmSync(DATA_DIR, { recursive: true, force: true });
      }

      // テストデータディレクトリの作成
      fs.mkdirSync(DATA_DIR, { recursive: true });

      // テスト用チャット履歴ファイルの作成
      fs.writeFileSync(CHAT_HISTORY_FILE, JSON.stringify([]), 'utf8');

      // テスト用簿記問題ファイルの作成
      const testProblems = {
        problems: [
          {
            id: 1,
            category: "現金・預金",
            question: "当社は銀行からの融資として100,000円を当座預金口座に入金しました。適切な仕訳は何ですか？",
            correctAnswer: {
              debit: "当座預金",
              credit: "借入金"
            }
          }
        ]
      };
      fs.writeFileSync(PROBLEM_DATA_FILE, JSON.stringify(testProblems), 'utf8');
      console.log(`問題データファイルを作成しました: ${PROBLEM_DATA_FILE}`);

      // サーバーのキャッシュをクリア
      Object.keys(require.cache).forEach(key => {
        if (key.includes('server.js')) {
          delete require.cache[key];
        }
      });

      // サーバーアプリを読み込む
      const app = require('../server');

      // サーバーを起動
      return new Promise((resolve, reject) => {
        try {
          server = app.listen(PORT, () => {
            console.log(`テストサーバーを起動しました: http://localhost:${PORT}`);
            resolve();
          });
          server.on('error', (err) => {
            console.error(`サーバー起動エラー: ${err.message}`);
            reject(err);
          });
        } catch (err) {
          console.error(`サーバー起動中に例外が発生: ${err.message}`);
          reject(err);
        }
      })
      .then(async () => {
        // Puppeteerの起動
        browser = await puppeteer.launch({
          headless: 'new',
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        page = await browser.newPage();
        await page.setDefaultNavigationTimeout(20000);
        console.log('テスト準備が完了しました');
      });
    } catch (error) {
      console.error('テスト準備中にエラーが発生しました:', error);
      throw error;
    }
  }, 60000); // タイムアウトを60秒に設定

  afterAll(async () => {
    try {
      console.log('テスト終了後のクリーンアップを開始...');
      
      // ブラウザの終了
      if (page) {
        await page.close().catch(e => console.error('ページの終了時にエラー:', e));
        page = null;
      }
      
      if (browser) {
        await browser.close().catch(e => console.error('ブラウザの終了時にエラー:', e));
        browser = null;
      }

      // サーバーの終了
      if (server) {
        await new Promise(resolve => {
          server.close(() => {
            console.log('テストサーバーを終了しました');
            resolve();
          });
        });
        server = null;
      }

      // プロセス内の残りのHTTPサーバーをシャットダウン
      const sockets = http.globalAgent.sockets || {};
      Object.values(sockets).forEach(socket => {
        socket.forEach(s => {
          s.destroy();
        });
      });

      // テストデータの削除
      try {
        if (fs.existsSync(DATA_DIR)) {
          fs.rmSync(DATA_DIR, { recursive: true, force: true });
          console.log(`テストデータディレクトリを削除しました: ${DATA_DIR}`);
        }
      } catch (error) {
        console.error('テストデータの削除中にエラーが発生しました:', error);
      }

      // 環境変数のリセット
      delete process.env.NODE_ENV;
      delete process.env.DATA_DIR;
      delete process.env.CHAT_HISTORY_FILE;
      delete process.env.PROBLEM_DATA_FILE;
      delete process.env.PORT;
      
      // 残りのプロセスをクリーンアップ
      Object.keys(require.cache).forEach(key => {
        if (key.includes('server.js')) {
          delete require.cache[key];
        }
      });
      
      console.log('クリーンアップが完了しました');
    } catch (error) {
      console.error('テストのクリーンアップ中にエラーが発生しました:', error);
    }
  }, 60000); // タイムアウトを60秒に設定

  // 各テスト前の準備
  beforeEach(async () => {
    // ページが閉じられていたら新しいページを作成
    if (!page || page.isClosed()) {
      page = await browser.newPage();
      await page.setDefaultNavigationTimeout(20000);
    }
  });

  test('チャット履歴APIが正しく応答する', async () => {
    const response = await page.goto(`http://localhost:${PORT}/api/chat-history`, {
      waitUntil: 'networkidle0'
    });
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
  });

  test('簿記問題APIが正しく応答する', async () => {
    const response = await page.goto(`http://localhost:${PORT}/api/problems`, {
      waitUntil: 'networkidle0'
    });
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    console.log(`受信した問題データ: ${JSON.stringify(data).substr(0, 100)}...`);
    console.log(`問題数: ${data.length}`);
    
    // サーバーが正しいPROBLEM_DATA_FILE環境変数を使用していることを確認
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBe(1);
    expect(data[0]).toHaveProperty('id', 1);
    expect(data[0]).toHaveProperty('category', '現金・預金');
  });

  test('質問を送信できる', async () => {
    // ページに移動
    await page.goto(`http://localhost:${PORT}`, {
      waitUntil: 'networkidle0'
    });
    
    // フェッチAPIを使って質問を送信
    const result = await page.evaluate(async (baseUrl) => {
      const testQuestion = {
        question: "これはテスト質問です",
      };
      
      const response = await fetch(`${baseUrl}/api/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testQuestion)
      });
      
      return await response.json();
    }, `http://localhost:${PORT}`);
    
    // レスポンスの検証
    expect(result).toHaveProperty('success', true);
    expect(result).toHaveProperty('questionId');
    expect(typeof result.questionId).toBe('string');
  });

  test('回答状態を確認できる', async () => {
    // ページに移動
    await page.goto(`http://localhost:${PORT}`, {
      waitUntil: 'networkidle0'
    });
    
    // まず質問を送信して質問IDを取得
    const askResult = await page.evaluate(async (baseUrl) => {
      const testQuestion = {
        question: "回答状態確認用のテスト質問です",
      };
      
      const response = await fetch(`${baseUrl}/api/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testQuestion)
      });
      
      return await response.json();
    }, `http://localhost:${PORT}`);
    
    expect(askResult).toHaveProperty('success', true);
    expect(askResult).toHaveProperty('questionId');
    
    // 取得した質問IDを使って回答状態を確認
    const checkResult = await page.evaluate(async (baseUrl, questionId) => {
      const response = await fetch(`${baseUrl}/api/check-answer/${questionId}`);
      return await response.json();
    }, `http://localhost:${PORT}`, askResult.questionId);
    
    // 回答状態の検証
    expect(checkResult).toHaveProperty('id', askResult.questionId);
    expect(checkResult).toHaveProperty('status');
    expect(['pending', 'answered']).toContain(checkResult.status);
  });

  test('存在しない質問IDの状態確認で404を返す', async () => {
    // ページに移動
    await page.goto(`http://localhost:${PORT}`, {
      waitUntil: 'networkidle0'
    });
    
    // 存在しない質問IDで回答状態を確認
    const result = await page.evaluate(async (baseUrl) => {
      const nonExistentId = 'non-existent-id-123456789';
      const response = await fetch(`${baseUrl}/api/check-answer/${nonExistentId}`);
      return { 
        status: response.status,
        ok: response.ok,
        body: await response.json().catch(() => ({}))
      };
    }, `http://localhost:${PORT}`);
    
    // 404応答の検証
    expect(result.status).toBe(404);
    expect(result.ok).toBe(false);
  });
}); 