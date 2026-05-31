'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const statusMap: Record<string, { label: string; color: string }> = {
  open:        { label: '招募中', color: 'bg-green-100 text-green-700' },
  in_progress: { label: '进行中', color: 'bg-blue-100 text-blue-700' },
  submitted:   { label: '待确认', color: 'bg-yellow-100 text-yellow-700' },
  completed:   { label: '已完成', color: 'bg-gray-100 text-gray-600' },
  disputed:    { label: '纠纷中', color: 'bg-red-100 text-red-700' },
  cancelled:   { label: '已取消', color: 'bg-gray-100 text-gray-400' },
}

const rechargeStatusMap: Record<string, { label: string; color: string }> = {
  pending:  { label: '审核中', color: 'bg-yellow-100 text-yellow-700' },
  approved: { label: '已到账', color: 'bg-green-100 text-green-700' },
  rejected: { label: '已拒绝', color: 'bg-red-100 text-red-700' },
}

export default function DashboardPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading]       = useState(true)
  const [userId, setUserId]         = useState('')
  const [profile, setProfile]       = useState<any>(null)
  const [userEmail, setUserEmail]   = useState('')
  const [myTasks, setMyTasks]       = useState<any[]>([])
  const [myOrders, setMyOrders]     = useState<any[]>([])
  const [transactions, setTransactions] = useState<any[]>([])
  const [rechargeHistory, setRechargeHistory] = useState<any[]>([])

  // 个人资料编辑
  const [newUsername, setNewUsername] = useState('')
  const [newBio, setNewBio]           = useState('')
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileMsg, setProfileMsg]   = useState('')

  // 充值表单
  const [amount, setAmount]         = useState('')
  const [proofUrl, setProofUrl]     = useState('')
  const [uploading, setUploading]   = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [rechargeMsg, setRechargeMsg] = useState('')

  const loadData = async (uid: string) => {
    const supabase = createClient()
    const [r0, r1, r2, r3, r4] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', uid).single(),
      supabase.from('tasks').select('*').eq('dispatcher_id', uid).order('created_at', { ascending: false }),
      supabase.from('tasks').select('*, dispatcher:profiles!dispatcher_id(username)').eq('receiver_id', uid).order('created_at', { ascending: false }),
      supabase.from('wallet_transactions').select('*').eq('user_id', uid).order('created_at', { ascending: false }).limit(20),
      supabase.from('recharge_requests').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
    ])
    const prof = r0.data
    setProfile(prof)
    setNewUsername(prof?.username ?? '')
    setNewBio(prof?.bio ?? '')
    setMyTasks(r1.data ?? [])
    setMyOrders(r2.data ?? [])
    setTransactions(r3.data ?? [])
    setRechargeHistory(r4.data ?? [])
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newUsername.trim()) { setProfileMsg('用户名不能为空'); return }
    setProfileSaving(true)
    setProfileMsg('')
    const supabase = createClient()
    const { error } = await supabase.from('profiles').update({
      username: newUsername.trim(),
      bio: newBio.trim(),
    }).eq('id', userId)
    if (error) {
      setProfileMsg('保存失败，请重试')
    } else {
      setProfileMsg('保存成功')
      await loadData(userId)
    }
    setProfileSaving(false)
  }

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push('/auth/login'); return }
      setUserEmail(user.email ?? '')
      setUserId(user.id)
      const timeout = new Promise<void>(resolve => setTimeout(resolve, 8000))
      await Promise.race([loadData(user.id), timeout]).catch(() => {})
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [router])

  // 上传转账截图
  const handleProofUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const supabase = createClient()
    const fileName = `recharge-proofs/${userId}/${Date.now()}.${file.name.split('.').pop()}`
    const { data, error } = await supabase.storage.from('task-files').upload(fileName, file, { upsert: true })
    if (!error && data) {
      const { data: urlData } = supabase.storage.from('task-files').getPublicUrl(data.path)
      setProofUrl(urlData.publicUrl)
    }
    setUploading(false)
  }

  // 提交充值申请
  const handleRecharge = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!amount || Number(amount) <= 0) { setRechargeMsg('请输入有效金额'); return }
    if (!proofUrl) { setRechargeMsg('请上传转账截图'); return }
    setSubmitting(true)
    const supabase = createClient()
    const { error } = await supabase.from('recharge_requests').insert({
      user_id: userId,
      amount: Number(amount),
      proof_url: proofUrl,
    })
    if (error) {
      setRechargeMsg('提交失败，请重试')
    } else {
      setRechargeMsg('申请已提交，管理员审核后自动到账')
      setAmount('')
      setProofUrl('')
      if (fileInputRef.current) fileInputRef.current.value = ''
      await loadData(userId)
    }
    setSubmitting(false)
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

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* 用户信息 */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-gray-900">{profile?.username}</h1>
            <p className="text-gray-400 text-sm mt-0.5">{userEmail}</p>
            {profile?.bio && (
              <p className="text-gray-600 text-sm mt-2 leading-relaxed">{profile.bio}</p>
            )}
          </div>
          <div className="flex gap-6 shrink-0">
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-500">★ {profile?.score}</div>
              <div className="text-xs text-gray-400 mt-1">信誉分</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">¥{Number(profile?.wallet_balance ?? 0).toFixed(2)}</div>
              <div className="text-xs text-gray-400 mt-1">钱包余额</div>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="my-tasks">
        <TabsList>
          <TabsTrigger value="my-tasks">我发布的任务</TabsTrigger>
          <TabsTrigger value="my-orders">我接的单</TabsTrigger>
          <TabsTrigger value="wallet">钱包流水</TabsTrigger>
          <TabsTrigger value="recharge">充值钱包</TabsTrigger>
          <TabsTrigger value="profile">个人资料</TabsTrigger>
        </TabsList>

        {/* 我发布的任务 */}
        <TabsContent value="my-tasks" className="mt-4 space-y-3">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">共 {myTasks.length} 个任务</p>
            <Link href="/tasks/new">
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700">发布新任务</Button>
            </Link>
          </div>
          {myTasks.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="text-4xl mb-3">📋</p>
              <p>还没有发布过任务</p>
            </div>
          ) : myTasks.map(task => (
            <Link href={`/tasks/${task.id}`} key={task.id}>
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:border-blue-200 transition-all flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{task.title}</p>
                  <p className="text-sm text-gray-400 mt-1">¥{Number(task.budget).toFixed(0)} · {new Date(task.created_at).toLocaleDateString('zh-CN')}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusMap[task.status]?.color}`}>
                  {statusMap[task.status]?.label}
                </span>
              </div>
            </Link>
          ))}
        </TabsContent>

        {/* 我接的单 */}
        <TabsContent value="my-orders" className="mt-4 space-y-3">
          <p className="text-sm text-gray-500">共 {myOrders.length} 个订单</p>
          {myOrders.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="text-4xl mb-3">🎯</p>
              <p>还没有接过单，去任务大厅看看吧</p>
              <Link href="/tasks">
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 mt-3">浏览任务</Button>
              </Link>
            </div>
          ) : myOrders.map(task => (
            <Link href={`/tasks/${task.id}`} key={task.id}>
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:border-blue-200 transition-all flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{task.title}</p>
                  <p className="text-sm text-gray-400 mt-1">
                    来自 {(task as any).dispatcher?.username} · ¥{Number(task.budget).toFixed(0)}
                  </p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusMap[task.status]?.color}`}>
                  {statusMap[task.status]?.label}
                </span>
              </div>
            </Link>
          ))}
        </TabsContent>

        {/* 钱包流水 */}
        <TabsContent value="wallet" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">最近流水</CardTitle></CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <p className="text-center text-gray-400 py-8">暂无流水记录</p>
              ) : (
                <div className="space-y-3">
                  {transactions.map(tx => (
                    <div key={tx.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-gray-700">{tx.description}</p>
                        <p className="text-xs text-gray-400">{new Date(tx.created_at).toLocaleString('zh-CN')}</p>
                      </div>
                      <span className={`font-medium ${Number(tx.amount) >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {Number(tx.amount) >= 0 ? '+' : ''}¥{Number(tx.amount).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 充值钱包 */}
        <TabsContent value="recharge" className="mt-4 space-y-4">
          {/* 收款信息 */}
          <Card>
            <CardContent className="pt-5 space-y-2">
              <p className="font-medium text-gray-800">转账方式</p>
              <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 space-y-1">
                <p>微信：<span className="font-medium select-all">15712632837</span></p>
                <p>支付宝：<span className="font-medium select-all">15712632837</span></p>
                <p className="text-gray-400 text-xs mt-2">转账时备注"充值"，转账后上传截图提交申请，管理员确认后自动到账。</p>
              </div>
            </CardContent>
          </Card>

          {/* 充值申请表单 */}
          <Card>
            <CardHeader><CardTitle className="text-base">提交充值申请</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={handleRecharge} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">充值金额（元）</label>
                  <Input
                    type="number"
                    min="1"
                    placeholder="请输入转账金额"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">上传转账截图</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleProofUpload}
                    className="hidden"
                    id="proof-upload"
                  />
                  <label
                    htmlFor="proof-upload"
                    className="flex flex-col items-center gap-2 border-2 border-dashed border-gray-200 rounded-xl p-4 cursor-pointer hover:border-blue-300 transition"
                  >
                    {proofUrl ? (
                      <img src={proofUrl} alt="转账截图" className="max-h-40 rounded-lg object-contain" />
                    ) : (
                      <>
                        <span className="text-3xl">🖼️</span>
                        <span className="text-sm text-gray-500">{uploading ? '上传中...' : '点击上传转账截图'}</span>
                      </>
                    )}
                  </label>
                </div>

                {rechargeMsg && (
                  <p className={`text-sm px-3 py-2 rounded-lg ${rechargeMsg.includes('失败') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
                    {rechargeMsg}
                  </p>
                )}

                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={submitting || uploading}>
                  {submitting ? '提交中...' : '提交充值申请'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* 历史申请 */}
          {rechargeHistory.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">申请记录</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {rechargeHistory.map(r => (
                    <div key={r.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-gray-700">充值 ¥{Number(r.amount).toFixed(2)}</p>
                        <p className="text-xs text-gray-400">{new Date(r.created_at).toLocaleString('zh-CN')}</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${rechargeStatusMap[r.status]?.color}`}>
                        {rechargeStatusMap[r.status]?.label}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* 个人资料 */}
        <TabsContent value="profile" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">编辑个人资料</CardTitle>
              <p className="text-sm text-gray-500">填写简介让派发方/接单方快速了解你的能力和背景</p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveProfile} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">用户名</label>
                  <Input
                    value={newUsername}
                    onChange={e => setNewUsername(e.target.value)}
                    placeholder="你的昵称"
                    maxLength={20}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">个人简介</label>
                  <Textarea
                    value={newBio}
                    onChange={e => setNewBio(e.target.value)}
                    placeholder="介绍一下自己的技能、经验或擅长领域，例如：5年Python开发经验，擅长数据分析和自动化脚本..."
                    className="min-h-28 resize-none"
                    maxLength={200}
                  />
                  <p className="text-xs text-gray-400 text-right">{newBio.length}/200</p>
                </div>
                {profileMsg && (
                  <p className={`text-sm px-3 py-2 rounded-lg ${profileMsg.includes('失败') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
                    {profileMsg}
                  </p>
                )}
                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={profileSaving}>
                  {profileSaving ? '保存中...' : '保存资料'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
