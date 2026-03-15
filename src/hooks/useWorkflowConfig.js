import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const STAGE_COLORS = ['amber', 'blue', 'violet', 'indigo', 'rose', 'cyan']

/* Tailwind JIT needs literal class names — map each colour to its full class strings */
const STYLE_MAP = {
  slate:   { dot: 'bg-slate-400',   border: 'border-slate-300',   bg: 'bg-slate-50',   head: 'text-slate-700' },
  amber:   { dot: 'bg-amber-400',   border: 'border-amber-300',   bg: 'bg-amber-50',   head: 'text-amber-700' },
  blue:    { dot: 'bg-blue-400',    border: 'border-blue-300',    bg: 'bg-blue-50',    head: 'text-blue-700' },
  violet:  { dot: 'bg-violet-400',  border: 'border-violet-300',  bg: 'bg-violet-50',  head: 'text-violet-700' },
  emerald: { dot: 'bg-emerald-400', border: 'border-emerald-300', bg: 'bg-emerald-50', head: 'text-emerald-700' },
  indigo:  { dot: 'bg-indigo-400',  border: 'border-indigo-300',  bg: 'bg-indigo-50',  head: 'text-indigo-700' },
  rose:    { dot: 'bg-rose-400',    border: 'border-rose-300',    bg: 'bg-rose-50',    head: 'text-rose-700' },
  cyan:    { dot: 'bg-cyan-400',    border: 'border-cyan-300',    bg: 'bg-cyan-50',    head: 'text-cyan-700' },
  orange:  { dot: 'bg-orange-400',  border: 'border-orange-300',  bg: 'bg-orange-50',  head: 'text-orange-700' },
}

export const getStageStyles = (color) => STYLE_MAP[color] || STYLE_MAP.slate

export function useWorkflowConfig(siteId) {
  const [stages, setStages]   = useState([])
  const [loading, setLoading] = useState(true)

  const fetchStages = useCallback(async () => {
    if (!siteId) { setStages([]); setLoading(false); return }
    setLoading(true)
    const { data } = await supabase
      .from('site_workflow_stages')
      .select('*')
      .eq('site_id', siteId)
      .order('stage_order', { ascending: true })
    setStages(data || [])
    setLoading(false)
  }, [siteId])

  useEffect(() => { fetchStages() }, [fetchStages])

  /* ── Derived helpers ── */
  const draftStage     = stages.find(s => s.stage_type === 'draft')
  const publishedStage = stages.find(s => s.stage_type === 'published')
  const reviewStages   = stages.filter(s => s.stage_type === 'review')

  const getNextStage = (code) => {
    const cur = stages.find(s => s.stage_code === code)
    return cur ? stages.find(s => s.stage_order === cur.stage_order + 1) || null : null
  }
  const getPrevStage = (code) => {
    const cur = stages.find(s => s.stage_code === code)
    return cur ? stages.find(s => s.stage_order === cur.stage_order - 1) || null : null
  }
  const getStage   = (code) => stages.find(s => s.stage_code === code) || null
  const stageLabel = (code) => stages.find(s => s.stage_code === code)?.stage_name || code

  /* ── CRUD ── */
  const addReviewStage = async (name, assigneeId) => {
    const pub = publishedStage
    if (!pub) return
    const newOrder = pub.stage_order
    const maxCode  = Math.max(...stages.map(s => parseInt(s.stage_code) || 0))
    const newCode  = String(maxCode + 1).padStart(2, '0')

    // Bump published order
    await supabase.from('site_workflow_stages')
      .update({ stage_order: newOrder + 1 })
      .eq('id', pub.id)

    await supabase.from('site_workflow_stages').insert({
      site_id: siteId, stage_order: newOrder, stage_code: newCode,
      stage_name: name, stage_type: 'review',
      assignee_id: assigneeId || null,
      color: STAGE_COLORS[reviewStages.length % STAGE_COLORS.length],
    })
    await fetchStages()
  }

  const updateStage = async (id, patch) => {
    await supabase.from('site_workflow_stages').update(patch).eq('id', id)
    await fetchStages()
  }

  const removeStage = async (id) => {
    const stage = stages.find(s => s.id === id)
    if (!stage || stage.stage_type !== 'review') return
    await supabase.from('site_workflow_stages').delete().eq('id', id)
    // Recompute sequential orders
    const remaining = stages.filter(s => s.id !== id).sort((a, b) => a.stage_order - b.stage_order)
    for (let i = 0; i < remaining.length; i++) {
      if (remaining[i].stage_order !== i) {
        await supabase.from('site_workflow_stages').update({ stage_order: i }).eq('id', remaining[i].id)
      }
    }
    await fetchStages()
  }

  return {
    stages, loading, refetch: fetchStages,
    draftStage, publishedStage, reviewStages,
    getNextStage, getPrevStage, getStage, stageLabel,
    addReviewStage, updateStage, removeStage,
  }
}
