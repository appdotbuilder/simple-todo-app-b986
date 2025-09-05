import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { tasksTable } from '../db/schema';
import { type CreateTaskInput } from '../schema';
import { createTask } from '../handlers/create_task';
import { eq } from 'drizzle-orm';

// Test inputs
const basicTaskInput: CreateTaskInput = {
  title: 'Complete project documentation',
  description: 'Write comprehensive documentation for the task management system'
};

const minimalTaskInput: CreateTaskInput = {
  title: 'Simple task'
  // description is optional
};

const taskWithNullDescription: CreateTaskInput = {
  title: 'Task without description',
  description: null
};

describe('createTask', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a task with full details', async () => {
    const result = await createTask(basicTaskInput);

    // Basic field validation
    expect(result.title).toEqual('Complete project documentation');
    expect(result.description).toEqual('Write comprehensive documentation for the task management system');
    expect(result.completed).toEqual(false);
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('number');
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a task with minimal details', async () => {
    const result = await createTask(minimalTaskInput);

    expect(result.title).toEqual('Simple task');
    expect(result.description).toBeNull();
    expect(result.completed).toEqual(false);
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('number');
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a task with null description', async () => {
    const result = await createTask(taskWithNullDescription);

    expect(result.title).toEqual('Task without description');
    expect(result.description).toBeNull();
    expect(result.completed).toEqual(false);
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('number');
  });

  it('should save task to database', async () => {
    const result = await createTask(basicTaskInput);

    // Query using proper drizzle syntax
    const tasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, result.id))
      .execute();

    expect(tasks).toHaveLength(1);
    expect(tasks[0].title).toEqual('Complete project documentation');
    expect(tasks[0].description).toEqual('Write comprehensive documentation for the task management system');
    expect(tasks[0].completed).toEqual(false);
    expect(tasks[0].created_at).toBeInstanceOf(Date);
    expect(tasks[0].updated_at).toBeInstanceOf(Date);
  });

  it('should create multiple tasks with unique IDs', async () => {
    const task1 = await createTask({ title: 'First task' });
    const task2 = await createTask({ title: 'Second task' });

    expect(task1.id).not.toEqual(task2.id);
    expect(task1.title).toEqual('First task');
    expect(task2.title).toEqual('Second task');
    expect(task1.completed).toEqual(false);
    expect(task2.completed).toEqual(false);

    // Verify both tasks exist in database
    const allTasks = await db.select().from(tasksTable).execute();
    expect(allTasks).toHaveLength(2);
  });

  it('should set default timestamps correctly', async () => {
    const beforeCreation = new Date();
    const result = await createTask(basicTaskInput);
    const afterCreation = new Date();

    // Timestamps should be within reasonable range
    expect(result.created_at.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
    expect(result.created_at.getTime()).toBeLessThanOrEqual(afterCreation.getTime());
    expect(result.updated_at.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
    expect(result.updated_at.getTime()).toBeLessThanOrEqual(afterCreation.getTime());

    // Initial created_at and updated_at should be very close
    const timeDiff = Math.abs(result.updated_at.getTime() - result.created_at.getTime());
    expect(timeDiff).toBeLessThan(1000); // Less than 1 second difference
  });
});