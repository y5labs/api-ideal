import inject from 'seacreature/lib/inject'
import check from 'seacreature/lib/check'

inject('pod', ({ log }) => {
  inject('req.validate', spec => async (req, res, next) => {
    const result = await check(spec)(req)
    if (result.isvalid) return next()
    res.status(400).send(result)
  })
})