import BackBtn from "@/components/BackBtn/BackBtn";
import TaskCart from "@/components/TaskCart/TaskCart";
import TasksBtn from "@/components/TasksBtn/TasksBtn";
import { getTaskById, getTaskStatus } from "@/lib/api";

type Props = {
  params: Promise<{ task: string }>;
};
const urlParams = new URLSearchParams(window.location.search);
const fromLink = urlParams.get("from_link") === "1";
export default async function DetailTask({ params }: Props) {
  const taskId = await params;
  const task = await getTaskById(taskId.task);
  const taskStatus = await getTaskStatus(task.id);

  console.log(task);
  return (
    <>
      <TaskCart task={task} taskStatus={taskStatus} />
      <TasksBtn taskId={task.id} taskStatus={taskStatus} />
      <BackBtn onBack={fromLink ? () => window.history.back() : undefined} />
    </>
  );
}
