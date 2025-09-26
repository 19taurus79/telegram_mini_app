import TaskClientPage from "./TaskClientPage";

type Props = {
  params: Promise<{ task: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function DetailTaskPage({ params, searchParams }: Props) {
  const { task: taskId } = await params;
  const resolvedSearchParams = await searchParams;
  const fromLink = resolvedSearchParams.from_link === "1";

  // Simply render the client component and pass props.
  // The client component will now be responsible for all data fetching.
  return <TaskClientPage taskId={taskId} fromLink={fromLink} />;
}
