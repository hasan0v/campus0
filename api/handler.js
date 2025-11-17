const app = require('../dist/src/index.js').default;

module.exports = async (req, res) => {
  try {
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost';
    const url = new URL(`${protocol}://${host}${req.url}`);
    
    let body = undefined;
    if (!['GET', 'HEAD'].includes(req.method || 'GET')) {
      if (typeof req.body === 'string') {
        body = req.body;
      } else if (req.body) {
        body = JSON.stringify(req.body);
      }
    }
    
    const request = new Request(url.toString(), {
      method: req.method || 'GET',
      headers: Object.fromEntries(
        Object.entries(req.headers).map(([k, v]) => [k, String(v)])
      ),
      body,
    });

    const response = await app.fetch(request);
    
    res.status(response.status);
    
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });
    
    if (response.body) {
      const buffer = await response.arrayBuffer();
      res.send(Buffer.from(buffer));
    } else {
      res.end();
    }
  } catch (error) {
    console.error('Handler error:', error);
    res.status(500);
    res.send('Internal Server Error: ' + error.message);
  }
};
