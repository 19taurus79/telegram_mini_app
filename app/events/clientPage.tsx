"use client";
import { InnerEvent } from "@/types/types";
import css from "./Events.module.css";
import clsx from "clsx";
import Link from "next/link";
export default function EventsSmall({ events }: { events: InnerEvent[] }) {
  //   const handleClick = (id) => {};
  return (
    <>
      {!events.length && <p>Подій немає</p>}
      <ul className={css.listContainer}>
        {events.map((event) => (
          <li
            key={event.id}
            className={clsx(css.listItemButton, {
              [css.event]: event.event_status === 0,
              [css.inproccess]: event.event_status === 1,
              [css.done]: event.event_status === 2,
            })}
          >
            <Link href={`/events/${event.event_id}`}>
              {event.event.split("\n").map((description) => (
                <div key={event.id}>
                  <p>{description}</p>
                  <p>{event.start_event}</p>
                  {/* <br /> */}
                </div>
              ))}
            </Link>
            {/* <p>{event.colorId}</p> */}
          </li>
        ))}
      </ul>
    </>
  );
}
