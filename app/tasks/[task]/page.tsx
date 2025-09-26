import { getTaskById, getTaskStatus } from "@/lib/api";
import TaskClientPage from "./TaskClientPage";
import {
  HydrationBoundary,
  QueryClient,
  dehydrate,
} from "@tanstack/react-query";

type Props = {
  params: Promise<{ task: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function DetailTaskPage({ params, searchParams }: Props) {
  const { task: taskId } = await params;
  const resolvedSearchParams = await searchParams;
  const fromLink = resolvedSearchParams.from_link === "1";

  const queryClient = new QueryClient();

  await queryClient.prefetchQuery({
    queryKey: ["task", taskId],
    queryFn: () => getTaskById(taskId),
  });

  await queryClient.prefetchQuery({
    queryKey: ["taskStatus", taskId],
    queryFn: () => getTaskStatus(taskId),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <TaskClientPage taskId={taskId} fromLink={fromLink} />
    </HydrationBoundary>
  );
}