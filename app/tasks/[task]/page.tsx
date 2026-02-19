import { getTaskById, getTaskStatus } from "@/lib/api";
import TaskClientPage from "./TaskClientPage";

type Props = {
  params: Promise<{ task: string }>;
};

export default async function DetailTaskPage({ params }: Props) {
  const { task: taskId } = await params;

  const task = await getTaskById(taskId);
  const taskStatus = await getTaskStatus(task.id);

  return (
    <TaskClientPage
      task={task}
      taskStatus={taskStatus}
    />
  );
}