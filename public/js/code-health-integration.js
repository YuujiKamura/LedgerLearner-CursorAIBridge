/**
 * コード健全性チェッカーの統合モジュール
 * 既存のアプリケーションにコード健全性チェッカーを統合するためのモジュール
 */

class CodeHealthIntegration {
  constructor() {
    this.checker = null;
    this.ui = null;
    this.isInitialized = false;
    this.config = {
      autoInitialize: true,
      checkOnSave: true,
      reportThreshold: 75, // 健全性スコアがこの値以下の場合に警告を表示
      ignoredIssues: [],
      ignoredFiles: []
    };
  }

  /**
   * 初期化する
   * @param {Object} config - 設定オブジェクト
   */
  async initialize(config = {}) {
    // 既に初期化されている場合は何もしない
    if (this.isInitialized) return;
    
    console.log('コード健全性チェッカー統合モジュールを初期化しています...');
    
    // 設定をマージ
    this.config = { ...this.config, ...config };
    
    // 必要なスクリプトの読み込み
    await this.loadDependencies();
    
    // チェッカーとUIのインスタンスを作成
    this.checker = new CodeHealthChecker();
    this.ui = new CodeHealthUI();
    
    // イベントリスナーの設定
    this.setupEventListeners();
    
    // サイドパネルを追加
    this.addSidePanel();
    
    // ナビゲーションメニューを追加
    this.addNavMenuItem();
    
    this.isInitialized = true;
    console.log('コード健全性チェッカー統合モジュールの初期化が完了しました');
  }

  /**
   * 依存関係を読み込む
   */
  async loadDependencies() {
    return new Promise((resolve, reject) => {
      // 既にスクリプトが読み込まれているかチェック
      if (window.CodeHealthChecker && window.CodeHealthUI) {
        resolve();
        return;
      }
      
      let loadedCount = 0;
      const requiredCount = 2;
      
      // code-health-checker.js が読み込まれていない場合は読み込む
      if (!window.CodeHealthChecker) {
        const checkerScript = document.createElement('script');
        checkerScript.src = 'js/code-health-checker.js';
        checkerScript.async = true;
        
        checkerScript.onload = () => {
          loadedCount++;
          if (loadedCount === requiredCount) {
            resolve();
          }
        };
        
        checkerScript.onerror = (error) => {
          reject(new Error(`code-health-checker.js の読み込みに失敗しました: ${error}`));
        };
        
        document.head.appendChild(checkerScript);
      } else {
        loadedCount++;
      }
      
      // code-health-ui.js が読み込まれていない場合は読み込む
      if (!window.CodeHealthUI) {
        const uiScript = document.createElement('script');
        uiScript.src = 'js/code-health-ui.js';
        uiScript.async = true;
        
        uiScript.onload = () => {
          loadedCount++;
          if (loadedCount === requiredCount) {
            resolve();
          }
        };
        
        uiScript.onerror = (error) => {
          reject(new Error(`code-health-ui.js の読み込みに失敗しました: ${error}`));
        };
        
        document.head.appendChild(uiScript);
      } else {
        loadedCount++;
      }
      
      // 両方既に読み込まれている場合
      if (loadedCount === requiredCount) {
        resolve();
      }
    });
  }

  /**
   * イベントリスナーを設定する
   */
  setupEventListeners() {
    // 保存時にチェックを実行
    if (this.config.checkOnSave) {
      this.hookSaveEvents();
    }
    
    // ウィンドウのリサイズイベントに対応
    window.addEventListener('resize', () => {
      this.adjustSidePanelHeight();
    });
  }

  /**
   * 保存イベントをフックする
   */
  hookSaveEvents() {
    // BookkeepingApp クラスの saveProgress メソッドをフックする
    if (window.BookkeepingApp) {
      const originalSaveProgress = BookkeepingApp.prototype.saveProgress;
      
      BookkeepingApp.prototype.saveProgress = async function(...args) {
        // 元のメソッドを実行
        const result = await originalSaveProgress.apply(this, args);
        
        // 健全性チェックを実行
        if (window.codeHealthIntegration && window.codeHealthIntegration.isInitialized) {
          window.codeHealthIntegration.check();
        }
        
        return result;
      };
      
      console.log('BookkeepingApp.saveProgress メソッドをフックしました');
    }
    
    // ScreenshotManager クラスの saveScreenshot メソッドをフックする
    if (window.ScreenshotManager) {
      const originalSaveScreenshot = ScreenshotManager.prototype.saveScreenshot;
      
      ScreenshotManager.prototype.saveScreenshot = async function(...args) {
        // 元のメソッドを実行
        const result = await originalSaveScreenshot.apply(this, args);
        
        // 健全性チェックを実行
        if (window.codeHealthIntegration && window.codeHealthIntegration.isInitialized) {
          window.codeHealthIntegration.check();
        }
        
        return result;
      };
      
      console.log('ScreenshotManager.saveScreenshot メソッドをフックしました');
    }
  }

  /**
   * サイドパネルを追加する
   */
  addSidePanel() {
    const sidePanel = document.createElement('div');
    sidePanel.id = 'code-health-side-panel';
    sidePanel.className = 'side-panel';
    sidePanel.style.display = 'none';
    
    // スタイル設定
    Object.assign(sidePanel.style, {
      position: 'fixed',
      top: '60px', // ヘッダーの下
      right: '0',
      width: '300px',
      height: 'calc(100vh - 60px)',
      backgroundColor: '#fff',
      boxShadow: '-2px 0 5px rgba(0, 0, 0, 0.1)',
      zIndex: '1000',
      overflowY: 'auto',
      transition: 'transform 0.3s ease',
      transform: 'translateX(100%)'
    });
    
    // コンテンツ
    sidePanel.innerHTML = `
      <div class="side-panel-header">
        <h3>コード健全性</h3>
        <button id="close-side-panel" aria-label="パネルを閉じる">&times;</button>
      </div>
      <div id="side-panel-content"></div>
    `;
    
    // スタイルを追加
    const style = document.createElement('style');
    style.textContent = `
      .side-panel-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 15px;
        background-color: #3498db;
        color: white;
      }
      
      .side-panel-header h3 {
        margin: 0;
        font-size: 16px;
      }
      
      #close-side-panel {
        background: none;
        border: none;
        color: white;
        font-size: 20px;
        cursor: pointer;
      }
      
      #side-panel-content {
        padding: 15px;
      }
      
      /* ダークテーマ対応 */
      @media (prefers-color-scheme: dark) {
        #code-health-side-panel {
          background-color: #2c3e50;
          color: #ecf0f1;
        }
      }
    `;
    
    document.head.appendChild(style);
    document.body.appendChild(sidePanel);
    
    // 閉じるボタンのイベントリスナー
    const closeButton = document.getElementById('close-side-panel');
    if (closeButton) {
      closeButton.addEventListener('click', () => {
        this.toggleSidePanel(false);
      });
    }
    
    // UIの初期化
    this.ui.initialize('side-panel-content');
  }

  /**
   * サイドパネルの表示/非表示を切り替える
   * @param {boolean} show - 表示する場合はtrue、非表示にする場合はfalse
   */
  toggleSidePanel(show = true) {
    const sidePanel = document.getElementById('code-health-side-panel');
    if (!sidePanel) return;
    
    if (show) {
      sidePanel.style.display = 'block';
      // 一瞬待ってからアニメーションを開始
      setTimeout(() => {
        sidePanel.style.transform = 'translateX(0)';
      }, 10);
      this.adjustSidePanelHeight();
    } else {
      sidePanel.style.transform = 'translateX(100%)';
      // アニメーション完了後に非表示にする
      setTimeout(() => {
        sidePanel.style.display = 'none';
      }, 300);
    }
  }

  /**
   * サイドパネルの高さを調整する
   */
  adjustSidePanelHeight() {
    const sidePanel = document.getElementById('code-health-side-panel');
    if (!sidePanel) return;
    
    const headerHeight = document.querySelector('header')?.offsetHeight || 60;
    sidePanel.style.top = `${headerHeight}px`;
    sidePanel.style.height = `calc(100vh - ${headerHeight}px)`;
  }

  /**
   * ナビゲーションメニューに項目を追加する
   */
  addNavMenuItem() {
    // ナビゲーションメニューを探す
    const nav = document.querySelector('nav ul') || document.querySelector('header ul');
    
    if (nav) {
      const menuItem = document.createElement('li');
      menuItem.className = 'nav-item';
      
      const link = document.createElement('a');
      link.href = '#';
      link.className = 'nav-link';
      link.textContent = 'コード健全性';
      link.addEventListener('click', (e) => {
        e.preventDefault();
        this.toggleSidePanel(true);
      });
      
      menuItem.appendChild(link);
      nav.appendChild(menuItem);
      
      console.log('ナビゲーションメニューに「コード健全性」項目を追加しました');
    } else {
      // ナビゲーションメニューが見つからない場合は、浮動ボタンを追加
      this.addFloatingButton();
    }
  }

  /**
   * 浮動ボタンを追加する
   */
  addFloatingButton() {
    const button = document.createElement('button');
    button.id = 'code-health-floating-button';
    button.textContent = '健全性チェック';
    
    // スタイル設定
    Object.assign(button.style, {
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      padding: '10px 15px',
      backgroundColor: '#3498db',
      color: 'white',
      border: 'none',
      borderRadius: '5px',
      boxShadow: '0 2px 5px rgba(0, 0, 0, 0.2)',
      cursor: 'pointer',
      zIndex: '999'
    });
    
    // イベントリスナー
    button.addEventListener('click', () => {
      this.toggleSidePanel(true);
    });
    
    // ホバー効果
    button.addEventListener('mouseenter', () => {
      button.style.backgroundColor = '#2980b9';
    });
    
    button.addEventListener('mouseleave', () => {
      button.style.backgroundColor = '#3498db';
    });
    
    document.body.appendChild(button);
    
    console.log('健全性チェック用の浮動ボタンを追加しました');
  }

  /**
   * 健全性チェックを実行する
   * @param {Object} options - チェックオプション
   * @returns {Promise<Object>} - チェック結果
   */
  async check(options = {}) {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    try {
      // チェックを実行
      const results = await this.checker.check(options);
      
      // 結果に基づいて警告を表示
      const scoreMatch = results.summary.match(/([0-9.]+)\/100/);
      if (scoreMatch) {
        const score = parseFloat(scoreMatch[1]);
        
        // スコアが閾値以下の場合
        if (score <= this.config.reportThreshold) {
          this.showWarning(results);
        }
      }
      
      return results;
    } catch (error) {
      console.error('健全性チェック実行中にエラーが発生しました:', error);
      throw error;
    }
  }

  /**
   * 警告を表示する
   * @param {Object} results - チェック結果
   */
  showWarning(results) {
    // サイドパネルを表示
    this.toggleSidePanel(true);
    
    // 通知も表示
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification('コード健全性の警告', {
          body: `健全性スコアが低いです: ${results.summary}`,
          icon: '/favicon.ico'
        });
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            new Notification('コード健全性の警告', {
              body: `健全性スコアが低いです: ${results.summary}`,
              icon: '/favicon.ico'
            });
          }
        });
      }
    }
  }
  
  /**
   * レポートをエクスポートする
   * @param {string} format - エクスポート形式 ('json', 'html', 'csv')
   * @returns {Promise<string>} - エクスポートされたデータ
   */
  async exportReport(format = 'json') {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    // 最新の結果を取得
    const results = await this.checker.check();
    
    switch (format) {
      case 'json':
        return JSON.stringify(results, null, 2);
      
      case 'html':
        return this.generateHtmlReport(results);
      
      case 'csv':
        return this.generateCsvReport(results);
      
      default:
        throw new Error(`未対応のエクスポート形式: ${format}`);
    }
  }
  
  /**
   * HTML形式のレポートを生成する
   * @param {Object} results - チェック結果
   * @returns {string} - HTML形式のレポート
   */
  generateHtmlReport(results) {
    const { issues, stats, summary } = results;
    
    let html = `
      <!DOCTYPE html>
      <html lang="ja">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>コード健全性レポート</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 20px;
            color: #333;
          }
          h1, h2 {
            color: #2c3e50;
          }
          .summary {
            margin: 20px 0;
            padding: 15px;
            background-color: #f8f9fa;
            border-radius: 5px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
          }
          th, td {
            padding: 10px;
            text-align: left;
            border-bottom: 1px solid #ddd;
          }
          th {
            background-color: #f0f0f0;
          }
          .critical { color: #e74c3c; }
          .warning { color: #f39c12; }
          .info { color: #3498db; }
        </style>
      </head>
      <body>
        <h1>コード健全性レポート</h1>
        
        <div class="summary">
          <h2>サマリー</h2>
          <p>${summary}</p>
          <p>分析したファイル数: ${stats.filesAnalyzed}</p>
          <p>検出された問題: ${stats.totalIssues}</p>
          <ul>
            <li class="critical">重大な問題: ${stats.criticalIssues}</li>
            <li class="warning">警告: ${stats.warningIssues}</li>
            <li class="info">情報: ${stats.infoIssues}</li>
          </ul>
        </div>
        
        <h2>検出された問題</h2>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>重大度</th>
              <th>タイプ</th>
              <th>メッセージ</th>
              <th>ファイル</th>
              <th>行</th>
            </tr>
          </thead>
          <tbody>
    `;
    
    issues.forEach(issue => {
      html += `
        <tr>
          <td>${issue.id}</td>
          <td class="${issue.severity}">${this.getSeverityLabel(issue.severity)}</td>
          <td>${issue.type}</td>
          <td>${this.escapeHtml(issue.message)}</td>
          <td>${this.escapeHtml(issue.file)}</td>
          <td>${issue.line || '-'}</td>
        </tr>
      `;
    });
    
    html += `
          </tbody>
        </table>
        
        <div class="details">
          <h2>詳細</h2>
          <p>レポート生成日時: ${new Date().toLocaleString()}</p>
        </div>
      </body>
      </html>
    `;
    
    return html;
  }
  
  /**
   * CSV形式のレポートを生成する
   * @param {Object} results - チェック結果
   * @returns {string} - CSV形式のレポート
   */
  generateCsvReport(results) {
    const { issues } = results;
    
    let csv = 'ID,重大度,タイプ,メッセージ,ファイル,行\n';
    
    issues.forEach(issue => {
      const row = [
        issue.id,
        this.getSeverityLabel(issue.severity),
        issue.type,
        `"${issue.message.replace(/"/g, '""')}"`,
        `"${issue.file.replace(/"/g, '""')}"`,
        issue.line || ''
      ];
      
      csv += row.join(',') + '\n';
    });
    
    return csv;
  }
  
  /**
   * 重大度に応じたラベルを取得する
   * @param {string} severity - 重大度
   * @returns {string} - 表示用ラベル
   */
  getSeverityLabel(severity) {
    switch (severity) {
      case 'critical':
        return '重大';
      case 'warning':
        return '警告';
      case 'info':
        return '情報';
      default:
        return severity;
    }
  }
  
  /**
   * HTMLをエスケープする
   * @param {string} str - エスケープする文字列
   * @returns {string} - エスケープされた文字列
   */
  escapeHtml(str) {
    if (!str) return '';
    
    return str
      .toString()
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

// グローバルインスタンスを作成
window.codeHealthIntegration = new CodeHealthIntegration();

// 自動初期化が有効な場合は初期化
document.addEventListener('DOMContentLoaded', () => {
  if (window.codeHealthIntegration.config.autoInitialize) {
    window.codeHealthIntegration.initialize().catch(error => {
      console.error('コード健全性チェッカーの初期化に失敗しました:', error);
    });
  }
}); 