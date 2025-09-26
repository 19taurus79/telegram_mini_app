"use client";

import { useQuery } from "@tanstack/react-query";
import { getTaskById, getTaskStatus } from "@/lib/api";
import TaskCart from "@/components/TaskCart/TaskCart";
import TasksBtn from "@/components/TasksBtn/TasksBtn";
import BackBtn from "@/components/BackBtn/BackBtn";
// import { TaskGoogle, TaskStatus } from "@/types/types";
import { FadeLoader } from "react-spinners";
// import css from "./page.module.css";
import { useUser } from "@/store/User";
import { CSSProperties } from "react";
type Props = {
  taskId: string;
  fromLink: boolean;
};
const override: CSSProperties = {
  display: "block",
  margin: "0 auto",
  borderColor: "red",
};

export default function TaskClientPage({ taskId, fromLink }: Props) {
  const { data: task, isLoading: isLoadingTask } = useQuery({
    queryKey: ["task", taskId],
    queryFn: () => getTaskById(taskId),
  });
  const userData = useUser((state) => state.userData);
  const { data: taskStatus, isLoading: isLoadingStatus } = useQuery({
    queryKey: ["taskStatus", taskId],
    queryFn: () => getTaskStatus(taskId),
  });

  if (isLoadingTask || isLoadingStatus || !task || !taskStatus) {
    return <FadeLoader color="#36d7b7" cssOverride={override} />;
  }
  console.log("User from store:", userData);
  return (
    <>
      <TaskCart task={task} taskStatus={taskStatus} />
      {userData?.is_admin && (
        <TasksBtn taskId={task.id} taskStatus={taskStatus} />
      )}

      <BackBtn isClose={fromLink} />
    </>
  );
}
