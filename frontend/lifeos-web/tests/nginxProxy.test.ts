import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('nginx proxies API requests before the SPA fallback', async () => {
  const config = await readFile(new URL('../nginx.conf', import.meta.url), 'utf8')
  const apiLocation = config.indexOf('location /api/')
  const spaLocation = config.indexOf('location / {')

  assert.ok(apiLocation >= 0, 'nginx must define an API location')
  assert.ok(apiLocation < spaLocation, 'the API location must precede the SPA fallback')
  assert.match(config, /proxy_pass https:\/\/lifeos-api-94214131383\.us-east1\.run\.app;/)
  assert.match(config, /proxy_ssl_server_name on;/)
  assert.match(config, /try_files \$uri \$uri\/ \/index\.html;/)
})
