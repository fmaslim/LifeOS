import { readdir, stat } from 'node:fs/promises'
import path from 'node:path'

const assets = path.resolve('dist/assets')
const files = (await readdir(assets)).filter(file => file.endsWith('.js'))
const sizes = await Promise.all(files.map(async file => ({ file, bytes: (await stat(path.join(assets, file))).size })))
const total = sizes.reduce((sum, item) => sum + item.bytes, 0)
const largest = Math.max(...sizes.map(item => item.bytes), 0)
const limits = { largest: 325_000, total: 1_200_000 }
console.log(`JavaScript chunks: ${sizes.length}; largest: ${(largest / 1024).toFixed(1)} KiB; total: ${(total / 1024).toFixed(1)} KiB`)
if (files.length < 8 || largest > limits.largest || total > limits.total) {
  console.error(`Bundle guard failed (minimum 8 chunks, largest ${limits.largest} bytes, total ${limits.total} bytes).`)
  process.exitCode = 1
}
