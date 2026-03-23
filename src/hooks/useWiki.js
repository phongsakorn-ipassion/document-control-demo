import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import useAppStore from '../store/useAppStore'

export function useWiki(siteId) {
  const [data, setData]       = useState([])
  const [stages, setStages]   = useState([])   // workflow config
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const currentUser = useAppStore(s => s.currentUser)

  const fetch = useCallback(async () => {
    if (!siteId) { setData([]); setStages([]); setLoading(false); return }
    setLoading(true)

    // Fetch workflow stages
    const { data: stageRows } = await supabase
      .from('site_workflow_stages')
      .select('*')
      .eq('site_id', siteId)
      .order('stage_order', { ascending: true })
    setStages(stageRows || [])

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

  /* ── Stage helpers ── */
  const draftStage = stages.find(s => s.stage_type === 'draft')
  const publishedStage = stages.find(s => s.stage_type === 'published')
  const draftCode = draftStage?.stage_code || '01'
  const pubCode = publishedStage?.stage_code || '04'

  const nextStage = (code) => {
    const cur = stages.find(s => s.stage_code === code)
    return cur ? stages.find(s => s.stage_order === cur.stage_order + 1) || null : null
  }
  const prevStage = (code) => {
    const cur = stages.find(s => s.stage_code === code)
    return cur ? stages.find(s => s.stage_order === cur.stage_order - 1) || null : null
  }

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
    const { data: row, error: err } = await supabase.from('wiki_pages').insert({
      ...payload,
      status: draftCode,
    }).select().single()
    if (!err) {
      await logActivity('created wiki page', payload.title || 'New Page')
      await fetch()
    }
    return { data: row, error: err }
  }

  const update = async (id, patch, { silent } = {}) => {
    const { error: err } = await supabase.from('wiki_pages').update(patch).eq('id', id)
    if (!err) {
      if (!silent) await logActivity('edited wiki page', patch.title || 'Untitled')
      await fetch()
    }
    return err
  }

  const remove = async (id) => {
    const { error: err } = await supabase.from('wiki_pages').delete().eq('id', id)
    if (!err) fetch()
    return err
  }

  /* ── Workflow: Submit (Draft → first review stage), creates task ── */
  const submit = async (pageId, title) => {
    const first = nextStage(draftCode)
    if (!first) return
    await supabase.from('wiki_pages').update({ status: first.stage_code }).eq('id', pageId)

    // Create task for the assigned reviewer
    if (first.assignee_id) {
      await supabase.from('tasks').insert({
        site_id: siteId, wiki_page_id: pageId,
        assignee_id: first.assignee_id, folder: first.stage_code, priority: 'High',
      })
    }
    await logActivity(`submitted for ${first.stage_name}`, title)
    await fetch()
  }

  /* ── Workflow: Approve (current review → next stage) ── */
  const approve = async (pageId, title, currentCode) => {
    const next = nextStage(currentCode)
    if (!next) return
    const wikiPatch = { status: next.stage_code }
    if (next.stage_type === 'published') wikiPatch.published_at = new Date().toISOString()
    await supabase.from('wiki_pages').update(wikiPatch).eq('id', pageId)

    // Mark current task as approved
    await supabase.from('tasks')
      .update({ status: 'approved' })
      .eq('wiki_page_id', pageId)
      .eq('folder', currentCode)
      .eq('status', 'pending')

    // Create task for next review stage
    if (next.stage_type === 'review' && next.assignee_id) {
      await supabase.from('tasks').insert({
        site_id: siteId, wiki_page_id: pageId,
        assignee_id: next.assignee_id, folder: next.stage_code, priority: 'High',
      })
    }
    // Auto-share on publish
    if (next.stage_type === 'published') {
      const { data: existing } = await supabase.from('wiki_share_tokens').select('id').eq('page_id', pageId).maybeSingle()
      if (!existing) {
        const token = crypto.randomUUID().replace(/-/g, '').slice(0, 12)
        await supabase.from('wiki_share_tokens').insert({ page_id: pageId, token, created_by: currentUser?.id })
        await logActivity('auto-shared wiki page', title)
      }
    }
    await logActivity('approved wiki page', title)
    await fetch()
  }

  /* ── Workflow: Reject (current review → prev stage) ── */
  const reject = async (pageId, title, currentCode, reason) => {
    const prev = prevStage(currentCode)
    if (!prev) return
    await supabase.from('wiki_pages').update({ status: prev.stage_code }).eq('id', pageId)

    // Mark current task as rejected
    await supabase.from('tasks')
      .update({ status: 'rejected' })
      .eq('wiki_page_id', pageId)
      .eq('folder', currentCode)
      .eq('status', 'pending')

    await logActivity(`rejected wiki page (${reason})`, title)
    await fetch()
  }

  /* ── Publish (directly, for admin bypass) ── */
  const publish = async (pageId, title) => {
    await supabase.from('wiki_pages').update({ status: pubCode, published_at: new Date().toISOString() }).eq('id', pageId)
    // Mark any pending tasks as approved
    await supabase.from('tasks')
      .update({ status: 'approved' })
      .eq('wiki_page_id', pageId)
      .eq('status', 'pending')
    // Auto-share on publish
    const { data: existing } = await supabase.from('wiki_share_tokens').select('id').eq('page_id', pageId).maybeSingle()
    if (!existing) {
      const token = crypto.randomUUID().replace(/-/g, '').slice(0, 12)
      await supabase.from('wiki_share_tokens').insert({ page_id: pageId, token, created_by: currentUser?.id })
      await logActivity('auto-shared wiki page', title)
    }
    await logActivity('published wiki page', title)
    await fetch()
  }

  /* ── Unpublish (Published → Draft) ── */
  const unpublish = async (pageId, title) => {
    await supabase.from('wiki_pages').update({ status: draftCode }).eq('id', pageId)
    await logActivity('unpublished wiki page', title)
    await fetch()
  }

  /* ── Cancel (→ Trash 00) ── */
  const cancel = async (pageId, title, reason) => {
    await supabase.from('wiki_pages').update({ status: '00' }).eq('id', pageId)
    // Mark any pending tasks as rejected
    await supabase.from('tasks')
      .update({ status: 'rejected' })
      .eq('wiki_page_id', pageId)
      .eq('status', 'pending')
    await logActivity(`cancelled wiki page (${reason})`, title)
    await fetch()
  }

  /* ── Put Back (Trash → Draft) ── */
  const putBack = async (pageId, title) => {
    await supabase.from('wiki_pages').update({ status: draftCode }).eq('id', pageId)
    await logActivity('restored wiki page from Trash', title)
    await fetch()
  }

  return {
    data, stages, loading, error,
    create, update, remove,
    submit, approve, reject, publish, unpublish, cancel, putBack,
    refetch: fetch,
    draftCode, pubCode,
  }
}
