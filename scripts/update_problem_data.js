const fs = require('fs');
const path = require('path');

// データディレクトリパスの設定
const DATA_DIR = process.env.NODE_ENV === 'test' ? 'test_data' : 'data';
const CHAT_HISTORY_FILE = path.join(DATA_DIR, 'chat_history.json');
const ANSWER_DATA_FILE = path.join(DATA_DIR, 'answer_data.json');
const PROBLEMS_OUTPUT_FILE = path.join('public', 'data', 'bookkeeping_problems.json');

// 既存の問題データの読み込み
let existingProblemsData = { problems: [] };
try {
  const existingProblemsContent = fs.readFileSync(PROBLEMS_OUTPUT_FILE, 'utf8');
  existingProblemsData = JSON.parse(existingProblemsContent);
  console.log(`既存の問題データを読み込みました: ${existingProblemsData.problems.length}件`);
} catch (error) {
  console.log('既存の問題データが読み込めないか、存在しません。新規作成します。');
}

// チャット履歴の読み込み
let chatHistory = [];
try {
  const chatHistoryContent = fs.readFileSync(CHAT_HISTORY_FILE, 'utf8');
  chatHistory = JSON.parse(chatHistoryContent);
  console.log(`チャット履歴を読み込みました: ${chatHistory.length}件`);
} catch (error) {
  console.error('チャット履歴の読み込みに失敗しました:', error);
  process.exit(1);
}

// 回答データの読み込み
let answerData = { answers: [] };
try {
  const answerDataContent = fs.readFileSync(ANSWER_DATA_FILE, 'utf8');
  answerData = JSON.parse(answerDataContent);
  console.log(`回答データを読み込みました: ${answerData.answers ? answerData.answers.length : 0}件`);
} catch (error) {
  console.error('回答データの読み込みに失敗しました:', error);
  process.exit(1);
}

// 回答テキストから問題データを抽出する関数
function extractProblemsFromText(text) {
  const extractedProblems = [];
  
  // 問題パターンの正規表現 - より緩やかなパターン
  const problemRegex = /【問題(\d+)】【カテゴリ：([^】]+)】\s*([^\n]+)\s*正解[：:]\s*（借方）([^、]+)、（貸方）([^\n]+)/g;
  
  let match;
  while ((match = problemRegex.exec(text)) !== null) {
    try {
      const problemNumber = parseInt(match[1], 10);
      const category = match[2].trim();
      const question = match[3].trim();
      let debit = match[4].trim();
      let credit = match[5].trim();
      
      // 金額部分を取り除く
      debit = debit.split(' ')[0].replace(/\d+円/g, '').trim();
      credit = credit.split(' ')[0].replace(/\d+円/g, '').trim();
      
      const newProblem = {
        id: Date.now().toString() + Math.floor(Math.random() * 1000).toString(),
        problemId: problemNumber,
        category: category,
        question: question,
        correctAnswer: {
          debit: debit,
          credit: credit
        }
      };
      
      extractedProblems.push(newProblem);
      console.log(`問題${problemNumber}を抽出しました: ${category} - ${question.substring(0, 30)}...`);
    } catch (error) {
      console.error('問題抽出中にエラーが発生しました:', error);
    }
  }
  
  return extractedProblems;
}

// チャット履歴から問題データを抽出する関数
function extractProblemsFromChatHistory(chatHistory) {
  const extractedProblems = [];
  
  // contextInstructionsを持つアイテムから問題を抽出
  for (const item of chatHistory) {
    if (item.contextInstructions && 
        (item.contextInstructions.problemId || 
         item.contextInstructions.category)) {
      try {
        const newProblem = {
          id: item.id,
          problemId: item.contextInstructions.problemId,
          category: item.contextInstructions.category,
          question: item.contextInstructions.question,
          correctAnswer: item.contextInstructions.correctAnswer || {}
        };
        
        extractedProblems.push(newProblem);
        console.log(`チャット履歴から問題${newProblem.problemId}を抽出しました: ${newProblem.category} - ${newProblem.question.substring(0, 30)}...`);
      } catch (error) {
        console.error('チャット履歴からの問題抽出中にエラーが発生しました:', error);
      }
    }
  }
  
  return extractedProblems;
}

// 抽出した問題とIDのセットを保持
const processedProblems = new Set();
let maxProblemId = 0;

// 既存の問題から最大IDを取得
existingProblemsData.problems.forEach(problem => {
  if (problem.problemId && problem.problemId > maxProblemId) {
    maxProblemId = problem.problemId;
  }
  // 既存の問題IDを記録
  processedProblems.add(problem.problemId);
});

// すべての新しい問題を格納する配列
const allNewProblems = [];

// チャット履歴から問題を抽出
console.log('チャット履歴から問題を抽出します...');
const chatHistoryProblems = extractProblemsFromChatHistory(chatHistory);

// 重複していない問題だけを追加
chatHistoryProblems.forEach(newProblem => {
  if (!processedProblems.has(newProblem.problemId)) {
    allNewProblems.push(newProblem);
    processedProblems.add(newProblem.problemId);
    console.log(`問題ID: ${newProblem.problemId}を追加しました (チャット履歴から)`);
  } else {
    console.log(`問題ID: ${newProblem.problemId}は既に存在するためスキップします (チャット履歴から)`);
  }
});

// 回答データから問題を抽出
if (answerData.answers && answerData.answers.length > 0) {
  console.log('回答データから問題を抽出します...');
  
  // 回答データを日付順にソート（最新のものが最後に来るように）
  answerData.answers.sort((a, b) => {
    const dateA = new Date(a.timestamp);
    const dateB = new Date(b.timestamp);
    return dateA - dateB;
  });
  
  // すべての回答をチェック
  for (const answer of answerData.answers) {
    if (answer.answer) {
      console.log(`回答ID: ${answer.id}を処理中...`);
      const newProblems = extractProblemsFromText(answer.answer);
      
      // 重複していない問題だけを追加
      newProblems.forEach(newProblem => {
        if (!processedProblems.has(newProblem.problemId)) {
          allNewProblems.push(newProblem);
          processedProblems.add(newProblem.problemId);
          console.log(`問題ID: ${newProblem.problemId}を追加しました (回答から)`);
        } else {
          console.log(`問題ID: ${newProblem.problemId}は既に存在するためスキップします (回答から)`);
        }
      });
    }
  }
}

// 抽出した問題を既存の問題と結合
const combinedProblems = [...existingProblemsData.problems, ...allNewProblems];

// 問題IDでソート
combinedProblems.sort((a, b) => a.problemId - b.problemId);

// 最終的な問題データを作成
const finalProblemsData = {
  problems: combinedProblems
};

// JSONファイルに保存
try {
  fs.writeFileSync(PROBLEMS_OUTPUT_FILE, JSON.stringify(finalProblemsData, null, 2), 'utf8');
  console.log(`問題データを更新しました: ${finalProblemsData.problems.length}件の問題 (${allNewProblems.length}件追加)`);
} catch (error) {
  console.error('問題データの保存に失敗しました:', error);
  process.exit(1);
} 