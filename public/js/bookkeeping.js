// 簿記問題データを管理するクラス
class BookkeepingApp {
  constructor() {
    this.problems = [];
    this.currentProblemId = null;
    this.pollingInterval = null;
    this.chatHistory = [];
    this.loadProblems();
    this.loadChatHistory();
    this.initEventListeners();
    // 問題データの定期的な更新をセットアップ
    this.setupProblemPolling();
  }

  // 問題データを読み込む
  async loadProblems() {
    try {
      // 以前はローカルJSONファイルを読み込んでいたが、APIから取得するように変更
      const response = await fetch('/api/problems');
      if (!response.ok) {
        throw new Error('問題データの取得に失敗しました');
      }
      
      const data = await response.json();
      if (data && Array.isArray(data)) {
        this.problems = data;
        this.updateProblemList();
        
        // 最初の問題を表示（問題がない場合は表示しない）
        if (this.problems.length > 0 && !this.currentProblemId) {
          // 進捗データを取得
          const progress = this.getProgress();
          
          // 未回答の問題を探す
          const unsolvedProblem = this.problems.find(p => !progress[p.id]?.isCorrect);
          
          // 未回答の問題があればそれを表示、なければ最初の問題を表示
          const problemToShow = unsolvedProblem || this.problems[0];
          console.log('初期表示する問題:', problemToShow.id, problemToShow.category);
          
          this.displayProblem(problemToShow.id);
        }
        return true;
      } else {
        console.error('問題データの形式が不正です:', data);
        return false;
      }
    } catch (error) {
      console.error('問題データの読み込みに失敗しました:', error);
      document.querySelector('#bookkeeping-tab .problem-view').innerHTML = `
        <div class="error-message">問題データの読み込みに失敗しました。</div>
      `;
      return false;
    }
  }
  
  // チャット履歴を読み込む
  async loadChatHistory() {
    try {
      const response = await fetch('/api/chat-history');
      if (response.ok) {
        const data = await response.json();
        this.chatHistory = data;
        // 問題リストを更新（履歴アイコンのため）
        this.updateProblemList();
      } else {
        console.error('チャット履歴の取得に失敗しました');
      }
    } catch (error) {
      console.error('チャット履歴の読み込みエラー:', error);
    }
  }
  
  // 問題データの定期的な更新をセットアップ
  setupProblemPolling() {
    // 前回のポーリングをクリア
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }
    
    // ポーリングを無効化（データの自動更新による問題を防ぐため）
    console.log('問題データの自動更新を無効化しました');
    
    /* 以下のコードはコメントアウト
    // 10秒ごとに問題データを更新
    this.pollingInterval = setInterval(async () => {
      const success = await this.loadProblems();
      if (success) {
        console.log('問題データを更新しました');
      }
    }, 10000);
    */
  }

  // イベントリスナーを初期化
  initEventListeners() {
    // 問題リストのクリックイベント
    document.querySelector('#bookkeeping-tab').addEventListener('click', (e) => {
      if (e.target.matches('.problem-item') || e.target.closest('.problem-item')) {
        const item = e.target.matches('.problem-item') ? e.target : e.target.closest('.problem-item');
        const problemId = item.dataset.id;
        console.log('選択された問題ID:', problemId); // デバッグログ
        this.displayProblem(problemId);
      }
      
      // 回答確認ボタンのクリックイベント
      if (e.target.matches('#check-answer-btn')) {
        this.checkAnswer();
      }
      
      // 次の問題ボタンのクリックイベント
      if (e.target.matches('#next-problem-btn')) {
        this.showNextProblem();
      }
      
      // 質問するボタンのクリックイベント
      if (e.target.matches('#ask-question-btn')) {
        this.askQuestionAboutProblem();
      }
      
      // はてなアイコンのクリックイベント
      if (e.target.matches('.history-icon') || e.target.closest('.history-icon')) {
        const problemId = e.target.dataset.id || e.target.closest('.history-icon').dataset.id;
        this.navigateToQuestionHistory(problemId);
        e.stopPropagation(); // 親要素のクリックイベントを停止
      }
    });
  }

  // 履歴タブの該当質問箇所に移動
  navigateToQuestionHistory(problemId) {
    // 履歴タブをアクティブにする
    const historyTabBtn = document.querySelector('.tab-btn[data-tab="history"]');
    if (historyTabBtn) {
      historyTabBtn.click();
      
      // 少し待ってから該当の質問にスクロール
      setTimeout(() => {
        // 問題IDに関連する質問を検索
        const relevantQuestions = this.chatHistory.filter(item => {
          try {
            if (item.question && item.question.includes(`問題ID: ${problemId}`)) {
              return true;
            }
            if (item.question && item.question.includes('#context:')) {
              // コンテキスト情報からJSONを抽出して解析
              const contextMatch = item.question.match(/#context: (.+?)(\n|\r|$)/);
              if (contextMatch) {
                const contextData = JSON.parse(contextMatch[1]);
                return contextData.problemId === problemId;
              }
            }
            return false;
          } catch (e) {
            return false;
          }
        });
        
        if (relevantQuestions.length > 0) {
          // 最新の質問を取得
          const latestQuestion = relevantQuestions[relevantQuestions.length - 1];
          // 対応するDOM要素を探して表示
          const questionItem = document.querySelector(`.chat-item[data-id="${latestQuestion.id}"]`);
          if (questionItem) {
            questionItem.scrollIntoView({ behavior: 'smooth' });
            questionItem.style.backgroundColor = '#ffffcc'; // ハイライト
            // 3秒後にハイライトを消す
            setTimeout(() => {
              questionItem.style.backgroundColor = '';
            }, 3000);
          }
        }
      }, 300);
    }
  }

  // 問題リストを更新
  updateProblemList() {
    const listContainer = document.querySelector('#bookkeeping-tab .problem-list');
    
    // 進捗データを取得
    const progress = this.getProgress();
    
    // 問題リストを生成
    listContainer.innerHTML = `
      <h3>問題一覧</h3>
      <div class="progress-bar">
        <div class="progress" style="width: ${this.getProgressPercentage()}%"></div>
      </div>
      <p>進捗: ${this.getCompletedCount()}/${this.problems.length} 問正解</p>
      <ul class="problem-list-items">
        ${this.problems.map(problem => {
          // 問題に関する質問履歴があるかチェック
          const hasQuestionHistory = this.checkQuestionHistory(problem.id);
          
          return `
          <li class="problem-item ${progress[problem.id]?.isCorrect ? 'solved' : ''}" data-id="${problem.id}">
            ${problem.problemId || problem.id}. ${problem.category}
            <span class="icons">
              ${progress[problem.id]?.isCorrect ? '<span class="check-mark">✓</span>' : ''}
              ${hasQuestionHistory ? '<span class="history-icon" data-id="' + problem.id + '">❓</span>' : ''}
            </span>
          </li>
        `}).join('')}
      </ul>
    `;
    
    // CSS スタイルを追加
    this.addCustomStyles();
    
    console.log('問題リストを更新しました。問題数:', this.problems.length); // デバッグ用
  }

  // 問題に関する質問履歴があるかチェック
  checkQuestionHistory(problemId) {
    return this.chatHistory.some(item => {
      try {
        if (item.question && item.question.includes(`問題ID: ${problemId}`)) {
          return true;
        }
        if (item.question && item.question.includes('#context:')) {
          // コンテキスト情報からJSONを抽出して解析
          const contextMatch = item.question.match(/#context: (.+?)(\n|\r|$)/);
          if (contextMatch) {
            const contextData = JSON.parse(contextMatch[1]);
            return contextData.problemId === problemId;
          }
        }
        return false;
      } catch (e) {
        return false;
      }
    });
  }

  // カスタムスタイルを追加
  addCustomStyles() {
    // スタイルが既に存在する場合は追加しない
    if (document.getElementById('bookkeeping-custom-styles')) return;
    
    const styleElement = document.createElement('style');
    styleElement.id = 'bookkeeping-custom-styles';
    styleElement.textContent = `
      .problem-list-items li {
        position: relative;
        padding-right: 50px; /* アイコン用のスペース */
      }
      .problem-list-items .icons {
        position: absolute;
        right: 10px;
        top: 50%;
        transform: translateY(-50%);
        display: flex;
        align-items: center;
      }
      .check-mark {
        color: #2ecc71;
        font-weight: bold;
        margin-right: 5px;
      }
      .history-icon {
        display: inline-block;
        background-color: #f1c40f;
        color: #fff;
        width: 20px;
        height: 20px;
        border-radius: 4px;
        text-align: center;
        line-height: 20px;
        font-weight: bold;
        font-size: 14px;
        cursor: pointer;
        box-shadow: 0 2px 0 #e67e22;
        transition: all 0.2s;
      }
      .history-icon:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 0 #e67e22;
      }
      .history-icon:active {
        transform: translateY(0);
        box-shadow: 0 1px 0 #e67e22;
      }
      /* 問題タイトル部分のアイコンスタイル */
      .title-icons {
        display: inline-flex;
        align-items: center;
        margin-right: 10px;
        vertical-align: middle;
      }
      .title-icons .check-mark {
        font-size: 22px;
        color: #2ecc71;
        margin-right: 5px;
      }
      .title-icons .history-icon {
        margin-left: 3px;
        vertical-align: middle;
      }
      /* マリオ風はてなボックス */
      .history-icon {
        position: relative;
        background: linear-gradient(to bottom, #f1c40f, #e67e22);
        border: 2px solid #fff;
        font-family: 'Arial Rounded MT Bold', 'Arial', sans-serif;
        text-shadow: 1px 1px 1px rgba(0,0,0,0.3);
        box-shadow: 0 3px 0 #d35400, 2px 2px 5px rgba(0,0,0,0.2);
      }
      .history-icon:before {
        content: '';
        position: absolute;
        top: -1px;
        left: -1px;
        right: -1px;
        height: 40%;
        background: rgba(255,255,255,0.2);
        border-radius: 2px 2px 0 0;
      }
      
      /* 新しい問題詳細レイアウト */
      .problem-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 2px solid #eee;
        padding-bottom: 10px;
        margin-bottom: 15px;
      }
      
      .problem-header h3 {
        margin: 0;
        padding: 0;
        font-size: 18px;
        color: #2c3e50;
        display: flex;
        align-items: center;
      }
      
      .problem-info {
        display: flex;
        align-items: center;
        font-size: 14px;
        color: #7f8c8d;
      }
      
      .problem-id {
        margin-right: 10px;
      }
      
      .problem-content {
        background-color: #f9f9f9;
        padding: 15px;
        border-radius: 6px;
        margin-bottom: 20px;
        border-left: 4px solid #3498db;
      }
      
      .problem-text {
        margin: 0;
        font-size: 16px;
        line-height: 1.6;
      }
    `;
    document.head.appendChild(styleElement);
  }

  // 進捗データを取得
  getProgress() {
    try {
      return JSON.parse(localStorage.getItem('bookkeepingProgress') || '{}');
    } catch (error) {
      console.error('進捗データの読み込みに失敗しました:', error);
      return {};
    }
  }

  // 正解した問題数を取得
  getCompletedCount() {
    const progress = this.getProgress();
    return Object.values(progress).filter(p => p.isCorrect).length;
  }

  // 進捗率を計算
  getProgressPercentage() {
    if (this.problems.length === 0) return 0;
    return Math.round(this.getCompletedCount() / this.problems.length * 100);
  }

  // 問題を表示
  displayProblem(problemId) {
    // 文字列として渡される可能性があるので、一度確認
    const id = typeof problemId === 'string' ? problemId : problemId.toString();
    console.log('表示する問題ID:', id); // デバッグログ
    
    const problem = this.problems.find(p => p.id.toString() === id);
    if (!problem) {
      console.error('問題が見つかりません:', id);
      return;
    }
    
    this.currentProblemId = id;
    
    // 問題ビューを更新
    const viewContainer = document.querySelector('#bookkeeping-tab .problem-view');
    
    // 科目のオプションリストを作成（すべての問題から固有の科目を抽出）
    const allAccounts = new Set();
    this.problems.forEach(p => {
      if (p.correctAnswer) {
        if (p.correctAnswer.debit) allAccounts.add(p.correctAnswer.debit);
        if (p.correctAnswer.credit) allAccounts.add(p.correctAnswer.credit);
      }
    });
    const accountOptions = Array.from(allAccounts).sort();
    
    // 進捗データを取得
    const progress = this.getProgress();
    // 問題に関する質問履歴があるかチェック
    const hasQuestionHistory = this.checkQuestionHistory(id);
    
    // タイトル部分にアイコンを追加（はてなボックスのみ表示）
    const titleIcons = hasQuestionHistory ? `
      <span class="title-icons">
        <span class="history-icon" data-id="${id}" title="質問履歴あり">❓</span>
      </span>
    ` : '';
    
    viewContainer.innerHTML = `
      <div class="problem-header">
        <h3>${titleIcons.length > 0 ? titleIcons + ' ' : ''}問題 ${problem.problemId || problem.id}: ${problem.category}</h3>
        <div class="problem-info">
          <span class="problem-id">ID: ${problem.id}</span>
        </div>
      </div>
      <div class="problem-content">
        <p class="problem-text">${problem.question}</p>
      </div>
      <div class="journal-entry">
        <div class="entry-row">
          <label>借方科目:</label>
          <select id="debit-account">
            <option value="">選択してください</option>
            ${accountOptions.map(opt => `<option value="${opt}">${opt}</option>`).join('')}
          </select>
        </div>
        <div class="entry-row">
          <label>貸方科目:</label>
          <select id="credit-account">
            <option value="">選択してください</option>
            ${accountOptions.map(opt => `<option value="${opt}">${opt}</option>`).join('')}
          </select>
        </div>
      </div>
      <button id="check-answer-btn" class="btn">回答を確認</button>
      <div class="answer-result" style="display: none;"></div>
    `;
    
    // 説明エリアをクリア
    document.querySelector('#bookkeeping-tab .explanation').innerHTML = '';
    document.querySelector('#bookkeeping-tab .explanation').style.display = 'none';
  }

  // 回答をチェック
  checkAnswer() {
    if (!this.currentProblemId) return;
    
    const problem = this.problems.find(p => p.id === this.currentProblemId);
    if (!problem) return;
    
    const userDebit = document.getElementById('debit-account').value;
    const userCredit = document.getElementById('credit-account').value;
    
    // 選択肢が選ばれているかチェック
    if (!userDebit || !userCredit) {
      alert('借方科目と貸方科目を選択してください。');
      return;
    }
    
    let isCorrect = false;
    
    // 正解かどうかをチェック
    if (problem.correctAnswer) {
      isCorrect = (userDebit === problem.correctAnswer.debit && 
                  userCredit === problem.correctAnswer.credit);
    }
    
    // 結果表示
    const resultContainer = document.querySelector('#bookkeeping-tab .answer-result');
    resultContainer.style.display = 'block';
    
    const explanationContainer = document.querySelector('#bookkeeping-tab .explanation');
    explanationContainer.style.display = 'block';
    
    if (isCorrect) {
      resultContainer.innerHTML = `
        <div class="correct">✓ 正解です！</div>
      `;
      
      // 問題に解説があれば表示
      if (problem.explanation) {
        explanationContainer.innerHTML = `
          <h4>解説</h4>
          <p>${problem.explanation}</p>
        `;
      } else {
        explanationContainer.innerHTML = `
          <h4>正解</h4>
          <p>借方：${problem.correctAnswer.debit}<br>貸方：${problem.correctAnswer.credit}</p>
        `;
      }
      
      // 進捗を保存
      this.saveProgress(problem.id, true);
      
      // 次の問題ボタンを表示
      resultContainer.innerHTML += `
        <button id="next-problem-btn" class="btn">次の問題へ</button>
      `;
    } else {
      resultContainer.innerHTML = `
        <div class="incorrect">✗ 不正解です。もう一度試してみてください。</div>
        <button id="ask-question-btn" class="btn">質問する</button>
      `;
    }
    
    // 問題リストを更新（進捗表示のため）
    this.updateProblemList();
  }

  // 次の問題を表示
  showNextProblem() {
    if (!this.currentProblemId) return;
    
    const currentIndex = this.problems.findIndex(p => p.id === this.currentProblemId);
    if (currentIndex === -1) return;
    
    const nextIndex = (currentIndex + 1) % this.problems.length;
    this.displayProblem(this.problems[nextIndex].id);
  }

  // 進捗を保存
  saveProgress(problemId, isCorrect) {
    const progress = this.getProgress();
    
    if (!progress[problemId] || !progress[problemId].isCorrect) {
      progress[problemId] = {
        isCorrect: isCorrect,
        attemptCount: (progress[problemId]?.attemptCount || 0) + 1,
        lastAttempt: new Date().toISOString()
      };
    }
    
    localStorage.setItem('bookkeepingProgress', JSON.stringify(progress));
    this.updateProblemList();
  }

  // 問題についての質問をメインフォームに送信
  askQuestionAboutProblem() {
    if (!this.currentProblemId) return;
    
    const problem = this.problems.find(p => p.id === this.currentProblemId);
    if (!problem) return;
    
    const userDebit = document.getElementById('debit-account').value;
    const userCredit = document.getElementById('credit-account').value;
    const userMethod = document.getElementById('bookkeeping-method') ? document.getElementById('bookkeeping-method').value : null;
    
    // コンテキスト情報を作成
    const context = {
      problemId: problem.id,
      category: problem.category,
      question: problem.question,
      userAnswer: {
        method: userMethod || "未選択",
        debit: userDebit || "未選択",
        credit: userCredit || "未選択"
      },
      correctAnswer: problem.answer
    };
    
    // コンテキスト情報を隠しフィールドに保存
    document.getElementById('question-context').value = JSON.stringify(context);
    
    // メイン質問フォームにはユーザーが読みやすい形式のみを表示
    const questionInput = document.getElementById('question');
    let methodInfo = userMethod ? `記帳方法「${userMethod}」、` : '';
    questionInput.value = `【問題ID: ${problem.id}】【カテゴリ: ${problem.category}】\n\n${problem.question}\n\n私の解答：${methodInfo}借方「${userDebit || "未選択"}」、貸方「${userCredit || "未選択"}」\n\n質問内容：`;
    
    // 質問フォームにフォーカスしてスクロール
    questionInput.focus();
    questionInput.scrollIntoView({ behavior: 'smooth' });
    
    // 質問タブをアクティブにする
    const historyTabBtn = document.querySelector('.tab-btn[data-tab="history"]');
    if (historyTabBtn) {
      historyTabBtn.click();
    }
  }
}

// ページ読み込み完了時に初期化
document.addEventListener('DOMContentLoaded', () => {
  // 簿記タブボタンのイベントリスナーを追加
  const bookkeepingTabBtn = document.querySelector('.tab-btn[data-tab="bookkeeping"]');
  if (bookkeepingTabBtn) {
    bookkeepingTabBtn.addEventListener('click', () => {
      // BookkeepingAppクラスのインスタンスがなければ初期化
      if (!window.bookkeepingApp) {
        window.bookkeepingApp = new BookkeepingApp();
      } else {
        // インスタンスがすでに存在する場合はチャット履歴を再読み込み
        window.bookkeepingApp.loadChatHistory();
      }
    });
  }
}); 