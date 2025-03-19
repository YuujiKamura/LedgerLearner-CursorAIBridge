/**
 * スクリーンショットUIモジュール
 * スクリーンショットモジュールのUI関連の処理を提供します
 */
import ScreenshotManager from './screenshot.js';

class ScreenshotUI {
  constructor() {
    this.screenshotManager = new ScreenshotManager();
    this.container = null;
    this.previewElement = null;
    this.initialized = false;
    this.isCapturing = false;
  }

  /**
   * UIを初期化します
   * @param {string} containerId - UI要素を配置するコンテナのID
   * @returns {Promise<boolean>} 初期化が成功したかどうか
   */
  async initialize(containerId = 'screenshot-container') {
    try {
      // 既に初期化済みなら何もしない
      if (this.initialized) return true;

      // コンテナを取得または作成
      this.container = document.getElementById(containerId);
      if (!this.container) {
        // コンテナが存在しない場合は作成
        this.container = document.createElement('div');
        this.container.id = containerId;
        this.container.className = 'screenshot-container';
        document.body.appendChild(this.container);
      }

      // UIコンポーネントを作成
      this.createUIComponents();

      // スクリーンショットマネージャーを初期化
      await this.screenshotManager.initialize();

      this.initialized = true;
      return true;
    } catch (error) {
      console.error('スクリーンショットUIの初期化に失敗しました:', error);
      return false;
    }
  }

  /**
   * UI要素を作成します
   */
  createUIComponents() {
    // コンテナをクリア
    this.container.innerHTML = '';
    
    // スタイルを適用
    this.container.style.display = 'flex';
    this.container.style.flexDirection = 'column';
    this.container.style.gap = '10px';
    this.container.style.padding = '15px';
    this.container.style.backgroundColor = '#f8f9fa';
    this.container.style.border = '1px solid #e0e0e0';
    this.container.style.borderRadius = '6px';
    this.container.style.margin = '15px 0';
    
    // タイトル
    const title = document.createElement('h3');
    title.textContent = 'スクリーンショット';
    title.style.margin = '0 0 10px 0';
    
    // ボタングループ
    const buttonGroup = document.createElement('div');
    buttonGroup.style.display = 'flex';
    buttonGroup.style.gap = '10px';
    buttonGroup.style.marginBottom = '10px';
    
    // キャプチャボタン
    const captureButton = document.createElement('button');
    captureButton.textContent = '画面キャプチャ';
    captureButton.className = 'btn btn-primary';
    captureButton.style.padding = '8px 15px';
    captureButton.style.backgroundColor = '#007bff';
    captureButton.style.color = 'white';
    captureButton.style.border = 'none';
    captureButton.style.borderRadius = '4px';
    captureButton.style.cursor = 'pointer';
    captureButton.addEventListener('click', () => this.captureScreenshot());
    
    // クリップボードにコピーボタン
    const copyButton = document.createElement('button');
    copyButton.textContent = 'クリップボードにコピー';
    copyButton.className = 'btn btn-info';
    copyButton.style.padding = '8px 15px';
    copyButton.style.backgroundColor = '#17a2b8';
    copyButton.style.color = 'white';
    copyButton.style.border = 'none';
    copyButton.style.borderRadius = '4px';
    copyButton.style.cursor = 'pointer';
    copyButton.addEventListener('click', () => this.copyToClipboard());
    
    // ダウンロードボタン
    const downloadButton = document.createElement('button');
    downloadButton.textContent = 'ダウンロード';
    downloadButton.className = 'btn btn-success';
    downloadButton.style.padding = '8px 15px';
    downloadButton.style.backgroundColor = '#28a745';
    downloadButton.style.color = 'white';
    downloadButton.style.border = 'none';
    downloadButton.style.borderRadius = '4px';
    downloadButton.style.cursor = 'pointer';
    downloadButton.disabled = true; // 初期状態では無効
    downloadButton.addEventListener('click', () => this.downloadScreenshot());
    
    // クリアボタン
    const clearButton = document.createElement('button');
    clearButton.textContent = 'クリア';
    clearButton.className = 'btn btn-secondary';
    clearButton.style.padding = '8px 15px';
    clearButton.style.backgroundColor = '#6c757d';
    clearButton.style.color = 'white';
    clearButton.style.border = 'none';
    clearButton.style.borderRadius = '4px';
    clearButton.style.cursor = 'pointer';
    clearButton.disabled = true; // 初期状態では無効
    clearButton.addEventListener('click', () => this.clearScreenshot());
    
    // プレビュー領域
    const previewContainer = document.createElement('div');
    previewContainer.style.width = '100%';
    previewContainer.style.border = '1px dashed #ccc';
    previewContainer.style.borderRadius = '4px';
    previewContainer.style.backgroundColor = '#fff';
    previewContainer.style.padding = '5px';
    previewContainer.style.display = 'none';
    previewContainer.style.alignItems = 'center';
    previewContainer.style.justifyContent = 'center';
    previewContainer.style.minHeight = '200px';
    
    // プレビュー画像
    this.previewElement = document.createElement('img');
    this.previewElement.style.maxWidth = '100%';
    this.previewElement.style.maxHeight = '400px';
    this.previewElement.style.display = 'none';
    
    // ステータス表示
    const statusText = document.createElement('div');
    statusText.id = 'screenshot-status';
    statusText.style.fontSize = '14px';
    statusText.style.color = '#666';
    statusText.style.marginTop = '5px';
    statusText.textContent = '画面キャプチャボタンをクリックして開始してください';
    
    // 要素を追加
    buttonGroup.appendChild(captureButton);
    buttonGroup.appendChild(copyButton);
    buttonGroup.appendChild(downloadButton);
    buttonGroup.appendChild(clearButton);
    previewContainer.appendChild(this.previewElement);
    
    this.container.appendChild(title);
    this.container.appendChild(buttonGroup);
    this.container.appendChild(previewContainer);
    this.container.appendChild(statusText);
    
    // 参照を保持
    this.captureButton = captureButton;
    this.copyButton = copyButton;
    this.downloadButton = downloadButton;
    this.clearButton = clearButton;
    this.previewContainer = previewContainer;
    this.statusText = statusText;
  }

  /**
   * 画面キャプチャを開始します
   */
  async captureScreenshot() {
    if (!this.initialized) {
      await this.initialize();
    }
    
    this.updateStatus('キャプチャを開始します...');
    this.isCapturing = true;
    this.captureButton.disabled = true;
    
    try {
      const screenshotData = await this.screenshotManager.captureScreenshot();
      
      if (screenshotData) {
        // プレビュー表示
        this.previewElement.src = screenshotData;
        this.previewElement.style.display = 'block';
        this.previewContainer.style.display = 'flex';
        
        // ボタン状態更新
        this.downloadButton.disabled = false;
        this.clearButton.disabled = false;
        
        this.updateStatus('キャプチャが完了しました');
      } else {
        this.updateStatus('キャプチャに失敗しました', true);
      }
    } catch (error) {
      console.error('キャプチャ中にエラーが発生しました:', error);
      this.updateStatus('キャプチャ中にエラーが発生しました', true);
    } finally {
      this.isCapturing = false;
      this.captureButton.disabled = false;
    }
  }

  /**
   * クリップボードにスクリーンショットをコピーします
   */
  async copyToClipboard() {
    if (!this.initialized) {
      await this.initialize();
    }
    
    this.updateStatus('クリップボードにコピーします...');
    this.copyButton.disabled = true;
    
    try {
      const success = await this.screenshotManager.copyToClipboard();
      
      if (success) {
        this.updateStatus('クリップボードにコピーしました');
        
        // 少し待ってから状態を元に戻す
        setTimeout(() => {
          this.copyButton.disabled = false;
        }, 1000);
      } else {
        this.updateStatus('クリップボードへのコピーに失敗しました', true);
        this.copyButton.disabled = false;
      }
    } catch (error) {
      console.error('クリップボードへのコピー中にエラーが発生しました:', error);
      this.updateStatus('クリップボードへのコピー中にエラーが発生しました', true);
      this.copyButton.disabled = false;
    }
  }

  /**
   * スクリーンショットをダウンロードします
   */
  downloadScreenshot() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').split('Z')[0];
    const filename = `screenshot_${timestamp}.png`;
    
    const result = this.screenshotManager.downloadScreenshot(filename);
    
    if (result) {
      this.updateStatus(`スクリーンショットを保存しました: ${filename}`);
    } else {
      this.updateStatus('スクリーンショットの保存に失敗しました', true);
    }
  }

  /**
   * スクリーンショットをクリアします
   */
  clearScreenshot() {
    this.previewElement.src = '';
    this.previewElement.style.display = 'none';
    this.previewContainer.style.display = 'none';
    this.downloadButton.disabled = true;
    this.clearButton.disabled = true;
    
    // スクリーンショットマネージャーのキャプチャを停止
    this.screenshotManager.stopCapture();
    
    this.updateStatus('キャプチャをクリアしました');
  }

  /**
   * ステータスを更新します
   * @param {string} message - ステータスメッセージ
   * @param {boolean} isError - エラーかどうか
   */
  updateStatus(message, isError = false) {
    this.statusText.textContent = message;
    this.statusText.style.color = isError ? '#dc3545' : '#666';
  }

  /**
   * モジュールを破棄します
   */
  dispose() {
    if (this.screenshotManager) {
      this.screenshotManager.dispose();
    }
    
    if (this.container) {
      this.container.innerHTML = '';
    }
    
    this.initialized = false;
  }
}

// ESモジュールとしてエクスポート
export default ScreenshotUI; 