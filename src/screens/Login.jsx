import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { ROLES } from '../lib/roles'
import { Folder } from '../lib/icons'
import Avatar from '../components/Avatar'
import Badge from '../components/Badge'

const DEMO_USERS = [
  { name: 'Alice Johnson', email: 'alice@demo.com' },
  { name: 'Bob Chen',      email: 'bob@demo.com' },
  { name: 'Cathy Park',    email: 'cathy@demo.com' },
]

export default function Login() {
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  const signIn = async (e, overrideEmail) => {
    if (e) e.preventDefault()
    const useEmail = overrideEmail || email
    const usePwd = 'Demo1234!'
    setLoading(true)
    setError('')
    const { error: err } = await supabase.auth.signInWithPassword({
      email: useEmail,
      password: overrideEmail ? usePwd : password || usePwd,
    })
    if (err) setError(err.message)
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg mx-auto mb-3">
            <Folder size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-indigo-600">DocHub</h1>
          <p className="text-slate-500 text-sm mt-1">Document Intelligence Platform</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-7">
          {/* Quick Login by Role */}
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider text-center mb-3">Quick Login by Role</p>
          <div className="grid grid-cols-3 gap-2 mb-5">
            {DEMO_USERS.map(u => {
              const r = ROLES[u.email]
              return (
                <button key={u.email} onClick={() => signIn(null, u.email)}
                  className="flex flex-col items-center p-3 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all cursor-pointer group">
                  <Avatar name={u.name} size="md" />
                  <span className="text-xs font-semibold text-slate-800 mt-2 leading-tight text-center">{u.name.split(' ')[0]}</span>
                  <span className="mt-1"><Badge label={r.role} color={r.badge} /></span>
                  <span className="text-[9px] text-slate-400 mt-1 leading-tight text-center">{r.icon} {r.desc.split('·')[0].trim()}</span>
                </button>
              )
            })}
          </div>

          {/* Divider */}
          <div className="relative mb-4">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
            <div className="relative flex justify-center"><span className="bg-white px-3 text-xs text-slate-400">or sign in with email</span></div>
          </div>

          {/* Form */}
          <form onSubmit={signIn} className="space-y-3">
            <input value={email} onChange={e => { setEmail(e.target.value); setError('') }} type="email" placeholder="Email address"
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            <input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="Password"
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            {error && <div className="bg-rose-50 border border-rose-200 text-rose-600 text-xs rounded-xl px-4 py-2.5">{error}</div>}
            <button type="submit" disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-xl text-sm transition-all disabled:opacity-60">
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

        </div>
      </div>
    </div>
  )
}
