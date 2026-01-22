"use client";

import BackBtn from "@/components/BackBtn/BackBtn";
import TaskCart from "@/components/TaskCart/TaskCart";
import TasksBtn from "@/components/TasksBtn/TasksBtn";
import { useUser } from "@/store/User";
import { TaskGoogle, TaskStatus } from "@/types/types";

type Props = {
  task: TaskGoogle;
  taskStatus: TaskStatus;
  fromLink: boolean;
};

export default function TaskClientPage({ task, taskStatus, fromLink }: Props) {
  const userData = useUser((state) => state.userData);

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
