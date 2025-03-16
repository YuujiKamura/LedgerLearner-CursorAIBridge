/**
 * ブラウザエラーロガー
 * DevToolsコンソールで発生するエラーを捕捉してサーバーに送信
 */
(function() {
  // 制限設定
  const MAX_ERRORS_PER_MINUTE = 5;
  let errorCount = 0;
  let lastErrorTime = 0;
  
  // 定期的にエラーカウントをリセット
  setInterval(() => {
    errorCount = 0;
  }, 60000);
  
  // コンソールエラーをキャプチャ
  const originalConsoleError = console.error;
  console.error = function() {
    // 元のconsole.errorを呼び出す
    originalConsoleError.apply(console, arguments);
    
    // エラー送信の制限チェック
    const now = Date.now();
    if (now - lastErrorTime < 1000) {
      errorCount++;
      if (errorCount > MAX_ERRORS_PER_MINUTE) {
        return; // 制限を超えたらスキップ
      }
    } else {
      lastErrorTime = now;
      errorCount = 1;
    }
    
    // エラー情報をサーバーに送信
    const errorData = {
      type: 'console.error',
      message: Array.from(arguments).map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' '),
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent
    };
    
    sendErrorToServer(errorData);
  };
  
  // 未処理のエラーをキャプチャ
  window.addEventListener('error', function(event) {
    // エラー送信の制限チェック
    const now = Date.now();
    if (now - lastErrorTime < 1000) {
      errorCount++;
      if (errorCount > MAX_ERRORS_PER_MINUTE) return;
    } else {
      lastErrorTime = now;
      errorCount = 1;
    }
    
    const errorData = {
      type: 'uncaught.error',
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      stack: event.error ? event.error.stack : '',
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent
    };
    
    sendErrorToServer(errorData);
  });
  
  // Promise拒否をキャプチャ
  window.addEventListener('unhandledrejection', function(event) {
    // エラー送信の制限チェック
    const now = Date.now();
    if (now - lastErrorTime < 1000) {
      errorCount++;
      if (errorCount > MAX_ERRORS_PER_MINUTE) return;
    } else {
      lastErrorTime = now;
      errorCount = 1;
    }
    
    const errorData = {
      type: 'unhandled.rejection',
      message: event.reason ? (event.reason.message || String(event.reason)) : 'Promise拒否',
      stack: event.reason && event.reason.stack ? event.reason.stack : '',
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent
    };
    
    sendErrorToServer(errorData);
  });
  
  // エラーをサーバーに送信する関数
  function sendErrorToServer(errorData) {
    try {
      fetch('/api/client-errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(errorData)
      }).catch(err => {
        // エラー送信自体が失敗した場合は元のconsole.errorで出力（ただし無限ループは防止）
        originalConsoleError('[エラーロガー] エラー送信失敗:', err.message);
      });
    } catch (err) {
      // エラー送信処理自体でエラーが発生した場合
      originalConsoleError('[エラーロガー] 内部エラー:', err.message);
    }
  }
  
  // 初期化メッセージ
  console.log('[エラーロガー] 初期化完了：ブラウザエラーの捕捉を開始しました（制限: 分間' + MAX_ERRORS_PER_MINUTE + '件）');
  
  // 自動テストは無効化（安全のため）
})(); 