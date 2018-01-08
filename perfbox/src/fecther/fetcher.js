const puppeteer = require('puppeteer')
const _ = require('lodash')
const utils = require('../utils')

const asyncResult = (type, result) => Promise.resolve(result).then(value => ({ type, value }))

const pageJsonMetrics = page => {
  const key = !('title' in page) && !('pageUriSEO' in page) ? 'masterPage' : 'page'
  return { [key]: page }
}

const userMeasuresMetrics = measures =>
  _(measures)
    .orderBy(measureObj => measureObj.duration)
    .map((measureObj, i) => ({
      [utils.normalizeKey(`santa_${measureObj.name}_duration_rank`)]: i,
      [utils.normalizeKey(`santa_${measureObj.name}_duration`)]: measureObj.duration,
    }))
    .value()
    .reduce((res, o) => ({ ...res, ...o }), {})

const puppeteerPageMetrics = obj =>
  _.mapKeys(obj, (value, key) => utils.normalizeKey(`puppeteer_${key}`))

const extractMetrics = result => {
  switch (result.type) {
    case 'pageJson':
      return pageJsonMetrics(result.value)
    case 'measures':
      return userMeasuresMetrics(result.value)
    case 'pageMetrics':
      return puppeteerPageMetrics(result.value)
    default:
      return {}
  }
}

const isPageJsonResponse = url => _.includes(url, 'json.z?v=3')

const isPageLoadDone = url => _.includes(url, '&evid=350')

const pageDoneDefered = state =>
  new Promise(resolve => {
    state.reportPageDone = () => resolve()
  })

const processResults = results =>
  results.reduce(
    (res, obj) => ({
      ...res,
      ...extractMetrics(obj),
    }),
    {}
  )

async function onNetworkResponse(response, page, state) {
  if (isPageJsonResponse(response.url)) {
    state.results.push(asyncResult('pageJson', response.json()))
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
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] })
  const page = await browser.newPage()
  page.on('response', response => onNetworkResponse(response, page, state))
  page.on('error', error => utils.log(error, { err: true }))
  page.goto(`${url}`, { timeout: 60000 })
  await isPageDone
  await browser.close()
  const rawResults = await Promise.all(state.results)
  return processResults(rawResults)
}

module.exports = { fetchSiteMetrics }
