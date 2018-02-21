const start = process.hrtime()
const compItemsMetadata = require('./pageJson/data-items/comps-data-items')
const fetcher = require('./fecther/fetcher')

const url = process.argv[2]

fetcher
  .fetchSiteMetrics(`${url}`)
  .then(metrics => {
    const init_builder = metrics['meausre_init_builder']
    const load_preview_url = metrics['meausre_load_preview_url']
    const set_up_cache_by_kit = metrics['meausre_set_up_cache_by_kit']
    const y = init_builder - (load_preview_url + set_up_cache_by_kit)
    const output = JSON.stringify({
      ...metrics,
      y,
    })
    const duration = process.hrtime(start)[0]
    process.send({ url, output, duration })
  })
  .catch(err => {
    process.send({ url, output: null, duration: 0, err: `failed fetching pages: ${err}` })
  })
