import { useEffect, useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useParams } from 'react-router-dom'
import useAppStore from '../store/useAppStore'
import { supabase } from '../lib/supabase'
import { ID_NAME_MAP, DEMO_USERS } from '../lib/roles'
import { useProjectLists } from '../hooks/useProjectLists'
import { useActivities } from '../hooks/useActivities'
import { useInfiniteScroll } from '../hooks/useInfiniteScroll'
import { useToast } from '../components/Toast'
import Avatar from '../components/Avatar'
import Badge from '../components/Badge'
import { Plus, EditPen, XClose, Trash, Calendar, List } from '../lib/icons'

const STATUS_OPTIONS = ['Open', 'In Progress', 'Done']
const STATUS_COLORS  = { 'Done': 'emerald', 'In Progress': 'blue', 'Open': 'slate' }
const PRIORITY_OPTIONS = ['Low', 'Medium', 'High']
const PRIORITY_COLORS  = { 'High': 'rose', 'Medium': 'amber', 'Low': 'slate' }

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

/* ─── Delete List Modal ─── */
function DeleteListModal({ list, onConfirm, onClose }) {
  const [busy, setBusy] = useState(false)
  const handle = async () => { setBusy(true); await onConfirm(); setBusy(false) }
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-slide-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-rose-600">Delete List</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><XClose size={18} /></button>
        </div>
        <p className="text-sm text-slate-600 mb-1">Delete <strong>"{list.name}"</strong> and all its items?</p>
        <p className="text-xs text-rose-500 mb-5">⚠ This action cannot be undone.</p>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50">Cancel</button>
          <button onClick={handle} disabled={busy}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-60">
            {busy ? 'Deleting...' : <><Trash size={12} /> Delete</>}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

/* ─── Delete Item Modal ─── */
function DeleteItemModal({ item, onConfirm, onClose }) {
  const [busy, setBusy] = useState(false)
  const handle = async () => { setBusy(true); await onConfirm(); setBusy(false) }
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-slide-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-rose-600">Delete Issue</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><XClose size={18} /></button>
        </div>
        <p className="text-sm text-slate-600 mb-1">Permanently delete <strong>{item.issue_key}</strong> — "{item.title}"?</p>
        <p className="text-xs text-rose-500 mb-5">⚠ This action cannot be undone.</p>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50">Cancel</button>
          <button onClick={handle} disabled={busy}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-60">
            {busy ? 'Deleting...' : <><Trash size={12} /> Delete</>}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

/* ─── Create / Edit Item Modal ─── */
function ItemFormModal({ item, listItems, onSave, onClose, isEdit }) {
  const [busy, setBusy] = useState(false)
  const [title, setTitle] = useState(item?.title || '')
  const [description, setDescription] = useState(item?.description || '')
  const [assigneeId, setAssigneeId] = useState(item?.assignee_id || DEMO_USERS[0].id)
  const [status, setStatus] = useState(item?.status || 'Open')
  const [priority, setPriority] = useState(item?.priority || 'Medium')
  const [dueDate, setDueDate] = useState(item?.due_date || '')

  // Auto-generate issue key for new items
  const nextKey = isEdit ? item.issue_key : (() => {
    const nums = (listItems || []).map(i => {
      const m = i.issue_key?.match(/ISS-(\d+)/)
      return m ? parseInt(m[1], 10) : 0
    })
    const max = nums.length > 0 ? Math.max(...nums) : 0
    return `ISS-${String(max + 1).padStart(3, '0')}`
  })()

  const handle = async () => {
    if (!title.trim()) return
    setBusy(true)
    await onSave({
      issue_key: nextKey,
      title: title.trim(),
      description: description.trim(),
      assignee_id: assigneeId,
      status,
      priority,
      due_date: dueDate || null,
    })
    setBusy(false)
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-slide-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-slate-900">{isEdit ? `Edit ${item.issue_key}` : `New Issue — ${nextKey}`}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><XClose size={18} /></button>
        </div>

        <div className="space-y-3">
          {/* Title */}
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">Title *</label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              placeholder="Issue title..." autoFocus />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
              placeholder="Describe the issue..." />
          </div>

          {/* Row: Assignee + Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Assignee</label>
              <select value={assigneeId} onChange={e => setAssigneeId(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white">
                {DEMO_USERS.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Status</label>
              <select value={status} onChange={e => setStatus(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white">
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Row: Priority + Due Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Priority</label>
              <select value={priority} onChange={e => setPriority(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white">
                {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Due Date</label>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-5">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50">Cancel</button>
          <button onClick={handle} disabled={busy || !title.trim()}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60">
            {busy ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Issue'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

/* ─── Main Issues Screen ─── */

export default function ProjectLists() {
  const { siteId } = useParams()
  const activeListId = useAppStore(s => s.activeListId)
  const setActiveListId = useAppStore(s => s.setActiveListId)
  const setScreen = useAppStore(s => s.setScreen)
  const currentUser = useAppStore(s => s.currentUser)
  const showToast = useToast()

  const { data: lists, loading, error, createList, updateList, deleteList, createItem, updateItem, deleteItem, refetch } = useProjectLists(siteId)

  const [selectedItemId, setSelectedItemId] = useState(null)

  // Modals
  const [showCreateItem, setShowCreateItem] = useState(false)
  const [showEditItem, setShowEditItem] = useState(null)
  const [showDeleteItem, setShowDeleteItem] = useState(null)
  const [showDeleteList, setShowDeleteList] = useState(null)

  // Inline list creation
  const [isCreatingList, setIsCreatingList] = useState(false)
  const [newListName, setNewListName] = useState('')
  const newListRef = useRef(null)

  // Inline list rename
  const [renamingListId, setRenamingListId] = useState(null)
  const [renameValue, setRenameValue] = useState('')
  const renameRef = useRef(null)

  useEffect(() => { setScreen('issues') }, [setScreen])

  // Auto-select first list
  useEffect(() => {
    if (lists.length > 0 && !activeListId) {
      setActiveListId(lists[0].id)
    }
  }, [lists, activeListId, setActiveListId])

  // Focus new list input
  useEffect(() => {
    if (isCreatingList && newListRef.current) newListRef.current.focus()
  }, [isCreatingList])

  // Focus rename input
  useEffect(() => {
    if (renamingListId && renameRef.current) renameRef.current.focus()
  }, [renamingListId])

  const activeList = lists.find(l => l.id === activeListId)
  const items = activeList?.items || []
  const selectedItem = items.find(i => i.id === selectedItemId)

  // Activity for detail panel
  const activities = useActivities(siteId, { filterTarget: selectedItem?.issue_key })
  const actSentinelRef = useInfiniteScroll(activities.loadMore, { enabled: activities.hasMore && !activities.loadingMore })

  /* ── List CRUD ── */
  const handleCreateList = async () => {
    if (!newListName.trim()) { setIsCreatingList(false); return }
    const { data: row } = await createList(newListName.trim())
    if (row) {
      setActiveListId(row.id)
      await supabase.from('activities').insert({ site_id: siteId, actor_id: currentUser?.id, action: 'created list', target: newListName.trim() })
    }
    setNewListName('')
    setIsCreatingList(false)
    showToast('List created')
  }

  const handleRenameList = async (listId) => {
    if (!renameValue.trim()) { setRenamingListId(null); return }
    const list = lists.find(l => l.id === listId)
    const oldName = list?.name || ''
    await updateList(listId, { name: renameValue.trim() })
    await supabase.from('activities').insert({ site_id: siteId, actor_id: currentUser?.id, action: `renamed list "${oldName}" to`, target: renameValue.trim() })
    setRenamingListId(null)
    showToast('List renamed')
  }

  const handleDeleteList = async () => {
    if (!showDeleteList) return
    const name = showDeleteList.name
    const id = showDeleteList.id
    await deleteList(id)
    await supabase.from('activities').insert({ site_id: siteId, actor_id: currentUser?.id, action: 'deleted list', target: name })
    if (activeListId === id) setActiveListId(null)
    setShowDeleteList(null)
    showToast('List deleted')
  }

  /* ── Item CRUD ── */
  const handleCreateItem = async (payload) => {
    if (!activeList) return
    const { data: row } = await createItem(activeList.id, payload)
    if (row) {
      await supabase.from('activities').insert({ site_id: siteId, actor_id: currentUser?.id, action: 'created issue', target: payload.issue_key })
      setSelectedItemId(row.id)
    }
    setShowCreateItem(false)
    showToast(`Issue ${payload.issue_key} created`)
    setTimeout(() => activities.refetch?.(), 600)
  }

  const handleEditItem = async (payload) => {
    if (!showEditItem) return
    await updateItem(showEditItem.id, payload)
    await supabase.from('activities').insert({ site_id: siteId, actor_id: currentUser?.id, action: 'updated issue', target: payload.issue_key })
    setShowEditItem(null)
    showToast(`Issue ${payload.issue_key} updated`)
    setTimeout(() => activities.refetch?.(), 600)
  }

  const handleDeleteItem = async () => {
    if (!showDeleteItem) return
    const key = showDeleteItem.issue_key
    await deleteItem(showDeleteItem.id)
    await supabase.from('activities').insert({ site_id: siteId, actor_id: currentUser?.id, action: 'deleted issue', target: key })
    if (selectedItemId === showDeleteItem.id) setSelectedItemId(null)
    setShowDeleteItem(null)
    showToast(`Issue ${key} deleted`)
  }

  const handleStatusCycle = async (item) => {
    const idx = STATUS_OPTIONS.indexOf(item.status)
    const next = STATUS_OPTIONS[(idx + 1) % STATUS_OPTIONS.length]
    await updateItem(item.id, { status: next })
    await supabase.from('activities').insert({ site_id: siteId, actor_id: currentUser?.id, action: `changed status of ${item.issue_key} to`, target: next })
    showToast(`${item.issue_key} → ${next}`)
    setTimeout(() => activities.refetch?.(), 600)
  }

  const handlePriorityCycle = async (item) => {
    const idx = PRIORITY_OPTIONS.indexOf(item.priority)
    const next = PRIORITY_OPTIONS[(idx + 1) % PRIORITY_OPTIONS.length]
    await updateItem(item.id, { priority: next })
    await supabase.from('activities').insert({ site_id: siteId, actor_id: currentUser?.id, action: `changed priority of ${item.issue_key} to`, target: next })
    showToast(`${item.issue_key} priority → ${next}`)
    setTimeout(() => activities.refetch?.(), 600)
  }

  return (
    <div className="flex h-full">
      {/* ─── Pane 1: List Navigator ─── */}
      <div className="w-52 flex-shrink-0 bg-white border-r border-slate-200 p-4 overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] text-slate-400 uppercase tracking-wider">LISTS</p>
          <button onClick={() => { setIsCreatingList(true); setNewListName('') }}
            className="text-indigo-600 hover:bg-slate-100 rounded p-1 transition">
            <Plus size={14} />
          </button>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1,2].map(i => <div key={i} className="h-8 bg-slate-100 rounded animate-pulse" />)}
          </div>
        ) : (
          <div className="space-y-0.5">
            {lists.map(list => (
              <div key={list.id}
                className={`group w-full flex items-center gap-1 px-2 py-1.5 rounded-lg text-sm transition ${
                  activeListId === list.id
                    ? 'bg-indigo-50 text-indigo-700 font-medium'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}>
                {renamingListId === list.id ? (
                  <input ref={renameRef} value={renameValue}
                    onChange={e => setRenameValue(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleRenameList(list.id); if (e.key === 'Escape') setRenamingListId(null) }}
                    onBlur={() => handleRenameList(list.id)}
                    className="flex-1 bg-white border border-indigo-300 rounded px-1.5 py-0.5 text-sm focus:outline-none min-w-0" />
                ) : (
                  <button
                    onClick={() => { setActiveListId(list.id); setSelectedItemId(null) }}
                    onDoubleClick={() => { setRenamingListId(list.id); setRenameValue(list.name) }}
                    className="flex-1 text-left truncate flex items-center gap-1.5 min-w-0">
                    <span className="truncate">📋 {list.name}</span>
                  </button>
                )}
                <span className={`text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                  activeListId === list.id ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'
                }`}>{list.items?.length || 0}</span>
                <button onClick={(e) => { e.stopPropagation(); setShowDeleteList(list) }}
                  className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-500 p-0.5 rounded transition flex-shrink-0">
                  <Trash size={12} />
                </button>
              </div>
            ))}

            {/* Inline new list input */}
            {isCreatingList && (
              <div className="px-2 py-1.5">
                <input ref={newListRef} value={newListName}
                  onChange={e => setNewListName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleCreateList(); if (e.key === 'Escape') setIsCreatingList(false) }}
                  onBlur={handleCreateList}
                  className="w-full bg-white border border-indigo-300 rounded px-2 py-1 text-sm focus:outline-none"
                  placeholder="List name..." />
              </div>
            )}
          </div>
        )}

        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mt-4 text-xs text-slate-500">
          Double-click a list name to rename. Hover to delete.
        </div>
      </div>

      {/* ─── Pane 2: Issue Table ─── */}
      <div className="flex-1 p-5 overflow-auto bg-slate-50">
        {!activeList ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <List size={36} className="text-slate-200 mb-3" />
            <p className="text-sm text-slate-500 font-medium">Select a list to view</p>
            <p className="text-xs text-slate-400 mt-1">Or click "+" to create a new list</p>
          </div>
        ) : (
          <div className="animate-slide-in">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">{activeList.name}</h2>
                <p className="text-xs text-slate-400">{items.length} issue(s)</p>
              </div>
              <button onClick={() => setShowCreateItem(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition">
                <Plus size={14} /> New Item
              </button>
            </div>

            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-600 rounded-xl p-4 text-sm mb-4">{error.message}</div>
            )}

            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <List size={36} className="text-slate-200 mb-3" />
                <p className="text-sm text-slate-500 font-medium">No issues yet</p>
                <p className="text-xs text-slate-400 mt-1">Click "+ New Item" to create one</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-slate-500 uppercase">Issue ID</th>
                      <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-slate-500 uppercase">Title</th>
                      <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-slate-500 uppercase">Assignee</th>
                      <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-slate-500 uppercase">Status</th>
                      <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-slate-500 uppercase">Priority</th>
                      <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-slate-500 uppercase">Due Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(item => {
                      const assigneeName = ID_NAME_MAP[item.assignee_id] || 'Unknown'
                      const isSelected = selectedItemId === item.id
                      return (
                        <tr key={item.id}
                          onClick={() => setSelectedItemId(item.id)}
                          className={`cursor-pointer transition border-b border-slate-100 last:border-0 ${
                            isSelected ? 'bg-indigo-50' : 'hover:bg-slate-50'
                          }`}>
                          <td className="px-4 py-3 font-mono text-xs text-indigo-600 font-semibold">{item.issue_key}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-slate-900 max-w-[200px] truncate">{item.title}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Avatar name={assigneeName} size="sm" />
                              <span className="text-xs text-slate-600">{assigneeName.split(' ')[0]}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <button onClick={(e) => { e.stopPropagation(); handleStatusCycle(item) }}
                              title="Click to cycle status">
                              <Badge label={item.status} color={STATUS_COLORS[item.status] || 'slate'} />
                            </button>
                          </td>
                          <td className="px-4 py-3">
                            <button onClick={(e) => { e.stopPropagation(); handlePriorityCycle(item) }}
                              title="Click to cycle priority">
                              <Badge label={item.priority} color={PRIORITY_COLORS[item.priority] || 'slate'} />
                            </button>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-400">{formatDate(item.due_date)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── Pane 3: Detail Panel ─── */}
      {selectedItem && (
        <div className="w-72 flex-shrink-0 bg-white border-l border-slate-200 p-5 overflow-y-auto flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-semibold text-slate-400 uppercase">Issue Details</p>
            <button onClick={() => setSelectedItemId(null)} className="text-slate-400 hover:text-slate-600">
              <XClose size={14} />
            </button>
          </div>

          {/* Title + Badge */}
          <div className="flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center flex-shrink-0">
              <List size={16} className="text-indigo-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-mono text-indigo-600 font-semibold">{selectedItem.issue_key}</p>
              <p className="text-sm font-semibold text-slate-900 truncate">{selectedItem.title}</p>
            </div>
          </div>

          {/* Metadata */}
          <div className="space-y-2 text-xs mb-4">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Status</span>
              <Badge label={selectedItem.status} color={STATUS_COLORS[selectedItem.status] || 'slate'} />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Priority</span>
              <Badge label={selectedItem.priority} color={PRIORITY_COLORS[selectedItem.priority] || 'slate'} />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Assignee</span>
              <div className="flex items-center gap-1.5">
                <Avatar name={ID_NAME_MAP[selectedItem.assignee_id] || 'Unknown'} size="sm" />
                <span className="text-slate-700 font-medium">{ID_NAME_MAP[selectedItem.assignee_id] || 'Unknown'}</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Due Date</span>
              <span className="text-slate-700 font-medium flex items-center gap-1">
                <Calendar size={11} className="text-slate-400" />
                {formatDate(selectedItem.due_date)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Created</span>
              <span className="text-slate-700 font-medium">{timeAgo(selectedItem.created_at)}</span>
            </div>
          </div>

          {/* Description */}
          {selectedItem.description && (
            <div className="border-t border-slate-100 pt-3 mb-4">
              <p className="text-xs font-semibold text-slate-700 mb-1">Description</p>
              <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">{selectedItem.description}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 mb-4">
            <button onClick={() => setShowEditItem(selectedItem)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200 transition">
              <EditPen size={12} /> Edit
            </button>
            <button onClick={() => setShowDeleteItem(selectedItem)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 transition">
              <Trash size={12} /> Delete
            </button>
          </div>

          {/* Activity Log */}
          <div className="border-t border-slate-100 pt-4 flex-1">
            <p className="text-xs font-semibold text-slate-700 mb-2">Activity</p>
            <div className="max-h-[200px] overflow-y-auto space-y-2">
              {activities.data.length === 0 && !activities.loading ? (
                <p className="text-xs text-slate-400">No activity yet.</p>
              ) : (
                activities.data.map(a => (
                  <div key={a.id} className="flex items-start gap-2">
                    <Avatar name={ID_NAME_MAP[a.actor_id] || '?'} size="sm" />
                    <div className="min-w-0">
                      <p className="text-xs text-slate-700">
                        <span className="font-medium">{ID_NAME_MAP[a.actor_id] || 'Unknown'}</span>{' '}
                        <span className="text-slate-500">{a.action}</span>{' '}
                        {a.target && <span className="font-medium text-slate-600">{a.target}</span>}
                      </p>
                      <p className="text-[10px] text-slate-400">{timeAgo(a.created_at)}</p>
                    </div>
                  </div>
                ))
              )}
              <div ref={actSentinelRef} />
              {activities.loadingMore && <div className="h-6 bg-slate-100 rounded animate-pulse" />}
            </div>
          </div>
        </div>
      )}

      {/* ─── Modals ─── */}
      {showCreateItem && (
        <ItemFormModal
          listItems={items}
          onSave={handleCreateItem}
          onClose={() => setShowCreateItem(false)}
          isEdit={false}
        />
      )}
      {showEditItem && (
        <ItemFormModal
          item={showEditItem}
          listItems={items}
          onSave={handleEditItem}
          onClose={() => setShowEditItem(null)}
          isEdit={true}
        />
      )}
      {showDeleteItem && (
        <DeleteItemModal item={showDeleteItem} onConfirm={handleDeleteItem} onClose={() => setShowDeleteItem(null)} />
      )}
      {showDeleteList && (
        <DeleteListModal list={showDeleteList} onConfirm={handleDeleteList} onClose={() => setShowDeleteList(null)} />
      )}
    </div>
  )
}
