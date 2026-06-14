const inMemory = new Map()

function getInMemoryRatelimit({ max, windowMs }) {
  return {
    async limit(identifier) {
      const now = Date.now()
      const key = `${identifier}`
      const entry = inMemory.get(key) || { count: 0, reset: now + windowMs }

      if (now > entry.reset) {
        entry.count = 1
        entry.reset = now + windowMs
        inMemory.set(key, entry)
        return { success: true, remaining: max - 1, reset: entry.reset }
      }

      entry.count++
      inMemory.set(key, entry)

      return { success: entry.count <= max, remaining: Math.max(0, max - entry.count), reset: entry.reset }
    },
  }
}

let ratelimitImpl = null

async function getRatelimit() {
  if (ratelimitImpl) return ratelimitImpl

  try {
    const { Ratelimit } = await import('@upstash/ratelimit')
    const { Redis } = await import('@upstash/redis')

    if (process.env.UPSTASH_REDIS_REST_URL) {
      const redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
      ratelimitImpl = {
        limit: new Ratelimit({
          redis,
          limiter: Ratelimit.slidingWindow(10, '10 s'),
          analytics: true,
        }).limit.bind(null),
      }
      return ratelimitImpl
    }
  } catch {
  }

  ratelimitImpl = getInMemoryRatelimit({ max: 10, windowMs: 10000 })
  return ratelimitImpl
}

export async function checkRateLimit(identifier) {
  const rl = await getRatelimit()
  const result = await rl.limit(identifier)
  return result
}
