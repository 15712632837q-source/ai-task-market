'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
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
          <h1 className="text-2xl sm:text-3xl font-bold text-white">任务大厅</h1>
          <p className="text-gray-500 mt-1 text-sm">找到适合你的任务，用 AI 能力赚钱</p>
        </div>
        <div className="flex gap-2 self-start sm:self-auto">
          <Link href="/disputes">
            <button className="text-sm px-4 py-2 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:border-white/20 transition-colors">纠纷仲裁</button>
          </Link>
          <Link href="/tasks/new">
            <button className="text-sm px-4 py-2 rounded-lg font-semibold bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:opacity-90 transition-opacity">发布任务</button>
          </Link>
        </div>
      </div>

      {/* 搜索框 */}
      <div className="relative mb-5">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
        </svg>
        <input
          placeholder="搜索任务标题或描述..."
          value={keyword}
          onChange={e => handleKeywordChange(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 transition-colors text-sm"
        />
        {keyword && (
          <button onClick={() => handleKeywordChange('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">×</button>
        )}
      </div>

      {/* 分类筛选 */}
      <div className="flex gap-2 mb-8 flex-wrap">
        <button
          onClick={() => router.push('/tasks')}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
            !category
              ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-md shadow-blue-500/20'
              : 'bg-white/[0.04] border border-white/10 text-gray-400 hover:text-white hover:border-white/20'
          }`}
        >
          全部
        </button>
        {Object.entries(categoryMap).map(([key, val]) => (
          <button
            key={key}
            onClick={() => router.push(`/tasks?category=${key}`)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              category === key
                ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-md shadow-blue-500/20'
                : 'bg-white/[0.04] border border-white/10 text-gray-400 hover:text-white hover:border-white/20'
            }`}
          >
            {val.icon} {val.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-24 text-gray-600">
          <div className="text-4xl mb-4 animate-pulse">⏳</div>
          <p>加载中...</p>
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-24 text-gray-600">
          <div className="text-5xl mb-4">{keyword ? '🔍' : '📭'}</div>
          {keyword ? (
            <p className="text-lg">没有找到与「{keyword}」相关的任务</p>
          ) : (
            <>
              <p className="text-lg mb-4">暂无任务，快来发布第一个吧</p>
              <Link href="/tasks/new">
                <button className="px-6 py-2.5 rounded-xl font-semibold bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:opacity-90 transition-opacity">发布任务</button>
              </Link>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {tasks.map((task: Task & { dispatcher: { username: string; score: number } }) => (
            <Link href={`/tasks/${task.id}`} key={task.id}>
              <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-6 hover:bg-white/[0.06] hover:border-blue-500/30 transition-all cursor-pointer h-full flex flex-col group">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-gray-500">
                    {categoryMap[task.category]?.icon} {categoryMap[task.category]?.label}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusMap[task.status]?.color}`}>
                    {statusMap[task.status]?.label}
                  </span>
                </div>
                <h3 className="font-semibold text-white text-base mb-2 line-clamp-2 group-hover:text-blue-300 transition-colors">
                  {task.title}
                </h3>
                <p className="text-sm text-gray-500 line-clamp-3 flex-1 mb-4 leading-relaxed">
                  {task.description}
                </p>
                <div className="flex items-center justify-between pt-3 border-t border-white/[0.06]">
                  <div className="text-sm text-gray-500">
                    by <span className="font-medium text-gray-400">{task.dispatcher?.username}</span>
                    <span className="ml-1 text-yellow-500/80">★ {task.dispatcher?.score}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-blue-400 text-lg">¥{Number(task.budget).toFixed(0)}</div>
                    {task.deadline && (
                      <div className="text-xs text-gray-600">截止 {task.deadline}</div>
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
