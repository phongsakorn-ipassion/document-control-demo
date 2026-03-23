import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import useAppStore from '../store/useAppStore'
import Badge from '../components/Badge'
import { Globe, FormIcon, CheckOk } from '../lib/icons'

const FIELD_ICONS = { text: '📝', textarea: '📄', number: '🔢', email: '📧', date: '📅', dropdown: '📋', radio: '⭕', checkbox: '☑️', section: '───' }

export default function PublicForm() {
  const { token } = useParams()
  const currentUser = useAppStore(s => s.currentUser)
  const [form, setForm] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [values, setValues] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [validationErrors, setValidationErrors] = useState({})

  useEffect(() => {
    const fetchForm = async () => {
      if (!token) { setLoading(false); return }
      setLoading(true)

      const { data: rpcForm, error: rpcErr } = await supabase
        .rpc('get_shared_form', { share_token: token })

      if (rpcErr || !rpcForm) {
        setError('Invalid or expired form link')
        setLoading(false)
        return
      }

      setForm(rpcForm)
      // Initialize values
      const init = {}
      ;(rpcForm.fields || []).forEach(f => {
        if (f.type === 'section') return
        init[f.id] = f.type === 'checkbox' ? [] : ''
      })
      setValues(init)
      setLoading(false)
    }
    fetchForm()
  }, [token])

  const handleChange = (fieldId, val) => {
    setValues(prev => ({ ...prev, [fieldId]: val }))
    setValidationErrors(prev => ({ ...prev, [fieldId]: null }))
  }

  const handleCheckboxChange = (fieldId, option, checked) => {
    setValues(prev => {
      const arr = Array.isArray(prev[fieldId]) ? [...prev[fieldId]] : []
      if (checked) arr.push(option)
      else {
        const idx = arr.indexOf(option)
        if (idx > -1) arr.splice(idx, 1)
      }
      return { ...prev, [fieldId]: arr }
    })
  }

  const handleSubmit = async () => {
    if (!form) return

    // Validate required fields
    const errs = {}
    ;(form.fields || []).forEach(f => {
      if (f.type === 'section') return
      if (f.required) {
        const val = values[f.id]
        if (f.type === 'checkbox') {
          if (!Array.isArray(val) || val.length === 0) errs[f.id] = 'Required'
        } else if (!val || !String(val).trim()) {
          errs[f.id] = 'Required'
        }
      }
      if (f.type === 'email' && values[f.id]) {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values[f.id])) errs[f.id] = 'Invalid email'
      }
    })

    if (Object.keys(errs).length > 0) {
      setValidationErrors(errs)
      return
    }

    setSubmitting(true)

    // Try to find name/email from form values for submitter info
    let submitterName = currentUser?.name || null
    let submitterEmail = currentUser?.email || null
    if (!submitterName) {
      const nameField = (form.fields || []).find(f => f.type === 'text' && f.label.toLowerCase().includes('name'))
      if (nameField) submitterName = values[nameField.id] || null
    }
    if (!submitterEmail) {
      const emailField = (form.fields || []).find(f => f.type === 'email')
      if (emailField) submitterEmail = values[emailField.id] || null
    }

    await supabase.from('form_submissions').insert({
      form_id: form.id,
      data: values,
      submitter_user_id: currentUser?.id || null,
      submitter_name: submitterName,
      submitter_email: submitterEmail,
    })

    setSubmitting(false)
    setSubmitted(true)
  }

  const resetForm = () => {
    const init = {}
    ;(form.fields || []).forEach(f => {
      if (f.type === 'section') return
      init[f.id] = f.type === 'checkbox' ? [] : ''
    })
    setValues(init)
    setValidationErrors({})
    setSubmitted(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 flex justify-center animate-slide-in">
        <div className="w-full max-w-2xl h-64 bg-white rounded-2xl animate-pulse" />
      </div>
    )
  }

  if (error || !form) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 flex justify-center animate-slide-in">
        <div className="w-full max-w-2xl">
          <div className="bg-white rounded-2xl border border-slate-200 p-8">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FormIcon size={44} className="text-slate-200" />
              <p className="text-sm font-semibold text-slate-500 mt-4">{error || 'Form not found'}</p>
              <p className="text-xs text-slate-400 mt-1">This form link may be invalid or expired.</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 flex justify-center animate-slide-in">
        <div className="w-full max-w-2xl">
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-200 px-8 py-4 flex items-center gap-3">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                <FormIcon size={16} className="text-white" />
              </div>
              <span className="text-sm font-bold text-slate-700">DocHub</span>
              <Globe size={16} className="text-emerald-500" />
              <Badge label="Public Form" color="emerald" />
            </div>
            <div className="px-8 py-16 text-center">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckOk size={32} className="text-emerald-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">Form Submitted!</h2>
              <p className="text-sm text-slate-500 mb-6">Thank you for your submission. Your response has been recorded.</p>
              <button onClick={resetForm}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition">
                Submit Another Response
              </button>
            </div>
            <div className="bg-slate-50 border-t border-slate-200 px-8 py-3 text-center">
              <p className="text-xs text-slate-400">Powered by DocHub · Document Intelligence Platform</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 flex justify-center animate-slide-in">
      <div className="w-full max-w-2xl">
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          {/* Header */}
          <div className="bg-slate-50 border-b border-slate-200 px-8 py-4 flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <FormIcon size={16} className="text-white" />
            </div>
            <span className="text-sm font-bold text-slate-700">DocHub</span>
            <Globe size={16} className="text-emerald-500" />
            <Badge label="Public Form" color="emerald" />
          </div>

          {/* Form */}
          <div className="px-8 py-8">
            <h1 className="text-2xl font-bold text-slate-900 mb-2">{form.title}</h1>
            {form.description && (
              <p className="text-sm text-slate-500 mb-6">{form.description}</p>
            )}

            {/* Submitter identity */}
            <div className={`rounded-xl px-4 py-3 mb-6 text-xs ${currentUser ? 'bg-indigo-50 border border-indigo-200 text-indigo-700' : 'bg-slate-50 border border-slate-200 text-slate-500'}`}>
              {currentUser
                ? <span>👤 Submitting as: <strong>{currentUser.name}</strong> ({currentUser.email})</span>
                : <span>ℹ️ You are submitting as a guest. Your responses may be anonymous.</span>
              }
            </div>

            <div className="space-y-5">
              {(form.fields || []).map(field => {
                if (field.type === 'section') {
                  return (
                    <div key={field.id} className="border-t-2 border-slate-200 pt-4 mt-6">
                      <h3 className="text-sm font-bold text-slate-800">{field.label}</h3>
                    </div>
                  )
                }

                const err = validationErrors[field.id]
                const inputBase = `w-full border rounded-xl px-4 py-2.5 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-300 ${err ? 'border-rose-300 bg-rose-50' : 'border-slate-200'}`

                return (
                  <div key={field.id}>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      {FIELD_ICONS[field.type]} {field.label} {field.required && <span className="text-rose-500">*</span>}
                    </label>

                    {field.type === 'text' && (
                      <input type="text" value={values[field.id] || ''} onChange={e => handleChange(field.id, e.target.value)}
                        placeholder={field.placeholder || ''} className={inputBase} />
                    )}
                    {field.type === 'textarea' && (
                      <textarea value={values[field.id] || ''} onChange={e => handleChange(field.id, e.target.value)}
                        placeholder={field.placeholder || ''} rows={3} className={`${inputBase} resize-none`} />
                    )}
                    {field.type === 'number' && (
                      <input type="number" value={values[field.id] || ''} onChange={e => handleChange(field.id, e.target.value)}
                        placeholder={field.placeholder || ''} className={inputBase} />
                    )}
                    {field.type === 'email' && (
                      <input type="email" value={values[field.id] || ''} onChange={e => handleChange(field.id, e.target.value)}
                        placeholder={field.placeholder || 'name@example.com'} className={inputBase} />
                    )}
                    {field.type === 'date' && (
                      <input type="date" value={values[field.id] || ''} onChange={e => handleChange(field.id, e.target.value)}
                        className={inputBase} />
                    )}
                    {field.type === 'dropdown' && (
                      <select value={values[field.id] || ''} onChange={e => handleChange(field.id, e.target.value)}
                        className={inputBase}>
                        <option value="">Select...</option>
                        {(field.options || []).map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    )}
                    {field.type === 'radio' && (
                      <div className="space-y-2 mt-1">
                        {(field.options || []).map(o => (
                          <label key={o} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                            <input type="radio" name={field.id} value={o} checked={values[field.id] === o}
                              onChange={() => handleChange(field.id, o)}
                              className="text-indigo-600 focus:ring-indigo-300" />
                            {o}
                          </label>
                        ))}
                      </div>
                    )}
                    {field.type === 'checkbox' && (
                      <div className="space-y-2 mt-1">
                        {(field.options || []).map(o => (
                          <label key={o} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                            <input type="checkbox" checked={(values[field.id] || []).includes(o)}
                              onChange={e => handleCheckboxChange(field.id, o, e.target.checked)}
                              className="text-indigo-600 focus:ring-indigo-300 rounded" />
                            {o}
                          </label>
                        ))}
                      </div>
                    )}

                    {err && <p className="text-xs text-rose-500 mt-1">{err}</p>}
                  </div>
                )
              })}
            </div>

            <button onClick={handleSubmit} disabled={submitting}
              className="w-full mt-8 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60 transition">
              {submitting ? 'Submitting...' : <><CheckOk size={16} /> Submit Form</>}
            </button>
          </div>

          {/* Footer */}
          <div className="bg-slate-50 border-t border-slate-200 px-8 py-3 text-center">
            <p className="text-xs text-slate-400">Powered by DocHub · Document Intelligence Platform</p>
          </div>
        </div>
      </div>
    </div>
  )
}
