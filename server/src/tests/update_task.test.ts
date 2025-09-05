import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { tasksTable } from '../db/schema';
import { type UpdateTaskInput } from '../schema';
import { updateTask } from '../handlers/update_task';
import { eq } from 'drizzle-orm';

describe('updateTask', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create a test task directly in database
  const createTestTask = async (title: string = 'Original Task', description: string | null = 'Original description') => {
    const result = await db.insert(tasksTable)
      .values({
        title,
        description,
        completed: false
      })
      .returning()
      .execute();
    return result[0];
  };

  it('should update task title only', async () => {
    // Create a task first
    const createdTask = await createTestTask();
    const originalUpdatedAt = createdTask.updated_at;

    // Wait a moment to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const updateInput: UpdateTaskInput = {
      id: createdTask.id,
      title: 'Updated Task Title'
    };

    const result = await updateTask(updateInput);

    expect(result.id).toEqual(createdTask.id);
    expect(result.title).toEqual('Updated Task Title');
    expect(result.description).toEqual('Original description'); // Should remain unchanged
    expect(result.completed).toEqual(false); // Should remain unchanged
    expect(result.created_at).toEqual(createdTask.created_at); // Should remain unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > originalUpdatedAt).toBe(true); // Should be updated
  });

  it('should update task description only', async () => {
    const createdTask = await createTestTask();

    const updateInput: UpdateTaskInput = {
      id: createdTask.id,
      description: 'Updated description'
    };

    const result = await updateTask(updateInput);

    expect(result.id).toEqual(createdTask.id);
    expect(result.title).toEqual('Original Task'); // Should remain unchanged
    expect(result.description).toEqual('Updated description');
    expect(result.completed).toEqual(false); // Should remain unchanged
    expect(result.created_at).toEqual(createdTask.created_at); // Should remain unchanged
  });

  it('should update task completion status only', async () => {
    const createdTask = await createTestTask();

    const updateInput: UpdateTaskInput = {
      id: createdTask.id,
      completed: true
    };

    const result = await updateTask(updateInput);

    expect(result.id).toEqual(createdTask.id);
    expect(result.title).toEqual('Original Task'); // Should remain unchanged
    expect(result.description).toEqual('Original description'); // Should remain unchanged
    expect(result.completed).toEqual(true);
    expect(result.created_at).toEqual(createdTask.created_at); // Should remain unchanged
  });

  it('should update multiple fields at once', async () => {
    const createdTask = await createTestTask();

    const updateInput: UpdateTaskInput = {
      id: createdTask.id,
      title: 'Completely Updated Task',
      description: 'Completely updated description',
      completed: true
    };

    const result = await updateTask(updateInput);

    expect(result.id).toEqual(createdTask.id);
    expect(result.title).toEqual('Completely Updated Task');
    expect(result.description).toEqual('Completely updated description');
    expect(result.completed).toEqual(true);
    expect(result.created_at).toEqual(createdTask.created_at); // Should remain unchanged
  });

  it('should set description to null when explicitly provided', async () => {
    const createdTask = await createTestTask();

    const updateInput: UpdateTaskInput = {
      id: createdTask.id,
      description: null
    };

    const result = await updateTask(updateInput);

    expect(result.id).toEqual(createdTask.id);
    expect(result.title).toEqual('Original Task'); // Should remain unchanged
    expect(result.description).toBeNull();
    expect(result.completed).toEqual(false); // Should remain unchanged
  });

  it('should save updates to database', async () => {
    const createdTask = await createTestTask();

    const updateInput: UpdateTaskInput = {
      id: createdTask.id,
      title: 'Database Test Update',
      completed: true
    };

    await updateTask(updateInput);

    // Query database directly to verify changes
    const tasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, createdTask.id))
      .execute();

    expect(tasks).toHaveLength(1);
    expect(tasks[0].title).toEqual('Database Test Update');
    expect(tasks[0].completed).toEqual(true);
    expect(tasks[0].description).toEqual('Original description'); // Should remain unchanged
    expect(tasks[0].updated_at).toBeInstanceOf(Date);
  });

  it('should always update the updated_at timestamp', async () => {
    const createdTask = await createTestTask();
    const originalUpdatedAt = createdTask.updated_at;

    // Wait to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    // Update with minimal change
    const updateInput: UpdateTaskInput = {
      id: createdTask.id,
      title: createdTask.title // Same title
    };

    const result = await updateTask(updateInput);

    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > originalUpdatedAt).toBe(true);
  });

  it('should throw error when task does not exist', async () => {
    const updateInput: UpdateTaskInput = {
      id: 999999, // Non-existent ID
      title: 'Should fail'
    };

    await expect(updateTask(updateInput)).rejects.toThrow(/not found/i);
  });

  it('should handle task with null description', async () => {
    // Create task with null description
    const createdTask = await createTestTask('Task with null description', null);

    const updateInput: UpdateTaskInput = {
      id: createdTask.id,
      title: 'Updated task with null description'
    };

    const result = await updateTask(updateInput);

    expect(result.title).toEqual('Updated task with null description');
    expect(result.description).toBeNull(); // Should remain null
    expect(result.completed).toEqual(false);
  });

  it('should handle empty update input gracefully', async () => {
    const createdTask = await createTestTask();
    const originalUpdatedAt = createdTask.updated_at;

    // Wait to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    // Update with only ID (no other fields to update)
    const updateInput: UpdateTaskInput = {
      id: createdTask.id
    };

    const result = await updateTask(updateInput);

    // All original values should remain the same except updated_at
    expect(result.id).toEqual(createdTask.id);
    expect(result.title).toEqual('Original Task');
    expect(result.description).toEqual('Original description');
    expect(result.completed).toEqual(false);
    expect(result.created_at).toEqual(createdTask.created_at);
    expect(result.updated_at > originalUpdatedAt).toBe(true); // Should still be updated
  });
});