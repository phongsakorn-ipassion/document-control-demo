import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'

const PAGE_SIZE = 10

export function useActivities(siteId, { filterTarget } = {}) {
  const [data, setData]       = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const offsetRef = useRef(0)

  const buildQuery = useCallback((offset, limit) => {
    let query = supabase
      .from('activities')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (siteId) query = query.eq('site_id', siteId)
    if (filterTarget) query = query.eq('target', filterTarget)
    return query
  }, [siteId, filterTarget])

  const fetch = useCallback(async () => {
    setLoading(true)
    offsetRef.current = 0
    const { data: rows, error: err } = await buildQuery(0, PAGE_SIZE)
    setData(rows ?? [])
    setError(err)
    setHasMore((rows?.length ?? 0) >= PAGE_SIZE)
    offsetRef.current = rows?.length ?? 0
    setLoading(false)
  }, [buildQuery])

  useEffect(() => { fetch() }, [fetch])

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    const offset = offsetRef.current
    const { data: rows, error: err } = await buildQuery(offset, PAGE_SIZE)
    if (!err && rows) {
      setData(prev => [...prev, ...rows])
      setHasMore(rows.length >= PAGE_SIZE)
      offsetRef.current = offset + rows.length
    }
    setLoadingMore(false)
  }, [buildQuery, loadingMore, hasMore])

  const log = async (payload) => {
    const { error: err } = await supabase.from('activities').insert(payload)
    if (!err) fetch()
    return err
  }

  return { data, loading, error, log, refetch: fetch, loadMore, hasMore, loadingMore }
}
