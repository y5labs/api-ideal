import inject from 'seacreature/lib/inject'
import { parentPort } from 'worker_threads'

inject('ctx', async ctx => {
  const listeners = new Map()

  parentPort.on('message', async ([e, ...args]) => {
    if (!listeners.has(e)) return
    for (const cb of listeners.get(e).values())
      await cb(...args)
  })
  parentPort.on('error', e => console.error(e))

  return {
    worker: {
      emit: (e, ...args) => parentPort.postMessage([e, ...args]),
      on: (e, cb) => {
        if (!listeners.has(e)) listeners.set(e, new Set())
        listeners.get(e).add(cb)
        return () => listeners.get(e).delete(cb)
      }
    }
  }
})