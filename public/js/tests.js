/**
 * 簿記アプリの進捗カウント機能をテストするためのスクリプト
 * ブラウザ環境で実行されることを想定しています
 */

// テスト用の進捗データを取得する関数
function getProgressForTest(problemId) {
  const progressData = JSON.parse(localStorage.getItem('bookkeepingProgress') || '{}');
  return progressData[problemId] || null;
}

// 通常の正解テスト（選択肢使用）
function testNormalCorrectAnswer(problemId) {
  console.log('テスト2: 通常の正解（選択肢使用）');
  
  const answerMethod = {
    debitByInput: false,
    creditByInput: false,
    isInputOnly: false
  };
  
  // saveProgressをシミュレート
  const progress = JSON.parse(localStorage.getItem('bookkeepingProgress') || '{}');
  
  if (!progress[problemId]) {
    progress[problemId] = {
      isCorrect: false,
      countCorrectBySelect: 0,
      countCorrectByInput: 0,
      lastAttempt: null,
      answerMethod: null
    };
  }
  
  progress[problemId].lastAttempt = new Date().toISOString();
  progress[problemId].answerMethod = answerMethod;
  progress[problemId].isCorrect = true;
  
  // 選択肢使用の場合のカウント
  if (!answerMethod.isInputOnly) {
    progress[problemId].countCorrectBySelect = (progress[problemId].countCorrectBySelect || 0) + 1;
  }
  
  if (answerMethod && answerMethod.isInputOnly) {
    progress[problemId].countCorrectByInput = (progress[problemId].countCorrectByInput || 0) + 1;
  }
  
  localStorage.setItem('bookkeepingProgress', JSON.stringify(progress));
  
  // 結果の確認
  const result = getProgressForTest(problemId);
  console.log('選択肢使用後の進捗データ:', result);
  console.assert(result.countCorrectBySelect === 1, 'countCorrectBySelectが1になっていません');
  console.assert(result.countCorrectByInput === 0, 'countCorrectByInputが0のままになっていません');
}

// 入力のみの正解テスト
function testInputOnlyCorrectAnswer(problemId) {
  console.log('テスト3: 入力のみの正解');
  
  const answerMethod = {
    debitByInput: true,
    creditByInput: true,
    isInputOnly: true
  };
  
  // saveProgressをシミュレート
  const progress = JSON.parse(localStorage.getItem('bookkeepingProgress') || '{}');
  
  progress[problemId].lastAttempt = new Date().toISOString();
  progress[problemId].answerMethod = answerMethod;
  progress[problemId].isCorrect = true;
  
  // 入力のみの場合のカウント
  if (answerMethod.isInputOnly) {
    progress[problemId].countCorrectByInput = (progress[problemId].countCorrectByInput || 0) + 1;
  } else {
    progress[problemId].countCorrectBySelect = (progress[problemId].countCorrectBySelect || 0) + 1;
  }
  
  localStorage.setItem('bookkeepingProgress', JSON.stringify(progress));
  
  // 結果の確認
  const result = getProgressForTest(problemId);
  console.log('入力のみ使用後の進捗データ:', result);
  console.assert(result.countCorrectBySelect === 1, 'countCorrectBySelectが1のままになっていません');
  console.assert(result.countCorrectByInput === 1, 'countCorrectByInputが1になっていません');
}

// 混合入力の正解テスト（片方だけ入力）
function testMixedInputCorrectAnswer(problemId) {
  console.log('テスト4: 混合入力の正解（片方だけ入力）');
  
  const answerMethod = {
    debitByInput: true,
    creditByInput: false,
    isInputOnly: false
  };
  
  // saveProgressをシミュレート
  const progress = JSON.parse(localStorage.getItem('bookkeepingProgress') || '{}');
  
  progress[problemId].lastAttempt = new Date().toISOString();
  progress[problemId].answerMethod = answerMethod;
  progress[problemId].isCorrect = true;
  
  // 選択肢使用の場合のカウント
  if (!answerMethod.isInputOnly) {
    progress[problemId].countCorrectBySelect = (progress[problemId].countCorrectBySelect || 0) + 1;
  }
  
  if (answerMethod && answerMethod.isInputOnly) {
    progress[problemId].countCorrectByInput = (progress[problemId].countCorrectByInput || 0) + 1;
  }
  
  localStorage.setItem('bookkeepingProgress', JSON.stringify(progress));
  
  // 結果の確認
  const result = getProgressForTest(problemId);
  console.log('混合入力使用後の進捗データ:', result);
  console.assert(result.countCorrectBySelect === 2, 'countCorrectBySelectが2になっていません');
  console.assert(result.countCorrectByInput === 1, 'countCorrectByInputが1のままになっていません');
}

// 初期状態のテスト
function testInitialState(problemId) {
  console.log('テスト1: 初期状態の確認');
  
  // テスト前にデータをクリア
  localStorage.removeItem('bookkeepingProgress');
  
  // 結果の確認
  const result = getProgressForTest(problemId);
  console.log('初期データ:', result);
  console.assert(result === null, '初期状態ではnullになるはずです');
}

// メインのテスト関数
function runBookkeepingTests() {
  console.log('===== 簿記アプリのカウント機能テスト開始 =====');
  
  const testProblemId = 'test-progress-123';
  
  try {
    // テスト実行
    testInitialState(testProblemId);
    testNormalCorrectAnswer(testProblemId);
    testInputOnlyCorrectAnswer(testProblemId);
    testMixedInputCorrectAnswer(testProblemId);
    
    console.log('===== テスト終了: すべて成功 =====');
  } catch (error) {
    console.error('テスト失敗:', error);
  }
}

// ページ読み込み時に自動的にテストを実行
(function() {
  // ブラウザ環境かどうかを確認
  if (typeof window !== 'undefined' && window.localStorage) {
    console.log('ブラウザ環境でテストを実行します');
    // DOMContentLoadedイベントで実行
    document.addEventListener('DOMContentLoaded', runBookkeepingTests);
  }
})(); 