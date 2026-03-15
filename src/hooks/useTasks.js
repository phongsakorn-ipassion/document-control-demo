import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useTasks(siteId) {
  const [data, setData]       = useState([])     // pending tasks (review stages)
  const [docs, setDocs]       = useState([])     // docs in draft & published stages
  const [wikiPages, setWikiPages] = useState([]) // wiki pages in draft & published stages
  const [stages, setStages]   = useState([])     // workflow config
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  const fetchAll = useCallback(async () => {
    if (!siteId) { setData([]); setDocs([]); setWikiPages([]); setStages([]); setLoading(false); return }
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

    // 2. Fetch pending tasks (for review columns) — both doc and wiki tasks
    const { data: taskRows, error: taskErr } = await supabase
      .from('tasks')
      .select('*, document:document_id(id, name, folder, type, size_label, file_path, owner_id, status), wiki_page:wiki_page_id(id, title, status, owner_id)')
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

    // 4. Fetch wiki pages in draft & published stages
    const { data: wikiRows, error: wikiErr } = await supabase
      .from('wiki_pages')
      .select('*')
      .eq('site_id', siteId)
      .in('status', [draftCode, pubCode])
      .order('created_at', { ascending: false })

    setData(taskRows ?? [])
    setDocs(docRows ?? [])
    setWikiPages(wikiRows ?? [])
    setError(taskErr || docErr || wikiErr)
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

  /* ── Submit Document (Draft → first review stage) ── */
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

  /* ── Submit Wiki Page (Draft → first review stage) ── */
  const submitWiki = async (wikiPageId, pageTitle) => {
    const draft = stages.find(s => s.stage_type === 'draft')
    const firstReview = draft ? stages.find(s => s.stage_order === draft.stage_order + 1) : null
    if (!firstReview) return

    await supabase.from('wiki_pages').update({ status: firstReview.stage_code }).eq('id', wikiPageId)

    if (firstReview.assignee_id) {
      await supabase.from('tasks').insert({
        site_id: siteId, wiki_page_id: wikiPageId,
        assignee_id: firstReview.assignee_id, folder: firstReview.stage_code, priority: 'High',
      })
    }

    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      await supabase.from('activities').insert({
        site_id: siteId, actor_id: session.user.id,
        action: `submitted for ${firstReview.stage_name}`, target: pageTitle,
      })
    }
    fetchAll()
  }

  /* ── Cancel Wiki Page (Draft → Trash 00) ── */
  const cancelWiki = async (wikiPageId, pageTitle, reason) => {
    await supabase.from('wiki_pages').update({ status: '00' }).eq('id', wikiPageId)

    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      await supabase.from('activities').insert({
        site_id: siteId, actor_id: session.user.id,
        action: `cancelled wiki page (${reason})`, target: pageTitle,
      })
    }
    fetchAll()
  }

  /* ── Cancel Document (Draft → Trash 00) ── */
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

  /* ── Approve (current → next stage) — works for both doc and wiki tasks ── */
  const approve = async (taskId, documentId) => {
    const task = data.find(t => t.id === taskId)
    if (!task) return

    const isWiki = !!task.wiki_page_id
    const currentCode = isWiki ? (task.wiki_page?.status || task.folder) : (task.document?.folder || task.folder)
    const next = nextStage(currentCode)
    if (!next) return

    await supabase.from('tasks').update({ status: 'approved' }).eq('id', taskId)

    if (isWiki) {
      const wikiPatch = { status: next.stage_code }
      await supabase.from('wiki_pages').update(wikiPatch).eq('id', task.wiki_page_id)
    } else {
      const docPatch = { folder: next.stage_code }
      if (next.stage_type === 'published') docPatch.status = 'Final-Approved'
      await supabase.from('documents').update(docPatch).eq('id', documentId)
    }

    // Create task for next review stage (if not published)
    if (next.stage_type === 'review' && next.assignee_id) {
      const taskInsert = {
        site_id: siteId,
        assignee_id: next.assignee_id, folder: next.stage_code, priority: 'High',
      }
      if (isWiki) taskInsert.wiki_page_id = task.wiki_page_id
      else taskInsert.document_id = documentId
      await supabase.from('tasks').insert(taskInsert)
    }

    const targetName = isWiki ? (task.wiki_page?.title || 'wiki page') : (task.document?.name || 'document')
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      await supabase.from('activities').insert({
        site_id: siteId, actor_id: session.user.id,
        action: 'approved', target: targetName,
      })
    }
    fetchAll()
  }

  /* ── Reject (current → prev stage) — works for both doc and wiki tasks ── */
  const reject = async (taskId, documentId, reason) => {
    const task = data.find(t => t.id === taskId)
    if (!task) return

    const isWiki = !!task.wiki_page_id
    const currentCode = isWiki ? (task.wiki_page?.status || task.folder) : (task.document?.folder || task.folder)
    const prev = prevStage(currentCode)
    if (!prev) return

    await supabase.from('tasks').update({ status: 'rejected' }).eq('id', taskId)

    if (isWiki) {
      await supabase.from('wiki_pages').update({ status: prev.stage_code }).eq('id', task.wiki_page_id)
    } else {
      await supabase.from('documents').update({ folder: prev.stage_code }).eq('id', documentId)
    }

    const targetName = isWiki ? (task.wiki_page?.title || 'wiki page') : (task.document?.name || 'document')
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      await supabase.from('activities').insert({
        site_id: siteId, actor_id: session.user.id,
        action: `rejected (${reason})`, target: targetName,
      })
    }
    fetchAll()
  }

  return { data, docs, wikiPages, stages, loading, error, approve, reject, submit, cancel, submitWiki, cancelWiki, refetch: fetchAll }
}
