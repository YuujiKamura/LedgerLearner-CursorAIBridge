const fs = require('fs');
const path = require('path');

// 問題データファイルのパス（新しいファイル名を使用）
const PROBLEMS_FILE = path.join('public', 'data', 'test_problems.json');

// 新しい問題を1つ追加するテスト
async function addOneProblem() {
  try {
    // テスト用の問題データを作成
    const testData = {
      problems: [
        {
          id: Date.now().toString(),
          problemId: 101,
          category: "テスト",
          question: "これはテスト問題です。別のファイルに保存します。",
          correctAnswer: {
            debit: "テスト借方",
            credit: "テスト貸方"
          }
        }
      ]
    };
    
    // データをファイルに書き込む
    console.log(`テストデータをファイル ${PROBLEMS_FILE} に書き込みます...`);
    fs.writeFileSync(PROBLEMS_FILE, JSON.stringify(testData, null, 2), 'utf8');
    
    // 確認
    console.log(`テストデータを書き込みました。問題数: ${testData.problems.length}件`);
    console.log(`追加した問題: ${testData.problems[0].question}`);
    
    // 読み込みテスト
    console.log(`書き込んだファイルを読み込みます...`);
    const content = fs.readFileSync(PROBLEMS_FILE, 'utf8');
    console.log(`ファイル内容の長さ: ${content.length}文字`);
    const parsedData = JSON.parse(content);
    console.log(`読み込んだ問題数: ${parsedData.problems.length}件`);
    
    return true;
  } catch (error) {
    console.error('テスト中にエラーが発生しました:', error);
    return false;
  }
}

// スクリプトを実行
addOneProblem(); 