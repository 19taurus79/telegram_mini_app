import BackBtn from "@/components/BackBtn/BackBtn";
import TaskCart from "@/components/TaskCart/TaskCart";
import TasksBtn from "@/components/TasksBtn/TasksBtn";
import { getTaskById, getTaskStatus } from "@/lib/api";

type Props = {
  params: Promise<{ task: string }>;
};
export default async function DetailTask({ params }: Props) {
  const taskId = await params;
  const task = await getTaskById(taskId.task);
  const taskStatus = await getTaskStatus(task.id);

  console.log(task);
  return (
    <>
      <TaskCart task={task} taskStatus={taskStatus} />
      <TasksBtn taskId={task.id} taskStatus={taskStatus} />
      <BackBtn />
    </>
  );
}
