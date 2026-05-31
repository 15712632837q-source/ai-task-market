'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function RegisterPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password.length < 6) { setError('密码至少需要 6 位'); return }
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({ email, password, options: { data: { username } } })
    if (error) {
      if (error.message.includes('already registered')) setError('该邮箱已被注册，请直接登录')
      else setError('注册失败，请重试')
    } else {
      router.push('/tasks'); router.refresh()
    }
    setLoading(false)
  }

  const inputCls = "w-full px-3 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 transition-colors text-sm"

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            AI任务市场
          </span>
          <h1 className="text-xl font-semibold text-white mt-3">创建账号</h1>
          <p className="text-gray-500 text-sm mt-1">加入平台，发布或接受任务</p>
        </div>

        <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-8">
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="text-sm text-gray-400 block mb-1.5">用户名</label>
              <input type="text" placeholder="你的昵称" value={username}
                onChange={e => setUsername(e.target.value)} required className={inputCls} />
            </div>
            <div>
              <label className="text-sm text-gray-400 block mb-1.5">邮箱</label>
              <input type="email" placeholder="your@email.com" value={email}
                onChange={e => setEmail(e.target.value)} required className={inputCls} />
            </div>
            <div>
              <label className="text-sm text-gray-400 block mb-1.5">密码</label>
              <input type="password" placeholder="至少 6 位" value={password}
                onChange={e => setPassword(e.target.value)} required className={inputCls} />
            </div>
            {error && <p className="text-sm text-red-400 bg-red-500/10 px-3 py-2 rounded-lg">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full py-2.5 rounded-xl font-semibold bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:opacity-90 transition-opacity disabled:opacity-50 mt-2">
              {loading ? '注册中...' : '立即注册'}
            </button>
          </form>
          <p className="text-center text-sm text-gray-500 mt-5">
            已有账号？{' '}
            <Link href="/auth/login" className="text-blue-400 hover:text-blue-300 transition-colors">直接登录</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
