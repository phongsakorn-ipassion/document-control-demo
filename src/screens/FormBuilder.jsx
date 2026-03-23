import { useEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useParams } from 'react-router-dom'
import useAppStore from '../store/useAppStore'
import { supabase } from '../lib/supabase'
import { ID_NAME_MAP, ROLES } from '../lib/roles'
import { useFormBuilder } from '../hooks/useFormBuilder'
import { getStageStyles } from '../hooks/useWorkflowConfig'
import { useActivities } from '../hooks/useActivities'
import { useInfiniteScroll } from '../hooks/useInfiniteScroll'
import { useToast } from '../components/Toast'
import { fetchRevisionHistory } from '../lib/revisionHelper'
import Avatar from '../components/Avatar'
import Badge from '../components/Badge'
import { Plus, EditPen, XClose, Share, CheckOk, LinkChain, Globe, FormIcon, Send, RotateCcw, EyeOff, SaveDisk, Download, Eye } from '../lib/icons'

const FIELD_TYPE_ICONS = {
  text: '\u{1F4DD}',
  textarea: '\u{1F4C4}',
  number: '\u{1F522}',
  email: '\u{1F4E7}',
  date: '\u{1F4C5}',
  dropdown: '\u{1F4CB}',
  radio: '\u2B55',
  checkbox: '\u2611\uFE0F',
  section: '\u2500\u2500\u2500',
}

const FIELD_TYPES = ['text', 'textarea', 'number', 'email', 'date', 'dropdown', 'radio', 'checkbox', 'section']

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

/* ─── Modals ─── */

function NewFormModal({ onConfirm, onClose }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)
  const handle = async () => { setBusy(true); await onConfirm({ title, description }); setBusy(false) }
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-slide-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900">New Form</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><XClose size={18} /></button>
        </div>
        <div className="space-y-3 mb-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Form title..."
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Optional description..."
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none" />
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50">Cancel</button>
          <button onClick={handle} disabled={busy || !title.trim()}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60">
            {busy ? 'Creating...' : <><Plus size={12} /> Create</>}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

function SubmitModal({ form, nextStageName, onConfirm, onClose }) {
  const [busy, setBusy] = useState(false)
  const [comment, setComment] = useState('')
  const handle = async () => { setBusy(true); await onConfirm(comment); setBusy(false) }
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-slide-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900">Submit for Review</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><XClose size={18} /></button>
        </div>
        <p className="text-sm text-slate-600 mb-1">Submit <strong>"{form.title}"</strong> for review?</p>
        <p className="text-xs text-slate-400 mb-4">It will move to {nextStageName || 'the next review stage'}.</p>
        <textarea value={comment} onChange={e => setComment(e.target.value)} rows={2} placeholder="Optional comment..."
          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 resize-none mb-4" />
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50">Cancel</button>
          <button onClick={handle} disabled={busy}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60">
            {busy ? 'Submitting...' : <><Send size={12} /> Submit</>}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

function ApproveModal({ form, nextStageName, onConfirm, onClose, isPublishing }) {
  const [busy, setBusy] = useState(false)
  const [comment, setComment] = useState('')
  const handle = async () => { setBusy(true); await onConfirm(comment); setBusy(false) }
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-slide-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900">Approve Form</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><XClose size={18} /></button>
        </div>
        <p className="text-sm text-slate-600 mb-1">Approve <strong>"{form.title}"</strong>?</p>
        <p className="text-xs text-slate-400 mb-4">It will move to {nextStageName || 'the next stage'}.</p>
        {isPublishing && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 mb-4 flex items-center gap-2">
            <span className="text-xs text-emerald-700 font-medium">Published Date:</span>
            <span className="text-xs text-emerald-600">{new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        )}
        <textarea value={comment} onChange={e => setComment(e.target.value)} rows={2}
          placeholder="Optional comment for the next reviewer..."
          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 resize-none mb-4" />
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50">Cancel</button>
          <button onClick={handle} disabled={busy}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60">
            {busy ? 'Approving...' : <><CheckOk size={12} /> Approve</>}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

function RejectModal({ form, prevStageName, onConfirm, onClose }) {
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const handle = async () => { setBusy(true); await onConfirm(reason); setBusy(false) }
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-slide-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900">Reject Form</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><XClose size={18} /></button>
        </div>
        <p className="text-sm text-slate-600 mb-3">Reject <strong>"{form.title}"</strong>? It will move back to {prevStageName || 'the previous stage'}.</p>
        <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3} placeholder="Reason for rejection..."
          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 resize-none mb-4" />
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50">Cancel</button>
          <button onClick={handle} disabled={busy || !reason.trim()}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-60">
            {busy ? 'Rejecting...' : <><XClose size={12} /> Reject</>}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

function UnpublishModal({ form, onConfirm, onClose }) {
  const [busy, setBusy] = useState(false)
  const handle = async () => { setBusy(true); await onConfirm(); setBusy(false) }
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-slide-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900">Unpublish Form</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><XClose size={18} /></button>
        </div>
        <p className="text-sm text-slate-600 mb-1">Unpublish <strong>"{form.title}"</strong>?</p>
        <p className="text-xs text-slate-400 mb-5">The public form link will stop working. The form will move back to Draft.</p>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50">Cancel</button>
          <button onClick={handle} disabled={busy}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-semibold text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-60">
            {busy ? 'Unpublishing...' : <><EyeOff size={12} /> Unpublish</>}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

function FormShareModal({ form, siteId, currentUser, onClose, onShareCreated }) {
  const showToast = useToast()
  const [tokenRow, setTokenRow] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const { data: existing } = await supabase
        .from('form_share_tokens').select('*').eq('form_id', form.id).limit(1).single()
      if (existing) {
        setTokenRow(existing)
      } else {
        const token = crypto.randomUUID().replace(/-/g, '').slice(0, 12)
        const { data: row } = await supabase
          .from('form_share_tokens')
          .insert({ form_id: form.id, token, created_by: currentUser?.id })
          .select().single()
        if (row) {
          setTokenRow(row)
          onShareCreated?.(form.id)
          await supabase.from('activities').insert({
            site_id: siteId, actor_id: currentUser?.id,
            action: 'shared form', target: form.title,
          })
        }
      }
      setLoading(false)
    }
    load()
  }, [form.id, currentUser?.id, siteId, form.title])

  const shareUrl = tokenRow ? `${window.location.origin}${window.location.pathname}#/form/${tokenRow.token}` : ''

  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(shareUrl); showToast('Link copied!') }
    catch { showToast('Link copied!') }
  }

  const handleToggle = async () => {
    if (!tokenRow) return
    const newActive = !tokenRow.active
    await supabase.from('form_share_tokens').update({ active: newActive }).eq('id', tokenRow.id)
    setTokenRow({ ...tokenRow, active: newActive })
    await supabase.from('activities').insert({
      site_id: siteId, actor_id: currentUser?.id,
      action: newActive ? 'enabled form share link' : 'disabled form share link',
      target: form.title,
    })
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-slide-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-slate-900">Share Form</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><XClose size={18} /></button>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-emerald-100 border border-emerald-200 flex items-center justify-center">
            <Globe size={18} className="text-emerald-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">{form.title}</p>
            <p className="text-xs text-emerald-600">Published Form</p>
          </div>
        </div>
        {loading ? (
          <div className="h-20 bg-slate-100 rounded-xl animate-pulse" />
        ) : tokenRow ? (
          <>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center gap-2 mb-3">
              <LinkChain size={14} className="text-slate-400 flex-shrink-0" />
              <p className="text-xs font-mono text-slate-600 truncate flex-1">{shareUrl}</p>
              <button onClick={handleCopy}
                className="px-2.5 py-1 rounded-lg text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-700 flex-shrink-0">Copy</button>
            </div>
            <div className="flex items-center justify-between py-3 border-t border-slate-100">
              <div>
                <p className="text-sm font-medium text-slate-700">Public access</p>
                <p className="text-xs text-slate-400">{tokenRow.active ? 'Anyone with this link can submit' : 'Link is disabled'}</p>
              </div>
              <button onClick={handleToggle}
                className={`relative w-11 h-6 rounded-full transition-colors ${tokenRow.active ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${tokenRow.active ? 'left-[22px]' : 'left-0.5'}`} />
              </button>
            </div>
            <div className={`flex items-center gap-2 mt-2 px-3 py-2 rounded-lg text-xs ${tokenRow.active ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
              <CheckOk size={14} />
              <span>{tokenRow.active ? 'Public access is enabled' : 'Public access is disabled'}</span>
            </div>
          </>
        ) : null}
        <div className="flex justify-end mt-5">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50">Close</button>
        </div>
      </div>
    </div>,
    document.body
  )
}

/* ─── Main FormBuilder Screen ─── */

export default function FormBuilder() {
  const { siteId } = useParams()
  const setScreen = useAppStore(s => s.setScreen)
  const currentUser = useAppStore(s => s.currentUser)
  const showToast = useToast()

  const { data: forms, stages: wfStages, loading, create, update, remove,
          submit, approve, reject, publish, unpublish,
          draftCode, pubCode, refetch } = useFormBuilder(siteId)

  // Build dynamic stage folders from workflow config
  const FORM_STAGES = wfStages.map((s, i) => ({
    id: s.stage_code,
    label: s.stage_name,
    orderNum: i + 1,
    dot: getStageStyles(s.color).dot,
    stageType: s.stage_type,
    assigneeId: s.assignee_id,
  }))

  // RBAC
  const userRole = currentUser?.email ? ROLES[currentUser.email] : null
  const isAdmin = userRole?.canApproveFolder === null
  const isViewer = userRole?.role === 'Viewer'
  const canApproveForm = (form) => {
    if (isAdmin) return true
    const stage = wfStages.find(s => s.stage_code === (form?.status || draftCode))
    return stage?.assignee_id === currentUser?.id
  }

  const [selectedStage, setSelectedStage] = useState(draftCode || '01')
  const [selectedFormId, setSelectedFormId] = useState(null)
  const [editMode, setEditMode] = useState(false)

  // Edit state
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editFields, setEditFields] = useState([])

  // Add field inline row
  const [addingField, setAddingField] = useState(false)
  const [newFieldLabel, setNewFieldLabel] = useState('')
  const [newFieldType, setNewFieldType] = useState('text')
  const [newFieldRequired, setNewFieldRequired] = useState(false)
  const [newFieldOptions, setNewFieldOptions] = useState('')

  // Share status cache for Published forms
  const [shareStatusMap, setShareStatusMap] = useState({})
  const [shareRefreshTick, setShareRefreshTick] = useState(0)

  // Published share filter
  const [publishedFilter, setPublishedFilter] = useState('all')

  // Submissions
  const [submissions, setSubmissions] = useState([])
  const [submissionsLoading, setSubmissionsLoading] = useState(false)
  const [showSubmissions, setShowSubmissions] = useState(true)
  const [viewSubmission, setViewSubmission] = useState(null)  // submission detail view

  // Modals
  const [showNewForm, setShowNewForm] = useState(false)
  const [showSubmit, setShowSubmit] = useState(null)
  const [showApprove, setShowApprove] = useState(null)
  const [showReject, setShowReject] = useState(null)
  const [showUnpublish, setShowUnpublish] = useState(null)
  const [showShare, setShowShare] = useState(null)
  const [revHistory, setRevHistory] = useState([])
  useEffect(() => {
    if (!selectedFormId) { setRevHistory([]); return }
    fetchRevisionHistory(selectedFormId).then(setRevHistory)
  }, [selectedFormId])

  useEffect(() => { setScreen('formbuilder') }, [setScreen])

  // Update selectedStage when draftCode loads
  useEffect(() => {
    if (draftCode && selectedStage === '01' && draftCode !== '01') {
      setSelectedStage(draftCode)
    }
  }, [draftCode])

  // Fetch share status for published forms
  useEffect(() => {
    if (selectedStage !== pubCode) return
    const fetchShareStatus = async () => {
      const publishedIds = forms.filter(f => (f.status || draftCode) === pubCode).map(f => f.id)
      if (publishedIds.length === 0) { setShareStatusMap({}); return }
      const { data: tokens } = await supabase.from('form_share_tokens').select('form_id, active').in('form_id', publishedIds)
      const map = {}
      ;(tokens || []).forEach(t => { if (t.active) map[t.form_id] = true })
      setShareStatusMap(map)
    }
    fetchShareStatus()
  }, [selectedStage, forms, shareRefreshTick, pubCode, draftCode])

  // Fetch submissions when viewing a published form
  useEffect(() => {
    if (!selectedFormId || selectedStage !== pubCode || !showSubmissions) { setSubmissions([]); return }
    const fetchSubs = async () => {
      setSubmissionsLoading(true)
      const { data: rows } = await supabase
        .from('form_submissions')
        .select('*')
        .eq('form_id', selectedFormId)
        .order('submitted_at', { ascending: false })
      setSubmissions(rows || [])
      setSubmissionsLoading(false)
    }
    fetchSubs()
  }, [selectedFormId, selectedStage, pubCode, showSubmissions])

  const selectedForm = forms.find(f => f.id === selectedFormId)
  const stageForms = forms.filter(f => (f.status || draftCode) === selectedStage)
  const filteredForms = selectedStage === pubCode && publishedFilter !== 'all'
    ? stageForms.filter(f => publishedFilter === 'shared' ? shareStatusMap[f.id] : !shareStatusMap[f.id])
    : stageForms

  // Activity for detail panel
  const activities = useActivities(siteId, { filterTarget: selectedForm?.title })
  const actSentinelRef = useInfiniteScroll(activities.loadMore, { enabled: activities.hasMore && !activities.loadingMore })

  // Stage helpers
  const getFormStage = (form) => wfStages.find(s => s.stage_code === (form?.status || draftCode))
  const getNextStageName = (code) => {
    const cur = wfStages.find(s => s.stage_code === code)
    const next = cur ? wfStages.find(s => s.stage_order === cur.stage_order + 1) : null
    return next?.stage_name || 'next stage'
  }
  const getPrevStageName = (code) => {
    const cur = wfStages.find(s => s.stage_code === code)
    const prev = cur ? wfStages.find(s => s.stage_order === cur.stage_order - 1) : null
    return prev?.stage_name || 'previous stage'
  }

  const hasReviewStages = wfStages.filter(s => s.stage_type === 'review').length > 0

  /* ── Handlers ── */

  const handleCreate = async ({ title, description }) => {
    const { data: row } = await create({ title, description, fields: [] })
    if (row) {
      setSelectedFormId(row.id)
      setEditTitle(title)
      setEditDescription(description)
      setEditFields([])
      setEditMode(true)
      setSelectedStage(draftCode)
    }
    setShowNewForm(false)
    showToast('Form created')
  }

  const enterEdit = (form) => {
    setEditTitle(form.title || '')
    setEditDescription(form.description || '')
    setEditFields(form.fields || [])
    setEditMode(true)
    setAddingField(false)
  }

  const handleSave = async () => {
    if (!selectedForm) return
    await update(selectedForm.id, { title: editTitle, description: editDescription, fields: editFields })
    setEditMode(false)
    showToast('Form saved')
    setTimeout(() => activities.refetch?.(), 600)
  }

  const handleAddField = () => {
    if (!newFieldLabel.trim()) return
    const needsOptions = ['dropdown', 'radio', 'checkbox'].includes(newFieldType)
    const field = {
      id: `f${Date.now()}`,
      type: newFieldType,
      label: newFieldLabel.trim(),
      required: newFieldRequired,
      placeholder: '',
      options: needsOptions ? newFieldOptions.split(',').map(o => o.trim()).filter(Boolean) : [],
    }
    setEditFields(prev => [...prev, field])
    setNewFieldLabel('')
    setNewFieldType('text')
    setNewFieldRequired(false)
    setNewFieldOptions('')
    setAddingField(false)
  }

  const handleRemoveField = (fieldId) => {
    setEditFields(prev => prev.filter(f => f.id !== fieldId))
  }

  const handleSubmitConfirm = async (comment) => {
    if (!showSubmit) return
    if (editMode) {
      await update(showSubmit.id, { title: editTitle, description: editDescription, fields: editFields })
    }
    await submit(showSubmit.id, editTitle || showSubmit.title)
    if (comment && comment.trim()) {
      await supabase.from('activities').insert({ site_id: siteId, actor_id: currentUser?.id, action: `commented: "${comment}" on`, target: editTitle || showSubmit.title })
    }
    setEditMode(false)
    setShowSubmit(null)
    const firstReview = wfStages.find(s => s.stage_type === 'review')
    if (firstReview) setSelectedStage(firstReview.stage_code)
    showToast('Form submitted for review!')
    setTimeout(() => activities.refetch?.(), 600)
  }

  const handlePublish = async (comment) => {
    if (!showSubmit) return
    if (editMode) {
      await update(showSubmit.id, { title: editTitle, description: editDescription, fields: editFields })
    }
    await publish(showSubmit.id, editTitle || showSubmit.title)
    if (comment && comment.trim()) {
      await supabase.from('activities').insert({ site_id: siteId, actor_id: currentUser?.id, action: `commented: "${comment}" on`, target: editTitle || showSubmit.title })
    }
    setEditMode(false)
    setShowSubmit(null)
    setSelectedStage(pubCode)
    showToast('Form published!')
    setTimeout(() => activities.refetch?.(), 600)
  }

  const handleApproveConfirm = async (comment) => {
    if (!showApprove) return
    const currentCode = showApprove.status || draftCode
    await approve(showApprove.id, showApprove.title, currentCode)
    if (comment && comment.trim()) {
      await supabase.from('activities').insert({ site_id: siteId, actor_id: currentUser?.id, action: `commented: "${comment}" on`, target: showApprove.title })
    }
    setShowApprove(null)
    showToast('Form approved!')
    setTimeout(() => activities.refetch?.(), 600)
  }

  const handleRejectConfirm = async (reason) => {
    if (!showReject) return
    const currentCode = showReject.status || draftCode
    await reject(showReject.id, showReject.title, currentCode, reason)
    setShowReject(null)
    showToast('Form rejected')
    setTimeout(() => activities.refetch?.(), 600)
  }

  const handleUnpublish = async () => {
    if (!showUnpublish) return
    await unpublish(showUnpublish.id, showUnpublish.title)
    setShowUnpublish(null)
    setSelectedStage(draftCode)
    showToast('Form unpublished')
    setTimeout(() => activities.refetch?.(), 600)
  }

  const handleExportCSV = () => {
    if (!selectedForm || submissions.length === 0) return
    const fields = selectedForm.fields || []
    const headers = ['#', ...fields.map(f => f.label), 'Submitter', 'Submitted']
    const rows = submissions.map((sub, i) => {
      const answers = sub.data || {}
      return [
        i + 1,
        ...fields.map(f => {
          const val = answers[f.id]
          return Array.isArray(val) ? val.join('; ') : val ?? ''
        }),
        sub.submitter_name || sub.submitter_email || 'Anonymous',
        sub.created_at ? new Date(sub.created_at).toLocaleString() : '',
      ]
    })
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${selectedForm.title.replace(/\s+/g, '_')}_submissions.csv`
    a.click()
    URL.revokeObjectURL(url)
    showToast('CSV exported!')
  }

  const currentStageObj = FORM_STAGES.find(s => s.id === selectedStage)
  const stageLabel = currentStageObj?.label || 'Draft'

  /* ── Field preview renderer ── */
  const renderFieldPreview = (field) => {
    switch (field.type) {
      case 'section':
        return <div className="border-b-2 border-slate-300 pb-1 mt-2"><p className="text-sm font-semibold text-slate-700">{field.label}</p></div>
      case 'textarea':
        return (
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">{field.label}{field.required && <span className="text-rose-500 ml-0.5">*</span>}</label>
            <textarea disabled rows={2} placeholder={field.placeholder || field.label} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-400" />
          </div>
        )
      case 'dropdown':
        return (
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">{field.label}{field.required && <span className="text-rose-500 ml-0.5">*</span>}</label>
            <select disabled className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-400">
              <option>Select...</option>
              {(field.options || []).map((o, i) => <option key={i}>{o}</option>)}
            </select>
          </div>
        )
      case 'radio':
        return (
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">{field.label}{field.required && <span className="text-rose-500 ml-0.5">*</span>}</label>
            <div className="space-y-1">
              {(field.options || []).map((o, i) => (
                <label key={i} className="flex items-center gap-2 text-sm text-slate-500">
                  <input type="radio" disabled name={field.id} className="accent-indigo-600" /> {o}
                </label>
              ))}
            </div>
          </div>
        )
      case 'checkbox':
        return (
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">{field.label}{field.required && <span className="text-rose-500 ml-0.5">*</span>}</label>
            <div className="space-y-1">
              {(field.options || []).map((o, i) => (
                <label key={i} className="flex items-center gap-2 text-sm text-slate-500">
                  <input type="checkbox" disabled className="accent-indigo-600" /> {o}
                </label>
              ))}
            </div>
          </div>
        )
      default:
        return (
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">{field.label}{field.required && <span className="text-rose-500 ml-0.5">*</span>}</label>
            <input disabled type={field.type === 'email' ? 'email' : field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
              placeholder={field.placeholder || field.label}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-400" />
          </div>
        )
    }
  }

  return (
    <div className="flex h-full">
      {/* ─── Pane 1: Stage Sidebar ─── */}
      <div className="w-52 flex-shrink-0 bg-white border-r border-slate-200 p-4 overflow-y-auto">
        <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-3">
          FORMS <span className="ml-1 text-slate-300">({forms.filter(f => (f.status || draftCode) !== '00').length})</span>
        </p>
        <div className="space-y-1">
          {FORM_STAGES.map(s => {
            const count = forms.filter(f => (f.status || draftCode) === s.id).length
            const isActive = selectedStage === s.id
            return (
              <button key={s.id} onClick={() => { setSelectedStage(s.id); setEditMode(false); setSelectedFormId(null); setShowSubmissions(true); setViewSubmission(null) }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all ${
                  isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'
                }`}>
                <span className={`w-2 h-2 rounded-full ${s.dot} flex-shrink-0`} />
                <span className="flex-1 text-left">{String(s.orderNum).padStart(2, '0')} {'\u00B7'} {s.label}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  isActive ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'
                }`}>{count}</span>
              </button>
            )
          })}
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mt-4 text-xs text-slate-500">
          Forms flow through the pipeline: Draft {'\u2192'} Review {'\u2192'} Published.
        </div>
      </div>

      {/* ─── Pane 2: Form List / Editor ─── */}
      <div className="flex-1 p-5 overflow-y-auto bg-slate-50">
        {editMode && selectedForm ? (
          /* ─── Field Builder View ─── */
          <div className="animate-slide-in">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-900">Edit Form</h2>
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={handleSave}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition">
                  <SaveDisk size={12} /> Save
                </button>
                {!isViewer && isAdmin && (
                  <button onClick={() => setShowSubmit(selectedForm)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition">
                    <Send size={12} /> {hasReviewStages ? 'Submit' : 'Publish'}
                  </button>
                )}
                <button onClick={() => setEditMode(false)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 transition">
                  <XClose size={12} /> Cancel
                </button>
              </div>
            </div>

            {/* Title + Description */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Form Title</label>
                <input value={editTitle} onChange={e => setEditTitle(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  placeholder="Form title..." />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
                <textarea value={editDescription} onChange={e => setEditDescription(e.target.value)} rows={2}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
                  placeholder="Optional description..." />
              </div>
            </div>

            {/* Fields list */}
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <p className="text-xs font-semibold text-slate-700 mb-3">Fields ({editFields.length})</p>
              {editFields.length === 0 && !addingField && (
                <p className="text-xs text-slate-400 mb-3">No fields yet. Add your first field below.</p>
              )}
              <div className="space-y-2 mb-3">
                {editFields.map((field, idx) => (
                  <div key={field.id} className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                    <span className="text-slate-400 cursor-grab text-sm select-none">{'\u22EE'}</span>
                    <span className="text-sm">{FIELD_TYPE_ICONS[field.type] || '\u{1F4DD}'}</span>
                    <span className="flex-1 text-sm text-slate-700 font-medium truncate">{field.label}</span>
                    <Badge label={field.type} color="slate" />
                    {field.required && <Badge label="required" color="rose" />}
                    <button onClick={() => handleRemoveField(field.id)}
                      className="text-slate-400 hover:text-rose-500 transition">
                      <XClose size={14} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add field inline */}
              {addingField ? (
                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 space-y-2">
                  <div className="flex gap-2">
                    <input value={newFieldLabel} onChange={e => setNewFieldLabel(e.target.value)}
                      placeholder="Field label..."
                      className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                    <select value={newFieldType} onChange={e => setNewFieldType(e.target.value)}
                      className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                      {FIELD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <label className="flex items-center gap-1.5 text-xs text-slate-600">
                      <input type="checkbox" checked={newFieldRequired} onChange={e => setNewFieldRequired(e.target.checked)} className="accent-indigo-600" />
                      Required
                    </label>
                  </div>
                  {['dropdown', 'radio', 'checkbox'].includes(newFieldType) && (
                    <textarea value={newFieldOptions} onChange={e => setNewFieldOptions(e.target.value)} rows={2}
                      placeholder="Options (comma-separated, e.g. Option A, Option B, Option C)"
                      className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none" />
                  )}
                  <div className="flex gap-2">
                    <button onClick={handleAddField} disabled={!newFieldLabel.trim()}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60 transition">
                      <Plus size={12} /> Add
                    </button>
                    <button onClick={() => setAddingField(false)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 transition">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setAddingField(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200 transition w-full justify-center">
                  <Plus size={14} /> Add Field
                </button>
              )}
            </div>
          </div>
        ) : (
          /* ─── Form List View ─── */
          <div className="animate-slide-in">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">{stageLabel}</h2>
                <p className="text-xs text-slate-400">{filteredForms.length} form(s)</p>
              </div>
              {selectedStage === draftCode && !isViewer && (
                <button onClick={() => setShowNewForm(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition">
                  <Plus size={14} /> New
                </button>
              )}
            </div>
            {selectedStage === pubCode && (
              <div className="flex bg-white rounded-lg border border-slate-200 p-0.5 mb-4 w-fit ml-auto">
                {[
                  { key: 'all', label: 'All' },
                  { key: 'shared', label: 'Shared' },
                  { key: 'not_shared', label: 'Not Shared' },
                ].map(f => (
                  <button key={f.key} onClick={() => setPublishedFilter(f.key)}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition ${
                      publishedFilter === f.key
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                    }`}>
                    {f.label}
                  </button>
                ))}
              </div>
            )}

            {loading ? (
              <div className="space-y-3">
                {[1,2,3].map(i => <div key={i} className="h-20 bg-white rounded-xl animate-pulse" />)}
              </div>
            ) : filteredForms.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <FormIcon size={36} className="text-slate-200 mb-3" />
                <p className="text-sm text-slate-500 font-medium">No forms in {stageLabel}</p>
                {selectedStage === draftCode && !isViewer && (
                  <p className="text-xs text-slate-400 mt-1">Click "+ New" to create a form</p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredForms.map(form => {
                  const status = form.status || draftCode
                  const isSelected = selectedFormId === form.id
                  const formStage = getFormStage(form)
                  const isDraft = formStage?.stage_type === 'draft'
                  const isPublished = formStage?.stage_type === 'published'
                  const isReview = formStage?.stage_type === 'review'
                  const stageBadgeColor = isPublished ? 'emerald' : isReview ? 'amber' : 'slate'
                  const stageName = FORM_STAGES.find(s => s.id === status)?.label || 'Draft'
                  const fieldCount = (form.fields || []).length

                  return (
                    <div key={form.id}
                      onClick={() => { setSelectedFormId(form.id); setShowSubmissions(true); setViewSubmission(null) }}
                      className={`bg-white border rounded-xl p-4 flex items-center gap-4 cursor-pointer transition-all duration-150 ${
                        isSelected
                          ? 'border-indigo-300 ring-1 ring-indigo-200'
                          : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
                      }`}>
                      {/* Icon */}
                      <div className={`w-10 h-10 rounded-lg border flex items-center justify-center flex-shrink-0 ${
                        isPublished ? 'bg-emerald-50 border-emerald-200' :
                        isReview ? 'bg-amber-50 border-amber-200' :
                        'bg-slate-50 border-slate-200'
                      }`}>
                        <FormIcon size={16} className={
                          isPublished ? 'text-emerald-600' :
                          isReview ? 'text-amber-600' :
                          'text-slate-400'
                        } />
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold truncate text-slate-900">{form.title}</p>
                          <Badge label={stageName} color={stageBadgeColor} />
                          {(form.revision || 1) > 1 && <Badge label={`Rev ${form.revision}`} color="amber" />}
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {form.owner_id ? ID_NAME_MAP[form.owner_id] || 'Unknown' : 'No owner'} {'\u00B7'} {fieldCount} field{fieldCount !== 1 ? 's' : ''} {'\u00B7'} {timeAgo(form.created_at)}
                        </p>
                      </div>
                      {/* Actions */}
                      <div className="flex gap-1.5 flex-shrink-0" onClick={e => e.stopPropagation()}>
                        {isDraft && !isViewer && (
                          <>
                            <button onClick={() => enterEdit(form)}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200 transition">
                              <EditPen size={12} /> Edit
                            </button>
                            {isAdmin && (
                              <button onClick={() => setShowSubmit(form)}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition">
                                <Send size={12} /> {hasReviewStages ? 'Submit' : 'Publish'}
                              </button>
                            )}
                          </>
                        )}
                        {isReview && (
                          <>
                            {canApproveForm(form) && !isViewer && (
                              <>
                                <button onClick={() => setShowApprove(form)}
                                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition">
                                  <CheckOk size={12} /> Approve
                                </button>
                                <button onClick={() => setShowReject(form)}
                                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-rose-50 text-rose-600 hover:bg-rose-100 transition">
                                  <XClose size={12} /> Reject
                                </button>
                              </>
                            )}
                          </>
                        )}
                        {isPublished && (
                          <>
                            {!isViewer && (
                              shareStatusMap[form.id] ? (
                                <button onClick={() => setShowShare(form)}
                                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-emerald-200 text-emerald-600 bg-emerald-50/50 hover:bg-emerald-100 transition">
                                  <CheckOk size={12} /> Shared
                                </button>
                              ) : (
                                <button onClick={() => setShowShare(form)}
                                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-emerald-500 text-white hover:bg-emerald-600 transition">
                                  <Share size={12} /> Share
                                </button>
                              )
                            )}
                            {!isViewer && (
                              <button onClick={() => setShowUnpublish(form)}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-amber-50 text-amber-600 hover:bg-amber-100 transition">
                                <EyeOff size={12} /> Unpublish
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* ─── Published: Submissions View ─── */}
            {selectedStage === pubCode && selectedForm && (
              <div className="mt-6 bg-white border border-slate-200 rounded-xl p-4 animate-slide-in">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                      📊 Submissions {submissions.length > 0 && <span className="text-xs font-normal text-slate-400">({submissions.length})</span>}
                    </h4>
                    {viewSubmission && (
                      <button onClick={() => setViewSubmission(null)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-indigo-600 border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 transition">
                        ← Back to Table
                      </button>
                    )}
                  </div>
                  {showSubmissions && !viewSubmission && submissions.length > 0 && (
                    <button onClick={handleExportCSV}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200 transition">
                      <Download size={12} /> Export CSV
                    </button>
                  )}
                </div>
                {showSubmissions && !viewSubmission && (
                  <>
                    {submissionsLoading ? (
                      <div className="h-20 bg-slate-100 rounded-xl animate-pulse" />
                    ) : submissions.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-4">No submissions yet.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-slate-200">
                              <th className="text-left py-2 px-2 font-semibold text-slate-500">#</th>
                              {(selectedForm.fields || []).filter(f => f.type !== 'section').map(f => (
                                <th key={f.id} className="text-left py-2 px-2 font-semibold text-slate-500 truncate max-w-[120px]">{f.label}</th>
                              ))}
                              <th className="text-left py-2 px-2 font-semibold text-slate-500">Submitter</th>
                              <th className="text-left py-2 px-2 font-semibold text-slate-500">Submitted</th>
                              <th className="text-center py-2 px-2 font-semibold text-slate-500 w-10"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {submissions.map((sub, i) => {
                              const answers = sub.data || {}
                              return (
                                <tr key={sub.id} onClick={() => setViewSubmission(sub)}
                                  className="border-b border-slate-100 hover:bg-indigo-50 cursor-pointer transition group">
                                  <td className="py-2 px-2 text-slate-500">{i + 1}</td>
                                  {(selectedForm.fields || []).filter(f => f.type !== 'section').map(f => {
                                    const val = answers[f.id]
                                    return (
                                      <td key={f.id} className="py-2 px-2 text-slate-700 truncate max-w-[120px]">
                                        {Array.isArray(val) ? val.join(', ') : val ?? '\u2014'}
                                      </td>
                                    )
                                  })}
                                  <td className="py-2 px-2 text-slate-700">{sub.submitter_name || sub.submitter_email || 'Anonymous'}</td>
                                  <td className="py-2 px-2 text-slate-400">{timeAgo(sub.submitted_at)}</td>
                                  <td className="py-2 px-2 text-center">
                                    <Eye size={14} className="text-slate-300 group-hover:text-indigo-500 transition inline-block" />
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                )}

                {/* ─── Submission Detail: Filled Form View ─── */}
                {showSubmissions && viewSubmission && (() => {
                  const answers = viewSubmission.data || {}
                  const fields = selectedForm.fields || []
                  return (
                    <div className="animate-slide-in">
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-bold text-slate-900">{selectedForm.title}</p>
                            <p className="text-xs text-slate-500 mt-0.5">Submitted by {viewSubmission.submitter_name || viewSubmission.submitter_email || 'Anonymous'}</p>
                          </div>
                          <Badge label={viewSubmission.submitted_at ? new Date(viewSubmission.submitted_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'} color="slate" />
                        </div>
                      </div>
                      <div className="space-y-4">
                        {fields.map(field => {
                          if (field.type === 'section') {
                            return (
                              <div key={field.id} className="border-t-2 border-slate-200 pt-3 mt-4">
                                <h4 className="text-xs font-bold text-slate-800">{field.label}</h4>
                              </div>
                            )
                          }
                          const val = answers[field.id]
                          const displayVal = Array.isArray(val) ? val.join(', ') : (val || '—')
                          return (
                            <div key={field.id} className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                              <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                                {field.label} {field.required && <span className="text-rose-400">*</span>}
                              </label>
                              <p className="text-sm text-slate-900">{displayVal}</p>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })()}
              </div>
            )}

            {/* ─── Review: Form Preview ─── */}
            {selectedStage !== draftCode && selectedStage !== pubCode && selectedForm && (
              <div className="mt-6 bg-white border border-slate-200 rounded-xl p-5 animate-slide-in">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center flex-shrink-0">
                    <FormIcon size={16} className="text-amber-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900">{selectedForm.title}</p>
                    {selectedForm.description && <p className="text-xs text-slate-400">{selectedForm.description}</p>}
                  </div>
                  <Badge label={FORM_STAGES.find(s => s.id === (selectedForm.status || draftCode))?.label || 'Review'} color="amber" />
                  {(selectedForm.revision || 1) > 1 && <Badge label={`Rev ${selectedForm.revision}`} color="amber" />}
                </div>
                <div className="space-y-3 mb-4">
                  {(selectedForm.fields || []).map(field => (
                    <div key={field.id}>{renderFieldPreview(field)}</div>
                  ))}
                  {(selectedForm.fields || []).length === 0 && (
                    <p className="text-xs text-slate-400">No fields defined.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── Pane 3: Detail Panel ─── */}
      {selectedForm && !editMode && (
        <div className="w-72 flex-shrink-0 bg-white border-l border-slate-200 p-5 overflow-y-auto flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-semibold text-slate-400 uppercase">Form Details</p>
            <button onClick={() => { setSelectedFormId(null); setShowSubmissions(false) }} className="text-slate-400 hover:text-slate-600">
              <XClose size={14} />
            </button>
          </div>

          {/* Title + Badge */}
          {(() => {
            const formStage = getFormStage(selectedForm)
            const isP = formStage?.stage_type === 'published'
            const isR = formStage?.stage_type === 'review'
            return (
              <div className="flex items-center gap-2 mb-4">
                <div className={`w-10 h-10 rounded-lg border flex items-center justify-center flex-shrink-0 ${
                  isP ? 'bg-emerald-50 border-emerald-200' :
                  isR ? 'bg-amber-50 border-amber-200' :
                  'bg-slate-50 border-slate-200'
                }`}>
                  <FormIcon size={16} className={
                    isP ? 'text-emerald-600' :
                    isR ? 'text-amber-600' :
                    'text-slate-400'
                  } />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{selectedForm.title}</p>
                  <Badge label={FORM_STAGES.find(s => s.id === (selectedForm.status || draftCode))?.label || 'Draft'}
                    color={isP ? 'emerald' : isR ? 'amber' : 'slate'} />
                  {(selectedForm.revision || 1) > 1 && <Badge label={`Rev ${selectedForm.revision}`} color="amber" />}
                </div>
              </div>
            )
          })()}

          {/* Description */}
          {selectedForm.description && (
            <p className="text-xs text-slate-500 mb-4">{selectedForm.description}</p>
          )}

          {/* Metadata */}
          <div className="space-y-2 text-xs mb-5">
            <div className="flex justify-between">
              <span className="text-slate-400">Owner</span>
              <span className="text-slate-700 font-medium">{selectedForm.owner_id ? ID_NAME_MAP[selectedForm.owner_id] || 'Unknown' : '\u2014'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Stage</span>
              <span className="text-slate-700 font-medium">{String(FORM_STAGES.find(s => s.id === (selectedForm.status || draftCode))?.orderNum || 0).padStart(2, '0')} {'\u00B7'} {FORM_STAGES.find(s => s.id === (selectedForm.status || draftCode))?.label}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Created</span>
              <span className="text-slate-700 font-medium">{timeAgo(selectedForm.created_at)}</span>
            </div>
            {selectedForm.published_at && (
              <div className="flex justify-between">
                <span className="text-slate-400">Published</span>
                <span className="text-emerald-600 font-medium">{new Date(selectedForm.published_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-400">Fields</span>
              <span className="text-slate-700 font-medium">{(selectedForm.fields || []).length}</span>
            </div>
          </div>

          {/* Revision History */}
          <div className="border-t border-slate-100 pt-3 mt-3">
            <p className="text-xs font-semibold text-slate-700 mb-2">Revision History</p>
            <div className="space-y-2">
              {revHistory.length > 0 ? revHistory.map(rev => (
                <div key={rev.id} className="flex items-start gap-2 text-xs">
                  <Badge label={`Rev ${rev.revision}`} color={rev.revision === (selectedForm?.revision || 1) ? 'indigo' : 'slate'} />
                  <div className="flex-1">
                    <span className="text-slate-500">{new Date(rev.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    {rev.comment && <p className="text-slate-400 mt-0.5">"{rev.comment}"</p>}
                  </div>
                </div>
              )) : (
                <div className="flex items-center gap-2 text-xs">
                  <Badge label={`Rev ${selectedForm?.revision || 1}`} color="indigo" />
                  <span className="text-slate-400">Current version{(selectedForm?.revision || 1) === 1 ? ' — not yet revised' : ''}</span>
                </div>
              )}
            </div>
          </div>

          {/* Form Activity */}
          <div className="border-t border-slate-100 pt-4 flex-1">
            <p className="text-xs font-semibold text-slate-700 mb-2">Form Activity</p>
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
                        <span className="text-slate-500">{a.action}</span>
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
      {showNewForm && <NewFormModal onConfirm={handleCreate} onClose={() => setShowNewForm(false)} />}
      {showSubmit && (
        hasReviewStages
          ? <SubmitModal form={showSubmit} nextStageName={getNextStageName(draftCode)} onConfirm={handleSubmitConfirm} onClose={() => setShowSubmit(null)} />
          : <SubmitModal form={showSubmit} nextStageName="Published" onConfirm={handlePublish} onClose={() => setShowSubmit(null)} />
      )}
      {showApprove && (() => {
        const curCode = showApprove.status || draftCode
        const cur = wfStages.find(s => s.stage_code === curCode)
        const next = cur ? wfStages.find(s => s.stage_order === cur.stage_order + 1) : null
        return <ApproveModal form={showApprove} nextStageName={next?.stage_name || 'next stage'} onConfirm={handleApproveConfirm} onClose={() => setShowApprove(null)} isPublishing={next?.stage_type === 'published'} />
      })()}
      {showReject && <RejectModal form={showReject} prevStageName={getPrevStageName(showReject.status || draftCode)} onConfirm={handleRejectConfirm} onClose={() => setShowReject(null)} />}
      {showUnpublish && <UnpublishModal form={showUnpublish} onConfirm={handleUnpublish} onClose={() => setShowUnpublish(null)} />}
      {showShare && <FormShareModal form={showShare} siteId={siteId} currentUser={currentUser}
        onShareCreated={(formId) => setShareStatusMap(prev => ({ ...prev, [formId]: true }))}
        onClose={() => { setShowShare(null); setShareRefreshTick(t => t + 1); activities.refetch?.() }} />}
    </div>
  )
}
