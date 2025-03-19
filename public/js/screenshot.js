/**
 * スクリーンショットモジュール
 * ブラウザのMediaDevices APIを使用して画面キャプチャを行います
 */
class ScreenshotManager {
  constructor() {
    this.stream = null;
    this.videoElement = null;
    this.canvasElement = null;
    this.screenshotData = null;
    this.initialized = false;
  }

  /**
   * モジュールを初期化します
   * @returns {Promise<boolean>} 初期化が成功したかどうか
   */
  async initialize() {
    try {
      // 既に初期化済みなら何もしない
      if (this.initialized) return true;

      // 非表示のビデオ要素とキャンバス要素を作成
      this.videoElement = document.createElement('video');
      this.videoElement.style.position = 'fixed';
      this.videoElement.style.top = '-9999px';
      this.videoElement.style.left = '-9999px';
      this.videoElement.style.width = '100%';
      this.videoElement.style.height = 'auto';
      this.videoElement.autoplay = true;
      
      this.canvasElement = document.createElement('canvas');
      this.canvasElement.style.display = 'none';
      
      document.body.appendChild(this.videoElement);
      document.body.appendChild(this.canvasElement);

      this.initialized = true;
      return true;
    } catch (error) {
      console.error('スクリーンショットモジュールの初期化に失敗しました:', error);
      return false;
    }
  }

  /**
   * 画面共有を開始します
   * @returns {Promise<boolean>} 画面共有の開始が成功したかどうか
   */
  async startCapture() {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      // ユーザーに画面共有を求める
      this.stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: 'always',
          displaySurface: 'monitor'
        }
      });
      
      // 画面共有ストリームをビデオ要素に接続
      this.videoElement.srcObject = this.stream;
      
      // トラックが終了したらクリーンアップ
      this.stream.getVideoTracks()[0].onended = () => {
        this.stopCapture();
      };
      
      return true;
    } catch (error) {
      console.error('画面共有の開始に失敗しました:', error);
      return false;
    }
  }

  /**
   * スクリーンショットを撮影します
   * @returns {Promise<string|null>} スクリーンショットのデータURI（失敗した場合はnull）
   */
  async captureScreenshot() {
    try {
      if (!this.stream) {
        const started = await this.startCapture();
        if (!started) return null;
      }
      
      // 少し待ってからキャプチャ（ビデオフレームがロードされるのを待つ）
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // キャンバスのサイズをビデオソースに合わせる
      const videoTrack = this.stream.getVideoTracks()[0];
      const settings = videoTrack.getSettings();
      this.canvasElement.width = settings.width;
      this.canvasElement.height = settings.height;
      
      // ビデオフレームをキャンバスに描画
      const context = this.canvasElement.getContext('2d');
      context.drawImage(this.videoElement, 0, 0, settings.width, settings.height);
      
      // キャンバスから画像データを取得
      this.screenshotData = this.canvasElement.toDataURL('image/png');
      
      return this.screenshotData;
    } catch (error) {
      console.error('スクリーンショットの撮影に失敗しました:', error);
      return null;
    }
  }

  /**
   * スクリーンショットをクリップボードにコピーします
   * @returns {Promise<boolean>} コピーが成功したかどうか
   */
  async copyToClipboard() {
    try {
      if (!this.screenshotData) {
        // スクリーンショットがなければ撮影
        const data = await this.captureScreenshot();
        if (!data) return false;
      }

      // Canvas要素を取得
      const canvas = this.canvasElement;
      
      // 新しいClipboard API（Chrome 66以降）を使用
      if (navigator.clipboard && navigator.clipboard.write) {
        return new Promise((resolve) => {
          canvas.toBlob(async (blob) => {
            try {
              const item = new ClipboardItem({ 'image/png': blob });
              await navigator.clipboard.write([item]);
              console.log('スクリーンショットをクリップボードにコピーしました');
              resolve(true);
            } catch (err) {
              console.error('クリップボードへのコピーに失敗しました:', err);
              // APIのエラー後はフォールバック方法を試す
              const fallbackResult = await this.fallbackClipboardCopy();
              resolve(fallbackResult);
            }
          }, 'image/png');
        });
      } else {
        // 代替方法を使用
        return await this.fallbackClipboardCopy();
      }
    } catch (error) {
      console.error('クリップボードへのコピーに失敗しました:', error);
      return false;
    }
  }

  /**
   * クリップボードへのコピーの代替方法
   * @returns {Promise<boolean>} コピーが成功したかどうか
   * @private
   */
  async fallbackClipboardCopy() {
    try {
      // 画像をクリップボードにコピーするための一時的な要素を作成
      const img = document.createElement('img');
      img.src = this.screenshotData;
      
      const div = document.createElement('div');
      div.contentEditable = true;
      div.style.position = 'fixed';
      div.style.opacity = 0;
      div.style.pointerEvents = 'none'; // 操作不可能に
      
      document.body.appendChild(div);
      div.appendChild(img);
      
      // 範囲を選択
      const range = document.createRange();
      range.selectNode(div);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      
      // コピーコマンドを実行
      const success = document.execCommand('copy');
      
      // 後片付け
      selection.removeAllRanges();
      document.body.removeChild(div);
      
      console.log('スクリーンショットをクリップボードにコピーしました（代替方法）');
      return success;
    } catch (err) {
      console.error('クリップボードへのコピーに失敗しました（代替方法）:', err);
      return false;
    }
  }

  /**
   * スクリーンショットをダウンロードします
   * @param {string} filename - ダウンロードするファイル名（拡張子を含む）
   * @returns {boolean} ダウンロードが成功したかどうか
   */
  downloadScreenshot(filename = 'screenshot.png') {
    try {
      if (!this.screenshotData) {
        console.error('スクリーンショットが撮影されていません');
        return false;
      }
      
      // ダウンロードリンクを作成
      const link = document.createElement('a');
      link.href = this.screenshotData;
      link.download = filename;
      link.style.display = 'none';
      document.body.appendChild(link);
      
      // リンクをクリックしてダウンロードを開始
      link.click();
      
      // リンクを削除
      document.body.removeChild(link);
      
      return true;
    } catch (error) {
      console.error('スクリーンショットのダウンロードに失敗しました:', error);
      return false;
    }
  }

  /**
   * キャプチャを停止し、リソースを解放します
   */
  stopCapture() {
    if (this.stream) {
      const tracks = this.stream.getTracks();
      tracks.forEach(track => track.stop());
      this.stream = null;
    }
    
    if (this.videoElement) {
      this.videoElement.srcObject = null;
    }
  }

  /**
   * モジュールを破棄し、作成したDOMエレメントを削除します
   */
  dispose() {
    this.stopCapture();
    
    if (this.videoElement && this.videoElement.parentNode) {
      this.videoElement.parentNode.removeChild(this.videoElement);
    }
    
    if (this.canvasElement && this.canvasElement.parentNode) {
      this.canvasElement.parentNode.removeChild(this.canvasElement);
    }
    
    this.initialized = false;
    this.screenshotData = null;
  }
}

// ESモジュールとしてエクスポート
export default ScreenshotManager; 