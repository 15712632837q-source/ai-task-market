'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
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

  // 初始化用户信息（合并为一次并行请求）
  const initUser = async (u: User | null) => {
    if (!u) { setUser(null); setUnreadCount(0); setIsAdmin(false); return }
    if (fetchingRef.current) return   // 防止重复并发
    fetchingRef.current = true
    setUser(u)
    // 管理员通过 user ID 判断，无需查 profiles
    if (ADMIN_ID && u.id === ADMIN_ID) setIsAdmin(true)
    try {
      const { count } = await supabase
        .from('messages').select('*', { count: 'exact', head: true })
        .eq('receiver_id', u.id).eq('is_read', false)
      setUnreadCount(count ?? 0)
    } catch (_) {
      // 网络失败时静默处理，不影响页面
    } finally {
      fetchingRef.current = false
    }
  }

  useEffect(() => {
    // 只用 onAuthStateChange，避免 getUser 重复触发
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      initUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  // 刷新未读数的公共函数
  const refreshUnread = async (uid: string) => {
    const { count } = await supabase
      .from('messages').select('*', { count: 'exact', head: true })
      .eq('receiver_id', uid).eq('is_read', false)
    setUnreadCount(count ?? 0)
  }

  // 定时刷新未读数（15秒）
  useEffect(() => {
    if (!user) return
    const timer = setInterval(() => refreshUnread(user.id), 15000)
    return () => clearInterval(timer)
  }, [user])

  // 监听聊天页"已读"事件，立即清零
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
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="font-bold text-xl text-blue-600">
          AI任务市场
        </Link>

        <div className="hidden md:flex items-center gap-6">
          {navLinks.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm font-medium transition-colors ${
                pathname === link.href ? 'text-blue-600' : 'text-gray-600 hover:text-gray-900'
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
                  <Button size="sm" variant="outline" className={`border-purple-300 text-purple-600 hover:bg-purple-50 ${pathname === '/admin' ? 'bg-purple-50' : ''}`}>
                    后台管理
                  </Button>
                </Link>
              )}
              <Link href="/tasks/new">
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700">发布任务</Button>
              </Link>

              <Link href="/messages" className="relative">
                <button className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                  pathname === '/messages' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                }`}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-medium">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
              </Link>

              <Link href="/dashboard">
                <Avatar className="w-8 h-8 cursor-pointer">
                  <AvatarFallback className="bg-blue-100 text-blue-600 text-sm">
                    {user.email?.[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Link>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>退出</Button>
            </>
          ) : (
            <>
              <Link href="/auth/login">
                <Button variant="ghost" size="sm">登录</Button>
              </Link>
              <Link href="/auth/register">
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700">注册</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>

    {/* 手机底部导航栏 */}
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 flex">
      {[
        { href: '/tasks',     icon: '🏠', label: '任务大厅' },
        { href: '/tasks/new', icon: '➕', label: '发布任务' },
        { href: '/messages',  icon: '💬', label: '消息',    badge: unreadCount },
        { href: '/dashboard', icon: '👤', label: '工作台' },
      ].map(item => (
        <Link key={item.href} href={item.href} className={`flex-1 flex flex-col items-center py-2 gap-0.5 relative transition-colors ${
          pathname === item.href ? 'text-blue-600' : 'text-gray-500'
        }`}>
          <span className="text-xl leading-none">{item.icon}</span>
          <span className="text-xs">{item.label}</span>
          {item.badge ? (
            <span className="absolute top-1 right-1/4 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-medium">
              {item.badge > 9 ? '9+' : item.badge}
            </span>
          ) : null}
        </Link>
      ))}
    </div>
    </>
  )
}
