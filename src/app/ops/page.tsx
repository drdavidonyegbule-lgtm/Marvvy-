'use client';

import { useState, useEffect } from 'react';

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: number;
  assigned_to: string | null;
  due_date: string | null;
}

export default function OpsPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    loadTasks();
  }, [filter]);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const statusParam = filter !== 'all' ? `?status=${filter}` : '';
      const res = await fetch(`/api/ops/tasks${statusParam}`);
      const data = await res.json();
      setTasks(data.tasks || []);
    } catch (e) {
      console.error('Failed to load tasks:', e);
    }
    setLoading(false);
  };

  const priorityColors: Record<number, string> = {
    1: 'bg-red-500/20 text-red-300',
    2: 'bg-orange-500/20 text-orange-300',
    3: 'bg-yellow-500/20 text-yellow-300',
    4: 'bg-blue-500/20 text-blue-300',
    5: 'bg-slate-500/20 text-slate-300',
  };

  const statusColors: Record<string, string> = {
    pending: 'bg-slate-500/20 text-slate-300',
    in_progress: 'bg-blue-500/20 text-blue-300',
    completed: 'bg-emerald-500/20 text-emerald-300',
    blocked: 'bg-red-500/20 text-red-300',
  };

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">Operations</h2>
            <p className="text-white/40 text-sm">Tasks, workflows, and alerts</p>
          </div>
          <button
            onClick={loadTasks}
            className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm hover:bg-white/10 transition-all"
          >
            🔄 Refresh
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard label="Total Tasks" value={String(tasks.length)} color="violet" />
          <StatCard label="In Progress" value={String(tasks.filter(t => t.status === 'in_progress').length)} color="blue" />
          <StatCard label="Completed" value={String(tasks.filter(t => t.status === 'completed').length)} color="emerald" />
          <StatCard label="Blocked" value={String(tasks.filter(t => t.status === 'blocked').length)} color="red" />
        </div>

        {/* Filters */}
        <div className="flex gap-1 mb-6 bg-white/5 rounded-lg p-1 w-fit">
          {['all', 'pending', 'in_progress', 'completed', 'blocked'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-md text-sm capitalize transition-all ${
                filter === f ? 'bg-violet-600 text-white' : 'text-white/50 hover:text-white'
              }`}
            >
              {f.replace(/_/g, ' ')}
            </button>
          ))}
        </div>

        {/* Task list */}
        {loading ? (
          <div className="text-center py-20 text-white/40">Loading tasks...</div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-white/40 text-lg">No tasks found</p>
            <p className="text-white/20 text-sm mt-1">Ask Marvvy to create a task!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {tasks.map(task => (
              <div key={task.id} className="glass rounded-xl p-4 flex items-center gap-4 pipeline-card">
                <div className={`h-3 w-3 rounded-full flex-shrink-0 ${
                  task.status === 'completed' ? 'bg-emerald-400' :
                  task.status === 'blocked' ? 'bg-red-400' :
                  task.status === 'in_progress' ? 'bg-blue-400' :
                  'bg-slate-400'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${task.status === 'completed' ? 'line-through text-white/40' : ''}`}>
                    {task.title}
                  </p>
                  {task.description && (
                    <p className="text-xs text-white/40 mt-0.5 truncate">{task.description}</p>
                  )}
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs ${priorityColors[task.priority] || ''}`}>
                  P{task.priority}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-xs ${statusColors[task.status] || ''}`}>
                  {task.status.replace(/_/g, ' ')}
                </span>
                {task.due_date && (
                  <span className="text-xs text-white/40">{task.due_date.split(' ')[0]}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  const colors: Record<string, string> = {
    violet: 'from-violet-500/20 to-violet-600/10 border-violet-500/20',
    blue: 'from-blue-500/20 to-blue-600/10 border-blue-500/20',
    emerald: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/20',
    red: 'from-red-500/20 to-red-600/10 border-red-500/20',
  };
  return (
    <div className={`rounded-xl p-4 bg-gradient-to-br border ${colors[color]}`}>
      <p className="text-white/40 text-xs mb-1">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}
