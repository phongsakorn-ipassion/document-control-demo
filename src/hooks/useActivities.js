import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useActivities(siteId) {
  const [data, setData]       = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('activities')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)

    if (siteId) {
      query = query.eq('site_id', siteId)
    }

    const { data: rows, error: err } = await query
    setData(rows ?? [])
    setError(err)
    setLoading(false)
  }, [siteId])

  useEffect(() => { fetch() }, [fetch])

  const log = async (payload) => {
    const { error: err } = await supabase.from('activities').insert(payload)
    if (!err) fetch()
    return err
  }

  return { data, loading, error, log, refetch: fetch }
}
