'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ChatPage({ params }: { params: Promise<{ taskId: string; userId: string }> }) {
  const router = useRouter()
  const bottomRef  = useRef<HTMLDivElement>(null)
  const myIdRef    = useRef('')
  const otherIdRef = useRef('')
  const taskIdRef  = useRef('')

  const [taskId, setTaskId]       = useState('')
  const [otherId, setOtherId]     = useState('')
  const [myId, setMyId]           = useState('')
  const [task, setTask]           = useState<any>(null)
  const [otherUser, setOtherUser] = useState<any>(null)
  const [messages, setMessages]   = useState<any[]>([])
  const [content, setContent]     = useState('')
  const [loading, setLoading]     = useState(true)
  const [sending, setSending]     = useState(false)

  // 拉取消息（带双方过滤），同时把对方发给我的未读消息标记为已读
  const fetchMessages = async (tid: string, uid: string, me: string) => {
    const supabase = createClient()
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('task_id', tid)
      .or(`and(sender_id.eq.${me},receiver_id.eq.${uid}),and(sender_id.eq.${uid},receiver_id.eq.${me})`)
      .order('created_at', { ascending: true })
    setMessages(data ?? [])
    // 标记已读：对方发给我、未读的消息，完成后通知导航栏立即刷新
    supabase.from('messages').update({ is_read: true })
      .eq('task_id', tid).eq('sender_id', uid).eq('receiver_id', me).eq('is_read', false)
      .then(() => { window.dispatchEvent(new CustomEvent('messages-read')) })
  }

  useEffect(() => {
    let channel: ReturnType<ReturnType<typeof createClient>['channel']> | null = null
    let timer: ReturnType<typeof setInterval> | null = null
    let cancelled = false
    const loadingTimer = setTimeout(() => setLoading(false), 8000)

    params.then(async ({ taskId: tid, userId: uid }) => {
      setTaskId(tid)
      setOtherId(uid)
      taskIdRef.current  = tid
      otherIdRef.current = uid

      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || cancelled) { if (!user) router.push('/auth/login'); return }
      setMyId(user.id)
      myIdRef.current = user.id

      const [{ data: t }, { data: other }] = await Promise.all([
        supabase.from('tasks').select('id, title, budget').eq('id', tid).single(),
        supabase.from('profiles').select('id, username').eq('id', uid).single(),
      ])
      if (cancelled) return
      setTask(t)
      setOtherUser(other)
      await fetchMessages(tid, uid, user.id)
      if (cancelled) return
      clearTimeout(loadingTimer)
      setLoading(false)

      channel = supabase
        .channel(`chat:${tid}:${[user.id, uid].sort().join(':')}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        }, (payload) => {
          const msg = payload.new as any
          const me  = myIdRef.current
          const oth = otherIdRef.current
          const tId = taskIdRef.current
          if (
            msg.task_id === tId &&
            ((msg.sender_id === me && msg.receiver_id === oth) ||
             (msg.sender_id === oth && msg.receiver_id === me))
          ) {
            setMessages(prev => {
              if (prev.find(m => m.id === msg.id)) return prev
              return [...prev.filter(m => !m._temp), msg]
            })
            // 对方发来的消息，在聊天页打开时立即标记已读
            if (msg.sender_id === oth && msg.receiver_id === me) {
              supabase.from('messages').update({ is_read: true }).eq('id', msg.id)
                .then(() => { window.dispatchEvent(new CustomEvent('messages-read')) })
            }
          }
        })
        .subscribe()

      timer = setInterval(() => {
        fetchMessages(taskIdRef.current, otherIdRef.current, myIdRef.current)
      }, 4000)
    })

    return () => {
      cancelled = true
      clearTimeout(loadingTimer)
      if (channel) channel.unsubscribe()
      if (timer) clearInterval(timer)
    }
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    const text = content.trim()
    if (!text) return
    setSending(true)
    setContent('')

    // 乐观更新：发送后立即显示
    const tempId = `temp-${Date.now()}`
    const tempMsg = {
      id: tempId,
      _temp: true,
      task_id: taskId,
      sender_id: myId,
      receiver_id: otherId,
      content: text,
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, tempMsg])

    const supabase = createClient()
    const { data: inserted } = await supabase
      .from('messages')
      .insert({ task_id: taskId, sender_id: myId, receiver_id: otherId, content: text })
      .select()
      .single()

    // 用真实记录替换临时消息
    if (inserted) {
      setMessages(prev => prev.map(m => m.id === tempId ? inserted : m))
    }
    setSending(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center text-gray-600">
          <div className="text-4xl mb-3 animate-pulse">⏳</div>
          <p>加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col h-[calc(100vh-80px)]">
      {/* 顶部任务信息 */}
      <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-4 mb-4">
        <p className="text-xs text-gray-600 mb-1">关于任务</p>
        <p className="font-medium text-white">{task?.title}</p>
        <p className="text-blue-400 text-sm font-bold">¥{Number(task?.budget ?? 0).toFixed(0)}</p>
        <button onClick={() => router.push(`/tasks/${taskId}`)} className="text-xs text-blue-400 hover:text-blue-300 transition-colors mt-1">
          查看任务详情 →
        </button>
      </div>

      {/* 对话标题 */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
          {otherUser?.username?.[0]}
        </div>
        <span className="font-medium text-gray-300">与 {otherUser?.username} 的私信</span>
      </div>

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto space-y-3 pb-2">
        {messages.length === 0 ? (
          <div className="text-center py-12 text-gray-600">
            <p className="text-3xl mb-2">💬</p>
            <p className="text-sm">还没有消息，发送第一条吧</p>
          </div>
        ) : messages.map(msg => {
          const isMe = msg.sender_id === myId
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm transition-opacity ${
                msg._temp ? 'opacity-60' : 'opacity-100'
              } ${isMe
                ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-br-sm'
                : 'bg-white/[0.06] text-gray-200 rounded-bl-sm border border-white/[0.08]'}`}>
                <p>{msg.content}</p>
                <p className={`text-xs mt-1 ${isMe ? 'text-blue-200' : 'text-gray-500'}`}>
                  {new Date(msg.created_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* 输入框 */}
      <form onSubmit={handleSend} className="flex gap-2 pt-3 border-t border-white/[0.06]">
        <input
          placeholder="输入消息..."
          value={content}
          onChange={e => setContent(e.target.value)}
          autoComplete="off"
          className="flex-1 px-4 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 transition-colors text-sm"
        />
        <button type="submit" disabled={sending || !content.trim()}
          className="px-5 py-2.5 rounded-xl font-semibold bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:opacity-90 transition-opacity disabled:opacity-40 text-sm">
          发送
        </button>
      </form>
    </div>
  )
}
