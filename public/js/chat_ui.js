// コンテキストパーサーをインポート
// const { processMessageText } = require('./context_parser');
// import { processMessageText } from './context_parser.js';

/**
 * メッセージテキストを処理する関数
 */
function processMessageText(message) {
  // メッセージが存在しない場合は空のオブジェクトを返す
  if (!message) return { role: 'user', text: '', displayText: '' };

  // メッセージオブジェクトをコピー
  const processedMessage = { ...message };

  // コンテキスト情報の処理
  if (processedMessage.text && processedMessage.text.includes('#context:')) {
    const parts = processedMessage.text.split('#context:');
    processedMessage.displayText = parts[0].trim();
    try {
      processedMessage.context = JSON.parse(parts[1].trim());
    } catch (e) {
      console.warn('コンテキスト情報の解析に失敗しました:', e);
      processedMessage.context = null;
    }
  } else {
    processedMessage.displayText = processedMessage.text;
  }

  return processedMessage;
}

/**
 * メッセージをUIに追加
 */
function addMessageToUI(message, isHistory = false) {
  // コンテキスト情報を処理してメッセージを整形
  const processedMessage = processMessageText(message);
  
  const messagesContainer = document.getElementById('messages-container');
  const messageElement = document.createElement('div');
  messageElement.classList.add('message');
  messageElement.classList.add(processedMessage.role === 'user' ? 'user-message' : 'assistant-message');
  
  if (processedMessage.id) {
    messageElement.setAttribute('data-message-id', processedMessage.id);
  }
  
  // 表示用テキストを使用（コンテキスト処理済み）
  const displayText = processedMessage.displayText || processedMessage.text || '';
  const textWithLineBreaks = displayText.replace(/\n/g, '<br>');
  
  messageElement.innerHTML = `
    <div class="message-header">
      <span class="message-role">${processedMessage.role === 'user' ? 'あなた' : 'AI アシスタント'}</span>
      <span class="message-time">${formatTimestamp(processedMessage.timestamp)}</span>
    </div>
    <div class="message-content">${textWithLineBreaks}</div>
  `;
  
  // ... existing code ...
}

// WebSocket接続の設定
// const socket = io(window.location.origin);

// socket.on('connect', () => {
//   console.log('WebSocketサーバーに接続しました');
// });

// socket.on('message_response', (response) => {
//   hideTypingIndicator();
//   addMessageToUI({
//     role: 'assistant',
//     text: response.text,
//     timestamp: Date.now()
//   });
// });

// socket.on('connect_error', (error) => {
//   console.error('WebSocket接続エラー:', error);
//   showError('サーバーへの接続に失敗しました');
// });

// 入力中インジケータの表示/非表示
function showTypingIndicator() {
  const typingIndicator = document.createElement('div');
  typingIndicator.id = 'typing-indicator';
  typingIndicator.className = 'message assistant-message typing';
  typingIndicator.innerHTML = '<div class="typing-dots"><span>.</span><span>.</span><span>.</span></div>';
  document.getElementById('messages-container').appendChild(typingIndicator);
}

function hideTypingIndicator() {
  const typingIndicator = document.getElementById('typing-indicator');
  if (typingIndicator) {
    typingIndicator.remove();
  }
}

/**
 * メッセージをサーバーに送信
 */
function sendMessage() {
  const inputField = document.getElementById('message-input');
  const message = inputField.value.trim();
  
  if (message === '') return;
  
  // ユーザーメッセージをUIに追加
  const userMessage = {
    role: 'user',
    text: message,
    timestamp: Date.now()
  };
  
  // コンテキスト情報を処理してから表示（必要な場合）
  addMessageToUI(userMessage);
  
  // メッセージ送信をサーバーに依頼
  // socket.emit('send_message', userMessage);
  fetch('/api/send-message', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(userMessage)
  })
  .then(response => response.json())
  .then(data => {
    hideTypingIndicator();
    if (data.text) {
      addMessageToUI({
        role: 'assistant',
        text: data.text,
        timestamp: Date.now()
      });
    }
  })
  .catch(error => {
    console.error('メッセージ送信エラー:', error);
    showError('メッセージの送信に失敗しました');
    hideTypingIndicator();
  });
  
  // 入力フィールドをクリア
  inputField.value = '';
  
  // 「送信中...」のメッセージを表示
  showTypingIndicator();
}

document.addEventListener('DOMContentLoaded', () => {
  const submitButton = document.getElementById('submit-btn');
  const questionInput = document.getElementById('question');
  const contextInput = document.getElementById('question-context');

  // 現在のホストとポートを取得
  const currentHost = window.location.host;

  submitButton.addEventListener('click', async () => {
    const question = questionInput.value.trim();
    const contextInstructions = contextInput.value;

    if (!question) {
      showError('質問を入力してください。');
      return;
    }

    try {
      // 送信ボタンを無効化
      submitButton.disabled = true;
      
      // ローディング表示
      showLoading();

      // サーバーに質問を送信（現在のホストを使用）
      const response = await fetch(`//${currentHost}/api/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          question,
          contextInstructions
        })
      });

      if (!response.ok) {
        throw new Error('質問の送信に失敗しました');
      }

      const data = await response.json();
      
      // 質問をUIに追加
      addMessageToUI({
        role: 'user',
        text: question,
        timestamp: Date.now()
      });

      // 入力フィールドをクリア
      questionInput.value = '';
      contextInput.value = '';

      // ステータス表示を更新
      showStatus('質問を受付中...');

      // 回答をポーリング
      pollForAnswer(data.questionId);

    } catch (error) {
      console.error('エラー:', error);
      showError('質問の送信中にエラーが発生しました。');
    } finally {
      // 送信ボタンを再度有効化
      submitButton.disabled = false;
      hideLoading();
    }
  });
});

// 回答をポーリングする関数
async function pollForAnswer(questionId) {
  // 現在のホストとポートを取得
  const currentHost = window.location.host;

  try {
    const response = await fetch(`//${currentHost}/api/check-answer/${questionId}`);
    const data = await response.json();

    if (data.status === 'completed') {
      // 回答をUIに追加
      addMessageToUI({
        role: 'assistant',
        text: data.answer,
        timestamp: Date.now()
      });
      hideStatus();
    } else {
      // まだ回答がない場合は再度ポーリング
      setTimeout(() => pollForAnswer(questionId), 2000);
    }
  } catch (error) {
    console.error('回答の確認中にエラーが発生しました:', error);
    showError('回答の確認中にエラーが発生しました。');
  }
}

// ローディング表示の関数
function showLoading() {
  const loadingIndicator = document.getElementById('loading-indicator');
  if (loadingIndicator) {
    loadingIndicator.style.display = 'block';
  }
}

function hideLoading() {
  const loadingIndicator = document.getElementById('loading-indicator');
  if (loadingIndicator) {
    loadingIndicator.style.display = 'none';
  }
}

// エラーメッセージ表示の関数
function showError(message) {
  const errorElement = document.getElementById('error-message');
  if (errorElement) {
    errorElement.textContent = message;
    errorElement.style.display = 'block';
    setTimeout(() => {
      errorElement.style.display = 'none';
    }, 5000);
  }
}

// ステータス表示の関数
function showStatus(message) {
  const statusContainer = document.getElementById('status-container');
  const statusText = document.getElementById('status-text');
  if (statusContainer && statusText) {
    statusText.textContent = message;
    statusContainer.style.display = 'block';
  }
}

function hideStatus() {
  const statusContainer = document.getElementById('status-container');
  if (statusContainer) {
    statusContainer.style.display = 'none';
  }
}

/**
 * タイムスタンプを日本語形式でフォーマット
 */
function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
}

// ... existing code ... 