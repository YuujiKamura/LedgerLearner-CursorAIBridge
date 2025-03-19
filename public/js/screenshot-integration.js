/**
 * スクリーンショット統合モジュール
 * スクリーンショット機能を既存のアプリケーションに統合するためのユーティリティ
 */

// ES Module用の記法
import ScreenshotManager from './screenshot.js';
import ScreenshotUI from './screenshotUI.js';

/**
 * スクリーンショット機能をページに追加します
 * @param {Object} options - 設定オプション
 * @param {string} options.containerId - スクリーンショットUIを配置するコンテナのID（デフォルト: 'screenshot-container'）
 * @param {boolean} options.createContainer - コンテナが存在しない場合に作成するか（デフォルト: true）
 * @param {string} options.containerParent - コンテナの親要素のセレクタ（デフォルト: 'body'）
 * @param {string} options.buttonText - キャプチャボタンのテキスト（デフォルト: '画面キャプチャ'）
 * @returns {Promise<Object>} スクリーンショットUI管理オブジェクト
 */
export async function addScreenshotFeature(options = {}) {
  const {
    containerId = 'screenshot-container',
    createContainer = true,
    containerParent = 'body',
    buttonText = '画面キャプチャ'
  } = options;

  try {
    // コンテナを取得または作成
    let container = document.getElementById(containerId);
    
    if (!container && createContainer) {
      container = document.createElement('div');
      container.id = containerId;
      container.className = 'screenshot-container';
      
      const parent = document.querySelector(containerParent) || document.body;
      parent.appendChild(container);
    }
    
    // UIを初期化
    const screenshotUI = new ScreenshotUI();
    await screenshotUI.initialize(containerId);
    
    // ボタンテキストをカスタマイズ
    if (buttonText && screenshotUI.captureButton) {
      screenshotUI.captureButton.textContent = buttonText;
    }
    
    return {
      ui: screenshotUI,
      container,
      captureScreenshot: () => screenshotUI.captureScreenshot(),
      copyToClipboard: () => screenshotUI.copyToClipboard(),
      downloadScreenshot: (filename) => screenshotUI.downloadScreenshot(filename),
      dispose: () => screenshotUI.dispose()
    };
  } catch (error) {
    console.error('スクリーンショット機能の追加に失敗しました:', error);
    throw error;
  }
}

/**
 * 設定タブなどの特定の要素にスクリーンショット機能を追加します
 * @param {string} targetSelector - 機能を追加する対象要素のセレクタ
 * @returns {Promise<Object>} スクリーンショットUI管理オブジェクト
 */
export async function addScreenshotToSettings(targetSelector = '#settings-tab') {
  try {
    const targetElement = document.querySelector(targetSelector);
    if (!targetElement) {
      console.error(`対象要素が見つかりません: ${targetSelector}`);
      return null;
    }
    
    // スクリーンショットセクションを作成
    const sectionContainer = document.createElement('div');
    sectionContainer.className = 'screenshot-section';
    sectionContainer.style.marginTop = '20px';
    
    // セクションタイトル
    const sectionTitle = document.createElement('h3');
    sectionTitle.textContent = 'スクリーンショット';
    sectionTitle.style.marginBottom = '10px';
    
    // セクション説明
    const sectionDesc = document.createElement('p');
    sectionDesc.textContent = '画面キャプチャ機能を使用して、現在の画面を保存またはクリップボードにコピーできます。';
    sectionDesc.style.marginBottom = '15px';
    sectionDesc.style.color = '#666';
    sectionDesc.style.fontSize = '14px';
    
    // スクリーンショットコンテナ
    const screenshotContainer = document.createElement('div');
    screenshotContainer.id = 'settings-screenshot-container';
    
    // 要素を追加
    sectionContainer.appendChild(sectionTitle);
    sectionContainer.appendChild(sectionDesc);
    sectionContainer.appendChild(screenshotContainer);
    
    // 区切り線を追加
    const hr = document.createElement('hr');
    hr.style.margin = '20px 0';
    sectionContainer.insertAdjacentElement('beforebegin', hr);
    
    // ターゲット要素に追加
    targetElement.appendChild(sectionContainer);
    
    // スクリーンショット機能を初期化して返す
    return await addScreenshotFeature({
      containerId: 'settings-screenshot-container',
      createContainer: false,
      buttonText: '画面をキャプチャする'
    });
  } catch (error) {
    console.error('設定タブへのスクリーンショット機能の追加に失敗しました:', error);
    return null;
  }
}

/**
 * グローバルなスクリーンショットツールバーをページに追加します
 * @returns {Promise<Object>} スクリーンショットUI管理オブジェクト
 */
export async function addScreenshotToolbar() {
  try {
    // ツールバー要素を作成
    const toolbar = document.createElement('div');
    toolbar.id = 'screenshot-toolbar';
    toolbar.className = 'screenshot-toolbar';
    toolbar.style.position = 'fixed';
    toolbar.style.bottom = '20px';
    toolbar.style.right = '20px';
    toolbar.style.zIndex = '9999';
    toolbar.style.backgroundColor = '#fff';
    toolbar.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
    toolbar.style.borderRadius = '6px';
    toolbar.style.padding = '10px';
    toolbar.style.display = 'flex';
    toolbar.style.gap = '10px';
    
    // キャプチャボタン
    const captureButton = document.createElement('button');
    captureButton.textContent = '📷 キャプチャ';
    captureButton.style.padding = '8px 15px';
    captureButton.style.backgroundColor = '#007bff';
    captureButton.style.color = 'white';
    captureButton.style.border = 'none';
    captureButton.style.borderRadius = '4px';
    captureButton.style.cursor = 'pointer';
    
    // クリップボードコピーボタン
    const copyButton = document.createElement('button');
    copyButton.textContent = '📋 コピー';
    copyButton.style.padding = '8px 15px';
    copyButton.style.backgroundColor = '#17a2b8';
    copyButton.style.color = 'white';
    copyButton.style.border = 'none';
    copyButton.style.borderRadius = '4px';
    copyButton.style.cursor = 'pointer';
    
    toolbar.appendChild(captureButton);
    toolbar.appendChild(copyButton);
    document.body.appendChild(toolbar);
    
    // スクリーンショットマネージャー
    const manager = new ScreenshotManager();
    await manager.initialize();
    
    // キャプチャボタンのイベントリスナー
    captureButton.addEventListener('click', async () => {
      try {
        captureButton.disabled = true;
        captureButton.textContent = '処理中...';
        
        const screenshotData = await manager.captureScreenshot();
        if (screenshotData) {
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').split('Z')[0];
          const filename = `screenshot_${timestamp}.png`;
          manager.downloadScreenshot(filename);
          
          // 成功表示
          captureButton.textContent = '✓ 保存完了';
          captureButton.style.backgroundColor = '#28a745';
          
          setTimeout(() => {
            captureButton.textContent = '📷 キャプチャ';
            captureButton.style.backgroundColor = '#007bff';
            captureButton.disabled = false;
          }, 2000);
        } else {
          throw new Error('キャプチャに失敗しました');
        }
      } catch (error) {
        console.error('スクリーンショットの取得に失敗しました:', error);
        
        // エラー表示
        captureButton.textContent = '✕ エラー';
        captureButton.style.backgroundColor = '#dc3545';
        
        setTimeout(() => {
          captureButton.textContent = '📷 キャプチャ';
          captureButton.style.backgroundColor = '#007bff';
          captureButton.disabled = false;
        }, 2000);
      }
    });
    
    // クリップボードコピーボタンのイベントリスナー
    copyButton.addEventListener('click', async () => {
      try {
        copyButton.disabled = true;
        copyButton.textContent = '処理中...';
        
        const success = await manager.copyToClipboard();
        if (success) {
          // 成功表示
          copyButton.textContent = '✓ コピー完了';
          copyButton.style.backgroundColor = '#28a745';
          
          setTimeout(() => {
            copyButton.textContent = '📋 コピー';
            copyButton.style.backgroundColor = '#17a2b8';
            copyButton.disabled = false;
          }, 2000);
        } else {
          throw new Error('クリップボードへのコピーに失敗しました');
        }
      } catch (error) {
        console.error('クリップボードへのコピーに失敗しました:', error);
        
        // エラー表示
        copyButton.textContent = '✕ エラー';
        copyButton.style.backgroundColor = '#dc3545';
        
        setTimeout(() => {
          copyButton.textContent = '📋 コピー';
          copyButton.style.backgroundColor = '#17a2b8';
          copyButton.disabled = false;
        }, 2000);
      }
    });
    
    return {
      toolbar,
      manager,
      captureScreenshot: () => manager.captureScreenshot(),
      copyToClipboard: () => manager.copyToClipboard(),
      downloadScreenshot: (filename) => manager.downloadScreenshot(filename),
      dispose: () => {
        manager.dispose();
        if (toolbar.parentNode) {
          toolbar.parentNode.removeChild(toolbar);
        }
      }
    };
  } catch (error) {
    console.error('スクリーンショットツールバーの追加に失敗しました:', error);
    return null;
  }
}

// デフォルトエクスポート
export default {
  addScreenshotFeature,
  addScreenshotToSettings,
  addScreenshotToolbar,
  ScreenshotManager,
  ScreenshotUI
};

// CommonJS形式のエクスポートも定義（Node.js環境で使用する場合）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    addScreenshotFeature,
    addScreenshotToSettings,
    addScreenshotToolbar,
    ScreenshotManager,
    ScreenshotUI
  };
} 