"use client";
import { getEventByUser } from "@/lib/api";
import Loader from "@/components/Loader/Loader";
import { getInitData } from "@/lib/getInitData";
import EventsSmall from "./clientPage";
import { useQuery } from "@tanstack/react-query";

const fetchEvents = async () => {
  const initData = getInitData();
  const events = await getEventByUser(initData);
  return events;
};

export default function Events() {
  // const events = await getEvents();
  // const initData = getInitData();
  // const events = await getEventByUser(initData);
  const { data: events, isLoading } = useQuery({
    queryKey: ["events"],
    queryFn: fetchEvents,
  });
  if (isLoading) {
    // return <div>Loading...</div>;
    return <Loader />;
  }
  if (events) return <EventsSmall events={events} />;
}
