import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'

const PAGE_SIZE = 10

export function useDocuments(siteId) {
  const [data, setData]       = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const offsetRef = useRef(0)

  const fetch = useCallback(async () => {
    if (!siteId) { setData([]); setLoading(false); return }
    setLoading(true)
    offsetRef.current = 0
    const { data: rows, error: err } = await supabase
      .from('documents')
      .select('*')
      .eq('site_id', siteId)
      .order('created_at', { ascending: false })
      .range(0, PAGE_SIZE - 1)
    setData(rows ?? [])
    setError(err)
    setHasMore((rows?.length ?? 0) >= PAGE_SIZE)
    offsetRef.current = rows?.length ?? 0
    setLoading(false)
  }, [siteId])

  useEffect(() => { fetch() }, [fetch])

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    const offset = offsetRef.current
    const { data: rows, error: err } = await supabase
      .from('documents')
      .select('*')
      .eq('site_id', siteId)
      .order('created_at', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1)
    if (!err && rows) {
      setData(prev => [...prev, ...rows])
      setHasMore(rows.length >= PAGE_SIZE)
      offsetRef.current = offset + rows.length
    }
    setLoadingMore(false)
  }, [siteId, loadingMore, hasMore])

  const create = async (payload) => {
    const { error: err } = await supabase.from('documents').insert(payload)
    if (!err) fetch()
    return err
  }

  const update = async (id, patch) => {
    const { error: err } = await supabase.from('documents').update(patch).eq('id', id)
    if (!err) fetch()
    return err
  }

  const remove = async (id) => {
    const { error: err } = await supabase.from('documents').delete().eq('id', id)
    if (!err) fetch()
    return err
  }

  return { data, loading, error, create, update, remove, refetch: fetch, loadMore, hasMore, loadingMore }
}
