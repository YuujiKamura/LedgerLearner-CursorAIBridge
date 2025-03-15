const assert = require('assert');
const fs = require('fs');
const path = require('path');

/**
 * コンテキスト情報処理の単体テスト
 * - #context情報が正しく処理されるか
 * - 問題IDとカテゴリが抽出されるか
 * - 重複表示が発生しないか
 */
function runContextTests() {
  console.log('コンテキスト処理テストを開始します...');
  
  // テストケース
  const testCases = [
    {
      name: '基本的なコンテキスト情報の処理',
      input: '#context: {"problemId":"test1","category":"テスト","question":"これはテスト問題です"}\n質問です',
      expectedOutput: '【問題ID: test1】【カテゴリ: テスト】\nこれはテスト問題です\n\n質問です',
      testFunction: processContextBasic
    },
    {
      name: 'コンテキスト情報が無い場合',
      input: '普通の質問です',
      expectedOutput: '普通の質問です',
      testFunction: processContextNone
    },
    {
      name: '既に問題文が含まれる場合',
      input: '#context: {"problemId":"test2","category":"テスト2","question":"これはテスト問題2です"}\n【問題ID: test2】【カテゴリ: テスト2】\nこれはテスト問題2です\n\n質問内容',
      expectedOutput: '【問題ID: test2】【カテゴリ: テスト2】\nこれはテスト問題2です\n\n質問内容',
      testFunction: processContextWithQuestionText
    },
    {
      name: '不正なJSON形式の場合',
      input: '#context: {problemId:"invalid"}\n質問です',
      expectedOutput: '質問です',
      testFunction: processContextInvalid
    }
  ];
  
  // テストケースを実行
  let passed = 0;
  let failed = 0;
  
  for (const testCase of testCases) {
    console.log(`テスト: ${testCase.name}`);
    try {
      testCase.testFunction(testCase.input, testCase.expectedOutput);
      console.log(`✅ ${testCase.name}: 合格`);
      passed++;
    } catch (error) {
      console.error(`❌ ${testCase.name}: 不合格 - ${error.message}`);
      failed++;
    }
  }
  
  console.log('\nテスト結果:');
  console.log(`合格: ${passed}`);
  console.log(`不合格: ${failed}`);
  console.log(`合計: ${testCases.length}`);
  
  if (failed > 0) {
    process.exit(1);
  }
}

// テスト関数1: 基本的なコンテキスト処理
function processContextBasic(input, expected) {
  const result = processContext(input);
  assert.strictEqual(result, expected, `期待値と実際の出力が異なります\n期待値: ${expected}\n実際: ${result}`);
}

// テスト関数2: コンテキストなしの場合
function processContextNone(input, expected) {
  const result = processContext(input);
  assert.strictEqual(result, expected, `コンテキストなしの場合の処理が誤っています`);
}

// テスト関数3: 既に問題文が含まれる場合
function processContextWithQuestionText(input, expected) {
  const result = processContext(input);
  assert.strictEqual(result, expected, `既に問題文が含まれる場合の処理が誤っています`);
}

// テスト関数4: 不正なJSON形式の場合
function processContextInvalid(input, expected) {
  const result = processContext(input);
  assert.strictEqual(result, expected, `不正なJSON形式の場合の処理が誤っています`);
}

// createChatBubble関数内のコンテキスト処理ロジックを抽出したテスト用関数
function processContext(displayMessage) {
  if (displayMessage && displayMessage.includes('#context:')) {
    try {
      // コンテキスト情報を抽出してJSONとして解析
      const contextMatch = displayMessage.match(/#context: (.+?)(\n|\r|$)/);
      if (contextMatch) {
        const contextData = JSON.parse(contextMatch[1]);
        
        // 質問部分が二重に表示されないようにする
        const remainingText = displayMessage.replace(/#context:.*?(\n|\r|$)/g, '').trim();
        
        // コンテキストから必要な情報を抽出
        if (contextData.question && !remainingText.includes(contextData.question)) {
          // 通常の質問文に問題文が含まれていない場合は追加
          return `【問題ID: ${contextData.problemId}】【カテゴリ: ${contextData.category}】\n${contextData.question}\n\n${remainingText}`;
        } else {
          // 既に問題文が含まれている場合はそのまま
          return remainingText;
        }
      }
    } catch (e) {
      console.error('コンテキスト情報の解析中にエラーが発生しました:', e);
      // エラーが発生した場合は単純に削除
      return displayMessage.replace(/#context:.*?(\n|\r|$)/g, '');
    }
  }
  
  // コンテキストタグがない場合はそのまま返す
  return displayMessage;
}

// スクリプトが直接実行された場合に実行
if (require.main === module) {
  runContextTests();
}

module.exports = { runContextTests }; 