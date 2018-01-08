const lineByLine = require('n-readlines')
const Raven = require('raven')

const executionId = `exec_${new Date().getTime()}`

Raven.config(
  process.env.PRODUCTION &&
    'https://88f1d274a601463192b96256d88b7e09:fbdb85f025b64e63b428b2aedf8f54ad@sentry.io/267972',
  {
    release: executionId,
    autoBreadcrumbs: { console: false },
    captureUnhandledRejections: true,
  }
).install()

function log(msg, config = {}) {
  const timestamp = new Date().toISOString()
  if (config.err) {
    Raven.captureException(`${config.err} [${timestamp}]`, {
      level: 'error',
    })
    console.log('\x1b[31m', `[${timestamp}] ${msg}`)
  } else {
    Raven.captureMessage(`${msg} [${timestamp}]`, {
      level: 'info',
    })
    console.log('\x1b[36m%s\x1b[0m', `[${timestamp}] ${msg}`)
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

module.exports = { log, normalizeKey, executionId, urlsGenerator: urlsGenerator() }
