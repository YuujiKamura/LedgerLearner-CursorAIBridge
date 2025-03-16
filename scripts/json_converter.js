/**
 * chat_history.jsonのJSON変換・修復ユーティリティ
 * 
 * このスクリプトはchat_history.jsonからデータを読み込み、
 * 以下の機能を提供します：
 * 1. JSONデータの解析と自動修復
 * 2. コンテキストデータの抽出と整形
 * 3. クライアント側データ構造への変換
 */

const fs = require('fs').promises;
const path = require('path');

/**
 * JSONデータコンバーター
 */
class JSONConverter {
  /**
   * コンストラクタ
   * @param {Object} options - 設定オプション
   * @param {string} options.inputFile - 入力ファイルパス
   * @param {string} options.outputFile - 出力ファイルパス
   * @param {boolean} options.backup - バックアップを作成するか
   * @param {boolean} options.overwrite - 入力ファイルを上書きするか
   */
  constructor(options = {}) {
    this.inputFile = options.inputFile || path.join(__dirname, '..', 'data', 'chat_history.json');
    this.outputFile = options.outputFile || path.join(__dirname, '..', 'data', 'chat_history_fixed.json');
    this.createBackup = options.backup !== false;
    this.overwriteOriginal = options.overwrite === true;
    
    this.rawData = null;
    this.parsedData = null;
    this.fixedData = null;
    this.errors = [];
    this.fixedCount = 0;
    this.processedItems = 0;
  }

  /**
   * ファイルからデータを読み込む
   */
  async loadData() {
    try {
      console.log(`ファイルを読み込み中: ${this.inputFile}`);
      this.rawData = await fs.readFile(this.inputFile, 'utf8');
      return true;
    } catch (error) {
      this.errors.push(`ファイル読み込みエラー: ${error.message}`);
      return false;
    }
  }

  /**
   * JSONデータをパース
   */
  async parseData() {
    if (!this.rawData) {
      this.errors.push('データが読み込まれていません');
      return false;
    }

    try {
      console.log('JSONデータをパース中...');
      this.parsedData = JSON.parse(this.rawData);
      return true;
    } catch (error) {
      this.errors.push(`JSONパースエラー: ${error.message}`);
      
      // バックアップを作成
      if (this.createBackup) {
        const backupFile = `${this.inputFile}.bak`;
        try {
          await fs.writeFile(backupFile, this.rawData);
          console.log(`バックアップを作成しました: ${backupFile}`);
        } catch (backupError) {
          this.errors.push(`バックアップの作成に失敗: ${backupError.message}`);
        }
      }
      
      // 自動修復を試みる
      console.log('JSONデータの自動修復を試みます...');
      try {
        // 一般的なJSON構文エラーを修復
        const fixedJson = this.rawData
          .replace(/,\s*]/g, ']') // 配列の末尾カンマを削除
          .replace(/,\s*}/g, '}') // オブジェクトの末尾カンマを削除
          .replace(/([{,]\s*)(\w+):/g, '$1"$2":') // キーをクォートで囲む
          .replace(/:\s*'([^']*)'/g, ':"$1"') // シングルクォートをダブルクォートに変換
          .replace(/\n/g, ' ') // 改行を空白に置換
          .replace(/\r/g, ' '); // キャリッジリターンを空白に置換
        
        this.parsedData = JSON.parse(fixedJson);
        this.fixedCount++;
        console.log('JSONデータの修復に成功しました');
        return true;
      } catch (fixError) {
        this.errors.push(`自動修復に失敗: ${fixError.message}`);
        return false;
      }
    }
  }

  /**
   * データを修復して整形
   */
  async fixData() {
    if (!this.parsedData) {
      this.errors.push('パース済みデータがありません');
      return false;
    }

    try {
      console.log('データの修復と整形を開始します...');
      
      if (!Array.isArray(this.parsedData)) {
        this.errors.push('データが配列形式ではありません');
        return false;
      }
      
      // 各項目を処理
      this.fixedData = this.parsedData.map(item => {
        this.processedItems++;
        
        // データの基本構造をそのまま維持
        const fixedItem = { ...item };
        
        // コンテキストデータの修復（必要な場合）
        if (item.question && item.question.includes('#context:')) {
          try {
            const { updatedQuestion, contextData } = this.fixContextData(item.question);
            
            // 修復したコンテキストデータがあれば適用
            if (contextData && updatedQuestion !== item.question) {
              fixedItem.question = updatedQuestion;
              fixedItem._contextData = contextData; // 参照用
              this.fixedCount++;
            }
          } catch (contextError) {
            this.errors.push(`コンテキストデータ修復エラー: ${contextError.message}`);
          }
        }
        
        return fixedItem;
      });
      
      console.log(`${this.processedItems}件のデータを処理し、${this.fixedCount}件を修復しました`);
      return true;
    } catch (error) {
      this.errors.push(`データ修復エラー: ${error.message}`);
      return false;
    }
  }
  
  /**
   * コンテキストデータを修復
   * @param {string} questionText - 質問テキスト
   * @returns {Object} 修復結果
   */
  fixContextData(questionText) {
    const result = {
      updatedQuestion: questionText,
      contextData: null
    };
    
    try {
      // コンテキスト部分を抽出
      const contextMatch = questionText.match(/#context:\s*({[\s\S]*?})/);
      if (!contextMatch || !contextMatch[1]) {
        return result;
      }
      
      // コンテキスト部分とそれ以外を分離
      const parts = questionText.split('#context:');
      const beforeContext = parts[0].trim();
      const contextPart = parts[1].trim();
      const jsonStartIndex = contextPart.indexOf('{');
      
      if (jsonStartIndex < 0) {
        return result;
      }
      
      // JSONの終わりを見つける
      let jsonEndIndex = -1;
      let nestLevel = 0;
      
      for (let i = jsonStartIndex; i < contextPart.length; i++) {
        if (contextPart[i] === '{') nestLevel++;
        else if (contextPart[i] === '}') {
          nestLevel--;
          if (nestLevel === 0) {
            jsonEndIndex = i + 1;
            break;
          }
        }
      }
      
      if (jsonEndIndex <= jsonStartIndex) {
        return result;
      }
      
      // JSONとその後のテキストを分離
      const jsonStr = contextPart.substring(jsonStartIndex, jsonEndIndex);
      const afterJson = contextPart.substring(jsonEndIndex).trim();
      
      // JSONを修復
      try {
        // そのまま解析してみる
        const parsedData = JSON.parse(jsonStr);
        result.contextData = parsedData;
      } catch (e) {
        // 修復を試みる
        const fixedJson = this.repairJSON(jsonStr);
        if (fixedJson) {
          // 修復したJSONを適用
          const newContextStr = `#context: ${JSON.stringify(fixedJson)}`;
          result.updatedQuestion = `${beforeContext} ${newContextStr} ${afterJson}`.trim();
          result.contextData = fixedJson;
        }
      }
      
      return result;
    } catch (e) {
      return result;
    }
  }
  
  /**
   * 不正なJSON文字列を修復
   * @param {string} jsonStr - 修復するJSON文字列
   * @returns {Object|null} 修復されたオブジェクトまたはnull
   */
  repairJSON(jsonStr) {
    try {
      // 特定のエラーパターンを修正
      let fixedJson = jsonStr
        // エスケープ文字の修正
        .replace(/\\(?!["\\/bfnrtu])/g, '\\\\') // 正しくエスケープされていないバックスラッシュ
        .replace(/\n/g, '\\n') // 改行文字
        .replace(/\r/g, '\\r') // 復帰文字
        
        // キーの形式を修正
        .replace(/([{,]\s*)(\w+):/g, '$1"$2":') // キー名をクォートで囲む
        .replace(/:\s*'([^']*)'/g, ':"$1"') // シングルクォートをダブルクォートに変換
        
        // 一般的なエラーパターンを修正
        .replace(/"([^"]+)"\s*,\s*"([^"]+)"\s*:/g, '"$1":"値不明","$2":') // "key1","key2": パターン
        .replace(/"([^"]+)"\s*,\s*([a-zA-Z0-9_]+)\s*:/g, '"$1":"値不明","$2":') // "key1",key2: パターン
        .replace(/,\s*,/g, ',') // 重複カンマ
        .replace(/:\s*,/g, ':"値不明",') // 値がないフィールド
        .replace(/,\s*}/g, '}') // 末尾カンマ
        .replace(/,\s*]/g, ']'); // 配列の末尾カンマ
      
      // 位置158〜160付近の特定エラーを修正（売掛金/売上パターン）
      const creditPattern = /"credit":"([^"]+)"}/;
      const debitPattern = /"debit":"([^"]+)"}/;
      
      if (creditPattern.test(fixedJson)) {
        fixedJson = fixedJson.replace(creditPattern, '"credit":"$1","amount":0}');
      } else if (debitPattern.test(fixedJson)) {
        fixedJson = fixedJson.replace(debitPattern, '"debit":"$1","amount":0}');
      }
      
      // userAnswerオブジェクト内の構造問題を修正
      if (fixedJson.includes('"userAnswer":{"method":"仕訳"')) {
        fixedJson = fixedJson.replace(/("credit":"[^"]+")}/g, '$1,"amount":0}');
      }
      
      try {
        return JSON.parse(fixedJson);
      } catch (e) {
        // 正規表現でキー情報を抽出する最終手段
        const problemIdMatch = jsonStr.match(/"problemId"\s*:\s*"([^"]+)"/);
        const categoryMatch = jsonStr.match(/"category"\s*:\s*"([^"]+)"/);
        const questionMatch = jsonStr.match(/"question"\s*:\s*"([^"]*?)"/);
        
        if (problemIdMatch) {
          return {
            problemId: problemIdMatch[1],
            category: categoryMatch ? categoryMatch[1] : "不明",
            question: questionMatch ? questionMatch[1] : "質問内容が不明です",
            userAnswer: {
              method: "未選択",
              debit: "不明",
              credit: "不明",
              amount: 0
            },
            hasParseError: true
          };
        }
      }
    } catch (e) {
      // エラーが発生した場合
    }
    
    return null;
  }

  /**
   * 修復したデータを保存
   */
  async saveData() {
    if (!this.fixedData) {
      this.errors.push('修復済みデータがありません');
      return false;
    }
    
    try {
      console.log('修復済みデータの保存を開始します...');
      
      // 出力ファイルを決定
      const targetFile = this.overwriteOriginal ? this.inputFile : this.outputFile;
      
      // 整形してJSON文字列に変換
      const jsonData = JSON.stringify(this.fixedData, null, 2);
      
      // ファイルに書き込み
      await fs.writeFile(targetFile, jsonData);
      console.log(`修復済みデータを保存しました: ${targetFile}`);
      
      return true;
    } catch (error) {
      this.errors.push(`データ保存エラー: ${error.message}`);
      return false;
    }
  }
  
  /**
   * 処理全体を実行
   */
  async run() {
    try {
      // ステップ1: データ読み込み
      const loadResult = await this.loadData();
      if (!loadResult) {
        console.error('データの読み込みに失敗しました');
        return false;
      }
      
      // ステップ2: JSONパース
      const parseResult = await this.parseData();
      if (!parseResult) {
        console.error('JSONデータのパースに失敗しました');
        return false;
      }
      
      // ステップ3: データ修復
      const fixResult = await this.fixData();
      if (!fixResult) {
        console.error('データの修復に失敗しました');
        return false;
      }
      
      // ステップ4: 修復データ保存
      const saveResult = await this.saveData();
      if (!saveResult) {
        console.error('データの保存に失敗しました');
        return false;
      }
      
      console.log('すべての処理が正常に完了しました');
      return true;
    } catch (error) {
      this.errors.push(`処理中にエラーが発生しました: ${error.message}`);
      console.error('処理中にエラーが発生しました:', error);
      return false;
    } finally {
      // エラーログの表示
      if (this.errors.length > 0) {
        console.warn('\n以下のエラーが発生しました:');
        this.errors.forEach((err, i) => console.warn(`[${i+1}] ${err}`));
      }
      
      // 処理結果のサマリー
      console.log('\n処理サマリー:');
      console.log(`- 処理項目数: ${this.processedItems}`);
      console.log(`- 修復項目数: ${this.fixedCount}`);
      console.log(`- エラー数: ${this.errors.length}`);
    }
  }
}

/**
 * メイン実行関数
 */
async function main() {
  // コマンドライン引数の処理
  const args = process.argv.slice(2);
  const options = {
    inputFile: null,
    outputFile: null,
    backup: true,
    overwrite: false
  };
  
  // 引数のパース
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--input' || args[i] === '-i') {
      options.inputFile = args[++i];
    } else if (args[i] === '--output' || args[i] === '-o') {
      options.outputFile = args[++i];
    } else if (args[i] === '--no-backup') {
      options.backup = false;
    } else if (args[i] === '--overwrite') {
      options.overwrite = true;
    } else if (args[i] === '--help' || args[i] === '-h') {
      console.log('使用方法: node json_converter.js [options]');
      console.log('Options:');
      console.log('  --input, -i <file>    入力ファイルを指定');
      console.log('  --output, -o <file>   出力ファイルを指定');
      console.log('  --no-backup           バックアップを作成しない');
      console.log('  --overwrite           オリジナルファイルを上書きする');
      console.log('  --help, -h            このヘルプを表示');
      return;
    }
  }
  
  // コンバーターを作成して実行
  const converter = new JSONConverter(options);
  const result = await converter.run();
  
  process.exit(result ? 0 : 1);
}

// モジュールとして使用する場合はexport
if (require.main === module) {
  main().catch(err => {
    console.error('予期せぬエラーが発生しました:', err);
    process.exit(1);
  });
} else {
  module.exports = JSONConverter;
} 