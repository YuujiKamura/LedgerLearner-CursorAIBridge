const fs = require('fs');
const data = JSON.parse(fs.readFileSync('data/chat_history.json', 'utf8'));
const contextItems = data.filter(item => item.question && item.question.includes('#context:'));

let validItems = 0;
let errorItems = 0;
let fixedItems = 0;

const updatedData = data.map(item => {
  if (item.question && item.question.includes('#context:')) {
    const questionParts = item.question.split('#context:');
    const restOfQuestion = questionParts[1];
    
    // JSON文字列を抽出（より正確な抽出方法）
    let jsonStart = restOfQuestion.indexOf('{');
    let nestLevel = 0;
    let jsonEnd = -1;
    
    // JSONの終わりを正確に見つける（ネストされたオブジェクトに対応）
    for (let i = jsonStart; i < restOfQuestion.length; i++) {
      if (restOfQuestion[i] === '{') nestLevel++;
      else if (restOfQuestion[i] === '}') {
        nestLevel--;
        if (nestLevel === 0) {
          jsonEnd = i + 1;
          break;
        }
      }
    }
    
    if (jsonStart >= 0 && jsonEnd > jsonStart) {
      const contextJson = restOfQuestion.substring(jsonStart, jsonEnd);
      
      try {
        // Try parsing the JSON
        JSON.parse(contextJson);
        validItems++;
        return item; // JSON is valid, return unchanged
      } catch (e) {
        errorItems++;
        console.log(`Error parsing JSON: ${e.message}`);
        console.log(`Original JSON (length ${contextJson.length}): ${contextJson.substring(0, 100)}...`);
        
        // エラー位置の特定
        if (e.message.includes('position')) {
          const posMatch = e.message.match(/position (\d+)/);
          if (posMatch && posMatch[1]) {
            const errorPos = parseInt(posMatch[1]);
            // 特にposition 28周辺のエラーに注目
            if (errorPos >= 0) {
              const start = Math.max(0, errorPos - 15);
              const end = Math.min(contextJson.length, errorPos + 15);
              console.log(`エラー位置周辺のJSON (${errorPos}): ${contextJson.substring(start, end)}`);
              console.log(`エラー位置の文字コード:`, Array.from(contextJson.substring(errorPos-2, errorPos+3)).map(c => `${c}(${c.charCodeAt(0)})`).join(', '));
            }
          }
        }
        
        // JSON文字列からエスケープ文字を正規化
        let fixedJson = contextJson;
        
        // バックスラッシュがエスケープされている場合は修正
        if (fixedJson.includes('\\\\')) {
          fixedJson = fixedJson.replace(/\\\\/g, '\\');
        }
        
        // エスケープされた引用符の修正
        if (fixedJson.includes('\\"')) {
          fixedJson = fixedJson.replace(/\\"/g, '"');
          fixedJson = fixedJson.replace(/"([^"]*)"/g, (match) => {
            // 既に引用符で囲まれた文字列内の引用符をエスケープ
            return match.replace(/"/g, '\\"');
          });
        }
        
        // 特に位置28周辺の問題に対処
        if (contextJson.length > 28) {
          const charAtPos28 = contextJson.charAt(28);
          const prevChar = contextJson.charAt(27);
          const nextChar = contextJson.charAt(29);
          
          // 位置28のエラーは、多くの場合「売掛金」と「売上」の間の構文エラー
          if ((prevChar === '"' || prevChar === '}' || prevChar === ',') && 
              (charAtPos28 === ',' || charAtPos28 === ':') && 
              (nextChar === '"' || nextChar === '{')) {
            
            // 位置28付近を特別に処理
            const beforePart = fixedJson.substring(0, 28);
            const afterPart = fixedJson.substring(29);
            
            // カンマとコロンの関係が間違っている場合
            if (charAtPos28 === ',' && nextChar === '"' && prevChar === '"') {
              fixedJson = beforePart + '":"値不明",' + afterPart;
            }
            // オブジェクト区切りの問題
            else if (prevChar === '}' && charAtPos28 === ',' && nextChar === '"') {
              fixedJson = beforePart + ',' + afterPart;
            }
            
            console.log('位置28の特別修正を適用しました');
          }
        }
        
        // その他の一般的なJSON形式の問題を修正
        fixedJson = fixedJson
          // 特殊な問題パターンを修正
          .replace(/"([^"]+)",\s*"([^"]+)"\s*:/g, '"$1":"値不明","$2":') // "key1","key2": パターンを修正
          .replace(/"([^"]+)",\s*([a-zA-Z0-9_]+)\s*:/g, '"$1":"値不明","$2":') // "key1",key2: パターンを修正
          .replace(/,\s*,/g, ',') // 重複カンマの削除
          .replace(/:\s*,/g, ':"値不明",') // 値がないフィールドに空文字列を追加
          .replace(/,\s*}/g, '}') // 末尾カンマの削除
          .replace(/,\s*]/g, ']'); // 配列内の末尾カンマの削除
          
        try {
          JSON.parse(fixedJson);
          fixedItems++;
          console.log(`Fixed JSON: ${fixedJson.substring(0, 100)}...`);
          
          // Update the item with fixed JSON
          const newQuestion = questionParts[0] + '#context: ' + 
            restOfQuestion.substring(0, jsonStart) + 
            fixedJson + 
            restOfQuestion.substring(jsonEnd);
            
          return {...item, question: newQuestion};
        } catch (e2) {
          console.log(`Failed to fix JSON: ${e2.message}`);
          
          // 最終手段：JSONを手動で構築
          try {
            // 問題のJSONから必要な情報を抽出
            const problemIdMatch = contextJson.match(/"problemId"\s*:\s*"([^"]+)"/);
            const categoryMatch = contextJson.match(/"category"\s*:\s*"([^"]+)"/);
            const questionMatch = contextJson.match(/"question"\s*:\s*"([^"]+)"/);
            
            if (problemIdMatch && categoryMatch) {
              const manualJson = {
                problemId: problemIdMatch[1],
                category: categoryMatch[1],
                question: questionMatch ? questionMatch[1] : "質問内容が不明です",
                userAnswer: {
                  method: "未選択",
                  debit: "不明",
                  credit: "不明"
                }
              };
              
              const manualJsonStr = JSON.stringify(manualJson);
              console.log(`Manual JSON created: ${manualJsonStr.substring(0, 100)}...`);
              
              // 手動で構築したJSONで置き換え
              const newQuestion = questionParts[0] + '#context: ' + 
                restOfQuestion.substring(0, jsonStart) + 
                manualJsonStr + 
                restOfQuestion.substring(jsonEnd);
                
              fixedItems++;
              return {...item, question: newQuestion};
            }
          } catch (e3) {
            console.log(`Manual fix also failed: ${e3.message}`);
          }
          
          return item; // Return unchanged if all fixes failed
        }
      }
    }
  }
  return item;
});

console.log(`Processed ${contextItems.length} context items. Valid: ${validItems}, Errors: ${errorItems}, Fixed: ${fixedItems}`);

// Write the fixed data
fs.writeFileSync('data/chat_history.json.fixed', JSON.stringify(updatedData, null, 2));
console.log('Fixed file written to data/chat_history.json.fixed');
