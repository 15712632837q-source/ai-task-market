'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function AdminPage() {
  const router = useRouter()
  const [loading, setLoading]       = useState(true)
  const [denied, setDenied]         = useState(false)
  const [stats, setStats]           = useState<any>(null)
  const [recharges, setRecharges]   = useState<any[]>([])
  const [disputes, setDisputes]     = useState<any[]>([])
  const [allVotes, setAllVotes]     = useState<any[]>([])
  const [processing, setProcessing]                     = useState<string | null>(null)
  const [resolving, setResolving]                       = useState<string | null>(null)
  const [withdrawals, setWithdrawals]                   = useState<any[]>([])
  const [processingWithdrawal, setProcessingWithdrawal] = useState<string | null>(null)

  const loadAll = async (supabase: any) => {
    const [{ data: s }, { data: r }, { data: d }, { data: v }, { data: w }] = await Promise.all([
      supabase.rpc('get_platform_stats'),
      supabase.rpc('get_recharge_requests'),
      supabase.from('tasks').select('*, dispatcher:profiles!dispatcher_id(id,username), receiver:profiles!receiver_id(id,username)').eq('status', 'disputed').order('created_at', { ascending: false }),
      supabase.from('dispute_votes').select('task_id, vote'),
      supabase.rpc('get_withdrawal_requests'),
    ])
    setStats(s)
    setRecharges(Array.isArray(r) ? r : [])
    setDisputes(Array.isArray(d) ? d : [])
    setAllVotes(Array.isArray(v) ? v : [])
    setWithdrawals(Array.isArray(w) ? w : [])
  }

  useEffect(() => {
    const supabase = createClient()
    const adminId = process.env.NEXT_PUBLIC_ADMIN_ID ?? ''
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push('/auth/login'); return }
      if (!adminId || user.id !== adminId) { setDenied(true); setLoading(false); return }
      const timer = setTimeout(() => setLoading(false), 8000)
      await loadAll(supabase).catch(() => {}).finally(() => { clearTimeout(timer); setLoading(false) })
    })
  }, [router])

  const handleApprove = async (id: string) => {
    setProcessing(id)
    const supabase = createClient()
    await supabase.rpc('approve_recharge', { p_request_id: id })
    await loadAll(supabase)
    setProcessing(null)
  }

  const handleReject = async (id: string) => {
    setProcessing(id)
    const supabase = createClient()
    await supabase.rpc('reject_recharge', { p_request_id: id })
    await loadAll(supabase)
    setProcessing(null)
  }

  const handleApproveWithdrawal = async (id: string) => {
    setProcessingWithdrawal(id)
    const supabase = createClient()
    await supabase.rpc('approve_withdrawal', { p_request_id: id })
    await loadAll(supabase)
    setProcessingWithdrawal(null)
  }

  const handleRejectWithdrawal = async (id: string) => {
    setProcessingWithdrawal(id)
    const supabase = createClient()
    await supabase.rpc('reject_withdrawal', { p_request_id: id })
    await loadAll(supabase)
    setProcessingWithdrawal(null)
  }

  const handleResolve = async (taskId: string, winner: 'receiver' | 'dispatcher') => {
    setResolving(taskId)
    const supabase = createClient()
    if (winner === 'receiver') {
      await supabase.rpc('resolve_dispute_receiver_wins', { p_task_id: taskId })
    } else {
      await supabase.rpc('resolve_dispute_dispatcher_wins', { p_task_id: taskId })
    }
    await loadAll(supabase)
    setResolving(null)
  }

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

  if (denied) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center text-gray-400">
          <div className="text-5xl mb-4">🔒</div>
          <p className="text-lg font-medium text-gray-700">无权访问</p>
          <p className="text-sm mt-2">仅平台管理员可查看此页面</p>
        </div>
      </div>
    )
  }

  const records: any[] = stats?.records ?? []
  const pendingRecharges = recharges.filter(r => r.status === 'pending')
  const doneRecharges    = recharges.filter(r => r.status !== 'pending')

  const getVoteCounts = (taskId: string) => ({
    dispatcher: allVotes.filter(v => v.task_id === taskId && v.vote === 'dispatcher').length,
    receiver:   allVotes.filter(v => v.task_id === taskId && v.vote === 'receiver').length,
  })

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">平台管理后台</h1>
        <p className="text-gray-500 text-sm mt-1">仅平台管理员可见</p>
      </div>

      {/* 总收益卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-4xl font-bold text-green-600">¥{Number(stats?.total ?? 0).toFixed(2)}</div>
            <div className="text-sm text-gray-500 mt-2">平台总佣金收入</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-4xl font-bold text-blue-600">{pendingRecharges.length}</div>
            <div className="text-sm text-gray-500 mt-2">待审核充值申请</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-4xl font-bold text-purple-600">{withdrawals.filter(w => w.status === 'pending').length}</div>
            <div className="text-sm text-gray-500 mt-2">待审核提现申请</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-4xl font-bold text-red-600">{disputes.length}</div>
            <div className="text-sm text-gray-500 mt-2">纠纷中任务</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="recharge">
        <TabsList>
          <TabsTrigger value="recharge">
            充值审核
            {pendingRecharges.length > 0 && (
              <span className="ml-1.5 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">
                {pendingRecharges.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="withdrawal">
            提现审核
            {withdrawals.filter(w => w.status === 'pending').length > 0 && (
              <span className="ml-1.5 bg-purple-500 text-white text-xs rounded-full px-1.5 py-0.5">
                {withdrawals.filter(w => w.status === 'pending').length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="disputes">
            纠纷管理
            {disputes.length > 0 && (
              <span className="ml-1.5 bg-orange-500 text-white text-xs rounded-full px-1.5 py-0.5">
                {disputes.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="earnings">佣金明细</TabsTrigger>
        </TabsList>

        {/* 充值审核 */}
        <TabsContent value="recharge" className="mt-4 space-y-4">
          {pendingRecharges.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="text-4xl mb-3">✅</p>
              <p>暂无待审核申请</p>
            </div>
          ) : pendingRecharges.map(r => (
            <Card key={r.id} className="border-yellow-200">
              <CardContent className="pt-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <p className="font-medium text-gray-900">
                      <span className="text-blue-600">{r.username}</span> 申请充值
                      <span className="text-green-600 font-bold ml-2">¥{Number(r.amount).toFixed(2)}</span>
                    </p>
                    <p className="text-xs text-gray-400">{new Date(r.created_at).toLocaleString('zh-CN')}</p>
                    {r.proof_url && (
                      <a href={r.proof_url} target="_blank" rel="noopener noreferrer">
                        <img src={r.proof_url} alt="转账截图" className="mt-2 max-h-48 rounded-lg border border-gray-200 object-contain hover:opacity-90 transition" />
                      </a>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 min-w-[80px]">
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => handleApprove(r.id)}
                      disabled={processing === r.id}
                    >
                      通过
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-red-300 text-red-600 hover:bg-red-50"
                      onClick={() => handleReject(r.id)}
                      disabled={processing === r.id}
                    >
                      拒绝
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* 已处理记录 */}
          {doneRecharges.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm text-gray-500">已处理记录</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {doneRecharges.map(r => (
                    <div key={r.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">{r.username}</span>
                        <span className="text-gray-400 ml-2">¥{Number(r.amount).toFixed(2)}</span>
                        <span className="text-gray-400 ml-2 text-xs">{new Date(r.created_at).toLocaleDateString('zh-CN')}</span>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${r.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                        {r.status === 'approved' ? '已通过' : '已拒绝'}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* 提现审核 */}
        <TabsContent value="withdrawal" className="mt-4 space-y-4">
          {withdrawals.filter(w => w.status === 'pending').length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="text-4xl mb-3">✅</p>
              <p>暂无待审核提现申请</p>
            </div>
          ) : withdrawals.filter(w => w.status === 'pending').map(w => (
            <Card key={w.id} className="border-purple-200">
              <CardContent className="pt-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <p className="font-medium text-gray-900">
                      <span className="text-blue-600">{w.username}</span> 申请提现
                      <span className="text-purple-600 font-bold ml-2">¥{Number(w.amount).toFixed(2)}</span>
                    </p>
                    <p className="text-sm text-gray-600">
                      打款到 <span className="font-medium">{w.pay_type === 'alipay' ? '支付宝' : '微信'}</span>：
                      <span className="font-mono text-gray-800 select-all ml-1">{w.pay_account}</span>
                    </p>
                    {w.note && <p className="text-xs text-gray-400">备注：{w.note}</p>}
                    <p className="text-xs text-gray-400">{new Date(w.created_at).toLocaleString('zh-CN')}</p>
                  </div>
                  <div className="flex flex-col gap-2 min-w-[80px]">
                    <Button size="sm" className="bg-green-600 hover:bg-green-700"
                      onClick={() => handleApproveWithdrawal(w.id)} disabled={processingWithdrawal === w.id}>
                      已打款
                    </Button>
                    <Button size="sm" variant="outline" className="border-red-300 text-red-600 hover:bg-red-50"
                      onClick={() => handleRejectWithdrawal(w.id)} disabled={processingWithdrawal === w.id}>
                      拒绝
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {withdrawals.filter(w => w.status !== 'pending').length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm text-gray-500">已处理记录</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {withdrawals.filter(w => w.status !== 'pending').map(w => (
                    <div key={w.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">{w.username}</span>
                        <span className="text-gray-400 ml-2">{w.pay_type === 'alipay' ? '支付宝' : '微信'} {w.pay_account}</span>
                        <span className="text-gray-400 ml-2">¥{Number(w.amount).toFixed(2)}</span>
                        <span className="text-gray-400 ml-2 text-xs">{new Date(w.created_at).toLocaleDateString('zh-CN')}</span>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${w.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                        {w.status === 'approved' ? '已打款' : '已拒绝'}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* 纠纷管理 */}
        <TabsContent value="disputes" className="mt-4 space-y-4">
          {disputes.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="text-4xl mb-3">✅</p>
              <p>暂无纠纷任务</p>
            </div>
          ) : disputes.map(task => {
            const vc = getVoteCounts(task.id)
            const total = vc.dispatcher + vc.receiver
            return (
              <Card key={task.id} className="border-red-200">
                <CardContent className="pt-5 space-y-4">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-gray-900">{task.title}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{new Date(task.created_at).toLocaleString('zh-CN')}</p>
                      </div>
                      <span className="text-lg font-bold text-blue-600 shrink-0">¥{Number(task.budget).toFixed(0)}</span>
                    </div>
                    <div className="flex gap-4 mt-2 text-sm">
                      <span className="text-gray-600">派发方：<span className="font-medium">{task.dispatcher?.username}</span></span>
                      <span className="text-gray-600">接单方：<span className="font-medium">{task.receiver?.username}</span></span>
                    </div>
                  </div>

                  {/* 投票情况 */}
                  <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                    <p className="text-xs font-medium text-gray-500">社区投票结果（共 {total} 票）</p>
                    {[
                      { label: `派发方（${task.dispatcher?.username}）`, count: vc.dispatcher, color: 'bg-orange-400' },
                      { label: `接单方（${task.receiver?.username}）`,   count: vc.receiver,   color: 'bg-blue-500' },
                    ].map(({ label, count, color }) => {
                      const pct = total === 0 ? 50 : Math.round((count / total) * 100)
                      return (
                        <div key={label}>
                          <div className="flex justify-between text-xs text-gray-600 mb-1">
                            <span>{label}</span>
                            <span>{count} 票 ({pct}%)</span>
                          </div>
                          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* 强制裁决按钮 */}
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-2">管理员强制裁决</p>
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        size="sm"
                        className="bg-orange-500 hover:bg-orange-600 text-white"
                        onClick={() => handleResolve(task.id, 'dispatcher')}
                        disabled={resolving === task.id}
                      >
                        {resolving === task.id ? '处理中...' : `派发方胜（取消任务）`}
                      </Button>
                      <Button
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                        onClick={() => handleResolve(task.id, 'receiver')}
                        disabled={resolving === task.id}
                      >
                        {resolving === task.id ? '处理中...' : `接单方胜（完成付款）`}
                      </Button>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">裁决后将自动调整双方信誉分（胜方 +3，败方 -5）</p>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </TabsContent>

        {/* 佣金明细 */}
        <TabsContent value="earnings" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">佣金明细（5% 平台费）</CardTitle></CardHeader>
            <CardContent>
              {records.length === 0 ? (
                <p className="text-center text-gray-400 py-8">暂无收益记录</p>
              ) : (
                <div className="space-y-3">
                  {records.map((r: any, i: number) => (
                    <div key={i} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                      <div>
                        <p className="font-medium text-gray-800 text-sm">{r.task_title ?? '未知任务'}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{new Date(r.created_at).toLocaleString('zh-CN')}</p>
                      </div>
                      <span className="font-bold text-green-600">+¥{Number(r.amount).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
