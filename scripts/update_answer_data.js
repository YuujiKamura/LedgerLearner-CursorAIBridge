const fs = require('fs');
const path = require('path');

// Jest実行環境の検出（テスト中かどうかを自動検出）
const isRunningInJest = process.env.JEST_WORKER_ID !== undefined || process.argv.some(arg => 
  arg.includes('jest') || arg.includes('test_runner.js') || arg.includes('test:')
);

// テスト実行時の環境変数を確認
const NODE_ENV = process.env.NODE_ENV;

// 回答データファイル
let dataDir = process.env.DATA_DIR;
if (!dataDir) {
  dataDir = (NODE_ENV === 'test' || isRunningInJest) ? 
    path.join(__dirname, '..', 'test_data') : 
    path.join(__dirname, '..', 'data');
}

// テスト安全チェック
if ((NODE_ENV === 'test' || isRunningInJest) && !dataDir.includes('test_data') && !dataDir.includes('tmp')) {
  console.error('警告: テスト実行中に本番環境のデータディレクトリが使用されています！');
  console.error(`現在のDATA_DIR: ${dataDir}`);
  process.exit(1);
}

const ANSWER_FILE = process.env.ANSWER_DATA_FILE || path.join(dataDir, 'answer_data.json');

// 引数からデータを取得
const questionId = process.argv[2];
let answer = process.argv[3];

if (!questionId || !answer) {
  console.error('使用方法: node update_answer_data.js <質問ID> <回答テキスト>');
  process.exit(1);
}

// 実行方法の説明を追加
console.log('注意: 改行を含む回答を提供するには、テンプレートリテラル(`)を使用してください。');
console.log('例: node test_answer.js を参照');

// 回答データを読み込む
let answerData;
try {
  const data = fs.readFileSync(ANSWER_FILE, 'utf8');
  answerData = JSON.parse(data);
  
  if (!answerData.answers) {
    answerData.answers = [];
  }
} catch (error) {
  console.error('回答データの読み込みエラー:', error);
  // 新しいデータを作成
  answerData = { answers: [] };
}

// 既存の回答を検索
const existingAnswerIndex = answerData.answers.findIndex(a => a.id === questionId);

// 回答データを更新または追加
const newAnswer = {
  id: questionId,
  answer: answer.replace(/\\n/g, '\n'),
  timestamp: new Date().toISOString()
};

if (existingAnswerIndex >= 0) {
  // 既存の回答を更新
  answerData.answers[existingAnswerIndex] = newAnswer;
  console.log(`質問ID: ${questionId} の回答を更新しました`);
} else {
  // 新しい回答を追加
  answerData.answers.push(newAnswer);
  console.log(`質問ID: ${questionId} の回答を追加しました`);
}

// 回答データを保存
fs.writeFileSync(ANSWER_FILE, JSON.stringify(answerData, null, 2), 'utf8');
console.log('回答データを保存しました'); 