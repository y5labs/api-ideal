import inject from 'seacreature/lib/inject'
import pg from 'pg'
const { Pool } = pg

inject('command.sql', async ({ args, log, pgdb }) => {
  if (!args.length > 1) return
  else if (args[0] == 'select')
    await Promise.all(
      (await pgdb.query(args.join(' '))).rows.map(r => log(r)))
  else await log(await pgdb.query(args.join(' ')))
})

inject('ctx', async () => {
  const pgdb = new Pool({
    host: process.env.PGHOST,
    user: process.env.PGUSER,
    database: process.env.PGDATABASE,
    password: process.env.PGPASSWORD,
    port: process.env.PGPORT
  })
  pgdb.on('error', e => console.error('db-pg', e))
  return { pgdb }
})
