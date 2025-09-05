import { db } from '../db';
import { tasksTable } from '../db/schema';
import { type ToggleTaskInput, type Task } from '../schema';
import { eq } from 'drizzle-orm';

export const toggleTask = async (input: ToggleTaskInput): Promise<Task> => {
  try {
    // Update the task's completed status and updated_at timestamp
    const result = await db.update(tasksTable)
      .set({ 
        completed: input.completed,
        updated_at: new Date() // Update timestamp to current time
      })
      .where(eq(tasksTable.id, input.id))
      .returning()
      .execute();

    // Check if task was found and updated
    if (result.length === 0) {
      throw new Error(`Task with id ${input.id} not found`);
    }

    // Return the updated task
    return result[0];
  } catch (error) {
    console.error('Task toggle failed:', error);
    throw error;
  }
};