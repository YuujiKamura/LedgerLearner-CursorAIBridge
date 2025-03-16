/**
 * JSONパーサーとデータ格納形式のテスト
 * 
 * このテストでは以下の点を検証します：
 * 1. 正常なJSONのパース
 * 2. 不正なJSONの修復処理
 * 3. クライアント側が期待するJSONからのデータ格納形式
 */

const fs = require('fs').promises;
const path = require('path');
const assert = require('assert');

// JSONパーサとデータ処理関数
class JSONParser {
  /**
   * JSONデータをパースする（エラーハンドリング付き）
   * @param {string} jsonString - パースするJSON文字列
   * @returns {Object} パースされたオブジェクト
   */
  static parseJSON(jsonString) {
    if (!jsonString) return null;
    
    try {
      // 標準的なJSONパース
      return JSON.parse(jsonString);
    } catch (e) {
      console.error(`JSON解析エラー: ${e.message}`);
      
      // エラー発生位置の特定
      if (e.message.includes('position')) {
        const posMatch = e.message.match(/position (\d+)/);
        if (posMatch && posMatch[1]) {
          const errorPos = parseInt(posMatch[1]);
          const start = Math.max(0, errorPos - 15);
          const end = Math.min(jsonString.length, errorPos + 15);
          console.log(`エラー位置周辺のJSON (${errorPos}): ${jsonString.substring(start, end)}`);
        }
      }
      
      // JSON修復処理
      return this.repairJSON(jsonString);
    }
  }
  
  /**
   * 不正なJSON文字列を修復する
   * @param {string} jsonString - 修復するJSON文字列
   * @returns {Object|null} 修復されたオブジェクトまたはnull
   */
  static repairJSON(jsonString) {
    try {
      // JSON文字列を修復
      let fixedJson = jsonString
        // エスケープ文字の修正
        .replace(/\\\\/g, '\\')
        .replace(/\\"/g, '"')
        .replace(/"([^"]*)"/g, (match) => match.replace(/"/g, '\\"'))
        
        // 一般的なJSON構文エラーの修正
        .replace(/"([^"]+)",\s*"([^"]+)"\s*:/g, '"$1":"値不明","$2":') // "key1","key2": パターンを修正
        .replace(/"([^"]+)",\s*([a-zA-Z0-9_]+)\s*:/g, '"$1":"値不明","$2":') // "key1",key2: パターンを修正
        .replace(/,\s*,/g, ',') // 重複カンマの削除
        .replace(/:\s*,/g, ':"値不明",') // 値がないフィールドにデフォルト値を追加
        .replace(/,\s*}/g, '}') // 末尾カンマの削除
        .replace(/,\s*]/g, ']'); // 配列の末尾カンマの削除
      
      // 修復したJSONをパース
      return JSON.parse(fixedJson);
    } catch (e) {
      console.error(`JSON修復失敗: ${e.message}`);
      
      // 最終手段：正規表現で必要な情報を抽出
      try {
        const problemIdMatch = jsonString.match(/"problemId"\s*:\s*"([^"]+)"/);
        const categoryMatch = jsonString.match(/"category"\s*:\s*"([^"]+)"/);
        
        if (problemIdMatch) {
          return {
            problemId: problemIdMatch[1],
            category: categoryMatch ? categoryMatch[1] : "不明",
            hasParseError: true
          };
        }
      } catch (e2) {
        console.error(`正規表現による抽出にも失敗: ${e2.message}`);
      }
      
      return null;
    }
  }
}

/**
 * テスト実行関数
 */
async function runTests() {
  console.log('JSONパーサーとデータ格納形式のテストを開始します...');
  
  // テストデータディレクトリの作成（必要に応じて）
  const testDataDir = path.join(__dirname, '..', 'test_parse');
  try {
    await fs.mkdir(testDataDir, { recursive: true });
  } catch (err) {
    if (err.code !== 'EEXIST') console.error('テストディレクトリ作成エラー:', err);
  }
  
  // 1. 正常なJSONパースのテスト
  await testValidJSON(testDataDir);
  
  // 2. 不正なJSONの修復処理テスト
  await testInvalidJSON(testDataDir);
  
  // 3. データ格納形式の検証
  await testJSONDataStructure(testDataDir);
  
  console.log('すべてのテストが完了しました');
}

/**
 * 正常なJSONパースのテスト
 */
async function testValidJSON(testDir) {
  console.log('テスト: 正常なJSONのパース');
  
  // テストデータファイルの準備
  const validJSON = {
    problemId: "test001",
    category: "テスト",
    question: "これはテスト問題です",
    userAnswer: {
      method: "仕訳",
      debit: "現金",
      credit: "売上"
    }
  };
  
  const testFile = path.join(testDir, 'valid_test.json');
  await fs.writeFile(testFile, JSON.stringify(validJSON, null, 2));
  
  // ファイルからJSONを読み込んでパース
  const fileContent = await fs.readFile(testFile, 'utf8');
  const parsedData = JSONParser.parseJSON(fileContent);
  
  // 検証
  assert.strictEqual(parsedData.problemId, "test001", "問題IDが正しくパースされていません");
  assert.strictEqual(parsedData.category, "テスト", "カテゴリが正しくパースされていません");
  assert.strictEqual(parsedData.userAnswer.method, "仕訳", "userAnswer.methodが正しくパースされていません");
  
  console.log('✅ 正常なJSONパースのテスト成功');
}

/**
 * 不正なJSONの修復処理テスト
 */
async function testInvalidJSON(testDir) {
  console.log('テスト: 不正なJSONの修復処理');
  
  // テストケース: カンマの問題
  const invalidJSON1 = '{"problemId":"test002","category":"テスト","question":"これはエラーテスト",}';
  const testFile1 = path.join(testDir, 'invalid_test1.json');
  await fs.writeFile(testFile1, invalidJSON1);
  
  // テストケース: キーと値の問題
  const invalidJSON2 = '{"problemId":"test003","category":"テスト","debit":"売掛金","credit":"売上"}';
  const testFile2 = path.join(testDir, 'invalid_test2.json');
  await fs.writeFile(testFile2, invalidJSON2);
  
  // テストケース: 深刻な構文エラー
  const invalidJSON3 = '{"problemId":"test004",category:テスト,"question:これは壊れたJSON"}';
  const testFile3 = path.join(testDir, 'invalid_test3.json');
  await fs.writeFile(testFile3, invalidJSON3);
  
  // テストケース1: 末尾カンマ
  const fileContent1 = await fs.readFile(testFile1, 'utf8');
  const parsed1 = JSONParser.parseJSON(fileContent1);
  assert.strictEqual(parsed1.problemId, "test002", "末尾カンマの修復が正しく行われていません");
  
  // テストケース2: 標準的なJSONフォーマット
  const fileContent2 = await fs.readFile(testFile2, 'utf8');
  const parsed2 = JSONParser.parseJSON(fileContent2);
  assert.strictEqual(parsed2.problemId, "test003", "標準的なJSONが正しくパースされていません");
  assert.strictEqual(parsed2.debit, "売掛金", "debitフィールドが正しくパースされていません");
  
  // テストケース3: 深刻な構文エラー
  const fileContent3 = await fs.readFile(testFile3, 'utf8');
  const parsed3 = JSONParser.parseJSON(fileContent3);
  assert.strictEqual(parsed3.problemId, "test004", "深刻な構文エラーからのリカバリーに失敗しています");
  
  console.log('✅ 不正なJSONの修復処理テスト成功');
}

/**
 * データ格納形式の検証
 */
async function testJSONDataStructure(testDir) {
  console.log('テスト: JSONデータ格納形式の検証');
  
  // クライアント側の期待するデータ構造
  const testData = {
    problemId: "test005",
    category: "データ構造",
    question: "これはデータ構造テストです",
    userAnswer: {
      method: "仕訳",
      debit: "現金",
      credit: "売上"
    },
    additionalInfo: {
      timestamp: new Date().toISOString(),
      version: "1.0"
    }
  };
  
  const testFile = path.join(testDir, 'structure_test.json');
  await fs.writeFile(testFile, JSON.stringify(testData, null, 2));
  
  // 検証: ファイルが書き込めること
  const stats = await fs.stat(testFile);
  assert.ok(stats.size > 0, "データ構造テスト用ファイルが正しく書き込まれていません");
  
  // ファイルからJSONを読み込んでパース
  const fileContent = await fs.readFile(testFile, 'utf8');
  const parsedData = JSONParser.parseJSON(fileContent);
  
  // データ構造の検証
  assert.strictEqual(typeof parsedData, "object", "パース結果はオブジェクトであるべきです");
  assert.strictEqual(parsedData.problemId, "test005", "問題IDが正しくパースされていません");
  assert.strictEqual(typeof parsedData.userAnswer, "object", "userAnswerはオブジェクトであるべきです");
  assert.strictEqual(parsedData.userAnswer.method, "仕訳", "userAnswer.methodが正しくパースされていません");
  assert.strictEqual(typeof parsedData.additionalInfo, "object", "additionalInfoはオブジェクトであるべきです");
  assert.strictEqual(typeof parsedData.additionalInfo.timestamp, "string", "timestampは文字列であるべきです");
  
  console.log('✅ データ格納形式の検証テスト成功');
}

// 直接実行された場合はテストを実行
if (require.main === module) {
  runTests().catch(err => {
    console.error('テスト実行中にエラーが発生しました:', err);
    process.exit(1);
  });
}

module.exports = {
  JSONParser,
  runTests
}; 