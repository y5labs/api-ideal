import { Worker } from 'worker_threads'
import inject from 'seacreature/lib/inject'

inject('ctx', async ({ hub }) => {
  // Hold information returned from different jobs
  const jobs = []

  // General callback for all jobs
  const callback = async (error, message) => {
    if (error) {
      return console.error('Error:', error)
    }

    for (const { terminateKey, emitResultTo: emitTo } of jobs) {
      if (message[terminateKey]) {
        hub.emit(emitTo, message.data)
      }
    }
  }

  const newThread = path => {
    const worker = new Worker(path, {})
    worker.on('message', callback.bind(null, null))
    worker.on('error', callback)
    worker.on('exit', exitCode => {
      if (exitCode === 0) return null
      return callback(new Error(`Worker has stopped with code ${exitCode}`))
    })

    const startJob = ({ action, data, terminateKey, emitResultTo }) => {
      jobs.push({ terminateKey, emitResultTo })
      worker.postMessage({ action, data })
    }

    return {
      startJob
    }
  }

  return { thread: newThread('./thread/index.js') }
})
