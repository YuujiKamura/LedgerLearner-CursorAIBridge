// 問題データの表示
function displayProblemData(problemData) {
  // 問題データがない場合は何もしない
  if (!problemData) {
    return '';
  }

  // 正解データの表示文字列を作成
  let correctAnswerText = '';
  
  // 複数の正解パターンがある場合
  if (problemData.correctAnswers && Array.isArray(problemData.correctAnswers)) {
    // 複数の正解パターンを表示
    correctAnswerText = problemData.correctAnswers.map(answer => {
      const methodText = answer.method ? `【${answer.method}】` : '';
      return `${methodText}借方：${answer.debit}、貸方：${answer.credit}`;
    }).join('<br>');
  } 
  // 単一の正解パターンの場合
  else if (problemData.correctAnswer) {
    correctAnswerText = `借方：${problemData.correctAnswer.debit}、貸方：${problemData.correctAnswer.credit}`;
  }

  return `
    <div class="problem-data">
      <h4>問題詳細</h4>
      <p><strong>問題ID:</strong> ${problemData.id}</p>
      <p><strong>カテゴリ:</strong> ${problemData.category || '不明'}</p>
      <p><strong>問題:</strong> ${problemData.question || '不明'}</p>
      <p><strong>正解:</strong> ${correctAnswerText}</p>
      ${problemData.explanation ? `<p><strong>解説:</strong> ${problemData.explanation}</p>` : ''}
    </div>
  `;
} 