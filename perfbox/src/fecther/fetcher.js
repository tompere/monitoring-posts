const puppeteer = require('puppeteer')
const _ = require('lodash')
const { log, normalizeKey } = require('../utils')
const fs = require('fs')
const lineByLine = require('n-readlines')

require('dotenv').config()

const CACHE_FILE = `${__dirname}/../../cache/cache.txt`

if (!process.env.COOKIE) {
  log('set cookie in .env file!', { err: true })
  throw new Error()
}

const GLOBAL_FETCH_TIMEOUT = 450000

const asyncResult = (type, result) => Promise.resolve(result).then(value => ({ type, value }))

const userMeasuresMetrics = measures =>
  _(measures)
    .map(measureObj => ({
      [`meausre_${normalizeKey(measureObj.name)}`]: measureObj.duration,
    }))
    .value()
    .reduce((res, o) => ({ ...res, ...o }), {})

const generalMetrics = obj => _.mapKeys(obj, (value, key) => normalizeKey(key))

const extractMetrics = result => {
  switch (result.type) {
    case 'storyJson':
      return result.value
    case 'measures':
      return userMeasuresMetrics(result.value)
    case 'general':
      return generalMetrics(result.value)
    default:
      return {}
  }
}

const isStoryJson = url =>
  _.includes(url, '/_api/onboarding-server-web/story') && !_.includes(url, 'metadata')

const isPageLoadDone = url => _.includes(url, '&src=66&evid=50')

const pageDoneDefered = state =>
  new Promise(resolve => {
    const autoTimeout = setTimeout(() => resolve(), GLOBAL_FETCH_TIMEOUT)
    state.reportPageDone = () => {
      clearTimeout(autoTimeout)
      resolve()
    }
  })

const processResults = results =>
  results.reduce(
    (res, obj) => ({
      ...res,
      ...extractMetrics(obj),
    }),
    {}
  )

const VALID_RESPONSE_CODES = [200]

async function onNetworkResponse(response, page, state) {
  if (isPageLoadDone(response.url)) {
    const measures = await page.evaluate(() =>
      JSON.stringify(performance.getEntriesByType('measure'))
    )
    state.results.push(asyncResult('measures', JSON.parse(measures)))
    state.reportPageDone()
  }
}

async function fetchSiteMetrics(url, resourcesCache) {
  const state = { results: [] }
  const isPageDone = pageDoneDefered(state)
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    // headless: false,
  })
  const page = await browser.newPage()
  await page.setCookie({
    url: 'https://www.wix.com',
    name: 'wixSession2',
    value: process.env.COOKIE,
    domain: '.wix.com',
  })
  await page.setRequestInterception(true)
  page.on('request', async request => {
    const { url } = request
    if (
      (_.includes(url, 'frog.wix.com') || _.includes(url, '.newrelic.com')) &&
      !isPageLoadDone(url)
    ) {
      request.respond({})
      return
    }
    const resource = resourcesCache[url]
    if (resource) {
      const body = Buffer.from(JSON.parse(resource.payload).data, 'utf8')
      await request.respond({
        status: 200,
        body,
      })
      return
    }
    if (_.includes(url, 'static.wixstatic.com') && /\.webp/.test(url)) {
      await request.respond({
        status: 200,
        body: Buffer.from(JSON.parse(resourcesCache['.webp'].payload).data, 'utf8'),
        headers: {
          'content-type': 'image/webp; charset=utf-8',
          'cache-control': 'max-age=3600',
        },
      })
      return
    }
    request.continue()
  })
  page.on('response', response => onNetworkResponse(response, page, state, resourcesCache))
  page.on('error', error => log(error, { err: true }))
  try {
    const start = process.hrtime() //(start)[0]
    const resp = await page.goto(url, { timeout: GLOBAL_FETCH_TIMEOUT })
    if (!resp) {
      throw new Error(`got falsy page response for ${url} (probably 404)`)
      await browser.close()
    }
    await isPageDone
    await browser.close()
    const rawResults = await Promise.all(state.results)
    const _duration = process.hrtime(start)[0]
    rawResults.push({ type: 'general', value: { _duration } })
    return processResults(rawResults)
  } catch (err) {
    log(err, { err: true })
    await browser.close()
    return null
  }
}

async function populateCache() {
  const state = {}
  const isPageDone = pageDoneDefered(state)
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  })
  const page = await browser.newPage()
  await page.setCookie({
    url: 'https://www.wix.com',
    name: 'wixSession2',
    value: process.env.COOKIE,
    domain: '.wix.com',
  })
  if (fs.existsSync(CACHE_FILE)) {
    fs.unlinkSync(CACHE_FILE)
  }
  const mediaCache = {}
  ;['webp'].forEach(ext => {
    fs.readFile(`${__dirname}/../../cache/dummy_adi.${ext}`, (err, buffer) => {
      fs.appendFile(
        CACHE_FILE,
        `${JSON.stringify({
          url: `.${ext}`,
          payload: JSON.stringify(buffer),
        })}\n`,
        'utf8',
        _.noop
      )
    })
  })
  page.on('response', async response => {
    const { url, headers } = response
    if (isPageLoadDone(url)) {
      state.reportPageDone()
    } else if (
      (_.includes(url, 'static.parastorage.com') || _.includes(url, 'maps.googleapis.com')) &&
      /(\.css|\.js)/.test(url) &&
      !/(\.zip\.js)/.test(url)
    ) {
      const buffer = await response.buffer()
      fs.appendFile(
        CACHE_FILE,
        `${JSON.stringify({
          url,
          payload: JSON.stringify(buffer),
        })}\n`,
        'utf8',
        _.noop
      )
    }
  })
  page.on('error', error => log(error, { err: true }))
  try {
    const resp = await page.goto(
      'https://www.wix.com/website/builder/#!/builder/story/2fd34d6a-21f0-4c8f-a9dc-10f955bc38b8:49ab6231-7b3c-4bc9-8577-cad58130ab8c',
      { timeout: GLOBAL_FETCH_TIMEOUT }
    )
    await isPageDone
  } catch (err) {
    log(err, { err: true })
  }
  await browser.close()
  return CACHE_FILE
}

module.exports = { fetchSiteMetrics, populateCache }
