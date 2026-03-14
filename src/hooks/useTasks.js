import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { DEMO_USERS } from '../lib/roles'

export function useTasks(siteId) {
  const [data, setData]       = useState([])     // pending tasks (02, 03)
  const [docs, setDocs]       = useState([])     // all documents for 01 & 04 columns
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  const fetchAll = useCallback(async () => {
    if (!siteId) { setData([]); setDocs([]); setLoading(false); return }
    setLoading(true)

    // Fetch pending tasks (for 02 & 03 columns)
    const { data: taskRows, error: taskErr } = await supabase
      .from('tasks')
      .select('*, document:document_id(id, name, folder, type, size_label, file_path, owner_id, status)')
      .eq('site_id', siteId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    // Fetch documents in folder 01 and 04 (for Draft & Published columns)
    const { data: docRows, error: docErr } = await supabase
      .from('documents')
      .select('*')
      .eq('site_id', siteId)
      .in('folder', ['01', '04'])
      .order('created_at', { ascending: false })

    setData(taskRows ?? [])
    setDocs(docRows ?? [])
    setError(taskErr || docErr)
    setLoading(false)
  }, [siteId])

  useEffect(() => { fetchAll() }, [fetchAll])

  /* ── Submit (01 Draft → 02 In Review) ── */
  const submit = async (documentId, docName) => {
    // Move document to folder 02
    await supabase.from('documents').update({ folder: '02' }).eq('id', documentId)

    // Create task for reviewer (Bob Chen)
    const assignee = DEMO_USERS.find(u => u.name === 'Bob Chen')
    if (assignee) {
      await supabase.from('tasks').insert({
        site_id: siteId, document_id: documentId,
        assignee_id: assignee.id, folder: '02', priority: 'High',
      })
    }

    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      await supabase.from('activities').insert({
        site_id: siteId, actor_id: session.user.id,
        action: 'submitted for review', target: docName,
      })
    }
    fetchAll()
  }

  /* ── Cancel (01 Draft → 00 Trash) ── */
  const cancel = async (documentId, docName, reason) => {
    await supabase.from('documents').update({ folder: '00', status: null }).eq('id', documentId)

    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      await supabase.from('activities').insert({
        site_id: siteId, actor_id: session.user.id,
        action: `cancelled (${reason})`, target: docName,
      })
    }
    fetchAll()
  }

  /* ── Approve (02→03 or 03→04) ── */
  const approve = async (taskId, documentId) => {
    const task = data.find(t => t.id === taskId)
    if (!task) return

    const currentFolder = task.document?.folder || task.folder
    const nextFolder = currentFolder === '02' ? '03' : '04'

    await supabase.from('tasks').update({ status: 'approved' }).eq('id', taskId)

    const docPatch = { folder: nextFolder }
    if (nextFolder === '04') docPatch.status = 'Final-Approved'
    await supabase.from('documents').update(docPatch).eq('id', documentId)

    // Create next-stage task if moving to 03
    if (nextFolder === '03') {
      const assignee = DEMO_USERS.find(u => u.name === 'Cathy Park')
      if (assignee) {
        await supabase.from('tasks').insert({
          site_id: siteId, document_id: documentId,
          assignee_id: assignee.id, folder: '03', priority: 'High',
        })
      }
    }

    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      await supabase.from('activities').insert({
        site_id: siteId, actor_id: session.user.id,
        action: 'approved', target: task.document?.name || 'document',
      })
    }
    fetchAll()
  }

  /* ── Reject (02→01 or 03→02) ── */
  const reject = async (taskId, documentId, reason) => {
    const task = data.find(t => t.id === taskId)
    if (!task) return

    const currentFolder = task.document?.folder || task.folder
    const prevFolder = currentFolder === '03' ? '02' : '01'

    await supabase.from('tasks').update({ status: 'rejected' }).eq('id', taskId)
    await supabase.from('documents').update({ folder: prevFolder }).eq('id', documentId)

    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      await supabase.from('activities').insert({
        site_id: siteId, actor_id: session.user.id,
        action: `rejected (${reason})`, target: task.document?.name || 'document',
      })
    }
    fetchAll()
  }

  return { data, docs, loading, error, approve, reject, submit, cancel, refetch: fetchAll }
}
