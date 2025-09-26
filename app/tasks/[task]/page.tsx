import { getTaskById, getTaskStatus } from "@/lib/api";
import TaskClientPage from "./TaskClientPage";

type Props = {
  params: Promise<{ task: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function DetailTaskPage({ params, searchParams }: Props) {
  const { task: taskId } = await params;
  const resolvedSearchParams = await searchParams;

  const task = await getTaskById(taskId);
  const taskStatus = await getTaskStatus(task.id);

  const fromLink = resolvedSearchParams.from_link === "1";

  return (
    <TaskClientPage
      task={task}
      taskStatus={taskStatus}
      fromLink={fromLink}
    />
  );
}