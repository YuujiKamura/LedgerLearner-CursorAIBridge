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