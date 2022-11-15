import inject from 'seacreature/lib/inject'
import { Stats } from 'fast-stats'

inject('ctx', () => {
  const stats = new Map()

  const rec = (name, ms) => {
    if (!stats.has(name)) {
      console.log(`${name} recording stats`)
      stats.set(name, {
        s: new Stats({
          bucket_precision: 50,
          store_data: false
        }),
        c: 0
      })
    }
    const s = stats.get(name)
    s.s.push(ms)
    s.c++
  }

  const reset = () => {
    for (const s of stats.values()) {
      s.s.reset()
      s.c = 0
    }
  }

  const print = name => {
    if (!stats.has(name)) return
    const { s, c } = stats.get(name)
    if (c == 0) return
    const p = n => s.percentile(n).toFixed(0).padStart(5)
    console.log(`${new Date().toISOString()} ${name.padStart(32).substring(0, 32)} ${c.toString().padStart(5)}∑ ${p(50)}×50 ${p(95)}×95 ${p(99)}×99`)
  }

  const print_all = () => {
    for (const name of stats.keys()) print(name)
  }

  const ms = () => new Date().getTime()

  setInterval(print_all, process.env.STATS_PRINT_ALL_MS ?? 3e5) // default 5 min
  setInterval(reset, process.env.STATS_RESET_MS ?? 3.6e6) // default 1 hour

  return {
    stats: { rec, reset, print, print_all, ms }
  }
})