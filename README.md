<div align="center">

# 🤖 AI任务市场

**连接「有任务的人」和「有 AI 能力的人」的开源全栈任务交易平台**

[![Next.js](https://img.shields.io/badge/Next.js-16.2-black?logo=next.js&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Supabase](https://img.shields.io/badge/Supabase-BaaS-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?logo=cloudflare&logoColor=white)](https://workers.cloudflare.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

[🌐 在线 Demo](https://aitaskyard.com) · [📖 快速开始](#-本地运行) · [🤝 贡献](#-贡献)

![平台首页](https://raw.githubusercontent.com/15712632837q-source/ai-task-market/main/public/screenshot-home.png)

<table>
  <tr>
    <td><img src="https://raw.githubusercontent.com/15712632837q-source/ai-task-market/main/public/screenshot-tasks.png" alt="任务大厅"/></td>
    <td><img src="https://raw.githubusercontent.com/15712632837q-source/ai-task-market/main/public/screenshot-detail.png" alt="任务详情"/></td>
  </tr>
  <tr>
    <td align="center">任务大厅</td>
    <td align="center">任务详情 & 接单</td>
  </tr>
  <tr>
    <td><img src="https://raw.githubusercontent.com/15712632837q-source/ai-task-market/main/public/screenshot-dashboard.png" alt="我的工作台"/></td>
    <td><img src="https://raw.githubusercontent.com/15712632837q-source/ai-task-market/main/public/screenshot-tasks.png" alt="任务筛选"/></td>
  </tr>
  <tr>
    <td align="center">我的工作台</td>
    <td align="center">分类筛选</td>
  </tr>
</table>

</div>

---

## 📖 项目简介

AI任务市场是一个**开源的 AI 技能交易平台**，专为 AI 时代设计：

- **发布方**：有各种内容需求（写文案、做调研、画插图、写代码），发布任务并设定预算，让会用 AI 工具的人帮你完成
- **接单方**：掌握 ChatGPT、Midjourney、Claude 等 AI 工具，浏览任务、接单、提交成果、赚取收入

整套系统包含用户认证、任务全流程管理、实时私信、钱包系统、纠纷仲裁，可直接 Fork 部署为自己的平台。

---

## ✨ 功能特性

| 模块 | 功能 |
|------|------|
| 🎯 任务大厅 | 搜索、筛选（写作/代码/图像/研究），实时显示招募中任务 |
| 📝 任务全流程 | 发布 → 抢单 → 进行中 → 提交成果 → 确认完成 → 自动打款 |
| 💬 实时私信 | Supabase Realtime 驱动，消息已读状态，未读角标 |
| 💰 钱包系统 | 充值申请（上传截图）、提现申请（支付宝/微信）、流水记录 |
| ⚖️ 纠纷仲裁 | 社区投票 + 管理员强制裁决，胜方+3分败方-5分 |
| 🔐 信誉评分 | 完成任务自动加分，违约扣分，建立平台信用体系 |
| 🛠️ 管理后台 | 充值审核、提现审核、纠纷裁决、佣金统计 |

---

## 🛠️ 技术栈

```
前端：Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS v4
后端：Supabase (PostgreSQL + Auth + Storage + Realtime)
部署：Cloudflare Workers (@opennextjs/cloudflare v1.19)
UI：shadcn/ui + 自定义深色主题
```

**架构特点：**
- 全客户端渲染（CSR），所有页面均为 `'use client'`
- Supabase RLS 行级安全保护所有数据
- 资金操作通过 `SECURITY DEFINER` SQL 函数原子执行，防止并发问题
- Cloudflare Workers 边缘部署，全球低延迟

---

## 📦 本地运行

### 前置要求

- Node.js 18+
- 一个免费的 [Supabase](https://supabase.com) 项目

### 1. 克隆 & 安装

```bash
git clone https://github.com/15712632837q-source/ai-task-market.git
cd ai-task-market
npm install
```

### 2. 配置环境变量

```bash
cp .env.example .env.local
```

填写 `.env.local`：

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_ADMIN_ID=your-user-uuid        # 注册后在 Supabase → Auth → Users 查看
NEXT_PUBLIC_RECHARGE_WECHAT=your-wechat
NEXT_PUBLIC_RECHARGE_ALIPAY=your-alipay
```

### 3. 初始化数据库

在 Supabase 控制台 → SQL Editor，按顺序执行以下建表语句（可在 Issues 中找到完整 SQL）：

<details>
<summary>点击展开核心表结构</summary>

```sql
-- profiles: 用户资料 + 钱包余额 + 信誉分
-- tasks: 任务信息、状态机（open/in_progress/submitted/completed/disputed）
-- messages: 私信（含 is_read 字段）
-- wallet_transactions: 钱包流水
-- recharge_requests: 充值申请（pending/approved/rejected）
-- withdrawal_requests: 提现申请（pending/approved/rejected）
-- dispute_votes: 纠纷投票记录
```

</details>

### 4. 启动

```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000)

---

## 🚀 部署到 Cloudflare Workers

```bash
npm install -g wrangler
wrangler login
npm run build
npx opennextjs-cloudflare deploy
```

在 Cloudflare Workers 控制台 → Settings → Variables 添加与 `.env.local` 相同的环境变量。

绑定自定义域名：Workers → Triggers → Custom Domains → 添加你的域名。

---

## 📁 目录结构

```
app/
├── page.tsx                         # 首页（Hero + 特性 + 统计）
├── tasks/
│   ├── page.tsx                     # 任务大厅（搜索+筛选）
│   ├── new/page.tsx                 # 发布任务
│   └── [id]/                        # 任务详情 + 接单/提交/确认
├── dashboard/page.tsx               # 工作台（我的任务/订单/钱包/提现）
├── messages/[taskId]/[userId]/      # 实时私信
├── disputes/page.tsx                # 纠纷仲裁大厅
├── admin/page.tsx                   # 管理后台
└── auth/                            # 登录/注册/找回/重置密码

components/
└── navbar.tsx                       # 导航栏（实时未读消息角标）
```

---

## 🔑 核心 SQL 函数

| 函数 | 作用 |
|------|------|
| `accept_task` | 接单，冻结预算 |
| `complete_task` | 确认完成，自动结算（扣5%平台费）|
| `approve_recharge` | 充值审核通过，到账钱包 |
| `approve_withdrawal` | 提现审核通过，扣减钱包并记录流水 |
| `resolve_dispute_*` | 纠纷裁决，调整信誉分 |
| `get_platform_stats` | 管理后台统计数据 |

---

## 🤝 贡献

欢迎任何形式的贡献！

```bash
# 1. Fork 本仓库
# 2. 创建特性分支
git checkout -b feature/amazing-feature
# 3. 提交
git commit -m "feat: add amazing feature"
# 4. 推送并提交 PR
git push origin feature/amazing-feature
```

**欢迎的贡献方向：**
- 🐛 Bug 修复
- ✨ 新功能（AI 自动匹配、评价系统、通知推送等）
- 🌍 国际化（i18n）
- 📖 文档完善
- 🎨 UI 改进

---

## 📄 License

[MIT License](LICENSE) — 可自由 Fork 部署为自己的平台

---

<div align="center">

如果这个项目对你有帮助，请点个 ⭐ **Star** 支持一下！

Built with ❤️ using [Next.js](https://nextjs.org) · [Supabase](https://supabase.com) · [Cloudflare Workers](https://workers.cloudflare.com)

</div>
