/**
 * コンテキストパーサーのユニットテスト
 */

const { extractContextInfo, trimLeadingEmptyLines } = require('../public/js/context_parser');
const assert = require('assert');

/**
 * テストケースの実行
 */
function runTests() {
  console.log('コンテキストパーサー テストを開始します...');
  
  testEmptyInput();
  testPlainText();
  testContextWithProblem();
  testContextWithDuplicatedProblem();
  testInvalidJson();
  testAlreadyFormattedText();
  testTrimEmptyLines();
  
  console.log('すべてのテストが完了しました');
}

/**
 * 空の入力テスト
 */
function testEmptyInput() {
  console.log('テスト: 空の入力');
  
  const result = extractContextInfo('');
  assert.strictEqual(result.displayText, '', '空の入力では空のテキストを返すべき');
  assert.strictEqual(result.hasContextData, false, 'コンテキストデータなし');
  
  const nullResult = extractContextInfo(null);
  assert.strictEqual(nullResult.displayText, null, 'null入力ではnullを返すべき');
  
  console.log('✅ 空の入力テスト成功');
}

/**
 * プレーンテキストテスト
 */
function testPlainText() {
  console.log('テスト: コンテキストなしのプレーンテキスト');
  
  const plainText = '単純な質問です。';
  const result = extractContextInfo(plainText);
  
  assert.strictEqual(result.displayText, plainText, '通常テキストはそのまま返されるべき');
  assert.strictEqual(result.hasContextData, false, 'コンテキストデータなし');
  assert.strictEqual(result.problemId, null, '問題IDはnull');
  
  console.log('✅ プレーンテキストテスト成功');
}

/**
 * コンテキストあり（問題文あり）のテスト
 */
function testContextWithProblem() {
  console.log('テスト: 問題文を含むコンテキスト');
  
  const withContext = '#context: {"problemId":"test123","category":"テスト","question":"これはテスト問題です"}\n質問があります';
  const result = extractContextInfo(withContext);
  
  assert.strictEqual(result.hasContextData, true, 'コンテキストデータあり');
  assert.strictEqual(result.problemId, 'test123', '問題IDが抽出される');
  assert.strictEqual(result.category, 'テスト', 'カテゴリが抽出される');
  assert.strictEqual(result.problemText, 'これはテスト問題です', '問題文が抽出される');
  assert.strictEqual(result.userQuestion, '質問があります', 'ユーザー質問が抽出される');
  
  const expectedDisplay = '【問題ID: test123】【カテゴリ: テスト】\nこれはテスト問題です\n\n質問があります';
  assert.strictEqual(result.displayText, expectedDisplay, '整形されたテキストが返される');
  
  console.log('✅ 問題文含むコンテキストテスト成功');
}

/**
 * 重複問題文テスト
 */
function testContextWithDuplicatedProblem() {
  console.log('テスト: 既に問題文がテキストに含まれる場合');
  
  const duplicatedText = '#context: {"problemId":"test123","category":"テスト","question":"これはテスト問題です"}\n【問題ID: test123】【カテゴリ: テスト】\nこれはテスト問題です\n\n質問があります';
  const result = extractContextInfo(duplicatedText);
  
  assert.strictEqual(result.hasContextData, true, 'コンテキストデータあり');
  assert.strictEqual(result.problemId, 'test123', '問題IDが抽出される');
  
  // 問題文が重複しないこと
  const expectedDisplay = '【問題ID: test123】【カテゴリ: テスト】\nこれはテスト問題です\n\n質問があります';
  assert.strictEqual(result.displayText, expectedDisplay, '重複なしで整形されたテキストが返される');
  
  console.log('✅ 重複問題文テスト成功');
}

/**
 * 不正なJSON構文テスト
 */
function testInvalidJson() {
  console.log('テスト: 不正なJSON構文');
  
  const invalidJson = '#context: {problemId:"invalid"}\n質問があります';
  const result = extractContextInfo(invalidJson);
  
  assert.strictEqual(result.hasContextData, false, 'コンテキストデータなし（解析エラー）');
  assert.strictEqual(result.displayText, '質問があります', 'エラー時はコンテキスト部分を削除');
  
  console.log('✅ 不正なJSON構文テスト成功');
}

/**
 * 既にフォーマット済みのテキストテスト
 */
function testAlreadyFormattedText() {
  console.log('テスト: 既にフォーマット済みのテキスト');
  
  const formattedText = '【問題ID: test123】【カテゴリ: テスト】\nこれはテスト問題です\n\n質問があります';
  const result = extractContextInfo(formattedText);
  
  assert.strictEqual(result.hasContextData, true, 'フォーマット済みでもコンテキストデータあり');
  assert.strictEqual(result.problemId, 'test123', '問題IDが抽出される');
  assert.strictEqual(result.displayText, formattedText, 'フォーマット済みならそのまま返す');
  
  console.log('✅ フォーマット済みテキストテスト成功');
}

/**
 * 先頭の空行削除テスト
 */
function testTrimEmptyLines() {
  console.log('テスト: 先頭の空行削除');
  
  const withEmptyLines = '\n\n\n本文です';
  const result = trimLeadingEmptyLines(withEmptyLines);
  
  assert.strictEqual(result, '本文です', '先頭の空行が削除される');
  
  const noEmptyLines = '本文だけ';
  assert.strictEqual(trimLeadingEmptyLines(noEmptyLines), '本文だけ', '空行がなければそのまま');
  
  console.log('✅ 先頭空行削除テスト成功');
}

// 直接実行されたらテスト実行
if (require.main === module) {
  runTests();
}

module.exports = { runTests }; 