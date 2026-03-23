import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Lightweight hook that returns notification badge counts
 * for the current user's actionable items across all site apps.
 *
 * Uses Supabase Realtime to re-fetch counts instantly when
 * any CRUD event occurs on tasks, documents, wiki_pages, or project_list_items.
 *
 * Returns { tasks, documents, wiki, forms, issues }
 */
export function useNotificationCounts(siteId, currentUser) {
  const [counts, setCounts] = useState({ tasks: 0, documents: 0, wiki: 0, forms: 0, issues: 0 })

  const fetchCounts = useCallback(async () => {
    if (!siteId || !currentUser?.id) {
      setCounts({ tasks: 0, documents: 0, wiki: 0, forms: 0, issues: 0 })
      return
    }

    const uid = currentUser.id

    // 1. Tasks: pending tasks assigned to me
    const taskP = supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('site_id', siteId)
      .eq('status', 'pending')
      .eq('assignee_id', uid)

    // 2. Workflow stages where I'm the review assignee
    const stagesP = supabase
      .from('site_workflow_stages')
      .select('stage_code')
      .eq('site_id', siteId)
      .eq('stage_type', 'review')
      .eq('assignee_id', uid)

    // 3. Issues: open/in-progress assigned to me (need list IDs first)
    const listsP = supabase
      .from('project_lists')
      .select('id')
      .eq('site_id', siteId)

    const [taskRes, stagesRes, listsRes] = await Promise.all([taskP, stagesP, listsP])

    const taskCount = taskRes.count || 0

    // Count documents, wiki pages, and forms in my review stages
    let docCount = 0
    let wikiCount = 0
    let formCount = 0
    const myCodes = (stagesRes.data || []).map(s => s.stage_code)
    if (myCodes.length > 0) {
      const [docRes, wikiRes, formRes] = await Promise.all([
        supabase
          .from('documents')
          .select('id', { count: 'exact', head: true })
          .eq('site_id', siteId)
          .in('folder', myCodes),
        supabase
          .from('wiki_pages')
          .select('id', { count: 'exact', head: true })
          .eq('site_id', siteId)
          .in('status', myCodes),
        supabase
          .from('forms')
          .select('id', { count: 'exact', head: true })
          .eq('site_id', siteId)
          .in('status', myCodes),
      ])
      docCount = docRes.count || 0
      wikiCount = wikiRes.count || 0
      formCount = formRes.count || 0
    }

    // Count issues assigned to me (not Done)
    let issueCount = 0
    const listIds = (listsRes.data || []).map(l => l.id)
    if (listIds.length > 0) {
      const { count } = await supabase
        .from('project_list_items')
        .select('id', { count: 'exact', head: true })
        .in('list_id', listIds)
        .eq('assignee_id', uid)
        .neq('status', 'Done')
      issueCount = count || 0
    }

    setCounts({ tasks: taskCount, documents: docCount, wiki: wikiCount, forms: formCount, issues: issueCount })
  }, [siteId, currentUser?.id])

  // Initial fetch
  useEffect(() => { fetchCounts() }, [fetchCounts])

  // Supabase Realtime: re-fetch on any CRUD event from the 4 tables
  useEffect(() => {
    if (!siteId || !currentUser?.id) return

    const channel = supabase
      .channel(`notifications:${siteId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks',              filter: `site_id=eq.${siteId}` }, fetchCounts)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'documents',           filter: `site_id=eq.${siteId}` }, fetchCounts)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wiki_pages',          filter: `site_id=eq.${siteId}` }, fetchCounts)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'forms',              filter: `site_id=eq.${siteId}` }, fetchCounts)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_list_items' }, fetchCounts)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [siteId, currentUser?.id, fetchCounts])

  return counts
}
