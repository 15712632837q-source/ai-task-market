'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const statusMap: Record<string, { label: string; color: string }> = {
  open:        { label: '招募中',  color: 'bg-green-500/15 text-green-400' },
  in_progress: { label: '进行中',  color: 'bg-blue-500/15 text-blue-400' },
  submitted:   { label: '待确认',  color: 'bg-yellow-500/15 text-yellow-400' },
  completed:   { label: '已完成',  color: 'bg-gray-500/15 text-gray-400' },
  disputed:    { label: '纠纷中',  color: 'bg-red-500/15 text-red-400' },
  cancelled:   { label: '已取消',  color: 'bg-gray-500/10 text-gray-500' },
}

const rechargeStatusMap: Record<string, { label: string; color: string }> = {
  pending:  { label: '审核中', color: 'bg-yellow-500/15 text-yellow-400' },
  approved: { label: '已到账', color: 'bg-green-500/15 text-green-400' },
  rejected: { label: '已拒绝', color: 'bg-red-500/15 text-red-400' },
}

const TABS = [
  { key: 'my-tasks', label: '我发布的任务' },
  { key: 'my-orders', label: '我接的单' },
  { key: 'wallet', label: '钱包流水' },
  { key: 'recharge', label: '充值钱包' },
  { key: 'profile', label: '个人资料' },
]

export default function DashboardPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading]       = useState(true)
  const [tab, setTab]               = useState('my-tasks')
  const [userId, setUserId]         = useState('')
  const [profile, setProfile]       = useState<any>(null)
  const [userEmail, setUserEmail]   = useState('')
  const [myTasks, setMyTasks]       = useState<any[]>([])
  const [myOrders, setMyOrders]     = useState<any[]>([])
  const [transactions, setTransactions] = useState<any[]>([])
  const [rechargeHistory, setRechargeHistory] = useState<any[]>([])

  const [newUsername, setNewUsername] = useState('')
  const [newBio, setNewBio]           = useState('')
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileMsg, setProfileMsg]   = useState('')

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
    setProfileSaving(true); setProfileMsg('')
    const supabase = createClient()
    const { error } = await supabase.from('profiles').update({ username: newUsername.trim(), bio: newBio.trim() }).eq('id', userId)
    if (error) { setProfileMsg('保存失败，请重试') } else { setProfileMsg('保存成功'); await loadData(userId) }
    setProfileSaving(false)
  }

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push('/auth/login'); return }
      setUserEmail(user.email ?? '')
      setUserId(user.id)
      await Promise.race([loadData(user.id), new Promise<void>(r => setTimeout(r, 8000))]).catch(() => {})
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [router])

  const handleProofUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
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

  const handleRecharge = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!amount || Number(amount) <= 0) { setRechargeMsg('请输入有效金额'); return }
    if (!proofUrl) { setRechargeMsg('请上传转账截图'); return }
    setSubmitting(true)
    const supabase = createClient()
    const { error } = await supabase.from('recharge_requests').insert({ user_id: userId, amount: Number(amount), proof_url: proofUrl })
    if (error) { setRechargeMsg('提交失败，请重试') } else {
      setRechargeMsg('申请已提交，管理员审核后自动到账')
      setAmount(''); setProofUrl('')
      if (fileInputRef.current) fileInputRef.current.value = ''
      await loadData(userId)
    }
    setSubmitting(false)
  }

  // ── dark input / textarea shared classes ──
  const inputCls = "w-full px-3 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 transition-colors text-sm"

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center text-gray-600">
        <div className="text-4xl mb-3 animate-pulse">⏳</div>
        <p>加载中...</p>
      </div>
    </div>
  )

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">

      {/* 用户信息卡 */}
      <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-white">{profile?.username}</h1>
            <p className="text-gray-500 text-sm mt-0.5">{userEmail}</p>
            {profile?.bio && <p className="text-gray-400 text-sm mt-2 leading-relaxed">{profile.bio}</p>}
          </div>
          <div className="flex gap-6 shrink-0">
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-400">★ {profile?.score}</div>
              <div className="text-xs text-gray-500 mt-1">信誉分</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                ¥{Number(profile?.wallet_balance ?? 0).toFixed(2)}
              </div>
              <div className="text-xs text-gray-500 mt-1">钱包余额</div>
            </div>
          </div>
        </div>
      </div>

      {/* 自定义 Tabs */}
      <div>
        <div className="flex gap-1 bg-white/[0.03] border border-white/[0.07] rounded-xl p-1 flex-wrap">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 min-w-fit px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === t.key
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-md'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="mt-4">

          {/* 我发布的任务 */}
          {tab === 'my-tasks' && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-500">共 {myTasks.length} 个任务</p>
                <Link href="/tasks/new">
                  <button className="text-sm px-4 py-1.5 rounded-lg font-semibold bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:opacity-90 transition-opacity">
                    发布新任务
                  </button>
                </Link>
              </div>
              {myTasks.length === 0 ? (
                <div className="text-center py-16 text-gray-600">
                  <p className="text-4xl mb-3">📋</p><p>还没有发布过任务</p>
                </div>
              ) : myTasks.map(task => (
                <Link href={`/tasks/${task.id}`} key={task.id}>
                  <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 hover:bg-white/[0.05] hover:border-blue-500/30 transition-all flex items-center justify-between">
                    <div>
                      <p className="font-medium text-white">{task.title}</p>
                      <p className="text-sm text-gray-500 mt-1">¥{Number(task.budget).toFixed(0)} · {new Date(task.created_at).toLocaleDateString('zh-CN')}</p>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusMap[task.status]?.color}`}>
                      {statusMap[task.status]?.label}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* 我接的单 */}
          {tab === 'my-orders' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-500">共 {myOrders.length} 个订单</p>
              {myOrders.length === 0 ? (
                <div className="text-center py-16 text-gray-600">
                  <p className="text-4xl mb-3">🎯</p>
                  <p className="mb-3">还没有接过单，去任务大厅看看吧</p>
                  <Link href="/tasks">
                    <button className="text-sm px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:opacity-90 transition-opacity">浏览任务</button>
                  </Link>
                </div>
              ) : myOrders.map(task => (
                <Link href={`/tasks/${task.id}`} key={task.id}>
                  <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 hover:bg-white/[0.05] hover:border-blue-500/30 transition-all flex items-center justify-between">
                    <div>
                      <p className="font-medium text-white">{task.title}</p>
                      <p className="text-sm text-gray-500 mt-1">来自 {(task as any).dispatcher?.username} · ¥{Number(task.budget).toFixed(0)}</p>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusMap[task.status]?.color}`}>
                      {statusMap[task.status]?.label}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* 钱包流水 */}
          {tab === 'wallet' && (
            <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-white mb-4">最近流水</h3>
              {transactions.length === 0 ? (
                <p className="text-center text-gray-600 py-8">暂无流水记录</p>
              ) : (
                <div className="space-y-3">
                  {transactions.map(tx => (
                    <div key={tx.id} className="flex items-center justify-between py-2.5 border-b border-white/[0.05] last:border-0">
                      <div>
                        <p className="text-sm font-medium text-gray-300">{tx.description}</p>
                        <p className="text-xs text-gray-600 mt-0.5">{new Date(tx.created_at).toLocaleString('zh-CN')}</p>
                      </div>
                      <span className={`font-semibold text-sm ${Number(tx.amount) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {Number(tx.amount) >= 0 ? '+' : ''}¥{Number(tx.amount).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 充值钱包 */}
          {tab === 'recharge' && (
            <div className="space-y-4">
              <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5">
                <p className="font-medium text-white mb-3">转账方式</p>
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 text-sm space-y-1.5">
                  <p className="text-gray-400">微信：<span className="font-medium text-white select-all">15712632837</span></p>
                  <p className="text-gray-400">支付宝：<span className="font-medium text-white select-all">15712632837</span></p>
                  <p className="text-gray-600 text-xs mt-2">转账时备注"充值"，转账后上传截图提交申请，管理员确认后自动到账。</p>
                </div>
              </div>

              <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-white mb-4">提交充值申请</h3>
                <form onSubmit={handleRecharge} className="space-y-4">
                  <div>
                    <label className="text-sm text-gray-400 block mb-1.5">充值金额（元）</label>
                    <input type="number" min="1" placeholder="请输入转账金额" value={amount}
                      onChange={e => setAmount(e.target.value)} required className={inputCls} />
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 block mb-1.5">上传转账截图</label>
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleProofUpload} className="hidden" id="proof-upload" />
                    <label htmlFor="proof-upload" className="flex flex-col items-center gap-2 border-2 border-dashed border-white/10 rounded-xl p-4 cursor-pointer hover:border-blue-500/40 transition">
                      {proofUrl ? (
                        <img src={proofUrl} alt="转账截图" className="max-h-40 rounded-lg object-contain" />
                      ) : (
                        <><span className="text-3xl">🖼️</span><span className="text-sm text-gray-600">{uploading ? '上传中...' : '点击上传转账截图'}</span></>
                      )}
                    </label>
                  </div>
                  {rechargeMsg && (
                    <p className={`text-sm px-3 py-2 rounded-lg ${rechargeMsg.includes('失败') ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>
                      {rechargeMsg}
                    </p>
                  )}
                  <button type="submit" disabled={submitting || uploading}
                    className="w-full py-2.5 rounded-xl font-semibold bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:opacity-90 transition-opacity disabled:opacity-50">
                    {submitting ? '提交中...' : '提交充值申请'}
                  </button>
                </form>
              </div>

              {rechargeHistory.length > 0 && (
                <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5">
                  <h3 className="text-sm font-semibold text-white mb-4">申请记录</h3>
                  <div className="space-y-3">
                    {rechargeHistory.map(r => (
                      <div key={r.id} className="flex items-center justify-between py-2.5 border-b border-white/[0.05] last:border-0">
                        <div>
                          <p className="text-sm font-medium text-gray-300">充值 ¥{Number(r.amount).toFixed(2)}</p>
                          <p className="text-xs text-gray-600 mt-0.5">{new Date(r.created_at).toLocaleString('zh-CN')}</p>
                        </div>
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${rechargeStatusMap[r.status]?.color}`}>
                          {rechargeStatusMap[r.status]?.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 个人资料 */}
          {tab === 'profile' && (
            <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-white mb-1">编辑个人资料</h3>
              <p className="text-xs text-gray-500 mb-5">填写简介让派发方/接单方快速了解你的能力和背景</p>
              <form onSubmit={handleSaveProfile} className="space-y-5">
                <div>
                  <label className="text-sm text-gray-400 block mb-1.5">用户名</label>
                  <input value={newUsername} onChange={e => setNewUsername(e.target.value)}
                    placeholder="你的昵称" maxLength={20} className={inputCls} />
                </div>
                <div>
                  <label className="text-sm text-gray-400 block mb-1.5">个人简介</label>
                  <textarea value={newBio} onChange={e => setNewBio(e.target.value)}
                    placeholder="介绍一下自己的技能、经验或擅长领域..." maxLength={200}
                    className={`${inputCls} min-h-28 resize-none`} />
                  <p className="text-xs text-gray-600 text-right mt-1">{newBio.length}/200</p>
                </div>
                {profileMsg && (
                  <p className={`text-sm px-3 py-2 rounded-lg ${profileMsg.includes('失败') ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>
                    {profileMsg}
                  </p>
                )}
                <button type="submit" disabled={profileSaving}
                  className="w-full py-2.5 rounded-xl font-semibold bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:opacity-90 transition-opacity disabled:opacity-50">
                  {profileSaving ? '保存中...' : '保存资料'}
                </button>
              </form>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
