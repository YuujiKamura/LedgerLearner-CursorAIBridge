/**
 * chat_history.jsonの検証と修正を行うためのスクリプト
 * 
 * このスクリプトは以下の項目をチェックします：
 * 1. フィールド名の一貫性（id vs questionId）
 * 2. 未来の日付が使用されていないか
 * 3. ステータスフィールドの一貫性
 * 4. 構文エラーがないか
 * 
 * 使用方法:
 * node tests/chat_history_validator.js [--fix]
 * --fix オプションを指定すると、問題を自動修正します
 */

const fs = require('fs').promises;
const path = require('path');

// 設定
const CHAT_HISTORY_FILE = path.join(__dirname, '..', 'data', 'chat_history.json');
const BACKUP_FILE = path.join(__dirname, '..', 'data', 'chat_history.json.backup');

// エラーカウンター
let errorCount = 0;

async function validateChatHistory(shouldFix = false) {
  console.log('chat_history.jsonの検証を開始します...');
  
  // ファイルの読み込み
  let chatHistory;
  try {
    const data = await fs.readFile(CHAT_HISTORY_FILE, 'utf8');
    try {
      chatHistory = JSON.parse(data);
      console.log(`✅ JSONの構文は正常です。エントリ数: ${chatHistory.length}`);
    } catch (e) {
      console.error(`❌ JSONの構文エラーが見つかりました: ${e.message}`);
      errorCount++;
      return false;
    }
  } catch (e) {
    console.error(`❌ ファイルの読み込みに失敗しました: ${e.message}`);
    errorCount++;
    return false;
  }
  
  // バックアップの作成（修正モードの場合）
  if (shouldFix) {
    try {
      await fs.writeFile(BACKUP_FILE, JSON.stringify(chatHistory, null, 2), 'utf8');
      console.log(`✅ バックアップを作成しました: ${BACKUP_FILE}`);
    } catch (e) {
      console.error(`❌ バックアップの作成に失敗しました: ${e.message}`);
      return false;
    }
  }
  
  let modified = false;
  
  // 1. フィールド名の一貫性チェック
  const idInconsistencies = [];
  chatHistory.forEach((entry, index) => {
    const hasId = 'id' in entry;
    const hasQuestionId = 'questionId' in entry;
    
    if (hasId && !hasQuestionId) {
      idInconsistencies.push({ index, type: 'id_only' });
      if (shouldFix) {
        entry.questionId = entry.id;
        delete entry.id;
        modified = true;
      }
    } else if (!hasId && hasQuestionId) {
      // これは正常なケース
    } else if (hasId && hasQuestionId) {
      idInconsistencies.push({ index, type: 'both_ids' });
      if (shouldFix) {
        // idを保持し、questionIdを削除
        delete entry.questionId;
        modified = true;
      }
    } else if (!hasId && !hasQuestionId) {
      idInconsistencies.push({ index, type: 'no_id' });
      if (shouldFix) {
        // タイムスタンプをIDとして使用
        entry.questionId = entry.timestamp ? new Date(entry.timestamp).getTime().toString() : Date.now().toString();
        modified = true;
      }
    }
  });
  
  if (idInconsistencies.length > 0) {
    console.error(`❌ ${idInconsistencies.length}件のIDフィールドの不整合が見つかりました`);
    idInconsistencies.forEach(inconsistency => {
      console.error(`  - インデックス ${inconsistency.index}: ${inconsistency.type}`);
    });
    errorCount++;
  } else {
    console.log('✅ IDフィールドの一貫性は保たれています');
  }
  
  // 2. 未来の日付チェック
  const now = new Date();
  const futureTimestamps = [];
  
  chatHistory.forEach((entry, index) => {
    if (entry.timestamp && new Date(entry.timestamp) > now) {
      futureTimestamps.push({ index, timestamp: entry.timestamp });
      if (shouldFix) {
        // 現在の日時に修正
        entry.timestamp = now.toISOString();
        modified = true;
      }
    }
    
    if (entry.answeredAt && new Date(entry.answeredAt) > now) {
      futureTimestamps.push({ index, answeredAt: entry.answeredAt });
      if (shouldFix) {
        // 現在の日時に修正
        entry.answeredAt = now.toISOString();
        modified = true;
      }
    }
  });
  
  if (futureTimestamps.length > 0) {
    console.error(`❌ ${futureTimestamps.length}件の未来の日付が見つかりました`);
    futureTimestamps.slice(0, 5).forEach(item => {
      console.error(`  - インデックス ${item.index}: ${item.timestamp || item.answeredAt}`);
    });
    if (futureTimestamps.length > 5) {
      console.error(`  - 他 ${futureTimestamps.length - 5}件...`);
    }
    errorCount++;
  } else {
    console.log('✅ すべての日付は現在以前の値です');
  }
  
  // 3. ステータスフィールドの一貫性チェック
  const statusCounts = {};
  const invalidStatuses = [];
  
  chatHistory.forEach((entry, index) => {
    const status = entry.status;
    statusCounts[status] = (statusCounts[status] || 0) + 1;
    
    // 有効なステータスかチェック
    if (status !== 'answered' && status !== 'completed' && status !== 'pending') {
      invalidStatuses.push({ index, status });
    }
    
    // ステータスの統一（修正モードの場合）
    if (shouldFix && status === 'completed') {
      entry.status = 'answered';
      modified = true;
    }
  });
  
  console.log('ステータス分布:');
  Object.keys(statusCounts).forEach(status => {
    console.log(`  - ${status}: ${statusCounts[status]}件`);
  });
  
  if (invalidStatuses.length > 0) {
    console.error(`❌ ${invalidStatuses.length}件の無効なステータスが見つかりました`);
    invalidStatuses.forEach(item => {
      console.error(`  - インデックス ${item.index}: "${item.status}"`);
    });
    errorCount++;
  }
  
  if (Object.keys(statusCounts).length > 2) {
    console.warn(`⚠️ 複数のステータスタイプが使用されています: ${Object.keys(statusCounts).join(', ')}`);
  } else {
    console.log('✅ ステータスの一貫性は保たれています');
  }
  
  // 修正して保存（修正モードの場合）
  if (shouldFix && modified) {
    try {
      await fs.writeFile(CHAT_HISTORY_FILE, JSON.stringify(chatHistory, null, 2), 'utf8');
      console.log('✅ 修正を保存しました');
    } catch (e) {
      console.error(`❌ 修正の保存に失敗しました: ${e.message}`);
      return false;
    }
  }
  
  return errorCount === 0;
}

// メイン処理
async function main() {
  const args = process.argv.slice(2);
  const shouldFix = args.includes('--fix');
  
  if (shouldFix) {
    console.log('修正モードで実行しています。検出された問題は自動的に修正されます。');
  } else {
    console.log('検証モードで実行しています。問題の自動修正を行うには --fix オプションを指定してください。');
  }
  
  const isValid = await validateChatHistory(shouldFix);
  
  if (isValid) {
    console.log('🎉 検証が完了しました。問題は見つかりませんでした。');
    process.exit(0);
  } else {
    console.error(`❌ 検証が完了しました。${errorCount}件の問題が見つかりました。`);
    
    if (!shouldFix) {
      console.log('問題を修正するには、次のコマンドを実行してください:');
      console.log('  node tests/chat_history_validator.js --fix');
    }
    
    process.exit(1);
  }
}

// スクリプトが直接実行された場合のみ実行
if (require.main === module) {
  main().catch(err => {
    console.error('予期しないエラーが発生しました:', err);
    process.exit(1);
  });
}

module.exports = { validateChatHistory }; 