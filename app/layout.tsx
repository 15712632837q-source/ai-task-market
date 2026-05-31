import type { Metadata } from 'next'
import './globals.css'
import Navbar from '@/components/navbar'

export const metadata: Metadata = {
  title: 'AI 任务市场',
  description: '连接 AI 能力与真实需求的任务平台',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body suppressHydrationWarning className="min-h-full flex flex-col bg-gray-50 pb-16 md:pb-0" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "PingFang SC", "Microsoft YaHei", sans-serif' }}>
        <Navbar />
        {children}
      </body>
    </html>
  )
}
