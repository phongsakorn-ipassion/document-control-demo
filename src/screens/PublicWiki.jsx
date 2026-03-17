import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { ID_NAME_MAP } from '../lib/roles'
import Badge from '../components/Badge'
import { Globe, WikiDoc } from '../lib/icons'

function convertOembedToIframe(html) {
  if (!html) return html
  return html.replace(
    /<oembed\s+url="([^"]+)"[^>]*><\/oembed>/g,
    (_, url) => {
      let src = url
      const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/)
      if (ytMatch) src = `https://www.youtube.com/embed/${ytMatch[1]}`
      const vmMatch = url.match(/vimeo\.com\/(\d+)/)
      if (vmMatch) src = `https://player.vimeo.com/video/${vmMatch[1]}`
      return `<div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;max-width:100%;border-radius:8px;margin:1rem 0"><iframe src="${src}" style="position:absolute;top:0;left:0;width:100%;height:100%;border:0" allowfullscreen></iframe></div>`
    }
  )
}

export default function PublicWiki() {
  const { token } = useParams()
  const [page, setPage] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchByToken = async () => {
      if (!token) { setLoading(false); return }
      setLoading(true)

      const { data: tokenRow, error: tokenErr } = await supabase
        .from('wiki_share_tokens')
        .select('*, page:page_id(*)')
        .eq('token', token)
        .single()

      if (tokenErr || !tokenRow?.page) {
        setError('Invalid or expired article link')
        setLoading(false)
        return
      }

      if (tokenRow.active === false) {
        setError('Invalid or expired article link')
        setLoading(false)
        return
      }

      setPage(tokenRow.page)
      setLoading(false)
    }
    fetchByToken()
  }, [token])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 flex justify-center animate-slide-in">
        <div className="w-full max-w-3xl h-64 bg-white rounded-2xl animate-pulse" />
      </div>
    )
  }

  if (error || !page) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 flex justify-center animate-slide-in">
        <div className="w-full max-w-3xl">
          <div className="bg-white rounded-2xl border border-slate-200 p-8">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <WikiDoc size={44} className="text-slate-200" />
              <p className="text-sm font-semibold text-slate-500 mt-4">{error || 'Article not found'}</p>
              <p className="text-xs text-slate-400 mt-1">This article link may be invalid or expired.</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 flex justify-center animate-slide-in">
      <div className="w-full max-w-3xl">
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          {/* Header */}
          <div className="bg-slate-50 border-b border-slate-200 px-8 py-4 flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <WikiDoc size={16} className="text-white" />
            </div>
            <span className="text-sm font-bold text-slate-700">DocHub</span>
            <Globe size={16} className="text-emerald-500" />
            <Badge label="Public Article" color="emerald" />
          </div>

          {/* Article */}
          <div className="px-8 py-8">
            <h1 className="text-2xl font-bold text-slate-900 mb-2">{page.title}</h1>
            {page.owner_id && (
              <p className="text-sm text-slate-400 mb-6">
                By {ID_NAME_MAP[page.owner_id] || 'Unknown'}
              </p>
            )}
            <div className="border-t border-slate-100 pt-6">
              {page.content ? (
                <div
                  dangerouslySetInnerHTML={{ __html: convertOembedToIframe(page.content) }}
                  className="text-sm text-slate-700 leading-relaxed prose max-w-none"
                />
              ) : (
                <p className="text-sm text-slate-400">This article has no content.</p>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="bg-slate-50 border-t border-slate-200 px-8 py-3 text-center">
            <p className="text-xs text-slate-400">Shared via DocHub · Document Intelligence Platform</p>
          </div>
        </div>
      </div>
    </div>
  )
}
