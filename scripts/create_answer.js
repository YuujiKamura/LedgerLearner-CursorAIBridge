const fs = require('fs');
const path = require('path');

// 回答データファイル
const ANSWER_FILE = path.join(__dirname, '..', 'data', 'answer_data.json');

// テスト用の質問ID
const questionId = process.argv[2] || '1234567890';
const answer = process.argv[3] || 'これはテスト回答です。実際の質問に対する適切な回答に置き換えてください。';

// 回答データを読み込む
let answerData;
try {
  const data = fs.readFileSync(ANSWER_FILE, 'utf8');
  answerData = JSON.parse(data);
} catch (error) {
  console.error('回答データの読み込みエラー:', error);
  // 新しいデータを作成
  answerData = { answers: [] };
}

// 回答データに新しい回答を追加
answerData.answers.push({
  id: questionId,
  answer,
  timestamp: new Date().toISOString()
});

// 回答データを保存
fs.writeFileSync(ANSWER_FILE, JSON.stringify(answerData, null, 2), 'utf8');
console.log(`質問ID: ${questionId} に回答を追加しました`); 