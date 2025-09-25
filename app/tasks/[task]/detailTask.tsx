"use client";
import BackBtn from "@/components/BackBtn/BackBtn";

import TaskCart from "@/components/TaskCart/TaskCart";
import TasksBtn from "@/components/TasksBtn/TasksBtn";
import { getTaskById, getTaskStatus, getUserByinitData } from "@/lib/api";
import { getInitData } from "@/lib/getInitData";
import { useQuery } from "@tanstack/react-query";
import { CSSProperties } from "react";
import { FadeLoader } from "react-spinners";

// type Props = {
//   // Adhering to project's specific convention of props being Promises.
//   params: Promise<{ task: string }>;
//   searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
// };
const override: CSSProperties = {
  display: "block",
  margin: "0 auto",
};
const fetchTaskDetail = async (id: string) => {
  const initData = getInitData();
  const task = await getTaskById(id);
  const taskStatus = await getTaskStatus(task.id);
  const user = await getUserByinitData(initData);
  return {
    ...task,
    taskStatus,
    user,
  };
};
export default function DetailTask({
  taskId,
  searchParams,
}: {
  taskId: string;
  searchParams: string;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["taskDetail", taskId],
    queryFn: () => fetchTaskDetail(taskId),
  });
  const fromLink = searchParams === "1";

  if (isLoading) return <FadeLoader color="#0ef18e" cssOverride={override} />;

  if (!data) return <div>Задача не найдена</div>;

  const { user, taskStatus, ...objWithoutUser } = data;
  console.log(user, taskStatus, objWithoutUser);
  return (
    <>
      <TaskCart task={objWithoutUser} taskStatus={taskStatus} />
      <TasksBtn taskId={data.id} taskStatus={data.taskStatus} />
      <BackBtn isClose={fromLink} />
    </>
  );
}
