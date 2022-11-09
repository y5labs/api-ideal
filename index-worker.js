process.on('uncaughtException', e => console.error('uncaughtException', e))

import './lib/hub'
import './lib/health'
import './lib/pg-db'
import './lib/pg-boss'
import './lib/telnet'
import './lib/worker-client'

// import './app/worker'

import './lib/plumbing'