import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import useAppStore from '../store/useAppStore'
import { NAME_MAP } from '../lib/roles'
import { useDocuments } from '../hooks/useDocuments'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/Toast'
import FileChip from '../components/FileChip'
import Badge from '../components/Badge'
import { Share, LinkChain, Download, Eye } from '../lib/icons'

export default function PublicShare() {
  const { siteId } = useParams()
  const currentUser = useAppStore(s => s.currentUser)
  const shareToken = useAppStore(s => s.shareToken)
  const setShareToken = useAppStore(s => s.setShareToken)
  const setScreen = useAppStore(s => s.setScreen)
  const showToast = useToast()

  const { data: docs, loading } = useDocuments(siteId)

  useEffect(() => { setScreen('share') }, [setScreen])

  const publishedDocs = docs.filter(d => d.folder === '04')
  const doc = publishedDocs[0]

  const generateToken = async () => {
    const token = Math.random().toString(36).substring(2, 10)
    await supabase.from('share_tokens').insert({
      document_id: doc.id,
      token,
      created_by: currentUser.id,
    })
    setShareToken(token)
    showToast('Share link generated!')
  }

  const shareUrl = `https://your-org.github.io/dochub-demo-v2/#/share/${shareToken}`

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl)
    showToast('Link copied to clipboard!')
  }

  if (loading) {
    return (
      <div className="p-6 flex justify-center animate-slide-in">
        <div className="w-full max-w-2xl h-64 bg-white rounded-2xl animate-pulse" />
      </div>
    )
  }

  return (
    <div className="p-6 flex justify-center animate-slide-in">
      <div className="w-full max-w-2xl">
        <div className="bg-white rounded-2xl border border-slate-200 p-8">
          {/* Path A: No published docs */}
          {publishedDocs.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Share size={44} className="text-slate-200" />
              <p className="text-sm font-semibold text-slate-300 mt-4">No published documents available</p>
              <p className="text-xs text-slate-400 mt-1">Complete the approval workflow to reach Folder 04 first</p>
            </div>
          )}

          {/* Path B: Doc available, no token */}
          {doc && !shareToken && (
            <>
              <h2 className="text-lg font-semibold text-slate-900 mb-1">Public Share</h2>
              <p className="text-sm text-slate-500 mb-6">Generate a secure link to share published documents externally</p>

              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-4 mb-6">
                <FileChip type={doc.type} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{doc.name}</p>
                  <p className="text-xs text-slate-500">
                    {NAME_MAP[doc.owner?.email] || 'Unknown'} · {doc.size_label} · {new Date(doc.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Badge label="Final-Approved" color="emerald" />
              </div>

              <button onClick={generateToken}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 shadow-sm transition">
                <LinkChain size={16} /> Generate Public Share Link
              </button>
            </>
          )}

          {/* Path C: Token generated */}
          {doc && shareToken && (
            <>
              <h2 className="text-lg font-semibold text-slate-900 mb-1">Public Share</h2>
              <p className="text-sm text-slate-500 mb-6">Your share link is ready</p>

              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-4 mb-4">
                <FileChip type={doc.type} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{doc.name}</p>
                  <p className="text-xs text-slate-500">
                    {NAME_MAP[doc.owner?.email] || 'Unknown'} · {doc.size_label}
                  </p>
                </div>
                <Badge label="Final-Approved" color="emerald" />
              </div>

              {/* Link Row */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center gap-3 mb-6">
                <LinkChain size={16} className="text-indigo-600 flex-shrink-0" />
                <span className="font-mono text-indigo-600 text-sm flex-1 truncate">{shareUrl}</span>
                <button onClick={copyLink}
                  className="bg-white border border-slate-200 text-slate-700 text-xs px-3 py-1.5 rounded-lg hover:bg-slate-50 transition flex-shrink-0">
                  Copy
                </button>
              </div>

              {/* Public View Preview Mockup */}
              <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6">
                <div className="bg-slate-50 rounded-xl p-3 flex items-center gap-2 mb-4">
                  <span className="text-sm font-bold text-slate-700">DocHub</span>
                  <Share size={16} className="text-indigo-600" />
                  <Badge label="Public Access" color="emerald" />
                </div>

                <div className="flex items-center gap-3 mb-4">
                  <FileChip type={doc.type} />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{doc.name}</p>
                    <p className="text-xs text-slate-400">
                      Shared by {NAME_MAP[doc.owner?.email] || 'Unknown'} · {new Date(doc.created_at).toLocaleDateString()} · No login required
                    </p>
                  </div>
                </div>

                <div className="bg-slate-100 rounded-xl h-28 flex items-center justify-center text-xs text-slate-400 mb-4">
                  Document Preview
                </div>

                <div className="flex justify-center gap-3">
                  <button onClick={() => showToast('Downloading ' + doc.name)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition">
                    <Download size={14} /> Download File
                  </button>
                  <button onClick={() => showToast('Full preview: ' + doc.name)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium border border-slate-200 text-slate-700 hover:bg-slate-50 transition">
                    <Eye size={14} /> Full Preview
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
