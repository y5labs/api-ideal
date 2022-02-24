import inject from 'seacreature/lib/inject'
import fs from 'fs/promises'
import path from 'path'

const fromlocal = (req, res, next) => {
  const islocal = ['::1', '::ffff:127.0.0.1', '127.0.0.1']
    .indexOf(req.ip) != -1
  if (islocal) return next()
  res.status(403).send('Forbidden')
}

const MIGRATIONS_TABLE_NAME = process.env.MIGRATIONS_TABLE_NAME || 'migrations'

inject('pod', async ctx => {
  const { pgdb, log, sensitive, startup, app } = ctx

  await pgdb.query(`
    CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE_NAME} (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      up TEXT NOT NULL,
      down TEXT NOT NULL
    )
  `)

  const rollback = async () => {
    try { await pgdb.query('rollback') }
    catch (e) {}
  }

  const migrate_up = async m => {
    try {
      await m.up(ctx)
      await pgdb.query(`INSERT INTO ${MIGRATIONS_TABLE_NAME} (id, name, up, down) VALUES ($1, $2, $3, $4)`, [
        m.id,
        m.name,
        m.up.toString(),
        m.down.toString()])
      await log(`↑ ${m.name}`)
    }
    catch (e) {
      await rollback()
      throw e
    }
  }

  const migrate_down = async m => {
    try {
      await Function(`return ${m.down}`)()(ctx)
      await pgdb.query(`DELETE FROM ${MIGRATIONS_TABLE_NAME} WHERE id = $1`, [m.id])
      await log(`↓ ${m.name}`)
    }
    catch (e) {
      await rollback()
      throw e
    }
  }

  const load_migrations = async () => {
    const dir = path.join(process.cwd(), 'migrations')
    const files = await fs.readdir(dir)
    const fs_all = (await Promise.all(files
      .map(f => f.match(/^(\d+)\-.*\.js$/))
      .filter(f => f !== null)
      .map(async ([name, id]) => {
        const filename = path.resolve(path.join('migrations', name))
        return { id: Number(id), name, ...await import(filename) }
      })))
      .filter(m => m.up instanceof Function && m.down instanceof Function)
      .sort((a, b) => Math.sign(a.id - b.id))
    const fs_ids = new Set(fs_all.map(m => m.id))
    const db_all = (await pgdb
      .query(`SELECT id, name, up, down FROM ${MIGRATIONS_TABLE_NAME} ORDER BY id ASC`))
      .rows
      .sort((a, b) => Math.sign(b.id - a.id))
    const db_ids = new Set(db_all.map(m => m.id))
    return {
      fs_all, fs_pending: fs_all.filter(m => !db_ids.has(m.id)),
      db_all, db_pending: db_all.filter(m => !fs_ids.has(m.id))
    }
  }

  if (process.env.MIGRATE_ON_STARTUP) await (async () => {
    const release = startup.retain()
    try {
      const { db_pending, fs_pending } = await load_migrations()
      for (const m of db_pending) await migrate_down(m)
      for (const m of fs_pending) await migrate_up(m)
    }
    catch (e) {
      await log.error(e)
    }
    release()
  })()
  else if (process.env.RECREATE_ON_STARTUP) await (async () => {
    const release = startup.retain()
    try {
      const { db_all, fs_all } = await load_migrations()
      for (const m of db_all) await migrate_down(m)
      for (const m of fs_all) await migrate_up(m)
    }
    catch (e) {
      await log.error(e)
    }
    release()
  })()

  app.use('/lib/migrate', fromlocal)

  app.post('/lib/migrate/up', async (req, res) => {
    const release = sensitive.retain()
    try {
      const { db_pending, fs_pending } = await load_migrations()
      for (const m of db_pending) await migrate_down(m)
      for (const m of fs_pending) await migrate_up(m)
      res.send({
        down: db_pending.map(m => m.name),
        up: fs_pending.map(m => m.name)
      })
    }
    catch (e) {
      await log.error(e)
      res.status(500).send(e)
    }
    release()
  })

  app.post('/lib/migrate/down', async (req, res) => {
    const release = sensitive.retain()
    try {
      const { db_all } = await load_migrations()
      for (const m of db_all) await migrate_down(m)
      res.send({
        down: db_all.map(m => m.name),
        up: []
      })
    }
    catch (e) {
      await log.error(e)
      res.status(500).send(e)
    }
    release()
  })

  app.post('/lib/migrate/fresh', async (req, res) => {
    const release = sensitive.retain()
    try {
      const { db_all, fs_all } = await load_migrations()
        for (const m of db_all) await migrate_down(m)
        for (const m of fs_all) await migrate_up(m)
      res.send({
        down: db_all.map(m => m.name),
        up: fs_all.map(m => m.name)
      })
    }
    catch (e) {
      await log.error(e)
      res.status(500).send(e)
    }
    release()
  })

  app.get('/lib/migrate/test', async (req, res) => {
    const { db_pending, fs_pending } = await load_migrations()
    res.send({
      down: db_pending.map(m => m.name),
      up: fs_pending.map(m => m.name)
    })
  })

  app.get('/lib/migrate/fs', async (req, res) => {
    const { fs_all } = await load_migrations()
    res.send(fs_all.map(m => m.name))
  })

  app.get('/lib/migrate/db', async (req, res) => {
    const { db_all } = await load_migrations()
    res.send(db_all.map(m => m.name))
  })

  inject('command.migrate', async ({ args }) => {
    const { db_all, db_pending, fs_all, fs_pending } = await load_migrations()

    const release = sensitive.retain()
    try {
      if (args.length == 0 || args[0] == 'up') {
        for (const m of db_pending) await migrate_down(m)
        for (const m of fs_pending) await migrate_up(m)
      }
      else if (args[0] == 'down') {
        for (const m of db_all) await migrate_down(m)
      }
      else if (args[0] == 'fresh') {
        for (const m of db_all) await migrate_down(m)
        for (const m of fs_all) await migrate_up(m)
      }
      else if (args[0] == 'test') {
        for (const m of db_pending) await log(`↓ ${m.name}`)
        for (const m of fs_pending) await log(`↑ ${m.name}`)
      }
      else if (args[0] == 'fs') {
        for (const m of fs_all) await log(m.name)
      }
      else if (args[0] == 'db') {
        for (const m of db_all) await log(m.name)
      }
      else if (args[0] == 'help') {
        await log(`
# Database migrations

migrate up
  Execute down on all migrations already run not in the migrations folder
  Execute up on new migrations

migrate down
  Execute down on all migrations already run

migrate fresh
  Execute down on all migrations already run
  Execute up on all migrations

migrate test
  Display what would happen if migrate up was run

migrate fs
  List all available migrations

migrate db
  List all migrations already run
`)
      }
    }
    catch (e) {
      await log.error(e)
    }
    release()
  })
})
