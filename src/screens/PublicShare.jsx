import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import useAppStore from '../store/useAppStore'
import { ID_NAME_MAP } from '../lib/roles'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/Toast'
import FileChip from '../components/FileChip'
import Badge from '../components/Badge'
import { Share, Download, Eye } from '../lib/icons'

export default function PublicShare() {
  const { token } = useParams()
  const setScreen = useAppStore(s => s.setScreen)
  const showToast = useToast()

  const [doc, setDoc] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => { setScreen('share') }, [setScreen])

  useEffect(() => {
    const fetchByToken = async () => {
      if (!token) { setLoading(false); return }
      setLoading(true)

      // Look up the share_token → document
      const { data: tokenRow, error: tokenErr } = await supabase
        .from('share_tokens')
        .select('*, document:document_id(*)')
        .eq('token', token)
        .single()

      if (tokenErr || !tokenRow?.document) {
        setError('Invalid or expired share link')
        setLoading(false)
        return
      }
      setDoc(tokenRow.document)
      setLoading(false)
    }
    fetchByToken()
  }, [token])

  const handlePreview = () => {
    if (doc?.file_path) {
      const { data } = supabase.storage.from('documents').getPublicUrl(doc.file_path)
      if (data?.publicUrl) {
        window.open(data.publicUrl, '_blank')
        return
      }
    }
    showToast('Preview: ' + (doc?.name || 'document'))
  }

  const handleDownload = () => {
    if (doc?.file_path) {
      const { data } = supabase.storage.from('documents').getPublicUrl(doc.file_path)
      if (data?.publicUrl) {
        const link = document.createElement('a')
        link.href = data.publicUrl
        link.download = doc.name
        link.target = '_blank'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        showToast('Downloading: ' + doc.name)
        return
      }
    }
    showToast('Downloading: ' + (doc?.name || 'document'))
  }

  if (loading) {
    return (
      <div className="p-6 flex justify-center animate-slide-in">
        <div className="w-full max-w-2xl h-64 bg-white rounded-2xl animate-pulse" />
      </div>
    )
  }

  if (error || !doc) {
    return (
      <div className="p-6 flex justify-center animate-slide-in">
        <div className="w-full max-w-2xl">
          <div className="bg-white rounded-2xl border border-slate-200 p-8">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Share size={44} className="text-slate-200" />
              <p className="text-sm font-semibold text-slate-500 mt-4">{error || 'Document not found'}</p>
              <p className="text-xs text-slate-400 mt-1">This share link may be invalid or expired.</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 flex justify-center animate-slide-in">
      <div className="w-full max-w-2xl">
        <div className="bg-white rounded-2xl border border-slate-200 p-8">
          {/* Public Header */}
          <div className="bg-slate-50 rounded-xl p-3 flex items-center gap-2 mb-6">
            <span className="text-sm font-bold text-slate-700">DocHub</span>
            <Share size={16} className="text-indigo-600" />
            <Badge label="Public Access" color="emerald" />
          </div>

          {/* Document info */}
          <div className="flex items-center gap-4 mb-6">
            <FileChip type={doc.type} />
            <div>
              <p className="text-lg font-semibold text-slate-900">{doc.name}</p>
              <p className="text-sm text-slate-400">
                Shared by {ID_NAME_MAP[doc.owner_id] || 'Unknown'} · {doc.size_label} · No login required
              </p>
            </div>
          </div>

          {/* Action buttons */}
          {doc.file_path ? (
            <div className="flex justify-center gap-3">
              <button onClick={handleDownload}
                className="flex items-center gap-1.5 px-6 py-2.5 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition">
                <Download size={16} /> Download File
              </button>
              <button onClick={handlePreview}
                className="flex items-center gap-1.5 px-6 py-2.5 rounded-lg text-sm font-medium border border-slate-200 text-slate-700 hover:bg-slate-50 transition">
                <Eye size={16} /> Full Preview
              </button>
            </div>
          ) : (
            <div className="bg-slate-50 rounded-xl p-4 text-center">
              <p className="text-sm text-slate-400">No file attached to this document</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
