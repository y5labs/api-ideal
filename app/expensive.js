import inject from 'seacreature/lib/inject'
import fs from 'fs/promises'

/*
Scenario: The API Project is required to perform an expensive operation that, if done on the main thread, would
interfere with timely responces to other tasks (such as responding to web requests)
*/
inject('pod', async ({ hub, thread }) => {
  hub.on('start-expensive-work', p => {
    thread.startJob({
      // The name given to the operation to be run on a seperate thread
      action: 'expensive-operation',
      // The data to be passed to the thread
      data: p,
      // The key that will be used to signal the completion of the threads task
      // See thread/app/task.js
      terminateKey: 'expensive-operation-complete',
      // The label to emit to when the threads task is complete
      emitResultTo: 'complete-expensive-work'
    })
  })

  // Will be called when the threads work in complete, see 'emitResultTo' above
  hub.on('complete-expensive-work', async p => {
    // Option 1 for receiving result of work
    // See thread/app/task.js -> Option 1 for returning data
    // console.log('Result of expensive work:', p)

    // Option 2 for receiving result of work
    // See thread/app/task.js -> Option 2 for returning data
    const data = JSON.parse(await fs.readFile('./data/out.json'))
    console.log('Result of expensive work:', data)
  })

  inject('command.run_expensive_operation', async () => {
    hub.emit('start-expensive-work', { message: 'Hello Threaded World' })
  })
})
