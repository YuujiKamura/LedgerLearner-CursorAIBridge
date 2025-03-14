const fs = require('fs');
const path = require('path');

// 回答データファイル
const ANSWER_FILE = path.join(__dirname, '..', 'data', 'answer_data.json');

// テスト用の回答データ
const questionId = '1741897269582';
const answer = `おっしゃる通りです。このアプローチには多くの利点があります。特に：

1. 履歴保存：すべての対話が構造化されたJSONとして保存されるため、後から参照や分析が可能です。

2. フォーマット統一：Bokiのような学習支援アプリでは、問題や回答を特定のフォーマットで追加できるため、一貫性のあるコンテンツ生成が可能です。

3. 拡張性：今回構築したシステムは基本的な質問応答だけでなく、特定のコマンドや指示を解釈して問題集の生成や検索などの機能を追加できます。

4. デコップリング：サーバー処理とAI応答処理が分離されているので、どちらかに変更があっても他方に影響しにくい設計です。

5. APIアクセス制限の回避：直接APIを使わずにファイルベースの連携を行うことで、APIの利用制限やコスト問題を回避できます。`;

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
  answer: answer,
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
console.log('保存された回答:');
console.log(answer); 