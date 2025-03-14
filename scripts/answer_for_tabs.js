const fs = require('fs');
const path = require('path');

// 回答データファイル
const ANSWER_FILE = path.join(__dirname, '..', 'data', 'answer_data.json');

// 質問ID
const questionId = '1741921000675';

// 回答内容
const answer = `現在のホーム画面は単一ページアプリケーション(SPA)構造で、コンテンツが固定されています。タブ機能で柔軟に切り替えるには：

1. **タブUI構造の追加**：
   - 上部に質問フォーム（固定部分）
   - 中央にタブナビゲーションボタン
   - 下部にタブコンテンツ（切替部分）

2. **HTMLの実装例**：
\`\`\`html
<div class="tabs-navigation">
  <button class="tab-btn active" data-tab="history">履歴</button>
  <button class="tab-btn" data-tab="stats">統計</button>
  <button class="tab-btn" data-tab="settings">設定</button>
</div>
<div class="tab-content">
  <div id="history-tab" class="tab-panel active"><!-- 現在の履歴表示 --></div>
  <div id="stats-tab" class="tab-panel"><!-- 統計情報 --></div>
  <div id="settings-tab" class="tab-panel"><!-- 設定画面 --></div>
</div>
\`\`\`

3. **JS実装**：
\`\`\`javascript
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    // アクティブタブ切替
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    // パネル切替
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.getElementById(\`\${btn.dataset.tab}-tab\`).classList.add('active');
  });
});
\`\`\`

4. **CSSの追加**：
\`\`\`css
.tabs-navigation {
  display: flex;
  border-bottom: 1px solid #ddd;
  margin: 20px 0;
}
.tab-btn {
  padding: 10px 15px;
  background: none;
  border: none;
  cursor: pointer;
}
.tab-btn.active {
  border-bottom: 2px solid #3498db;
  font-weight: bold;
}
.tab-panel {
  display: none;
}
.tab-panel.active {
  display: block;
}
\`\`\`

現状のコードは修正箇所が少なく、index.htmlに上記を追加するだけで実装可能です。タブごとに異なる機能（問題集リスト、統計、設定など）を実装すれば、UIの拡張性が大きく向上します。

将来的には、各タブを独立したJavaScriptモジュールとして実装し、動的に読み込むようにすれば、さらに柔軟なUIが実現できるでしょう。`;

// 回答データを読み込む
let answerData;
try {
  const data = fs.readFileSync(ANSWER_FILE, 'utf8');
  answerData = JSON.parse(data);
  
  if (!answerData.answers) {
    answerData.answers = [];
  }
} catch (error) {
  console.error('回答データの読み込みエラー:', error);
  // 新しいデータを作成
  answerData = { answers: [] };
}

// 既存の回答を検索
const existingAnswerIndex = answerData.answers.findIndex(a => a.id === questionId);

// 回答データを更新または追加
const newAnswer = {
  id: questionId,
  answer: answer,
  timestamp: new Date().toISOString()
};

if (existingAnswerIndex >= 0) {
  // 既存の回答を更新
  answerData.answers[existingAnswerIndex] = newAnswer;
  console.log(`質問ID: ${questionId} の回答を更新しました`);
} else {
  // 新しい回答を追加
  answerData.answers.push(newAnswer);
  console.log(`質問ID: ${questionId} の回答を追加しました`);
}

// 回答データを保存
fs.writeFileSync(ANSWER_FILE, JSON.stringify(answerData, null, 2), 'utf8');
console.log('回答データを保存しました');
console.log('回答が保存されました。コンテンツの一部:');
console.log(answer.substring(0, 100) + '...'); 