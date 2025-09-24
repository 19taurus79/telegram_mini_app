import BackBtn from "@/components/BackBtn/BackBtn";
import TaskCart from "@/components/TaskCart/TaskCart";
import TasksBtn from "@/components/TasksBtn/TasksBtn";
import { getTaskById, getTaskStatus } from "@/lib/api";

// The window object is not available in Server Components.
// URL search parameters should be accessed via the `searchParams` prop.

type Props = {
  // Adhering to project's specific convention of props being Promises.
  params: Promise<{ task: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function DetailTask({ params, searchParams }: Props) {
  // Awaiting the promises as per project convention.
  const { task: taskId } = await params;
  const resolvedSearchParams = await searchParams;

  const task = await getTaskById(taskId);
  const taskStatus = await getTaskStatus(task.id);

  // Logic to read URL parameters now uses the resolved `searchParams` object.
  const fromLink = resolvedSearchParams.from_link === "1";

  console.log(task);
  console.log(fromLink);
  console.log(resolvedSearchParams);
  return (
    <>
      <TaskCart task={task} taskStatus={taskStatus} />
      <TasksBtn taskId={task.id} taskStatus={taskStatus} />
      {/* 
        Passing a function that uses browser-only APIs (window) from a Server Component
        to a Client Component prop can cause issues. This might need to be refactored
        by moving the logic into the BackBtn component itself.
      */}
      <BackBtn onBack={fromLink ? () => window.history.back() : undefined} />
    </>
  );
}
