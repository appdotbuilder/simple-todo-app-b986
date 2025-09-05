import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { trpc } from '@/utils/trpc';
import { useState, useEffect, useCallback } from 'react';
import { Trash2, Plus, CheckCircle2, Circle } from 'lucide-react';
import type { Task, CreateTaskInput } from '../../server/src/schema';

function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Load tasks from the server
  const loadTasks = useCallback(async () => {
    try {
      const result = await trpc.getTasks.query();
      setTasks(result);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    }
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // Create a new task
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    setIsCreating(true);
    try {
      const taskInput: CreateTaskInput = {
        title: newTaskTitle.trim(),
        description: null
      };
      
      const newTask = await trpc.createTask.mutate(taskInput);
      setTasks((prev: Task[]) => [...prev, newTask]);
      setNewTaskTitle('');
    } catch (error) {
      console.error('Failed to create task:', error);
    } finally {
      setIsCreating(false);
    }
  };

  // Toggle task completion status
  const handleToggleTask = async (taskId: number, completed: boolean) => {
    setIsLoading(true);
    try {
      const updatedTask = await trpc.toggleTask.mutate({
        id: taskId,
        completed
      });
      
      setTasks((prev: Task[]) =>
        prev.map((task: Task) =>
          task.id === taskId ? { ...task, completed: updatedTask.completed } : task
        )
      );
    } catch (error) {
      console.error('Failed to toggle task:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Delete a task
  const handleDeleteTask = async (taskId: number) => {
    setIsLoading(true);
    try {
      const result = await trpc.deleteTask.mutate({ id: taskId });
      if (result.success) {
        setTasks((prev: Task[]) => prev.filter((task: Task) => task.id !== taskId));
      }
    } catch (error) {
      console.error('Failed to delete task:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const completedTasks = tasks.filter((task: Task) => task.completed);
  const incompleteTasks = tasks.filter((task: Task) => !task.completed);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">✅ Simple Todo</h1>
          <p className="text-gray-600">Stay organized and get things done</p>
        </div>

        {/* Add new task form */}
        <Card className="p-6 mb-8 shadow-sm">
          <form onSubmit={handleCreateTask} className="flex gap-3">
            <Input
              placeholder="What needs to be done?"
              value={newTaskTitle}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setNewTaskTitle(e.target.value)
              }
              className="flex-1"
              disabled={isCreating}
            />
            <Button 
              type="submit" 
              disabled={isCreating || !newTaskTitle.trim()}
              className="px-6"
            >
              {isCreating ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              {!isCreating && <span className="ml-2">Add</span>}
            </Button>
          </form>
        </Card>

        {/* Tasks list */}
        <div className="space-y-6">
          {/* Incomplete tasks */}
          {incompleteTasks.length > 0 && (
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                <Circle className="w-5 h-5 text-blue-500" />
                To Do ({incompleteTasks.length})
              </h2>
              <div className="space-y-2">
                {incompleteTasks.map((task: Task) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    onToggle={handleToggleTask}
                    onDelete={handleDeleteTask}
                    isLoading={isLoading}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Separator between incomplete and complete tasks */}
          {incompleteTasks.length > 0 && completedTasks.length > 0 && (
            <Separator className="my-8" />
          )}

          {/* Completed tasks */}
          {completedTasks.length > 0 && (
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                Completed ({completedTasks.length})
              </h2>
              <div className="space-y-2">
                {completedTasks.map((task: Task) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    onToggle={handleToggleTask}
                    onDelete={handleDeleteTask}
                    isLoading={isLoading}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {tasks.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <CheckCircle2 className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">No tasks yet!</p>
                <p className="text-sm">Add a task above to get started</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer stats */}
        {tasks.length > 0 && (
          <div className="mt-8 text-center text-sm text-gray-500">
            {completedTasks.length} of {tasks.length} tasks completed
          </div>
        )}
      </div>
    </div>
  );
}

// Task item component
interface TaskItemProps {
  task: Task;
  onToggle: (id: number, completed: boolean) => void;
  onDelete: (id: number) => void;
  isLoading: boolean;
}

function TaskItem({ task, onToggle, onDelete, isLoading }: TaskItemProps) {
  const handleToggleChange = (checked: boolean) => {
    onToggle(task.id, checked);
  };

  return (
    <Card className={`p-4 transition-all duration-200 ${
      task.completed 
        ? 'bg-gray-50 border-gray-200' 
        : 'bg-white hover:shadow-sm'
    }`}>
      <div className="flex items-center gap-3">
        <Checkbox
          checked={task.completed}
          onCheckedChange={handleToggleChange}
          disabled={isLoading}
          className="mt-0.5"
        />
        
        <div className="flex-1 min-w-0">
          <h3 className={`font-medium transition-all ${
            task.completed 
              ? 'text-gray-500 line-through' 
              : 'text-gray-900'
          }`}>
            {task.title}
          </h3>
          {task.description && (
            <p className={`text-sm mt-1 ${
              task.completed ? 'text-gray-400' : 'text-gray-600'
            }`}>
              {task.description}
            </p>
          )}
          <p className="text-xs text-gray-400 mt-2">
            Created {task.created_at.toLocaleDateString()}
          </p>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(task.id)}
          disabled={isLoading}
          className="text-gray-400 hover:text-red-500 p-2"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  );
}

export default App;