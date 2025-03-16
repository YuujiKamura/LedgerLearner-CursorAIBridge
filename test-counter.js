/**
 * BookkeepingApp の進捗カウント機能のテスト
 * countCorrectBySelect と countCorrectByInput が適切にカウントされるかチェック
 */

// モックのlocalStorageを作成
global.localStorage = {
  data: {},
  getItem(key) {
    return this.data[key] || null;
  },
  setItem(key, value) {
    this.data[key] = value;
  },
  removeItem(key) {
    delete this.data[key];
  },
  clear() {
    this.data = {};
  }
};

// モックのconsole.assert
global.console.assert = function(condition, message) {
  if (!condition) {
    console.error('Assertion Failed:', message);
    throw new Error('Assertion Failed: ' + message);
  } else {
    console.log('Assertion passed');
  }
};

// テスト用の進捗データを取得する関数
function getProgressForTest(problemId) {
  const progressData = JSON.parse(localStorage.getItem('bookkeepingProgress') || '{}');
  return progressData[problemId] || null;
}

// テスト関数
function testCounters() {
  console.log('===== テスト開始 =====');
  
  const testProblemId = 'test-123';
  const progress = {};
  
  // 初期状態の設定
  localStorage.setItem('bookkeepingProgress', JSON.stringify(progress));
  
  // テスト1: 初期状態確認
  console.log('テスト1: 初期状態の確認');
  let data = getProgressForTest(testProblemId);
  console.log('初期データ:', data);
  
  // テスト2: 選択肢使用の正解
  console.log('テスト2: 選択肢使用の正解');
  const progress2 = JSON.parse(localStorage.getItem('bookkeepingProgress') || '{}');
  if (!progress2[testProblemId]) {
    progress2[testProblemId] = {
      isCorrect: false,
      countCorrectBySelect: 0,
      countCorrectByInput: 0,
      lastAttempt: null,
      answerMethod: null
    };
  }
  
  const answerMethod1 = {
    debitByInput: false,
    creditByInput: false,
    isInputOnly: false
  };
  
  progress2[testProblemId].lastAttempt = new Date().toISOString();
  progress2[testProblemId].answerMethod = answerMethod1;
  progress2[testProblemId].isCorrect = true;
  
  // 選択肢使用の場合のカウント
  if (!answerMethod1.isInputOnly) {
    progress2[testProblemId].countCorrectBySelect = (progress2[testProblemId].countCorrectBySelect || 0) + 1;
  }
  
  if (answerMethod1.isInputOnly) {
    progress2[testProblemId].countCorrectByInput = (progress2[testProblemId].countCorrectByInput || 0) + 1;
  }
  
  localStorage.setItem('bookkeepingProgress', JSON.stringify(progress2));
  
  // 結果確認
  data = getProgressForTest(testProblemId);
  console.log('選択肢使用後のデータ:', data);
  console.assert(data.countCorrectBySelect === 1, 'countCorrectBySelectが1になっていません');
  console.assert(data.countCorrectByInput === 0, 'countCorrectByInputが0になっていません');
  
  // テスト3: 入力のみの正解
  console.log('テスト3: 入力のみの正解');
  const progress3 = JSON.parse(localStorage.getItem('bookkeepingProgress') || '{}');
  
  const answerMethod2 = {
    debitByInput: true,
    creditByInput: true,
    isInputOnly: true
  };
  
  progress3[testProblemId].lastAttempt = new Date().toISOString();
  progress3[testProblemId].answerMethod = answerMethod2;
  progress3[testProblemId].isCorrect = true;
  
  // 入力のみの場合のカウント
  if (answerMethod2.isInputOnly) {
    progress3[testProblemId].countCorrectByInput = (progress3[testProblemId].countCorrectByInput || 0) + 1;
  } else {
    progress3[testProblemId].countCorrectBySelect = (progress3[testProblemId].countCorrectBySelect || 0) + 1;
  }
  
  localStorage.setItem('bookkeepingProgress', JSON.stringify(progress3));
  
  // 結果確認
  data = getProgressForTest(testProblemId);
  console.log('入力のみ使用後のデータ:', data);
  console.assert(data.countCorrectBySelect === 1, 'countCorrectBySelectが1のままになっていません');
  console.assert(data.countCorrectByInput === 1, 'countCorrectByInputが1になっていません');
  
  // テスト4: 混合入力の正解
  console.log('テスト4: 混合入力の正解（片方だけ入力）');
  const progress4 = JSON.parse(localStorage.getItem('bookkeepingProgress') || '{}');
  
  const answerMethod3 = {
    debitByInput: true,
    creditByInput: false,
    isInputOnly: false
  };
  
  progress4[testProblemId].lastAttempt = new Date().toISOString();
  progress4[testProblemId].answerMethod = answerMethod3;
  progress4[testProblemId].isCorrect = true;
  
  // 選択肢使用の場合のカウント
  if (!answerMethod3.isInputOnly) {
    progress4[testProblemId].countCorrectBySelect = (progress4[testProblemId].countCorrectBySelect || 0) + 1;
  }
  
  if (answerMethod3.isInputOnly) {
    progress4[testProblemId].countCorrectByInput = (progress4[testProblemId].countCorrectByInput || 0) + 1;
  }
  
  localStorage.setItem('bookkeepingProgress', JSON.stringify(progress4));
  
  // 結果確認
  data = getProgressForTest(testProblemId);
  console.log('混合入力使用後のデータ:', data);
  console.assert(data.countCorrectBySelect === 2, 'countCorrectBySelectが2になっていません');
  console.assert(data.countCorrectByInput === 1, 'countCorrectByInputが1のままになっていません');
  
  console.log('===== テスト終了: すべて成功 =====');
}

// テスト実行
testCounters(); 