import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import useAppStore from '../store/useAppStore'
import { supabase } from '../lib/supabase'
import { NAME_MAP } from '../lib/roles'
import { useDocuments } from '../hooks/useDocuments'
import { useToast } from '../components/Toast'
import FileChip from '../components/FileChip'
import Avatar from '../components/Avatar'
import Badge from '../components/Badge'
import { Folder, Upload, Plus, Eye, Download, XClose, ChevronRight } from '../lib/icons'

const FOLDERS = [
  { id: '01', label: 'Draft',        dot: 'bg-slate-400' },
  { id: '02', label: 'In Review',    dot: 'bg-amber-400' },
  { id: '03', label: 'Final Review', dot: 'bg-blue-400' },
  { id: '04', label: 'Published',    dot: 'bg-emerald-400' },
]

export default function DocumentLibrary() {
  const { siteId } = useParams()
  const selectedFolder = useAppStore(s => s.selectedFolder)
  const setSelectedFolder = useAppStore(s => s.setSelectedFolder)
  const previewDoc = useAppStore(s => s.previewDoc)
  const setPreviewDoc = useAppStore(s => s.setPreviewDoc)
  const setScreen = useAppStore(s => s.setScreen)
  const currentUser = useAppStore(s => s.currentUser)
  const showToast = useToast()

  const { data: docs, loading, error, update, refetch } = useDocuments(siteId)

  useEffect(() => { setScreen('documents') }, [setScreen])

  const filteredDocs = docs.filter(d => d.folder === selectedFolder)

  const handleWorkflow = async (doc) => {
    const nextFolder = doc.folder === '01' ? '02' : doc.folder === '02' ? '03' : '04'

    // Update document folder
    const docPatch = { folder: nextFolder }
    if (nextFolder === '04') docPatch.status = 'Final-Approved'
    await update(doc.id, docPatch)

    // Assign task for round 1 or round 2
    if (nextFolder === '02' || nextFolder === '03') {
      // Find the right assignee
      let assigneeEmail = nextFolder === '02' ? 'bob@demo.com' : 'cathy@demo.com'
      const { data: users } = await supabase.from('site_members').select('user:user_id(id, email)').eq('site_id', siteId)
      const assignee = users?.find(u => u.user?.email === assigneeEmail)

      if (assignee) {
        await supabase.from('tasks').insert({
          site_id: siteId,
          document_id: doc.id,
          assignee_id: assignee.user.id,
          folder: nextFolder,
          priority: 'High',
        })
      }
    }

    // Log activity
    await supabase.from('activities').insert({
      site_id: siteId,
      actor_id: currentUser.id,
      action: 'started workflow on',
      target: doc.name,
    })

    showToast('Workflow started — task assigned')
    refetch()
  }

  return (
    <div className="flex h-full">
      {/* Pane 1: Folder Tree */}
      <div className="w-52 flex-shrink-0 bg-white border-r border-slate-200 p-4 overflow-y-auto">
        <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-3">APPROVAL STAGES</p>
        <div className="space-y-1">
          {FOLDERS.map(f => {
            const count = docs.filter(d => d.folder === f.id).length
            const isActive = selectedFolder === f.id
            return (
              <button key={f.id} onClick={() => setSelectedFolder(f.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all ${
                  isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'
                }`}>
                <span className={`w-2 h-2 rounded-full ${f.dot} flex-shrink-0`} />
                <span className="flex-1 text-left">{f.id} · {f.label}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  isActive ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'
                }`}>{count}</span>
              </button>
            )
          })}
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mt-4 text-xs text-slate-500">
          Documents flow 01→02→03→04 through the approval workflow.
        </div>
      </div>

      {/* Pane 2: File List */}
      <div className="flex-1 p-5 overflow-y-auto bg-slate-50">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              {FOLDERS.find(f => f.id === selectedFolder)?.label}
            </h2>
            <p className="text-xs text-slate-400">{filteredDocs.length} document(s)</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => showToast('File upload dialog — drag & drop supported')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition">
              <Upload size={14} /> Upload
            </button>
            <button onClick={() => showToast('Create document form would open here')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 text-slate-700 hover:bg-slate-50 transition">
              <Plus size={14} /> New
            </button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-20 bg-white rounded-xl animate-pulse" />)}
          </div>
        ) : error ? (
          <div className="bg-rose-50 border border-rose-200 text-rose-600 rounded-xl p-4 text-sm">{error.message}</div>
        ) : filteredDocs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Folder size={48} className="text-slate-300" />
            <p className="text-sm text-slate-400 mt-3">No documents in this stage</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredDocs.map(doc => {
              const isSelected = previewDoc?.id === doc.id
              const ownerName = NAME_MAP[doc.owner?.email] || doc.owner?.email || 'Unknown'
              return (
                <div key={doc.id}
                  onClick={() => setPreviewDoc(isSelected ? null : doc)}
                  className={`bg-white border rounded-xl p-4 flex items-center gap-4 cursor-pointer transition-all duration-150 ${
                    isSelected ? 'border-indigo-300 ring-1 ring-indigo-200' : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
                  }`}>
                  <FileChip type={doc.type} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{doc.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{ownerName} · {doc.size_label}</p>
                  </div>
                  {doc.status && <Badge label={doc.status} color="emerald" />}
                  {['01','02','03'].includes(doc.folder) && (
                    <button onClick={(e) => { e.stopPropagation(); handleWorkflow(doc) }}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition">
                      ▶ Workflow
                    </button>
                  )}
                  {doc.folder === '04' && (
                    <button onClick={(e) => { e.stopPropagation(); showToast('Share link generation — see Public Share screen') }}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition">
                      Share
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Pane 3: Preview Drawer */}
      {previewDoc && (
        <div className="w-72 flex-shrink-0 bg-white border-l border-slate-200 p-5 overflow-y-auto flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-900">Preview</h3>
            <button onClick={() => setPreviewDoc(null)} className="text-slate-400 hover:text-slate-600">
              <XClose size={16} />
            </button>
          </div>

          <div className="flex flex-col items-center text-center mb-6">
            <FileChip type={previewDoc.type} />
            <p className="text-sm font-semibold text-slate-900 mt-3">{previewDoc.name}</p>
            {previewDoc.status && <Badge label={previewDoc.status} color="emerald" />}
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">Owner</span>
              <span className="text-slate-700">{NAME_MAP[previewDoc.owner?.email] || 'Unknown'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Size</span>
              <span className="text-slate-700">{previewDoc.size_label}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Stage</span>
              <span className="text-slate-700">{FOLDERS.find(f => f.id === previewDoc.folder)?.label}</span>
            </div>
          </div>

          <div className="mt-auto pt-4 flex gap-2">
            <button onClick={() => showToast('Preview: ' + previewDoc.name)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium border border-slate-200 text-slate-700 hover:bg-slate-50 transition">
              <Eye size={14} /> Preview
            </button>
            <button onClick={() => showToast('Downloading ' + previewDoc.name)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition">
              <Download size={14} /> Download
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
