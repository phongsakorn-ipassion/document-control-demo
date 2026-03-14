import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useDocuments(siteId) {
  const [data, setData]       = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  const fetch = useCallback(async () => {
    if (!siteId) { setData([]); setLoading(false); return }
    setLoading(true)
    const { data: rows, error: err } = await supabase
      .from('documents')
      .select('*')
      .eq('site_id', siteId)
      .order('created_at', { ascending: false })
    setData(rows ?? [])
    setError(err)
    setLoading(false)
  }, [siteId])

  useEffect(() => { fetch() }, [fetch])

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

  return { data, loading, error, create, update, remove, refetch: fetch }
}
