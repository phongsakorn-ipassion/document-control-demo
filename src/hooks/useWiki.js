import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useWiki(siteId) {
  const [data, setData]       = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  const fetch = useCallback(async () => {
    if (!siteId) { setData([]); setLoading(false); return }
    setLoading(true)
    const { data: rows, error: err } = await supabase
      .from('wiki_pages')
      .select('*')
      .eq('site_id', siteId)
      .order('created_at', { ascending: true })
    setData(rows ?? [])
    setError(err)
    setLoading(false)
  }, [siteId])

  useEffect(() => { fetch() }, [fetch])

  const create = async (payload) => {
    const { data: row, error: err } = await supabase.from('wiki_pages').insert(payload).select().single()
    if (!err) await fetch()
    return { data: row, error: err }
  }

  const update = async (id, patch) => {
    const { error: err } = await supabase.from('wiki_pages').update(patch).eq('id', id)
    if (!err) fetch()
    return err
  }

  const remove = async (id) => {
    const { error: err } = await supabase.from('wiki_pages').delete().eq('id', id)
    if (!err) fetch()
    return err
  }

  return { data, loading, error, create, update, remove, refetch: fetch }
}
