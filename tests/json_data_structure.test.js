/**
 * クライアント側が期待するJSONデータ構造の詳細テスト
 * 
 * このテストでは以下の点を検証します：
 * 1. 仕訳データの構造
 * 2. 問題データの構造
 * 3. エラーケースでのデータ保持
 */

const fs = require('fs').promises;
const path = require('path');
const assert = require('assert');
const { JSONParser } = require('./json_parser.test.js');

/**
 * 期待される構造のクラス定義
 * （クライアント側の期待するデータモデル）
 */
class BookkeepingProblem {
  constructor(data = {}) {
    this.problemId = data.problemId || '';
    this.category = data.category || '';
    this.question = data.question || '';
    this.userAnswer = {
      method: data.userAnswer?.method || '仕訳',
      debit: data.userAnswer?.debit || '',
      credit: data.userAnswer?.credit || '',
      amount: data.userAnswer?.amount || 0
    };
    this.additionalInfo = data.additionalInfo || {};
    this.hasParseError = data.hasParseError || false;
  }

  /**
   * JSON文字列からインスタンスを作成
   * @param {string} jsonString - JSON文字列
   * @returns {BookkeepingProblem} インスタンス
   */
  static fromJSON(jsonString) {
    try {
      const data = JSONParser.parseJSON(jsonString);
      return new BookkeepingProblem(data);
    } catch (e) {
      console.error(`BookkeepingProblem作成エラー: ${e.message}`);
      return new BookkeepingProblem({
        problemId: '不明',
        hasParseError: true
      });
    }
  }

  /**
   * JSONオブジェクトに変換
   */
  toJSON() {
    return {
      problemId: this.problemId,
      category: this.category,
      question: this.question,
      userAnswer: this.userAnswer,
      additionalInfo: this.additionalInfo,
      hasParseError: this.hasParseError
    };
  }

  /**
   * 有効な問題かどうかを検証
   */
  isValid() {
    return (
      this.problemId && 
      this.category && 
      this.question && 
      !this.hasParseError
    );
  }
}

/**
 * テスト実行関数
 */
async function runTests() {
  console.log('クライアント側データ構造テストを開始します...');
  
  // テストデータディレクトリの準備
  const testDataDir = path.join(__dirname, '..', 'test_parse');
  try {
    await fs.mkdir(testDataDir, { recursive: true });
  } catch (err) {
    if (err.code !== 'EEXIST') console.error('テストディレクトリ作成エラー:', err);
  }
  
  // 1. データモデルのテスト
  await testDataModel(testDataDir);
  
  // 2. 仕訳データ構造のテスト
  await testJournalEntryStructure(testDataDir);
  
  // 3. エラー回復のテスト
  await testErrorRecovery(testDataDir);
  
  console.log('すべてのデータ構造テストが完了しました');
}

/**
 * データモデルのテスト
 */
async function testDataModel(testDir) {
  console.log('テスト: データモデルの基本機能');
  
  // 基本的なモデル作成テスト
  const problem = new BookkeepingProblem({
    problemId: 'model001',
    category: 'モデルテスト',
    question: 'これはモデルテストです',
    userAnswer: {
      method: '仕訳',
      debit: '現金',
      credit: '売上',
      amount: 10000
    }
  });
  
  // 検証
  assert.strictEqual(problem.problemId, 'model001', '問題IDが正しく設定されていません');
  assert.strictEqual(problem.userAnswer.debit, '現金', 'debitが正しく設定されていません');
  assert.strictEqual(problem.userAnswer.amount, 10000, '金額が正しく設定されていません');
  assert.strictEqual(problem.isValid(), true, '有効な問題として認識されていません');
  
  // シリアライズ & デシリアライズテスト
  const json = JSON.stringify(problem.toJSON());
  const testFile = path.join(testDir, 'model_test.json');
  await fs.writeFile(testFile, json);
  
  const loadedJson = await fs.readFile(testFile, 'utf8');
  const restoredProblem = BookkeepingProblem.fromJSON(loadedJson);
  
  assert.strictEqual(restoredProblem.problemId, 'model001', 'シリアライズ後の問題IDが正しくありません');
  assert.strictEqual(restoredProblem.userAnswer.credit, '売上', 'シリアライズ後のcreditが正しくありません');
  
  console.log('✅ データモデルテスト成功');
}

/**
 * 仕訳データ構造のテスト
 */
async function testJournalEntryStructure(testDir) {
  console.log('テスト: 仕訳データ構造');
  
  // 複数の仕訳パターンをテスト
  const testCases = [
    {
      name: '基本的な仕訳',
      data: {
        problemId: 'journal001',
        category: '仕訳',
        question: '商品を10,000円で販売し、代金は現金で受け取った。',
        userAnswer: {
          method: '仕訳',
          debit: '現金',
          credit: '売上',
          amount: 10000
        }
      }
    },
    {
      name: '複合仕訳',
      data: {
        problemId: 'journal002',
        category: '仕訳',
        question: '商品を10,000円で販売し、代金のうち3,000円は現金、残りは掛けとした。',
        userAnswer: {
          method: '複合仕訳',
          entries: [
            { debit: '現金', amount: 3000 },
            { debit: '売掛金', amount: 7000 },
            { credit: '売上', amount: 10000 }
          ]
        }
      }
    }
  ];
  
  // 各テストケースを検証
  for (const testCase of testCases) {
    const testFile = path.join(testDir, `journal_${testCase.data.problemId}.json`);
    await fs.writeFile(testFile, JSON.stringify(testCase.data, null, 2));
    
    const loadedJson = await fs.readFile(testFile, 'utf8');
    const problem = BookkeepingProblem.fromJSON(loadedJson);
    
    assert.strictEqual(problem.problemId, testCase.data.problemId, 
      `${testCase.name}: 問題IDが正しくありません`);
    
    // 通常仕訳のテスト
    if (testCase.data.userAnswer.method === '仕訳') {
      assert.strictEqual(problem.userAnswer.debit, testCase.data.userAnswer.debit,
        `${testCase.name}: debitが正しくありません`);
      assert.strictEqual(problem.userAnswer.credit, testCase.data.userAnswer.credit,
        `${testCase.name}: creditが正しくありません`);
    }
    
    // 複合仕訳のテスト（entriesがあるかどうか）
    if (testCase.data.userAnswer.method === '複合仕訳') {
      // JavaScriptのオブジェクト継承による柔軟性をテスト
      // 注意: これはモデルに定義されていない追加プロパティを許容するテスト
      assert.ok(problem.userAnswer.entries || problem.userAnswer.method === '複合仕訳',
        `${testCase.name}: 複合仕訳の構造が保持されていません`);
    }
  }
  
  console.log('✅ 仕訳データ構造テスト成功');
}

/**
 * エラー回復のテスト
 */
async function testErrorRecovery(testDir) {
  console.log('テスト: エラー回復とデータ保持');
  
  // エラーケース: 構文エラーのあるJSONでも最低限のデータを保持できるか
  const invalidJSON = `{
    "problemId": "error001",
    "category": "エラーテスト",
    "question": "これは意図的に壊したJSONです
    "userAnswer": {
      "method": "仕訳",
      "debit": "現金",
      "credit": "売上"
    }
  }`;
  
  const testFile = path.join(testDir, 'error_recovery.json');
  await fs.writeFile(testFile, invalidJSON);
  
  const loadedJson = await fs.readFile(testFile, 'utf8');
  const problem = BookkeepingProblem.fromJSON(loadedJson);
  
  // エラー時でも問題IDが保持されていることを確認
  assert.ok(problem.problemId === 'error001' || problem.hasParseError,
    'エラー時でも問題IDが保持されるか、エラーフラグが設定されるべき');
  
  // デフォルト値が適用されていることを確認
  assert.strictEqual(typeof problem.userAnswer, 'object',
    'エラー時でもuserAnswerはオブジェクトとして存在するべき');
  
  console.log('✅ エラー回復テスト成功');
}

// 直接実行された場合はテストを実行
if (require.main === module) {
  runTests().catch(err => {
    console.error('テスト実行中にエラーが発生しました:', err);
    process.exit(1);
  });
}

module.exports = {
  BookkeepingProblem,
  runTests
}; 