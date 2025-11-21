import { VercelRequest, VercelResponse } from '@vercel/node'
import { readFileSync, existsSync } from 'fs'
import { join, extname } from 'path'

// Import the Hono app
import app from '../src/index'

export default async (req: VercelRequest, res: VercelResponse) => {
  try {
    // Log for debugging
    console.log('Handler invoked:', {
      method: req.method,
      url: req.url,
      pathname: new URL(req.url || '/', 'https://localhost').pathname,
    });

    // Serve static files
    if (req.url?.startsWith('/static/')) {
      console.log('Serving static file:', req.url);
      const filepath = req.url.replace('/static/', '');
      
      // Try multiple static paths
      const staticPaths = [
        join(process.cwd(), 'public/static', filepath),
        join(__dirname, '../public/static', filepath),
      ];
      
      for (const fullPath of staticPaths) {
        if (existsSync(fullPath)) {
          console.log('Found at:', fullPath);
          const content = readFileSync(fullPath);
          const ext = extname(filepath).toLowerCase();
          
          const mimeTypes: { [key: string]: string } = {
            '.js': 'application/javascript',
            '.css': 'text/css',
            '.json': 'application/json',
            '.html': 'text/html',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp',
            '.svg': 'image/svg+xml',
          };
          
          res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          return res.send(content);
        }
      }
      
      return res.status(404).send('Static file not found');
    }

    // Build URL for Hono
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost';
    const fullUrl = `${protocol}://${host}${req.url || '/'}`;
    
    console.log('Hono request URL:', fullUrl);

    // Prepare body
    let body: any = undefined;
    if (!['GET', 'HEAD'].includes(req.method || 'GET')) {
      if (typeof req.body === 'string') {
        body = req.body;
      } else if (req.body) {
        body = JSON.stringify(req.body);
      }
    }

    // Create Fetch Request
    const request = new Request(fullUrl, {
      method: req.method || 'GET',
      headers: Object.fromEntries(
        Object.entries(req.headers).map(([k, v]) => [k, String(v)])
      ),
      body,
    } as any);

    console.log('Calling app.fetch');

    // Get response from Hono
    const response = await app.fetch(request);

    console.log('Got response:', response.status);

    // Set status
    res.status(response.status);

    // Copy headers
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });

    // Send body
    if (response.body) {
      const buffer = await response.arrayBuffer();
      res.send(Buffer.from(buffer));
    } else {
      res.end();
    }
  } catch (error: any) {
    console.error('Handler error:', {
      message: error.message,
      stack: error.stack,
    });
    
    res.status(500).send(`Error: ${error.message}`);
  }
};