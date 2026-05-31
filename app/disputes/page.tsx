'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function DisputesPage() {
  const router = useRouter()
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [myScore, setMyScore] = useState(0)
  const [disputes, setDisputes] = useState<any[]>([])
  const [votes, setVotes] = useState<any[]>([])
  const [voting, setVoting] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    const supabase = createClient()
    const [{ data: { user } }, { data: d }, { data: v }] = await Promise.all([
      supabase.auth.getUser(),
      supabase.from('tasks')
        .select('*, dispatcher:profiles!dispatcher_id(id,username), receiver:profiles!receiver_id(id,username)')
        .eq('status', 'disputed')
        .order('created_at', { ascending: false }),
      supabase.from('dispute_votes').select('task_id, vote, voter_id'),
    ])

    if (user) {
      setCurrentUserId(user.id)
      const { data: profile } = await supabase.from('profiles').select('score').eq('id', user.id).single()
      setMyScore(profile?.score ?? 0)
    }

    setDisputes(d ?? [])
    setVotes(v ?? [])
    setLoading(false)
  }

  useEffect(() => {
    const done = () => setLoading(false)
    const timer = setTimeout(done, 8000)
    loadData().catch(() => {}).finally(() => { clearTimeout(timer); done() })
    return () => clearTimeout(timer)
  }, [])

  const handleVote = async (taskId: string, side: 'dispatcher' | 'receiver') => {
    if (!currentUserId) { router.push('/auth/login'); return }
    setVoting(taskId + side)
    const supabase = createClient()
    const { error } = await supabase.from('dispute_votes').insert({
      task_id: taskId,
      voter_id: currentUserId,
      vote: side,
    })
    if (error) {
      alert(error.message.includes('unique') ? '你已经投过票了' : '投票失败，请确认信誉分是否达到 80 分')
    } else {
      await loadData()
    }
    setVoting(null)
  }

  const getVoteCounts = (taskId: string) => ({
    dispatcher: votes.filter(v => v.task_id === taskId && v.vote === 'dispatcher').length,
    receiver:   votes.filter(v => v.task_id === taskId && v.vote === 'receiver').length,
  })

  const getMyVote = (taskId: string) =>
    votes.find(v => v.task_id === taskId && v.voter_id === currentUserId)?.vote ?? null

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
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600 transition">
          ← 返回
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">纠纷仲裁</h1>
          <p className="text-sm text-gray-500 mt-0.5">信誉分 ≥ 80 的用户可参与投票，票数多的一方胜出</p>
        </div>
      </div>

      {disputes.length === 0 ? (
        <div className="text-center py-24 text-gray-400">
          <p className="text-5xl mb-4">⚖️</p>
          <p className="text-lg">暂无纠纷任务</p>
          <p className="text-sm mt-2">所有任务均已顺利完成</p>
        </div>
      ) : (
        <div className="space-y-5">
          {disputes.map(task => {
            const vc = getVoteCounts(task.id)
            const total = vc.dispatcher + vc.receiver
            const myVote = getMyVote(task.id)
            const isParty = currentUserId === task.dispatcher?.id || currentUserId === task.receiver?.id

            return (
              <Card key={task.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Link href={`/tasks/${task.id}`}>
                        <CardTitle className="text-base hover:text-blue-600 transition cursor-pointer">
                          {task.title}
                        </CardTitle>
                      </Link>
                      <div className="flex gap-4 mt-1.5 text-xs text-gray-500">
                        <span>派发方：<span className="font-medium text-gray-700">{task.dispatcher?.username}</span></span>
                        <span>接单方：<span className="font-medium text-gray-700">{task.receiver?.username}</span></span>
                      </div>
                    </div>
                    <span className="text-blue-600 font-bold text-sm shrink-0">¥{Number(task.budget).toFixed(0)}</span>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* 投票进度条 */}
                  <div className="space-y-2.5">
                    {[
                      { side: 'dispatcher', label: `派发方（${task.dispatcher?.username}）`, count: vc.dispatcher, color: 'bg-orange-400' },
                      { side: 'receiver',   label: `接单方（${task.receiver?.username}）`,   count: vc.receiver,   color: 'bg-blue-500' },
                    ].map(({ side, label, count, color }) => {
                      const pct = total === 0 ? 50 : Math.round((count / total) * 100)
                      return (
                        <div key={side}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-600">{label}</span>
                            <span className="font-medium text-gray-800">{count} 票 ({pct}%)</span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* 投票操作 */}
                  {isParty ? (
                    <p className="text-xs text-gray-400 text-center py-1">你是纠纷当事人，不可参与本次投票</p>
                  ) : myVote ? (
                    <p className="text-sm text-green-600 text-center py-1">
                      ✅ 你已投票支持 {myVote === 'dispatcher' ? '派发方' : '接单方'}
                    </p>
                  ) : !currentUserId ? (
                    <Button variant="outline" className="w-full" onClick={() => router.push('/auth/login')}>
                      登录后参与投票
                    </Button>
                  ) : myScore >= 80 ? (
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        variant="outline"
                        className="border-orange-300 text-orange-600 hover:bg-orange-50"
                        disabled={!!voting}
                        onClick={() => handleVote(task.id, 'dispatcher')}
                      >
                        {voting === task.id + 'dispatcher' ? '投票中...' : '支持派发方'}
                      </Button>
                      <Button
                        variant="outline"
                        className="border-blue-300 text-blue-600 hover:bg-blue-50"
                        disabled={!!voting}
                        onClick={() => handleVote(task.id, 'receiver')}
                      >
                        {voting === task.id + 'receiver' ? '投票中...' : '支持接单方'}
                      </Button>
                    </div>
                  ) : (
                    <p className="text-sm text-yellow-600 text-center py-1">
                      你的信誉分为 {myScore} 分，需达到 80 分才能参与投票
                    </p>
                  )}

                  <div className="text-right">
                    <Link href={`/tasks/${task.id}`} className="text-xs text-blue-500 hover:underline">
                      查看任务详情 →
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
