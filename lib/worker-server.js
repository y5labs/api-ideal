import inject from 'seacreature/lib/inject'
import { Worker } from 'worker_threads'

inject('ctx', async ctx => {
  const worker_path = process.env.WORKER_PATH ?? './index-worker.js'
  if (worker_path == '' || worker_path == 0)
    return { worker: { emit: () => {}, on: () => {}, } }

  const listeners = new Map()

  // --es-module-specifier-resolution=node
  const worker = new Worker(worker_path, {})
  worker.on('message', async ([e, ...args]) => {
    if (!listeners.has(e)) return
    for (const cb of listeners.get(e).values())
      await cb(...args)
  })
  worker.on('error', e => console.error(e))
  worker.on('exit', code => {
    if (code === 0) return null
    console.error(`Worker stopped with exit code ${code}`)
  })

  return {
    worker: {
      emit: (e, ...args) => worker.postMessage([e, ...args]),
      on: (e, cb) => {
        if (!listeners.has(e)) listeners.set(e, new Set())
        listeners.get(e).add(cb)
        return () => listeners.get(e).delete(cb)
      }
    }
  }
})