"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import BackBtn from "@/components/BackBtn/BackBtn";
import TaskCart from "@/components/TaskCart/TaskCart";
import TasksBtn from "@/components/TasksBtn/TasksBtn";
import {
  getTaskById,
  getTaskStatus,
  getUserByinitData,
  getAllTasks,
} from "@/lib/api";
import { getInitData } from "@/lib/getInitData";
import { TaskGoogle, TaskStatus, User } from "@/types/types";

export default function DetailTask() {
  const params = useParams();
  const searchParams = useSearchParams();

  // Safely get taskId from params
  const taskIdParam = params.task;
  const taskId = Array.isArray(taskIdParam) ? taskIdParam[0] : taskIdParam; // This is the Google Task ID

  // State for all data
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

          // 1. Fetch the TaskGoogle object, which is required by the TaskCart component
          const taskGoogleData = await getTaskById(taskId);

          let statusData = null;
          if (initData) {
            // 2. Fetch all internal tasks to find the internal DB ID
            const allTasks = await getAllTasks(initData);
            const taskInnerData = allTasks.find((t) => t.task_id === taskId);

            // 3. If we found the corresponding internal task, use its ID to get the status
            if (taskInnerData) {
              statusData = await getTaskStatus(taskInnerData.id);
            }

            const userData = await getUserByinitData(initData);
            setUser(userData);
          }

          setTask(taskGoogleData);
          setTaskStatus(statusData);
        } catch (error) {
          console.error("Failed to fetch task details:", error);
          // Clear state on error to ensure "Task not found" is shown
          setTask(null);
          setTaskStatus(null);
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
      {/* The taskId for the button should be the Google Task ID */}
      {user?.is_admin && <TasksBtn taskId={task.id} taskStatus={taskStatus} />}
      <BackBtn isClose={fromLink} />
    </>
  );
}
