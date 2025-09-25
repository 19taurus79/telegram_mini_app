"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import BackBtn from "@/components/BackBtn/BackBtn";
import TaskCart from "@/components/TaskCart/TaskCart";
import TasksBtn from "@/components/TasksBtn/TasksBtn";
import { getTaskById, getTaskStatus, getUserByinitData } from "@/lib/api";
import { getInitData } from "@/lib/getInitData";
import { TaskGoogle, TaskStatus, User } from "@/types/types";

export default function DetailTask() {
  const params = useParams();
  const searchParams = useSearchParams();

  // Safely get taskId from params
  const taskIdParam = params.task;
  const taskId = Array.isArray(taskIdParam) ? taskIdParam[0] : taskIdParam;

  // State for all data with corrected TaskGoogle type
  const [task, setTask] = useState<TaskGoogle | null>(null);
  const [taskStatus, setTaskStatus] = useState<TaskStatus | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (taskId) {
      const fetchData = async () => {
        try {
          setIsLoading(true);
          const initData = getInitData();

          // Use getTaskById as it returns the correct TaskGoogle type required by TaskCart
          const taskData = await getTaskById(taskId);
          const statusData = await getTaskStatus(taskData.id);

          if (initData) {
            const userData = await getUserByinitData(initData);
            setUser(userData);
          }
          setTask(taskData);
          setTaskStatus(statusData);
        } catch (error) {
          console.error("Failed to fetch task details:", error);
        } finally {
          setIsLoading(false);
        }
      };
      fetchData();
    }
  }, [taskId]);

  const fromLink = searchParams.get("from_link") === "1";

  if (isLoading) {
    return <div>Loading...</div>; // Or a proper skeleton loader
  }

  if (!task || !taskStatus) {
    return <div>Task not found.</div>;
  }

  return (
    <>
      <TaskCart task={task} taskStatus={taskStatus} />
      {user?.is_admin && <TasksBtn taskId={task.id} taskStatus={taskStatus} />}
      <BackBtn isClose={fromLink} />
    </>
  );
}
