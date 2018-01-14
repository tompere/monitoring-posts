const lineByLine = require('n-readlines')
const Raven = require('raven')
const _ = require('lodash')

const executionId = `exec_${new Date().getTime()}`

Raven.config(
  process.env.PRODUCTION &&
    'https://88f1d274a601463192b96256d88b7e09:fbdb85f025b64e63b428b2aedf8f54ad@sentry.io/267972',
  {
    release: executionId,
    autoBreadcrumbs: true,
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

process.on('unhandledRejection', err => log(err, { err: true }))

function normalizeKey(val) {
  return val
    .trim()
    .replace(/\s/g, '_')
    .split(/(?=[A-Z])/)
    .join('_')
    .toLowerCase()
}

const DEV_URL = [
  'https://www.jumpro.pe/',
  'http://admin-countrythunder.wixsite.com/countrythunder',
  'http://rachelkathrynbrown.wixsite.com/moonwhiskersdolls',
  'http://simonukbanff.wixsite.com/banffuk',
]

const liner = new lineByLine('./urls.txt')

function* urlsGenerator() {
  if (!process.env.PRODUCTION) {
    for (i in DEV_URL) {
      yield DEV_URL[i]
    }
    return
  }
  let pool = []
  while (true) {
    const ln = liner.next()
    if (pool.length === 60) {
      let shuffeled = _.shuffle(pool)
      for (i in shuffeled) {
        yield shuffeled[i]
      }
      pool = []
    }
    if (!ln) {
      return
    }
    const url = ln.toString('utf8')
    pool.push(url, url, url)
    yield url
  }
}

module.exports = { log, normalizeKey, executionId, urlsGenerator: urlsGenerator() }
