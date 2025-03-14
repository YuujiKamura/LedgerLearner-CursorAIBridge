#!/usr/bin/env node

/**
 * 効率的なテスト実行のためのカスタムテストランナー
 * 
 * 機能：
 * 1. 一度パスしたテストを次回から実行しないモード
 * 2. 失敗したテストのうち、リストの最初のものだけに集中できる仕組み
 * 3. 失敗テストが通った後に全体のテストを再実行し、既存のグリーンテストが壊れていないか確認
 */

const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const { runCLI } = require('jest');

// テスト結果を保存するファイルのパス
const RESULTS_DIR = path.join(__dirname, '..', '.test_results');
const PASSED_TESTS_FILE = path.join(RESULTS_DIR, 'passed_tests.json');
const FAILED_TESTS_FILE = path.join(RESULTS_DIR, 'failed_tests.json');
const PROJECT_ROOT = path.join(__dirname, '..');

// カラー設定
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// 結果ディレクトリの初期化
async function initResultsDir() {
  try {
    await fs.mkdir(RESULTS_DIR, { recursive: true });
    console.log(`${colors.dim}テスト結果ディレクトリを確認しました${colors.reset}`);
  } catch (error) {
    console.error(`テスト結果ディレクトリの作成に失敗しました: ${error.message}`);
    process.exit(1);
  }
}

// テスト結果ファイルのロード
async function loadTestResults() {
  try {
    // パスしたテスト一覧を読み込み
    const passedTests = await fs.readFile(PASSED_TESTS_FILE, 'utf8')
      .then(data => JSON.parse(data))
      .catch(() => ({}));
    
    // 失敗したテスト一覧を読み込み
    const failedTests = await fs.readFile(FAILED_TESTS_FILE, 'utf8')
      .then(data => JSON.parse(data))
      .catch(() => ([]));
    
    return { passedTests, failedTests };
  } catch (error) {
    console.log(`${colors.yellow}テスト結果ファイルの読み込みに失敗しました。新規作成します。${colors.reset}`);
    return { passedTests: {}, failedTests: [] };
  }
}

// テスト結果の保存
async function saveTestResults(passedTests, failedTests) {
  try {
    await fs.writeFile(PASSED_TESTS_FILE, JSON.stringify(passedTests, null, 2), 'utf8');
    await fs.writeFile(FAILED_TESTS_FILE, JSON.stringify(failedTests, null, 2), 'utf8');
    console.log(`${colors.dim}テスト結果を保存しました${colors.reset}`);
  } catch (error) {
    console.error(`テスト結果の保存に失敗しました: ${error.message}`);
  }
}

// Jestを直接実行する関数
async function runTests(testFiles, options = {}) {
  return new Promise(async (resolve) => {
    console.log(`${colors.blue}テストを実行します: ${testFiles.join(' ')}${colors.reset}`);

    const jestConfig = {
      rootDir: PROJECT_ROOT,
      forceExit: true,
      detectOpenHandles: true,
      verbose: true
    };

    if (options.testNamePattern) {
      jestConfig.testNamePattern = options.testNamePattern;
    }

    try {
      process.env.NODE_ENV = 'test';
      const { results } = await runCLI(jestConfig, [PROJECT_ROOT]);
      resolve(results.success);
    } catch (error) {
      console.error(`テスト実行中にエラーが発生しました: ${error.message}`);
      resolve(false);
    }
  });
}

// Jestを使ってテスト結果を取得する関数
async function getTestResults(testFiles) {
  try {
    const jestConfig = {
      rootDir: PROJECT_ROOT,
      json: true,
      forceExit: true,
      silent: true
    };

    process.env.NODE_ENV = 'test';
    const { results } = await runCLI(jestConfig, [PROJECT_ROOT]);
    
    // パスしたテストと失敗したテストを分ける
    const passedTests = {};
    const failedTests = [];
    
    results.testResults.forEach(fileResult => {
      const filePath = fileResult.testFilePath;
      const relativePath = path.relative(PROJECT_ROOT, filePath);
      
      fileResult.testResults.forEach(testResult => {
        const fullName = testResult.ancestorTitles.concat(testResult.title).join(' > ');
        
        if (testResult.status === 'passed') {
          if (!passedTests[relativePath]) {
            passedTests[relativePath] = [];
          }
          passedTests[relativePath].push(fullName);
        } else if (testResult.status === 'failed') {
          failedTests.push({
            file: relativePath,
            name: fullName,
            failureMessages: testResult.failureMessages
          });
        }
      });
    });
    
    return { passedTests, failedTests };
  } catch (error) {
    console.error(`テスト結果の取得に失敗しました: ${error.message}`);
    return { passedTests: {}, failedTests: [] };
  }
}

// テストファイルの一覧を取得
async function getAllTestFiles() {
  try {
    const testDir = path.join(PROJECT_ROOT, 'tests');
    const files = await fs.readdir(testDir);
    return files
      .filter(file => file.endsWith('.test.js'))
      .map(file => path.join('tests', file));
  } catch (error) {
    console.error(`テストファイルの一覧取得に失敗しました: ${error.message}`);
    return [];
  }
}

// メイン関数
async function main() {
  const args = process.argv.slice(2);
  const mode = args[0] || 'focus';
  const specificTest = args[1];
  
  await initResultsDir();
  const { passedTests, failedTests } = await loadTestResults();
  
  // 実行モードによって処理を分岐
  switch (mode) {
    case 'reset':
      // テスト結果をリセット
      await saveTestResults({}, []);
      console.log(`${colors.green}テスト結果をリセットしました${colors.reset}`);
      break;
      
    case 'all':
      // すべてのテストを実行
      console.log(`${colors.bright}すべてのテストを実行します${colors.reset}`);
      const allTestFiles = await getAllTestFiles();
      const allResults = await runTests(allTestFiles);
      
      if (allResults) {
        console.log(`${colors.green}すべてのテストがパスしました！${colors.reset}`);
      } else {
        console.log(`${colors.red}テストが失敗しました。'npm run test:focus' で失敗したテストに集中してください。${colors.reset}`);
      }
      
      // 結果を保存
      const newResults = await getTestResults(allTestFiles);
      await saveTestResults(newResults.passedTests, newResults.failedTests);
      break;
      
    case 'only-failed':
      // 失敗したテストのみ実行
      if (failedTests.length === 0) {
        console.log(`${colors.yellow}失敗したテストはありません。すべて通過しているか、まだテストが実行されていません。${colors.reset}`);
        console.log(`${colors.yellow}'npm run test:all' を実行してテストを初期化してください。${colors.reset}`);
        break;
      }
      
      const uniqueFailedFiles = [...new Set(failedTests.map(test => test.file))];
      console.log(`${colors.bright}失敗した ${uniqueFailedFiles.length} ファイルのテストを実行します${colors.reset}`);
      
      const failedResults = await runTests(uniqueFailedFiles);
      
      if (failedResults) {
        console.log(`${colors.green}すべての失敗テストがパスしました！全体テストを実行します...${colors.reset}`);
        // 失敗テストがパスしたら全体テストを実行して確認
        const verifyTestFiles = await getAllTestFiles();
        const verifyResults = await runTests(verifyTestFiles);
        
        if (verifyResults) {
          console.log(`${colors.green}おめでとうございます！すべてのテストがパスしました！${colors.reset}`);
          // 結果を更新
          const verifyNewResults = await getTestResults(verifyTestFiles);
          await saveTestResults(verifyNewResults.passedTests, []);
        } else {
          console.log(`${colors.red}失敗テストは修正されましたが、他のテストが失敗するようになりました。${colors.reset}`);
          console.log(`${colors.red}修正を見直す必要があります。${colors.reset}`);
          // 新しい結果を取得して保存
          const verifyNewResults = await getTestResults(verifyTestFiles);
          await saveTestResults(verifyNewResults.passedTests, verifyNewResults.failedTests);
        }
      } else {
        console.log(`${colors.red}失敗テストがまだ失敗しています。${colors.reset}`);
        // 結果を更新
        const failedNewResults = await getTestResults(uniqueFailedFiles);
        // 既存のパスしたテストは保持しつつ、失敗テストを更新
        await saveTestResults(passedTests, failedNewResults.failedTests);
      }
      break;
      
    case 'focus':
    default:
      // 最初の失敗テストに集中
      if (failedTests.length === 0) {
        console.log(`${colors.yellow}失敗したテストはありません。すべて通過しているか、まだテストが実行されていません。${colors.reset}`);
        console.log(`${colors.yellow}'npm run test:all' を実行してテストを初期化してください。${colors.reset}`);
        break;
      }
      
      const focusTest = specificTest ? failedTests.find(t => t.file.includes(specificTest) || t.name.includes(specificTest)) : failedTests[0];
      
      if (!focusTest) {
        console.log(`${colors.yellow}指定したテスト "${specificTest}" は見つかりませんでした。${colors.reset}`);
        break;
      }
      
      console.log(`${colors.bright}集中テスト: ${focusTest.file} - ${focusTest.name}${colors.reset}`);
      console.log(`${colors.yellow}失敗メッセージ:${colors.reset}`);
      focusTest.failureMessages.forEach(msg => {
        console.log(`${colors.red}${msg}${colors.reset}`);
      });
      
      // 特定のテストに絞って実行
      const focusResult = await runTests([focusTest.file], { testNamePattern: focusTest.name });
      
      if (focusResult) {
        console.log(`${colors.green}集中テストがパスしました！残りの失敗テストを実行します...${colors.reset}`);
        
        // 残りの失敗テストを実行
        const remainingFailedTests = failedTests.filter(t => t !== focusTest);
        
        if (remainingFailedTests.length > 0) {
          const remainingFiles = [...new Set(remainingFailedTests.map(t => t.file))];
          console.log(`${colors.yellow}残り ${remainingFailedTests.length} 件の失敗テストがあります${colors.reset}`);
          
          // 残りのテストも一旦実行
          await runTests(remainingFiles);
          console.log(`${colors.yellow}次は 'npm run test:only-failed' を実行して残りのテストに取り組んでください${colors.reset}`);
        } else {
          console.log(`${colors.green}すべての失敗テストがパスしました！全体テストを実行します...${colors.reset}`);
          
          // 全体テストで確認
          const focusVerifyFiles = await getAllTestFiles();
          const verifyResults = await runTests(focusVerifyFiles);
          
          if (verifyResults) {
            console.log(`${colors.green}おめでとうございます！すべてのテストがパスしました！${colors.reset}`);
            // 結果を更新
            const focusVerifyResults = await getTestResults(focusVerifyFiles);
            await saveTestResults(focusVerifyResults.passedTests, []);
          } else {
            console.log(`${colors.red}失敗テストは修正されましたが、他のテストが失敗するようになりました。${colors.reset}`);
            console.log(`${colors.red}修正を見直す必要があります。${colors.reset}`);
            // 新しい結果を取得して保存
            const focusVerifyResults = await getTestResults(focusVerifyFiles);
            await saveTestResults(focusVerifyResults.passedTests, focusVerifyResults.failedTests);
          }
        }
      } else {
        console.log(`${colors.red}集中テストがまだ失敗しています。${colors.reset}`);
      }
      
      // 最新の結果を取得して保存
      const finalTestFiles = await getAllTestFiles();
      const finalResults = await getTestResults(finalTestFiles);
      await saveTestResults(finalResults.passedTests, finalResults.failedTests);
      break;
  }
}

// スクリプト実行
main().catch(error => {
  console.error(`エラーが発生しました: ${error.message}`);
  process.exit(1);
}); 