const lineByLine = require('n-readlines')
const Raven = require('raven')

Raven.config(
  process.env.PRODUCTION &&
    'https://88f1d274a601463192b96256d88b7e09:fbdb85f025b64e63b428b2aedf8f54ad@sentry.io/267972'
).install()

function log(msg, config = {}) {
  const ravenMsg = `${msg} [${Math.random()}]`
  if (config.err) {
    Raven.captureException(`${config.err}`, {
      level: 'error',
    })
  } else {
    Raven.captureMessage(`${ravenMsg}`, {
      level: 'info',
    })
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
