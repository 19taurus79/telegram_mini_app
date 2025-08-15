import { getEvents } from "@/lib/api";
import css from "./Events.module.css";
import clsx from "clsx";

export default async function Events() {
  const events = await getEvents();

  return (
    <ul className={css.listContainer}>
      {events.map((event) => (
        <li
          key={event.id}
          className={clsx(css.listItemButton, {
            [css.event]: event.colorId === "11",
            [css.inproccess]: event.colorId === "5",
            [css.done]: event.colorId === "10",
          })}
        >
          {event.description.split("\n").map((description) => (
            <>
              <p key={description}>{description}</p>
              {/* <br /> */}
            </>
          ))}
          <p>{event.colorId}</p>
        </li>
      ))}
    </ul>
  );
}
