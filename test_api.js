const http = require('http');

console.log('進捗データAPIテスト開始');

// 進捗データを取得するリクエスト
const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/progress',
  method: 'GET'
};

const req = http.request(options, (res) => {
  console.log(`ステータスコード: ${res.statusCode}`);
  
  let data = '';
  
  // データの受信
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  // レスポンスの終了
  res.on('end', () => {
    try {
      const parsedData = JSON.parse(data);
      console.log('受信データのキー数:', Object.keys(parsedData).length);
      
      if (Object.keys(parsedData).length > 0) {
        console.log('最初のデータ例:');
        const firstKey = Object.keys(parsedData)[0];
        console.log(`  問題ID: ${firstKey}`);
        console.log(`  データ: ${JSON.stringify(parsedData[firstKey], null, 2)}`);
      } else {
        console.log('データが空です。何も受信されませんでした。');
      }
      
      console.log('テスト完了');
    } catch (e) {
      console.error('JSONの解析に失敗しました:', e.message);
      console.log('受信した生データ:', data);
    }
  });
});

// エラーハンドリング
req.on('error', (e) => {
  console.error(`リクエストエラー: ${e.message}`);
});

// リクエスト終了
req.end(); 