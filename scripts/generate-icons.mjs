import sharp from 'sharp'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.join(__dirname, '..', 'public')
const sizes = [192, 512]

const sources = [
  { src: path.join(__dirname, 'icon-source.svg'), prefix: 'icon' },
  { src: path.join(__dirname, 'icon-source-monochrome.svg'), prefix: 'icon-monochrome' }
]

for (const { src, prefix } of sources) {
  for (const size of sizes) {
    await sharp(src, { density: 384 })
      .resize(size, size)
      .png()
      .toFile(path.join(outDir, `${prefix}-${size}.png`))
    console.log(`wrote ${prefix}-${size}.png`)
  }
}
