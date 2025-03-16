// 簿記問題データを管理するクラス
class BookkeepingApp {
  constructor() {
    this.problems = [];
    this.currentProblemId = null;
    this.pollingInterval = null;
    this.chatHistory = [];
    this.initialized = false;
    
    // 初期化処理
    this.init();
  }
  
  // 非同期の初期化処理
  async init() {
    try {
      console.log('BookkeepingApp初期化開始');
      
      // 問題リストの初期表示（読み込み中を表示）
      this.initProblemListUI();

      // イベントリスナーを先に設定
      this.initEventListeners();
      
      // APIからデータを取得
      console.log('データ読み込み開始...');
      
      // 問題データを優先的に読み込む
      await this.loadProblems();
      
      // チャット履歴を読み込む（非同期だが完了を待たない）
      this.loadChatHistory().catch(err => {
        console.error('チャット履歴の読み込みエラー:', err);
      });
      
      // データのポーリング設定
      this.setupProblemPolling();
      
      this.initialized = true;
      console.log('BookkeepingApp初期化完了');
    } catch (error) {
      console.error('BookkeepingApp初期化エラー:', error);
    }
  }
  
  // 問題リストのUIを初期化
  initProblemListUI() {
    const listContainer = document.querySelector('#bookkeeping-tab .problem-list');
    if (listContainer) {
      listContainer.innerHTML = `
        <h3>問題一覧</h3>
        <p class="loading-indicator">問題データを読み込み中...</p>
      `;
    }
  }

  // 問題データを読み込む
  async loadProblems() {
    try {
      console.log('問題データの読み込みを開始...');
      
      // 問題リストの初期表示を「読み込み中」にする
      const listContainer = document.querySelector('#bookkeeping-tab .problem-list');
      if (listContainer) {
        listContainer.innerHTML = `
          <h3>問題一覧</h3>
          <p class="loading-indicator">問題データを読み込み中...</p>
        `;
      }
      
      // 問題データをAPIから取得
      console.log('問題データのAPIリクエスト送信...');
      const response = await fetch('/api/problems');
      if (!response.ok) {
        console.error('問題データAPI応答エラー:', response.status, response.statusText);
        throw new Error('問題データの取得に失敗しました');
      }
      
      console.log('問題データのAPI応答を受信。JSONパース開始...');
      const data = await response.json();
      
      if (data && Array.isArray(data)) {
        this.problems = data;
        console.log(`問題データを読み込みました: ${this.problems.length}件`);
        
        // 問題リストを更新
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
    console.log('イベントリスナーを初期化');
    // 問題リストのクリックイベント
    document.querySelector('#bookkeeping-tab').addEventListener('click', (e) => {
      // カテゴリー見出しクリックイベント
      if (e.target.matches('.category-header') || e.target.closest('.category-header')) {
        const header = e.target.matches('.category-header') ? e.target : e.target.closest('.category-header');
        const categoryId = header.dataset.category;
        const categoryContent = document.querySelector(`.category-content[data-category="${categoryId}"]`);
        
        if (categoryContent) {
          // 折りたたみ状態をトグル
          const isExpanded = categoryContent.style.display !== 'none';
          categoryContent.style.display = isExpanded ? 'none' : 'block';
          
          // アイコンを回転
          const arrow = header.querySelector('.category-arrow');
          if (arrow) {
            arrow.style.transform = isExpanded ? 'rotate(0deg)' : 'rotate(90deg)';
          }
        }
      }
      
      if (e.target.matches('.problem-item') || e.target.closest('.problem-item')) {
        const item = e.target.matches('.problem-item') ? e.target : e.target.closest('.problem-item');
        const problemId = item.dataset.id;
        console.log('選択された問題ID:', problemId);
        this.displayProblem(problemId);
      }
      
      // 回答確認ボタンのクリックイベント
      if (e.target.matches('#check-answer-btn')) {
        this.checkAnswerWithNewUI();
      }
      
      // 前の問題ボタンのクリックイベント
      if (e.target.matches('#prev-problem-btn')) {
        this.showPreviousProblem();
      }
      
      // 次の問題ボタンのクリックイベント
      if (e.target.matches('#next-problem-btn')) {
        this.showNextProblem();
      }
      
      // 次の未修了問題ボタンのクリックイベント
      if (e.target.matches('#next-unsolved-btn')) {
        this.showNextUnsolvedProblem();
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
    
    // 簿記タブが選択されたときのイベント
    const bookkeepingTabBtn = document.querySelector('.tab-btn[data-tab="bookkeeping"]');
    if (bookkeepingTabBtn) {
      bookkeepingTabBtn.addEventListener('click', () => {
        // このイベントはindex.htmlの新しいイベントハンドラで処理するため、ここは空にする
      });
    }
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
              const contextMatch = item.question.match(/#context: ({.+?})(?:\n|\r|$)/);
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
  async updateProblemList() {
    try {
      console.log('updateProblemList: 問題リストの更新を開始...');
      
      const listContainer = document.querySelector('#bookkeeping-tab .problem-list');
      if (!listContainer) return;
      
      // 進捗データを取得
      const progress = await this.getProgress();
      console.log('updateProblemList: 取得した進捗データ:', progress);
      
      // カテゴリー別に問題を分類
      const categories = {};
      this.problems.forEach(problem => {
        if (!categories[problem.category]) {
          categories[problem.category] = [];
        }
        categories[problem.category].push(problem);
      });
      
      // カテゴリー別のHTMLを生成
      let categoryHtml = '';
      
      Object.entries(categories).forEach(([category, problems]) => {
        // カテゴリーごとに問題アイテムのHTMLを生成
        const problemItems = problems.map(problem => {
          const problemProgress = progress[problem.id] || {};
          const isSolved = problemProgress.isCorrect || 
                          problemProgress.countCorrectBySelect > 0 || 
                          problemProgress.countCorrectByInput > 0;
          
          const hasQuestionHistory = this.checkQuestionHistory(problem.id);
          
          // 質問履歴アイコン（あれば表示）
          const historyIcon = hasQuestionHistory ? 
            `<span class="history-icon" title="質問履歴あり">❓</span>` : '';
          
          // チェックマークアイコン（解決済みの場合）
          const checkMark = isSolved ? 
            `<span class="check-mark" title="解答済み">✓</span>` : '';
          
          return `
            <li class="problem-item ${isSolved ? 'solved' : ''}" data-id="${problem.id}">
              ${problem.title || `${problem.category} #${problem.id}`}
              <div class="icons">
                ${checkMark}
                ${historyIcon}
              </div>
            </li>
          `;
        }).join('');
        
        // カテゴリーセクションのHTML
        const collapsed = false; // 初期状態で折りたたむかどうか
        
        // カテゴリーごとに正解数をカウント
        const solvedCount = problems.filter(p => {
          const problemProgress = progress[p.id];
          // IDが003で始まるかどうかに関わらず、そのままIDを使用
          return problemProgress && (
            problemProgress.isCorrect || 
            problemProgress.countCorrectBySelect > 0 || 
            problemProgress.countCorrectByInput > 0
          );
        }).length;
        
        categoryHtml += `
          <div class="category-section">
            <div class="category-header" data-category="${category}">
              <span class="category-name">${category}</span>
              <span class="category-progress">(${solvedCount}/${problems.length})</span>
            </div>
            <div class="category-content" ${collapsed ? 'style="display: none;"' : ''}>
              <ul class="problem-list-items">
                ${problemItems}
              </ul>
            </div>
          </div>
        `;
      });
      
      // 進捗状況を表示
      const completedCount = await this.getCompletedCount();
      const totalProblems = this.problems.length;
      // 進捗率が100%を超えないようにする
      const percentage = Math.min(Math.round((completedCount / totalProblems) * 100), 100);
      
      console.log(`進捗状況: ${completedCount}/${totalProblems} 問解答済み (${percentage}%)`);
      
      // リストを更新
      listContainer.innerHTML = `
        <h3>問題一覧</h3>
        
        <div class="progress-info">
          <div class="progress-text" id="progress-text">
            ${completedCount}/${totalProblems} 問解答済み (${percentage}%)
          </div>
          <div class="progress-bar-container">
            <div class="progress-bar" id="progress-bar" style="width: ${percentage}%;"></div>
          </div>
        </div>
        
        <div class="problem-categories">
          ${categoryHtml}
        </div>
      `;
      
      // CSS スタイルを追加
      this.addCustomStyles();
      
      console.log('問題リストを更新しました。問題数:', this.problems.length);
    } catch (error) {
      console.error('問題リスト更新中にエラーが発生しました:', error);
      // エラーメッセージを表示
      const listContainer = document.querySelector('#bookkeeping-tab .problem-list');
      if (listContainer) {
        listContainer.innerHTML = `
          <h3>問題一覧</h3>
          <div class="error-message">問題リストの表示中にエラーが発生しました。</div>
        `;
      }
    }
  }

  // 質問履歴があるかチェック
  checkQuestionHistory(problemId) {
    // statusが 'answered' または 'completed' で、かつanswerフィールドが存在する項目を「回答済み」とみなす
    return this.chatHistory.some(item => {
      try {
        if (item.question && item.question.includes(`問題ID: ${problemId}`)) {
          return item.answer && (item.status === 'answered' || item.status === 'completed');
        }
        if (item.question && item.question.includes('#context:')) {
          // コンテキスト情報からJSONを抽出して解析
          const contextData = this.parseContextData(item.question);
          const hasAnswer = item.answer && (item.status === 'answered' || item.status === 'completed');
          return contextData && contextData.problemId === problemId && hasAnswer;
        }
        return false;
      } catch (e) {
        console.error('質問履歴チェック中にエラーが発生しました:', e);
        return false;
      }
    });
  }

  // コンテキストデータをパースする（問題IDの抽出用）
  parseContextData(questionText) {
    try {
      if (!questionText || !questionText.includes('#context:')) {
        return null;
      }
      // コンテキスト情報からJSONを抽出して解析
      const contextMatch = questionText.match(/#context: ({.+?})(?:\n|\r|$)/);
      if (contextMatch) {
        const parsedData = JSON.parse(contextMatch[1]);
        // データの検証 - 必須フィールドの存在確認
        if (!parsedData.problemId) {
          console.warn('コンテキストデータに問題IDが含まれていません');
        }
        return parsedData;
      }
      return null;
    } catch (e) {
      console.error('コンテキストデータのパース中にエラーが発生しました:', e);
      return null;
    }
  }

  // カスタムスタイルを追加
  addCustomStyles() {
    // スタイルが既に存在する場合は追加しない
    if (document.getElementById('bookkeeping-custom-styles')) return;
    
    const styleElement = document.createElement('style');
    styleElement.id = 'bookkeeping-custom-styles';
    styleElement.textContent = `
      /* カテゴリーセクションのスタイル */
      .category-section {
        margin-bottom: 10px;
        border: 1px solid #e0e0e0;
        border-radius: 6px;
        overflow: hidden;
      }
      
      .category-header {
        background-color: #f0f0f0;
        padding: 8px 15px;
        cursor: pointer;
        display: flex;
        align-items: center;
        font-weight: bold;
        color: #2c3e50;
        transition: background-color 0.2s;
      }
      
      .category-header:hover {
        background-color: #e5e5e5;
      }
      
      .category-arrow {
        display: inline-block;
        margin-right: 10px;
        transition: transform 0.3s;
        font-size: 12px;
      }
      
      .category-name {
        flex: 1;
      }
      
      .category-progress {
        font-size: 12px;
        color: #7f8c8d;
        font-weight: normal;
      }
      
      .category-content {
        max-height: 500px;
        overflow-y: auto;
      }
      
      /* 既存の問題リストアイテムスタイル */
      .problem-list-items {
        list-style: none;
        padding: 0;
        margin: 0;
      }
      
      .problem-list-items li {
        position: relative;
        padding: 8px 15px 8px 25px;
        border-bottom: 1px solid #eee;
        cursor: pointer;
        transition: background-color 0.2s;
        padding-right: 50px; /* アイコン用のスペース */
      }
      
      .problem-list-items li:last-child {
        border-bottom: none;
      }
      
      .problem-list-items li:hover {
        background-color: #f5f5f5;
      }
      
      .problem-list-items li.solved {
        background-color: #e8f5e9;
      }
      
      .problem-list-items li.solved:hover {
        background-color: #d5ecd7;
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

  // 進捗データを取得（サーバーから）
  async getProgress() {
    console.log('getProgress called');
    try {
      // サーバーからデータを取得
      const response = await fetch('/api/progress');
      if (!response.ok) {
        throw new Error(`サーバーからの応答エラー: ${response.status}`);
      }
      
      const progressData = await response.json();
      console.log('Progress data from server:', progressData);
      return progressData;
    } catch (error) {
      console.error('進捗データの読み込みに失敗しました:', error);
      return {}; // エラー時は空のオブジェクトを返す
    }
  }

  // 正解した問題数を取得
  async getCompletedCount() {
    console.log('getCompletedCount called');
    const progress = await this.getProgress();
    
    // 進捗データから一意のIDのみを抽出して重複カウントを防ぐ
    // IDが003で始まる問題のみをカウント
    const uniqueProblemIds = new Set();
    
    Object.entries(progress).forEach(([id, p]) => {
      // 新しいID形式（003で始まる）の問題のみを対象に
      if (id.startsWith('003')) {
        // 完了条件：countCorrectBySelect > 0 または countCorrectByInput > 0 または isCorrect
        if ((p.countCorrectBySelect > 0) || (p.countCorrectByInput > 0) || p.isCorrect) {
          uniqueProblemIds.add(id);
        }
      }
    });
    
    console.log('Completed problems count:', uniqueProblemIds.size);
    console.log('Unique problem IDs:', Array.from(uniqueProblemIds));
    
    return Math.min(uniqueProblemIds.size, this.problems.length);
  }

  // 進捗率を計算
  async getProgressPercentage() {
    const completedCount = await this.getCompletedCount();
    const totalCount = this.problems.length;
    return Math.round((completedCount / totalCount) * 100);
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
      // correctAnswers配列から科目を抽出
      if (p.correctAnswers && Array.isArray(p.correctAnswers)) {
        p.correctAnswers.forEach(answer => {
          if (answer.debit) allAccounts.add(answer.debit);
          if (answer.credit) allAccounts.add(answer.credit);
        });
      }
      // 単一のcorrectAnswerから科目を抽出
      else if (p.correctAnswer) {
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
    
    // 勘定科目カテゴリーの取得(非同期処理)
    this.loadAccountCategories().then(categories => {
      // 大分類のオプションリスト作成
      const categoryOptions = categories.map(cat => 
        `<option value="${cat.id}">${cat.name}</option>`
      ).join('');
      
      viewContainer.innerHTML = `
        <div class="problem-header">
          <h3>${titleIcons.length > 0 ? titleIcons + ' ' : ''}問題 ${problem.problemNumber || problem.id}: ${problem.category}</h3>
          <div class="problem-info">
            <span class="problem-id">ID: ${problem.id}</span>
          </div>
        </div>
        <div class="problem-content">
          <p class="problem-text">${problem.question}</p>
        </div>
        
        <div class="journal-entry">
          <div class="entry-row">
            <label><strong>【借方】</strong></label>
            <div class="flex-column-container">
              <div class="input-row">
                <input type="text" id="debit-account-input" placeholder="科目名を入力" class="form-control">
              </div>
              <div class="input-row selector-row">
                <div class="or-label">または</div>
                <div class="input-group">
                  <select id="debit-category" class="form-control">
                    <option value="">大分類を選択</option>
                    ${categoryOptions}
                  </select>
                </div>
                <div class="input-group">
                  <select id="debit-subcategory" class="form-control" disabled>
                    <option value="">小分類を選択してください</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
          
          <div class="entry-row" style="margin-top: 15px;">
            <label><strong>【貸方】</strong></label>
            <div class="flex-column-container">
              <div class="input-row">
                <input type="text" id="credit-account-input" placeholder="科目名を入力" class="form-control">
              </div>
              <div class="input-row selector-row">
                <div class="or-label">または</div>
                <div class="input-group">
                  <select id="credit-category" class="form-control">
                    <option value="">大分類を選択</option>
                    ${categoryOptions}
                  </select>
                </div>
                <div class="input-group">
                  <select id="credit-subcategory" class="form-control" disabled>
                    <option value="">小分類を選択してください</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
        <button id="check-answer-btn" class="btn">解答する</button>
        <div class="answer-result" style="display: none;"></div>
      `;
      
      // 説明エリアをクリア
      document.querySelector('#bookkeeping-tab .explanation').innerHTML = '';
      document.querySelector('#bookkeeping-tab .explanation').style.display = 'none';
      
      // ナビゲーションコンテナを更新
      const navContainer = document.querySelector('#bookkeeping-tab .navigation-container');
      navContainer.innerHTML = `
        <div class="problem-navigation">
          <button id="prev-problem-btn" class="nav-btn">◀ 前の問題</button>
          <button id="next-problem-btn" class="nav-btn">次の問題 ▶</button>
          <button id="next-unsolved-btn" class="nav-btn">次の未修了問題 ▶▶</button>
        </div>
      `;
      
      // スタイルを追加
      this.addCustomStylesForEntryForm();
      this.addNavigationStyles();
      
      // イベントリスナー設定
      this.setupSubcategorySelectors(categories);
    });
  }
  
  // ナビゲーションボタン用のスタイル追加
  addNavigationStyles() {
    // スタイルが既に存在する場合は追加しない
    if (document.getElementById('navigation-styles')) return;
    
    const styleElement = document.createElement('style');
    styleElement.id = 'navigation-styles';
    styleElement.textContent = `
      .problem-navigation {
        display: flex;
        justify-content: space-between;
        gap: 15px;
        width: 100%;
      }
      
      .nav-btn {
        padding: 12px 15px;
        background-color: #007bff;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.2s;
        flex: 1;
        text-align: center;
        font-size: 15px;
        font-weight: bold;
      }
      
      .nav-btn:hover {
        background-color: #0069d9;
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
      }
      
      #next-unsolved-btn {
        background-color: #28a745;
      }
      
      #next-unsolved-btn:hover {
        background-color: #218838;
      }
      
      .navigation-container {
        display: flex;
        align-items: center;
        justify-content: center;
      }
    `;
    document.head.appendChild(styleElement);
  }
  
  // 勘定科目カテゴリを読み込む
  async loadAccountCategories() {
    try {
      // キャッシュがあればそれを使用
      if (this.accountCategories) {
        return this.accountCategories;
      }
      
      const response = await fetch('/data/account_categories.json');
      if (!response.ok) {
        throw new Error('勘定科目データの取得に失敗しました');
      }
      
      const data = await response.json();
      this.accountCategories = data.accountCategories || [];
      return this.accountCategories;
    } catch (error) {
      console.error('勘定科目データの読み込みエラー:', error);
      return [];
    }
  }
  
  // 小分類プルダウンのイベントリスナー設定
  setupSubcategorySelectors(categories) {
    // 借方の大分類が変更されたときのイベント
    const debitCategory = document.getElementById('debit-category');
    const debitSubcategory = document.getElementById('debit-subcategory');
    
    if (debitCategory && debitSubcategory) {
      debitCategory.addEventListener('change', () => {
        const categoryId = debitCategory.value;
        if (!categoryId) {
          debitSubcategory.innerHTML = '<option value="">小分類を選択してください</option>';
          debitSubcategory.disabled = true;
          return;
        }
        
        // 選択された大分類に対応する小分類のオプションを生成
        const category = categories.find(c => c.id === categoryId);
        if (category && category.group) {
          const options = category.group.map(item => 
            `<option value="${item.name}">${item.name}</option>`
          ).join('');
          
          debitSubcategory.innerHTML = `
            <option value="">選択してください</option>
            ${options}
          `;
          debitSubcategory.disabled = false;
        }
      });
      
      // 小分類が選択されたときに入力フォームに反映
      debitSubcategory.addEventListener('change', () => {
        if (debitSubcategory.value) {
          document.getElementById('debit-account-input').value = debitSubcategory.value;
        }
      });
    }
    
    // 貸方の大分類が変更されたときのイベント
    const creditCategory = document.getElementById('credit-category');
    const creditSubcategory = document.getElementById('credit-subcategory');
    
    if (creditCategory && creditSubcategory) {
      creditCategory.addEventListener('change', () => {
        const categoryId = creditCategory.value;
        if (!categoryId) {
          creditSubcategory.innerHTML = '<option value="">小分類を選択してください</option>';
          creditSubcategory.disabled = true;
          return;
        }
        
        // 選択された大分類に対応する小分類のオプションを生成
        const category = categories.find(c => c.id === categoryId);
        if (category && category.group) {
          const options = category.group.map(item => 
            `<option value="${item.name}">${item.name}</option>`
          ).join('');
          
          creditSubcategory.innerHTML = `
            <option value="">選択してください</option>
            ${options}
          `;
          creditSubcategory.disabled = false;
        }
      });
      
      // 小分類が選択されたときに入力フォームに反映
      creditSubcategory.addEventListener('change', () => {
        if (creditSubcategory.value) {
          document.getElementById('credit-account-input').value = creditSubcategory.value;
        }
      });
    }
    
    // 解答ボタンのイベントリスナー更新
    const checkAnswerBtn = document.getElementById('check-answer-btn');
    if (checkAnswerBtn) {
      checkAnswerBtn.addEventListener('click', () => this.checkAnswerWithNewUI());
    }
  }
  
  // 新しいUIでの回答チェック
  checkAnswerWithNewUI() {
    if (!this.currentProblemId) return;
    
    const problem = this.problems.find(p => p.id === this.currentProblemId);
    if (!problem) return;
    
    // 直接入力フォームと小分類プルダウンの両方から値を取得
    const userDebitInput = document.getElementById('debit-account-input').value;
    const userDebitSubcategory = document.getElementById('debit-subcategory').value;
    
    const userCreditInput = document.getElementById('credit-account-input').value;
    const userCreditSubcategory = document.getElementById('credit-subcategory').value;
    
    // 直接入力または小分類プルダウンの値を使用
    const userDebit = userDebitInput || userDebitSubcategory;
    const userCredit = userCreditInput || userCreditSubcategory;
    
    // 選択肢が選ばれているかチェック
    if (!userDebit || !userCredit) {
      alert('借方科目と貸方科目を選択または入力してください。');
      return;
    }
    
    // 入力方法を判定 (追加)
    const answerMethod = {
      debitByInput: !!userDebitInput,
      creditByInput: !!userCreditInput,
      isInputOnly: !!userDebitInput && !!userCreditInput
    };
    
    let isCorrect = false;
    let matchedAnswer = null;
    
    // correctAnswers配列があれば、そこから正解をチェック
    if (problem.correctAnswers && Array.isArray(problem.correctAnswers)) {
      // 複数の正解パターンをチェック
      for (const answer of problem.correctAnswers) {
        if (userDebit === answer.debit && userCredit === answer.credit) {
          isCorrect = true;
          matchedAnswer = answer;
          break;
        }
      }
    } 
    // 従来の単一のcorrectAnswerの場合
    else if (problem.correctAnswer) {
      isCorrect = (userDebit === problem.correctAnswer.debit && 
                  userCredit === problem.correctAnswer.credit);
      matchedAnswer = problem.correctAnswer;
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
        // 一致した回答パターンを表示
        const correctDebit = matchedAnswer ? matchedAnswer.debit : problem.correctAnswer.debit;
        const correctCredit = matchedAnswer ? matchedAnswer.credit : problem.correctAnswer.credit;
        const methodText = matchedAnswer && matchedAnswer.method ? `（${matchedAnswer.method}）` : '';
        
        explanationContainer.innerHTML = `
          <h4>正解${methodText}</h4>
          <p>借方：${correctDebit}<br>貸方：${correctCredit}</p>
        `;
      }
      
      // 進捗を保存（入力方法の情報を追加）
      this.saveProgress(problem.id, true, answerMethod);
      
      // 問題リストを更新（進捗表示のため）
      this.updateProblemList();
    } else {
      resultContainer.innerHTML = `
        <div class="incorrect">✗ 不正解です。もう一度試してください。</div>
      `;
      // 進捗を保存（不正解）
      this.saveProgress(problem.id, false, answerMethod);
    }
  }
  
  // 勘定入力フォーム用のカスタムスタイル追加
  addCustomStylesForEntryForm() {
    // スタイルが既に存在する場合は追加しない
    if (document.getElementById('entry-form-styles')) return;
    
    const styleElement = document.createElement('style');
    styleElement.id = 'entry-form-styles';
    styleElement.textContent = `
      .flex-column-container {
        display: flex;
        flex-direction: column;
        gap: 8px;
        width: 80%;
      }
      
      .input-row {
        width: 100%;
      }
      
      .or-label {
        width: 70px;
        color: #6c757d;
        font-size: 14px;
        text-align: right;
        padding-right: 10px;
        display: flex;
        align-items: center;
      }
      
      .selector-row {
        display: flex;
        gap: 10px;
        align-items: center;
      }
      
      .input-group {
        flex: 1;
        min-width: 0;
      }
      
      .form-control {
        width: 100%;
        padding: 8px;
        border: 1px solid #ccc;
        border-radius: 4px;
        font-size: 14px;
      }
      
      .entry-row {
        margin-bottom: 15px;
        display: flex;
        align-items: flex-start;
      }
      
      .entry-row label {
        display: inline-block;
        margin-bottom: 0;
        margin-right: 15px;
        font-weight: bold;
        width: 70px;
        padding-top: 8px;
      }
      
      #check-answer-btn {
        margin-top: 15px;
      }
    `;
    document.head.appendChild(styleElement);
  }

  // 前の問題を表示
  showPreviousProblem() {
    if (!this.currentProblemId) return;
    
    // 問題データをID順にソート
    const sortedProblems = [...this.problems].sort((a, b) => a.id.localeCompare(b.id));
    
    // 現在の問題のインデックスを取得
    const currentIndex = sortedProblems.findIndex(p => p.id === this.currentProblemId);
    if (currentIndex === -1) return;
    
    let prevIndex;
    if (currentIndex <= 0) {
      // 最初の問題の場合は最後の問題に移動
      prevIndex = sortedProblems.length - 1;
    } else {
      // 1つ前の問題に移動
      prevIndex = currentIndex - 1;
    }
    
    this.displayProblem(sortedProblems[prevIndex].id);
    
    // 問題リストをスクロールして現在の問題を表示
    setTimeout(() => {
      const currentItem = document.querySelector(`#bookkeeping-tab .problem-list-items li[data-id="${this.currentProblemId}"]`);
      if (currentItem) {
        currentItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  }

  // 次の問題を表示
  showNextProblem() {
    if (!this.currentProblemId) return;
    
    // 問題データをID順にソート
    const sortedProblems = [...this.problems].sort((a, b) => a.id.localeCompare(b.id));
    
    // 現在の問題のインデックスを取得
    const currentIndex = sortedProblems.findIndex(p => p.id === this.currentProblemId);
    if (currentIndex === -1) return;
    
    let nextIndex;
    if (currentIndex >= sortedProblems.length - 1) {
      // 最後の問題の場合は最初の問題に移動
      nextIndex = 0;
    } else {
      // 1つ次の問題に移動
      nextIndex = currentIndex + 1;
    }
    
    this.displayProblem(sortedProblems[nextIndex].id);
    
    // 問題リストをスクロールして現在の問題を表示
    setTimeout(() => {
      const currentItem = document.querySelector(`#bookkeeping-tab .problem-list-items li[data-id="${this.currentProblemId}"]`);
      if (currentItem) {
        currentItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  }

  // 次の未修了問題を表示
  showNextUnsolvedProblem() {
    const currentProblemId = document.querySelector('.problem-container').dataset.id;
    const progress = this.getProgress();
    
    // 現在の問題がどのカテゴリーに属しているか調べる
    const problem = this.problems.find(p => p.id === currentProblemId);
    if (!problem) return;
    
    const category = problem.category;
    
    // 同じカテゴリーの問題を取得
    const sameCategory = this.problems.filter(p => p.category === category);
    const currentIndex = sameCategory.findIndex(p => p.id === currentProblemId);
    
    // まず、同じカテゴリーの中で次の未解答問題を探す
    let nextUnsolvedProblem = null;
    for (let i = currentIndex + 1; i < sameCategory.length; i++) {
      // 未解答（countCorrectBySelect=0 かつ countCorrectByInput=0）なら選択
      if (!(progress[sameCategory[i].id]?.countCorrectBySelect > 0) && 
          !(progress[sameCategory[i].id]?.countCorrectByInput > 0)) {
        nextUnsolvedProblem = sameCategory[i];
        break;
      }
    }
    
    // 見つからなかったら、同カテゴリーの最初から探す
    if (!nextUnsolvedProblem) {
      for (let i = 0; i < currentIndex; i++) {
        if (!(progress[sameCategory[i].id]?.countCorrectBySelect > 0) && 
            !(progress[sameCategory[i].id]?.countCorrectByInput > 0)) {
          nextUnsolvedProblem = sameCategory[i];
          break;
        }
      }
    }
    
    // それでも見つからなかったら、次のカテゴリーの最初の問題を表示
    if (!nextUnsolvedProblem) {
      const nextProblem = this.getNextProblem(currentProblemId);
      if (nextProblem) {
        nextUnsolvedProblem = nextProblem;
      }
    }
    
    if (nextUnsolvedProblem) {
      this.displayProblem(nextUnsolvedProblem.id);
    } else {
      alert('未修了の問題はありません。');
    }
  }

  // 進捗を保存（サーバーへ）
  async saveProgress(problemId, isCorrect, answerMethod) {
    console.log('saveProgress called:', { problemId, isCorrect, answerMethod });
    
    try {
      // 現在の進捗データを取得
      const progress = await this.getProgress();
      console.log('Current progress:', progress);
      
      // 問題IDを文字列として扱う
      const id = problemId.toString();
      
      // 問題の記録を初期化または取得
      if (!progress[id]) {
        progress[id] = {
          isCorrect: false,
          countCorrectBySelect: 0,      // 選択肢で正解した回数
          countCorrectByInput: 0,       // 入力のみで正解した回数
          lastAttempt: null,
          answerMethod: null
        };
      }
      
      // 最終挑戦日時を更新
      progress[id].lastAttempt = new Date().toISOString();
      
      // 回答方法を記録
      progress[id].answerMethod = answerMethod;
      
      // 正解の場合
      if (isCorrect) {
        // 正解フラグを設定
        progress[id].isCorrect = true;
        
        // 入力のみの場合、入力正解回数をカウントアップ
        if (answerMethod && answerMethod.isInputOnly) {
          progress[id].countCorrectByInput = (progress[id].countCorrectByInput || 0) + 1;
          console.log(`問題ID ${id}: countCorrectByInput を ${progress[id].countCorrectByInput}に増加`);
        } 
        // 選択肢を使用した場合（片方でも選択肢を使っていれば）
        else {
          progress[id].countCorrectBySelect = (progress[id].countCorrectBySelect || 0) + 1;
          console.log(`問題ID ${id}: countCorrectBySelect を ${progress[id].countCorrectBySelect}に増加`);
        }
      }
      
      // サーバーに進捗データを保存
      const response = await fetch('/api/progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(progress)
      });
      
      if (!response.ok) {
        throw new Error(`サーバーからのエラー応答: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('Progress saved to server:', result);
      
      console.log('Progress updated');
    } catch (error) {
      console.error('進捗データの保存に失敗しました:', error);
      // エラー発生時にも現在のデータを表示（デバッグ用）
      try {
        const currentData = await this.getProgress();
        console.log('最新の進捗データ:', currentData);
      } catch (e) {
        console.error('現在の進捗データの取得にも失敗:', e);
      }
    }
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
      correctAnswer: problem.correctAnswer || problem.correctAnswers
    };
    
    // JSONの構造検証
    try {
      // コンテキストをJSON文字列に変換し、再度パースして検証
      const jsonString = JSON.stringify(context);
      JSON.parse(jsonString);
      
      // コンテキスト情報を隠しフィールドに保存
      const formattedContext = `#context: ${jsonString}`;
      document.getElementById('question-context').value = formattedContext;
      
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
    } catch (e) {
      console.error('コンテキストデータの生成中にエラーが発生しました:', e);
      alert('コンテキストデータの生成中にエラーが発生しました。後でもう一度試してください。');
    }
  }
}

// ページ読み込み完了時に初期化
document.addEventListener('DOMContentLoaded', () => {
  // 簿記タブボタンのイベントリスナーを追加
  const bookkeepingTabBtn = document.querySelector('.tab-btn[data-tab="bookkeeping"]');
  if (bookkeepingTabBtn) {
    bookkeepingTabBtn.addEventListener('click', () => {
      // このイベントはindex.htmlの新しいイベントハンドラで処理するため、ここは空にする
    });
  }
});