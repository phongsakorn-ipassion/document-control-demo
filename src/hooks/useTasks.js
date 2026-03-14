import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useTasks(siteId) {
  const [data, setData]       = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  const fetch = useCallback(async () => {
    if (!siteId) { setData([]); setLoading(false); return }
    setLoading(true)
    const { data: rows, error: err } = await supabase
      .from('tasks')
      .select('*, document:document_id(id, name, folder)')
      .eq('site_id', siteId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
    setData(rows ?? [])
    setError(err)
    setLoading(false)
  }, [siteId])

  useEffect(() => { fetch() }, [fetch])

  const approve = async (taskId, documentId) => {
    // Get task info first
    const task = data.find(t => t.id === taskId)
    if (!task) return

    const currentFolder = task.document?.folder || task.folder
    const nextFolder = currentFolder === '02' ? '03' : '04'

    // Update task status
    await supabase.from('tasks').update({ status: 'approved' }).eq('id', taskId)

    // Update document folder
    const docPatch = { folder: nextFolder }
    if (nextFolder === '04') docPatch.status = 'Final-Approved'
    await supabase.from('documents').update(docPatch).eq('id', documentId)

    // Insert activity
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      await supabase.from('activities').insert({
        site_id: siteId,
        actor_id: session.user.id,
        action: 'approved',
        target: task.document?.name || 'document',
      })
    }

    fetch()
  }

  const reject = async (taskId, documentId) => {
    const task = data.find(t => t.id === taskId)
    if (!task) return

    const currentFolder = task.document?.folder || task.folder
    const prevFolder = currentFolder === '03' ? '02' : '01'

    await supabase.from('tasks').update({ status: 'rejected' }).eq('id', taskId)
    await supabase.from('documents').update({ folder: prevFolder }).eq('id', documentId)

    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      await supabase.from('activities').insert({
        site_id: siteId,
        actor_id: session.user.id,
        action: 'rejected',
        target: task.document?.name || 'document',
      })
    }

    fetch()
  }

  return { data, loading, error, approve, reject, refetch: fetch }
}
