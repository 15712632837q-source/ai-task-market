import Link from 'next/link'

export default function HomePage() {
  const categories = [
    { icon: '📝', title: '写作 / 文案', cat: 'writing', desc: '文章、营销文案、翻译、摘要' },
    { icon: '💻', title: '代码 / 技术', cat: 'code',    desc: '写代码、调试、数据分析、自动化' },
    { icon: '🎨', title: '图像 / 视觉', cat: 'image',   desc: 'AI 图片生成、图片处理、设计' },
    { icon: '🔍', title: '研究 / 信息', cat: 'research', desc: '市场调研、信息整理、竞品分析' },
  ]

  const steps = [
    { step: '01', title: '发布任务', desc: '描述你的需求，设定预算和分类，任务立即在平台上线' },
    { step: '02', title: '接受方接单', desc: '会用 AI 的人浏览任务，直接抢单，你选择最合适的人' },
    { step: '03', title: '完成 · 付款', desc: '成果交付后你确认验收，平台自动打款（扣除 5% 平台费）' },
  ]

  return (
    <div className="flex flex-col">

      {/* ── Hero ── */}
      <section className="relative overflow-hidden py-28 px-4">
        {/* background glow blobs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-120px] left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-indigo-600/10 blur-3xl" />
          <div className="absolute top-20 left-1/4 w-72 h-72 rounded-full bg-blue-600/8 blur-2xl" />
          <div className="absolute top-10 right-1/4 w-64 h-64 rounded-full bg-purple-600/8 blur-2xl" />
        </div>

        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 text-sm text-gray-400 mb-8">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            平台正在公测中 · 欢迎试用
          </div>

          <h1 className="text-5xl md:text-6xl font-extrabold text-white leading-tight mb-6">
            把 AI 的能力
            <br />
            <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              变成你的能力
            </span>
          </h1>

          <p className="text-lg md:text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            不懂 AI？发布任务，让会用 AI 的人帮你完成。
            <br />
            会用 AI？接单赚钱，把你的技能变成收入。
          </p>

          <div className="flex gap-4 justify-center flex-wrap mb-16">
            <Link href="/tasks/new">
              <button className="px-8 py-3.5 rounded-xl font-semibold text-white bg-gradient-to-r from-blue-500 to-purple-600 hover:opacity-90 transition-opacity text-base shadow-lg shadow-blue-500/20">
                立即发布任务
              </button>
            </Link>
            <Link href="/tasks">
              <button className="px-8 py-3.5 rounded-xl font-semibold text-gray-300 border border-white/15 hover:border-white/30 hover:text-white transition-all text-base">
                浏览任务大厅
              </button>
            </Link>
          </div>

          {/* Stats */}
          <div className="flex gap-10 justify-center flex-wrap">
            {[
              { num: '1,200+', label: '已完成任务' },
              { num: '860+',   label: '注册用户' },
              { num: '98%',    label: '好评率' },
              { num: '5%',     label: '平台手续费' },
            ].map(s => (
              <div key={s.label} className="text-center">
                <div className="text-3xl font-extrabold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">{s.num}</div>
                <div className="text-sm text-gray-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 平台说明 ── */}
      <section className="py-20 px-4 border-t border-white/[0.05]">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-white mb-4">平台如何运作</h2>
          <p className="text-center text-gray-500 mb-14">三步完成一个 AI 任务</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {steps.map(item => (
              <div key={item.step} className="relative bg-white/[0.03] border border-white/[0.07] rounded-2xl p-8 hover:bg-white/[0.05] transition-colors">
                <div className="text-5xl font-extrabold text-white/5 mb-4 leading-none">{item.step}</div>
                <h3 className="text-lg font-semibold text-white mb-3">{item.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
                <div className="absolute top-8 right-8 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center text-blue-400 text-xs font-bold border border-blue-500/20">
                  {item.step}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 任务分类 ── */}
      <section className="py-20 px-4 border-t border-white/[0.05]">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-white mb-4">支持的任务类型</h2>
          <p className="text-center text-gray-500 mb-14">覆盖主流 AI 应用场景</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {categories.map(f => (
              <Link href={`/tasks?category=${f.cat}`} key={f.cat}>
                <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-6 hover:bg-white/[0.06] hover:border-blue-500/30 transition-all cursor-pointer group">
                  <div className="text-4xl mb-4">{f.icon}</div>
                  <h3 className="font-semibold text-white mb-2 group-hover:text-blue-300 transition-colors">{f.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── 底部 CTA ── */}
      <section className="py-20 px-4 border-t border-white/[0.05]">
        <div className="max-w-3xl mx-auto text-center">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10 rounded-3xl blur-xl" />
            <div className="relative bg-white/[0.03] border border-white/[0.08] rounded-3xl px-8 py-16">
              <h2 className="text-3xl font-bold text-white mb-4">准备好了吗？</h2>
              <p className="text-gray-400 mb-8 text-lg">注册即可开始发布任务或接单赚钱，完全免费</p>
              <Link href="/auth/register">
                <button className="px-10 py-3.5 rounded-xl font-semibold text-white bg-gradient-to-r from-blue-500 to-purple-600 hover:opacity-90 transition-opacity text-base shadow-lg shadow-blue-500/20">
                  免费注册
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>

    </div>
  )
}
