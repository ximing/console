# 首页综合仪表盘实现计划

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将首页从简单信息展示升级为综合工作台，以通知为中心，整合任务统计，提供快捷操作入口

**Architecture:** 使用现有 `@rabjs/react` Service 模式获取数据，保持组件化架构。新增通知列表、任务统计卡片、快捷操作三个组件，修改首页布局为双栏结构。

**Tech Stack:** React 19, @rabjs/react, Tailwind CSS, Lucide Icons

---

## 文件结构

```
apps/web/src/pages/home/
├── home.tsx                    # 修改: 更新布局，集成新组件
├── components/
│   ├── notification-list/       # 新增: 通知列表组件
│   │   ├── index.ts
│   │   ├── notification-list.tsx
│   │   └── notification-item.tsx
│   ├── task-stats-card/        # 新增: 任务统计卡片
│   │   ├── index.ts
│   │   └── task-stats-card.tsx
│   └── quick-actions/          # 新增: 快捷操作
│       ├── index.ts
│       └── quick-actions.tsx
```

---

## Chunk 1: 基础设施 - 通知列表组件

**目标:** 创建通知列表组件，显示未读通知，支持标记已读和删除

**Files:**
- Create: `apps/web/src/pages/home/components/notification-list/index.ts`
- Create: `apps/web/src/pages/home/components/notification-list/notification-item.tsx`
- Create: `apps/web/src/pages/home/components/notification-list/notification-list.tsx`
- Modify: `apps/web/src/pages/home/home.tsx` - 集成组件

---

### Task 1: 创建 notification-item 组件

**Files:**
- Create: `apps/web/src/pages/home/components/notification-list/notification-item.tsx`

```tsx
import { view } from '@rabjs/react';
import { Bell, FileText, Zap, AlertCircle, Check, Trash2 } from 'lucide-react';
import type { NotificationDto } from '@rabjs/react';

interface NotificationItemProps {
  notification: NotificationDto;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
}

const iconMap: Record<string, typeof Bell> = {
  task: Bell,
  blog: FileText,
  system: AlertCircle,
  default: Zap,
};

export const NotificationItem = view<NotificationItemProps>(({ notification, onMarkAsRead, onDelete }) => {
  const Icon = iconMap[notification.type] || iconMap.default;
  const isRead = notification.status === 'read';

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;
    return date.toLocaleDateString('zh-CN');
  };

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-150 ${
        isRead
          ? 'bg-gray-50 dark:bg-zinc-800/50 opacity-60'
          : 'bg-white dark:bg-zinc-800 shadow-sm hover:shadow-md'
      }`}
    >
      <div className={`p-2 rounded-lg ${isRead ? 'bg-gray-100 dark:bg-zinc-700' : 'bg-green-100 dark:bg-green-900/30'}`}>
        <Icon className={`w-5 h-5 ${isRead ? 'text-gray-400' : 'text-green-600 dark:text-green-400'}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm truncate ${isRead ? 'text-gray-500' : 'text-gray-900 dark:text-white font-medium'}`}>
          {notification.content}
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
          {formatTime(notification.createdAt)}
        </p>
      </div>
      {!isRead && (
        <div className="flex gap-1">
          <button
            onClick={() => onMarkAsRead(notification.id)}
            className="p-1.5 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
            title="标记已读"
          >
            <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
          </button>
          <button
            onClick={() => onDelete(notification.id)}
            className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
            title="删除"
          >
            <Trash2 className="w-4 h-4 text-red-500" />
          </button>
        </div>
      )}
    </div>
  );
});
```

- [ ] **Step 1: 创建 notification-item.tsx 文件**

```bash
cat > apps/web/src/pages/home/components/notification-list/notification-item.tsx << 'EOF'
import { view } from '@rabjs/react';
import { Bell, FileText, Zap, AlertCircle, Check, Trash2 } from 'lucide-react';
import type { NotificationDto } from '@rabjs/react';

interface NotificationItemProps {
  notification: NotificationDto;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
}

const iconMap: Record<string, typeof Bell> = {
  task: Bell,
  blog: FileText,
  system: AlertCircle,
  default: Zap,
};

export const NotificationItem = view<NotificationItemProps>(({ notification, onMarkAsRead, onDelete }) => {
  const Icon = iconMap[notification.type] || iconMap.default;
  const isRead = notification.status === 'read';

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;
    return date.toLocaleDateString('zh-CN');
  };

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-150 ${
        isRead
          ? 'bg-gray-50 dark:bg-zinc-800/50 opacity-60'
          : 'bg-white dark:bg-zinc-800 shadow-sm hover:shadow-md'
      }`}
    >
      <div className={`p-2 rounded-lg ${isRead ? 'bg-gray-100 dark:bg-zinc-700' : 'bg-green-100 dark:bg-green-900/30'}`}>
        <Icon className={`w-5 h-5 ${isRead ? 'text-gray-400' : 'text-green-600 dark:text-green-400'}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm truncate ${isRead ? 'text-gray-500' : 'text-gray-900 dark:text-white font-medium'}`}>
          {notification.content}
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
          {formatTime(notification.createdAt)}
        </p>
      </div>
      {!isRead && (
        <div className="flex gap-1">
          <button
            onClick={() => onMarkAsRead(notification.id)}
            className="p-1.5 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
            title="标记已读"
          >
            <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
          </button>
          <button
            onClick={() => onDelete(notification.id)}
            className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
            title="删除"
          >
            <Trash2 className="w-4 h-4 text-red-500" />
          </button>
        </div>
      )}
    </div>
  );
});
EOF
```

- [ ] **Step 2: 运行验证**

Run: `pnpm typecheck 2>&1 | head -30`
Expected: 无类型错误（NotificationDto 可能有 type 字段缺失，可暂时用 `as any` 或后续扩展 DTO）

---

### Task 2: 创建 notification-list 容器组件

**Files:**
- Create: `apps/web/src/pages/home/components/notification-list/notification-list.tsx`
- Create: `apps/web/src/pages/home/components/notification-list/index.ts`

```tsx
import { view, useService } from '@rabjs/react';
import { useEffect } from 'react';
import { NotificationService } from '../../../../services/notification.service';
import { NotificationItem } from './notification-item';
import { Inbox } from 'lucide-react';

export const NotificationList = view(() => {
  const notificationService = useService(NotificationService);

  useEffect(() => {
    // Load only unread notifications
    notificationService.loadNotifications({
      status: 'unread',
      limit: 10,
    });
    notificationService.loadUnreadCount();
  }, []);

  const handleMarkAsRead = async (id: string) => {
    await notificationService.markAsRead(id);
    notificationService.loadUnreadCount();
  };

  const handleDelete = async (id: string) => {
    await notificationService.deleteNotification(id);
    notificationService.loadUnreadCount();
  };

  const unreadNotifications = notificationService.notifications;

  return (
    <div className="bg-white/90 dark:bg-zinc-800/90 backdrop-blur-sm rounded-xl shadow-sm p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">通知中心</h2>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {notificationService.unreadCount} 条未读
        </span>
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {notificationService.isLoading ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            加载中...
          </div>
        ) : unreadNotifications.length === 0 ? (
          <div className="text-center py-8">
            <Inbox className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
            <p className="text-gray-500 dark:text-gray-400">暂无未读通知</p>
          </div>
        ) : (
          unreadNotifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onMarkAsRead={handleMarkAsRead}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>
    </div>
  );
});
```

- [ ] **Step 1: 创建 notification-list.tsx**

```bash
cat > apps/web/src/pages/home/components/notification-list/notification-list.tsx << 'EOF'
import { view, useService } from '@rabjs/react';
import { useEffect } from 'react';
import { NotificationService } from '../../../../services/notification.service';
import { NotificationItem } from './notification-item';
import { Inbox } from 'lucide-react';

export const NotificationList = view(() => {
  const notificationService = useService(NotificationService);

  useEffect(() => {
    // Load only unread notifications
    notificationService.loadNotifications({
      status: 'unread',
      limit: 10,
    });
    notificationService.loadUnreadCount();
  }, []);

  const handleMarkAsRead = async (id: string) => {
    await notificationService.markAsRead(id);
    notificationService.loadUnreadCount();
  };

  const handleDelete = async (id: string) => {
    await notificationService.deleteNotification(id);
    notificationService.loadUnreadCount();
  };

  const unreadNotifications = notificationService.notifications;

  return (
    <div className="bg-white/90 dark:bg-zinc-800/90 backdrop-blur-sm rounded-xl shadow-sm p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">通知中心</h2>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {notificationService.unreadCount} 条未读
        </span>
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {notificationService.isLoading ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            加载中...
          </div>
        ) : unreadNotifications.length === 0 ? (
          <div className="text-center py-8">
            <Inbox className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
            <p className="text-gray-500 dark:text-gray-400">暂无未读通知</p>
          </div>
        ) : (
          unreadNotifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onMarkAsRead={handleMarkAsRead}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>
    </div>
  );
});
EOF
```

- [ ] **Step 2: 创建 index.ts 导出**

```bash
cat > apps/web/src/pages/home/components/notification-list/index.ts << 'EOF'
export { NotificationList } from './notification-list';
export { NotificationItem } from './notification-item';
EOF
```

- [ ] **Step 3: 验证构建**

Run: `cd apps/web && pnpm tsc --noEmit 2>&1 | head -50`
Expected: 无新增类型错误

---

## Chunk 2: 任务统计卡片

**目标:** 创建任务统计小卡片，显示进行中/待办/已完成数量

**Files:**
- Create: `apps/web/src/pages/home/components/task-stats-card/index.ts`
- Create: `apps/web/src/pages/home/components/task-stats-card/task-stats-card.tsx`

---

### Task 3: 创建任务统计卡片

**Files:**
- Create: `apps/web/src/pages/home/components/task-stats-card/task-stats-card.tsx`
- Create: `apps/web/src/pages/home/components/task-stats-card/index.ts`
- Modify: `apps/web/src/pages/home/home.tsx` - 集成组件

```tsx
import { view, useService } from '@rabjs/react';
import { useEffect } from 'react';
import { TaskService } from '../../../../services/task.service';
import { useNavigate } from 'react-router-dom';
import { Activity, Clock, CheckCircle } from 'lucide-react';

export const TaskStatsCard = view(() => {
  const taskService = useService(TaskService);
  const navigate = useNavigate();

  useEffect(() => {
    taskService.loadTasks();
  }, []);

  const tasks = taskService.tasks || [];
  const inProgress = tasks.filter((t) => t.status === 'running' || t.status === 'pending').length;
  const todo = tasks.filter((t) => t.status === 'idle' || t.status === 'disabled').length;
  const completed = tasks.filter((t) => t.status === 'completed').length;

  const stats = [
    { label: '进行中', value: inProgress, icon: Activity, color: 'text-green-600 dark:text-green-400' },
    { label: '待办', value: todo, icon: Clock, color: 'text-amber-600 dark:text-amber-400' },
    { label: '已完成', value: completed, icon: CheckCircle, color: 'text-blue-600 dark:text-blue-400' },
  ];

  return (
    <div className="bg-white/90 dark:bg-zinc-800/90 backdrop-blur-sm rounded-xl shadow-sm p-4">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">任务概览</h2>
      <div className="grid grid-cols-3 gap-3">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            onClick={() => navigate('/tasks')}
            className="text-center p-3 rounded-lg bg-gray-50 dark:bg-zinc-700/50 hover:bg-green-50 dark:hover:bg-green-900/15 cursor-pointer transition-all duration-150"
          >
            <Icon className={`w-5 h-5 mx-auto mb-1 ${color}`} />
            <div className={`text-2xl font-bold ${color}`}>{value}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
});
```

- [ ] **Step 1: 创建 task-stats-card.tsx**

```bash
cat > apps/web/src/pages/home/components/task-stats-card/task-stats-card.tsx << 'EOF'
import { view, useService } from '@rabjs/react';
import { useEffect } from 'react';
import { TaskService } from '../../../../services/task.service';
import { useNavigate } from 'react-router-dom';
import { Activity, Clock, CheckCircle } from 'lucide-react';

export const TaskStatsCard = view(() => {
  const taskService = useService(TaskService);
  const navigate = useNavigate();

  useEffect(() => {
    taskService.loadTasks();
  }, []);

  const tasks = taskService.tasks || [];
  const inProgress = tasks.filter((t) => t.status === 'running' || t.status === 'pending').length;
  const todo = tasks.filter((t) => t.status === 'idle' || t.status === 'disabled').length;
  const completed = tasks.filter((t) => t.status === 'completed').length;

  const stats = [
    { label: '进行中', value: inProgress, icon: Activity, color: 'text-green-600 dark:text-green-400' },
    { label: '待办', value: todo, icon: Clock, color: 'text-amber-600 dark:text-amber-400' },
    { label: '已完成', value: completed, icon: CheckCircle, color: 'text-blue-600 dark:text-blue-400' },
  ];

  return (
    <div className="bg-white/90 dark:bg-zinc-800/90 backdrop-blur-sm rounded-xl shadow-sm p-4">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">任务概览</h2>
      <div className="grid grid-cols-3 gap-3">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            onClick={() => navigate('/tasks')}
            className="text-center p-3 rounded-lg bg-gray-50 dark:bg-zinc-700/50 hover:bg-green-50 dark:hover:bg-green-900/15 cursor-pointer transition-all duration-150"
          >
            <Icon className={`w-5 h-5 mx-auto mb-1 ${color}`} />
            <div className={`text-2xl font-bold ${color}`}>{value}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
});
EOF
```

- [ ] **Step 2: 创建 index.ts**

```bash
cat > apps/web/src/pages/home/components/task-stats-card/index.ts << 'EOF'
export { TaskStatsCard } from './task-stats-card';
EOF
```

- [ ] **Step 3: 验证**

Run: `cd apps/web && pnpm tsc --noEmit 2>&1 | grep -E "(task-stats|notification)" | head -20`
Expected: 无相关错误

---

## Chunk 3: 快捷操作组件

**目标:** 创建快捷操作区，提供常用功能入口

**Files:**
- Create: `apps/web/src/pages/home/components/quick-actions/index.ts`
- Create: `apps/web/src/pages/home/components/quick-actions/quick-actions.tsx`

---

### Task 4: 创建快捷操作组件

**Files:**
- Create: `apps/web/src/pages/home/components/quick-actions/quick-actions.tsx`
- Create: `apps/web/src/pages/home/components/quick-actions/index.ts`

```tsx
import { view } from '@rabjs/react';
import { useNavigate } from 'react-router-dom';
import { Plus, Bell, ListTodo, ArrowRight } from 'lucide-react';

const actions = [
  {
    label: '新建任务',
    icon: Plus,
    onClick: () => navigate('/tasks/new'),
    description: '创建新任务',
  },
  {
    label: '查看全部通知',
    icon: Bell,
    onClick: () => navigate('/notifications'),
    description: '查看所有通知',
  },
  {
    label: '前往任务中心',
    icon: ListTodo,
    onClick: () => navigate('/tasks'),
    description: '管理所有任务',
  },
];

export const QuickActions = view(() => {
  const navigate = useNavigate();

  return (
    <div className="bg-white/90 dark:bg-zinc-800/90 backdrop-blur-sm rounded-xl shadow-sm p-4">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">快捷操作</h2>
      <div className="space-y-2">
        {actions.map(({ label, icon: Icon, onClick, description }) => (
          <button
            key={label}
            onClick={onClick}
            className="w-full flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-zinc-700/50 hover:bg-green-50 dark:hover:bg-green-900/15 hover:-translate-y-0.5 transition-all duration-150 text-left group"
          >
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
              <Icon className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-900 dark:text-white">{label}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{description}</div>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-green-500 transition-colors" />
          </button>
        ))}
      </div>
    </div>
  );
});
```

- [ ] **Step 1: 创建 quick-actions.tsx**

```bash
cat > apps/web/src/pages/home/components/quick-actions/quick-actions.tsx << 'EOF'
import { view } from '@rabjs/react';
import { useNavigate } from 'react-router-dom';
import { Plus, Bell, ListTodo, ArrowRight } from 'lucide-react';

const actions = [
  {
    label: '新建任务',
    icon: Plus,
    onClick: () => navigate('/tasks/new'),
    description: '创建新任务',
  },
  {
    label: '查看全部通知',
    icon: Bell,
    onClick: () => navigate('/notifications'),
    description: '查看所有通知',
  },
  {
    label: '前往任务中心',
    icon: ListTodo,
    onClick: () => navigate('/tasks'),
    description: '管理所有任务',
  },
];

export const QuickActions = view(() => {
  const navigate = useNavigate();

  return (
    <div className="bg-white/90 dark:bg-zinc-800/90 backdrop-blur-sm rounded-xl shadow-sm p-4">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">快捷操作</h2>
      <div className="space-y-2">
        {actions.map(({ label, icon: Icon, onClick, description }) => (
          <button
            key={label}
            onClick={onClick}
            className="w-full flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-zinc-700/50 hover:bg-green-50 dark:hover:bg-green-900/15 hover:-translate-y-0.5 transition-all duration-150 text-left group"
          >
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
              <Icon className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-900 dark:text-white">{label}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{description}</div>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-green-500 transition-colors" />
          </button>
        ))}
      </div>
    </div>
  );
});
EOF
```

- [ ] **Step 2: 创建 index.ts**

```bash
cat > apps/web/src/pages/home/components/quick-actions/index.ts << 'EOF'
export { QuickActions } from './quick-actions';
EOF
```

---

## Chunk 4: 更新首页布局

**目标:** 修改 home.tsx，整合新组件，调整布局为统计行 + 双栏内容区

**Files:**
- Modify: `apps/web/src/pages/home/home.tsx`

---

### Task 5: 更新首页布局

将现有的 Dashboard Grid 部分替换为新的布局：

```tsx
// 替换现有的 Dashboard Grid 部分
{/* Dashboard Grid - 4 列统计 */}
<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
  {/* Time Card */}
  <div className="bg-white/90 dark:bg-zinc-800/90 backdrop-blur-sm rounded-xl shadow-sm p-4 hover:shadow-md hover:-translate-y-0.5 hover:bg-green-50/50 dark:hover:bg-green-900/15 transition-all duration-150">
    <div className="flex items-center gap-2 mb-2">
      <Clock className="w-5 h-5 text-green-600 dark:text-green-400" />
      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">时间</span>
    </div>
    <div className="text-2xl font-bold text-green-600 dark:text-green-400 font-mono">
      {timeString}
    </div>
  </div>

  {/* Token Card */}
  <div className="bg-white/90 dark:bg-zinc-800/90 backdrop-blur-sm rounded-xl shadow-sm p-4 hover:shadow-md hover:-translate-y-0.5 hover:bg-green-50/50 dark:hover:bg-green-900/15 transition-all duration-150">
    <div className="flex items-center gap-2 mb-2">
      <Zap className="w-5 h-5 text-green-600 dark:text-green-400" />
      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Token 剩余</span>
    </div>
    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
      {mainModel?.current_interval_total_count - mainModel?.current_interval_usage_count || 0}
    </div>
  </div>

  {/* Task Stats Card */}
  <TaskStatsCard />

  {/* Notification Count Card */}
  <div
    onClick={() => navigate('/notifications')}
    className="bg-white/90 dark:bg-zinc-800/90 backdrop-blur-sm rounded-xl shadow-sm p-4 hover:shadow-md hover:-translate-y-0.5 hover:bg-green-50/50 dark:hover:bg-green-900/15 transition-all duration-150 cursor-pointer"
  >
    <div className="flex items-center gap-2 mb-2">
      <Bell className="w-5 h-5 text-green-600 dark:text-green-400" />
      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">未读通知</span>
    </div>
    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
      {notificationService.unreadCount}
    </div>
  </div>
</div>

{/* Content Area - 双栏布局 */}
<div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
  {/* 通知列表 - 60% */}
  <div className="lg:col-span-3">
    <NotificationList />
  </div>

  {/* 右侧面板 - 40% */}
  <div className="lg:col-span-2 space-y-4">
    <TaskStatsCard />
    <QuickActions />
  </div>
</div>
```

- [ ] **Step 1: 更新 home.tsx**

需要修改 `apps/web/src/pages/home/home.tsx`:
1. 导入新组件: `NotificationList`, `TaskStatsCard`, `QuickActions`, `Bell`
2. 导入 `useService` 和 `NotificationService`
3. 导入 `useNavigate` 从 `react-router-dom`
4. 添加 `notificationService` 和 `navigate`
5. 替换 Dashboard Grid 部分
6. 添加双栏内容区

- [ ] **Step 2: 验证构建**

Run: `cd apps/web && pnpm build 2>&1 | tail -30`
Expected: 构建成功，无错误

- [ ] **Step 3: 本地测试**

Run: `pnpm dev:web`
Expected: 首页显示新布局，通知列表、任务统计、快捷操作正常工作

---

## 验收标准

1. 首页显示 4 个统计卡片：时间、Token 剩余、进行中任务数、未读通知数
2. 通知列表正确显示未读通知，支持标记已读和删除
3. 任务统计卡片显示进行中/待办/已完成数量，点击跳转 /tasks
4. 快捷操作区三个入口正常工作
5. 响应式布局：小屏幕下单栏，大屏幕双栏
6. 无 TypeScript 类型错误
7. 构建成功

---

## 依赖项

- `@rabjs/react` - 已使用
- `react-router-dom` - 已使用
- `lucide-react` - 已使用
