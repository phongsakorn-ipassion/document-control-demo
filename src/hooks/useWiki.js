import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import useAppStore from '../store/useAppStore'

export function useWiki(siteId) {
  const [data, setData]       = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const currentUser = useAppStore(s => s.currentUser)

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

  const logActivity = async (action, target) => {
    if (!currentUser) return
    await supabase.from('activities').insert({
      site_id: siteId,
      actor_id: currentUser.id,
      action,
      target,
    })
  }

  const create = async (payload) => {
    const { data: row, error: err } = await supabase.from('wiki_pages').insert(payload).select().single()
    if (!err) {
      await logActivity('created wiki page', payload.title || 'New Page')
      await fetch()
    }
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

  /* Workflow methods — status uses '00' (Trash), '01' (Draft), '02' (Published) */

  const publish = async (pageId, title) => {
    const { error: err } = await supabase.from('wiki_pages').update({ status: '02' }).eq('id', pageId)
    if (!err) {
      await logActivity('published wiki page', title)
      await fetch()
    }
    return err
  }

  const unpublish = async (pageId, title) => {
    const { error: err } = await supabase.from('wiki_pages').update({ status: '01' }).eq('id', pageId)
    if (!err) {
      await logActivity('unpublished wiki page', title)
      await fetch()
    }
    return err
  }

  const cancel = async (pageId, title, reason) => {
    const { error: err } = await supabase.from('wiki_pages').update({ status: '00' }).eq('id', pageId)
    if (!err) {
      await logActivity(`cancelled wiki page (${reason})`, title)
      await fetch()
    }
    return err
  }

  const putBack = async (pageId, title) => {
    const { error: err } = await supabase.from('wiki_pages').update({ status: '01' }).eq('id', pageId)
    if (!err) {
      await logActivity('restored wiki page from Trash', title)
      await fetch()
    }
    return err
  }

  return { data, loading, error, create, update, remove, publish, unpublish, cancel, putBack, refetch: fetch }
}
