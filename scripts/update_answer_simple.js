const fs = require('fs');
const path = require('path');

// ファイルパス
const CHAT_HISTORY_FILE = path.join(__dirname, '..', 'data', 'chat_history.json');

// 引数からデータを取得
const questionId = process.argv[2];
const answer = process.argv[3];

if (!questionId || !answer) {
  console.error('使用方法: node update_answer_simple.js <質問ID> <回答テキスト>');
  process.exit(1);
}

// チャット履歴を読み込む
let chatHistory;
try {
  const data = fs.readFileSync(CHAT_HISTORY_FILE, 'utf8');
  chatHistory = JSON.parse(data);
} catch (error) {
  console.error('チャット履歴の読み込みエラー:', error);
  process.exit(1);
}

// 質問を検索
const questionIndex = chatHistory.findIndex(q => q.id === questionId);

if (questionIndex === -1) {
  console.error(`質問ID: ${questionId} が見つかりません`);
  process.exit(1);
}

// 回答を更新
chatHistory[questionIndex].answer = answer;
chatHistory[questionIndex].status = 'answered';
chatHistory[questionIndex].answeredAt = new Date().toISOString();

// 保存
fs.writeFileSync(CHAT_HISTORY_FILE, JSON.stringify(chatHistory, null, 2), 'utf8');
console.log(`質問ID: ${questionId} の回答を更新しました`); 