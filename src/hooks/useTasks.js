import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useTasks(siteId) {
  const [data, setData]       = useState([])     // pending tasks (review stages)
  const [docs, setDocs]       = useState([])     // docs in draft & published stages
  const [stages, setStages]   = useState([])     // workflow config
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  const fetchAll = useCallback(async () => {
    if (!siteId) { setData([]); setDocs([]); setStages([]); setLoading(false); return }
    setLoading(true)

    // 1. Fetch workflow config
    const { data: stageRows } = await supabase
      .from('site_workflow_stages')
      .select('*')
      .eq('site_id', siteId)
      .order('stage_order', { ascending: true })
    const stgs = stageRows || []
    setStages(stgs)

    const draftCode = stgs.find(s => s.stage_type === 'draft')?.stage_code || '01'
    const pubCode   = stgs.find(s => s.stage_type === 'published')?.stage_code || '04'

    // 2. Fetch pending tasks (for review columns)
    const { data: taskRows, error: taskErr } = await supabase
      .from('tasks')
      .select('*, document:document_id(id, name, folder, type, size_label, file_path, owner_id, status)')
      .eq('site_id', siteId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    // 3. Fetch documents in draft & published stages
    const { data: docRows, error: docErr } = await supabase
      .from('documents')
      .select('*')
      .eq('site_id', siteId)
      .in('folder', [draftCode, pubCode])
      .order('created_at', { ascending: false })

    setData(taskRows ?? [])
    setDocs(docRows ?? [])
    setError(taskErr || docErr)
    setLoading(false)
  }, [siteId])

  useEffect(() => { fetchAll() }, [fetchAll])

  /* ── Helper: find stage neighbours ── */
  const nextStage = (code) => {
    const cur = stages.find(s => s.stage_code === code)
    return cur ? stages.find(s => s.stage_order === cur.stage_order + 1) || null : null
  }
  const prevStage = (code) => {
    const cur = stages.find(s => s.stage_code === code)
    return cur ? stages.find(s => s.stage_order === cur.stage_order - 1) || null : null
  }

  /* ── Submit (Draft → first review stage) ── */
  const submit = async (documentId, docName) => {
    const draft = stages.find(s => s.stage_type === 'draft')
    const firstReview = draft ? stages.find(s => s.stage_order === draft.stage_order + 1) : null
    if (!firstReview) return

    await supabase.from('documents').update({ folder: firstReview.stage_code }).eq('id', documentId)

    if (firstReview.assignee_id) {
      await supabase.from('tasks').insert({
        site_id: siteId, document_id: documentId,
        assignee_id: firstReview.assignee_id, folder: firstReview.stage_code, priority: 'High',
      })
    }

    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      await supabase.from('activities').insert({
        site_id: siteId, actor_id: session.user.id,
        action: `submitted for ${firstReview.stage_name}`, target: docName,
      })
    }
    fetchAll()
  }

  /* ── Cancel (Draft → Trash 00) ── */
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

  /* ── Approve (current → next stage) ── */
  const approve = async (taskId, documentId) => {
    const task = data.find(t => t.id === taskId)
    if (!task) return

    const currentCode = task.document?.folder || task.folder
    const next = nextStage(currentCode)
    if (!next) return

    await supabase.from('tasks').update({ status: 'approved' }).eq('id', taskId)

    const docPatch = { folder: next.stage_code }
    if (next.stage_type === 'published') docPatch.status = 'Final-Approved'
    await supabase.from('documents').update(docPatch).eq('id', documentId)

    // Create task for next review stage (if not published)
    if (next.stage_type === 'review' && next.assignee_id) {
      await supabase.from('tasks').insert({
        site_id: siteId, document_id: documentId,
        assignee_id: next.assignee_id, folder: next.stage_code, priority: 'High',
      })
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

  /* ── Reject (current → prev stage) ── */
  const reject = async (taskId, documentId, reason) => {
    const task = data.find(t => t.id === taskId)
    if (!task) return

    const currentCode = task.document?.folder || task.folder
    const prev = prevStage(currentCode)
    if (!prev) return

    await supabase.from('tasks').update({ status: 'rejected' }).eq('id', taskId)
    await supabase.from('documents').update({ folder: prev.stage_code }).eq('id', documentId)

    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      await supabase.from('activities').insert({
        site_id: siteId, actor_id: session.user.id,
        action: `rejected (${reason})`, target: task.document?.name || 'document',
      })
    }
    fetchAll()
  }

  return { data, docs, stages, loading, error, approve, reject, submit, cancel, refetch: fetchAll }
}
