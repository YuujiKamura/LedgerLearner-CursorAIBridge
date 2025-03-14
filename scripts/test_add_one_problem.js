const fs = require('fs');
const path = require('path');

// 問題データファイルのパス
const PROBLEMS_FILE = path.join('public', 'data', 'bookkeeping_problems.json');

// 新しい問題を1つ追加するテスト
async function addOneProblem() {
  try {
    // 既存の問題データを読み込む
    console.log(`問題データファイル ${PROBLEMS_FILE} を読み込みます...`);
    const existingData = JSON.parse(fs.readFileSync(PROBLEMS_FILE, 'utf8'));
    
    // 既存の問題数を表示
    console.log(`現在の問題数: ${existingData.problems.length}件`);
    
    // 最大のproblemIdを取得
    let maxProblemId = 0;
    existingData.problems.forEach(problem => {
      if (problem.problemId > maxProblemId) {
        maxProblemId = problem.problemId;
      }
    });
    
    // 新しい問題ID
    const newProblemId = maxProblemId + 1;
    console.log(`新しい問題ID: ${newProblemId}`);
    
    // 追加するテスト問題
    const newProblem = {
      id: Date.now().toString(),
      problemId: newProblemId,
      category: "テスト",
      question: "これはテスト問題です。問題ID: " + newProblemId,
      correctAnswer: {
        debit: "テスト借方",
        credit: "テスト貸方"
      }
    };
    
    // 問題を追加
    existingData.problems.push(newProblem);
    
    // データをファイルに書き込む
    console.log(`更新データをファイルに書き込みます...`);
    fs.writeFileSync(PROBLEMS_FILE, JSON.stringify(existingData, null, 2), 'utf8');
    
    // 確認
    console.log(`テスト問題を追加しました。新しい問題数: ${existingData.problems.length}件`);
    console.log(`追加した問題: ${newProblem.question}`);
    return true;
  } catch (error) {
    console.error('テスト問題の追加中にエラーが発生しました:', error);
    return false;
  }
}

// スクリプトを実行
addOneProblem(); 