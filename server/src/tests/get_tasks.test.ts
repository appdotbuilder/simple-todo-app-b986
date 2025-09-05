import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { tasksTable } from '../db/schema';
import { type CreateTaskInput } from '../schema';
import { getTasks } from '../handlers/get_tasks';

describe('getTasks', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no tasks exist', async () => {
    const result = await getTasks();
    
    expect(result).toEqual([]);
    expect(result).toHaveLength(0);
  });

  it('should return all tasks in correct format', async () => {
    // Create test tasks directly in database
    await db.insert(tasksTable).values([
      {
        title: 'First Task',
        description: 'First task description',
        completed: false
      },
      {
        title: 'Second Task',
        description: null, // Test nullable field
        completed: true
      },
      {
        title: 'Third Task',
        description: 'Third task description',
        completed: false
      }
    ]).execute();

    const result = await getTasks();
    
    expect(result).toHaveLength(3);
    
    // Verify all required fields are present
    result.forEach(task => {
      expect(task.id).toBeDefined();
      expect(typeof task.id).toBe('number');
      expect(task.title).toBeDefined();
      expect(typeof task.title).toBe('string');
      expect(typeof task.completed).toBe('boolean');
      expect(task.created_at).toBeInstanceOf(Date);
      expect(task.updated_at).toBeInstanceOf(Date);
      // description can be null or string
      expect(task.description === null || typeof task.description === 'string').toBe(true);
    });
  });

  it('should return tasks ordered by creation date (newest first)', async () => {
    // Create tasks with slight delays to ensure different timestamps
    await db.insert(tasksTable).values({
      title: 'Oldest Task',
      description: 'Created first',
      completed: false
    }).execute();

    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    await db.insert(tasksTable).values({
      title: 'Newest Task',
      description: 'Created last',
      completed: false
    }).execute();

    const result = await getTasks();
    
    expect(result).toHaveLength(2);
    expect(result[0].title).toBe('Newest Task');
    expect(result[1].title).toBe('Oldest Task');
    
    // Verify ordering by checking timestamps
    expect(result[0].created_at >= result[1].created_at).toBe(true);
  });

  it('should handle tasks with various completion states', async () => {
    await db.insert(tasksTable).values([
      {
        title: 'Completed Task',
        description: 'This is done',
        completed: true
      },
      {
        title: 'Incomplete Task',
        description: 'Still working on this',
        completed: false
      }
    ]).execute();

    const result = await getTasks();
    
    expect(result).toHaveLength(2);
    
    const completedTask = result.find(t => t.title === 'Completed Task');
    const incompleteTask = result.find(t => t.title === 'Incomplete Task');
    
    expect(completedTask?.completed).toBe(true);
    expect(incompleteTask?.completed).toBe(false);
  });

  it('should handle tasks with null descriptions', async () => {
    await db.insert(tasksTable).values({
      title: 'Task Without Description',
      description: null,
      completed: false
    }).execute();

    const result = await getTasks();
    
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Task Without Description');
    expect(result[0].description).toBe(null);
  });

  it('should handle large number of tasks efficiently', async () => {
    // Create 50 tasks to test performance and pagination readiness
    const taskData = Array.from({ length: 50 }, (_, i) => ({
      title: `Task ${i + 1}`,
      description: `Description for task ${i + 1}`,
      completed: i % 2 === 0 // Alternate between completed/incomplete
    }));

    await db.insert(tasksTable).values(taskData).execute();

    const result = await getTasks();
    
    expect(result).toHaveLength(50);
    
    // Verify all tasks are present and properly formatted
    expect(result.every(task => 
      typeof task.id === 'number' &&
      typeof task.title === 'string' &&
      typeof task.completed === 'boolean' &&
      task.created_at instanceof Date &&
      task.updated_at instanceof Date
    )).toBe(true);

    // Verify ordering is maintained (newest first)
    for (let i = 0; i < result.length - 1; i++) {
      expect(result[i].created_at >= result[i + 1].created_at).toBe(true);
    }
  });
});