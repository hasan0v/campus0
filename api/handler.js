const fs = require('fs');
const path = require('path');

// Load the Hono app from the compiled dist folder
let app;
try {
  app = require('../dist/src/index.js').default;
  console.log('✓ Successfully loaded Hono app');
} catch (error) {
  console.error('Failed to load Hono app:', error);
  app = null;
}

module.exports = async (req, res) => {
  try {
    if (!app) {
      throw new Error('Hono app not initialized');
    }
    
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost';
    const url = new URL(`${protocol}://${host}${req.url}`);
    
    console.log(`Incoming request: ${req.method} ${req.url}`);
    
    // Handle static file requests
    if (req.url.startsWith('/static/')) {
      console.log('Serving static file:', req.url);
      const filepath = req.url.replace('/static/', '');
      const possiblePaths = [
        path.join(__dirname, '../public/static', filepath),
        path.join(process.cwd(), 'public/static', filepath),
        path.join('/var/task', 'public/static', filepath),
      ];
      
      for (const fullPath of possiblePaths) {
        try {
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
        } catch (e) {
          console.log('Path not found:', fullPath);
        }
      }
      
      // Static file not found, return 404
      console.log('Static file not found for:', req.url);
      res.status(404);
      return res.send('Not Found');
    }
    
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

    console.log('Passing request to Hono app');
    const response = await app.fetch(request);
    
    console.log('Got response from Hono app, status:', response.status);
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
    res.send('Internal Server Error: ' + (error.message || 'Unknown error'));
  }
};
