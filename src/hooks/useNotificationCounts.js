import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Lightweight hook that returns notification badge counts
 * for the current user's actionable items across all site apps.
 *
 * Returns { tasks, documents, wiki, issues }
 */
export function useNotificationCounts(siteId, currentUser) {
  const [counts, setCounts] = useState({ tasks: 0, documents: 0, wiki: 0, issues: 0 })

  const fetchCounts = useCallback(async () => {
    if (!siteId || !currentUser?.id) {
      setCounts({ tasks: 0, documents: 0, wiki: 0, issues: 0 })
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

    // Count documents in my review stages
    let docCount = 0
    let wikiCount = 0
    const myCodes = (stagesRes.data || []).map(s => s.stage_code)
    if (myCodes.length > 0) {
      const [docRes, wikiRes] = await Promise.all([
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
      ])
      docCount = docRes.count || 0
      wikiCount = wikiRes.count || 0
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

    setCounts({ tasks: taskCount, documents: docCount, wiki: wikiCount, issues: issueCount })
  }, [siteId, currentUser?.id])

  useEffect(() => { fetchCounts() }, [fetchCounts])

  // Re-fetch every 30 seconds
  useEffect(() => {
    if (!siteId || !currentUser?.id) return
    const id = setInterval(fetchCounts, 30000)
    return () => clearInterval(id)
  }, [siteId, currentUser?.id, fetchCounts])

  return counts
}
