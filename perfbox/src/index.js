const start = process.hrtime()

const { fork, exec } = require('child_process')
const { log, urlsGenerator, executionId } = require('./utils')
const fs = require('fs')

const datasetFilePath = `${__dirname}/../dataset-${executionId}.txt`

const add = output =>
  new Promise(resolve => {
    fs.appendFile(datasetFilePath, `${output}\n`, resolve)
  })

const execTask = url =>
  new Promise((resolve, reject) => {
    if (url) {
      const task = fork('./src/task.js', [url])
      task.on('message', msg => {
        clearTimeout(timeout)
        resolve(msg)
      })
      const timeout = setTimeout(() => {
        task.kill()
        log(`task for url ${url} killed on timeout`, { err: true })
        resolve(false)
      }, 60000)
    } else {
      resolve(false)
    }
  })

const manageExecution = () =>
  Promise.all(
    new Array(3)
      .join('c')
      .split('c')
      .map(() => execTask(urlsGenerator.next().value))
  )

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
        log(`[execution error] url: ${taskResult.url}; message: ${taskResult.err}`, { err: true })
        count.fail++
      }
      return shouldRun
    }, false)
    if (!run) {
      break
    }
    log(`finished ${count.success} successful tasks, ${count.fail} failed tasks`)
  }
  const doneTasks = await Promise.all(tasks)
  log(
    `finished successfully! analyzed ${doneTasks.length} sites in ${
      process.hrtime(start)[0]
    } seconds; see ${datasetFilePath}`
  )
}

;(async () => {
  await main()
  log(`done`)
})()
