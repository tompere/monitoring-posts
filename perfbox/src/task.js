const start = process.hrtime()
const compItemsMetadata = require('./pageJson/data-items/comps-data-items')
const fetcher = require('./fecther/fetcher')

async function run(url) {
  await fetcher.init()
  try {
    const { masterPage, page, ...otherMetrics } = await fetcher.fetchSiteMetrics(`${url}`)
    if (masterPage && page) {
      const y = [
        'santa_render_duration',
        'santa_layout_duration',
        'santa_re_layout_duration',
      ].reduce((total, metricKey) => total + Math.pow(otherMetrics[metricKey], 2), 0)
      const output = JSON.stringify({
        ...otherMetrics,
        y,
      })
      const duration = process.hrtime(start)[0]
      return { url, output, duration }
    } else {
      return {
        url,
        output: null,
        duration: 0,
        err: `missing pages: [${masterPage ? '' : 'masterPage'}], [${page ? '' : 'page'}]`,
      }
    }
  } catch (err) {
    return { url, output: null, duration: 0, err: `failed fetching pages: ${err}` }
  }
}

async function end() {
  await fetcher.close()
}

module.exports = { run, end }
