import inject from 'seacreature/lib/inject'
import { parentPort } from 'worker_threads'

inject('pod', async ({ hub }) => {
  parentPort.on('message', async ({ action, data }) => {
    console.log('Thread director receives action:', action)
    await hub.emit(action, data)
  })
})
