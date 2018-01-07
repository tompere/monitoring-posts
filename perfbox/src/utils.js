const lineByLine = require('n-readlines')

function log(msg, config = {}) {
  const timestamp = `[${new Date().toISOString()}]`
  if (config.err) {
    console.log('\x1b[31m', `${timestamp} ${msg}`)
  } else {
    console.log('\x1b[36m%s\x1b[0m', `${timestamp} ${msg}`)
  }
}

function normalizeKey(val) {
  return val
    .trim()
    .split(/(?=[A-Z])/)
    .join('_')
    .toLowerCase()
}

const DEV_URL = [
  'https://www.jumpro.pe/',
  'http://admdejusticia.wixsite.com/admdejusticia',
  'http://mcclureterri.wixsite.com/phatt',
]

const liner = new lineByLine('./urls.txt')

function* urlsGenerator() {
  if (!process.env.PRODUCTION) {
    for (i in DEV_URL) {
      yield DEV_URL[i]
    }
    return
  }
  while (true) {
    const ln = liner.next()
    if (!ln) {
      return
    }
    yield ln.toString('utf8')
  }
}

module.exports = { log, normalizeKey, urlsGenerator: urlsGenerator() }
