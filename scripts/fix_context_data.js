/**
 * chat_history.jsonのコンテキストデータのみを修復するスクリプト
 */

const fs = require('fs');
const path = require('path');

/**
 * コンテキストデータを修復する関数
 * @param {string} inputFile - 入力ファイルパス
 * @param {string} outputFile - 出力ファイルパス
 */
async function fixContextData(inputFile, outputFile) {
  console.log('処理を開始します...');
  console.log(`入力ファイル: ${inputFile}`);
  console.log(`出力ファイル: ${outputFile}`);

  try {
    // ファイルを読み込む
    console.log('ファイルを読み込み中...');
    const data = fs.readFileSync(inputFile, 'utf8');
    
    // バックアップを作成
    const backupFile = `${inputFile}.bak-${Date.now()}`;
    fs.writeFileSync(backupFile, data, 'utf8');
    console.log(`バックアップを作成しました: ${backupFile}`);
    
    // JSONをパース
    console.log('JSONデータをパース中...');
    let jsonData;
    
    try {
      jsonData = JSON.parse(data);
    } catch (parseError) {
      console.error(`JSONパースエラー: ${parseError.message}`);
      return;
    }
    
    // 配列かどうかチェック
    if (!Array.isArray(jsonData)) {
      console.error('JSONデータが配列ではありません');
      return;
    }
    
    // コンテキストデータを修復
    console.log('コンテキストデータを修復中...');
    const fixedData = jsonData.map(item => {
      // questionがなければそのまま返す
      if (!item.question || typeof item.question !== 'string') {
        return item;
      }
      
      // #contextタグを含まない場合はそのまま返す
      if (!item.question.includes('#context:')) {
        return item;
      }
      
      // コンテキストデータを抽出して修復
      try {
        const result = fixContextInQuestion(item.question);
        return {
          ...item,
          question: result.updatedQuestion,
          _contextData: result.contextData // デバッグ用に保存
        };
      } catch (e) {
        console.error(`項目の修復に失敗: ${e.message}`);
        return item;
      }
    });
    
    // 修復したデータを保存
    fs.writeFileSync(outputFile, JSON.stringify(fixedData, null, 2), 'utf8');
    console.log(`修復データを保存しました: ${outputFile}`);
    
  } catch (error) {
    console.error(`エラーが発生しました: ${error.message}`);
  }
}

/**
 * 質問内のコンテキストデータを修復する
 * @param {string} questionText - 質問テキスト
 * @returns {Object} 修復結果
 */
function fixContextInQuestion(questionText) {
  const result = {
    updatedQuestion: questionText,
    contextData: null
  };
  
  try {
    // コンテキスト部分を抽出
    const parts = questionText.split('#context:');
    if (parts.length < 2) {
      return result;
    }
    
    const beforeContext = parts[0].trim();
    const afterContextPart = parts[1].trim();
    
    // JSON部分の開始位置を特定
    const jsonStartIndex = afterContextPart.indexOf('{');
    if (jsonStartIndex < 0) {
      return result;
    }
    
    // JSON部分の終了位置を特定（ネストを考慮）
    let nestLevel = 0;
    let jsonEndIndex = -1;
    
    for (let i = jsonStartIndex; i < afterContextPart.length; i++) {
      if (afterContextPart[i] === '{') {
        nestLevel++;
      } else if (afterContextPart[i] === '}') {
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
    
    // JSON文字列を抽出
    const jsonStr = afterContextPart.substring(jsonStartIndex, jsonEndIndex);
    const afterJson = afterContextPart.substring(jsonEndIndex).trim();
    
    // JSONを修復
    try {
      // まずそのままパースしてみる
      result.contextData = JSON.parse(jsonStr);
    } catch (parseError) {
      console.log(`パースエラー: ${parseError.message}`);
      console.log(`問題のJSON: ${jsonStr.substring(0, 100)}...`);
      
      // JSONを修復
      const fixedJson = fixJsonString(jsonStr);
      
      try {
        const parsedJson = JSON.parse(fixedJson);
        result.contextData = parsedJson;
        
        // 修復後のJSONで質問を更新
        result.updatedQuestion = `${beforeContext} #context: ${fixedJson} ${afterJson}`.trim();
      } catch (e) {
        console.log(`修復失敗: ${e.message}`);
        
        // 最終手段: 基本情報だけ抽出して新しいJSONを作成
        try {
          // キーを抽出
          const problemIdMatch = jsonStr.match(/"problemId"\s*:\s*"([^"]+)"/);
          const categoryMatch = jsonStr.match(/"category"\s*:\s*"([^"]+)"/);
          const questionMatch = jsonStr.match(/"question"\s*:\s*"([^"]+)"/);
          
          if (problemIdMatch) {
            const manualJson = {
              problemId: problemIdMatch[1],
              category: categoryMatch ? categoryMatch[1] : "不明",
              question: questionMatch ? questionMatch[1] : "質問内容が不明です",
              userAnswer: {
                method: "未選択",
                debit: "不明",
                credit: "不明"
              },
              hasParseError: true
            };
            
            const manualJsonStr = JSON.stringify(manualJson);
            result.contextData = manualJson;
            result.updatedQuestion = `${beforeContext} #context: ${manualJsonStr} ${afterJson}`.trim();
          }
        } catch (e2) {
          // 抽出失敗
        }
      }
    }
    
    return result;
  } catch (e) {
    console.error(`コンテキスト修復エラー: ${e.message}`);
    return result;
  }
}

/**
 * JSON文字列を修復する
 * @param {string} jsonStr - JSON文字列
 * @returns {string} 修復されたJSON文字列
 */
function fixJsonString(jsonStr) {
  // 複数のステップで修復を試みる
  let fixedJson = jsonStr;
  
  // 1. 制御文字を削除
  fixedJson = fixedJson.replace(/[\x00-\x1F\x7F]/g, '');
  
  // 2. エスケープされていないバックスラッシュをエスケープ
  fixedJson = fixedJson.replace(/([^\\])\\([^"\\/bfnrtu])/g, '$1\\\\$2');
  
  // 3. エスケープされていない引用符をエスケープ
  fixedJson = fixedJson.replace(/([^\\])"/g, '$1\\"');
  
  // 4. 引用符がないキーに引用符を追加
  fixedJson = fixedJson.replace(/([{,]\s*)([a-zA-Z0-9_]+)(\s*:)/g, '$1"$2"$3');
  
  // 5. シングルクォートをダブルクォートに変換
  fixedJson = fixedJson.replace(/'/g, '"');
  
  // 6. 末尾のカンマを削除
  fixedJson = fixedJson.replace(/,\s*([}\]])/g, '$1');
  
  // 7. キーと値の間のコロンの後にスペースがない場合に追加
  fixedJson = fixedJson.replace(/([a-zA-Z0-9_"'])\s*:\s*([a-zA-Z0-9_"'{[])/g, '$1: $2');
  
  // 8. パースできない場合は別の修復方法を試す
  try {
    JSON.parse(fixedJson);
  } catch (e) {
    // より強力な修復を実行
    // 不正なJSONの形式を強制的に修正
    
    // 特に既知の問題のパターンを修正
    // 1. 問題ID周りの構文問題を修正
    fixedJson = fixedJson.replace(/"problemId"\s*:\s*"([^"]+)"([^\s,}])/, '"problemId": "$1"$2');
    
    // 2. カテゴリ周りの構文問題を修正
    fixedJson = fixedJson.replace(/"category"\s*:\s*"([^"]+)"([^\s,}])/, '"category": "$1"$2');
    
    // 3. userAnswer周りの構文問題を修正
    fixedJson = fixedJson.replace(/"userAnswer"\s*:\s*{([^}]+)}([^\s,}])/, '"userAnswer": {$1}$2');
  }
  
  return fixedJson;
}

// コマンドライン引数を解析
const args = process.argv.slice(2);
if (args.length >= 2) {
  fixContextData(args[0], args[1]);
} else {
  console.error('使用法: node fix_context_data.js 入力ファイル 出力ファイル');
} 