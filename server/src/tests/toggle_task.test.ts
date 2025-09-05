import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { tasksTable } from '../db/schema';
import { type ToggleTaskInput } from '../schema';
import { toggleTask } from '../handlers/toggle_task';
import { eq } from 'drizzle-orm';

describe('toggleTask', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should toggle task from incomplete to complete', async () => {
    // Create a test task that is initially incomplete
    const createdTask = await db.insert(tasksTable)
      .values({
        title: 'Test Task',
        description: 'A task to test toggling',
        completed: false
      })
      .returning()
      .execute();

    const testInput: ToggleTaskInput = {
      id: createdTask[0].id,
      completed: true
    };

    const result = await toggleTask(testInput);

    // Verify the task is now completed
    expect(result.id).toEqual(createdTask[0].id);
    expect(result.title).toEqual('Test Task');
    expect(result.description).toEqual('A task to test toggling');
    expect(result.completed).toBe(true);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);

    // Verify updated_at is more recent than created_at
    expect(result.updated_at.getTime()).toBeGreaterThan(result.created_at.getTime());
  });

  it('should toggle task from complete to incomplete', async () => {
    // Create a test task that is initially complete
    const createdTask = await db.insert(tasksTable)
      .values({
        title: 'Completed Task',
        description: null, // Test with null description
        completed: true
      })
      .returning()
      .execute();

    const testInput: ToggleTaskInput = {
      id: createdTask[0].id,
      completed: false
    };

    const result = await toggleTask(testInput);

    // Verify the task is now incomplete
    expect(result.id).toEqual(createdTask[0].id);
    expect(result.title).toEqual('Completed Task');
    expect(result.description).toBeNull();
    expect(result.completed).toBe(false);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update the task in database', async () => {
    // Create a test task
    const createdTask = await db.insert(tasksTable)
      .values({
        title: 'Database Test Task',
        description: 'Testing database persistence',
        completed: false
      })
      .returning()
      .execute();

    const testInput: ToggleTaskInput = {
      id: createdTask[0].id,
      completed: true
    };

    await toggleTask(testInput);

    // Query the database directly to verify the update
    const tasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, createdTask[0].id))
      .execute();

    expect(tasks).toHaveLength(1);
    expect(tasks[0].completed).toBe(true);
    expect(tasks[0].updated_at).toBeInstanceOf(Date);

    // Verify updated_at was actually updated
    expect(tasks[0].updated_at.getTime()).toBeGreaterThan(createdTask[0].updated_at.getTime());
  });

  it('should throw error for non-existent task', async () => {
    const testInput: ToggleTaskInput = {
      id: 99999, // Non-existent task ID
      completed: true
    };

    // Test that the function throws an error
    await expect(toggleTask(testInput)).rejects.toThrow(/Task with id 99999 not found/i);
  });

  it('should handle multiple toggle operations correctly', async () => {
    // Create a test task
    const createdTask = await db.insert(tasksTable)
      .values({
        title: 'Multi-toggle Task',
        description: 'Testing multiple toggles',
        completed: false
      })
      .returning()
      .execute();

    // Toggle to completed
    let result = await toggleTask({
      id: createdTask[0].id,
      completed: true
    });
    expect(result.completed).toBe(true);
    const firstUpdate = result.updated_at;

    // Wait a moment to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    // Toggle back to incomplete
    result = await toggleTask({
      id: createdTask[0].id,
      completed: false
    });
    expect(result.completed).toBe(false);
    expect(result.updated_at.getTime()).toBeGreaterThan(firstUpdate.getTime());

    // Toggle back to completed again
    result = await toggleTask({
      id: createdTask[0].id,
      completed: true
    });
    expect(result.completed).toBe(true);
  });

  it('should preserve other task fields when toggling', async () => {
    // Create a task with specific values
    const createdTask = await db.insert(tasksTable)
      .values({
        title: 'Preserve Fields Task',
        description: 'This description should be preserved',
        completed: false
      })
      .returning()
      .execute();

    const originalTitle = createdTask[0].title;
    const originalDescription = createdTask[0].description;
    const originalCreatedAt = createdTask[0].created_at;

    // Toggle the task
    const result = await toggleTask({
      id: createdTask[0].id,
      completed: true
    });

    // Verify other fields are preserved
    expect(result.title).toEqual(originalTitle);
    expect(result.description).toEqual(originalDescription);
    expect(result.created_at).toEqual(originalCreatedAt);
    expect(result.completed).toBe(true);
    
    // Only updated_at should change
    expect(result.updated_at.getTime()).toBeGreaterThan(originalCreatedAt.getTime());
  });
});