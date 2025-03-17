/**
 * コード健全性チェッカー
 * プロジェクト内のJavaScript、CSS、HTMLファイルの健全性をチェックするためのツール
 */

class CodeHealthChecker {
  constructor() {
    this.issues = [];
    this.stats = {
      filesAnalyzed: 0,
      totalIssues: 0,
      criticalIssues: 0,
      warningIssues: 0,
      infoIssues: 0
    };
  }

  /**
   * コードの健全性チェックを実行する
   * @param {Object} options - チェックオプション
   * @returns {Promise<Object>} - チェック結果
   */
  async check(options = {}) {
    console.log('コードの健全性チェックを開始します...');
    this.resetState();
    
    try {
      if (options.css !== false) {
        await this.checkCssHealth();
      }
      
      if (options.javascript !== false) {
        await this.checkJavaScriptHealth();
      }
      
      if (options.html !== false) {
        await this.checkHtmlHealth();
      }
      
      this.generateReport();
      return {
        issues: this.issues,
        stats: this.stats,
        summary: this.getSummary()
      };
    } catch (error) {
      console.error('健全性チェック中にエラーが発生しました:', error);
      throw error;
    }
  }

  /**
   * 状態をリセットする
   */
  resetState() {
    this.issues = [];
    this.stats = {
      filesAnalyzed: 0,
      totalIssues: 0,
      criticalIssues: 0,
      warningIssues: 0,
      infoIssues: 0
    };
  }

  /**
   * CSSファイルの健全性をチェックする
   */
  async checkCssHealth() {
    console.log('CSSファイルの健全性をチェックしています...');
    
    // ファイル一覧を取得
    const cssFiles = await this.findFiles('public/css', '.css');
    
    for (const file of cssFiles) {
      this.stats.filesAnalyzed++;
      
      // ファイルの内容を取得
      const content = await this.readFile(file);
      
      // 重複セレクタのチェック
      this.checkDuplicateSelectors(file, content);
      
      // 未使用のCSSルールのチェック
      this.checkUnusedCSSRules(file, content);
      
      // !importantの過剰使用のチェック
      this.checkExcessiveImportantUsage(file, content);
    }
  }

  /**
   * JavaScriptファイルの健全性をチェックする
   */
  async checkJavaScriptHealth() {
    console.log('JavaScriptファイルの健全性をチェックしています...');
    
    // ファイル一覧を取得
    const jsFiles = await this.findFiles('public/js', '.js');
    
    for (const file of jsFiles) {
      this.stats.filesAnalyzed++;
      
      // ファイルの内容を取得
      const content = await this.readFile(file);
      
      // 重複コードのチェック
      this.checkDuplicateCode(file, content);
      
      // 未使用の変数や関数のチェック
      this.checkUnusedVariablesAndFunctions(file, content);
      
      // console.log文のチェック
      this.checkConsoleLogs(file, content);
      
      // コメントアウトされたコードのチェック
      this.checkCommentedOutCode(file, content);
    }
  }

  /**
   * HTMLファイルの健全性をチェックする
   */
  async checkHtmlHealth() {
    console.log('HTMLファイルの健全性をチェックしています...');
    
    // ファイル一覧を取得
    const htmlFiles = await this.findFiles('public', '.html');
    
    for (const file of htmlFiles) {
      this.stats.filesAnalyzed++;
      
      // ファイルの内容を取得
      const content = await this.readFile(file);
      
      // アクセシビリティのチェック
      this.checkAccessibility(file, content);
      
      // インラインスタイルのチェック
      this.checkInlineStyles(file, content);
    }
  }

  /**
   * 重複セレクタをチェックする
   * @param {string} file - ファイルパス
   * @param {string} content - ファイルの内容
   */
  checkDuplicateSelectors(file, content) {
    const selectorRegex = /([a-zA-Z0-9_\-.\s>#:]+)\s*\{/g;
    const selectors = {};
    let match;
    
    while ((match = selectorRegex.exec(content)) !== null) {
      const selector = match[1].trim();
      
      if (!selectors[selector]) {
        selectors[selector] = [];
      }
      
      selectors[selector].push({
        line: this.getLineNumber(content, match.index),
        position: match.index
      });
    }
    
    // 重複セレクタの検出
    for (const [selector, occurrences] of Object.entries(selectors)) {
      if (occurrences.length > 1) {
        this.addIssue({
          file,
          type: 'css',
          severity: 'warning',
          message: `重複セレクタ: "${selector}" が ${occurrences.length} 回宣言されています`,
          lines: occurrences.map(o => o.line),
          details: '重複するセレクタは意図せぬスタイルの上書きを引き起こす可能性があります'
        });
      }
    }
  }

  /**
   * !importantの過剰使用をチェックする
   * @param {string} file - ファイルパス
   * @param {string} content - ファイルの内容
   */
  checkExcessiveImportantUsage(file, content) {
    const importantRegex = /!important/g;
    const importantMatches = [...content.matchAll(importantRegex)];
    
    if (importantMatches.length > 5) {
      this.addIssue({
        file,
        type: 'css',
        severity: 'warning',
        message: `!important の過剰使用: ${importantMatches.length} 箇所で使用されています`,
        lines: importantMatches.map(match => this.getLineNumber(content, match.index)),
        details: '!important の過剰使用はCSSの優先順位を乱し、メンテナンス性を低下させます'
      });
    }
  }

  /**
   * 未使用のCSSルールをチェックする（実装例）
   * 実際には他のHTMLファイルとの照合が必要
   * @param {string} file - ファイルパス
   * @param {string} content - ファイルの内容
   */
  checkUnusedCSSRules(file, content) {
    // 実際の実装ではHTMLファイルと照合する必要がある
    // ここでは単純な例として、特定のセレクタのみをチェック
    const suspiciousSelectors = [
      '#temp-', 
      '.debug-', 
      '.test-'
    ];
    
    for (const prefix of suspiciousSelectors) {
      const regex = new RegExp(`${prefix}[a-zA-Z0-9_\\-]*\\s*\\{`, 'g');
      let match;
      
      while ((match = regex.exec(content)) !== null) {
        this.addIssue({
          file,
          type: 'css',
          severity: 'info',
          message: `疑わしいセレクタ: "${match[0].replace('{', '').trim()}" は開発専用の可能性があります`,
          line: this.getLineNumber(content, match.index),
          details: 'デバッグ用や一時的なセレクタが本番環境に残っている可能性があります'
        });
      }
    }
  }

  /**
   * 重複コードをチェックする（実装例）
   * 実際にはより複雑なアルゴリズムが必要
   * @param {string} file - ファイルパス
   * @param {string} content - ファイルの内容
   */
  checkDuplicateCode(file, content) {
    // 実際の実装ではより複雑なアルゴリズムが必要
    // ここでは簡単な例として、同じパターンの繰り返しをチェック
    
    // 関数やメソッドを抽出
    const functionRegex = /function\s+(\w+)\s*\([^)]*\)\s*\{([\s\S]*?)\}/g;
    const functions = {};
    let match;
    
    while ((match = functionRegex.exec(content)) !== null) {
      const functionName = match[1];
      const functionBody = match[2].trim();
      
      // 関数の本文をハッシュ化して比較
      if (!functions[functionBody]) {
        functions[functionBody] = [];
      }
      
      functions[functionBody].push({
        name: functionName,
        line: this.getLineNumber(content, match.index)
      });
    }
    
    // 重複する関数本文を検出
    for (const [body, occurrences] of Object.entries(functions)) {
      if (occurrences.length > 1 && body.length > 50) { // 小さすぎる関数は除外
        this.addIssue({
          file,
          type: 'javascript',
          severity: 'warning',
          message: `重複コード: 同じ内容の関数が複数あります: ${occurrences.map(o => o.name).join(', ')}`,
          lines: occurrences.map(o => o.line),
          details: '重複コードは保守性を低下させます。共通関数に抽出することを検討してください'
        });
      }
    }
  }

  /**
   * 未使用の変数や関数をチェックする（実装例）
   * @param {string} file - ファイルパス
   * @param {string} content - ファイルの内容
   */
  checkUnusedVariablesAndFunctions(file, content) {
    // 変数や関数の宣言を抽出
    const declarations = [];
    
    // let, const, var による変数宣言を検出
    const varRegex = /(let|const|var)\s+(\w+)\s*=/g;
    let match;
    
    while ((match = varRegex.exec(content)) !== null) {
      declarations.push({
        type: 'variable',
        name: match[2],
        line: this.getLineNumber(content, match.index)
      });
    }
    
    // 関数宣言を検出
    const funcRegex = /function\s+(\w+)\s*\(/g;
    
    while ((match = funcRegex.exec(content)) !== null) {
      declarations.push({
        type: 'function',
        name: match[1],
        line: this.getLineNumber(content, match.index)
      });
    }
    
    // 各宣言について使用されているかチェック
    for (const decl of declarations) {
      const usageRegex = new RegExp(`[^a-zA-Z0-9_]${decl.name}[^a-zA-Z0-9_]`, 'g');
      let usageMatch;
      let usageCount = 0;
      
      while ((usageMatch = usageRegex.exec(content)) !== null) {
        usageCount++;
      }
      
      // 宣言を除いた使用回数が1回以下の場合、未使用の可能性がある
      if (usageCount <= 1) {
        this.addIssue({
          file,
          type: 'javascript',
          severity: 'info',
          message: `未使用の可能性がある${decl.type === 'variable' ? '変数' : '関数'}: ${decl.name}`,
          line: decl.line,
          details: `${decl.type === 'variable' ? '変数' : '関数'}が宣言されていますが、使用されていない可能性があります`
        });
      }
    }
  }

  /**
   * console.log文をチェックする
   * @param {string} file - ファイルパス
   * @param {string} content - ファイルの内容
   */
  checkConsoleLogs(file, content) {
    const consoleRegex = /console\.(log|debug|info|warn|error)\(/g;
    const matches = [...content.matchAll(consoleRegex)];
    
    if (matches.length > 0) {
      for (const match of matches) {
        this.addIssue({
          file,
          type: 'javascript',
          severity: 'info',
          message: `console.${match[1]} 文が残っています`,
          line: this.getLineNumber(content, match.index),
          details: '本番環境ではconsole文を削除するか、ロガーを使用することを検討してください'
        });
      }
    }
  }

  /**
   * コメントアウトされたコードをチェックする
   * @param {string} file - ファイルパス
   * @param {string} content - ファイルの内容
   */
  checkCommentedOutCode(file, content) {
    const commentedCodeRegex = /\/\/.*[;{}]|\/\*[\s\S]*?[;{}][\s\S]*?\*\//g;
    const matches = [...content.matchAll(commentedCodeRegex)];
    
    for (const match of matches) {
      const line = this.getLineNumber(content, match.index);
      const commentText = match[0];
      
      // コード断片を含むコメントのみを検出
      if (commentText.match(/[a-zA-Z0-9]+\s*[.({[+\-*/]/) && commentText.length > 20) {
        this.addIssue({
          file,
          type: 'javascript',
          severity: 'info',
          message: 'コメントアウトされたコードが存在します',
          line,
          details: 'コメントアウトされたコードはリポジトリから削除し、必要な場合はバージョン管理システムで履歴を参照するべきです'
        });
      }
    }
  }

  /**
   * アクセシビリティの問題をチェックする
   * @param {string} file - ファイルパス
   * @param {string} content - ファイルの内容
   */
  checkAccessibility(file, content) {
    // イメージタグにalt属性がない
    const imgWithoutAlt = /<img[^>]*(?!alt=)[^>]*>/g;
    const imgMatches = [...content.matchAll(imgWithoutAlt)];
    
    for (const match of imgMatches) {
      if (!match[0].includes('alt=')) {
        this.addIssue({
          file,
          type: 'html',
          severity: 'warning',
          message: 'alt属性のない<img>タグが存在します',
          line: this.getLineNumber(content, match.index),
          details: 'アクセシビリティのために、すべての<img>タグにはalt属性を指定すべきです'
        });
      }
    }
    
    // フォームの入力要素にラベルがない
    const inputsRegex = /<input[^>]*>/g;
    const inputMatches = [...content.matchAll(inputsRegex)];
    
    for (const match of inputMatches) {
      if (!match[0].includes('aria-label') && !match[0].includes('aria-labelledby') && match[0].includes('type="text"')) {
        this.addIssue({
          file,
          type: 'html',
          severity: 'info',
          message: 'ラベルのない<input>タグが存在します',
          line: this.getLineNumber(content, match.index),
          details: 'アクセシビリティのために、すべての入力要素には関連するラベルが必要です'
        });
      }
    }
  }

  /**
   * インラインスタイルをチェックする
   * @param {string} file - ファイルパス
   * @param {string} content - ファイルの内容
   */
  checkInlineStyles(file, content) {
    const inlineStyleRegex = /style=["'][^"']*["']/g;
    const matches = [...content.matchAll(inlineStyleRegex)];
    
    if (matches.length > 5) {
      this.addIssue({
        file,
        type: 'html',
        severity: 'warning',
        message: `インラインスタイルの過剰使用: ${matches.length} 箇所で使用されています`,
        lines: matches.map(match => this.getLineNumber(content, match.index)),
        details: 'インラインスタイルの過剰使用はメンテナンス性を低下させます。CSSクラスを使用することを検討してください'
      });
    }
  }

  /**
   * 問題を追加する
   * @param {Object} issue - 問題の詳細
   */
  addIssue(issue) {
    this.issues.push({
      id: this.issues.length + 1,
      ...issue,
      timestamp: new Date().toISOString()
    });
    
    this.stats.totalIssues++;
    
    switch (issue.severity) {
      case 'critical':
        this.stats.criticalIssues++;
        break;
      case 'warning':
        this.stats.warningIssues++;
        break;
      case 'info':
        this.stats.infoIssues++;
        break;
    }
  }

  /**
   * レポートを生成する
   */
  generateReport() {
    console.log('コード健全性レポートを生成しています...');
    console.log(`分析したファイル数: ${this.stats.filesAnalyzed}`);
    console.log(`検出された問題: ${this.stats.totalIssues}`);
    console.log(`- 重大な問題: ${this.stats.criticalIssues}`);
    console.log(`- 警告: ${this.stats.warningIssues}`);
    console.log(`- 情報: ${this.stats.infoIssues}`);
  }

  /**
   * サマリーを取得する
   * @returns {string} - サマリー文字列
   */
  getSummary() {
    let healthScore = 100;
    
    // クリティカルな問題は10点減点
    healthScore -= this.stats.criticalIssues * 10;
    
    // 警告は3点減点
    healthScore -= this.stats.warningIssues * 3;
    
    // 情報レベルの問題は0.5点減点
    healthScore -= this.stats.infoIssues * 0.5;
    
    // 0より小さくならないようにする
    healthScore = Math.max(0, healthScore);
    
    let healthStatus = '優良';
    if (healthScore < 60) {
      healthStatus = '危機的';
    } else if (healthScore < 75) {
      healthStatus = '注意が必要';
    } else if (healthScore < 90) {
      healthStatus = '改善の余地あり';
    }
    
    return `コード健全性スコア: ${healthScore.toFixed(1)}/100 (${healthStatus})`;
  }

  /**
   * 指定されたディレクトリ内の特定の拡張子を持つファイルを検索する
   * @param {string} dir - 検索するディレクトリ
   * @param {string} extension - ファイル拡張子
   * @returns {Promise<string[]>} - ファイルパスの配列
   */
  async findFiles(dir, extension) {
    // 実際の実装では、ファイルシステムを使用してファイルを検索する
    // このモックでは、サンプルファイルを返す
    if (extension === '.css') {
      return ['public/css/styles.css'];
    } else if (extension === '.js') {
      return [
        'public/js/bookkeeping.js', 
        'public/js/screenshot.js',
        'public/js/tests.js'
      ];
    } else if (extension === '.html') {
      return ['public/index.html'];
    }
    
    return [];
  }

  /**
   * ファイルを読み込む
   * @param {string} filePath - ファイルパス
   * @returns {Promise<string>} - ファイルの内容
   */
  async readFile(filePath) {
    // 実際の実装では、ファイルシステムを使用してファイルを読み込む
    // このモックでは、サンプルコンテンツを返す
    if (filePath === 'public/css/styles.css') {
      return `
.bookkeeping-container {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 20px;
}

.problem-list {
  flex: 1;
  min-width: 250px;
  max-width: 300px;
  padding: 0;
  margin: 0;
}

/* 重複セレクタの例 */
.problem-item {
  padding: 8px;
  margin: 5px 0;
  background-color: #f8f9fa;
}

.problem-item {
  border: 1px solid #ddd;
  border-radius: 4px;
}

.btn {
  padding: 8px 12px;
  background-color: #3498db !important;
  color: white !important;
  border-radius: 4px !important;
}
`;
    } else if (filePath === 'public/js/bookkeeping.js') {
      return `
class BookkeepingApp {
  constructor() {
    this.problems = [];
    this.currentProblemIndex = 0;
    this.init();
  }

  // 重複したような関数の例
  formatProblemText(text) {
    return text.replace(/\\n/g, '<br>');
  }

  formatProblemDescription(desc) {
    return desc.replace(/\\n/g, '<br>');
  }

  init() {
    console.log('BookkeepingApp initialized');
    // コメントアウトされたコードの例
    // if (localStorage.getItem('problems')) {
    //   this.problems = JSON.parse(localStorage.getItem('problems'));
    //   this.renderProblems();
    //   this.setupEventListeners();
    // }
    this.fetchProblems();
  }
}
`;
    } else if (filePath === 'public/index.html') {
      return `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>簿記学習アプリ</title>
</head>
<body>
  <div class="container">
    <header>
      <h1>簿記学習アプリ</h1>
    </header>
    
    <main>
      <div class="bookkeeping-container">
        <div class="problem-list">
          <!-- 問題リスト -->
        </div>
        
        <div class="problem-view">
          <!-- 問題表示エリア -->
        </div>
      </div>
    </main>
    
    <img src="logo.png" style="width: 100px; height: auto;">
    <input type="text" placeholder="検索..." style="width: 100%; padding: 8px; margin: 10px 0;">
  </body>
</html>
`;
    }
    
    return '';
  }

  /**
   * テキスト内の指定位置の行番号を取得する
   * @param {string} text - テキスト
   * @param {number} position - 位置
   * @returns {number} - 行番号
   */
  getLineNumber(text, position) {
    const lines = text.substring(0, position).split('\n');
    return lines.length;
  }
}

// ヘルパー関数：文字列の類似度を計算する（Levenshtein距離の実装）
function calculateStringSimilarity(s1, s2) {
  if (s1.length === 0) return s2.length;
  if (s2.length === 0) return s1.length;

  const matrix = [];
  
  // 行列を初期化
  for (let i = 0; i <= s1.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= s2.length; j++) {
    matrix[0][j] = j;
  }
  
  // 行列を埋める
  for (let i = 1; i <= s1.length; i++) {
    for (let j = 1; j <= s2.length; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // 削除
        matrix[i][j - 1] + 1,      // 挿入
        matrix[i - 1][j - 1] + cost // 置換
      );
    }
  }
  
  // 類似度をパーセントで返す（低いほど似ている）
  const maxLength = Math.max(s1.length, s2.length);
  const similarity = 1 - matrix[s1.length][s2.length] / maxLength;
  
  return similarity * 100;
}

// CodeHealthChecker クラスをエクスポート
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CodeHealthChecker };
} else {
  // ブラウザ環境の場合はグローバルオブジェクトに追加
  window.CodeHealthChecker = CodeHealthChecker;
} 