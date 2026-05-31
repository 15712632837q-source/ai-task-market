export type TaskCategory = 'writing' | 'code' | 'image' | 'research'

export type TaskStatus =
  | 'open'         // 可接单
  | 'in_progress'  // 进行中
  | 'submitted'    // 已提交等待确认
  | 'completed'    // 已完成
  | 'disputed'     // 纠纷中
  | 'cancelled'    // 已取消

export interface Profile {
  id: string
  username: string
  avatar_url: string | null
  bio: string | null
  score: number
  wallet_balance: number
  created_at: string
}

export interface Task {
  id: string
  title: string
  description: string
  category: TaskCategory
  budget: number
  status: TaskStatus
  dispatcher_id: string
  receiver_id: string | null
  deadline: string | null
  created_at: string
  dispatcher?: Profile
  receiver?: Profile
}

export interface TaskApplication {
  id: string
  task_id: string
  applicant_id: string
  proposal: string
  price: number
  created_at: string
  applicant?: Profile
}

export interface Submission {
  id: string
  task_id: string
  content: string
  created_at: string
}

export interface Review {
  id: string
  task_id: string
  reviewer_id: string
  reviewee_id: string
  rating: number
  comment: string | null
  created_at: string
}

export interface WalletTransaction {
  id: string
  user_id: string
  amount: number
  type: 'recharge' | 'freeze' | 'release' | 'earning' | 'platform_fee'
  description: string
  created_at: string
}
