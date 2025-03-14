const fs = require('fs');
const path = require('path');

// テスト用問題データファイルのパス
const TEST_PROBLEMS_FILE = path.join('public', 'data', 'test_problems.json');

// テスト用の問題データ
const testProblems = {
  "problems": [
    {
      "id": "test_1",
      "problemId": 101,
      "category": "テスト",
      "question": "これはテスト問題1です。",
      "correctAnswer": {
        "debit": "テスト借方",
        "credit": "テスト貸方"
      }
    },
    {
      "id": "test_2",
      "problemId": 102,
      "category": "テスト",
      "question": "これはテスト問題2です。",
      "correctAnswer": {
        "debit": "テスト借方",
        "credit": "テスト貸方"
      }
    },
    {
      "id": "test_3",
      "problemId": 103,
      "category": "テスト",
      "question": "これはテスト問題3です。",
      "correctAnswer": {
        "debit": "テスト借方",
        "credit": "テスト貸方"
      }
    }
  ]
};

// テスト用データを作成する関数
function createTestData() {
  try {
    console.log(`テスト用問題データを ${TEST_PROBLEMS_FILE} に作成します...`);
    
    // ディレクトリの存在確認
    const dir = path.dirname(TEST_PROBLEMS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`ディレクトリを作成しました: ${dir}`);
    }
    
    // テストデータを書き込み
    fs.writeFileSync(TEST_PROBLEMS_FILE, JSON.stringify(testProblems, null, 2), 'utf8');
    console.log(`テスト用問題データを作成しました: ${testProblems.problems.length}問`);
    
    return true;
  } catch (error) {
    console.error('テスト用データの作成中にエラーが発生しました:', error);
    return false;
  }
}

// スクリプトを実行
createTestData(); 