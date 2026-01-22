"use client";
import { getEventByUser } from "@/lib/api";
import Loader from "@/components/Loader/Loader";
import EventsSmall from "./clientPage";
import { useQuery } from "@tanstack/react-query";

export default function Events() {
  const { data: events, isLoading } = useQuery({
    queryKey: ["events"],
    queryFn: () => getEventByUser(),
  });
  if (isLoading) {
    // return <div>Loading...</div>;
    return <Loader />;
  }
  if (events) return <EventsSmall events={events} />;
}
