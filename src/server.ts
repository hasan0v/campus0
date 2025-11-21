import { createServer } from 'http'
import { readFileSync } from 'fs'
import { join } from 'path'
import app from './index'

const PORT = parseInt(process.env.PORT || '3000', 10)

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost:3000'}`)
    
    // Collect request body
    let body = ''
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      body = await new Promise<string>((resolve) => {
        let data = ''
        req.on('data', chunk => data += chunk)
        req.on('end', () => resolve(data))
      })
    }

    // Create Request object for Hono
    const request = new Request(url.toString(), {
      method: req.method,
      headers: req.headers as Record<string, string>,
      body: body || undefined,
    } as any)

    // Get response from Hono
    const response = await app.fetch(request)
    
    // Send response - convert headers to plain object
    const headersObj: Record<string, string> = {}
    response.headers.forEach((value, key) => {
      headersObj[key] = value
    })
    res.writeHead(response.status, headersObj)
    
    if (response.body) {
      const buffer = await response.arrayBuffer()
      res.end(Buffer.from(buffer))
    } else {
      res.end()
    }
  } catch (error) {
    console.error('Server error:', error)
    res.writeHead(500, { 'Content-Type': 'text/plain' })
    res.end('Internal Server Error')
  }
})

server.listen(PORT, () => {
  console.log(`✓ Server running at http://localhost:${PORT}`)
  console.log(`✓ Open http://localhost:${PORT} in your browser`)
})
