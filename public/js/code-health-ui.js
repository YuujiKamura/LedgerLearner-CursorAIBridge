/**
 * コード健全性チェッカーのUI
 * ブラウザ上でコード健全性チェックを実行し結果を表示する
 */

class CodeHealthUI {
  constructor() {
    this.checker = new CodeHealthChecker();
    this.resultsContainer = null;
    this.isRunning = false;
  }

  /**
   * UIを初期化する
   * @param {string} containerId - 結果を表示するコンテナのID
   */
  async initialize(containerId = 'code-health-report') {
    console.log('コード健全性チェッカーUIを初期化しています...');
    
    // 結果表示用のコンテナを確保
    this.resultsContainer = document.getElementById(containerId);
    
    if (!this.resultsContainer) {
      // 存在しない場合は作成
      this.resultsContainer = document.createElement('div');
      this.resultsContainer.id = containerId;
      document.body.appendChild(this.resultsContainer);
    }
    
    // UIの構築
    this.buildUI();
    
    // イベントリスナーの設定
    this.setupEventListeners();
  }

  /**
   * UIを構築する
   */
  buildUI() {
    // スタイルの追加
    this.addStyles();
    
    // UIコンテナを構築
    this.resultsContainer.innerHTML = `
      <div class="code-health-container">
        <div class="code-health-header">
          <h2>コード健全性チェッカー</h2>
          <p>プロジェクトのコード品質を自動的に評価します</p>
        </div>
        
        <div class="code-health-controls">
          <div class="options-container">
            <label>
              <input type="checkbox" id="check-css" checked> CSSファイル
            </label>
            <label>
              <input type="checkbox" id="check-js" checked> JavaScriptファイル
            </label>
            <label>
              <input type="checkbox" id="check-html" checked> HTMLファイル
            </label>
          </div>
          
          <button id="run-check" class="primary-button">健全性チェックを実行</button>
        </div>
        
        <div class="code-health-summary" id="summary-container" style="display: none;">
          <div class="score-container">
            <div class="score-circle">
              <span id="health-score">0</span>
            </div>
            <div class="score-label" id="health-status">-</div>
          </div>
          
          <div class="stats-container">
            <div class="stat-item">
              <div class="stat-label">分析ファイル</div>
              <div class="stat-value" id="files-analyzed">0</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">重大な問題</div>
              <div class="stat-value critical" id="critical-issues">0</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">警告</div>
              <div class="stat-value warning" id="warning-issues">0</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">情報</div>
              <div class="stat-value info" id="info-issues">0</div>
            </div>
          </div>
        </div>
        
        <div class="code-health-issues" id="issues-container" style="display: none;">
          <h3>検出された問題</h3>
          <div class="filter-container">
            <label>
              <input type="checkbox" id="filter-critical" checked> 重大
            </label>
            <label>
              <input type="checkbox" id="filter-warning" checked> 警告
            </label>
            <label>
              <input type="checkbox" id="filter-info" checked> 情報
            </label>
            <div class="filter-type">
              <select id="filter-type">
                <option value="all">すべてのファイル</option>
                <option value="css">CSSファイル</option>
                <option value="javascript">JavaScriptファイル</option>
                <option value="html">HTMLファイル</option>
              </select>
            </div>
          </div>
          
          <div class="issues-list" id="issues-list"></div>
        </div>
        
        <div class="code-health-loading" id="loading-indicator" style="display: none;">
          <div class="spinner"></div>
          <p>コードの健全性を分析中...</p>
        </div>
      </div>
    `;
  }

  /**
   * スタイルを追加する
   */
  addStyles() {
    // 既にスタイルが存在する場合は追加しない
    if (document.getElementById('code-health-styles')) return;
    
    const styleElement = document.createElement('style');
    styleElement.id = 'code-health-styles';
    styleElement.textContent = `
      .code-health-container {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        max-width: 900px;
        margin: 0 auto;
        background: #fff;
        border-radius: 8px;
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
        padding: a;
        color: #333;
      }
      
      .code-health-header {
        text-align: center;
        padding: 20px 0;
        border-bottom: 1px solid #eee;
      }
      
      .code-health-header h2 {
        margin: 0;
        color: #2c3e50;
        font-size: 24px;
      }
      
      .code-health-header p {
        color: #7f8c8d;
        margin: 10px 0 0;
      }
      
      .code-health-controls {
        padding: 20px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: #f8f9fa;
        border-radius: 8px;
        margin: 20px;
      }
      
      .options-container {
        display: flex;
        gap: 15px;
      }
      
      .options-container label {
        display: flex;
        align-items: center;
        gap: 5px;
        cursor: pointer;
      }
      
      .primary-button {
        background: #3498db;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 4px;
        cursor: pointer;
        font-weight: bold;
        transition: background 0.3s;
      }
      
      .primary-button:hover {
        background: #2980b9;
      }
      
      .primary-button:disabled {
        background: #bdc3c7;
        cursor: not-allowed;
      }
      
      .code-health-summary {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 20px;
        margin: 20px;
        background: #f8f9fa;
        border-radius: 8px;
      }
      
      .score-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        margin-bottom: 20px;
      }
      
      .score-circle {
        width: 100px;
        height: 100px;
        border-radius: 50%;
        background: #3498db;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 32px;
        font-weight: bold;
        margin-bottom: 10px;
        box-shadow: 0 4px 10px rgba(52, 152, 219, 0.3);
      }
      
      .score-label {
        font-size: 18px;
        font-weight: bold;
        color: #2c3e50;
      }
      
      .stats-container {
        display: flex;
        gap: 20px;
        justify-content: center;
        flex-wrap: wrap;
        width: 100%;
      }
      
      .stat-item {
        background: white;
        padding: 15px;
        border-radius: 8px;
        text-align: center;
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
        min-width: 100px;
      }
      
      .stat-label {
        font-size: 14px;
        color: #7f8c8d;
        margin-bottom: 5px;
      }
      
      .stat-value {
        font-size: 24px;
        font-weight: bold;
        color: #2c3e50;
      }
      
      .stat-value.critical {
        color: #e74c3c;
      }
      
      .stat-value.warning {
        color: #f39c12;
      }
      
      .stat-value.info {
        color: #3498db;
      }
      
      .code-health-issues {
        padding: 20px;
        margin: 20px;
      }
      
      .code-health-issues h3 {
        margin-top: 0;
        color: #2c3e50;
        border-bottom: 1px solid #eee;
        padding-bottom: 10px;
      }
      
      .filter-container {
        display: flex;
        gap: 15px;
        margin-bottom: 15px;
        align-items: center;
        flex-wrap: wrap;
      }
      
      .filter-container label {
        display: flex;
        align-items: center;
        gap: 5px;
        cursor: pointer;
      }
      
      .filter-type {
        margin-left: auto;
      }
      
      .filter-type select {
        padding: 5px 10px;
        border-radius: 4px;
        border: 1px solid #ddd;
      }
      
      .issues-list {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      
      .issue-item {
        background: white;
        border-radius: 8px;
        padding: 15px;
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
        border-left: 4px solid #3498db;
      }
      
      .issue-item.critical {
        border-left-color: #e74c3c;
      }
      
      .issue-item.warning {
        border-left-color: #f39c12;
      }
      
      .issue-item.info {
        border-left-color: #3498db;
      }
      
      .issue-header {
        display: flex;
        justify-content: space-between;
        margin-bottom: 10px;
      }
      
      .issue-title {
        font-weight: bold;
        color: #2c3e50;
      }
      
      .issue-severity {
        font-size: 12px;
        padding: 2px 8px;
        border-radius: 10px;
        background: #3498db;
        color: white;
      }
      
      .issue-severity.critical {
        background: #e74c3c;
      }
      
      .issue-severity.warning {
        background: #f39c12;
      }
      
      .issue-severity.info {
        background: #3498db;
      }
      
      .issue-location {
        font-size: 12px;
        color: #7f8c8d;
        margin-bottom: 10px;
      }
      
      .issue-details {
        color: #34495e;
        font-size: 14px;
        line-height: 1.5;
      }
      
      .code-health-loading {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 40px;
      }
      
      .spinner {
        border: 4px solid rgba(0, 0, 0, 0.1);
        border-radius: 50%;
        border-top: 4px solid #3498db;
        width: 40px;
        height: 40px;
        animation: spin 1s linear infinite;
        margin-bottom: 20px;
      }
      
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      
      /* ダークテーマ対応 */
      @media (prefers-color-scheme: dark) {
        .code-health-container {
          background: #2c3e50;
          color: #ecf0f1;
        }
        
        .code-health-header h2 {
          color: #ecf0f1;
        }
        
        .code-health-header p {
          color: #bdc3c7;
        }
        
        .code-health-controls {
          background: #34495e;
        }
        
        .code-health-summary {
          background: #34495e;
        }
        
        .score-label {
          color: #ecf0f1;
        }
        
        .stat-item {
          background: #2c3e50;
        }
        
        .stat-label {
          color: #bdc3c7;
        }
        
        .stat-value {
          color: #ecf0f1;
        }
        
        .code-health-issues h3 {
          color: #ecf0f1;
          border-bottom-color: #4a5568;
        }
        
        .issue-item {
          background: #34495e;
        }
        
        .issue-title {
          color: #ecf0f1;
        }
        
        .issue-details {
          color: #bdc3c7;
        }
      }
    `;
    
    document.head.appendChild(styleElement);
  }

  /**
   * イベントリスナーを設定する
   */
  setupEventListeners() {
    const runButton = document.getElementById('run-check');
    if (runButton) {
      runButton.addEventListener('click', () => this.runCheck());
    }
    
    // フィルター関連のイベントリスナー
    const filterElements = [
      'filter-critical',
      'filter-warning',
      'filter-info',
      'filter-type'
    ];
    
    for (const id of filterElements) {
      const element = document.getElementById(id);
      if (element) {
        element.addEventListener('change', () => this.applyFilters());
      }
    }
  }

  /**
   * 健全性チェックを実行する
   */
  async runCheck() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    const runButton = document.getElementById('run-check');
    runButton.disabled = true;
    runButton.textContent = '分析中...';
    
    // ローディングインジケーターを表示
    const loadingIndicator = document.getElementById('loading-indicator');
    loadingIndicator.style.display = 'flex';
    
    // 結果コンテナを非表示
    document.getElementById('summary-container').style.display = 'none';
    document.getElementById('issues-container').style.display = 'none';
    
    try {
      // オプションの取得
      const options = {
        css: document.getElementById('check-css').checked,
        javascript: document.getElementById('check-js').checked,
        html: document.getElementById('check-html').checked
      };
      
      // 健全性チェックの実行
      const results = await this.checker.check(options);
      
      // 結果の表示
      this.displayResults(results);
    } catch (error) {
      console.error('健全性チェック中にエラーが発生しました:', error);
      alert(`エラーが発生しました: ${error.message}`);
    } finally {
      // ローディングインジケーターを非表示
      loadingIndicator.style.display = 'none';
      
      // ボタンを元に戻す
      runButton.disabled = false;
      runButton.textContent = '健全性チェックを実行';
      
      this.isRunning = false;
    }
  }

  /**
   * 結果を表示する
   * @param {Object} results - 健全性チェックの結果
   */
  displayResults(results) {
    const { issues, stats, summary } = results;
    
    // スコアを表示
    this.updateScoreDisplay(stats, summary);
    
    // 問題リストを表示
    this.displayIssues(issues);
    
    // 結果コンテナを表示
    document.getElementById('summary-container').style.display = 'flex';
    document.getElementById('issues-container').style.display = 'block';
  }

  /**
   * スコア表示を更新する
   * @param {Object} stats - 統計情報
   * @param {string} summary - サマリー文字列
   */
  updateScoreDisplay(stats, summary) {
    // スコアの抽出
    const scoreMatch = summary.match(/([0-9.]+)\/100/);
    if (scoreMatch) {
      const score = parseFloat(scoreMatch[1]);
      
      // スコアの表示
      document.getElementById('health-score').textContent = Math.round(score);
      
      // スコアに基づいてスコアサークルの色を変更
      const scoreCircle = document.querySelector('.score-circle');
      if (score >= 90) {
        scoreCircle.style.background = '#27ae60'; // 緑
      } else if (score >= 75) {
        scoreCircle.style.background = '#2ecc71'; // 薄緑
      } else if (score >= 60) {
        scoreCircle.style.background = '#f39c12'; // オレンジ
      } else {
        scoreCircle.style.background = '#e74c3c'; // 赤
      }
    }
    
    // ステータスの抽出
    const statusMatch = summary.match(/\(([^)]+)\)/);
    if (statusMatch) {
      document.getElementById('health-status').textContent = statusMatch[1];
    }
    
    // 統計情報の表示
    document.getElementById('files-analyzed').textContent = stats.filesAnalyzed;
    document.getElementById('critical-issues').textContent = stats.criticalIssues;
    document.getElementById('warning-issues').textContent = stats.warningIssues;
    document.getElementById('info-issues').textContent = stats.infoIssues;
  }

  /**
   * 問題を表示する
   * @param {Array} issues - 問題のリスト
   */
  displayIssues(issues) {
    const issuesListContainer = document.getElementById('issues-list');
    
    // 問題リストをクリア
    issuesListContainer.innerHTML = '';
    
    // 問題がない場合
    if (issues.length === 0) {
      issuesListContainer.innerHTML = `
        <div class="no-issues">
          <p>問題は検出されませんでした！</p>
        </div>
      `;
      return;
    }
    
    // 問題を表示
    issues.forEach(issue => {
      const issueElement = document.createElement('div');
      issueElement.className = `issue-item ${issue.severity}`;
      issueElement.dataset.severity = issue.severity;
      issueElement.dataset.type = issue.type;
      
      issueElement.innerHTML = `
        <div class="issue-header">
          <div class="issue-title">${this.escapeHtml(issue.message)}</div>
          <div class="issue-severity ${issue.severity}">${this.getSeverityLabel(issue.severity)}</div>
        </div>
        <div class="issue-location">
          <strong>場所:</strong> ${this.escapeHtml(issue.file)}${issue.line ? ` (行: ${issue.line})` : ''}
        </div>
        <div class="issue-details">
          ${this.escapeHtml(issue.details)}
        </div>
      `;
      
      issuesListContainer.appendChild(issueElement);
    });
    
    // フィルターを適用
    this.applyFilters();
  }

  /**
   * フィルターを適用する
   */
  applyFilters() {
    const showCritical = document.getElementById('filter-critical').checked;
    const showWarning = document.getElementById('filter-warning').checked;
    const showInfo = document.getElementById('filter-info').checked;
    const fileType = document.getElementById('filter-type').value;
    
    const issueItems = document.querySelectorAll('.issue-item');
    let visibleIssues = 0;
    
    issueItems.forEach(item => {
      const severity = item.dataset.severity;
      const type = item.dataset.type;
      
      const showSeverity = 
        (severity === 'critical' && showCritical) ||
        (severity === 'warning' && showWarning) ||
        (severity === 'info' && showInfo);
        
      const showType = fileType === 'all' || type === fileType;
      
      if (showSeverity && showType) {
        item.style.display = 'block';
        visibleIssues++;
      } else {
        item.style.display = 'none';
      }
    });
    
    // 表示されている問題がない場合のメッセージ
    if (visibleIssues === 0 && issueItems.length > 0) {
      const noVisibleIssues = document.createElement('div');
      noVisibleIssues.className = 'no-visible-issues';
      noVisibleIssues.innerHTML = '<p>現在のフィルター設定では表示できる問題がありません</p>';
      
      const issuesList = document.getElementById('issues-list');
      
      // 既存のメッセージを削除
      const existingMessage = issuesList.querySelector('.no-visible-issues');
      if (existingMessage) {
        issuesList.removeChild(existingMessage);
      }
      
      issuesList.appendChild(noVisibleIssues);
    } else {
      // メッセージが存在する場合は削除
      const existingMessage = document.querySelector('.no-visible-issues');
      if (existingMessage) {
        existingMessage.parentNode.removeChild(existingMessage);
      }
    }
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

// ページ読み込み時に初期化
document.addEventListener('DOMContentLoaded', () => {
  // グローバルオブジェクトが存在する場合のみ初期化
  if (window.CodeHealthChecker) {
    const healthUI = new CodeHealthUI();
    
    // 要素が既にある場合、その場で初期化
    const container = document.getElementById('code-health-report');
    if (container) {
      healthUI.initialize('code-health-report');
    } else {
      // なければ、後で初期化できるようグローバルオブジェクトとして保存
      window.CodeHealthUI = healthUI;
    }
  } else {
    console.error('CodeHealthCheckerが見つかりません。code-health-checker.jsをインクルードしてください。');
  }
}); 