const https = require('https');
https.get('https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&dt=rm&q=%EC%95%88%EB%85%95%ED%95%98%EC%84%B8%EC%9A%94', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log(data));
});
