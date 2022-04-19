import inject from 'seacreature/lib/inject'
import { parentPort } from 'worker_threads'
import fs from 'fs/promises'

inject('pod', async ({ hub }) => {
  hub.on('expensive-operation', async p => {
    console.log('Thread has been passed parameters:', p)

    const data = { message: 'Goodbye Threaded World' }
    // Work done here to populate data

    // Option 1 for returning data
    // See app/expensive.js -> Option 1 for receiving result of work
    // Advantage: simple to implement
    // Disadvantage: holds up main thread while data is being transferred
    // Suggestion: only use if a small amount of data needs to be returned to main thread
    // parentPort.postMessage({ data, 'expensive-operation-complete': true })

    // Option 2 for returning data
    // Advantage: writing to file and then reading file on main thread does not hold up main thread as much as option 1
    // Disadvantage: requires main thread to read in and process file written by thread
    // Suggestion: use this method if there is a lot of information to return to main thread
    await fs.writeFile('./data/out.json', JSON.stringify(data))
    parentPort.postMessage({ 'expensive-operation-complete': true })
  })
})
