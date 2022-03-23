'use strict'
import process from 'process'
import opentelemetry from '@opentelemetry/sdk-node'
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'
import { OTLPTraceExporter } from '@opentelemetry/exporter-otlp-grpc'

if (process.env.NODE_ENV == 'production') {
  const traceExporter = new OTLPTraceExporter()
  const sdk = new opentelemetry.NodeSDK({
    traceExporter,
    instrumentations:
      process.env.ENABLE_AUTO_INSTRUMENTATION == 1
        ? [getNodeAutoInstrumentations()]
        : []
  })
  sdk
    .start()
    .then(() => console.log('Tracing initialized'))
    .catch(error => console.log('Error initializing tracing', error))
  process.on('SIGTERM', () => {
    sdk
      .shutdown()
      .then(() => console.log('Tracing terminated'))
      .catch(error => console.log('Error terminating tracing', error))
      .finally(() => process.exit(0))
  })
}
