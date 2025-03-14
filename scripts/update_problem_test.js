const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// 問題データファイルのパス
const PROBLEMS_FILE = path.join('public', 'data', 'bookkeeping_problems.json');

// テスト実行関数
async function runTest() {
  try {
    console.log('==== サーバー起動前のテスト ====');
    
    // 1. 既存の問題データを読み込む
    console.log('既存の問題データを読み込みます...');
    const existingData = JSON.parse(fs.readFileSync(PROBLEMS_FILE, 'utf8'));
    console.log(`現在の問題数: ${existingData.problems.length}件`);
    
    // 2. 新しい問題を追加
    const testProblem = {
      id: "test_" + Date.now().toString(),
      problemId: 20,
      category: "サーバーテスト",
      question: "これはサーバー起動テスト用の問題です。",
      correctAnswer: {
        debit: "テスト借方",
        credit: "テスト貸方"
      }
    };
    
    existingData.problems.push(testProblem);
    console.log('テスト問題を追加しました');
    
    // 3. ファイルに書き込む
    fs.writeFileSync(PROBLEMS_FILE, JSON.stringify(existingData, null, 2), 'utf8');
    console.log(`更新したファイルを保存しました。問題数: ${existingData.problems.length}件`);
    
    // 4. 読み込みテスト
    const updatedContent = fs.readFileSync(PROBLEMS_FILE, 'utf8');
    const parsedData = JSON.parse(updatedContent);
    console.log(`ファイルを再読み込み。問題数: ${parsedData.problems.length}件`);
    
    // 5. サーバーを起動し、10秒後にファイルを再確認
    console.log('\n==== サーバーを起動します ====');
    console.log('10秒後にファイルをチェックします...');
    
    // サーバーを起動（3秒だけ実行）
    const server = spawn('node', ['server.js'], { 
      detached: true,
      stdio: 'inherit'
    });
    
    // 待機して3秒後に終了
    await new Promise(resolve => setTimeout(() => {
      // サーバー終了
      if (server && !server.killed) {
        console.log('サーバーを終了します...');
        process.kill(-server.pid);
      }
      resolve();
    }, 3000));
    
    // 6. サーバー起動後にファイルを再確認
    console.log('\n==== サーバー終了後のテスト ====');
    const afterServerContent = fs.readFileSync(PROBLEMS_FILE, 'utf8');
    try {
      const afterServerData = JSON.parse(afterServerContent);
      console.log(`サーバー終了後の問題数: ${afterServerData.problems.length}件`);
    } catch (err) {
      console.error('サーバー終了後のファイル解析エラー:', err.message);
      console.log('ファイルの内容:', afterServerContent.substring(0, 100) + '...');
    }
    
    console.log('テスト完了');
  } catch (error) {
    console.error('テスト中にエラーが発生しました:', error);
  }
}

// テスト実行
runTest(); 