const fs = require('fs').promises;
const path = require('path');

const CHAT_HISTORY_FILE = path.join(__dirname, '..', 'data', 'chat_history.json');
const ANSWER_DATA_FILE = path.join(__dirname, '..', 'data', 'answer_data.json');

async function fixChatHistory() {
  try {
    // 回答データの読み込み
    const answerDataRaw = await fs.readFile(ANSWER_DATA_FILE, 'utf8');
    const answerData = JSON.parse(answerDataRaw);
    
    // チャット履歴データの読み込み
    const chatHistoryRaw = await fs.readFile(CHAT_HISTORY_FILE, 'utf8');
    let chatHistory = [];
    
    try {
      chatHistory = JSON.parse(chatHistoryRaw);
    } catch (err) {
      console.error('チャット履歴のJSONパースに失敗しました:', err);
      console.log('UTF-8エンコーディングでファイルを新規作成します');
      
      // 新しいチャット履歴を作成
      chatHistory = [];
    }
    
    // 回答データから全てのチャット履歴を再構築
    const newChatHistory = [];
    
    // 質問ID一覧を取得（チャット履歴から）
    const questionIds = chatHistory.map(item => item.id);
    
    // 各質問に対して処理
    for (const question of chatHistory) {
      // 対応する回答を検索
      const answer = answerData.answers.find(a => a.id === question.id);
      
      if (answer) {
        // 回答が見つかった場合、新しいチャット履歴エントリを作成
        newChatHistory.push({
          id: question.id,
          question: question.question,
          contextInstructions: question.contextInstructions || null,
          timestamp: question.timestamp,
          status: "answered",
          answer: answer.answer,
          answeredAt: answer.timestamp || question.answeredAt || new Date().toISOString()
        });
      } else {
        // 回答が見つからない場合はステータスを保持
        newChatHistory.push({
          ...question,
          status: question.status || "pending",
        });
      }
    }
    
    // 特に、1741923155536の質問を確認して追加
    const hasLastQuestion = newChatHistory.some(q => q.id === "1741923155536");
    
    if (!hasLastQuestion) {
      const lastAnswer = answerData.answers.find(a => a.id === "1741923155536");
      
      if (lastAnswer) {
        console.log('最後の質問（1741923155536）が見つからないため追加します');
        
        newChatHistory.push({
          id: "1741923155536",
          question: "最後の回答ダブってるけど、こっちから個別に選択して削除できるようにしたい",
          contextInstructions: null,
          timestamp: "2025-03-14T03:32:35.538Z",
          status: "answered",
          answer: lastAnswer.answer,
          answeredAt: lastAnswer.timestamp
        });
      }
    }
    
    // 更新されたチャット履歴を保存
    await fs.writeFile(CHAT_HISTORY_FILE, JSON.stringify(newChatHistory, null, 2), 'utf8');
    console.log('チャット履歴が正常に修正されました。');
  } catch (error) {
    console.error('エラー:', error);
  }
}

fixChatHistory(); 