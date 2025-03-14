const fs = require('fs');
const path = require('path');
const readline = require('readline');

// ファイルパス
const CHAT_HISTORY_FILE = path.join(__dirname, '..', 'data', 'chat_history.json');
const ANSWER_FILE = path.join(__dirname, '..', 'data', 'answer_data.json');

// readline インターフェースの設定
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// チャット履歴を読み込む関数
function loadChatHistory() {
  try {
    const data = fs.readFileSync(CHAT_HISTORY_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('チャット履歴の読み込みエラー:', error);
    return [];
  }
}

// チャット履歴を保存する関数
function saveChatHistory(history) {
  fs.writeFileSync(CHAT_HISTORY_FILE, JSON.stringify(history, null, 2), 'utf8');
}

// 回答データを読み込む関数
function loadAnswerData() {
  try {
    const data = fs.readFileSync(ANSWER_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('回答データの読み込みエラー:', error);
    return { answers: [] };
  }
}

// 回答データを保存する関数
function saveAnswerData(data) {
  fs.writeFileSync(ANSWER_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// 回答待ちの質問を表示する
function displayPendingQuestions() {
  const chatHistory = loadChatHistory();
  const pendingQuestions = chatHistory.filter(q => q.status === 'pending');
  
  if (pendingQuestions.length === 0) {
    console.log('現在、回答待ちの質問はありません。');
    rl.close();
    return;
  }
  
  console.log(`${pendingQuestions.length}件の回答待ち質問があります。`);
  
  // 最初の回答待ち質問を表示
  const question = pendingQuestions[0];
  console.log('\n----------------------------------------------------');
  console.log(`質問ID: ${question.id}`);
  console.log('----------------------------------------------------');
  console.log(question.question);
  console.log('----------------------------------------------------');
  
  // 回答を入力
  rl.question('回答を入力してください: ', (answer) => {
    // チャット履歴を更新
    const chatHistory = loadChatHistory();
    const questionIndex = chatHistory.findIndex(q => q.id === question.id);
    
    if (questionIndex !== -1) {
      chatHistory[questionIndex].answer = answer;
      chatHistory[questionIndex].status = 'answered';
      chatHistory[questionIndex].answeredAt = new Date().toISOString();
      saveChatHistory(chatHistory);
      
      // 回答データも更新
      const answerData = loadAnswerData();
      const newAnswer = {
        id: question.id,
        answer: answer,
        timestamp: new Date().toISOString()
      };
      
      // 既存の回答を検索
      const existingAnswerIndex = answerData.answers.findIndex(a => a.id === question.id);
      
      if (existingAnswerIndex >= 0) {
        // 既存の回答を更新
        answerData.answers[existingAnswerIndex] = newAnswer;
      } else {
        // 新しい回答を追加
        answerData.answers.push(newAnswer);
      }
      
      saveAnswerData(answerData);
      
      console.log('回答を保存しました。');
    } else {
      console.log(`警告: 質問ID ${question.id} が履歴に見つかりませんでした。`);
    }
    
    rl.close();
  });
}

// 実行
displayPendingQuestions(); 