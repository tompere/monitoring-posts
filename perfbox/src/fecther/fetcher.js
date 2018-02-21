const puppeteer = require('puppeteer')
const _ = require('lodash')
const utils = require('../utils')
require('dotenv').config()

if (!process.env.COOKIE) {
  utils.log('set cookie in .env file!', { err: true })
  throw new Error()
}

const GLOBAL_FETCH_TIMEOUT = 45000

const asyncResult = (type, result) => Promise.resolve(result).then(value => ({ type, value }))

const pageJsonMetrics = page => {
  const key = !('title' in page) && !('pageUriSEO' in page) ? 'masterPage' : 'page'
  return { [key]: page }
}

const userMeasuresMetrics = measures =>
  _(measures)
    .map(measureObj => ({
      [`meausre_${utils.normalizeKey(measureObj.name)}`]: measureObj.duration,
    }))
    .value()
    .reduce((res, o) => ({ ...res, ...o }), {})

const puppeteerPageMetrics = obj =>
  _.mapKeys(obj, (value, key) => utils.normalizeKey(`puppeteer_${key}`))

const extractMetrics = result => {
  switch (result.type) {
    case 'storyJson':
      return result.value
    case 'measures':
      return userMeasuresMetrics(result.value)
    case 'pageMetrics':
      return puppeteerPageMetrics(result.value)
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

async function onNetworkResponse(response, page, state, originUrl) {
  if (isStoryJson(response.url)) {
    state.results.push(asyncResult('storyJson', response.json()))
  } else if (isPageLoadDone(response.url)) {
    state.results.push(asyncResult('pageMetrics', page.metrics()))
    const measures = await page.evaluate(() =>
      JSON.stringify(performance.getEntriesByType('measure'))
    )
    state.results.push(asyncResult('measures', JSON.parse(measures)))
    state.reportPageDone()
  }
}

async function fetchSiteMetrics(url) {
  const state = { results: [] }
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
  page.on('response', response => onNetworkResponse(response, page, state, url))
  page.on('error', error => utils.log(error, { err: true }))
  try {
    const resp = await page.goto(url, { timeout: GLOBAL_FETCH_TIMEOUT })
    if (!resp) {
      throw new Error(`got falsy page response for ${url} (probably 404)`)
      await browser.close()
    }
    await isPageDone
    await browser.close()
    const rawResults = await Promise.all(state.results)
    return processResults(rawResults)
  } catch (err) {
    utils.log(err, { err: true })
    await browser.close()
    return null
  }
}

module.exports = { fetchSiteMetrics }
