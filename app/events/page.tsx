"use client";
import { getEventByUser } from "@/lib/api";
import { CSSProperties } from "react";
import { FadeLoader } from "react-spinners";
import { getInitData } from "@/lib/getInitData";
import EventsSmall from "./clientPage";
import { useQuery } from "@tanstack/react-query";
const fetchEvents = async () => {
  const initData = getInitData();
  const events = await getEventByUser(initData);
  return events;
};
const override: CSSProperties = {
  display: "block",
  margin: "0 auto",
  // color: "#0ef18e",
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
    return <FadeLoader color="#0ef18e" cssOverride={override} />;
  }
  if (events) return <EventsSmall events={events} />;
}
