import { VercelRequest, VercelResponse } from '@vercel/node'
import app from '../src/index'

export default async (req: VercelRequest, res: VercelResponse) => {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)
    
    // For Vercel, pass raw body if present
    let body = req.body
    if (typeof body === 'object' && body !== null) {
      body = JSON.stringify(body)
    }
    
    const request = new Request(url.toString(), {
      method: req.method || 'GET',
      headers: req.headers as Record<string, string>,
      body: ['GET', 'HEAD'].includes(req.method || 'GET') ? undefined : body,
    })

    const response = await app.fetch(request)
    
    res.status(response.status)
    
    response.headers.forEach((value, key) => {
      res.setHeader(key, value)
    })
    
    if (response.body) {
      const buffer = await response.arrayBuffer()
      res.send(Buffer.from(buffer))
    } else {
      res.end()
    }
  } catch (error) {
    console.error('API error:', error)
    res.status(500).json({ error: 'Internal Server Error' })
  }
}

