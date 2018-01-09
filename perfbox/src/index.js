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

const manageExecution = () =>
  Promise.all(
    new Array(1)
      .join('c')
      .split('c')
      .map(() => execTask(urlsGenerator.next().value))
  )

const waitForIt = (ms = 1500) => new Promise(resolve => setTimeout(() => resolve(), ms))

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
    if (!run) {
      break
    }
    log(`finished ${count.success} successful tasks, ${count.fail} failed tasks`)
    await waitForIt()
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
