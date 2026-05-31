'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function NewTaskPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: '',
    budget: '',
    deadline: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [balance, setBalance] = useState<number | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('profiles').select('wallet_balance').eq('id', user.id).single()
        .then(({ data }) => { if (data) setBalance(Number(data.wallet_balance)) })
    })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push('/auth/login')
      return
    }

    const budget = parseFloat(form.budget)
    if (isNaN(budget) || budget <= 0) {
      setError('请输入有效的预算金额')
      return
    }

    setLoading(true)

    // 检查余额
    const { data: profile } = await supabase.from('profiles').select('wallet_balance').eq('id', user.id).single()
    if (!profile || Number(profile.wallet_balance) < budget) {
      setError(`钱包余额不足（当前 ¥${Number(profile?.wallet_balance ?? 0).toFixed(2)}），请先到工作台充值`)
      setLoading(false)
      return
    }

    const { data, error } = await supabase.from('tasks').insert({
      title: form.title,
      description: form.description,
      category: form.category,
      budget: budget,
      dispatcher_id: user.id,
      ...(form.deadline ? { deadline: form.deadline } : {}),
    }).select().single()

    if (error) {
      setError('发布失败，请重试')
      setLoading(false)
    } else {
      router.push(`/tasks/${data.id}`)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">发布任务</h1>
        <p className="text-gray-500 mt-1">描述你的需求，让 AI 能力帮你完成</p>
      </div>

      {/* 余额提示 */}
      {balance !== null && (
        <div className={`flex items-center justify-between px-4 py-3 rounded-xl mb-4 text-sm ${
          balance < 10 ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-blue-50 border border-blue-100 text-blue-700'
        }`}>
          <span>钱包余额：<span className="font-bold">¥{balance.toFixed(2)}</span></span>
          {balance < 10 && (
            <a href="/dashboard" className="text-xs underline font-medium">去充值 →</a>
          )}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">任务信息</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="title">任务标题 <span className="text-red-500">*</span></Label>
              <Input
                id="title"
                placeholder="用一句话描述你的需求，例如：帮我写一篇 500 字的产品介绍"
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">详细描述 <span className="text-red-500">*</span></Label>
              <Textarea
                id="description"
                placeholder="详细说明任务要求、期望的成果格式、参考资料等..."
                className="min-h-32 resize-none"
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>任务分类 <span className="text-red-500">*</span></Label>
                <Select
                  value={form.category}
                  onValueChange={(val) => setForm({ ...form, category: val ?? '' })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择分类" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="writing">📝 写作 / 文案</SelectItem>
                    <SelectItem value="code">💻 代码 / 技术</SelectItem>
                    <SelectItem value="image">🎨 图像 / 视觉</SelectItem>
                    <SelectItem value="research">🔍 研究 / 信息</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="budget">预算（元）<span className="text-red-500">*</span></Label>
                <Input
                  id="budget"
                  type="number"
                  min="1"
                  step="0.01"
                  placeholder="50"
                  value={form.budget}
                  onChange={e => setForm({ ...form, budget: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="deadline">交付截止日期 <span className="text-gray-400 font-normal text-xs">（选填，由双方协商确定）</span></Label>
              <Input
                id="deadline"
                type="date"
                min={new Date().toISOString().split('T')[0]}
                value={form.deadline}
                onChange={e => setForm({ ...form, deadline: e.target.value })}
              />
            </div>

            {/* 费用说明 */}
            {form.budget && !isNaN(parseFloat(form.budget)) && (
              <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-700">
                <p>预算：¥{parseFloat(form.budget).toFixed(2)}</p>
                <p>平台费（5%）：¥{(parseFloat(form.budget) * 0.05).toFixed(2)}</p>
                <p className="font-medium mt-1">
                  接单方实得：¥{(parseFloat(form.budget) * 0.95).toFixed(2)}
                </p>
              </div>
            )}

            {error && (
              <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
            )}

            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={loading || !form.category}
            >
              {loading ? '发布中...' : '发布任务'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
