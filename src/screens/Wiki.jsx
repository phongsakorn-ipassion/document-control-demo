import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import useAppStore from '../store/useAppStore'
import { useWiki } from '../hooks/useWiki'
import { useToast } from '../components/Toast'
import { Plus, EditPen, SaveDisk, XClose } from '../lib/icons'

export default function Wiki() {
  const { siteId } = useParams()
  const activePageId = useAppStore(s => s.activePageId)
  const setActivePageId = useAppStore(s => s.setActivePageId)
  const wikiEditMode = useAppStore(s => s.wikiEditMode)
  const setWikiEditMode = useAppStore(s => s.setWikiEditMode)
  const setScreen = useAppStore(s => s.setScreen)
  const showToast = useToast()

  const { data: pages, loading, error, create, update, remove } = useWiki(siteId)
  const [editContent, setEditContent] = useState('')

  useEffect(() => { setScreen('wiki') }, [setScreen])

  // Auto-select first page on load
  useEffect(() => {
    if (pages.length > 0 && !activePageId) {
      setActivePageId(pages[0].id)
    }
  }, [pages, activePageId, setActivePageId])

  const activePage = pages.find(p => p.id === activePageId)

  useEffect(() => {
    if (activePage && wikiEditMode) {
      setEditContent(activePage.content || '')
    }
  }, [activePage, wikiEditMode])

  const handleCreate = async () => {
    const { data: row } = await create({ site_id: siteId, title: 'New Page', content: '' })
    if (row) {
      setActivePageId(row.id)
      setWikiEditMode(true)
    }
  }

  const handleSave = async () => {
    if (activePage) {
      await update(activePage.id, { content: editContent })
      setWikiEditMode(false)
      showToast('Page saved')
    }
  }

  const handleDelete = async (pageId) => {
    await remove(pageId)
    if (activePageId === pageId) {
      const remaining = pages.filter(p => p.id !== pageId)
      setActivePageId(remaining.length > 0 ? remaining[0].id : null)
    }
  }

  const formatButtons = ['Bold', 'Italic', 'H1', 'H2', 'H3', '• List', 'Image', 'Link', 'Divider']

  return (
    <div className="flex h-full">
      {/* Pane 1: Page List */}
      <div className="w-56 flex-shrink-0 bg-white border-r border-slate-200 p-4 overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] text-slate-400 uppercase tracking-wider">PAGES</p>
          <button onClick={handleCreate}
            className="text-indigo-600 hover:bg-slate-100 rounded p-1 transition">
            <Plus size={14} />
          </button>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1,2,3].map(i => <div key={i} className="h-8 bg-slate-100 rounded animate-pulse" />)}
          </div>
        ) : (
          <div className="space-y-0.5">
            {pages.map(page => (
              <div key={page.id} className="group flex items-center">
                <button onClick={() => setActivePageId(page.id)}
                  className={`flex-1 text-left px-3 py-2 rounded-lg text-sm truncate transition ${
                    activePageId === page.id
                      ? 'bg-indigo-50 text-indigo-700 font-medium'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}>
                  📄 {page.title}
                </button>
                <button onClick={() => handleDelete(page.id)}
                  className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-500 p-1 transition">
                  <XClose size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pane 2: Content */}
      <div className="flex-1 bg-white p-8 overflow-y-auto">
        {!activePage ? (
          <div className="flex items-center justify-center h-full text-sm text-slate-400">
            Select a page to view
          </div>
        ) : wikiEditMode ? (
          /* Edit Mode */
          <div className="animate-slide-in">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-xl font-bold text-slate-900">{activePage.title}</h1>
              <div className="flex gap-2">
                <button onClick={handleSave}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition">
                  <SaveDisk size={14} /> Save
                </button>
                <button onClick={() => setWikiEditMode(false)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-slate-200 text-slate-700 hover:bg-slate-50 transition">
                  Cancel
                </button>
              </div>
            </div>

            {/* Format Toolbar */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 flex flex-wrap gap-1 mb-3">
              {formatButtons.map(btn => (
                <button key={btn} onClick={() => showToast(`${btn} applied`)}
                  className="text-[10px] font-bold text-slate-600 px-2 py-1 rounded hover:bg-white hover:shadow-sm transition">
                  {btn}
                </button>
              ))}
            </div>

            <textarea
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
              className="w-full h-72 p-4 border border-slate-200 rounded-xl text-sm text-slate-700 leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
            />
          </div>
        ) : (
          /* View Mode */
          <div className="animate-slide-in">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-4">
              <h1 className="text-xl font-bold text-slate-900">{activePage.title}</h1>
              <button onClick={() => setWikiEditMode(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border border-slate-200 text-slate-700 hover:bg-slate-50 transition">
                <EditPen size={14} /> Edit
              </button>
            </div>
            <div
              dangerouslySetInnerHTML={{ __html: activePage.content }}
              className="text-sm text-slate-700 leading-relaxed prose"
            />
          </div>
        )}
      </div>
    </div>
  )
}
