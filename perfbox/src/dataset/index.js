const fs = require('fs')
const _ = require('lodash')
const lineByLine = require('n-readlines')

const cache = { keys: null, firstObj: null, data: [] }
const outputFile = `./dataset-${new Date().getTime()}.csv`

function collectData(jsonOutput) {
  const obj = JSON.parse(jsonOutput)
  let commonKeys = _.keys(obj)
  if (cache.keys) {
    commonKeys = _.intersection(cache.keys, commonKeys)
  }
  cache.keys = commonKeys
  cache.data.push(obj)
}

function* Rows() {
  const liner = new lineByLine('../../dataset-2.txt')
  while (true) {
    const ln = liner.next()
    if (!ln) {
      return
    }
    yield ln.toString('utf8')
  }
}

async function main() {
  const rows = Rows()
  for (let row; (row = rows.next().value); ) {
    collectData(row)
  }
  const keys = _.sortBy(cache.keys)
  fs.appendFileSync(outputFile, `${keys.join(',')}\n`)
  const writes = []
  cache.data.forEach(o => {
    const result = _.pick(o, keys)
    const csvRow = `${_.values(result).join(',')}\n`
    writes.push(new Promise(resolve => fs.appendFile(outputFile, csvRow, resolve)))
  })
  await Promise.all(writes)
}

main()
