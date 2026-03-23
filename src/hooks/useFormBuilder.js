import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import useAppStore from '../store/useAppStore'
import { saveRevisionSnapshot, getNextRevision } from '../lib/revisionHelper'

export function useFormBuilder(siteId) {
  const [data, setData]       = useState([])
  const [stages, setStages]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const currentUser = useAppStore(s => s.currentUser)

  const fetch = useCallback(async () => {
    if (!siteId) { setData([]); setStages([]); setLoading(false); return }
    setLoading(true)

    const { data: stageRows } = await supabase
      .from('site_workflow_stages')
      .select('*')
      .eq('site_id', siteId)
      .order('stage_order', { ascending: true })
    setStages(stageRows || [])

    const { data: rows, error: err } = await supabase
      .from('forms')
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
    await supabase.from('activities').insert({ site_id: siteId, actor_id: currentUser.id, action, target })
  }

  const create = async (payload) => {
    const { data: row, error: err } = await supabase.from('forms').insert({
      site_id: siteId,
      title: payload.title,
      description: payload.description || '',
      fields: payload.fields || [],
      status: draftCode,
      owner_id: currentUser?.id,
    }).select().single()
    if (!err) {
      await logActivity('created form', payload.title)
      await fetch()
    }
    return { data: row, error: err }
  }

  const update = async (id, patch) => {
    const { error: err } = await supabase.from('forms').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id)
    if (!err) {
      await logActivity('edited form', patch.title || 'Untitled')
      await fetch()
    }
    return err
  }

  const remove = async (id) => {
    const { error: err } = await supabase.from('forms').delete().eq('id', id)
    if (!err) fetch()
    return err
  }

  /* ── Workflow: Submit (Draft → first review) ── */
  const submit = async (formId, title) => {
    const first = nextStage(draftCode)
    if (!first) return
    const nextRev = await getNextRevision(formId)
    const updatePatch = { status: first.stage_code }
    if (nextRev) updatePatch.revision = nextRev
    await supabase.from('forms').update(updatePatch).eq('id', formId)
    if (first.assignee_id) {
      await supabase.from('tasks').insert({
        site_id: siteId, form_id: formId,
        assignee_id: first.assignee_id, folder: first.stage_code, priority: 'High',
      })
    }
    await logActivity(`submitted form for ${first.stage_name}`, title)
    await fetch()
  }

  /* ── Workflow: Approve (current → next) ── */
  const approve = async (formId, title, currentCode) => {
    const next = nextStage(currentCode)
    if (!next) return
    const patch = { status: next.stage_code }
    if (next.stage_type === 'published') patch.published_at = new Date().toISOString()
    await supabase.from('forms').update(patch).eq('id', formId)

    await supabase.from('tasks').update({ status: 'approved' })
      .eq('form_id', formId).eq('folder', currentCode).eq('status', 'pending')

    if (next.stage_type === 'review' && next.assignee_id) {
      await supabase.from('tasks').insert({
        site_id: siteId, form_id: formId,
        assignee_id: next.assignee_id, folder: next.stage_code, priority: 'High',
      })
    }
    // Auto-share + snapshot on publish
    if (next.stage_type === 'published') {
      const { data: existing } = await supabase.from('form_share_tokens').select('id').eq('form_id', formId).maybeSingle()
      if (!existing) {
        const token = crypto.randomUUID().replace(/-/g, '').slice(0, 12)
        await supabase.from('form_share_tokens').insert({ form_id: formId, token, created_by: currentUser?.id })
        await logActivity('auto-shared form', title)
      }
      const { data: formRow } = await supabase.from('forms').select('revision, title, description, fields').eq('id', formId).single()
      if (formRow) {
        await saveRevisionSnapshot('form', formId, formRow.revision, { title: formRow.title, description: formRow.description, fields: formRow.fields }, null, currentUser?.id)
      }
    }
    await logActivity('approved form', title)
    await fetch()
  }

  /* ── Workflow: Reject (current → prev) ── */
  const reject = async (formId, title, currentCode, reason) => {
    const prev = prevStage(currentCode)
    if (!prev) return
    await supabase.from('forms').update({ status: prev.stage_code }).eq('id', formId)
    await supabase.from('tasks').update({ status: 'rejected' })
      .eq('form_id', formId).eq('folder', currentCode).eq('status', 'pending')
    await logActivity(`rejected form (${reason})`, title)
    await fetch()
  }

  /* ── Publish (admin bypass) ── */
  const publish = async (formId, title) => {
    const nextRev = await getNextRevision(formId)
    const pubPatch = { status: pubCode, published_at: new Date().toISOString() }
    if (nextRev) pubPatch.revision = nextRev
    await supabase.from('forms').update(pubPatch).eq('id', formId)
    await supabase.from('tasks').update({ status: 'approved' }).eq('form_id', formId).eq('status', 'pending')
    const { data: existing } = await supabase.from('form_share_tokens').select('id').eq('form_id', formId).maybeSingle()
    if (!existing) {
      const token = crypto.randomUUID().replace(/-/g, '').slice(0, 12)
      await supabase.from('form_share_tokens').insert({ form_id: formId, token, created_by: currentUser?.id })
      await logActivity('auto-shared form', title)
    }
    const { data: formRow } = await supabase.from('forms').select('revision, title, description, fields').eq('id', formId).single()
    if (formRow) {
      await saveRevisionSnapshot('form', formId, formRow.revision, { title: formRow.title, description: formRow.description, fields: formRow.fields }, null, currentUser?.id)
    }
    await logActivity('published form', title)
    await fetch()
  }

  /* ── Unpublish (Published → Draft) ── */
  const unpublish = async (formId, title) => {
    await supabase.from('forms').update({ status: draftCode, published_at: null }).eq('id', formId)
    await supabase.from('form_share_tokens').update({ active: false }).eq('form_id', formId)
    await logActivity('unpublished form', title)
    await fetch()
  }

  return {
    data, stages, loading, error,
    create, update, remove,
    submit, approve, reject, publish, unpublish,
    refetch: fetch,
    draftCode, pubCode,
  }
}
