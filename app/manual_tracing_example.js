import inject from 'seacreature/lib/inject'
import { trace, SpanStatusCode } from '@opentelemetry/api'
import { SemanticAttributes } from '@opentelemetry/semantic-conventions'

// https://github.com/open-telemetry/opentelemetry-js-api/blob/main/docs/tracing.md

inject('pod', async ({ app }) => {
  app.get('/', async (req, res) => {
    const tracer = trace.getTracer('api-ideal', '1.0.0')
    const span = tracer.startSpan(`GET /`, {
      attributes: {
        [SemanticAttributes.HTTP_METHOD]: 'GET',
        [SemanticAttributes.HTTP_URL]: req.url,
        [SemanticAttributes.HTTP_STATUS_CODE]: 200
      }
    })
    try {
      res.status(200).json({ ok: true })
      span.setStatus({ code: SpanStatusCode.OK })
    } catch (err) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: err.message
      })
    } finally {
      span.end()
    }
  })
})
