-- 用户信息表（扩展 Supabase auth.users）
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  avatar_url text,
  bio text,
  score integer default 100,
  wallet_balance numeric(10,2) default 0,
  created_at timestamptz default now()
);

-- 任务表
create table public.tasks (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text not null,
  category text check (category in ('writing','code','image','research')) not null,
  budget numeric(10,2) not null,
  status text check (status in ('open','in_progress','submitted','completed','disputed','cancelled')) default 'open',
  dispatcher_id uuid references public.profiles(id) not null,
  receiver_id uuid references public.profiles(id),
  deadline timestamptz,
  confirm_deadline timestamptz,
  created_at timestamptz default now()
);

-- 投标/报价表
create table public.task_applications (
  id uuid default gen_random_uuid() primary key,
  task_id uuid references public.tasks(id) on delete cascade not null,
  applicant_id uuid references public.profiles(id) not null,
  proposal text not null,
  price numeric(10,2) not null,
  created_at timestamptz default now(),
  unique(task_id, applicant_id)
);

-- 成果提交表
create table public.submissions (
  id uuid default gen_random_uuid() primary key,
  task_id uuid references public.tasks(id) on delete cascade not null,
  content text not null,
  created_at timestamptz default now()
);

-- 评价表
create table public.reviews (
  id uuid default gen_random_uuid() primary key,
  task_id uuid references public.tasks(id) not null,
  reviewer_id uuid references public.profiles(id) not null,
  reviewee_id uuid references public.profiles(id) not null,
  rating integer check (rating between 1 and 5) not null,
  comment text,
  created_at timestamptz default now(),
  unique(task_id, reviewer_id)
);

-- 钱包流水表
create table public.wallet_transactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) not null,
  amount numeric(10,2) not null,
  type text check (type in ('recharge','freeze','release','earning','platform_fee')) not null,
  description text not null,
  created_at timestamptz default now()
);

-- 新用户注册时自动创建 profile
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- RLS 行级安全策略
alter table public.profiles enable row level security;
alter table public.tasks enable row level security;
alter table public.task_applications enable row level security;
alter table public.submissions enable row level security;
alter table public.reviews enable row level security;
alter table public.wallet_transactions enable row level security;

-- profiles 策略
create policy "所有人可读 profiles" on public.profiles for select using (true);
create policy "用户可更新自己的 profile" on public.profiles for update using (auth.uid() = id);

-- tasks 策略
create policy "所有人可读任务" on public.tasks for select using (true);
create policy "登录用户可发布任务" on public.tasks for insert with check (auth.uid() = dispatcher_id);
create policy "相关用户可更新任务" on public.tasks for update using (
  auth.uid() = dispatcher_id or auth.uid() = receiver_id
);

-- task_applications 策略
create policy "可读相关投标" on public.task_applications for select using (
  auth.uid() = applicant_id or
  auth.uid() = (select dispatcher_id from public.tasks where id = task_id)
);
create policy "登录用户可投标" on public.task_applications for insert with check (auth.uid() = applicant_id);

-- submissions 策略
create policy "相关用户可读提交" on public.submissions for select using (
  auth.uid() = (select receiver_id from public.tasks where id = task_id) or
  auth.uid() = (select dispatcher_id from public.tasks where id = task_id)
);
create policy "接受方可提交" on public.submissions for insert with check (
  auth.uid() = (select receiver_id from public.tasks where id = task_id)
);

-- reviews 策略
create policy "所有人可读评价" on public.reviews for select using (true);
create policy "参与者可写评价" on public.reviews for insert with check (auth.uid() = reviewer_id);

-- wallet_transactions 策略
create policy "用户可读自己的流水" on public.wallet_transactions for select using (auth.uid() = user_id);
