const fs = require('fs')
const _ = require('lodash')
const prependFile = require('prepend-file')

const datasetFilePath = `${__dirname}/../../dataset-${new Date().getTime()}.csv`
const cache = { keys: null, firstObj: null }

function normalizeOutput(jsonOutput) {
  let obj = JSON.parse(jsonOutput)
  let commonKeys = _.keys(obj)
  if (cache.keys) {
    commonKeys = _.intersection(cache.keys, commonKeys)
  } else {
    cache.firstObj = jsonOutput
    obj = null
  }
  cache.keys = _.sortBy(commonKeys)
  return _.pick(obj, cache.keys)
}

async function add(output) {
  return new Promise(resolve => {
    const o = normalizeOutput(output)
    if (_.isEmpty(o)) {
      resolve()
    }
    const csvRow = `${_.values(o).join(',')}\n`
    fs.appendFile(datasetFilePath, csvRow, resolve)
  })
}

const getFilename = () => datasetFilePath

const getFirstObj = () => cache.firstObj

const prepandColumns = () => {
  return new Promise((resolve, reject) => {
    prependFile(datasetFilePath, `${cache.keys.join(',')}\n`, err => {
      if (err) {
        reject(err)
      }
      resolve()
    })
  })
}

module.exports = { add, getFilename, getFirstObj, prepandColumns }
