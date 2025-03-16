/**
 * コンテキスト処理ユーティリティ
 * 
 * このファイルには、チャットインターフェースのコンテキスト情報を処理するための
 * 関数群が含まれています。主に問題文や問題IDなどの表示を改善します。
 */

/**
 * コンテキスト情報を抽出して表示用に整形する
 * 
 * @param {string} text - 処理対象のテキスト
 * @returns {Object} 処理結果のオブジェクト
 */
function extractContextInfo(text) {
  // nullや未定義の場合はそのまま返す
  if (text === null || text === undefined) {
    return {
      displayText: text,
      hasContextData: false,
      problemId: null
    };
  }

  // 既にフォーマット済みのテキストかどうかをチェック
  if (text.match(/【問題ID:\s*([^】]+)】/)) {
    return processAlreadyFormattedText(text);
  }

  // コンテキスト情報の抽出（正規表現を修正して厳密なJSON抽出を実現）
  const contextMatch = text.match(/^#context:\s*(\{.+?\})(?:\s*\n)([\s\S]*)/s);
  if (!contextMatch) {
    // コンテキスト情報がない場合はそのまま返す
    return {
      displayText: text,
      hasContextData: false,
      problemId: null
    };
  }

  try {
    // コンテキスト情報をJSONとしてパース
    const contextData = JSON.parse(contextMatch[1]);
    const userText = trimLeadingEmptyLines(contextMatch[2]);

    // コンテキストデータから必要な情報を抽出
    const problemId = contextData.problemId || null;
    const category = contextData.category || '';
    const problemText = contextData.question || '';

    // 表示用テキストを整形
    let displayText = '';
    
    // 問題ID・カテゴリヘッダーの追加
    if (problemId) {
      displayText += `【問題ID: ${problemId}】`;
      if (category) {
        displayText += `【カテゴリ: ${category}】`;
      }
      displayText += '\n';
    }

    // 問題文の追加
    if (problemText) {
      displayText += problemText + '\n\n';
    }

    // ユーザーテキストの追加
    displayText += userText;

    return {
      displayText: displayText,
      hasContextData: true,
      problemId: problemId,
      category: category,
      problemText: problemText,
      userQuestion: userText
    };
  } catch (e) {
    // JSONパースに失敗した場合
    console.error('コンテキスト情報のパースに失敗:', e);
    return {
      displayText: contextMatch[2], // コンテキスト部分を除いたテキスト
      hasContextData: false,
      problemId: null
    };
  }
}

/**
 * 既にフォーマット済みのテキストを処理する
 * 
 * @param {string} text - 処理対象のテキスト
 * @returns {Object} 処理結果のオブジェクト
 */
function processAlreadyFormattedText(text) {
  // 問題IDを抽出
  const idMatch = text.match(/【問題ID:\s*([^】]+)】/);
  const problemId = idMatch ? idMatch[1] : null;

  // カテゴリを抽出
  const categoryMatch = text.match(/【カテゴリ:\s*([^】]+)】/);
  const category = categoryMatch ? categoryMatch[1] : null;

  return {
    displayText: text,
    hasContextData: true,
    problemId: problemId,
    category: category
  };
}

/**
 * テキストの先頭の空行を削除する
 * 
 * @param {string} text - 処理対象のテキスト
 * @returns {string} 空行を削除したテキスト
 */
function trimLeadingEmptyLines(text) {
  if (!text) return text;
  return text.replace(/^\s*\n+/, '');
}

/**
 * チャットメッセージを処理して表示用に整形する
 * 
 * @param {Object} message - メッセージオブジェクト
 * @returns {Object} 処理したメッセージオブジェクト
 */
function processMessageText(message) {
  if (!message || !message.text) return message;
  
  // コンテキスト情報を抽出して表示用に整形
  const contextInfo = extractContextInfo(message.text);
  
  // メッセージオブジェクトを複製して表示用テキストを設定
  const processedMessage = { ...message };
  processedMessage.displayText = contextInfo.displayText;
  
  // 問題IDが抽出できた場合は追加
  if (contextInfo.problemId) {
    processedMessage.problemId = contextInfo.problemId;
  }
  
  return processedMessage;
}

// ブラウザ環境用に関数をグローバルスコープに公開
window.extractContextInfo = extractContextInfo;
window.processMessageText = processMessageText;
window.trimLeadingEmptyLines = trimLeadingEmptyLines; 