const start = process.hrtime()
const compItemsMetadata = require('./pageJson/data-items/comps-data-items')
const fetcher = require('./fecther/fetcher')
;(async () => {
  const url = process.argv[2]
  try {
    await fetcher.init()
    const { masterPage, page, ...otherMetrics } = await fetcher.fetchSiteMetrics(`${url}`)
    if (masterPage && page) {
      const y = [
        'santa_render_duration',
        'santa_layout_duration',
        'santa_relayout_duration',
      ].reduce((total, metricKey) => total + Math.pow(otherMetrics[metricKey], 2), 0)
      const output = JSON.stringify({
        ...compItemsMetadata.execJson({ masterPage, page }),
        ...otherMetrics,
        y,
      })
      const duration = process.hrtime(start)[0]
      process.send({ url, output, duration })
    } else {
      process.send({
        url,
        output: null,
        duration: 0,
        err: `missing pages: [${masterPage ? '' : 'masterPage'}], [${page ? '' : 'page'}]`,
      })
    }
  } catch (err) {
    process.send({ url, output: null, duration: 0, err: `failed fetching pages: ${err}` })
  }
  await fetcher.close()
})()
