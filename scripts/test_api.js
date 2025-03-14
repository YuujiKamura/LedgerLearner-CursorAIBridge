const http = require('http');

// localhost:3000のAPIにGETリクエストを送信する関数
function testApi(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      console.log(`ステータスコード: ${res.statusCode}`);
      
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(data);
          console.log(`取得したデータ: ${parsedData.length}件`);
          resolve(parsedData);
        } catch (e) {
          console.error('データの解析に失敗しました:', e.message);
          console.log('生データ:', data.substring(0, 100) + '...');
          reject(e);
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('APIリクエスト中にエラーが発生しました:', error.message);
      reject(error);
    });
    
    req.end();
  });
}

// テスト実行
console.log('APIをテストします...');
testApi('/api/problems')
  .then(data => {
    console.log('テスト完了');
  })
  .catch(error => {
    console.error('テスト失敗:', error);
  }); 