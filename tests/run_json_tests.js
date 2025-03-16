/**
 * JSONパーサーとデータ構造テストの実行スクリプト
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

// テストモジュールのインポート
const { runTests: runParserTests } = require('./json_parser.test.js');
const { runTests: runDataStructureTests } = require('./json_data_structure.test.js');
const { runTests: runChatHistoryTests } = require('./chat_history_parser.test.js');

/**
 * すべてのテストを順番に実行
 */
async function runAllTests() {
  console.log('=== JSONパーサーとデータ格納形式のテスト実行 ===');
  console.log('開始時刻:', new Date().toLocaleString());
  console.log('----------------------------------------------');
  
  // テスト結果ディレクトリの準備
  const testResultsDir = path.join(__dirname, '..', '.test_results');
  try {
    await fs.mkdir(testResultsDir, { recursive: true });
  } catch (err) {
    if (err.code !== 'EEXIST') console.error('テスト結果ディレクトリ作成エラー:', err);
  }
  
  // 結果ファイル
  const resultFile = path.join(testResultsDir, `json_test_${Date.now()}.log`);
  
  try {
    // 1. JSONパーサーテスト
    console.log('\n1. JSONパーサーテストを実行...');
    await runParserTests();
    
    // 2. データ構造テスト
    console.log('\n2. データ構造テストを実行...');
    await runDataStructureTests();
    
    // 3. 実際のchat_history.jsonを使ったテスト
    console.log('\n3. 実際のchat_history.jsonを使ったテストを実行...');
    await runChatHistoryTests();
    
    // すべてのテストが成功
    const successMessage = '✅ すべてのJSONテストが正常に完了しました！';
    console.log('\n' + successMessage);
    
    // 結果をファイルに書き込む
    const testResults = {
      timestamp: new Date().toISOString(),
      status: 'success',
      message: successMessage
    };
    
    await fs.writeFile(resultFile, JSON.stringify(testResults, null, 2));
    return true;
    
  } catch (error) {
    // テスト失敗
    const errorMessage = `❌ テスト実行中にエラーが発生しました: ${error.message}`;
    console.error('\n' + errorMessage);
    
    // エラー情報をファイルに書き込む
    const testResults = {
      timestamp: new Date().toISOString(),
      status: 'failure',
      message: errorMessage,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      }
    };
    
    await fs.writeFile(resultFile, JSON.stringify(testResults, null, 2));
    return false;
  } finally {
    console.log('----------------------------------------------');
    console.log('終了時刻:', new Date().toLocaleString());
    console.log(`テスト結果: ${resultFile}`);
  }
}

/**
 * コマンドライン引数の処理
 */
function processArgs() {
  const args = process.argv.slice(2);
  
  // --help オプション
  if (args.includes('--help') || args.includes('-h')) {
    console.log('使用方法: node run_json_tests.js [options]');
    console.log('オプション:');
    console.log('  --help, -h     このヘルプを表示');
    console.log('  --clean        テスト前に一時ファイルをクリーンアップ');
    console.log('  --real-data    実際のchat_history.jsonのみをテスト');
    process.exit(0);
  }
  
  // --clean オプション（テスト前にテストデータディレクトリをクリーンアップ）
  if (args.includes('--clean')) {
    const testParseDir = path.join(__dirname, '..', 'test_parse');
    console.log(`テストデータをクリーンアップ: ${testParseDir}`);
    
    try {
      execSync(`rm -rf ${testParseDir}/*`);
      console.log('クリーンアップ完了');
    } catch (err) {
      console.warn('クリーンアップ中にエラーが発生しました:', err.message);
    }
  }
  
  // --real-data オプション（実際のchat_history.jsonのみをテスト）
  if (args.includes('--real-data')) {
    runChatHistoryTests().then(
      () => process.exit(0),
      err => {
        console.error('実データテスト中にエラーが発生しました:', err);
        process.exit(1);
      }
    );
    return true; // 他のテストを実行しない
  }
  
  return false; // 通常のテストフローを続行
}

// メイン処理
if (require.main === module) {
  // 特殊なオプションが処理された場合は早期リターン
  if (processArgs()) {
    return;
  }
  
  runAllTests().then(success => {
    // 終了コードを設定（テスト失敗時は1、成功時は0）
    process.exit(success ? 0 : 1);
  });
}

module.exports = { runAllTests }; 