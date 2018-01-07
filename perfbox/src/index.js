const start = process.hrtime()

const { fork, exec } = require('child_process')
const { log, urlsGenerator } = require('./utils')
const { add, getFilename, finalizeDataSet } = require('./dataset-builder')

const execTask = url =>
  new Promise(resolve => {
    if (url) {
      fork('./src/task.js', [url]).on('message', resolve)
    } else {
      resolve(false)
    }
  })

async function manageExecution() {
  const c = '$'
  return Promise.all(
    new Array(5)
      .join(c)
      .split(c)
      .map(() => execTask(urlsGenerator.next().value))
  )
}

async function main() {
  const tasks = []
  while (true) {
    const count = { success: 0, fail: 0 }
    const results = await manageExecution()
    const run = results.reduce((agg, taskResult) => {
      const shouldRun = agg || !!taskResult
      if (!taskResult) {
        return false
      }
      if (taskResult.output) {
        tasks.push(add(taskResult.output))
        count.success++
      } else if (taskResult.err) {
        log(`[execution error] ur: ${taskResult.url}; message: ${taskResult.err}`, { err: true })
        count.fail++
      }
      return shouldRun
    }, false)
    log(`finished ${count.success} successful tasks, ${count.fail} failed tasks`)
    if (!run) {
      break
    }
  }
  const doneTasks = await Promise.all(tasks)
  await finalizeDataSet()
  log(
    `finished successfully! analyzed ${doneTasks.length} sites in ${
      process.hrtime(start)[0]
    } seconds; see ${getFilename()}`
  )
}

;(async () => {
  await main()
  log(`done`)
})()
