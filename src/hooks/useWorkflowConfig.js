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

/* Default stages to seed when creating a new site */
export const DEFAULT_WORKFLOW_STAGES = [
  { stage_order: 0, stage_code: '01', stage_name: 'Draft',        stage_type: 'draft',     assignee_id: null, color: 'slate' },
  { stage_order: 1, stage_code: '02', stage_name: 'In Review',    stage_type: 'review',    assignee_id: null, color: 'amber' },
  { stage_order: 2, stage_code: '03', stage_name: 'Final Review', stage_type: 'review',    assignee_id: null, color: 'violet' },
  { stage_order: 3, stage_code: '04', stage_name: 'Published',    stage_type: 'published', assignee_id: null, color: 'emerald' },
]

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

  /* ── Check if a stage has existing data (docs or wiki pages) ── */
  const checkStageUsage = async (stageCode) => {
    const [{ count: docCount }, { count: wikiCount }] = await Promise.all([
      supabase.from('documents').select('id', { count: 'exact', head: true }).eq('site_id', siteId).eq('folder', stageCode),
      supabase.from('wiki_pages').select('id', { count: 'exact', head: true }).eq('site_id', siteId).eq('status', stageCode),
    ])
    return { docCount: docCount || 0, wikiCount: wikiCount || 0, total: (docCount || 0) + (wikiCount || 0) }
  }

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
    if (!stage || stage.stage_type !== 'review') return { error: 'Cannot remove non-review stage' }

    // Check usage
    const usage = await checkStageUsage(stage.stage_code)
    if (usage.total > 0) {
      return { error: `Cannot delete — ${usage.docCount} document(s) and ${usage.wikiCount} wiki page(s) are in "${stage.stage_name}"` }
    }

    await supabase.from('site_workflow_stages').delete().eq('id', id)
    // Recompute sequential orders
    const remaining = stages.filter(s => s.id !== id).sort((a, b) => a.stage_order - b.stage_order)
    for (let i = 0; i < remaining.length; i++) {
      if (remaining[i].stage_order !== i) {
        await supabase.from('site_workflow_stages').update({ stage_order: i }).eq('id', remaining[i].id)
      }
    }
    await fetchStages()
    return { error: null }
  }

  /* ── Swap order of two adjacent review stages ── */
  const swapOrder = async (idA, idB) => {
    const a = stages.find(s => s.id === idA)
    const b = stages.find(s => s.id === idB)
    if (!a || !b) return
    // Only allow swapping review stages (not draft/published)
    if (a.stage_type !== 'review' && b.stage_type !== 'review') return
    await Promise.all([
      supabase.from('site_workflow_stages').update({ stage_order: b.stage_order }).eq('id', idA),
      supabase.from('site_workflow_stages').update({ stage_order: a.stage_order }).eq('id', idB),
    ])
    await fetchStages()
  }

  return {
    stages, loading, refetch: fetchStages,
    draftStage, publishedStage, reviewStages,
    getNextStage, getPrevStage, getStage, stageLabel,
    addReviewStage, updateStage, removeStage, swapOrder, checkStageUsage,
  }
}
