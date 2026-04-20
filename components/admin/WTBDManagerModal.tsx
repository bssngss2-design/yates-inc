'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useMail } from '@/contexts/MailContext';
import { employees, firedEmployees } from '@/utils/products';
import { Task } from '@/types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Logan-only management UI for WTBD tasks. Lives in the Admin Bar.
 * Employees still see their tasks on the homepage and can update progress there.
 */
export default function WTBDManagerModal({ isOpen, onClose }: Props) {
  const { employee } = useAuth();
  const { createConversation } = useMail();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTask, setNewTask] = useState({
    task_name: '',
    description: '',
    assigned_to_id: '',
    assigned_to_name: '',
    due_date: '',
  });
  const [flash, setFlash] = useState<string | null>(null);

  const roster = [...employees, ...firedEmployees];

  const fetchTasks = useCallback(async () => {
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .order('due_date', { ascending: true });
    if (data) setTasks(data);
  }, []);

  useEffect(() => {
    if (isOpen) fetchTasks();
  }, [isOpen, fetchTasks]);

  const handleAdd = async () => {
    if (!employee) return;
    if (!newTask.task_name.trim() || !newTask.assigned_to_id.trim() || !newTask.due_date) {
      setFlash('Task name, assignee and due date required');
      return;
    }
    // Auto-fill assignee name if not provided
    let assignedName = newTask.assigned_to_name.trim();
    if (!assignedName) {
      const match = roster.find((e) => e.id === newTask.assigned_to_id.trim());
      assignedName = match?.name || newTask.assigned_to_id.trim();
    }

    const { error } = await supabase.from('tasks').insert([
      {
        task_name: newTask.task_name,
        description: newTask.description,
        assigned_to_id: newTask.assigned_to_id,
        assigned_to_name: assignedName,
        progress_percentage: 0,
        due_date: newTask.due_date,
        created_by_id: employee.id,
      },
    ]);
    if (error) {
      setFlash(error.message);
      return;
    }
    setShowAddTask(false);
    setNewTask({ task_name: '', description: '', assigned_to_id: '', assigned_to_name: '', due_date: '' });
    setFlash('Task added!');
    await fetchTasks();
  };

  const handleDelete = async (taskId: string, taskName: string) => {
    if (!employee) return;
    const { error } = await supabase.from('tasks').delete().eq('id', taskId);
    if (!error) {
      setFlash(`Deleted "${taskName}"`);
      await fetchTasks();
    }
  };

  const handleNudge = async (task: Task) => {
    if (!employee) return;
    await createConversation(
      `[Nudge] ${task.task_name}`,
      ['000001', task.assigned_to_id],
      `Hey ${task.assigned_to_name} — just a reminder about your task "${task.task_name}" (${task.progress_percentage}% done, due ${new Date(task.due_date).toLocaleDateString()}).`,
      employee.id,
      'high',
    );
    setFlash(`Nudged ${task.assigned_to_name}`);
  };

  const handleDateChange = async (taskId: string, newDate: string) => {
    await supabase.from('tasks').update({ due_date: newDate }).eq('id', taskId);
    await fetchTasks();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[210] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border-4 border-blue-600 max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-5 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black">📋 WTBD Manager</h2>
            <p className="text-xs opacity-90">What To Be Done · Logan-only controls</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-full w-10 h-10 flex items-center justify-center text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {flash && (
          <div className="px-5 py-2 bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-200 text-sm border-b border-blue-200 dark:border-blue-900">
            {flash}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {tasks.length} active task{tasks.length === 1 ? '' : 's'}
            </div>
            <button
              onClick={() => setShowAddTask(!showAddTask)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold"
            >
              {showAddTask ? 'Cancel' : '+ Add Task'}
            </button>
          </div>

          {showAddTask && (
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg space-y-3 border border-gray-200 dark:border-gray-700">
              <input
                type="text"
                placeholder="Task Name"
                value={newTask.task_name}
                onChange={(e) => setNewTask({ ...newTask, task_name: e.target.value })}
                className="w-full border dark:border-gray-600 rounded px-3 py-2 dark:bg-gray-900 dark:text-white text-sm"
              />
              <textarea
                placeholder="Description (optional)"
                value={newTask.description}
                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                className="w-full border dark:border-gray-600 rounded px-3 py-2 dark:bg-gray-900 dark:text-white text-sm"
                rows={3}
              />
              <div className="grid md:grid-cols-2 gap-3">
                <select
                  value={newTask.assigned_to_id}
                  onChange={(e) => {
                    const id = e.target.value;
                    const match = roster.find((emp) => emp.id === id);
                    setNewTask({
                      ...newTask,
                      assigned_to_id: id,
                      assigned_to_name: match?.name || '',
                    });
                  }}
                  className="border dark:border-gray-600 rounded px-3 py-2 dark:bg-gray-900 dark:text-white text-sm"
                >
                  <option value="">Assign to...</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.role})
                    </option>
                  ))}
                </select>
                <input
                  type="date"
                  value={newTask.due_date}
                  onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                  className="border dark:border-gray-600 rounded px-3 py-2 dark:bg-gray-900 dark:text-white text-sm"
                />
              </div>
              <button
                onClick={handleAdd}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-bold w-full"
              >
                Create Task
              </button>
            </div>
          )}

          <div className="space-y-2">
            {tasks.length === 0 ? (
              <div className="text-center text-gray-500 dark:text-gray-400 py-8 text-sm italic">
                No active tasks. Add one above.
              </div>
            ) : (
              tasks.map((task) => (
                <div
                  key={task.id}
                  className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-gray-900 dark:text-white truncate">
                        {task.task_name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {task.assigned_to_name} · {task.progress_percentage}%
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleNudge(task)}
                        className="text-xs bg-yellow-500 hover:bg-yellow-600 text-white px-2 py-1 rounded font-bold"
                        title="Send a nudge"
                      >
                        Nudge
                      </button>
                      <button
                        onClick={() => handleDelete(task.id, task.task_name)}
                        className="text-xs bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded font-bold"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${task.progress_percentage}%` }}
                    />
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-gray-500">Due:</span>
                    <input
                      type="date"
                      value={task.due_date.slice(0, 10)}
                      onChange={(e) => handleDateChange(task.id, e.target.value)}
                      className="border dark:border-gray-600 rounded px-2 py-0.5 dark:bg-gray-900 dark:text-white text-xs"
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
