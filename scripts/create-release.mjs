import fs from 'node:fs'
import path from 'node:path'
import archiver from 'archiver'

const projectRoot = process.cwd()
const distDir = path.join(projectRoot, 'dist')
const releaseDir = path.join(projectRoot, 'release')
const packageJson = JSON.parse(
  fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'),
)
const outputFile = path.join(
  releaseDir,
  `${packageJson.name}-v${packageJson.version}.zip`,
)

if (!fs.existsSync(distDir)) {
  throw new Error('dist/ 不存在，请先运行 npm run build')
}

fs.mkdirSync(releaseDir, { recursive: true })

await new Promise((resolve, reject) => {
  const output = fs.createWriteStream(outputFile)
  const archive = archiver('zip', { zlib: { level: 9 } })

  output.on('close', resolve)
  archive.on('error', reject)
  archive.pipe(output)
  archive.directory(distDir, false)
  archive.finalize()
})

console.log(`Created release package: ${outputFile}`)
