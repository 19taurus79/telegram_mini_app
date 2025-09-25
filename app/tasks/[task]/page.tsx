"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams, useSearchParams } from "next/navigation";
import { CSSProperties } from "react";
import { FadeLoader } from "react-spinners";

import BackBtn from "@/components/BackBtn/BackBtn";
import TaskCart from "@/components/TaskCart/TaskCart";
import TasksBtn from "@/components/TasksBtn/TasksBtn";
import { getTaskById, getTaskStatus, getUserByinitData } from "@/lib/api";
import { getInitData } from "@/lib/getInitData";
// import { TaskGoogle, TaskStatus, User } from "@/types/types";

const override: CSSProperties = {
  display: "block",
  margin: "0 auto",
};

// Helper function to fetch all data for the task detail view
const fetchTaskDetail = async (taskId: string) => {
  const initData = getInitData(); // Safe to call on client

  // Fetch task, status, and user in parallel for efficiency
  const taskPromise = getTaskById(taskId);
  const taskStatusPromise = getTaskStatus(taskId); // Assuming getTaskStatus uses the same Google Task ID
  const userPromise = initData
    ? getUserByinitData(initData)
    : Promise.resolve(null);

  const [task, taskStatus, user] = await Promise.all([
    taskPromise,
    taskStatusPromise,
    userPromise,
  ]);

  return { task, taskStatus, user };
};

export default function DetailTask() {
  const params = useParams();
  const searchParams = useSearchParams();

  // Safely get taskId from params
  const taskIdParam = params.task;
  const taskId = Array.isArray(taskIdParam) ? taskIdParam[0] : taskIdParam;

  const { data, isLoading, isError } = useQuery({
    queryKey: ["taskDetail", taskId],
    queryFn: () => fetchTaskDetail(taskId!),
    enabled: !!taskId, // Only run the query if taskId is available
  });

  const fromLink = searchParams.get("from_link") === "1";

  if (isLoading) {
    return <FadeLoader color="#0ef18e" cssOverride={override} />;
  }

  if (isError || !data || !data.task || !data.taskStatus) {
    return <div>Task not found.</div>;
  }

  const { task, taskStatus, user } = data;

  return (
    <>
      <TaskCart task={task} taskStatus={taskStatus} />
      {user?.is_admin && <TasksBtn taskId={task.id} taskStatus={taskStatus} />}
      <BackBtn isClose={fromLink} />
    </>
  );
}
