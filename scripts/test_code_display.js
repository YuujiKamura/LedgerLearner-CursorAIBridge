const fs = require('fs').promises;
const path = require('path');

const CHAT_HISTORY_FILE = path.join(__dirname, '..', 'data', 'chat_history.json');

async function testCodeDisplay() {
  try {
    // 現在の時刻からIDを生成
    const newId = Date.now().toString();
    
    // チャット履歴データの読み込み
    const chatHistoryRaw = await fs.readFile(CHAT_HISTORY_FILE, 'utf8');
    const chatHistory = JSON.parse(chatHistoryRaw);
    
    // テスト用の回答を作成
    const testAnswer = {
      id: newId,
      question: "コードブロックを回答に含めるときは、それなりの囲い方をすれば正常に表示されるのか？",
      timestamp: new Date().toISOString(),
      status: "answered",
      answer: "はい、コードブロックを回答に含める場合は、適切な方法で囲むことで正常に表示できます。以下に例を示します：\n\n1. **単純なコードブロックの例**：\n\n```\nconsole.log('Hello, World!');\n```\n\n2. **言語指定付きのコードブロックの例**：\n\n```javascript\n// JavaScriptコードの例\nfunction greet(name) {\n  return `こんにちは、${name}さん！`;\n}\n\nconsole.log(greet('ユーザー'));\n```\n\n3. **HTMLコードの例**：\n\n```html\n<div class=\"container\">\n  <h1>タイトル</h1>\n  <p>段落のテキスト</p>\n</div>\n```\n\nコードブロックをJSONに格納する際は、特殊文字（バッククォート、改行など）が正しくエスケープされていることが重要です。サーバー側でコードを処理する際に、これらの文字が適切に処理されていれば、ブラウザ上で正しく表示されるはずです。",
      answeredAt: new Date().toISOString()
    };
    
    // 新しい回答をチャット履歴に追加
    chatHistory.push(testAnswer);
    
    // 更新されたチャット履歴を保存
    await fs.writeFile(CHAT_HISTORY_FILE, JSON.stringify(chatHistory, null, 2), 'utf8');
    console.log(`テスト回答を追加しました。質問ID: ${newId}`);
    console.log('ブラウザで表示を確認してください。');
  } catch (error) {
    console.error('エラー:', error);
  }
}

testCodeDisplay(); 