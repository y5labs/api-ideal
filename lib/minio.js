import inject from 'seacreature/lib/inject'
import Minio from 'minio'

inject('ctx', async () => {
  const minio = new Minio.Client({
    endPoint: process.env.MINIO_HOST,
    port: parseInt(process.env.MINIO_PORT),
    useSSL: process.env.MINIO_USE_SSL == 'true',
    accessKey: process.env.MINIO_ACCESS_KEY,
    secretKey: process.env.MINIO_SECRET_KEY
  })
  return { minio }
})