import inject from 'seacreature/lib/inject'
import express from 'express'
import compression from 'compression'
import bodyParser from 'body-parser'
import cors from 'cors'
import mutunga from 'http-mutunga'
import pjson from '../package.json' assert { type: 'json' }

inject('ctx', async () => {
  const app = express()
  const httpServer = mutunga(app)
  httpServer.setTimeout(5 * 60 * 1000)

  app.options('*', cors({ origin: true }))
  app.use(cors({ origin: true }))
  app.use(compression())
  app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }))
  app.use(bodyParser.json({ limit: '50mb' }))
  app.set('json spaces', 2)
  app.enable('trust proxy')

  return { app, httpServer }
})

inject('pod', async ({ httpServer, app, hub, log, startup }) => {
  const release = startup.retain()
  const port = process.env.EXPRESS_PORT || 8080
  hub.on('ready', () => {
    httpServer.listen(port, async () => {
      // json 404
      app.use((req, res) => res.status(404).send({ message: 'Not Found' }))
      release()
      const { address, port } = httpServer.address()
      hub.on('shutdown', () => httpServer.terminate())
      await log(`${pjson.name}@${pjson.version} ${address}:${port}`)
    })
  })
})
