/**
 * チャット履歴の表示に関するバリデーションと問題検出のためのテストスクリプト
 * 
 * このスクリプトは以下の項目をチェックします：
 * 1. チャット履歴の表示が正しく機能しているか
 * 2. コンテキスト情報が適切に処理されているか
 * 3. メタデータ（時間、ステータスなど）が表示されているか
 * 
 * 使用方法:
 * node tests/display_validator.js
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs').promises;

// テスト結果保存用
const TEST_RESULTS_FILE = path.join(__dirname, '..', 'data', 'display_test_results.json');

// テスト実行
async function validateDisplays() {
  console.log('チャット履歴の表示テストを開始します...');
  
  // Puppeteerを起動してブラウザを開く
  const browser = await puppeteer.launch({
    headless: false, // テスト実行を可視化するため
    args: ['--window-size=1280,800'],
    defaultViewport: {
      width: 1280,
      height: 800
    }
  });
  
  const page = await browser.newPage();
  const testResults = {
    timestamp: new Date().toISOString(),
    passed: 0,
    failed: 0,
    errors: [],
    warnings: [],
    tests: []
  };
  
  try {
    // テスト1: ページが読み込めるか
    await testPageLoad(page, testResults);
    
    // テスト2: チャット履歴タブが表示されるか
    await testHistoryTab(page, testResults);
    
    // テスト3: チャット履歴のアイテムが表示されるか
    await testChatItems(page, testResults);
    
    // テスト4: コンテキスト情報が正しく処理されているか
    await testContextProcessing(page, testResults);
    
    // テスト5: メタ情報が表示されているか
    await testMetadataDisplay(page, testResults);
    
    // 結果をコンソールに出力
    console.log('\n=== テスト結果のサマリー ===');
    console.log(`合格: ${testResults.passed}`);
    console.log(`不合格: ${testResults.failed}`);
    
    if (testResults.errors.length > 0) {
      console.log('\n=== エラー ===');
      testResults.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
    }
    
    if (testResults.warnings.length > 0) {
      console.log('\n=== 警告 ===');
      testResults.warnings.forEach((warning, index) => {
        console.log(`${index + 1}. ${warning}`);
      });
    }
    
    // 結果をファイルに保存
    await fs.writeFile(
      TEST_RESULTS_FILE, 
      JSON.stringify(testResults, null, 2),
      'utf8'
    );
    
    console.log(`\nテスト結果をファイルに保存しました: ${TEST_RESULTS_FILE}`);
  } catch (error) {
    console.error('テスト実行中にエラーが発生しました:', error);
    testResults.errors.push(`テスト実行中にエラーが発生: ${error.message}`);
    
    // エラーが発生した場合も結果を保存
    await fs.writeFile(
      TEST_RESULTS_FILE, 
      JSON.stringify(testResults, null, 2),
      'utf8'
    );
  } finally {
    // スクリーンショットを撮影
    await page.screenshot({ 
      path: path.join(__dirname, '..', 'data', 'display_test_screenshot.png'),
      fullPage: true
    });
    
    // ブラウザを閉じる
    await browser.close();
  }
}

// テスト1: ページ読み込みテスト
async function testPageLoad(page, testResults) {
  const testName = 'ページ読み込みテスト';
  console.log(`実行中: ${testName}`);
  
  try {
    // ローカルサーバーのURLにアクセス
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
    
    // ページタイトルを取得して確認
    const title = await page.title();
    
    if (title && title.includes('簿記')) {
      testResults.passed++;
      testResults.tests.push({
        name: testName,
        result: 'PASS',
        details: `ページが正常に読み込まれました。タイトル: ${title}`
      });
      console.log(`✅ ${testName}: 合格`);
    } else {
      testResults.failed++;
      testResults.tests.push({
        name: testName,
        result: 'FAIL',
        details: `ページのタイトルが期待と異なります: ${title}`
      });
      console.log(`❌ ${testName}: 不合格 - ページのタイトルが期待と異なります: ${title}`);
    }
  } catch (error) {
    testResults.failed++;
    testResults.errors.push(`${testName}: ${error.message}`);
    testResults.tests.push({
      name: testName,
      result: 'ERROR',
      details: error.message
    });
    console.log(`❌ ${testName}: エラー - ${error.message}`);
  }
}

// テスト2: 履歴タブテスト
async function testHistoryTab(page, testResults) {
  const testName = '履歴タブ表示テスト';
  console.log(`実行中: ${testName}`);
  
  try {
    // 履歴タブをクリック
    await page.click('.tab-btn[data-tab="history"]');
    
    // タブがアクティブになったか確認
    const isTabActive = await page.evaluate(() => {
      const tab = document.querySelector('.tab-btn[data-tab="history"]');
      return tab && tab.classList.contains('active');
    });
    
    if (isTabActive) {
      testResults.passed++;
      testResults.tests.push({
        name: testName,
        result: 'PASS',
        details: '履歴タブが正常に表示されました'
      });
      console.log(`✅ ${testName}: 合格`);
    } else {
      testResults.failed++;
      testResults.tests.push({
        name: testName,
        result: 'FAIL',
        details: '履歴タブがアクティブになりませんでした'
      });
      console.log(`❌ ${testName}: 不合格 - 履歴タブがアクティブになりませんでした`);
    }
  } catch (error) {
    testResults.failed++;
    testResults.errors.push(`${testName}: ${error.message}`);
    testResults.tests.push({
      name: testName,
      result: 'ERROR',
      details: error.message
    });
    console.log(`❌ ${testName}: エラー - ${error.message}`);
  }
}

// テスト3: チャットアイテムテスト
async function testChatItems(page, testResults) {
  const testName = 'チャット履歴アイテム表示テスト';
  console.log(`実行中: ${testName}`);
  
  try {
    // チャットアイテムの数を取得
    const chatItemCount = await page.evaluate(() => {
      return document.querySelectorAll('.chat-item').length;
    });
    
    if (chatItemCount > 0) {
      testResults.passed++;
      testResults.tests.push({
        name: testName,
        result: 'PASS',
        details: `${chatItemCount}件のチャットアイテムが表示されています`
      });
      console.log(`✅ ${testName}: 合格 - ${chatItemCount}件のチャットアイテムが表示されています`);
    } else {
      testResults.failed++;
      testResults.tests.push({
        name: testName,
        result: 'FAIL',
        details: 'チャットアイテムが表示されていません'
      });
      console.log(`❌ ${testName}: 不合格 - チャットアイテムが表示されていません`);
    }
  } catch (error) {
    testResults.failed++;
    testResults.errors.push(`${testName}: ${error.message}`);
    testResults.tests.push({
      name: testName,
      result: 'ERROR',
      details: error.message
    });
    console.log(`❌ ${testName}: エラー - ${error.message}`);
  }
}

// テスト4: コンテキスト処理テスト
async function testContextProcessing(page, testResults) {
  const testName = 'コンテキスト情報処理テスト';
  console.log(`実行中: ${testName}`);
  
  try {
    // コンテキスト情報が含まれるかどうかを確認
    const contextDetection = await page.evaluate(() => {
      const chatContents = Array.from(document.querySelectorAll('.chat-content'));
      const contextFound = chatContents.some(content => 
        content.textContent && content.textContent.includes('#context:')
      );
      return {
        contextFound,
        sampleContent: chatContents.length > 0 ? chatContents[0].textContent : null
      };
    });
    
    if (!contextDetection.contextFound) {
      testResults.passed++;
      testResults.tests.push({
        name: testName,
        result: 'PASS',
        details: 'コンテキスト情報が適切に除去されています'
      });
      console.log(`✅ ${testName}: 合格 - コンテキスト情報が適切に除去されています`);
    } else {
      testResults.failed++;
      testResults.tests.push({
        name: testName,
        result: 'FAIL',
        details: 'コンテキスト情報がユーザーに表示されています',
        sample: contextDetection.sampleContent
      });
      console.log(`❌ ${testName}: 不合格 - コンテキスト情報がユーザーに表示されています`);
    }
  } catch (error) {
    testResults.failed++;
    testResults.errors.push(`${testName}: ${error.message}`);
    testResults.tests.push({
      name: testName,
      result: 'ERROR',
      details: error.message
    });
    console.log(`❌ ${testName}: エラー - ${error.message}`);
  }
}

// テスト5: メタデータ表示テスト
async function testMetadataDisplay(page, testResults) {
  const testName = 'メタデータ表示テスト';
  console.log(`実行中: ${testName}`);
  
  try {
    // メタデータの表示を確認
    const metadataCheck = await page.evaluate(() => {
      const metaInfoElements = document.querySelectorAll('.chat-meta-info');
      const idSpans = document.querySelectorAll('.chat-id');
      const timeSpans = document.querySelectorAll('.chat-time');
      const statusSpans = document.querySelectorAll('.chat-status');
      
      return {
        metaInfoCount: metaInfoElements.length,
        idCount: idSpans.length,
        timeCount: timeSpans.length,
        statusCount: statusSpans.length,
        hasSamples: idSpans.length > 0,
        idSample: idSpans.length > 0 ? idSpans[0].textContent : null,
        timeSample: timeSpans.length > 0 ? timeSpans[0].textContent : null,
        statusSample: statusSpans.length > 0 ? statusSpans[0].textContent : null
      };
    });
    
    if (metadataCheck.metaInfoCount > 0 && 
        metadataCheck.idCount > 0 && 
        metadataCheck.timeCount > 0 && 
        metadataCheck.statusCount > 0) {
      testResults.passed++;
      testResults.tests.push({
        name: testName,
        result: 'PASS',
        details: `メタデータが表示されています (メタ情報: ${metadataCheck.metaInfoCount}, ID: ${metadataCheck.idCount}, 時間: ${metadataCheck.timeCount}, ステータス: ${metadataCheck.statusCount})`,
        samples: {
          id: metadataCheck.idSample,
          time: metadataCheck.timeSample,
          status: metadataCheck.statusSample
        }
      });
      console.log(`✅ ${testName}: 合格 - メタデータが表示されています`);
      console.log(`   ID例: ${metadataCheck.idSample}`);
      console.log(`   時間例: ${metadataCheck.timeSample}`);
      console.log(`   ステータス例: ${metadataCheck.statusSample}`);
    } else {
      testResults.failed++;
      testResults.tests.push({
        name: testName,
        result: 'FAIL',
        details: `一部または全てのメタデータが表示されていません (メタ情報: ${metadataCheck.metaInfoCount}, ID: ${metadataCheck.idCount}, 時間: ${metadataCheck.timeCount}, ステータス: ${metadataCheck.statusCount})`
      });
      console.log(`❌ ${testName}: 不合格 - 一部または全てのメタデータが表示されていません`);
    }
  } catch (error) {
    testResults.failed++;
    testResults.errors.push(`${testName}: ${error.message}`);
    testResults.tests.push({
      name: testName,
      result: 'ERROR',
      details: error.message
    });
    console.log(`❌ ${testName}: エラー - ${error.message}`);
  }
}

// スクリプトが直接実行された場合に実行
if (require.main === module) {
  validateDisplays().catch(err => {
    console.error('テスト実行中の重大なエラー:', err);
    process.exit(1);
  });
}

module.exports = { validateDisplays }; 