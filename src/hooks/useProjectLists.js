import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useProjectLists(siteId) {
  const [data, setData]       = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  const fetch = useCallback(async () => {
    if (!siteId) { setData([]); setLoading(false); return }
    setLoading(true)

    // Fetch lists
    const { data: lists, error: err } = await supabase
      .from('project_lists')
      .select('*')
      .eq('site_id', siteId)
      .order('created_at', { ascending: true })

    if (err) {
      setError(err)
      setLoading(false)
      return
    }

    // Fetch items for all lists
    const listIds = (lists || []).map(l => l.id)
    let items = []
    if (listIds.length > 0) {
      const { data: itemRows } = await supabase
        .from('project_list_items')
        .select('*, assignee:assignee_id(id, email)')
        .in('list_id', listIds)
        .order('created_at', { ascending: true })
      items = itemRows || []
    }

    // Attach items to lists
    const enriched = (lists || []).map(l => ({
      ...l,
      items: items.filter(i => i.list_id === l.id),
    }))

    setData(enriched)
    setError(null)
    setLoading(false)
  }, [siteId])

  useEffect(() => { fetch() }, [fetch])

  const createList = async (name) => {
    const { data: row, error: err } = await supabase
      .from('project_lists')
      .insert({ site_id: siteId, name })
      .select()
      .single()
    if (!err) await fetch()
    return { data: row, error: err }
  }

  const createItem = async (listId, payload) => {
    const { error: err } = await supabase
      .from('project_list_items')
      .insert({ list_id: listId, ...payload })
    if (!err) fetch()
    return err
  }

  const updateItem = async (id, patch) => {
    const { error: err } = await supabase
      .from('project_list_items')
      .update(patch)
      .eq('id', id)
    if (!err) fetch()
    return err
  }

  return { data, loading, error, createList, createItem, updateItem, refetch: fetch }
}
