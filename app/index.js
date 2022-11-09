import inject from 'seacreature/lib/inject'

inject('pod', async ({ app }) => {
  app.get('/api', inject.one('req.guard')(async (req, res) => {
    res.send({ ok: true })
  }))
})
