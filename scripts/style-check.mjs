// Fails the build on the AI-look tells the design brief bans. Dependency-free
// stand-in for slopscan (not on npm under that name). Run on every push.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = new URL('../src', import.meta.url).pathname

const RULES = [
  { name: 'em dash in copy', re: /—/, why: 'Brief: no em dashes in site copy' },
  { name: 'Inter font', re: /\bInter\b(?!\w)/, why: 'Brief: avoid the AI-default font Inter' },
  { name: 'Space Grotesk / Fraunces / Instrument Serif', re: /Space Grotesk|Fraunces|Instrument Serif/, why: 'Brief: avoid AI-default display fonts' },
  { name: 'gradient text', re: /bg-clip-text|text-transparent.*bg-gradient/, why: 'Brief: no gradient text' },
  { name: 'purple-to-blue gradient', re: /(from|to|via)-(purple|violet|indigo|blue)-\d{3}/, why: 'Brief: no purple-to-blue gradient' },
  { name: 'transition: all', re: /transition:\s*all|transition-all/, why: 'Brief: animate only position and opacity' },
  { name: 'raw scroll listener', re: /addEventListener\(\s*['"]scroll['"]/, why: 'Brief: no raw scroll listeners' },
  { name: 'cream background', re: /#f[5-9]f[0-3]e[0-9a-f]\b|#fdf6e3|old paper/i, why: 'Brief: no cream or parchment backgrounds' },
]

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return walk(path)
    return /\.(tsx?|css|html)$/.test(name) ? [path] : []
  })
}

let failures = 0
for (const file of walk(ROOT)) {
  const lines = readFileSync(file, 'utf8').split('\n')
  lines.forEach((line, i) => {
    for (const rule of RULES) {
      if (rule.re.test(line)) {
        failures++
        console.error(`${relative(process.cwd(), file)}:${i + 1}  ${rule.name}  (${rule.why})`)
      }
    }
  })
}

if (failures) {
  console.error(`\nstyle-check: ${failures} problem(s)`)
  process.exit(1)
}
console.log('style-check: clean')
