const fs = require('fs');
const path = require('path');

module.exports = async (req, res) => {
  try {
    console.log('=== Handler invoked ===');
    console.log('Method:', req.method);
    console.log('URL:', req.url);
    console.log('Headers:', Object.keys(req.headers));
    
    // Serve static files directly
    if (req.url.startsWith('/static/')) {
      console.log('Serving static file');
      const filepath = req.url.replace('/static/', '');
      
      const staticPaths = [
        path.join(__dirname, '../public/static', filepath),
        path.join(process.cwd(), 'public/static', filepath),
      ];
      
      for (const fullPath of staticPaths) {
        if (fs.existsSync(fullPath)) {
          console.log('Found static file at:', fullPath);
          const content = fs.readFileSync(fullPath);
          const ext = path.extname(filepath).toLowerCase();
          
          let contentType = 'application/octet-stream';
          if (ext === '.js') contentType = 'application/javascript';
          else if (ext === '.css') contentType = 'text/css';
          else if (['.jpg', '.jpeg'].includes(ext)) contentType = 'image/jpeg';
          else if (ext === '.png') contentType = 'image/png';
          else if (ext === '.gif') contentType = 'image/gif';
          else if (ext === '.webp') contentType = 'image/webp';
          else if (ext === '.svg') contentType = 'image/svg+xml';
          
          res.setHeader('Content-Type', contentType);
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          return res.send(content);
        }
      }
      
      console.log('Static file not found');
      res.status(404);
      return res.send('Not Found');
    }
    
    // Try to load and use the Hono app
    console.log('Attempting to load Hono app');
    
    let app;
    try {
      const module = require('../dist/src/index.js');
      app = module.default;
      console.log('✓ Hono app loaded successfully');
      console.log('App type:', typeof app);
      console.log('App.fetch type:', typeof app?.fetch);
    } catch (loadError) {
      console.error('Failed to load Hono app:', loadError.message);
      console.error('Stack:', loadError.stack);
      res.status(500);
      return res.send('Failed to load application: ' + loadError.message);
    }
    
    // Build request
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost';
    const url = new URL(`${protocol}://${host}${req.url}`);
    
    console.log('Built URL:', url.toString());
    
    let body = undefined;
    if (!['GET', 'HEAD'].includes(req.method)) {
      if (typeof req.body === 'string') {
        body = req.body;
      } else if (req.body) {
        body = JSON.stringify(req.body);
      }
    }
    
    console.log('Creating Request object');
    const request = new Request(url.toString(), {
      method: req.method || 'GET',
      headers: Object.fromEntries(
        Object.entries(req.headers).map(([k, v]) => [k, String(v)])
      ),
      body,
    });
    
    console.log('Calling app.fetch');
    const response = await app.fetch(request);
    
    console.log('Got response, status:', response.status);
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
    console.error('=== Handler Error ===');
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
    res.status(500);
    res.send('Internal Server Error: ' + error.message);
  }
};
