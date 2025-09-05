import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { tasksTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type DeleteTaskInput, type CreateTaskInput } from '../schema';
import { deleteTask } from '../handlers/delete_task';

// Test input for creating tasks
const testTaskInput: CreateTaskInput = {
  title: 'Test Task',
  description: 'A task for testing'
};

describe('deleteTask', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete an existing task', async () => {
    // Create a task first
    const createdTask = await db.insert(tasksTable)
      .values({
        title: testTaskInput.title,
        description: testTaskInput.description,
        completed: false
      })
      .returning()
      .execute();

    const taskId = createdTask[0].id;

    // Delete the task
    const deleteInput: DeleteTaskInput = { id: taskId };
    const result = await deleteTask(deleteInput);

    // Verify success response
    expect(result.success).toBe(true);

    // Verify task is actually deleted from database
    const deletedTasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, taskId))
      .execute();

    expect(deletedTasks).toHaveLength(0);
  });

  it('should return false when deleting non-existent task', async () => {
    // Try to delete a task that doesn't exist
    const deleteInput: DeleteTaskInput = { id: 999 };
    const result = await deleteTask(deleteInput);

    // Should return success: false since no rows were affected
    expect(result.success).toBe(false);
  });

  it('should only delete the specified task', async () => {
    // Create multiple tasks
    const task1 = await db.insert(tasksTable)
      .values({
        title: 'Task 1',
        description: 'First task',
        completed: false
      })
      .returning()
      .execute();

    const task2 = await db.insert(tasksTable)
      .values({
        title: 'Task 2',
        description: 'Second task',
        completed: true
      })
      .returning()
      .execute();

    const task1Id = task1[0].id;
    const task2Id = task2[0].id;

    // Delete only the first task
    const deleteInput: DeleteTaskInput = { id: task1Id };
    const result = await deleteTask(deleteInput);

    // Verify success
    expect(result.success).toBe(true);

    // Verify first task is deleted
    const deletedTasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, task1Id))
      .execute();

    expect(deletedTasks).toHaveLength(0);

    // Verify second task still exists
    const remainingTasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, task2Id))
      .execute();

    expect(remainingTasks).toHaveLength(1);
    expect(remainingTasks[0].title).toBe('Task 2');
    expect(remainingTasks[0].completed).toBe(true);
  });

  it('should handle completed and incomplete tasks equally', async () => {
    // Create a completed task
    const completedTask = await db.insert(tasksTable)
      .values({
        title: 'Completed Task',
        description: 'This task is done',
        completed: true
      })
      .returning()
      .execute();

    // Create an incomplete task
    const incompleteTask = await db.insert(tasksTable)
      .values({
        title: 'Incomplete Task',
        description: 'This task is not done',
        completed: false
      })
      .returning()
      .execute();

    const completedTaskId = completedTask[0].id;
    const incompleteTaskId = incompleteTask[0].id;

    // Delete completed task
    const deleteCompletedInput: DeleteTaskInput = { id: completedTaskId };
    const completedResult = await deleteTask(deleteCompletedInput);
    expect(completedResult.success).toBe(true);

    // Delete incomplete task
    const deleteIncompleteInput: DeleteTaskInput = { id: incompleteTaskId };
    const incompleteResult = await deleteTask(deleteIncompleteInput);
    expect(incompleteResult.success).toBe(true);

    // Verify both tasks are deleted
    const allTasks = await db.select().from(tasksTable).execute();
    expect(allTasks).toHaveLength(0);
  });

  it('should handle tasks with null descriptions', async () => {
    // Create a task with null description
    const taskWithNullDesc = await db.insert(tasksTable)
      .values({
        title: 'Task with null description',
        description: null,
        completed: false
      })
      .returning()
      .execute();

    const taskId = taskWithNullDesc[0].id;

    // Delete the task
    const deleteInput: DeleteTaskInput = { id: taskId };
    const result = await deleteTask(deleteInput);

    // Verify successful deletion
    expect(result.success).toBe(true);

    // Verify task is deleted
    const deletedTasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, taskId))
      .execute();

    expect(deletedTasks).toHaveLength(0);
  });
});