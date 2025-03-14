const fs = require('fs').promises;
const path = require('path');
const { startPolling, stopPolling, updateChatHistory, ensureFileExists } = require('../scripts/answer_poller');

// テスト用のディレクトリとファイルを定義
const testDir = path.join(__dirname, 'tmp');
const testChatHistoryFile = path.join(testDir, 'test_chat_history.json');
const testAnswerDataFile = path.join(testDir, 'test_answer_data.json');

// テスト用タイムアウトを増やす
jest.setTimeout(30000);

describe('answer_pollerのテスト', () => {
  // 全テスト開始前に一度だけ実行
  beforeAll(async () => {
    try {
      // テスト用ディレクトリを再作成（既存の場合は一度削除）
      try {
        // ディレクトリ内のファイルを削除
        await fs.unlink(testChatHistoryFile).catch(() => {});
        await fs.unlink(testAnswerDataFile).catch(() => {});
        // ディレクトリ削除
        await fs.rmdir(testDir).catch(() => {});
      } catch (error) {
        // エラー無視（存在しない場合）
      }

      // ディレクトリ作成
      await fs.mkdir(testDir, { recursive: true });
      console.log(`テスト用ディレクトリを作成しました: ${testDir}`);
    } catch (error) {
      console.error('テスト環境のセットアップ中にエラーが発生しました:', error);
      throw error; // テストを中断するためにエラーを投げる
    }
  });

  beforeEach(async () => {
    // 各テスト実行前に必ずディレクトリとファイルを再作成する
    try {
      // テスト用ディレクトリを作成（存在しない場合）
      try {
        await fs.access(testDir);
      } catch (error) {
        if (error.code === 'ENOENT') {
          await fs.mkdir(testDir, { recursive: true });
          console.log(`テスト用ディレクトリを再作成しました: ${testDir}`);
        }
      }

      // 空のチャット履歴とanswer_dataを作成
      const chatHistory = [
        {
          id: 'test1',
          question: 'テスト質問1',
          timestamp: new Date().toISOString(),
          status: 'pending',
          answer: null
        }
      ];
      
      await fs.writeFile(testChatHistoryFile, JSON.stringify(chatHistory), 'utf8');
      await fs.writeFile(testAnswerDataFile, JSON.stringify({ answers: [] }), 'utf8');
      
      // ファイルが作成されたか確認
      const chatExists = await fs.stat(testChatHistoryFile).catch(() => false);
      const answerExists = await fs.stat(testAnswerDataFile).catch(() => false);
      
      if (!chatExists || !answerExists) {
        throw new Error('テストファイルの作成に失敗しました');
      }
      
      console.log('beforeEach: テスト用ファイルを準備しました');
    } catch (error) {
      console.error('テスト環境のセットアップ中にエラーが発生しました:', error);
      throw error; // テストを中断するためにエラーを投げる
    }
  });

  afterEach(async () => {
    // ポーリングを停止
    stopPolling();
    // ポーリングが完全に停止するのを確認
    await new Promise(resolve => setTimeout(resolve, 200));
    console.log('afterEach: ポーリングを停止しました');
    
    // ファイルは削除せず、次のテストで上書きする
  });

  afterAll(async () => {
    // すべてのテスト終了後にファイルをクリーンアップ
    try {
      console.log('afterAll: テスト環境のクリーンアップを開始します');
      
      // ポーリングが確実に停止していることを確認
      stopPolling();
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // ファイルの存在を確認してから削除
      try {
        await fs.access(testChatHistoryFile);
        await fs.unlink(testChatHistoryFile);
        console.log(`afterAll: ${testChatHistoryFile} を削除しました`);
      } catch (error) {
        console.log(`afterAll: ${testChatHistoryFile} はすでに存在しません`);
      }
      
      try {
        await fs.access(testAnswerDataFile);
        await fs.unlink(testAnswerDataFile);
        console.log(`afterAll: ${testAnswerDataFile} を削除しました`);
      } catch (error) {
        console.log(`afterAll: ${testAnswerDataFile} はすでに存在しません`);
      }
      
      try {
        await fs.access(testDir);
        await fs.rmdir(testDir);
        console.log(`afterAll: ${testDir} を削除しました`);
      } catch (error) {
        console.log(`afterAll: ${testDir} はすでに存在しないか削除できません: ${error.message}`);
      }
      
      console.log('afterAll: テスト環境のクリーンアップが完了しました');
    } catch (error) {
      console.error('afterAll: テスト環境のクリーンアップ中にエラーが発生しました:', error);
    }
  });

  test('回答データの更新を検出してチャット履歴を更新できること', async () => {
    console.log('--- テスト開始：回答データの更新検出 ---');
    
    // 必ずディレクトリとファイルが存在することを確認
    await fs.mkdir(testDir, { recursive: true });
    
    // テスト用のチャット履歴作成
    const initialChatHistory = [
      {
        id: 'test1',
        question: 'テスト質問1',
        timestamp: new Date().toISOString(),
        status: 'pending',
        answer: null
      }
    ];
    
    console.log('初期チャット履歴を作成します...');
    await fs.writeFile(testChatHistoryFile, JSON.stringify(initialChatHistory, null, 2), 'utf8');
    console.log(`初期チャット履歴を設定しました: ${JSON.stringify(initialChatHistory)}`);
    
    // テスト用の回答データ作成
    const testAnswerData = {
      answers: [
        {
          id: 'test1',
          answer: 'テスト回答1',
          timestamp: new Date().toISOString()
        }
      ]
    };
    
    console.log('回答データファイルを作成します...');
    await fs.writeFile(testAnswerDataFile, JSON.stringify(testAnswerData, null, 2), 'utf8');
    console.log(`テスト用回答データファイルの内容: ${JSON.stringify(testAnswerData)}`);
    
    // ファイルが存在することを確認してから処理開始
    let chatHistoryExists = false;
    let answerDataExists = false;
    
    try {
      await fs.access(testChatHistoryFile);
      chatHistoryExists = true;
      const chatStat = await fs.stat(testChatHistoryFile);
      console.log(`チャット履歴ファイル確認OK: ${chatStat.size} バイト`);
    } catch (error) {
      console.error(`チャット履歴ファイルの確認エラー: ${error.message}`);
    }
    
    try {
      await fs.access(testAnswerDataFile);
      answerDataExists = true;
      const answerStat = await fs.stat(testAnswerDataFile);
      console.log(`回答データファイル確認OK: ${answerStat.size} バイト`);
    } catch (error) {
      console.error(`回答データファイルの確認エラー: ${error.message}`);
    }
    
    if (!chatHistoryExists || !answerDataExists) {
      throw new Error('テストに必要なファイルが存在しません');
    }
    
    // updateChatHistory関数を直接呼び出してテスト
    console.log('polling開始前にupdateChatHistory関数を直接呼び出します...');
    const updatedHistory = await updateChatHistory(testChatHistoryFile, testAnswerDataFile);
    
    // 処理結果を直接検証
    console.log(`直接更新後のチャット履歴: ${JSON.stringify(updatedHistory)}`);
    
    // 最初のチェック
    expect(updatedHistory.length).toBeGreaterThan(0);
    expect(updatedHistory[0].answer).toBe('テスト回答1');
    expect(updatedHistory[0].status).toBe('answered');
    
    console.log('--- テスト終了：回答データの更新検出 ---');
  });

  test('存在しない質問IDの場合はエラーをログに記録すること', async () => {
    console.log('--- テスト開始：存在しない質問ID のテスト ---');
    
    // 必ずディレクトリが存在することを確認
    await fs.mkdir(testDir, { recursive: true });
    
    // 初期状態のチャット履歴を明示的に設定
    const initialChatHistory = [
      {
        id: 'test1',
        question: 'テスト質問1',
        timestamp: new Date().toISOString(),
        status: 'pending',
        answer: null
      }
    ];
    
    console.log('初期チャット履歴を作成します...');
    await fs.writeFile(testChatHistoryFile, JSON.stringify(initialChatHistory, null, 2), 'utf8');
    console.log('初期チャット履歴を設定しました:', JSON.stringify(initialChatHistory));
    
    // 既存のチャット履歴（test1のID）と異なるIDで回答データを作成
    const answerData = {
      answers: [
        {
          id: 'nonexistent',
          answer: '存在しない質問への回答',
          timestamp: new Date().toISOString()
        }
      ]
    };
    
    // 回答データファイルを作成
    console.log('回答データファイルを作成します...');
    await fs.writeFile(testAnswerDataFile, JSON.stringify(answerData, null, 2), 'utf8');
    console.log('テスト用回答データファイル(存在しないID)の内容:', JSON.stringify(answerData));

    // ファイルが存在することを確認してから処理開始
    let chatHistoryExists = false;
    let answerDataExists = false;
    
    try {
      await fs.access(testChatHistoryFile);
      chatHistoryExists = true;
      const chatStat = await fs.stat(testChatHistoryFile);
      console.log(`チャット履歴ファイル確認OK: ${chatStat.size} バイト`);
    } catch (error) {
      console.error(`チャット履歴ファイルの確認エラー: ${error.message}`);
    }
    
    try {
      await fs.access(testAnswerDataFile);
      answerDataExists = true;
      const answerStat = await fs.stat(testAnswerDataFile);
      console.log(`回答データファイル確認OK: ${answerStat.size} バイト`);
    } catch (error) {
      console.error(`回答データファイルの確認エラー: ${error.message}`);
    }
    
    if (!chatHistoryExists || !answerDataExists) {
      throw new Error('テストに必要なファイルが存在しません');
    }
    
    // コンソールをモニターして、エラーメッセージを確認
    console.log('polling開始前にupdateChatHistory関数を直接呼び出します...');
    const errorSpy = jest.spyOn(console, 'error');
    
    // 関数を実行
    await updateChatHistory(testChatHistoryFile, testAnswerDataFile);
    
    // エラーメッセージが出ているか確認
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('質問ID: nonexistent が見つかりません'));
    errorSpy.mockRestore();
    
    // チャット履歴の内容を確認（変更されていないことを検証）
    const afterContent = await fs.readFile(testChatHistoryFile, 'utf8').catch(() => '[]');
    const afterHistory = JSON.parse(afterContent);
    
    // チャット履歴が更新されていないことを確認
    expect(afterHistory.length).toBe(1);
    expect(afterHistory[0].id).toBe('test1');
    expect(afterHistory[0].status).toBe('pending');
    expect(afterHistory[0].answer).toBeNull();
    
    console.log('--- テスト終了：存在しない質問ID のテスト ---');
  });
}); 