'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Task, TaskCategory } from '@/types'

const categoryMap: Record<TaskCategory, { label: string; icon: string }> = {
  writing:  { label: '写作/文案', icon: '📝' },
  code:     { label: '代码/技术', icon: '💻' },
  image:    { label: '图像/视觉', icon: '🎨' },
  research: { label: '研究/信息', icon: '🔍' },
}

const statusMap: Record<string, { label: string; color: string }> = {
  open:        { label: '招募中', color: 'bg-green-100 text-green-700' },
  in_progress: { label: '进行中', color: 'bg-blue-100 text-blue-700' },
  submitted:   { label: '待确认', color: 'bg-yellow-100 text-yellow-700' },
  completed:   { label: '已完成', color: 'bg-gray-100 text-gray-600' },
}


function TasksList() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const category = searchParams.get('category') ?? ''

  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [keyword, setKeyword] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchTasks = (cat: string, kw: string) => {
    setLoading(true)
    const supabase = createClient()
    let query = supabase
      .from('tasks')
      .select('*, dispatcher:profiles!dispatcher_id(username, score)')
      .eq('status', 'open')
      .order('created_at', { ascending: false })

    if (cat && ['writing', 'code', 'image', 'research'].includes(cat)) {
      query = query.eq('category', cat as TaskCategory)
    }
    if (kw.trim()) {
      query = query.or(`title.ilike.%${kw.trim()}%,description.ilike.%${kw.trim()}%`)
    }

    const timeout = new Promise<void>(resolve => setTimeout(resolve, 8000))
    Promise.race([
      query.then(({ data, error }) => { if (!error) setTasks(data ?? []) }),
      timeout,
    ]).finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchTasks(category, keyword)
  }, [category])

  const handleKeywordChange = (val: string) => {
    setKeyword(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchTasks(category, val), 400)
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">任务大厅</h1>
          <p className="text-gray-500 mt-1 text-sm">找到适合你的任务，用 AI 能力赚钱</p>
        </div>
        <div className="flex gap-2 self-start sm:self-auto">
          <Link href="/disputes">
            <Button variant="outline" className="border-gray-300 text-gray-600 hover:bg-gray-50 text-sm">纠纷仲裁</Button>
          </Link>
          <Link href="/tasks/new">
            <Button className="bg-blue-600 hover:bg-blue-700 text-sm">发布任务</Button>
          </Link>
        </div>
      </div>

      {/* 搜索框 */}
      <div className="relative mb-5">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
        </svg>
        <Input
          placeholder="搜索任务标题或描述..."
          value={keyword}
          onChange={e => handleKeywordChange(e.target.value)}
          className="pl-9 bg-white"
        />
        {keyword && (
          <button
            onClick={() => handleKeywordChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        )}
      </div>

      <div className="flex gap-3 mb-8 flex-wrap">
        <Badge
          variant={!category ? 'default' : 'outline'}
          className={`cursor-pointer px-4 py-1.5 text-sm ${!category ? 'bg-blue-600' : ''}`}
          onClick={() => router.push('/tasks')}
        >
          全部
        </Badge>
        {Object.entries(categoryMap).map(([key, val]) => (
          <Badge
            key={key}
            variant={category === key ? 'default' : 'outline'}
            className={`cursor-pointer px-4 py-1.5 text-sm ${category === key ? 'bg-blue-600' : ''}`}
            onClick={() => router.push(`/tasks?category=${key}`)}
          >
            {val.icon} {val.label}
          </Badge>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-24 text-gray-400">
          <div className="text-4xl mb-4 animate-pulse">⏳</div>
          <p>加载中...</p>
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-24 text-gray-400">
          <div className="text-5xl mb-4">{keyword ? '🔍' : '📭'}</div>
          {keyword ? (
            <p className="text-lg">没有找到与「{keyword}」相关的任务</p>
          ) : (
            <>
              <p className="text-lg">暂无任务，快来发布第一个吧</p>
              <Link href="/tasks/new" className="mt-4 inline-block">
                <Button className="bg-blue-600 hover:bg-blue-700 mt-4">发布任务</Button>
              </Link>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {tasks.map((task: Task & { dispatcher: { username: string; score: number } }) => (
            <Link href={`/tasks/${task.id}`} key={task.id}>
              <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all border border-gray-100 hover:border-blue-200 cursor-pointer h-full flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-gray-500">
                    {categoryMap[task.category]?.icon} {categoryMap[task.category]?.label}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusMap[task.status]?.color}`}>
                    {statusMap[task.status]?.label}
                  </span>
                </div>
                <h3 className="font-semibold text-gray-900 text-lg mb-2 line-clamp-2">
                  {task.title}
                </h3>
                <p className="text-sm text-gray-500 line-clamp-3 flex-1 mb-4">
                  {task.description}
                </p>
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <div className="text-sm text-gray-500">
                    by <span className="font-medium text-gray-700">{task.dispatcher?.username}</span>
                    <span className="ml-1 text-yellow-500">★ {task.dispatcher?.score}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-blue-600 text-lg">¥{Number(task.budget).toFixed(0)}</div>
                    {task.deadline && (
                      <div className="text-xs text-gray-400">截止 {task.deadline}</div>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export default function TasksPage() {
  return (
    <Suspense>
      <TasksList />
    </Suspense>
  )
}
