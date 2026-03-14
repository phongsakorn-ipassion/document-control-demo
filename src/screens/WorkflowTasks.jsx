import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import useAppStore from '../store/useAppStore'
import { NAME_MAP, ROLES } from '../lib/roles'
import { useTasks } from '../hooks/useTasks'
import { useToast } from '../components/Toast'
import Avatar from '../components/Avatar'
import Badge from '../components/Badge'
import { CheckOk, XClose } from '../lib/icons'

const COLUMNS = [
  { id: '01', label: 'Draft',        border: 'border-slate-300',   bg: 'bg-slate-50',   head: 'text-slate-700' },
  { id: '02', label: 'In Review',    border: 'border-amber-300',   bg: 'bg-amber-50',   head: 'text-amber-700' },
  { id: '03', label: 'Final Review', border: 'border-blue-300',    bg: 'bg-blue-50',    head: 'text-blue-700' },
  { id: '04', label: 'Published',    border: 'border-emerald-300', bg: 'bg-emerald-50', head: 'text-emerald-700' },
]

export default function WorkflowTasks() {
  const { siteId } = useParams()
  const currentUser = useAppStore(s => s.currentUser)
  const setScreen = useAppStore(s => s.setScreen)
  const showToast = useToast()

  const { data: tasks, loading, error, approve, reject } = useTasks(siteId)

  useEffect(() => { setScreen('tasks') }, [setScreen])

  const userRole = currentUser ? ROLES[currentUser.email] : null

  const handleApprove = async (task) => {
    await approve(task.id, task.document_id)
    showToast('✓ Approved — document moved to next stage')
  }

  const handleReject = async (task) => {
    await reject(task.id, task.document_id)
    showToast('✕ Rejected — document returned to previous stage')
  }

  const canApproveTask = (task) => {
    if (!userRole) return false
    if (userRole.canApproveFolder === null) return true
    return task.assignee_id === currentUser.id && task.folder === userRole.canApproveFolder
  }

  // Role context banner
  const roleBanner = userRole ? {
    Admin:    { bg: 'bg-indigo-50 border-indigo-200',  badge: 'Admin View',  color: 'indigo',  text: 'Full access — you can approve or reject any pending task' },
    Reviewer: { bg: 'bg-amber-50 border-amber-200',    badge: 'Reviewer',    color: 'amber',   text: 'Round 1 approvals — your tasks are in the 02 · In Review column' },
    Approver: { bg: 'bg-emerald-50 border-emerald-200', badge: 'Approver',   color: 'emerald', text: 'Round 2 approvals — your tasks are in the 03 · Final Review column' },
  }[userRole.role] : null

  if (loading) {
    return (
      <div className="p-6 space-y-6 animate-slide-in">
        <div className="grid grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-48 bg-white rounded-2xl animate-pulse" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 animate-slide-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Workflow Board</h1>
          <p className="text-xs text-slate-400">{tasks.length} active task(s) · viewing as {currentUser?.name}</p>
        </div>
        <div className="bg-slate-100 text-slate-400 rounded-lg px-3 py-1.5 text-xs">
          Switch demo user (top-right) to change role perspective
        </div>
      </div>

      {/* Role Banner */}
      {roleBanner && (
        <div className={`${roleBanner.bg} border rounded-xl flex items-center gap-3 px-4 py-3`}>
          <Badge label={roleBanner.badge} color={roleBanner.color} />
          <span className="text-sm text-slate-700">{roleBanner.text}</span>
        </div>
      )}

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-600 rounded-xl p-4 text-sm">{error.message}</div>
      )}

      {/* All tasks completed */}
      {tasks.length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center py-16">
          <CheckOk size={40} className="text-emerald-200" />
          <p className="text-sm text-slate-400 font-semibold mt-3">All tasks completed!</p>
        </div>
      )}

      {/* Kanban Grid */}
      {tasks.length > 0 && (
        <div className="grid grid-cols-4 gap-4">
          {COLUMNS.map(col => {
            const colTasks = tasks.filter(t => t.folder === col.id)
            return (
              <div key={col.id} className={`border-2 ${col.border} ${col.bg} rounded-2xl p-3 min-h-[200px]`}>
                <div className={`flex items-center justify-between mb-3`}>
                  <h3 className={`text-sm font-semibold ${col.head}`}>{col.id} · {col.label}</h3>
                  {colTasks.length > 0 && (
                    <span className="text-xs bg-white/60 px-2 py-0.5 rounded-full">{colTasks.length}</span>
                  )}
                </div>

                {colTasks.length === 0 ? (
                  <div className="border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center h-20 opacity-30 text-xs text-center">
                    No tasks
                  </div>
                ) : (
                  <div className="space-y-2">
                    {colTasks.map(task => {
                      const assigneeName = NAME_MAP[task.assignee?.email] || task.assignee?.email || 'Unknown'
                      const canAct = canApproveTask(task)
                      const isAssigned = task.assignee_id === currentUser?.id

                      return (
                        <div key={task.id}
                          className={`bg-white border rounded-xl p-3 shadow-sm ${canAct ? 'border-indigo-300' : 'border-slate-200'}`}>
                          <p className="text-xs font-bold text-slate-900 mb-2">{task.document?.name}</p>
                          <div className="flex items-center gap-2 mb-2">
                            <Avatar name={assigneeName} size="sm" />
                            <span className="text-xs text-slate-500">{assigneeName.split(' ')[0]}</span>
                          </div>
                          <div className="flex items-center gap-2 mb-2">
                            <Badge label={task.priority} color={task.priority === 'High' ? 'rose' : task.priority === 'Medium' ? 'amber' : 'slate'} />
                            <span className="text-xs text-slate-400">{task.due_date}</span>
                          </div>

                          {canAct && (
                            <>
                              <p className="text-xs font-semibold text-indigo-600 flex items-center gap-1.5 mb-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                {isAssigned ? 'Assigned to you' : 'Admin access'}
                              </p>
                              <div className="flex gap-2">
                                <button onClick={() => handleApprove(task)}
                                  className="flex-1 flex items-center justify-center gap-1 h-7 rounded-md text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-white transition">
                                  <CheckOk size={12} /> Approve
                                </button>
                                <button onClick={() => handleReject(task)}
                                  className="flex-1 flex items-center justify-center gap-1 h-7 rounded-md text-xs font-semibold bg-rose-500 hover:bg-rose-600 text-white transition">
                                  <XClose size={12} /> Reject
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
