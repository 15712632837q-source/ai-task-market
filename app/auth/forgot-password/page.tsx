'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })

    if (error) {
      setError('发送失败，请确认邮箱地址是否正确')
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            <div className="text-5xl">📬</div>
            <h2 className="text-xl font-bold text-gray-900">重置邮件已发送</h2>
            <p className="text-gray-500 text-sm">
              我们已向 <span className="font-medium text-gray-800">{email}</span> 发送了密码重置链接，
              请查收邮件并点击链接完成重置。
            </p>
            <p className="text-xs text-gray-400">没有收到？检查垃圾邮件箱，或稍后重试</p>
            <Link href="/auth/login">
              <Button variant="outline" className="w-full mt-2">返回登录</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">找回密码</CardTitle>
          <CardDescription>输入注册邮箱，我们会发送重置链接</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">注册邮箱</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>

            {error && (
              <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
            )}

            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={loading}
            >
              {loading ? '发送中...' : '发送重置链接'}
            </Button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-4">
            想起密码了？{' '}
            <Link href="/auth/login" className="text-blue-600 hover:underline">
              返回登录
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
