document.addEventListener('DOMContentLoaded', function() {
  // タブ切り替えの処理
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');
  
  // 各タブボタンにイベントリスナーを追加
  tabBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      // アクティブなタブボタンのクラスを切り替え
      tabBtns.forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      
      // タブIDを取得（ボタンIDから "tab-btn" を削除）
      const tabId = this.id.replace('-btn', '');
      
      // 対応するタブペインを表示
      tabPanes.forEach(pane => {
        pane.classList.remove('active');
        if (pane.id === tabId) {
          pane.classList.add('active');
        }
      });
    });
  });
  
  // ダークモード切り替え
  const darkModeToggle = document.getElementById('dark-mode-toggle');
  if (darkModeToggle) {
    // ローカルストレージからダークモード設定を読み込む
    const isDarkMode = localStorage.getItem('darkMode') === 'true';
    document.body.classList.toggle('dark-mode', isDarkMode);
    darkModeToggle.checked = isDarkMode;
    
    // ダークモード切り替えイベント
    darkModeToggle.addEventListener('change', function() {
      document.body.classList.toggle('dark-mode', this.checked);
      localStorage.setItem('darkMode', this.checked);
    });
  }
  
  // 簿記問題管理クラスのインスタンスを初期化
  window.bookkeepingManager = new BookkeepingManager();
  
  // 質問チャット管理クラスのインスタンスを初期化
  window.chatManager = new ChatManager();
  
  console.log('アプリケーションが初期化されました');
});

function updateProgressBars(selectCount, inputCount, totalCount) {
    const selectRate = Math.round((selectCount / totalCount) * 100);
    const inputRate = Math.round((inputCount / totalCount) * 100);

    // 選択式の進捗を更新
    document.querySelector('.progress-section .select-type').style.width = `${selectRate}%`;
    document.querySelector('.progress-section .progress-item:first-child .progress-rate').textContent = 
        `${selectCount}/${totalCount} (${selectRate}%)`;

    // 入力式の進捗を更新
    document.querySelector('.progress-section .input-type').style.width = `${inputRate}%`;
    document.querySelector('.progress-section .progress-item:last-child .progress-rate').textContent = 
        `${inputCount}/${totalCount} (${inputRate}%)`;
}

// BookkeepingManagerのコンストラクタ内で進捗データを読み込んだ後に呼び出す
this.updateProgress = function() {
    let selectCount = 0;
    let inputCount = 0;
    const totalCount = Object.keys(this.problems).length;

    for (const id in this.userProgress) {
        if (this.userProgress[id].correct) {
            if (this.problems[id].type === 'select') {
                selectCount++;
            } else if (this.problems[id].type === 'input') {
                inputCount++;
            }
        }
    }

    updateProgressBars(selectCount, inputCount, totalCount);
}; 