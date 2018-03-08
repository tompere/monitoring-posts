const start = process.hrtime()
const compItemsMetadata = require('./pageJson/data-items/comps-data-items')
const fetcher = require('./fecther/fetcher')

const url = process.argv[2]

fetcherresourcesCache
  .fetchSiteMetrics(url)
  .then(metrics => {
    const output = JSON.stringify(metrics)
    const duration = process.hrtime(start)[0]
    process.send({ url, output, duration })
  })
  .catch(err => {
    process.send({ url, output: null, duration: 0, err: `failed fetching pages: ${err}` })
  })
