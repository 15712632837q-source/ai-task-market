'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const categoryMap: Record<string, string> = {
  writing: '📝 写作/文案',
  code: '💻 代码/技术',
  image: '🎨 图像/视觉',
  research: '🔍 研究/信息',
}

const statusMap: Record<string, { label: string; color: string }> = {
  open:        { label: '招募中',  color: 'bg-green-100 text-green-700' },
  in_progress: { label: '进行中',  color: 'bg-blue-100 text-blue-700' },
  submitted:   { label: '待确认',  color: 'bg-yellow-100 text-yellow-700' },
  completed:   { label: '已完成',  color: 'bg-gray-100 text-gray-600' },
  disputed:    { label: '纠纷中',  color: 'bg-red-100 text-red-700' },
  cancelled:   { label: '已取消',  color: 'bg-gray-100 text-gray-500' },
}

function FilePreview({ url }: { url: string }) {
  const ext = url.split('?')[0].split('.').pop()?.toLowerCase() ?? ''
  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)
  const isVideo = ['mp4', 'mov', 'avi', 'webm'].includes(ext)
  const fileName = decodeURIComponent(url.split('/').pop()?.split('?')[0] ?? '文件')

  if (isImage) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer">
        <img src={url} alt={fileName} className="max-h-48 rounded-lg border border-gray-200 object-contain hover:opacity-90 transition" />
      </a>
    )
  }
  if (isVideo) {
    return (
      <video controls className="max-h-48 rounded-lg border border-gray-200 w-full">
        <source src={url} />
        你的浏览器不支持视频播放
      </video>
    )
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 hover:bg-blue-50 hover:border-blue-200 transition text-sm text-blue-600"
    >
      📎 {fileName}
    </a>
  )
}

export default function TaskDetail({ taskId }: { taskId: string }) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [task, setTask]               = useState<any>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [applications, setApplications] = useState<any[]>([])
  const [submission, setSubmission]   = useState<any>(null)
  const [conversations, setConversations] = useState<any[]>([])
  const [voteCounts, setVoteCounts]   = useState({ dispatcher: 0, receiver: 0 })
  const [myVote, setMyVote]           = useState<string | null>(null)
  const [myScore, setMyScore]         = useState(0)
  const [myBalance, setMyBalance]     = useState<number | null>(null)
  const [reviews, setReviews]         = useState<any[]>([])
  const [myRating, setMyRating]       = useState(0)
  const [myComment, setMyComment]     = useState('')
  const [reviewSaving, setReviewSaving] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)

  const [submitContent, setSubmitContent] = useState('')
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; url: string }[]>([])
  const [uploading, setUploading]       = useState(false)
  const [loading, setLoading]           = useState(false)
  const [message, setMessage]           = useState('')
  const [editingBudget, setEditingBudget] = useState(false)
  const [newBudget, setNewBudget]         = useState('')

  const loadData = async () => {
    const supabase = createClient()

    // 并行请求：当前用户 + 任务数据
    const [{ data: { user } }, { data: taskData }] = await Promise.all([
      supabase.auth.getUser(),
      supabase
        .from('tasks')
        .select('*, dispatcher:profiles!dispatcher_id(id,username,score,bio), receiver:profiles!receiver_id(id,username,score,bio)')
        .eq('id', taskId)
        .single(),
    ])

    if (!taskData) { router.push('/tasks'); return }

    setTask(taskData)
    setCurrentUserId(user?.id ?? null)

    // 有登录用户才查提交、私信、投票
    if (user?.id) {
      const [{ data: sub }, { data: msgs }, { data: votes }, { data: myProfile }, { data: revs }] = await Promise.all([
        supabase.from('submissions').select('*').eq('task_id', taskId).maybeSingle(),
        supabase.from('messages').select('sender_id, receiver_id, profiles!sender_id(username)').eq('task_id', taskId),
        supabase.from('dispute_votes').select('vote, voter_id').eq('task_id', taskId),
        supabase.from('profiles').select('score, wallet_balance').eq('id', user.id).single(),
        supabase.from('reviews').select('*, reviewer:profiles!reviewer_id(username)').eq('task_id', taskId),
      ])
      setSubmission(sub)
      setMyScore(myProfile?.score ?? 0)
      if (user.id === taskData.dispatcher_id) setMyBalance(Number(myProfile?.wallet_balance ?? 0))
      setReviews(revs ?? [])

      if (votes) {
        setVoteCounts({
          dispatcher: votes.filter((v: any) => v.vote === 'dispatcher').length,
          receiver:   votes.filter((v: any) => v.vote === 'receiver').length,
        })
        setMyVote(votes.find((v: any) => v.voter_id === user.id)?.vote ?? null)
      }

      // 派发方：整理出给自己发过消息的人
      if (user.id === taskData.dispatcher_id && msgs) {
        const seen = new Set<string>()
        const convos = msgs
          .filter((m: any) => m.receiver_id === user.id)
          .filter((m: any) => { if (seen.has(m.sender_id)) return false; seen.add(m.sender_id); return true })
        setConversations(convos)
      }
    }

    setPageLoading(false)
  }

  useEffect(() => {
    const done = () => setPageLoading(false)
    const timer = setTimeout(done, 8000)
    loadData().catch(() => {}).finally(() => { clearTimeout(timer); done() })

    // Realtime 订阅：任务状态变化时自动刷新（有人接单、提交成果等）
    const supabase = createClient()
    const channel = supabase
      .channel(`task-updates:${taskId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'tasks',
        filter: `id=eq.${taskId}`,
      }, () => { loadData().catch(() => {}) })
      .subscribe()

    return () => {
      clearTimeout(timer)
      channel.unsubscribe()
    }
  }, [taskId])

  const isDispatcher = currentUserId === task?.dispatcher_id
  const isReceiver   = currentUserId === task?.receiver_id
  const alreadyApplied = applications.some(a => a.applicant_id === currentUserId)

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    setUploading(true)
    const supabase = createClient()
    for (const file of Array.from(files)) {
      const ext = file.name.split('.').pop()
      const fileName = `${taskId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { data, error } = await supabase.storage
        .from('task-files')
        .upload(fileName, file, { upsert: false })
      if (!error && data) {
        const { data: urlData } = supabase.storage.from('task-files').getPublicUrl(data.path)
        setUploadedFiles(prev => [...prev, { name: file.name, url: urlData.publicUrl }])
      }
    }
    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removeFile = (url: string) => setUploadedFiles(prev => prev.filter(f => f.url !== url))

  const handleGrab = async () => {
    if (!currentUserId) { router.push('/auth/login'); return }
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.from('tasks').update({
      receiver_id: currentUserId,
      status: 'in_progress',
    }).eq('id', taskId)
    if (!error) {
      setMessage('抢单成功！请尽快完成任务。')
      await loadData()
    }
    setLoading(false)
  }

  const handleCancel = async () => {
    if (!window.confirm('确认取消该任务？取消后无法恢复。')) return
    setLoading(true)
    const supabase = createClient()
    await supabase.from('tasks').update({ status: 'cancelled' }).eq('id', taskId)
    setMessage('任务已取消')
    await loadData()
    setLoading(false)
  }

  const handleUpdateBudget = async () => {
    const val = parseFloat(newBudget)
    if (isNaN(val) || val <= 0) return
    setLoading(true)
    const supabase = createClient()
    await supabase.from('tasks').update({ budget: val }).eq('id', taskId)
    setEditingBudget(false)
    setNewBudget('')
    setMessage('报酬已更新')
    await loadData()
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!submitContent && uploadedFiles.length === 0) {
      setMessage('请填写成果内容或上传附件')
      return
    }
    setLoading(true)
    const supabase = createClient()
    // 已有提交记录则更新，否则新增（支持修改后重提交）
    if (submission) {
      await supabase.from('submissions').update({
        content: submitContent,
        attachments: uploadedFiles.map(f => f.url),
      }).eq('task_id', taskId)
    } else {
      await supabase.from('submissions').insert({
        task_id: taskId,
        content: submitContent,
        attachments: uploadedFiles.map(f => f.url),
      })
    }
    await supabase.from('tasks').update({ status: 'submitted' }).eq('id', taskId)
    setMessage('成果已提交，等待派发方确认。')
    await loadData()
    setLoading(false)
  }

  const handleConfirm = async () => {
    setLoading(true)
    const supabase = createClient()

    const { error } = await supabase.rpc('complete_task_payment', {
      p_task_id: taskId,
      p_dispatcher_id: task.dispatcher_id,
      p_receiver_id: task.receiver_id,
      p_amount: Number(task.budget),
    })

    if (error) {
      setMessage('付款失败：' + (error.message.includes('余额不足') ? '钱包余额不足，请先充值' : error.message))
      setLoading(false)
      return
    }

    await supabase.from('tasks').update({ status: 'completed' }).eq('id', taskId)
    await supabase.rpc('increment_score', { user_id: task.dispatcher_id, amount: 2 })
    await supabase.rpc('increment_score', { user_id: task.receiver_id, amount: 2 })
    setMessage('任务已确认完成！款项已转给接单方。')
    await loadData()
    setLoading(false)
  }

  const handleReview = async () => {
    if (!myRating || !currentUserId) return
    setReviewSaving(true)
    const supabase = createClient()
    const revieweeId = isDispatcher ? task.receiver_id : task.dispatcher_id
    const { error } = await supabase.from('reviews').insert({
      task_id: taskId,
      reviewer_id: currentUserId,
      reviewee_id: revieweeId,
      rating: myRating,
      comment: myComment.trim(),
    })
    if (!error) {
      setMessage('评价已提交')
      await loadData()
    }
    setReviewSaving(false)
  }

  const handleVote = async (side: 'dispatcher' | 'receiver') => {
    if (!currentUserId) return
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.from('dispute_votes').insert({
      task_id: taskId,
      voter_id: currentUserId,
      vote: side,
    })
    if (error) {
      setMessage(error.message.includes('unique') ? '你已经投过票了' : '投票失败，请确认信誉分是否达到 80 分')
    } else {
      setMyVote(side)
      await loadData()
    }
    setLoading(false)
  }

  if (pageLoading) {
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
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧主内容 */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-4 flex-wrap">
                <span className="text-sm text-gray-500">{categoryMap[task.category]}</span>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusMap[task.status]?.color}`}>
                  {statusMap[task.status]?.label}
                </span>
                {task.deadline && (
                  <span className="text-xs text-gray-400">📅 截止 {task.deadline}</span>
                )}
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-4">{task.title}</h1>
              <p className="text-gray-600 whitespace-pre-wrap leading-relaxed">{task.description}</p>
            </CardContent>
          </Card>

          {/* 提交成果（接单方） */}
          {isReceiver && task.status === 'in_progress' && (
            <Card>
              <CardHeader><CardTitle className="text-lg">提交成果</CardTitle></CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <Textarea
                    placeholder="在这里输入文字成果（可选，有附件也可以不填）..."
                    className="min-h-32 resize-none"
                    value={submitContent}
                    onChange={e => setSubmitContent(e.target.value)}
                  />
                  <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 hover:border-blue-300 transition">
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.txt"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="file-upload"
                    />
                    <label htmlFor="file-upload" className="flex flex-col items-center gap-2 cursor-pointer">
                      <span className="text-3xl">📎</span>
                      <span className="text-sm text-gray-500">
                        {uploading ? '上传中...' : '点击上传附件（图片、视频、文档等）'}
                      </span>
                      <span className="text-xs text-gray-400">支持多文件同时上传</span>
                    </label>
                  </div>
                  {uploadedFiles.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-700">已上传 {uploadedFiles.length} 个文件：</p>
                      <div className="flex flex-wrap gap-3">
                        {uploadedFiles.map(f => (
                          <div key={f.url} className="relative group">
                            <FilePreview url={f.url} />
                            <button
                              type="button"
                              onClick={() => removeFile(f.url)}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                            >×</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <Button type="submit" className="bg-blue-600 hover:bg-blue-700 w-full" disabled={loading || uploading}>
                    {loading ? '提交中...' : '提交成果'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* 已提交成果（任务待确认时，派发方 + 接单方可见） */}
          {(isDispatcher || isReceiver) && task.status === 'submitted' && (
            <Card>
              <CardHeader><CardTitle className="text-lg">已提交成果</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {submission ? (
                  <>
                    {submission.content && (
                      <p className="text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-lg p-4">{submission.content}</p>
                    )}
                    {submission.attachments?.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-gray-700">附件（{submission.attachments.length} 个）：</p>
                        <div className="flex flex-wrap gap-3">
                          {submission.attachments.map((url: string) => (
                            <FilePreview key={url} url={url} />
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-gray-400 bg-gray-50 rounded-lg p-4">接单方已提交，暂无文字或附件内容。</p>
                )}
                {isDispatcher && (
                  <div className="space-y-3 mt-4">
                  {myBalance !== null && (
                    <div className={`text-sm px-3 py-2 rounded-lg flex items-center justify-between ${
                      myBalance < Number(task.budget)
                        ? 'bg-red-50 text-red-600 border border-red-200'
                        : 'bg-green-50 text-green-700 border border-green-100'
                    }`}>
                      <span>钱包余额：<span className="font-bold">¥{myBalance.toFixed(2)}</span></span>
                      {myBalance < Number(task.budget) && (
                        <a href="/dashboard" className="text-xs underline font-medium">去充值 →</a>
                      )}
                    </div>
                  )}
                  <div className="flex gap-3">
                    <Button className="bg-green-600 hover:bg-green-700 flex-1" onClick={handleConfirm} disabled={loading || (myBalance !== null && myBalance < Number(task.budget))}>
                      确认完成，释放款项
                    </Button>
                    <Button
                      variant="outline"
                      className="border-red-300 text-red-600 hover:bg-red-50 flex-1"
                      onClick={async () => {
                        const supabase = createClient()
                        await supabase.from('tasks').update({ status: 'disputed' }).eq('id', taskId)
                        await loadData()
                      }}
                    >
                      发起纠纷
                    </Button>
                  </div>
                  </div>
                )}
                {isReceiver && (
                  <Button
                    variant="outline"
                    className="w-full text-sm border-blue-300 text-blue-600 hover:bg-blue-50 mt-2"
                    onClick={async () => {
                      setLoading(true)
                      const supabase = createClient()
                      await supabase.from('tasks').update({ status: 'in_progress' }).eq('id', taskId)
                      setSubmitContent(submission?.content ?? '')
                      setUploadedFiles(submission?.attachments?.map((url: string) => ({ name: url.split('/').pop()?.split('?')[0] ?? '文件', url })) ?? [])
                      await loadData()
                      setLoading(false)
                    }}
                    disabled={loading}
                  >
                    ✏️ 修改已提交内容
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* 纠纷仲裁投票区 */}
          {task.status === 'disputed' && (
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="text-lg text-red-700">⚖️ 纠纷仲裁</CardTitle>
                <p className="text-sm text-gray-500">信誉分 ≥ 80 的用户可参与投票，票数多的一方胜出</p>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* 成果展示（供投票者参考） */}
                {submission && (
                  <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">接单方提交的成果</p>
                    {submission.content && (
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{submission.content}</p>
                    )}
                    {submission.attachments?.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {submission.attachments.map((url: string) => (
                          <FilePreview key={url} url={url} />
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 票数进度 */}
                <div className="space-y-3">
                  {[
                    { side: 'dispatcher', label: `派发方（${task.dispatcher?.username}）`, count: voteCounts.dispatcher, color: 'bg-orange-400' },
                    { side: 'receiver',   label: `接单方（${task.receiver?.username}）`,   count: voteCounts.receiver,   color: 'bg-blue-500' },
                  ].map(({ side, label, count, color }) => {
                    const total = voteCounts.dispatcher + voteCounts.receiver
                    const pct   = total === 0 ? 50 : Math.round((count / total) * 100)
                    return (
                      <div key={side}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-700">{label}</span>
                          <span className="font-medium text-gray-800">{count} 票 ({pct}%)</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* 投票按钮 */}
                {!isDispatcher && !isReceiver && (
                  myVote ? (
                    <div className="bg-gray-50 rounded-lg px-4 py-3 text-sm text-gray-500 text-center">
                      ✅ 你已投票支持 {myVote === 'dispatcher' ? '派发方' : '接单方'}
                    </div>
                  ) : myScore >= 80 ? (
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        variant="outline"
                        className="border-orange-300 text-orange-600 hover:bg-orange-50"
                        onClick={() => handleVote('dispatcher')}
                        disabled={loading}
                      >
                        支持派发方
                      </Button>
                      <Button
                        variant="outline"
                        className="border-blue-300 text-blue-600 hover:bg-blue-50"
                        onClick={() => handleVote('receiver')}
                        disabled={loading}
                      >
                        支持接单方
                      </Button>
                    </div>
                  ) : (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 text-sm text-yellow-700 text-center">
                      你的信誉分为 {myScore} 分，需达到 80 分才能参与投票
                    </div>
                  )
                )}

                {(isDispatcher || isReceiver) && (
                  <div className="bg-red-50 rounded-lg px-4 py-3 text-sm text-red-600 text-center">
                    纠纷当事人不可参与投票，等待社区裁决或管理员强制裁决
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* 互评（任务完成后，双方可见） */}
          {task.status === 'completed' && (isDispatcher || isReceiver) && (() => {
            const myReview = reviews.find(r => r.reviewer_id === currentUserId)
            const otherReview = reviews.find(r => r.reviewer_id !== currentUserId && (r.reviewer_id === task.dispatcher_id || r.reviewer_id === task.receiver_id))
            return (
              <Card>
                <CardHeader><CardTitle className="text-lg">合作评价</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  {/* 对方给我的评价 */}
                  {otherReview ? (
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-xs text-gray-400 mb-1">对方对你的评价</p>
                      <div className="text-yellow-400 text-lg mb-1">{'★'.repeat(otherReview.rating)}{'☆'.repeat(5 - otherReview.rating)}</div>
                      {otherReview.comment && <p className="text-sm text-gray-700">{otherReview.comment}</p>}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400">对方尚未提交评价</p>
                  )}
                  {/* 我的评价 */}
                  {myReview ? (
                    <div className="bg-blue-50 rounded-xl p-4">
                      <p className="text-xs text-gray-400 mb-1">你提交的评价</p>
                      <div className="text-yellow-400 text-lg mb-1">{'★'.repeat(myReview.rating)}{'☆'.repeat(5 - myReview.rating)}</div>
                      {myReview.comment && <p className="text-sm text-gray-700">{myReview.comment}</p>}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm text-gray-600">对此次合作打分：</p>
                      <div className="flex gap-2">
                        {[1,2,3,4,5].map(n => (
                          <button key={n} onClick={() => setMyRating(n)}
                            className={`text-2xl transition-transform hover:scale-110 ${myRating >= n ? 'text-yellow-400' : 'text-gray-300'}`}>
                            ★
                          </button>
                        ))}
                      </div>
                      <Textarea
                        placeholder="写几句评价（选填）..."
                        className="min-h-20 resize-none text-sm"
                        value={myComment}
                        onChange={e => setMyComment(e.target.value)}
                      />
                      <Button
                        className="bg-blue-600 hover:bg-blue-700 w-full"
                        onClick={handleReview}
                        disabled={!myRating || reviewSaving}
                      >
                        {reviewSaving ? '提交中...' : '提交评价'}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })()}

        </div>

        {/* 右侧信息栏 */}
        <div className="space-y-4">
          <Card>
            <CardContent className="pt-6 space-y-3">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">¥{Number(task.budget).toFixed(0)}</div>
                <div className="text-sm text-gray-500 mt-1">预算金额</div>
              </div>
              <div className="text-xs text-gray-400 text-center">
                接单方实得 ¥{(Number(task.budget) * 0.95).toFixed(0)}（扣除 5% 平台费）
              </div>

              {!currentUserId && (
                <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={() => router.push('/auth/login')}>
                  登录后接单
                </Button>
              )}

              {currentUserId && !isDispatcher && !isReceiver && task.status === 'open' && (
                <div className="space-y-2">
                  <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={handleGrab} disabled={loading}>
                    直接抢单
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => router.push(`/messages/${taskId}/${task.dispatcher_id}`)}
                  >
                    💬 私信派发方协商
                  </Button>
                </div>
              )}

              {/* 派发方：任务进行中可私信接单方；招募中可调整报酬并查看来信 */}
              {isDispatcher && (
                <div className="space-y-2 pt-2 border-t border-gray-100">
                  {task.receiver_id && (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => router.push(`/messages/${taskId}/${task.receiver_id}`)}
                    >
                      💬 私信接单方
                    </Button>
                  )}
                  {task.status === 'open' && (
                    editingBudget ? (
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          min="1"
                          placeholder="新报酬金额"
                          value={newBudget}
                          onChange={e => setNewBudget(e.target.value)}
                          className="flex-1"
                        />
                        <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={handleUpdateBudget} disabled={loading}>确认</Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingBudget(false)}>取消</Button>
                      </div>
                    ) : (
                      <Button variant="outline" className="w-full text-sm" onClick={() => { setEditingBudget(true); setNewBudget(String(task.budget)) }}>
                        调整报酬金额
                      </Button>
                    )
                  )}
                  {task.status === 'open' && (
                    <Button
                      variant="outline"
                      className="w-full text-sm border-red-300 text-red-500 hover:bg-red-50"
                      onClick={handleCancel}
                      disabled={loading}
                    >
                      取消任务
                    </Button>
                  )}
                  {conversations.length > 0 && (
                    <div className="pt-1">
                      <p className="text-xs text-gray-400 mb-1">收到的私信</p>
                      {conversations.map((c: any) => (
                        <button
                          key={c.sender_id}
                          onClick={() => router.push(`/messages/${taskId}/${c.sender_id}`)}
                          className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 text-sm text-blue-600 flex items-center gap-2"
                        >
                          <span>💬</span>
                          <span>{(c as any).profiles?.username ?? '用户'}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 接单方：任何状态都可私信派发方 */}
              {isReceiver && (
                <div className="pt-2 border-t border-gray-100">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => router.push(`/messages/${taskId}/${task.dispatcher_id}`)}
                  >
                    💬 私信派发方
                  </Button>
                </div>
              )}

              {isReceiver && task.status === 'in_progress' && (
                <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-700 text-center">
                  你正在接单中，请提交成果
                </div>
              )}

              {task.status === 'completed' && (
                <div className="bg-green-50 rounded-lg p-3 text-sm text-green-700 text-center">
                  任务已完成
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4 space-y-3">
              <p className="text-xs text-gray-400">派发方</p>
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarFallback className="bg-blue-100 text-blue-600">
                    {task.dispatcher?.username?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-sm">{task.dispatcher?.username}</p>
                  <p className="text-yellow-500 text-xs">★ {task.dispatcher?.score} 信誉分</p>
                </div>
              </div>
              {task.dispatcher?.bio && (
                <p className="text-xs text-gray-500 leading-relaxed border-t border-gray-50 pt-2">{task.dispatcher.bio}</p>
              )}
            </CardContent>
          </Card>

          {task.receiver && (
            <Card>
              <CardContent className="pt-4 space-y-3">
                <p className="text-xs text-gray-400">接单方</p>
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback className="bg-green-100 text-green-600">
                      {task.receiver?.username?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-sm">{task.receiver?.username}</p>
                    <p className="text-yellow-500 text-xs">★ {task.receiver?.score} 信誉分</p>
                  </div>
                </div>
                {task.receiver?.bio && (
                  <p className="text-xs text-gray-500 leading-relaxed border-t border-gray-50 pt-2">{task.receiver.bio}</p>
                )}
              </CardContent>
            </Card>
          )}

          {message && (
            <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700">
              {message}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
