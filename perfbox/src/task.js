const start = process.hrtime()
const fetcher = require('./fecther/fetcher')

const url = process.argv[2]

process.on('message', msg => {
  const { cache } = msg
  fetcher
    .fetchSiteMetrics(url, cache)
    .then(metrics => {
      const output = JSON.stringify(metrics)
      const duration = process.hrtime(start)[0]
      process.send({ done: true, url, output, duration })
    })
    .catch(err => {
      process.send({
        done: true,
        url,
        output: null,
        duration: 0,
        err: `failed fetching pages: ${err}`,
      })
    })
})
