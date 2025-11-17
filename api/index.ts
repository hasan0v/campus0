import { VercelRequest, VercelResponse } from '@vercel/node'
import { createServer } from 'http'
import { readFileSync, existsSync } from 'fs'
import { join, extname } from 'path'

// Import the Hono app
import app from '../src/index'

export default async (req: VercelRequest, res: VercelResponse) => {
  try {
    // Build the full URL
    const protocol = req.headers['x-forwarded-proto'] || 'https'
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost'
    const url = new URL(`${protocol}://${host}${req.url}`)
    
    // Create a Fetch Request object
    let body: any = undefined
    if (!['GET', 'HEAD'].includes(req.method || 'GET')) {
      if (typeof req.body === 'string') {
        body = req.body
      } else if (req.body) {
        body = JSON.stringify(req.body)
      }
    }
    
    const request = new Request(url.toString(), {
      method: req.method || 'GET',
      headers: Object.fromEntries(
        Object.entries(req.headers).map(([k, v]) => [k, String(v)])
      ),
      body,
    } as any)

    // Get response from Hono app
    const response = await app.fetch(request)
    
    // Set response status
    res.status(response.status)
    
    // Copy headers
    response.headers.forEach((value, key) => {
      res.setHeader(key, value)
    })
    
    // Send body
    if (response.body) {
      const buffer = await response.arrayBuffer()
      res.send(Buffer.from(buffer))
    } else {
      res.end()
    }
  } catch (error) {
    console.error('Handler error:', error)
    res.status(500)
    res.send('Internal Server Error')
  }
}

