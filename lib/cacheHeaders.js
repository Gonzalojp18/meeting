export function cacheHeaders(ttl = 300, swr = 86400) {
  return {
    'Cache-Control': `public, max-age=${ttl}, stale-while-revalidate=${swr}`,
  }
}

export function noStoreHeaders() {
  return {
    'Cache-Control': 'no-store',
  }
}
