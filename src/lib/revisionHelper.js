import { supabase } from './supabase'

/**
 * Save a revision snapshot when an item is published.
 * @param {'document'|'wiki'|'form'} entityType
 * @param {string} entityId
 * @param {number} revision
 * @param {object} snapshot - content to preserve
 * @param {string} comment - publish comment
 * @param {string} publishedBy - user ID
 */
export async function saveRevisionSnapshot(entityType, entityId, revision, snapshot, comment, publishedBy) {
  await supabase.from('revision_history').insert({
    entity_type: entityType,
    entity_id: entityId,
    revision,
    snapshot,
    comment: comment || null,
    published_by: publishedBy,
  })
}

/**
 * Check if an item has been published before (has revision history).
 * If so, return the next revision number. Otherwise return current revision.
 * Call this on re-submit from Draft.
 * @param {string} entityId
 * @returns {number|null} next revision number, or null if no history (stay at rev 1)
 */
export async function getNextRevision(entityId) {
  const { data } = await supabase
    .from('revision_history')
    .select('revision')
    .eq('entity_id', entityId)
    .order('revision', { ascending: false })
    .limit(1)
  if (data && data.length > 0) {
    return data[0].revision + 1
  }
  return null // no history = first time, stay at rev 1
}

/**
 * Fetch revision history for an entity.
 * @param {string} entityId
 * @returns {Array} revision entries sorted newest first
 */
export async function fetchRevisionHistory(entityId) {
  const { data } = await supabase
    .from('revision_history')
    .select('*')
    .eq('entity_id', entityId)
    .order('revision', { ascending: false })
  return data || []
}
