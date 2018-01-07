const start = process.hrtime()
const compItemsMetadata = require('./pageJson/data-items/comps-data-items')
const fetcher = require('./fecther/fetcher')

const url = process.argv[2]

fetcher
  .fetchSiteMetrics(`${url}`)
  .then(({ masterPage, page, ...otherMetrics }) => {
    if (masterPage && page) {
      const TARGET = [
        'santa_render_duration',
        'santa_layout_duration',
        'santa_relayout_duration',
      ].reduce((total, metricKey) => total + Math.pow(otherMetrics[metricKey], 2), 0)
      const output = JSON.stringify({
        ...compItemsMetadata.execJson({ masterPage, page }),
        ...otherMetrics,
        TARGET,
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
  })
  .catch(err => {
    process.send({ url, output: null, duration: 0, err: `failed fetching pages: ${err}` })
  })
