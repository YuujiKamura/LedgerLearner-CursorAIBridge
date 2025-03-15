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
const assert = require('assert');

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
    // テスト用のデータを準備
    const testDataPath = path.join(__dirname, '../data/chat_history_test.json');
    
    // 既存のチャット履歴をバックアップ
    const originalDataPath = path.join(__dirname, '../data/chat_history.json');
    const backupPath = path.join(__dirname, '../data/chat_history.json.test_backup');
    
    if (fs.existsSync(originalDataPath)) {
      fs.copyFileSync(originalDataPath, backupPath);
      console.log('既存のチャット履歴をバックアップしました');
    }
    
    // テスト用データの作成
    const testData = [
      {
        "questionId": "test-question-1",
        "question": "#context: {\"problemId\":\"test-problem-1\",\"category\":\"テストカテゴリ\",\"question\":\"テスト質問です。\",\"userAnswer\":{\"method\":\"未選択\",\"debit\":\"テスト\",\"credit\":\"テスト\"}}\n質問内容：テストです",
        "answer": "テスト回答です。",
        "timestamp": new Date().toISOString(),
        "answeredAt": new Date().toISOString(),
        "status": "answered"
      },
      {
        "questionId": "test-question-2",
        "question": "通常の質問（コンテキストなし）",
        "answer": "通常の回答",
        "timestamp": new Date().toISOString(),
        "answeredAt": new Date().toISOString(),
        "status": "completed"
      },
      {
        "questionId": "test-question-3",
        "question": "#context: {\"problemId\":\"test-problem-3\",\"category\":\"テストカテゴリ3\",\"question\":\"テスト質問3です。\",\"userAnswer\":{\"method\":\"未選択\",\"debit\":\"テスト3\",\"credit\":\"テスト3\"}}\n【問題ID: test-problem-3】【カテゴリ: テストカテゴリ3】\nテスト質問3です。\n\n質問内容：問題文が含まれている場合のテスト",
        "timestamp": new Date().toISOString(),
        "status": "pending"
      }
    ];
    
    // テスト用データを書き込み
    fs.writeFileSync(testDataPath, JSON.stringify(testData, null, 2));
    fs.copyFileSync(testDataPath, originalDataPath);
    console.log('テスト用データを設定しました');
    
    // ページへアクセス
    await page.goto('http://localhost:3000', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    console.log('ページに接続しました');
    
    // 履歴タブに切り替え
    await page.click('button.tab-btn[data-tab="history"]');
    console.log('履歴タブに切り替えました');
    
    // チャット履歴が読み込まれるのを待つ
    await page.waitForSelector('.chat-item', { timeout: 10000 });
    console.log('チャット履歴を検出しました');
    
    // テスト1: #contextありのケース（問題文が含まれていない場合）
    const testCase1 = await page.evaluate(() => {
      const item = document.querySelector('#chat-item-test-question-1');
      if (!item) return null;
      
      const contentText = item.querySelector('.chat-bubble.user .chat-content').innerHTML;
      const metaInfoExists = !!item.querySelector('.chat-meta-info');
      const hasContextTag = contentText.includes('#context');
      const hasProblemId = contentText.includes('【問題ID: test-problem-1】');
      const hasCategory = contentText.includes('【カテゴリ: テストカテゴリ】');
      const hasQuestion = contentText.includes('テスト質問です。');
      
      return {
        contentText,
        metaInfoExists,
        hasContextTag,
        hasProblemId,
        hasCategory,
        hasQuestion
      };
    });
    
    console.log('テストケース1の結果:', testCase1);
    
    // テスト2: コンテキストなしのケース
    const testCase2 = await page.evaluate(() => {
      const item = document.querySelector('#chat-item-test-question-2');
      if (!item) return null;
      
      const contentText = item.querySelector('.chat-bubble.user .chat-content').innerHTML;
      const isSimpleText = contentText === '通常の質問（コンテキストなし）'.replace(/\n/g, '<br>');
      
      return {
        contentText,
        isSimpleText
      };
    });
    
    console.log('テストケース2の結果:', testCase2);
    
    // テスト3: #contextありで問題文も含まれている場合
    const testCase3 = await page.evaluate(() => {
      const item = document.querySelector('#chat-item-test-question-3');
      if (!item) return null;
      
      const contentText = item.querySelector('.chat-bubble.user .chat-content').innerHTML;
      const hasContextTag = contentText.includes('#context');
      const hasDuplicatedProblemId = (contentText.match(/【問題ID: test-problem-3】/g) || []).length > 1;
      
      return {
        contentText,
        hasContextTag,
        hasDuplicatedProblemId
      };
    });
    
    console.log('テストケース3の結果:', testCase3);
    
    // アサーション
    assert(testCase1 !== null, 'テストケース1のチャットアイテムが見つかりません');
    assert(!testCase1.hasContextTag, 'コンテキストタグが表示されています');
    assert(testCase1.hasProblemId, '問題IDが表示されていません');
    assert(testCase1.hasCategory, 'カテゴリが表示されていません');
    assert(testCase1.hasQuestion, '問題文が表示されていません');
    
    assert(testCase2 !== null, 'テストケース2のチャットアイテムが見つかりません');
    assert(testCase2.isSimpleText, '通常テキストが正しく表示されていません');
    
    assert(testCase3 !== null, 'テストケース3のチャットアイテムが見つかりません');
    assert(!testCase3.hasContextTag, 'コンテキストタグが表示されています');
    assert(!testCase3.hasDuplicatedProblemId, '問題IDが重複して表示されています');
    
    console.log('すべてのテストが成功しました！');
    
    // 元のデータに戻す
    if (fs.existsSync(backupPath)) {
      fs.copyFileSync(backupPath, originalDataPath);
      fs.unlinkSync(backupPath);
      console.log('元のチャット履歴に戻しました');
    }
    
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

// スクリプトが直接実行された場合に実行
if (require.main === module) {
  validateDisplays().catch(err => {
    console.error('テスト実行中の重大なエラー:', err);
    process.exit(1);
  });
}

module.exports = { validateDisplays }; 