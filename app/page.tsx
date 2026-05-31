import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function HomePage() {
  const features = [
    { icon: '📝', title: '写作 / 文案', cat: 'writing', desc: '文章、营销文案、翻译、摘要' },
    { icon: '💻', title: '代码 / 技术', cat: 'code', desc: '写代码、调试、数据分析、自动化' },
    { icon: '🎨', title: '图像 / 视觉', cat: 'image', desc: 'AI 图片生成、图片处理、设计' },
    { icon: '🔍', title: '研究 / 信息', cat: 'research', desc: '市场调研、信息整理、竞品分析' },
  ]

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="bg-white py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            把 AI 的能力<br />
            <span className="text-blue-600">变成你的能力</span>
          </h1>
          <p className="text-xl text-gray-500 mb-10 max-w-2xl mx-auto">
            不懂 AI？发布任务，让会用 AI 的人帮你完成。<br />
            会用 AI？接单赚钱，把你的能力变现。
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link href="/tasks/new">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white px-8">
                发布任务
              </Button>
            </Link>
            <Link href="/tasks">
              <Button size="lg" variant="outline" className="px-8">
                浏览任务大厅
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* 平台说明 */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">平台如何运作</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: '01', title: '发布任务', desc: '描述你的需求，设定预算和分类，任务立即在平台上线' },
              { step: '02', title: '接受方接单', desc: '会用 AI 的人浏览任务，直接抢单或提交报价，你选择最合适的人' },
              { step: '03', title: '完成 · 付款', desc: '成果交付后你确认验收，平台自动打款（扣除 5% 平台费）' },
            ].map(item => (
              <div key={item.step} className="bg-white rounded-2xl p-8 shadow-sm">
                <div className="text-4xl font-bold text-blue-100 mb-4">{item.step}</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{item.title}</h3>
                <p className="text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 任务分类 */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">支持的任务类型</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map(f => (
              <Link href={`/tasks?category=${f.cat}`} key={f.cat}>
                <div className="bg-gray-50 rounded-2xl p-6 hover:bg-blue-50 hover:shadow-md transition-all cursor-pointer border border-transparent hover:border-blue-100">
                  <div className="text-4xl mb-4">{f.icon}</div>
                  <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
                  <p className="text-sm text-gray-500">{f.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 底部 CTA */}
      <section className="py-16 px-4 bg-blue-600">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">准备好了吗？</h2>
          <p className="text-blue-100 mb-8 text-lg">注册即可开始发布任务或接单赚钱</p>
          <Link href="/auth/register">
            <Button size="lg" className="bg-white text-blue-600 hover:bg-blue-50 px-8">
              免费注册
            </Button>
          </Link>
        </div>
      </section>
    </div>
  )
}
