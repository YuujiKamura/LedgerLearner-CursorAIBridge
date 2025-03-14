const request = require('supertest');
const express = require('express');
const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const app = require('../server');

// テスト用アプリを作成
const testApp = app;

// テスト用のディレクトリとファイルを定義
const testDir = path.join(__dirname, 'tmp');
const testChatHistoryFile = path.join(testDir, 'test_chat_history.json');
const testAnswerDataFile = path.join(testDir, 'test_answer_data.json');

// 代替テスト用ディレクトリとファイル
const altTestDir = path.join(__dirname, 'tmp_alt');
const altChatHistoryFile = path.join(altTestDir, 'alt_chat_history.json');
const altAnswerDataFile = path.join(altTestDir, 'alt_answer_data.json');

// 同期テスト用ディレクトリとファイル
const syncTestDir = path.join(__dirname, 'tmp_sync');
const syncChatHistoryFile = path.join(syncTestDir, 'sync_chat_history.json');
const syncAnswerDataFile = path.join(syncTestDir, 'sync_answer_data.json');

// テスト用タイムアウトを増やす
jest.setTimeout(30000);

// サーバー初期化用の関数追加
function resetApp() {
  // サーバーモジュールのキャッシュをクリア
  const serverPath = path.join(__dirname, '..', 'server.js');
  delete require.cache[require.resolve(serverPath)];
  
  // ファイルの存在を確認
  const chatHistoryExists = fs.existsSync(process.env.CHAT_HISTORY_FILE);
  const answerDataExists = fs.existsSync(process.env.ANSWER_DATA_FILE);
  
  // 設定を出力してデバッグ
  console.log('サーバー再初期化: ');
  console.log(`- CHAT_HISTORY_FILE: ${process.env.CHAT_HISTORY_FILE} (exists: ${chatHistoryExists})`);
  console.log(`- ANSWER_DATA_FILE: ${process.env.ANSWER_DATA_FILE} (exists: ${answerDataExists})`);
  console.log(`- DATA_DIR: ${process.env.DATA_DIR}`);
  
  // 環境変数を再設定
  const freshApp = require('../server');
  freshApp.CHAT_HISTORY_FILE = process.env.CHAT_HISTORY_FILE;
  freshApp.ANSWER_DATA_FILE = process.env.ANSWER_DATA_FILE;
  freshApp.DATA_DIR = process.env.DATA_DIR;
  
  return freshApp;
}

// サーバーをシャットダウンする関数
function shutdownApp() {
  // モジュールキャッシュ内のサーバーモジュールを見つける
  const serverPath = path.join(__dirname, '..', 'server.js');
  const serverModule = require.cache[require.resolve(serverPath)];
  
  if (serverModule && serverModule.exports && serverModule.exports.server) {
    console.log('サーバーをシャットダウンします...');
    if (typeof serverModule.exports.server.close === 'function') {
      serverModule.exports.server.close();
    }
  }
  
  // プロセス内のHTTPサーバーもシャットダウン
  const http = require('http');
  Object.values(http.globalAgent.sockets).forEach(socket => {
    socket.forEach(s => {
      s.destroy();
    });
  });
}

describe('サーバーのテスト', () => {
  // 全テスト開始前に一度だけ実行
  beforeAll(async () => {
    // テスト用ディレクトリを再作成（既存の場合は一度削除）
    try {
      try {
        // ディレクトリ内のファイルを削除
        await fsPromises.unlink(testChatHistoryFile).catch(() => {});
        await fsPromises.unlink(testAnswerDataFile).catch(() => {});
        // ディレクトリ削除
        await fsPromises.rmdir(testDir).catch(() => {});
      } catch (error) {
        // エラー無視（存在しない場合）
      }

      // ディレクトリ作成
      await fsPromises.mkdir(testDir, { recursive: true });
      console.log(`テスト用ディレクトリを作成しました: ${testDir}`);
      
      // 空のファイルを作成
      await fsPromises.writeFile(testChatHistoryFile, '[]', 'utf8');
      await fsPromises.writeFile(testAnswerDataFile, '{"answers":[]}', 'utf8');
      
      // ファイルが作成されたか確認
      const chatExists = await fsPromises.stat(testChatHistoryFile).catch(() => false);
      const answerExists = await fsPromises.stat(testAnswerDataFile).catch(() => false);
      
      if (!chatExists || !answerExists) {
        throw new Error('テストファイルの作成に失敗しました');
      }
    } catch (error) {
      console.error('テスト環境のセットアップ中にエラーが発生しました:', error);
      throw error; // テストを中断するためにエラーを投げる
    }
  });

  // 全テスト終了後のクリーンアップ
  afterAll(async () => {
    console.log('すべてのテスト終了後のクリーンアップを実行します...');
    
    // サーバーを確実にシャットダウン
    shutdownApp();
    
    // キャッシュをクリアして確実にサーバーインスタンスを停止
    Object.keys(require.cache).forEach(key => {
      if (key.includes('server.js')) {
        delete require.cache[key];
      }
    });
    
    // テストディレクトリをクリーンアップ
    try {
      // ディレクトリ内のファイルを削除してからディレクトリを削除
      await fsPromises.rm(testDir, { recursive: true, force: true }).catch(e => console.log('testDir削除エラー:', e));
      await fsPromises.rm(altTestDir, { recursive: true, force: true }).catch(e => console.log('altTestDir削除エラー:', e));
      await fsPromises.rm(syncTestDir, { recursive: true, force: true }).catch(e => console.log('syncTestDir削除エラー:', e));
      console.log('テストディレクトリを削除しました');
    } catch (error) {
      console.error('クリーンアップ中にエラーが発生しました:', error);
    }
  });

  // 各テスト後の環境変数リセット
  afterEach(() => {
    console.log('各テスト後のクリーンアップを実行中...');
    
    // サーバーをシャットダウン
    shutdownApp();
    
    // テスト間でのメモリリークを防ぐためにキャッシュをクリア
    Object.keys(require.cache).forEach(key => {
      if (key.includes('server.js')) {
        delete require.cache[key];
      }
    });
  });

  describe('GET /api/chat-history', () => {
    it('チャット履歴を取得できること', async () => {
      const response = await request(testApp).get('/api/chat-history');
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('POST /api/ask', () => {
    it('新しい質問を追加できること', async () => {
      const question = 'テスト質問';
      const response = await request(testApp)
        .post('/api/ask')
        .send({ question });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('status', 'pending');
    });

    it('質問が空の場合はエラーを返すこと', async () => {
      const response = await request(testApp)
        .post('/api/ask')
        .send({ question: '' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('DELETE /api/chat-history/:id', () => {
    it('質問を削除できること', async () => {
      // まず質問を追加
      const question = '削除用テスト質問';
      const addResponse = await request(testApp)
        .post('/api/ask')
        .send({ question });

      const questionId = addResponse.body.id;

      // 質問を削除
      const deleteResponse = await request(testApp)
        .delete(`/api/chat-history/${questionId}`);

      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.body).toHaveProperty('success', true);
      expect(deleteResponse.body).toHaveProperty('deletedId', questionId);
    });

    it('存在しない質問IDの場合は404を返すこと', async () => {
      const response = await request(testApp)
        .delete('/api/chat-history/nonexistent');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('回答の保存と更新', () => {
    it('回答を保存できること', async () => {
      // 質問を追加
      const question = '回答テスト用質問';
      const addResponse = await request(testApp)
        .post('/api/ask')
        .send({ question });

      const questionId = addResponse.body.id;
      const answer = 'テスト回答';

      // 回答を保存
      const saveResponse = await request(testApp)
        .post(`/api/answer/${questionId}`)
        .send({ answer });

      expect(saveResponse.status).toBe(200);
      expect(saveResponse.body).toHaveProperty('success', true);

      // 回答が保存されたことを確認
      const historyResponse = await request(testApp).get('/api/chat-history');
      const updatedQuestion = historyResponse.body.find(q => q.id === questionId);
      expect(updatedQuestion).toHaveProperty('answer', answer);
      expect(updatedQuestion).toHaveProperty('status', 'answered');
    });
  });
});

// データセット切り替えとポーラー同期テスト
describe('サーバーとポーラーのデータセット連携テスト', () => {
  // テスト用の追加ディレクトリとファイルを設定
  const syncTestDir = path.join(__dirname, 'sync_test');
  const syncChatHistoryFile = path.join(syncTestDir, 'sync_chat_history.json');
  const syncAnswerDataFile = path.join(syncTestDir, 'sync_answer_data.json');
  
  // ポーラースクリプトのパス
  const pollerScript = path.join(__dirname, '..', 'scripts', 'answer_poller.js');
  
  // テスト前にクリーンな状態にする
  beforeAll(async () => {
    try {
      // 同期テスト用ディレクトリのクリーンアップ
      try {
        await fsPromises.unlink(syncChatHistoryFile).catch(() => {});
        await fsPromises.unlink(syncAnswerDataFile).catch(() => {});
        await fsPromises.rmdir(syncTestDir).catch(() => {});
      } catch (error) {
        // エラー無視（存在しない場合）
      }
      
      // ディレクトリ作成
      await fsPromises.mkdir(syncTestDir, { recursive: true });
      console.log(`同期テスト用ディレクトリを作成しました: ${syncTestDir}`);
    } catch (error) {
      console.error('同期テスト環境のセットアップ中にエラーが発生しました:', error);
    }
  });
  
  afterEach(() => {
    // 環境変数をリセット
    delete process.env.CHAT_HISTORY_FILE;
    delete process.env.ANSWER_DATA_FILE;
    delete process.env.DATA_DIR;
  });
  
  afterAll(async () => {
    // テスト後にクリーンアップ
    try {
      await fsPromises.unlink(syncChatHistoryFile).catch(() => {});
      await fsPromises.unlink(syncAnswerDataFile).catch(() => {});
      await fsPromises.rmdir(syncTestDir).catch(() => {});
      console.log(`同期テストディレクトリをクリーンアップしました: ${syncTestDir}`);
    } catch (error) {
      console.error('同期テスト環境のクリーンアップ中にエラーが発生しました:', error);
    }
  });
  
  test('環境変数によるデータセット切り替えがサーバー側で正常に機能すること', async () => {
    console.log('--- テスト開始: サーバー側の環境変数によるデータセット切り替え ---');
    
    // 元の環境変数を保存
    const originalChatHistoryFile = process.env.CHAT_HISTORY_FILE;
    const originalAnswerDataFile = process.env.ANSWER_DATA_FILE;
    
    try {
      // ディレクトリが存在することを確認
      await fsPromises.mkdir(syncTestDir, { recursive: true });
      
      // まず環境変数を設定してからファイルを作成
      process.env.CHAT_HISTORY_FILE = syncChatHistoryFile;
      process.env.ANSWER_DATA_FILE = syncAnswerDataFile;
      
      // テスト用の初期データを作成
      const initialSyncChatHistory = [
        {
          id: 'server_test',
          question: 'サーバーテスト質問',
          timestamp: new Date().toISOString(),
          status: 'pending',
          answer: null
        }
      ];
      
      // 環境変数によって設定された代替チャット履歴を作成
      await fsPromises.writeFile(syncChatHistoryFile, JSON.stringify(initialSyncChatHistory, null, 2), 'utf8');
      console.log(`サーバーテスト用チャット履歴を作成しました: ${syncChatHistoryFile}`);
      
      // 代替回答データを作成
      const syncAnswerData = {
        answers: []
      };
      
      await fsPromises.writeFile(syncAnswerDataFile, JSON.stringify(syncAnswerData, null, 2), 'utf8');
      console.log(`サーバーテスト用回答データを作成しました: ${syncAnswerDataFile}`);
      
      // サーバーを再初期化（環境変数設定後に実行）
      const refreshedApp = resetApp();
      
      // サーバーAPIを使用して質問を追加
      const response = await request(refreshedApp)
        .post('/api/ask')
        .send({ question: '環境変数切り替えテスト質問' });
      
      expect(response.status).toBe(200);
      expect(response.body.question).toBe('環境変数切り替えテスト質問');
      
      // 環境変数で指定されたファイルに質問が保存されているか確認
      const chatHistoryContent = await fsPromises.readFile(syncChatHistoryFile, 'utf8');
      const chatHistory = JSON.parse(chatHistoryContent);
      
      console.log(`テスト後のチャット履歴内容: ${chatHistoryContent}`);
      
      // ファイルに2つの質問（初期質問と新しい質問）が含まれていることを確認
      expect(chatHistory.length).toBe(2);
      expect(chatHistory[0].id).toBe('server_test');
      expect(chatHistory[1].question).toBe('環境変数切り替えテスト質問');
    } finally {
      // 元の環境変数の値を復元
      if (originalChatHistoryFile) {
        process.env.CHAT_HISTORY_FILE = originalChatHistoryFile;
      } else {
        delete process.env.CHAT_HISTORY_FILE;
      }
      
      if (originalAnswerDataFile) {
        process.env.ANSWER_DATA_FILE = originalAnswerDataFile;
      } else {
        delete process.env.ANSWER_DATA_FILE;
      }
    }
    
    console.log('--- テスト終了: サーバー側の環境変数によるデータセット切り替え ---');
  });
  
  test('サーバーとポーラーが同じデータセットを参照できること', async () => {
    console.log('--- テスト開始: サーバーとポーラーの同期 ---');
    
    // 元の環境変数の値を保存
    const originalChatHistoryFile = process.env.CHAT_HISTORY_FILE;
    const originalAnswerDataFile = process.env.ANSWER_DATA_FILE;
    
    try {
      // ディレクトリが存在することを確認
      await fsPromises.mkdir(syncTestDir, { recursive: true });
      
      // 環境変数で代替ファイルパスを設定
      process.env.CHAT_HISTORY_FILE = syncChatHistoryFile;
      process.env.ANSWER_DATA_FILE = syncAnswerDataFile;
      
      // 初期データを作成
      const initialSyncData = [
        {
          id: 'sync_test',
          question: '連携テスト初期質問',
          timestamp: new Date().toISOString(),
          status: 'pending',
          answer: null
        }
      ];
      
      // チャット履歴ファイルを作成
      await fsPromises.writeFile(syncChatHistoryFile, JSON.stringify(initialSyncData, null, 2), 'utf8');
      console.log(`同期テスト用チャット履歴を作成しました: ${syncChatHistoryFile}`);
      
      // 空の回答データファイルを作成
      await fsPromises.writeFile(syncAnswerDataFile, JSON.stringify({ answers: [] }), 'utf8');
      console.log(`同期テスト用回答データを作成しました: ${syncAnswerDataFile}`);
      
      // サーバーを再初期化
      const refreshedApp = resetApp();
      
      // サーバーAPIを使用して質問を追加
      const question = '連携テスト追加質問';
      const response = await request(refreshedApp)
        .post('/api/ask')
        .send({ question });
      
      expect(response.status).toBe(200);
      expect(response.body.question).toBe(question);
      
      // 更新後のチャット履歴を確認
      const afterAddContent = await fsPromises.readFile(syncChatHistoryFile, 'utf8');
      console.log(`質問追加後のチャット履歴: ${afterAddContent}`);
      const afterAddHistory = JSON.parse(afterAddContent);
      expect(afterAddHistory.length).toBe(2); // 初期データと追加した質問
      
      // 回答データを直接更新（ポーラーの動作をシミュレート）
      const { updateChatHistory } = require('../server');
      
      // 回答データを作成
      const answerUpdateData = {
        answers: [
          {
            id: 'sync_test',  // 最初に作った質問のID
            answer: '連携テスト回答',
            timestamp: new Date().toISOString()
          }
        ]
      };
      
      // 回答データファイルを更新
      await fsPromises.writeFile(syncAnswerDataFile, JSON.stringify(answerUpdateData, null, 2), 'utf8');
      
      // updateChatHistory関数を呼び出し
      await updateChatHistory();
      
      // 更新されたチャット履歴を読み込む
      const updatedChatHistoryContent = await fsPromises.readFile(syncChatHistoryFile, 'utf8');
      console.log(`ポーラー更新後のチャット履歴: ${updatedChatHistoryContent}`);
      const updatedChatHistory = JSON.parse(updatedChatHistoryContent);
      
      // 最初の質問が更新されたことを確認
      const updatedQuestion = updatedChatHistory.find(q => q.id === 'sync_test');
      expect(updatedQuestion).toBeTruthy();
      expect(updatedQuestion.answer).toBe('連携テスト回答');
      expect(updatedQuestion.status).toBe('answered');
      
      // サーバーAPIで追加した2つ目の質問も存在することを確認
      const secondQuestion = updatedChatHistory.find(q => q.question === '連携テスト追加質問');
      expect(secondQuestion).toBeTruthy();
    } finally {
      // 元の環境変数の値を復元
      if (originalChatHistoryFile) {
        process.env.CHAT_HISTORY_FILE = originalChatHistoryFile;
      } else {
        delete process.env.CHAT_HISTORY_FILE;
      }
      
      if (originalAnswerDataFile) {
        process.env.ANSWER_DATA_FILE = originalAnswerDataFile;
      } else {
        delete process.env.ANSWER_DATA_FILE;
      }
      
      // テスト用ファイルを削除
      try {
        await fsPromises.unlink(syncChatHistoryFile);
        await fsPromises.unlink(syncAnswerDataFile);
      } catch (error) {
        console.log('テスト用ファイルの削除中にエラーが発生しました:', error);
      }
    }
    
    console.log('--- テスト終了: サーバーとポーラーの同期 ---');
  });
  
  test('DATA_DIR環境変数がサーバーとポーラーで一貫して機能すること', async () => {
    console.log('--- テスト開始: DATA_DIR環境変数テスト ---');
    
    // 元の環境変数の値を保存
    const originalDataDir = process.env.DATA_DIR;
    const originalChatHistoryFile = process.env.CHAT_HISTORY_FILE;
    const originalAnswerDataFile = process.env.ANSWER_DATA_FILE;
    
    try {
      // ディレクトリが存在することを確認
      await fsPromises.mkdir(syncTestDir, { recursive: true });
      
      // 環境変数をリセット
      delete process.env.CHAT_HISTORY_FILE;
      delete process.env.ANSWER_DATA_FILE;
      
      // DATA_DIRだけを設定
      process.env.DATA_DIR = syncTestDir;
      
      // デフォルトファイルパスを作成
      const defaultChatHistoryPath = path.join(syncTestDir, 'chat_history.json');
      const defaultAnswerDataPath = path.join(syncTestDir, 'answer_data.json');
      
      // 初期チャット履歴を作成
      const initialChatHistory = [];
      await fsPromises.writeFile(defaultChatHistoryPath, JSON.stringify(initialChatHistory, null, 2), 'utf8');
      console.log(`DATA_DIR用チャット履歴を作成しました: ${defaultChatHistoryPath}`);
      
      // 初期回答データを作成
      const initialAnswerData = {
        answers: []
      };
      await fsPromises.writeFile(defaultAnswerDataPath, JSON.stringify(initialAnswerData, null, 2), 'utf8');
      console.log(`DATA_DIR用回答データを作成しました: ${defaultAnswerDataPath}`);
      
      // サーバーを再初期化
      const refreshedApp = resetApp();
      
      // サーバーAPIを使用して質問を追加
      const question = 'DATA_DIRテスト質問';
      const response = await request(refreshedApp)
        .post('/api/ask')
        .send({ question });
      
      expect(response.status).toBe(200);
      expect(response.body.question).toBe(question);
      
      // DATA_DIRで設定されたファイルに質問が保存されているか確認
      const chatHistoryContent = await fsPromises.readFile(defaultChatHistoryPath, 'utf8');
      const updatedHistory = JSON.parse(chatHistoryContent);
      
      expect(updatedHistory.length).toBe(1);
      expect(updatedHistory[0].question).toBe(question);
      
      // ポーラーの動作をシミュレーション
      const answer = 'DATA_DIRテストの回答';
      const answerData = JSON.parse(await fsPromises.readFile(defaultAnswerDataPath, 'utf8'));
      answerData.answers.push({
        id: updatedHistory[0].id,
        answer
      });
      await fsPromises.writeFile(defaultAnswerDataPath, JSON.stringify(answerData, null, 2), 'utf8');
      
      // サーバー側でチャット履歴を更新
      const { updateChatHistory } = require('../server');
      await updateChatHistory();
      
      // 更新されたチャット履歴を確認
      const updatedChatHistoryContent = await fsPromises.readFile(defaultChatHistoryPath, 'utf8');
      const updatedChatHistory = JSON.parse(updatedChatHistoryContent);
      
      // 回答が正しく追加されたことを確認
      expect(updatedChatHistory[0].answer).toBe(answer);
    } finally {
      // 元の環境変数の値を復元
      if (originalDataDir) {
        process.env.DATA_DIR = originalDataDir;
      } else {
        delete process.env.DATA_DIR;
      }
      
      if (originalChatHistoryFile) {
        process.env.CHAT_HISTORY_FILE = originalChatHistoryFile;
      } else {
        delete process.env.CHAT_HISTORY_FILE;
      }
      
      if (originalAnswerDataFile) {
        process.env.ANSWER_DATA_FILE = originalAnswerDataFile;
      } else {
        delete process.env.ANSWER_DATA_FILE;
      }
      
      // テスト用ファイルを削除
      try {
        await fsPromises.unlink(path.join(syncTestDir, 'chat_history.json'));
        await fsPromises.unlink(path.join(syncTestDir, 'answer_data.json'));
      } catch (error) {
        console.log('テスト用ファイルの削除中にエラーが発生しました:', error);
      }
    }
    
    console.log('--- テスト終了: DATA_DIR環境変数テスト ---');
  });
});

// データセット切り替えテスト
describe('サーバーのデータセット切り替えテスト', () => {
  // テスト用の追加ディレクトリとファイルを設定
  const altTestDir = path.join(__dirname, 'tmp_alt');
  const altChatHistoryFile = path.join(altTestDir, 'alt_chat_history.json');
  const altAnswerDataFile = path.join(altTestDir, 'alt_answer_data.json');
  
  // テスト前にクリーンな状態にする
  beforeAll(async () => {
    try {
      // 代替テストディレクトリのクリーンアップ
      try {
        await fsPromises.unlink(altChatHistoryFile).catch(() => {});
        await fsPromises.unlink(altAnswerDataFile).catch(() => {});
        await fsPromises.rmdir(altTestDir).catch(() => {});
      } catch (error) {
        // エラー無視（存在しない場合）
      }
      
      // ディレクトリ作成
      await fsPromises.mkdir(altTestDir, { recursive: true });
      console.log(`代替テスト用ディレクトリを作成しました: ${altTestDir}`);
    } catch (error) {
      console.error('代替テスト環境のセットアップ中にエラーが発生しました:', error);
    }
  });
  
  afterEach(() => {
    // 環境変数をリセット
    delete process.env.CHAT_HISTORY_FILE;
    delete process.env.ANSWER_DATA_FILE;
    delete process.env.DATA_DIR;
  });
  
  afterAll(async () => {
    // テスト後にクリーンアップ
    try {
      await fsPromises.unlink(altChatHistoryFile).catch(() => {});
      await fsPromises.unlink(altAnswerDataFile).catch(() => {});
      await fsPromises.rmdir(altTestDir).catch(() => {});
      console.log(`代替テストディレクトリをクリーンアップしました: ${altTestDir}`);
    } catch (error) {
      console.error('代替テスト環境のクリーンアップ中にエラーが発生しました:', error);
    }
  });
  
  test('環境変数によるファイルパスの切り替えが正常に機能すること', async () => {
    console.log('--- テスト開始: 環境変数によるファイルパス切り替え ---');
    
    // 環境変数によって設定された代替チャット履歴を作成
    await fsPromises.writeFile(altChatHistoryFile, JSON.stringify([], null, 2), 'utf8');
    console.log(`環境変数用チャット履歴を作成しました: ${altChatHistoryFile}`);
    
    // 代替回答データを作成
    const altAnswerData = {
      answers: []
    };
    
    await fsPromises.writeFile(altAnswerDataFile, JSON.stringify(altAnswerData, null, 2), 'utf8');
    console.log(`環境変数用回答データを作成しました: ${altAnswerDataFile}`);
    
    // 元の環境変数の値を保存
    const originalChatHistoryFile = process.env.CHAT_HISTORY_FILE;
    const originalAnswerDataFile = process.env.ANSWER_DATA_FILE;
    
    // 環境変数で代替ファイルパスを設定
    process.env.CHAT_HISTORY_FILE = altChatHistoryFile;
    process.env.ANSWER_DATA_FILE = altAnswerDataFile;
    
    // サーバーを再初期化
    const refreshedApp = resetApp();
    
    // サーバーAPIを使用して質問を追加
    const question = '環境変数切り替えテスト質問';
    const response = await request(refreshedApp)
      .post('/api/ask')
      .send({ question });
    
    expect(response.status).toBe(200);
    expect(response.body.question).toBe(question);
    
    // 環境変数で設定されたファイルに質問が保存されているか確認
    const chatHistoryContent = await fsPromises.readFile(altChatHistoryFile, 'utf8');
    const chatHistory = JSON.parse(chatHistoryContent);
    
    // ファイルに質問が含まれていることを確認
    expect(chatHistory.length).toBe(1);
    expect(chatHistory[0].question).toBe(question);
    
    // 元の環境変数の値を復元
    if (originalChatHistoryFile) {
      process.env.CHAT_HISTORY_FILE = originalChatHistoryFile;
    } else {
      delete process.env.CHAT_HISTORY_FILE;
    }
    
    if (originalAnswerDataFile) {
      process.env.ANSWER_DATA_FILE = originalAnswerDataFile;
    } else {
      delete process.env.ANSWER_DATA_FILE;
    }
    
    console.log('--- テスト終了: 環境変数によるファイルパス切り替え ---');
  });
  
  test('直接ファイルパスを指定した場合に正しく機能すること（サーバー側）', async () => {
    console.log('--- テスト開始: 直接ファイルパス指定 ---');
    
    // 元の環境変数の値を保存
    const originalChatHistoryFile = process.env.CHAT_HISTORY_FILE;
    const originalAnswerDataFile = process.env.ANSWER_DATA_FILE;
    
    try {
      // ディレクトリが存在することを確認
      await fsPromises.mkdir(altTestDir, { recursive: true });
      
      // 直接指定用のチャット履歴を作成
      const directChatHistory = [];
      
      await fsPromises.writeFile(altChatHistoryFile, JSON.stringify(directChatHistory, null, 2), 'utf8');
      console.log(`直接指定用チャット履歴を作成しました: ${altChatHistoryFile}`);
      
      // 直接指定用の回答データを作成
      const directAnswerData = {
        answers: []
      };
      
      await fsPromises.writeFile(altAnswerDataFile, JSON.stringify(directAnswerData, null, 2), 'utf8');
      console.log(`直接指定用回答データを作成しました: ${altAnswerDataFile}`);
      
      // 環境変数で代替ファイルパスを設定
      process.env.CHAT_HISTORY_FILE = altChatHistoryFile;
      process.env.ANSWER_DATA_FILE = altAnswerDataFile;
      
      // サーバーを再初期化
      const refreshedApp = resetApp();
      
      // サーバーAPIを使用して質問を追加
      const question = '直接指定テスト質問';
      const response = await request(refreshedApp)
        .post('/api/ask')
        .send({ question });
      
      expect(response.status).toBe(200);
      
      // 直接指定されたファイルに質問が保存されているか確認
      const updatedContent = await fsPromises.readFile(altChatHistoryFile, 'utf8');
      console.log(`テスト後のチャット履歴内容: ${updatedContent}`);
      const updatedChatHistory = JSON.parse(updatedContent);
      
      // ファイルに質問が含まれていることを確認
      expect(updatedChatHistory.length).toBe(1);
      expect(updatedChatHistory[0].question).toBe(question);
    } finally {
      // 元の環境変数の値を復元
      if (originalChatHistoryFile) {
        process.env.CHAT_HISTORY_FILE = originalChatHistoryFile;
      } else {
        delete process.env.CHAT_HISTORY_FILE;
      }
      
      if (originalAnswerDataFile) {
        process.env.ANSWER_DATA_FILE = originalAnswerDataFile;
      } else {
        delete process.env.ANSWER_DATA_FILE;
      }
    }
    
    console.log('--- テスト終了: 直接ファイルパス指定 ---');
  });
  
  test('異なるデータセット間で切り替えられること（サーバー側）', async () => {
    console.log('--- テスト開始: データセット間の切り替え ---');
    
    // テストディレクトリが存在することを確認
    await fsPromises.mkdir(testDir, { recursive: true });
    await fsPromises.mkdir(altTestDir, { recursive: true });
    
    // データセット1: 通常のテストファイル
    const dataset1ChatHistory = [];
    
    await fsPromises.writeFile(testChatHistoryFile, JSON.stringify(dataset1ChatHistory, null, 2), 'utf8');
    console.log(`データセット1チャット履歴を作成しました: ${testChatHistoryFile}`);
    
    const dataset1AnswerData = {
      answers: []
    };
    
    await fsPromises.writeFile(testAnswerDataFile, JSON.stringify(dataset1AnswerData, null, 2), 'utf8');
    console.log(`データセット1回答データを作成しました: ${testAnswerDataFile}`);
    
    // データセット2: 代替テストファイル
    const dataset2ChatHistory = [];
    
    await fsPromises.writeFile(altChatHistoryFile, JSON.stringify(dataset2ChatHistory, null, 2), 'utf8');
    console.log(`データセット2チャット履歴を作成しました: ${altChatHistoryFile}`);
    
    const dataset2AnswerData = {
      answers: []
    };
    
    await fsPromises.writeFile(altAnswerDataFile, JSON.stringify(dataset2AnswerData, null, 2), 'utf8');
    console.log(`データセット2回答データを作成しました: ${altAnswerDataFile}`);
    
    // 環境変数をデータセット1に設定
    process.env.CHAT_HISTORY_FILE = testChatHistoryFile;
    process.env.ANSWER_DATA_FILE = testAnswerDataFile;
    
    // サーバーを再初期化 - データセット1用
    const refreshedApp1 = resetApp();
    
    // データセット1に質問を追加
    const question1 = 'データセット1質問';
    const response1 = await request(refreshedApp1)
      .post('/api/ask')
      .send({ question: question1 });
    
    expect(response1.status).toBe(200);
    
    // データセット1に質問が保存されていることを確認
    const dataset1Content = await fsPromises.readFile(testChatHistoryFile, 'utf8');
    const dataset1History = JSON.parse(dataset1Content);
    
    expect(dataset1History.length).toBe(1);
    expect(dataset1History[0].question).toBe(question1);
    
    // 環境変数をデータセット2に切り替え
    process.env.CHAT_HISTORY_FILE = altChatHistoryFile;
    process.env.ANSWER_DATA_FILE = altAnswerDataFile;
    
    // サーバーを再初期化 - データセット2用
    const refreshedApp2 = resetApp();
    
    // データセット2に別の質問を追加
    const question2 = 'データセット2質問';
    const response2 = await request(refreshedApp2)
      .post('/api/ask')
      .send({ question: question2 });
    
    expect(response2.status).toBe(200);
    
    // データセット2に質問が保存されていることを確認
    const dataset2Content = await fsPromises.readFile(altChatHistoryFile, 'utf8');
    const dataset2History = JSON.parse(dataset2Content);
    
    expect(dataset2History.length).toBe(1);
    expect(dataset2History[0].question).toBe(question2);
    
    // データセット1が変更されていないことを確認
    const dataset1ContentAfter = await fsPromises.readFile(testChatHistoryFile, 'utf8');
    const dataset1HistoryAfter = JSON.parse(dataset1ContentAfter);
    
    expect(dataset1HistoryAfter.length).toBe(1);
    expect(dataset1HistoryAfter[0].question).toBe(question1);
    
    console.log('--- テスト終了: データセット間の切り替え ---');
  });
  
  test('DATA_DIR環境変数による切り替えが正常に機能すること（サーバー側）', async () => {
    console.log('--- テスト開始: DATA_DIR環境変数による切り替え ---');
    
    // 元の環境変数の値を保存
    const originalDataDir = process.env.DATA_DIR;
    const originalChatHistoryFile = process.env.CHAT_HISTORY_FILE;
    const originalAnswerDataFile = process.env.ANSWER_DATA_FILE;
    
    // 環境変数をリセット
    delete process.env.CHAT_HISTORY_FILE;
    delete process.env.ANSWER_DATA_FILE;
    
    // 環境変数でデータディレクトリを設定
    process.env.DATA_DIR = altTestDir;
    
    // サーバーを再初期化
    const refreshedApp = resetApp();
    
    // DATA_DIR内のチャット履歴ファイルとして使用されるファイル名
    const dataDirChatHistoryFile = path.join(altTestDir, 'chat_history.json');
    const dataDirAnswerDataFile = path.join(altTestDir, 'answer_data.json');
    
    // ディレクトリが存在することを確認
    await fsPromises.mkdir(altTestDir, { recursive: true });
    
    // チャット履歴ファイルを作成
    await fsPromises.writeFile(dataDirChatHistoryFile, JSON.stringify([]), 'utf8');
    console.log(`DATA_DIR用チャット履歴を作成しました: ${dataDirChatHistoryFile}`);
    
    // 回答データを作成
    await fsPromises.writeFile(dataDirAnswerDataFile, JSON.stringify({ answers: [] }), 'utf8');
    console.log(`DATA_DIR用回答データを作成しました: ${dataDirAnswerDataFile}`);
    
    // サーバーAPIを使用して質問を追加
    const question = 'DATA_DIR環境変数テスト質問';
    const response = await request(refreshedApp)
      .post('/api/ask')
      .send({ question });
    
    expect(response.status).toBe(200);
    
    // DATA_DIRで指定されたディレクトリのファイルに質問が保存されているか確認
    const updatedContent = await fsPromises.readFile(dataDirChatHistoryFile, 'utf8');
    const updatedHistory = JSON.parse(updatedContent);
    
    expect(updatedHistory.length).toBe(1);
    expect(updatedHistory[0].question).toBe(question);
    
    // 元の環境変数を復元
    if (originalDataDir) {
      process.env.DATA_DIR = originalDataDir;
    } else {
      delete process.env.DATA_DIR;
    }
    
    if (originalChatHistoryFile) {
      process.env.CHAT_HISTORY_FILE = originalChatHistoryFile;
    } else {
      delete process.env.CHAT_HISTORY_FILE;
    }
    
    if (originalAnswerDataFile) {
      process.env.ANSWER_DATA_FILE = originalAnswerDataFile;
    } else {
      delete process.env.ANSWER_DATA_FILE;
    }
    
    // テスト後にファイルをクリーンアップ
    await fsPromises.unlink(dataDirChatHistoryFile).catch(() => {});
    await fsPromises.unlink(dataDirAnswerDataFile).catch(() => {});
    
    console.log('--- テスト終了: DATA_DIR環境変数による切り替え ---');
  });
}); 