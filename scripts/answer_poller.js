const fs = require('fs').promises;
const path = require('path');

let pollingInterval = null;

// 環境変数でファイルパスをカスタマイズできるようにする
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
// 回答データファイル
const ANSWER_FILE = process.env.ANSWER_DATA_FILE || path.join(DATA_DIR, 'answer_data.json');
// チャット履歴ファイル
const CHAT_HISTORY_FILE = process.env.CHAT_HISTORY_FILE || path.join(DATA_DIR, 'chat_history.json');

// ファイルの最終更新時刻
let lastModified = null;

// ファイルが存在するかチェックして、存在しない場合は初期データで作成する
async function ensureFileExists(filePath, initialData) {
  try {
    await fs.access(filePath);
    return true; // ファイルが存在する
  } catch (error) {
    if (error.code === 'ENOENT') {
      try {
        // ディレクトリが存在するか確認
        const dirPath = path.dirname(filePath);
        try {
          await fs.access(dirPath);
        } catch (dirError) {
          if (dirError.code === 'ENOENT') {
            // ディレクトリが存在しない場合は作成
            await fs.mkdir(dirPath, { recursive: true });
            console.log(`ディレクトリを作成しました: ${dirPath}`);
          }
        }
        
        // ファイルを作成
        await fs.writeFile(filePath, JSON.stringify(initialData, null, 2), 'utf8');
        console.log(`ファイルを作成しました: ${filePath}`);
        return true;
      } catch (createError) {
        console.error(`ファイルの作成中にエラーが発生しました: ${createError.message}`);
        return false;
      }
    }
    console.error(`ファイルの確認中にエラーが発生しました: ${error.message}`);
    return false;
  }
}

async function loadChatHistory(chatHistoryFile) {
  try {
    // ファイルが確実に存在することを確認
    await ensureFileExists(chatHistoryFile, []);
    
    const data = await fs.readFile(chatHistoryFile, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.error(`チャット履歴ファイルが見つかりません: ${chatHistoryFile}`);
      return [];
    }
    console.error(`チャット履歴の読み込み中にエラーが発生しました: ${error.message}`);
    return [];
  }
}

/**
 * チャット履歴を保存する
 * @param {string} chatHistoryFile - チャット履歴ファイルのパス
 * @param {Array} chatHistory - チャット履歴データ
 */
async function saveChatHistory(chatHistoryFile, chatHistory) {
  try {
    // ファイルに書き込む
    await fs.writeFile(chatHistoryFile, JSON.stringify(chatHistory, null, 2), 'utf8');
    console.log(`チャット履歴を ${chatHistoryFile} に保存しました`);
  } catch (error) {
    console.error(`チャット履歴の保存中にエラーが発生しました: ${error.message}`);
    throw error;
  }
}

async function loadAnswerData(answerDataFile) {
  try {
    // ファイルが確実に存在することを確認
    await ensureFileExists(answerDataFile, { answers: [] });
    
    const data = await fs.readFile(answerDataFile, 'utf8');
    const parsedData = JSON.parse(data);
    
    // 必ずanswers配列が存在することを保証
    if (!parsedData || !parsedData.answers) {
      console.log(`回答データにanswers配列がないため、空の配列を設定します: ${answerDataFile}`);
      return { answers: [] };
    }
    
    return parsedData;
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.error(`回答データファイルが見つかりません: ${answerDataFile}`);
      return { answers: [] };
    }
    console.error(`回答データの読み込み中にエラーが発生しました: ${error.message}`);
    return { answers: [] };
  }
}

/**
 * チャット履歴を更新する
 * @param {string} chatHistoryFile - チャット履歴ファイルのパス
 * @param {string} answerDataFile - 回答データファイルのパス
 * @returns {Array} - 更新されたチャット履歴
 */
async function updateChatHistory(chatHistoryFile, answerDataFile) {
  try {
    // ファイルの存在確認
    await ensureFileExists(chatHistoryFile, '[]');
    await ensureFileExists(answerDataFile, '{"answers":[]}');

    console.log(`更新時刻: ${new Date().toISOString()}`);
    
    // チャット履歴の読み込み
    const chatHistory = await loadChatHistory(chatHistoryFile);
    console.log(`チャット履歴エントリー数: ${chatHistory.length}`);
    
    // 回答データの読み込み
    const answerData = await loadAnswerData(answerDataFile);
    console.log(`回答データエントリー数: ${answerData.answers.length}`);
    
    // デバッグのためにファイルの内容をログ出力
    if (process.env.NODE_ENV === 'test') {
      console.log(`チャット履歴の内容: ${JSON.stringify(chatHistory)}`);
      console.log(`回答データの内容: ${JSON.stringify(answerData)}`);
    }
    
    // 回答データの更新チェック
    console.log(`以下の回答データの更新チェックを開始します:`);
    
    let updatedAny = false;
    
    // 回答データの各エントリーをチェック
    for (const answer of answerData.answers) {
      console.log(`回答データID: ${answer.id} の処理を開始`);
      
      // 対応する質問を検索
      const foundQuestionIndex = chatHistory.findIndex(q => q.id === answer.id);
      const foundQuestion = foundQuestionIndex >= 0 ? chatHistory[foundQuestionIndex] : null;
      
      if (!foundQuestion) {
        // 質問IDが見つからない場合は明示的にエラーをログ出力
        console.error(`質問ID: ${answer.id} が見つかりません - チャット履歴には存在しない質問IDです`);
        // テスト用のデバッグ情報も出力
        console.log(`使用中のチャット履歴ファイル: ${chatHistoryFile}`);
        console.log(`使用中の回答データファイル: ${answerDataFile}`);
        
        if (chatHistory.length > 0) {
          console.log(`存在する質問ID一覧: ${chatHistory.map(q => q.id).join(', ')}`);
        } else {
          console.log(`チャット履歴が空です`);
        }
      } else {
        // 質問が見つかった場合、回答とステータスを更新
        if (foundQuestion.status !== 'answered' || foundQuestion.answer !== answer.answer) {
          console.log(`質問ID: ${answer.id} の回答を更新します`);
          chatHistory[foundQuestionIndex] = {
            ...foundQuestion,
            answer: answer.answer,
            status: 'answered'
          };
          updatedAny = true;
          console.log(`質問ID: ${answer.id} を更新しました`);
        } else {
          console.log(`質問ID: ${answer.id} はすでに更新済みです`);
        }
      }
    }
    
    // 更新があった場合は保存
    if (updatedAny) {
      console.log(`チャット履歴を更新しました`);
      await saveChatHistory(chatHistoryFile, chatHistory);
      console.log(`チャット履歴を保存しました`);
    } else {
      console.log(`更新すべき回答がありませんでした`);
    }
    
    return chatHistory;
  } catch (error) {
    console.error(`チャット履歴の更新中にエラーが発生しました: ${error.message}`);
    console.error(error.stack);
    return [];
  }
}

// 重要な変更: startPolling関数を非同期関数に変更し、初期実行を待機できるようにする
async function startPolling(chatHistoryFile, answerDataFile, interval = 2000) {
  // 引数で指定されたファイルパスが必ず優先されるように変更
  // 引数がfalsy値の場合のみデフォルト値を使用
  const chatHistoryPath = chatHistoryFile || CHAT_HISTORY_FILE;
  const answerDataPath = answerDataFile || ANSWER_FILE;
  
  console.log(`チャット履歴ファイル ${chatHistoryPath} を使用します`);
  console.log(`回答データファイル ${answerDataPath} を使用します`);
  console.log(`回答ファイル ${answerDataPath} のポーリングを開始します...`);
  console.log(`ポーリング間隔: ${interval}ms`);

  // テスト時のファイルパス確認用
  if (process.env.NODE_ENV === 'test') {
    console.log('テスト環境で実行中:');
    console.log(`- 指定されたチャット履歴ファイルパス: ${chatHistoryFile}`);
    console.log(`- 指定された回答データファイルパス: ${answerDataFile}`);
    console.log(`- 実際に使用するチャット履歴ファイルパス: ${chatHistoryPath}`);
    console.log(`- 実際に使用する回答データファイルパス: ${answerDataPath}`);
  }

  try {
    // ファイルの存在を確認
    await ensureFileExists(chatHistoryPath, []);
    await ensureFileExists(answerDataPath, { answers: [] });
    
    // ファイルが存在することを確認したら即座に1回実行
    await updateChatHistory(chatHistoryPath, answerDataPath);
    
    // 定期的なポーリングを開始
    pollingInterval = setInterval(() => {
      updateChatHistory(chatHistoryPath, answerDataPath).catch(error => {
        console.error('定期的なポーリング中にエラーが発生しました:', error);
      });
    }, interval);
    
    // テスト環境でタイマーがブロックしないようにする
    if (pollingInterval.unref) {
      pollingInterval.unref();
    }
    
    return pollingInterval;
  } catch (error) {
    console.error('ポーリング開始中にエラーが発生しました:', error);
    throw error;
  }
}

function stopPolling() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
    console.log('ポーリングを停止しました');
    return true;
  }
  return false;
}

// ファイルの存在確認
async function checkFiles() {
  try {
    // チャット履歴ファイルの確認
    try {
      await fs.access(CHAT_HISTORY_FILE);
      console.log(`チャット履歴ファイル ${CHAT_HISTORY_FILE} が見つかりました`);
    } catch (error) {
      console.error(`チャット履歴ファイル ${CHAT_HISTORY_FILE} が見つかりません`);
      return false;
    }
    
    // 回答データファイルの確認
    try {
      await fs.access(ANSWER_FILE);
      console.log(`回答データファイル ${ANSWER_FILE} が見つかりました`);
    } catch (error) {
      console.error(`回答データファイル ${ANSWER_FILE} が見つかりません`);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('ファイル確認中にエラーが発生しました:', error);
    return false;
  }
}

// メイン処理
async function main() {
  const filesExist = await checkFiles();
  
  if (!filesExist) {
    console.error('必要なファイルが見つかりません。終了します。');
    process.exit(1);
  }
  
  // ポーリング開始
  startPolling();
}

// スクリプト実行
if (require.main === module) {
  main().catch(err => {
    console.error('エラーが発生しました:', err);
    process.exit(1);
  });
}

// テスト用にエクスポート
module.exports = {
  startPolling,
  stopPolling,
  updateChatHistory,
  loadChatHistory,
  saveChatHistory,
  loadAnswerData,
  ensureFileExists
}; 