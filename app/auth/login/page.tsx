'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const resetSuccess = searchParams.get('reset') === 'success'

  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      if (error.message.includes('Email not confirmed')) setError('邮箱尚未验证，请检查邮件点击确认链接')
      else if (error.message.includes('Invalid login credentials')) setError('邮箱或密码错误，请检查后重试')
      else setError(`登录失败：${error.message}`)
    } else {
      router.push('/tasks'); router.refresh()
    }
    setLoading(false)
  }

  const inputCls = "w-full px-3 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 transition-colors text-sm"

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            AI任务市场
          </span>
          <h1 className="text-xl font-semibold text-white mt-3">欢迎回来</h1>
          <p className="text-gray-500 text-sm mt-1">登录你的账号</p>
        </div>

        <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-8">
          {resetSuccess && (
            <div className="bg-green-500/10 border border-green-500/20 text-green-400 text-sm px-3 py-2 rounded-lg mb-4">
              ✅ 密码重置成功，请用新密码登录
            </div>
          )}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-sm text-gray-400 block mb-1.5">邮箱</label>
              <input type="email" placeholder="your@email.com" value={email}
                onChange={e => setEmail(e.target.value)} required className={inputCls} />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm text-gray-400">密码</label>
                <Link href="/auth/forgot-password" className="text-xs text-blue-400 hover:text-blue-300 transition-colors">忘记密码？</Link>
              </div>
              <input type="password" placeholder="输入密码" value={password}
                onChange={e => setPassword(e.target.value)} required className={inputCls} />
            </div>
            {error && <p className="text-sm text-red-400 bg-red-500/10 px-3 py-2 rounded-lg">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full py-2.5 rounded-xl font-semibold bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:opacity-90 transition-opacity disabled:opacity-50 mt-2">
              {loading ? '登录中...' : '登录'}
            </button>
          </form>
          <p className="text-center text-sm text-gray-500 mt-5">
            还没有账号？{' '}
            <Link href="/auth/register" className="text-blue-400 hover:text-blue-300 transition-colors">免费注册</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>
}
