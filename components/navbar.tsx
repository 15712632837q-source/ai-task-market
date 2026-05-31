'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState, useRef } from 'react'
import type { User } from '@supabase/supabase-js'

export default function Navbar() {
  const pathname = usePathname()
  const router   = useRouter()
  const [user, setUser]               = useState<User | null>(null)
  const [isAdmin, setIsAdmin]         = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const fetchingRef = useRef(false)

  const supabase = createClient()
  const ADMIN_ID = process.env.NEXT_PUBLIC_ADMIN_ID ?? ''

  const initUser = async (u: User | null) => {
    if (!u) { setUser(null); setUnreadCount(0); setIsAdmin(false); return }
    if (fetchingRef.current) return
    fetchingRef.current = true
    setUser(u)
    if (ADMIN_ID && u.id === ADMIN_ID) setIsAdmin(true)
    try {
      const { count } = await supabase
        .from('messages').select('*', { count: 'exact', head: true })
        .eq('receiver_id', u.id).eq('is_read', false)
      setUnreadCount(count ?? 0)
    } catch (_) {}
    finally { fetchingRef.current = false }
  }

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      initUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  const refreshUnread = async (uid: string) => {
    const { count } = await supabase
      .from('messages').select('*', { count: 'exact', head: true })
      .eq('receiver_id', uid).eq('is_read', false)
    setUnreadCount(count ?? 0)
  }

  useEffect(() => {
    if (!user) return
    const timer = setInterval(() => refreshUnread(user.id), 15000)
    return () => clearInterval(timer)
  }, [user])

  useEffect(() => {
    if (!user) return
    const handler = () => refreshUnread(user.id)
    window.addEventListener('messages-read', handler)
    return () => window.removeEventListener('messages-read', handler)
  }, [user])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const navLinks = [
    { href: '/tasks',     label: '任务大厅' },
    { href: '/dashboard', label: '我的工作台' },
  ]

  return (
    <>
    <nav className="sticky top-0 z-50 bg-[#0f0f1a]/90 backdrop-blur-md border-b border-white/[0.06]">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">

        <Link href="/" className="font-bold text-xl bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
          AI任务市场
        </Link>

        <div className="hidden md:flex items-center gap-6">
          {navLinks.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm font-medium transition-colors ${
                pathname === link.href ? 'text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              {isAdmin && (
                <Link href="/admin">
                  <button className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${
                    pathname === '/admin'
                      ? 'border-purple-500/50 text-purple-400 bg-purple-500/10'
                      : 'border-white/10 text-gray-400 hover:text-white hover:border-white/20'
                  }`}>
                    后台管理
                  </button>
                </Link>
              )}

              <Link href="/tasks/new">
                <button className="text-sm px-4 py-1.5 rounded-lg font-semibold bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:opacity-90 transition-opacity">
                  发布任务
                </button>
              </Link>

              <Link href="/messages" className="relative">
                <button className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                  pathname === '/messages' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/8'
                }`}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-medium">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
              </Link>

              <Link href="/dashboard">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold cursor-pointer">
                  {user.email?.[0].toUpperCase()}
                </div>
              </Link>

              <button onClick={handleSignOut} className="text-sm text-gray-500 hover:text-gray-300 transition-colors">
                退出
              </button>
            </>
          ) : (
            <>
              <Link href="/auth/login">
                <button className="text-sm text-gray-400 hover:text-white transition-colors px-3 py-1.5">
                  登录
                </button>
              </Link>
              <Link href="/auth/register">
                <button className="text-sm px-4 py-1.5 rounded-lg font-semibold bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:opacity-90 transition-opacity">
                  注册
                </button>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>

    {/* 手机底部导航栏 */}
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0f0f1a]/95 backdrop-blur-md border-t border-white/[0.06] flex">
      {[
        { href: '/tasks',     icon: '🏠', label: '任务大厅' },
        { href: '/tasks/new', icon: '➕', label: '发布任务' },
        { href: '/messages',  icon: '💬', label: '消息',    badge: unreadCount },
        { href: '/dashboard', icon: '👤', label: '工作台' },
      ].map(item => (
        <Link key={item.href} href={item.href} className={`flex-1 flex flex-col items-center py-2 gap-0.5 relative transition-colors ${
          pathname === item.href ? 'text-blue-400' : 'text-gray-500'
        }`}>
          <span className="text-xl leading-none">{item.icon}</span>
          <span className="text-xs">{item.label}</span>
          {item.badge ? (
            <span className="absolute top-1 right-1/4 bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-medium">
              {item.badge > 9 ? '9+' : item.badge}
            </span>
          ) : null}
        </Link>
      ))}
    </div>
    </>
  )
}
