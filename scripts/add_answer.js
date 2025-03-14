const fs = require('fs');
const path = require('path');

// 回答データファイル
const ANSWER_FILE = path.join(__dirname, '..', 'data', 'answer_data.json');

// 質問IDと回答を定義
const questionId = '1741930082234';
const answer = `未払金と買掛金の違いについて説明します。

両者の主な違いは取引の性質にあります：

1. **買掛金** は商品の仕入れに関する債務を記録する勘定科目です。継続的な取引関係のある仕入先との取引で発生します。

2. **未払金** は商品の仕入れ以外の債務を記録する勘定科目です。固定資産の購入、サービスの利用などで発生します。

建物の購入は固定資産の取得であり、商品の仕入れではないため、正しくは「未払金」を使用します。そのため、この取引の正しい仕訳は：

借方：建物（固定資産の増加）
貸方：未払金（債務の増加）

となります。

簿記において、取引の性質に応じて適切な勘定科目を選択することが重要です。この区別をしっかり理解することで、より正確な会計処理が可能になります。`;

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