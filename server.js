const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs').promises;
const fsStandard = require('fs'); // 標準fsモジュールを追加
const readline = require('readline');
const { execSync } = require('child_process');
require('dotenv').config();

// 環境設定
const DEBUG_MODE = process.env.DEBUG_MODE === 'true' || false;
const PORT = process.env.PORT || 3000;

// ファイルパス設定
const dataDir = path.join(__dirname, 'public', 'data');
const progressDataPath = path.join(dataDir, 'user_progress.json');
const chatHistoryPath = path.join(__dirname, 'data', 'chat_history.json');
const answerDataPath = path.join(__dirname, 'data', 'answer_data.json');
const problemDataPath = path.join(__dirname, 'public', 'data', 'bookkeeping_problems.json');

// メッセージの一元管理用定数
const MESSAGES = {
  SERVER_STARTED: 'サーバーが起動しました: http://localhost:',
  CLAUDE_BRIDGE: 'Claudeとブリッジするサーバーが実行中です。',
  QUESTION_DISPLAY: '質問が届くとここに表示されます。',
  REQUEST_AI_ANSWER: 'CursorプロンプトからAIに回答を依頼してください。'
};

// ターミナルコマンドを実行する際の特殊文字を除去するヘルパー関数
function sanitizeCommand(command) {
  // ブラケットペーストモードの制御文字を除去 ([200~ と ~ で囲まれたテキスト)
  let sanitized = command.replace(/\[200~/, '').replace(/~$/, '');
  
  // その他の一般的な特殊文字やエスケープシーケンスを除去
  sanitized = sanitized.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
  
  // コマンドが空になってしまった場合は元のコマンドを返す
  return sanitized.trim() || command;
}

// 安全にコマンドを実行するヘルパー関数
function safeExecCommand(command, options = {}) {
  try {
    // コマンドをサニタイズ
    const sanitizedCommand = sanitizeCommand(command);
    
    // コマンドが変更された場合はログ出力
    if (sanitizedCommand !== command) {
      console.log(`コマンドを修正しました: '${command}' → '${sanitizedCommand}'`);
    }
    
    // サニタイズされたコマンドを実行
    return execSync(sanitizedCommand, { ...options, encoding: 'utf8' });
  } catch (error) {
    console.error(`コマンド実行中にエラーが発生しました: ${error.message}`);
    throw error;
  }
}

// Windows環境での文字化け対応ヘルパー関数
function handleWinEncoding(text) {
  // Windows環境か確認
  if (process.platform === 'win32') {
    try {
      // 一般的な文字化けパターンを検出して修正
      // 「エラー: プロセス "XXXX" が見つかりませんでした。」の文字化けに対応
      if (text.includes('G[') && text.includes('vZX')) {
        return 'エラー: プロセスが見つかりませんでした。';
      }
      
      // その他の文字化けに対するパターン
      // 典型的な日本語文字化けのマッピング
      const charMap = {
        'G[': 'エラー',
        'vZX': 'プロセス',
        '܂': '見つかりません',
        'ł': 'でした'
      };
      
      // マッピングに基づいて文字列を置換
      let result = text;
      Object.entries(charMap).forEach(([pattern, replacement]) => {
        result = result.replace(new RegExp(pattern.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g'), replacement);
      });
      
      return result;
    } catch (e) {
      console.error('文字コード変換中にエラーが発生しました:', e);
      return text; // エラーが発生した場合は元のテキストを返す
    }
  }
  
  // Windows以外の環境では変更なし
  return text;
}

// エラーメッセージの表示を改善するラッパー関数
function logError(message) {
  console.error(handleWinEncoding(message));
}

const app = express();
// 起動モードの指定 (auto, prompt, port)
// auto: 自動的に既存のサーバーを終了する
// prompt: ユーザーに確認する
// port: 別のポートで起動する（失敗時はエラー）
const START_MODE = process.env.START_MODE || 'auto';

// 環境変数でテスト用のファイルパスを指定できるようにする
// NODE_ENV=test のときは test_data ディレクトリを使用
let DATA_DIR = process.env.DATA_DIR || 
  (process.env.NODE_ENV === 'test' ? 
    path.join(__dirname, 'test_data') : 
    path.join(__dirname, 'data'));
let CHAT_HISTORY_FILE = process.env.CHAT_HISTORY_FILE || path.join(DATA_DIR, 'chat_history.json');
let ANSWER_DATA_FILE = process.env.ANSWER_DATA_FILE || path.join(DATA_DIR, 'answer_data.json');

// Jest実行環境の検出（テスト中かどうかを自動検出）
const isRunningInJest = process.env.JEST_WORKER_ID !== undefined || process.argv.some(arg => 
  arg.includes('jest') || arg.includes('test_runner.js') || arg.includes('test:')
);

// テスト実行時の安全チェック関数
function ensureTestSafetyCheck() {
  if (isRunningInJest) {
    // テスト実行中であるがデータディレクトリがtest_dataでない場合は警告
    const isUsingTestDir = DATA_DIR.includes('test_data') || 
                           CHAT_HISTORY_FILE.includes('test_data') ||
                           ANSWER_DATA_FILE.includes('test_data') ||
                           DATA_DIR.includes('tmp') || // テスト用の一時ディレクトリも許可
                           CHAT_HISTORY_FILE.includes('tmp') ||
                           ANSWER_DATA_FILE.includes('tmp');
    
    if (!isUsingTestDir) {
      console.error('警告: テスト実行中に本番環境のデータディレクトリが使用されています！');
      console.error(`現在のDATA_DIR: ${DATA_DIR}`);
      console.error(`現在のCHAT_HISTORY_FILE: ${CHAT_HISTORY_FILE}`);
      console.error(`現在のANSWER_DATA_FILE: ${ANSWER_DATA_FILE}`);
      
      // テスト実行中は本番データを更新しないように早期リターン用のエラーを投げる
      const error = new Error('テスト実行中に本番データを変更しようとしました');
      error.code = 'TEST_SAFETY_ERROR';
      throw error;
    }
  }
}

// テスト実行中と判断された場合、強制的にテストデータディレクトリを使用
if (isRunningInJest && !process.env.DATA_DIR) {
  console.log('テスト実行を検出しました。test_dataディレクトリを使用します。');
  DATA_DIR = path.join(__dirname, 'test_data');
  CHAT_HISTORY_FILE = path.join(DATA_DIR, 'chat_history.json');
  ANSWER_DATA_FILE = path.join(DATA_DIR, 'answer_data.json');
  
  // テスト用ディレクトリが存在しない場合は作成
  try {
    if (!require('fs').existsSync(DATA_DIR)) {
      require('fs').mkdirSync(DATA_DIR, { recursive: true });
      console.log(`テストディレクトリを作成しました: ${DATA_DIR}`);
    }
  } catch (err) {
    console.error('テストディレクトリの作成に失敗しました:', err);
  }
}

// 環境変数を外部から変更できるようにする
Object.defineProperties(app, {
  'DATA_DIR': {
    get: () => DATA_DIR,
    set: (value) => {
      DATA_DIR = value;
      if (!CHAT_HISTORY_FILE || !ANSWER_DATA_FILE) {
        CHAT_HISTORY_FILE = path.join(DATA_DIR, 'chat_history.json');
        ANSWER_DATA_FILE = path.join(DATA_DIR, 'answer_data.json');
      }
    }
  },
  'CHAT_HISTORY_FILE': {
    get: () => CHAT_HISTORY_FILE,
    set: (value) => CHAT_HISTORY_FILE = value
  },
  'ANSWER_DATA_FILE': {
    get: () => ANSWER_DATA_FILE,
    set: (value) => ANSWER_DATA_FILE = value
  }
});

// 保留中の質問を保持する配列
let pendingQuestions = [];

// ミドルウェア
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// readline インターフェースの設定
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// ルート設定
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// チャット履歴を取得するエンドポイント
app.get('/api/chat-history', async (req, res) => {
  try {
    const chatHistory = await loadChatHistory();
    res.json(chatHistory);
  } catch (error) {
    console.error('チャット履歴の取得中にエラーが発生しました:', error);
    res.status(500).json({ error: 'チャット履歴の取得に失敗しました' });
  }
});

// 問題一覧を取得するAPIエンドポイント
app.get('/api/problems', async (req, res) => {
  try {
    // bookkeeping_problems.jsonファイルを使用
    const problemsFilePath = path.join(__dirname, 'public', 'data', 'bookkeeping_problems.json');
    console.log(`[API] 問題ファイルパス: ${problemsFilePath}`);
    
    const problemsData = await fs.readFile(problemsFilePath, 'utf8');
    console.log(`[API] 読み込んだデータサイズ: ${problemsData.length}バイト`);
    
    const parsedData = JSON.parse(problemsData);
    const problems = parsedData.problems || [];
    
    console.log(`[API] 返却する問題数: ${problems.length}件`);
    res.json(problems);
  } catch (error) {
    console.error('[API] 問題一覧の取得中にエラーが発生しました:', error);
    res.status(500).json({ error: '問題一覧の取得に失敗しました' });
  }
});

// 進捗データを読み込む関数
function loadProgressData() {
  try {
    console.log('進捗データパス:', progressDataPath);
    
    if (!fsStandard.existsSync(progressDataPath)) {
      console.log('進捗データファイルが存在しません。新規作成します:', progressDataPath);
      saveProgressData({});
      return {};
    }
    
    const data = fsStandard.readFileSync(progressDataPath, 'utf8');
    console.log('進捗データを読み込みました。データサイズ:', Buffer.from(data).length, 'バイト');
    
    try {
      const parsed = JSON.parse(data);
      console.log('JSONパース成功。キー数:', Object.keys(parsed).length);
      return parsed;
    } catch (parseError) {
      console.error('JSONパースエラー:', parseError);
      return {};
    }
  } catch (error) {
    console.error('進捗データの読み込み中にエラーが発生しました:', error);
    return {};
  }
}

// 進捗データを保存する関数
function saveProgressData(data) {
  try {
    fsStandard.writeFileSync(progressDataPath, JSON.stringify(data, null, 2), 'utf8');
    // DEBUGモードのみ詳細ログを表示
    if (DEBUG_MODE) {
      console.log('進捗データを保存しました:', progressDataPath);
    }
    return true;
  } catch (error) {
    console.error('進捗データの保存中にエラーが発生しました:', error);
    return false;
  }
}

// 進捗データAPIエンドポイント
app.get('/api/progress', (req, res) => {
  const progressData = loadProgressData();
  
  // DEBUGモードのみ詳細ログを表示
  if (DEBUG_MODE) {
    console.log('進捗データを返します');
  }
  
  res.json(progressData);
});

app.post('/api/progress', express.json(), (req, res) => {
  try {
    const progressData = loadProgressData();
    const updatedData = { ...progressData, ...req.body };
    
    saveProgressData(updatedData);
    
    // DEBUGモードのみ詳細ログを表示
    if (DEBUG_MODE) {
      console.log('進捗データが更新されました:', JSON.stringify(req.body, null, 2));
    } else {
      console.log('進捗データが更新されました');
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('進捗データの更新中にエラーが発生しました:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// サーバー再起動APIエンドポイント
app.post('/api/restart-server', async (req, res) => {
  try {
    console.log('サーバー再起動リクエストを受信しました');
    
    // サーバープロセスを終了
    await killExistingServer(PORT);
    
    // サーバー再起動用のコマンドを定義（ユーザーの環境に基づく）
    let restartCommand;
    if (process.platform === 'win32') {
      // Windows環境では、新しいコマンドプロンプトウィンドウでサーバーを起動
      restartCommand = `start cmd /c "cd ${__dirname} && node server.js"`;
    } else {
      // Unix系環境では、バックグラウンドでサーバーを起動
      restartCommand = `cd ${__dirname} && node server.js &`;
    }
    
    // 安全なコマンド実行関数を使用してサーバーを再起動
    safeExecCommand(restartCommand);
    
    res.json({ success: true, message: 'サーバーを再起動しています' });
  } catch (error) {
    console.error('サーバー再起動中にエラーが発生しました:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 質問を削除するエンドポイント
app.delete('/api/chat-history/:id', async (req, res) => {
  try {
    // テスト実行時に安全チェックを行う
    ensureTestSafetyCheck();
    
    const { id } = req.params;
    const chatHistory = await loadChatHistory();
    const index = chatHistory.findIndex(q => q.questionId === id);
    
    if (index === -1) {
      return res.status(404).json({ error: '指定されたIDの質問が見つかりません' });
    }
    
    chatHistory.splice(index, 1);
    await saveChatHistory(chatHistory);
    
    res.json({ success: true, deletedId: id });
  } catch (error) {
    console.error('質問の削除中にエラーが発生しました:', error);
    res.status(500).json({ error: '質問の削除に失敗しました' });
  }
});

// 質問を受け付けるエンドポイント
app.post('/api/ask', async (req, res) => {
  try {
    // テスト実行時に安全チェックを行う
    ensureTestSafetyCheck();
    
    const { question, contextInstructions } = req.body;
    
    if (!question || question.trim() === '') {
      return res.status(400).json({ error: '質問が空です' });
    }
    
    const id = Date.now().toString();
    const newQuestion = {
      questionId: id,
      question,
      contextInstructions: contextInstructions ? JSON.parse(contextInstructions) : undefined,
      answer: '',
      status: 'pending',
      timestamp: new Date().toISOString()
    };
    
    // チャット履歴に追加
    const chatHistory = await loadChatHistory();
    chatHistory.push(newQuestion);
    await saveChatHistory(chatHistory);
    
    // 新しい質問が追加されたことをコンソールに表示
    console.log('\n----------------------------------------------------');
    console.log(`[新しい質問 ID: ${id}]`);
    console.log('----------------------------------------------------');
    console.log(question);
    console.log('----------------------------------------------------');
    console.log('ClaudeAIによる回答をchat_history.jsonに書き込みます:');
    
    res.json(newQuestion);
  } catch (error) {
    console.error('質問の追加中にエラーが発生しました:', error);
    res.status(500).json({ error: '質問の追加に失敗しました' });
  }
});

// 回答状態を確認するエンドポイント
app.get('/api/check-answer/:id', async (req, res) => {
  try {
    const questionId = req.params.id;
    const chatHistory = await loadChatHistory();
    
    // 指定されたIDの質問を検索
    const question = chatHistory.find(q => q.questionId === questionId);
    
    if (!question) {
      return res.status(404).json({ error: '質問が見つかりません' });
    }
    
    res.json({
      id: question.questionId,
      status: question.status,
      answer: question.answer
    });
    
  } catch (error) {
    console.error('エラー:', error);
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
});

// 回答の保存
app.post('/api/answer/:id', async (req, res) => {
  try {
    // テスト実行時に安全チェックを行う
    ensureTestSafetyCheck();
    
    const { id } = req.params;
    const { answer } = req.body;
    
    if (!answer || answer.trim() === '') {
      return res.status(400).json({ error: '回答が空です' });
    }
    
    // チャット履歴から質問を検索
    const chatHistory = await loadChatHistory();
    const questionIndex = chatHistory.findIndex(q => q.questionId === id);
    
    if (questionIndex === -1) {
      return res.status(404).json({ error: '指定されたIDの質問が見つかりません' });
    }
    
    // 回答を設定
    chatHistory[questionIndex].answer = answer;
    chatHistory[questionIndex].status = 'completed';
    chatHistory[questionIndex].answeredAt = new Date().toISOString();
    
    // チャット履歴を保存
    await saveChatHistory(chatHistory);
    
    // answer_data.jsonに回答を追加
    try {
      // デバッグのため一時的に無効化
      console.log('==================================================');
      console.log('警告: answer_data.jsonへの書き込みは現在無効化されています');
      console.log('問題が解決したら、この変更を元に戻してください');
      console.log('==================================================');
      
      /* 以下の原本コードは無効化されています
      const answerData = await loadAnswerData();
      
      // 既存の回答を更新または新しい回答を追加
      const existingAnswerIndex = answerData.answers.findIndex(a => a.id === id);
      const newAnswer = {
        id,
        answer,
        timestamp: new Date().toISOString()
      };
      
      if (existingAnswerIndex !== -1) {
        answerData.answers[existingAnswerIndex] = newAnswer;
      } else {
        answerData.answers.push(newAnswer);
      }
      
      await fs.writeFile(ANSWER_DATA_FILE, JSON.stringify(answerData, null, 2), 'utf8');
      console.log(`質問ID: ${id} の回答をanswer_data.jsonに保存しました`);
      */
    } catch (error) {
      console.error('answer_data.jsonへの書き込み中にエラーが発生しました:', error);
      // ここではエラーを無視し、チャット履歴への保存は維持する
    }
    
    res.json({ success: true, questionId: id });
  } catch (error) {
    console.error('回答の保存中にエラーが発生しました:', error);
    res.status(500).json({ error: '回答の保存に失敗しました' });
  }
});

// 回答入力を処理する関数を修正
function processAnswerInput() {
  rl.question('', async (answer) => {
    if (pendingQuestions.length === 0) {
      console.log('現在、回答待ちの質問はありません。');
      processAnswerInput();
      return;
    }
    
    const oldestQuestion = pendingQuestions.shift();
    await saveAnswer(oldestQuestion.questionId, answer);
    
    if (pendingQuestions.length > 0) {
      const nextQuestion = pendingQuestions[0];
      console.log('\n----------------------------------------------------');
      console.log(`[次の質問 ID: ${nextQuestion.questionId}]`);
      console.log('----------------------------------------------------');
      console.log(nextQuestion.question);
      console.log('----------------------------------------------------');
      console.log(MESSAGES.REQUEST_AI_ANSWER);
    } else {
      console.log('\n回答待ちの質問がなくなりました。新しい質問が来るまで待機します...');
    }
    
    processAnswerInput();
  });
}

// アプリケーションの初期化
async function initializeApp() {
  try {
    // データディレクトリの確認
    await ensureDirectoryExists(DATA_DIR);
    
    // チャット履歴ファイルの確認
    await ensureFileExists(CHAT_HISTORY_FILE, '[]');
    
    // 回答データファイルの確認
    await ensureFileExists(ANSWER_DATA_FILE, '{"answers":[]}');
    
    // 問題データディレクトリの確認
    const publicDataDir = path.join(__dirname, 'public', 'data');
    await ensureDirectoryExists(publicDataDir);
    
    // 問題データファイルの確認
    const problemsFilePath = path.join(publicDataDir, 'bookkeeping_problems.json');
    await ensureFileExists(problemsFilePath, '{"problems":[]}');
    
    // 問題データの自動更新は行わない
    // 代わりに update_problem_data.js スクリプトを使用して手動で更新
    // await updateProblemData();
    
    // 回答待ちの質問を表示
    await displayPendingQuestions();
    
    console.log('=================================================');
    console.log('データセット情報:');
    console.log(`- データディレクトリ: ${DATA_DIR}`);
    console.log(`- チャット履歴ファイル: ${CHAT_HISTORY_FILE}`);
    console.log(`- 回答データファイル: ${ANSWER_DATA_FILE}`);
    console.log(`- 問題データファイル: ${problemsFilePath}`);
    console.log('=================================================');
  } catch (error) {
    console.error('アプリケーションの初期化中にエラーが発生しました:', error);
    throw error;
  }
}

// 問題データを更新する関数
async function updateProblemData() {
  try {
    // 既存の問題データを読み込む
    const publicDataDir = path.join(__dirname, 'public', 'data');
    
    // ディレクトリの存在を確認
    await ensureDirectoryExists(publicDataDir);
    
    // 問題データファイルのパス
    const problemsFilePath = path.join(publicDataDir, 'bookkeeping_problems.json');
    
    // 既存のデータを読み込み
    let existingData = { problems: [] };
    try {
      const existingContent = await fs.readFile(problemsFilePath, 'utf8');
      existingData = JSON.parse(existingContent);
      console.log(`既存の問題データを読み込みました: ${existingData.problems.length}件`);
    } catch (err) {
      console.log('既存の問題データファイルがないか、読み込めません。新しく作成します。');
    }
    
    // 既存の問題IDをセットに保存
    const existingProblemIds = new Set(existingData.problems.map(p => p.problemNumber));
    
    // チャット履歴から問題データを抽出
    const chatHistory = await loadChatHistory();
    
    // 問題として識別できる項目を抽出
    const newProblems = chatHistory
      .filter(item => item.contextInstructions && 
               (item.contextInstructions.problemId || 
                item.contextInstructions.category))
      .map(item => ({
        id: item.id,
        problemNumber: item.contextInstructions.problemId,
        category: item.contextInstructions.category,
        question: item.contextInstructions.question,
        correctAnswer: item.contextInstructions.correctAnswer || {}
      }))
      // 既存データに含まれないものだけを追加
      .filter(problem => !existingProblemIds.has(problem.problemNumber));
    
    // 既存の問題と新しい問題を結合
    const allProblems = [...existingData.problems, ...newProblems];
    
    // 問題IDでソート
    allProblems.sort((a, b) => (a.problemNumber || 0) - (b.problemNumber || 0));
    
    // 既存データに変更がある場合のみファイルを更新
    if (newProblems.length > 0) {
      // 問題データを書き出し
      await fs.writeFile(problemsFilePath, JSON.stringify({ problems: allProblems }, null, 2), 'utf8');
      console.log(`問題データを更新しました: ${allProblems.length}件の問題 (${newProblems.length}件追加)`);
    } else {
      console.log(`問題データは既に最新です: ${allProblems.length}件の問題`);
    }
    
    return true;
  } catch (error) {
    console.error('問題データの更新中にエラーが発生しました:', error);
    return false;
  }
}

// 既存のサーバープロセスを終了する関数
async function killExistingServer(port) {
  try {
    console.log(`ポート ${port} で実行中のサーバーを終了します...`);
    
    // OSによって異なるコマンドを実行
    if (process.platform === 'win32') {
      // Windows - より単純で堅牢なバージョンに修正
      try {
        const cmd = `netstat -ano | findstr :${port} | findstr LISTENING`;
        const output = safeExecCommand(cmd).toString();
        
        // 出力行を処理
        const lines = output.split('\n').filter(line => line.trim());
        if (lines.length > 0) {
          let killSuccess = false;
          // 既に終了したプロセスIDを記録するセット
          const terminatedPids = new Set();
          
          for (const line of lines) {
            // 最後のカラムがPIDです
            const parts = line.trim().split(/\s+/);
            const pid = parts[parts.length - 1];
            
            if (pid && !isNaN(parseInt(pid, 10)) && !terminatedPids.has(pid)) {
              try {
                console.log(`プロセスID ${pid} を終了します...`);
                // 安全なコマンド実行関数を使用
                safeExecCommand(`taskkill /F /PID ${pid}`);
                killSuccess = true;
                console.log(`プロセスID ${pid} を終了しました`);
                // 終了したプロセスIDを記録
                terminatedPids.add(pid);
              } catch (killError) {
                const errorMessage = handleWinEncoding(killError.message);
                
                if (errorMessage.includes('プロセスが見つかりません') || 
                    errorMessage.includes('見つかりません') || 
                    errorMessage.includes('存在しません')) {
                  // プロセスが既に終了している場合は正常として扱う
                  console.log(`プロセスID ${pid} は既に終了しています`);
                  terminatedPids.add(pid);
                  killSuccess = true;
                } else {
                  logError(`プロセスID ${pid} の終了に失敗: ${errorMessage}`);
                }
              }
            }
          }
          
          if (killSuccess) {
            console.log('既存のサーバーを終了しました');
            // プロセス終了後に5秒待機してポートが確実に解放されるのを待つ
            console.log('ポートが解放されるまで5秒待機します...');
            await new Promise(resolve => setTimeout(resolve, 5000));
            return true;
          } else {
            console.log('プロセスの終了に失敗しました');
            return false;
          }
        } else {
          console.log('終了すべきプロセスが見つかりませんでした');
          return true; // プロセスがなければ成功と見なす
        }
      } catch (innerError) {
        // netstatコマンドが失敗した場合
        if (innerError.status === 1 && !innerError.stdout) {
          // 出力がない場合は、プロセスが見つからなかったと判断
          console.log('ポートを使用しているプロセスは見つかりませんでした');
          return true;
        }
        
        logError('プロセス検出中にエラーが発生しました: ' + innerError.message);
        return false;
      }
    } else {
      // Unix系OSの場合
      try {
        const cmd = `lsof -i:${port} -t`;
        // 安全なコマンド実行関数を使用
        const pids = safeExecCommand(cmd).toString().trim().split('\n');
        let killSuccess = false;
        // 既に終了したプロセスIDを記録するセット
        const terminatedPids = new Set();
        
        for (const pid of pids) {
          if (pid && !isNaN(parseInt(pid, 10)) && !terminatedPids.has(pid)) {
            try {
              console.log(`プロセスID ${pid} を終了します...`);
              // 安全なコマンド実行関数を使用
              safeExecCommand(`kill -9 ${pid}`);
              killSuccess = true;
              console.log(`プロセスID ${pid} を終了しました`);
              // 終了したプロセスIDを記録
              terminatedPids.add(pid);
            } catch (killError) {
              console.error(`プロセスID ${pid} の終了に失敗しました:`, killError.message);
            }
          }
        }
        
        if (killSuccess) {
          console.log('既存のサーバーを終了しました');
          // プロセス終了後に5秒待機してポートが確実に解放されるのを待つ
          console.log('ポートが解放されるまで5秒待機します...');
          await new Promise(resolve => setTimeout(resolve, 5000));
          return true;
        } else {
          console.log('プロセスの終了に失敗しました');
          return false;
        }
      } catch (osError) {
        if (osError.status === 1 && !osError.stdout) {
          // 出力がない場合は、プロセスが見つからなかったと判断
          console.log('ポートを使用しているプロセスは見つかりませんでした');
          return true;
        }
        
        console.error('プロセス終了中にエラーが発生しました:', osError.message);
        return false;
      }
    }
  } catch (error) {
    logError('既存のサーバーの終了に失敗しました: ' + error.message);
    return false;
  }
}

// サーバーを起動する関数
async function startServer(port = PORT) {
  // ポート番号を確実に整数に変換
  port = parseInt(port, 10);
  
  // ポート番号が有効な範囲かチェック
  if (port < 1 || port > 65535) {
    console.error(`無効なポート番号: ${port}。デフォルトポート (${PORT}) を使用します。`);
    port = parseInt(PORT, 10);
  }
  
  return new Promise(async (resolve, reject) => {
    try {
      // まずポートが使用されていないか確認
      let portInUse = false;
      try {
        const server = require('net').createServer();
        await new Promise((resolvePort, rejectPort) => {
          server.once('error', (err) => {
            if (err.code === 'EADDRINUSE') {
              console.log(`[検出] ポート ${port} は既に使用されています`);
              portInUse = true;
              resolvePort();
            } else {
              rejectPort(err);
            }
          });
          server.once('listening', () => {
            server.close();
            resolvePort();
          });
          server.listen(port);
        });
      } catch (portCheckErr) {
        console.error('ポート確認中にエラーが発生しました:', portCheckErr);
      }

      // ポートが使用中の場合は処理
      if (portInUse) {
        let action;
        
        // 起動モードに応じた処理
        if (START_MODE === 'auto') {
          console.log(`自動モード: 既存のサーバーを終了します...`);
          action = 'kill';
        } else if (START_MODE === 'port') {
          console.error(`ポートモード: 別のポートを試みることができません。終了します。`);
          reject(new Error(`ポート ${port} は既に使用されています。`));
          return;
        } else {
          // デフォルトはプロンプトモード
          action = await promptUserForAction(port);
        }
        
        if (action === 'kill') {
          const success = await killExistingServer(port);
          if (!success) {
            reject(new Error('既存のサーバーを終了できませんでした。'));
            return;
          }
        } else if (action === 'port') {
          // 新しいポートを試す (1000を加算)
          const newPort = port + 1000;
          console.log(`新しいポート ${newPort} で起動を試みます...`);
          const server = await startServer(newPort);
          resolve(server);
          return;
        } else {
          // キャンセルの場合
          reject(new Error('ユーザーによりサーバー起動がキャンセルされました。'));
          return;
        }
      }

      // サーバー起動
      const server = app.listen(port, () => {
        console.log(MESSAGES.SERVER_STARTED + port);
        console.log(MESSAGES.CLAUDE_BRIDGE);
        console.log(MESSAGES.QUESTION_DISPLAY);
        console.log(MESSAGES.REQUEST_AI_ANSWER);
        
        // サーバーインスタンスをエクスポートするために保存
        app.server = server;
        resolve(server);
      });
      
      server.on('error', async (e) => {
        if (e.code === 'EADDRINUSE') {
          console.error(`ポート ${port} は既に使用されています。`);
          
          let action;
          
          // 起動モードに応じた処理
          if (START_MODE === 'auto') {
            console.log(`自動モード: 既存のサーバーを終了します...`);
            action = 'kill';
          } else if (START_MODE === 'port') {
            console.error(`ポートモード: 別のポートを試みることができません。終了します。`);
            reject(e);
            return;
          } else {
            // デフォルトはプロンプトモード
            action = await promptUserForAction(port);
          }
          
          if (action === 'kill') {
            try {
              const success = await killExistingServer(port);
              if (success) {
                console.log(`再度ポート ${port} で起動を試みます...`);
                // 少し待ってからポートが解放されるのを待つ
                await new Promise(resolve => setTimeout(resolve, 2000));
                const newServer = await startServer(port);
                resolve(newServer);
              } else {
                reject(new Error('既存のサーバーを終了できませんでした。'));
              }
            } catch (killError) {
              reject(killError);
            }
          } else if (action === 'port') {
            // 新しいポートを試す (1000を加算)
            const newPort = port + 1000;
            console.log(`新しいポート ${newPort} で起動を試みます...`);
            try {
              const newServer = await startServer(newPort);
              resolve(newServer);
            } catch (portError) {
              reject(portError);
            }
          } else {
            // キャンセルの場合
            reject(new Error('ユーザーによりサーバー起動がキャンセルされました。'));
          }
        } else {
          console.error('サーバー起動中にエラーが発生しました:', e);
          reject(e);
        }
      });
    } catch (error) {
      console.error('サーバー起動中にエラーが発生しました:', error);
      reject(error);
    }
  });
}

// ユーザーに選択肢を提示する関数
function promptUserForAction(port) {
  // ポート番号を確実に整数に変換
  port = parseInt(port, 10);
  
  return new Promise((resolve) => {
    console.log('\n既存のサーバーが実行中です。どうしますか？');
    console.log('1: 既存のサーバーを終了して再起動する (デフォルト)');
    console.log('2: 別のポートで起動する');
    console.log('3: 起動をキャンセルする');
    
    rl.question('選択してください (1-3) [1]: ', async (answer) => {
      answer = answer.trim() || '1';
      
      switch (answer) {
        case '1':
          const success = await killExistingServer(port);
          if (success) {
            resolve({ action: 'restart', port });
          } else {
            console.log('既存のサーバーを終了できませんでした。別のオプションを選択してください。');
            const result = await promptUserForAction(port);
            resolve(result);
          }
          break;
        case '2':
          // 数値として扱うことを確実にし、1を足す
          const newPort = port + 1;
          console.log(`ポート ${newPort} で起動します...`);
          resolve({ action: 'new_port', port: newPort });
          break;
        case '3':
          console.log('サーバーの起動をキャンセルしました。');
          resolve({ action: 'cancel' });
          break;
        default:
          console.log('無効な選択です。デフォルトを選択します。');
          const defaultResult = await killExistingServer(port);
          if (defaultResult) {
            resolve({ action: 'restart', port });
          } else {
            resolve({ action: 'cancel' });
          }
      }
    });
  });
}

// メイン処理
async function main() {
  // アプリケーションの初期化
  await initializeApp();
  
  try {
    // サーバーの起動
    return await startServer();
  } catch (err) {
    console.error('サーバー起動中にエラーが発生しました:', err);
    process.exit(1);
  }
}

// スクリプトが直接実行された場合のみ実行
if (require.main === module) {
  main().catch(err => {
    console.error('サーバー起動中にエラーが発生しました:', err);
    process.exit(1);
  });
}

module.exports = app;

// チャット履歴を読み込む関数
async function loadChatHistory() {
  try {
    const filePath = CHAT_HISTORY_FILE || path.join(DATA_DIR, 'chat_history.json');
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

// チャット履歴を保存する関数
async function saveChatHistory(history) {
  const filePath = CHAT_HISTORY_FILE || path.join(DATA_DIR, 'chat_history.json');
  await fs.writeFile(filePath, JSON.stringify(history, null, 2), 'utf8');
}

// 回答データを読み込む関数
async function loadAnswerData() {
  try {
    const data = await fs.readFile(ANSWER_DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { answers: [] };
    }
    throw error;
  }
}

// 回答を保存する関数
async function saveAnswer(id, answer) {
  try {
    // テスト実行時に安全チェックを行う
    ensureTestSafetyCheck();
    
    // チャット履歴から質問を検索
    const chatHistory = await loadChatHistory();
    const questionIndex = chatHistory.findIndex(q => q.questionId === id);
    
    if (questionIndex === -1) {
      console.error(`質問ID: ${id} が見つかりません`);
      return false;
    }
    
    // 回答を設定
    chatHistory[questionIndex].answer = answer;
    chatHistory[questionIndex].status = 'completed';
    chatHistory[questionIndex].answeredAt = new Date().toISOString();
    
    // チャット履歴を保存
    await saveChatHistory(chatHistory);
    
    // answer_data.jsonに回答を追加
    try {
      // デバッグのため一時的に無効化
      console.log('==================================================');
      console.log('警告: answer_data.jsonへの書き込みは現在無効化されています');
      console.log('問題が解決したら、この変更を元に戻してください');
      console.log('==================================================');
      
      /* 以下の原本コードは無効化されています
      const answerData = await loadAnswerData();
      
      // 既存の回答を更新または新しい回答を追加
      const existingAnswerIndex = answerData.answers.findIndex(a => a.id === id);
      const newAnswer = {
        id,
        answer,
        timestamp: new Date().toISOString()
      };
      
      if (existingAnswerIndex !== -1) {
        answerData.answers[existingAnswerIndex] = newAnswer;
      } else {
        answerData.answers.push(newAnswer);
      }
      
      await fs.writeFile(ANSWER_DATA_FILE, JSON.stringify(answerData, null, 2), 'utf8');
      console.log(`質問ID: ${id} の回答をanswer_data.jsonに保存しました`);
      */
    } catch (error) {
      console.error('answer_data.jsonへの書き込み中にエラーが発生しました:', error);
      // ここではエラーを無視し、チャット履歴への保存は維持する
    }
    
    return true;
  } catch (error) {
    console.error('回答の保存中にエラーが発生しました:', error);
    return false;
  }
}

// チャット履歴を更新する関数（テスト用にエクスポート）
async function updateChatHistory() {
  try {
    console.log('チャット履歴の更新を開始します...');
    console.log(`使用するチャット履歴ファイル: ${CHAT_HISTORY_FILE}`);
    console.log(`使用する回答データファイル: ${ANSWER_DATA_FILE}`);
    
    // チャット履歴と回答データを読み込む
    const chatHistory = await loadChatHistory();
    const answerData = await loadAnswerData();
    
    let updateCount = 0;
    
    // 回答データ内の各回答についてチャット履歴を更新
    for (const answer of answerData.answers) {
      const questionIndex = chatHistory.findIndex(q => q.questionId === answer.id);
      
      // 質問が見つかり、まだ回答が設定されていない場合に更新
      if (questionIndex !== -1 && chatHistory[questionIndex].status === 'pending') {
        chatHistory[questionIndex].answer = answer.answer;
        chatHistory[questionIndex].status = 'completed';
        chatHistory[questionIndex].answeredAt = answer.timestamp || new Date().toISOString();
        updateCount++;
      }
    }
    
    if (updateCount > 0) {
      // 更新があった場合、チャット履歴を保存
      await saveChatHistory(chatHistory);
      console.log(`${updateCount}件の質問に回答を追加しました`);
    } else {
      console.log('更新する質問はありませんでした');
    }
    
    return updateCount;
  } catch (error) {
    console.error('チャット履歴の更新中にエラーが発生しました:', error);
    return 0;
  }
}

// テスト用に関数をエクスポート
module.exports.updateChatHistory = updateChatHistory;
module.exports.loadChatHistory = loadChatHistory;
module.exports.saveChatHistory = saveChatHistory;
module.exports.loadAnswerData = loadAnswerData;
module.exports.saveAnswer = saveAnswer;

// ディレクトリの存在を確認し、なければ作成する関数
async function ensureDirectoryExists(dirPath) {
  try {
    await fs.access(dirPath);
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log(`ディレクトリ ${dirPath} が存在しないため作成します...`);
      await fs.mkdir(dirPath, { recursive: true });
      console.log(`ディレクトリを作成しました: ${dirPath}`);
    } else {
      throw error;
    }
  }
}

// ファイルの存在を確認し、なければ作成する関数
async function ensureFileExists(filePath, initialContent) {
  try {
    await fs.access(filePath);
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log(`ファイル ${filePath} が存在しないため作成します...`);
      await fs.writeFile(filePath, initialContent, 'utf8');
      console.log(`ファイルを作成しました: ${filePath}`);
    } else {
      throw error;
    }
  }
}

// 回答待ちの質問を表示する関数
async function displayPendingQuestions() {
  // 保留中の質問を読み込む
  const chatHistory = await loadChatHistory();
  pendingQuestions = chatHistory.filter(q => q.status === 'pending');
  
  if (pendingQuestions.length > 0) {
    console.log(`${pendingQuestions.length}件の回答待ち質問があります。`);
    // 質問を表示
    pendingQuestions.forEach(question => {
      console.log('\n----------------------------------------------------');
      console.log(`[回答待ちの質問 ID: ${question.questionId}]`);
      console.log('----------------------------------------------------');
      console.log(question.question);
      console.log('----------------------------------------------------');
    });
    console.log('ClaudeAIによる回答をchat_history.jsonに書き込みます:');
  }
}