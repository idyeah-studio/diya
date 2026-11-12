// Serves the built harness (r18, r19 and their -dev twins, under node_modules/.cache) for Playwright.
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { dirname, extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'node_modules', '.cache', 'diya-browser')
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' }
const port = Number(process.env.DIYA_HARNESS_PORT ?? 4710)
createServer(async (request, response) => {
  const path = normalize(decodeURIComponent(new URL(request.url, 'http://harness').pathname)).replace(/^(\.\.[/\\])+/, '')
  const file = join(root, path.endsWith('/') ? `${path}index.html` : path)
  try {
    const body = await readFile(file)
    response.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store' })
    response.end(body)
  } catch {
    response.writeHead(404)
    response.end()
  }
}).listen(port, () => console.log(`harness on http://localhost:${port}`))
