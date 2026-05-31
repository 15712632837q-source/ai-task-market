'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

export default function MessagesPage() {
  const router = useRouter()
  const [loading, setLoading]       = useState(true)
  const [myId, setMyId]             = useState('')
  const [conversations, setConversations] = useState<any[]>([])

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 8000)
    const run = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      setMyId(user.id)

      const { data: msgs } = await supabase
        .from('messages')
        .select('*, task:tasks(id, title), sender:profiles!sender_id(id, username), receiver:profiles!receiver_id(id, username)')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false })

      if (msgs) {
        const seen = new Set<string>()
        const convos: any[] = []
        for (const m of msgs) {
          const otherId = m.sender_id === user.id ? m.receiver_id : m.sender_id
          const key = `${m.task_id}:${otherId}`
          if (seen.has(key)) continue
          seen.add(key)
          const other = m.sender_id === user.id ? m.receiver : m.sender
          convos.push({ ...m, other, otherId })
        }
        setConversations(convos)
      }
    }
    run().catch(() => {}).finally(() => { clearTimeout(timer); setLoading(false) })
    return () => clearTimeout(timer)
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center text-gray-400">
          <div className="text-4xl mb-3 animate-pulse">⏳</div>
          <p>加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">私信</h1>

      {conversations.length === 0 ? (
        <div className="text-center py-24 text-gray-400">
          <p className="text-5xl mb-4">💬</p>
          <p className="text-lg">还没有私信</p>
          <p className="text-sm mt-2">在任务详情页点击"私信"即可开始对话</p>
        </div>
      ) : (
        <div className="space-y-2">
          {conversations.map(c => (
            <button
              key={`${c.task_id}:${c.otherId}`}
              onClick={() => router.push(`/messages/${c.task_id}/${c.otherId}`)}
              className="w-full text-left bg-white rounded-xl border border-gray-100 p-4 hover:border-blue-200 hover:shadow-sm transition-all flex items-center gap-4"
            >
              <Avatar className="w-11 h-11 shrink-0">
                <AvatarFallback className="bg-blue-100 text-blue-600 font-medium">
                  {c.other?.username?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="font-medium text-gray-900">{c.other?.username}</span>
                  <span className="text-xs text-gray-400 shrink-0 ml-2">
                    {new Date(c.created_at).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })}
                  </span>
                </div>
                <p className="text-xs text-gray-400 truncate mb-1">
                  关于：{c.task?.title}
                </p>
                <p className="text-sm text-gray-600 truncate">
                  {c.sender_id === myId ? '你：' : ''}{c.content}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
