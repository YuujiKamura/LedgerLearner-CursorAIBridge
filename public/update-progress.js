const fs = require('fs');
const path = require('path');

// Node.js環境用のモックlocalStorage
const localStorage = {
  data: {},
  
  getItem(key) {
    return this.data[key] || null;
  },
  
  setItem(key, value) {
    this.data[key] = value;
  }
};

// 進捗データファイルのパス
const progressFilePath = path.join(__dirname, 'progress-backup.json');

// 進捗データをファイルから読み込む
function loadProgressFromFile() {
  try {
    if (fs.existsSync(progressFilePath)) {
      const data = fs.readFileSync(progressFilePath, 'utf8');
      localStorage.data.bookkeepingProgress = data;
      console.log('ファイルから進捗データを読み込みました');
    } else {
      console.log('進捗データファイルが見つかりません。新しいファイルを作成します。');
    }
  } catch (error) {
    console.error('ファイル読み込みエラー:', error);
  }
}

// 進捗データをファイルに保存
function saveProgressToFile(progress) {
  try {
    // バックアップファイルを作成
    if (fs.existsSync(progressFilePath)) {
      const backupPath = `${progressFilePath}.backup-${Date.now()}`;
      fs.copyFileSync(progressFilePath, backupPath);
      console.log(`バックアップを作成しました: ${backupPath}`);
    }
    
    // 新しいデータを保存
    fs.writeFileSync(progressFilePath, JSON.stringify(progress, null, 2), 'utf8');
    console.log(`進捗データをファイルに保存しました: ${progressFilePath}`);
  } catch (error) {
    console.error('ファイル保存エラー:', error);
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
  
  console.log('更新処理を開始します...');
  
  // 変更カウンター
  let changedCount = 0;
  let totalCount = 0;
  
  // 各問題の進捗をチェック
  for (const [problemId, data] of Object.entries(progress)) {
    totalCount++;
    
    // isCorrectがtrueでcountCorrectBySelectが設定されていない場合
    if (data.isCorrect === true) {
      // 現在の状態をログに出力
      console.log(`問題ID: ${problemId}, isCorrect: ${data.isCorrect}, countCorrectBySelect: ${data.countCorrectBySelect || 0}`);
      
      // countCorrectBySelectが0または未設定の場合のみ変更
      if (!data.countCorrectBySelect || data.countCorrectBySelect === 0) {
        data.countCorrectBySelect = 1;
        changedCount++;
        console.log(`  => 更新: countCorrectBySelect = 1`);
      }
    }
  }
  
  // 更新されたデータを保存
  localStorage.setItem('bookkeepingProgress', JSON.stringify(progress));
  
  console.log(`\n更新完了: ${totalCount}件中、${changedCount}件の問題を更新しました`);
  
  return progress;
}

// メイン処理
function main() {
  // ファイルから進捗データを読み込む
  loadProgressFromFile();
  
  // 進捗データを更新
  const updatedProgress = updateProgress();
  
  // 更新したデータをファイルに保存
  saveProgressToFile(updatedProgress);
}

// スクリプトを実行
main();

// エクスポート（他のモジュールから利用する場合）
module.exports = {
  getProgress,
  updateProgress
}; 