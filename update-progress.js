/**
 * isCorrect=trueの問題についてcountCorrectBySelectを1に設定するスクリプト
 */

// モックのlocalStorageを作成（Node.js環境用）
if (typeof localStorage === 'undefined') {
  global.localStorage = {
    data: {},
    getItem(key) {
      return this.data[key] || null;
    },
    setItem(key, value) {
      this.data[key] = value;
    }
  };

  // ファイルシステムからデータを読み込む場合（オプション）
  try {
    const fs = require('fs');
    const filePath = 'bookkeeping-progress.json';
    if (fs.existsSync(filePath)) {
      const fileData = fs.readFileSync(filePath, 'utf8');
      localStorage.data['bookkeepingProgress'] = fileData;
      console.log('ファイルからデータを読み込みました');
    }
  } catch (error) {
    console.error('ファイル読み込みエラー:', error);
  }
}

// 進捗データを取得
function getProgress() {
  try {
    const progressData = JSON.parse(localStorage.getItem('bookkeepingProgress') || '{}');
    return progressData;
  } catch (error) {
    console.error('進捗データの読み込みに失敗しました:', error);
    return {};
  }
}

// 進捗データを更新
function updateProgress() {
  // 現在の進捗データを取得
  const progress = getProgress();
  
  // 変更カウンター
  let changedCount = 0;
  let totalCount = 0;
  
  // 各問題の進捗をチェック
  for (const [problemId, data] of Object.entries(progress)) {
    totalCount++;
    
    // isCorrectがtrueでcountCorrectBySelectが設定されていない場合
    if (data.isCorrect === true) {
      // countCorrectBySelectが0または未設定の場合のみ変更
      if (!data.countCorrectBySelect || data.countCorrectBySelect === 0) {
        data.countCorrectBySelect = 1;
        changedCount++;
      }
    }
  }
  
  // 更新されたデータを保存
  localStorage.setItem('bookkeepingProgress', JSON.stringify(progress));
  console.log(`更新完了: ${totalCount}件中、${changedCount}件の問題を更新しました`);
  
  // ファイルに保存（Node.js環境の場合）
  try {
    if (typeof require !== 'undefined') {
      const fs = require('fs');
      fs.writeFileSync('bookkeeping-progress.json', JSON.stringify(progress, null, 2));
      console.log('更新データをファイルに保存しました');
    }
  } catch (error) {
    console.error('ファイル書き込みエラー:', error);
  }
  
  return progress;
}

// メイン処理
function main() {
  // テスト用データを作成する場合はコメントを外す
  // createTestData();
  
  try {
    // ファイルに保存されている進捗データを読み込む
    const fs = require('fs');
    console.log('進捗データファイルを読み込みます...');
    
    // ここでlocalStorageに保存されているデータをJSON形式でファイルに保存するためのコード
    if (fs.existsSync('bookkeeping-progress.json')) {
      const data = fs.readFileSync('bookkeeping-progress.json', 'utf8');
      const progressData = JSON.parse(data);
      console.log('既存の進捗データを読み込みました:');
      console.log(`問題数: ${Object.keys(progressData).length}`);
      
      // 進捗データをlocalStorageにセット
      localStorage.setItem('bookkeepingProgress', JSON.stringify(progressData));
      
      // 進捗データを更新
      const updatedProgress = updateProgress();
      
      // 更新後のデータをファイルに保存
      fs.writeFileSync('bookkeeping-progress-updated.json', JSON.stringify(updatedProgress, null, 2));
      console.log('更新後のデータを保存しました: bookkeeping-progress-updated.json');
    } else {
      console.log('進捗データファイルが見つかりません: bookkeeping-progress.json');
    }
  } catch (error) {
    console.error('エラーが発生しました:', error);
  }
}

// テスト用データを作成
function createTestData() {
  const testData = {
    "0030001": {
      "isCorrect": true,
      "lastAttempt": "2023-06-01T12:00:00.000Z",
      "answerMethod": {
        "debitByInput": false,
        "creditByInput": false,
        "isInputOnly": false
      }
    },
    "0030002": {
      "isCorrect": true,
      "countCorrectBySelect": 0,
      "countCorrectByInput": 1,
      "lastAttempt": "2023-06-02T12:00:00.000Z",
      "answerMethod": {
        "debitByInput": true,
        "creditByInput": true,
        "isInputOnly": true
      }
    },
    "0030003": {
      "isCorrect": true,
      "countCorrect": 2,
      "lastAttempt": "2023-06-03T12:00:00.000Z",
      "answerMethod": {
        "debitByInput": false,
        "creditByInput": true,
        "isInputOnly": false
      }
    }
  };
  
  // テストデータをlocalStorageにセット
  localStorage.setItem('bookkeepingProgress', JSON.stringify(testData));
  console.log('テスト用データを作成しました');
  
  // テストデータをファイルに保存
  const fs = require('fs');
  fs.writeFileSync('bookkeeping-progress.json', JSON.stringify(testData, null, 2));
  console.log('テスト用データをbookkeeping-progress.jsonに保存しました');
  
  return testData;
}

// 実行
// main();

// テストモードで実行（コメントを外すとテストデータを作成して更新します）
createTestData();
main();

// ブラウザ環境の場合は再読み込みを促す
if (typeof window !== 'undefined') {
  console.log('データが更新されました。ページを再読み込みして変更を反映してください。');
  alert('進捗データが更新されました。ページを再読み込みして変更を反映してください。');
}

// Node.js環境でのエクスポート
if (typeof module !== 'undefined') {
  module.exports = { updateProgress };
} 