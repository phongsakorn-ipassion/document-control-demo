import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import useAppStore from '../store/useAppStore'
import { ID_NAME_MAP } from '../lib/roles'
import { useProjectLists } from '../hooks/useProjectLists'
import { useToast } from '../components/Toast'
import Avatar from '../components/Avatar'
import Badge from '../components/Badge'
import { Plus } from '../lib/icons'

const STATUS_COLORS = { 'Done': 'emerald', 'In Progress': 'blue', 'Open': 'slate' }
const PRIORITY_COLORS = { 'High': 'rose', 'Medium': 'amber', 'Low': 'slate' }

export default function ProjectLists() {
  const { siteId } = useParams()
  const activeListId = useAppStore(s => s.activeListId)
  const setActiveListId = useAppStore(s => s.setActiveListId)
  const setScreen = useAppStore(s => s.setScreen)
  const showToast = useToast()

  const { data: lists, loading, error, createList } = useProjectLists(siteId)

  useEffect(() => { setScreen('issues') }, [setScreen])

  // Auto-select first list
  useEffect(() => {
    if (lists.length > 0 && !activeListId) {
      setActiveListId(lists[0].id)
    }
  }, [lists, activeListId, setActiveListId])

  const activeList = lists.find(l => l.id === activeListId)

  const handleCreateList = async () => {
    const { data: row } = await createList('New List')
    if (row) setActiveListId(row.id)
    showToast('New list created')
  }

  return (
    <div className="flex h-full">
      {/* Pane 1: List Nav */}
      <div className="w-52 flex-shrink-0 bg-white border-r border-slate-200 p-4 overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] text-slate-400 uppercase tracking-wider">LISTS</p>
          <button onClick={handleCreateList}
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
              <button key={list.id} onClick={() => setActiveListId(list.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition ${
                  activeListId === list.id
                    ? 'bg-indigo-50 text-indigo-700 font-medium'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}>
                <span className="truncate">📋 {list.name}</span>
                <span className="bg-slate-100 text-slate-500 text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 ml-2">
                  {list.items?.length || 0}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Pane 2: Table */}
      <div className="flex-1 p-5 overflow-auto">
        {!activeList ? (
          <div className="flex items-center justify-center h-full text-sm text-slate-400">
            Select a list to view
          </div>
        ) : (
          <div className="animate-slide-in">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">{activeList.name}</h2>
                <p className="text-xs text-slate-400">{activeList.items?.length || 0} items</p>
              </div>
              <button onClick={() => showToast('New item form — fill fields to add')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition">
                <Plus size={14} /> New Item
              </button>
            </div>

            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-600 rounded-xl p-4 text-sm mb-4">{error.message}</div>
            )}

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
                  {(activeList.items || []).map(item => {
                    const assigneeName = ID_NAME_MAP[item.assignee_id] || 'Unknown'
                    return (
                      <tr key={item.id} className="hover:bg-slate-50 cursor-pointer transition border-b border-slate-100 last:border-0">
                        <td className="px-4 py-3 font-mono text-xs text-indigo-600 font-semibold">{item.issue_key}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-slate-900">{item.title}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Avatar name={assigneeName} size="sm" />
                            <span className="text-xs text-slate-600">{assigneeName.split(' ')[0]}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <button onClick={() => showToast('Status updated')}>
                            <Badge label={item.status} color={STATUS_COLORS[item.status] || 'slate'} />
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <Badge label={item.priority} color={PRIORITY_COLORS[item.priority] || 'slate'} />
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-400">{item.due_date}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
