"use client";

import React from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import css from "./Events.module.css";
import { InnerEvent } from "@/types/types";
import { Calendar, ChevronRight, CheckCircle2, AlertCircle, Circle } from "lucide-react";

export default function EventsSmall({ events }: { events: InnerEvent[] }) {
  const router = useRouter();

  const getStatusIcon = (status: number) => {
    switch (status) {
      case 2:
        return <CheckCircle2 size={18} />;
      case 1:
        return <Circle size={18} style={{ animation: "pulse 2s infinite" }} />;
      default:
        return <AlertCircle size={18} />;
    }
  };

  return (
    <div className={css.listContainer}>
      {!events.length && (
        <div style={{ textAlign: 'center', padding: '100px 20px', opacity: 0.5 }}>
          <Calendar size={64} style={{ marginBottom: '16px' }} />
          <h3>Подій немає</h3>
          <p>На сьогодні нічого не заплановано</p>
        </div>
      )}
      
      {events.map((event) => (
        <div
          key={event.id}
          className={css.listItemButton}
          onClick={() => router.push(`/events/${event.event_id}`)}
        >
          <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            <div className={clsx(css.statusIcon, {
              [css.done]: event.event_status === 2,
              [css.inproccess]: event.event_status === 1,
              [css.event]: event.event_status === 0,
            })}>
              {getStatusIcon(event.event_status)}
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span className={css.eventTitle}>{event.event.split('\n')[0]}</span>
              <div className={css.eventDate}>
                <Calendar size={12} />
                <span>{event.start_event}</span>
              </div>
            </div>
          </div>

          <ChevronRight size={18} style={{ opacity: 0.3 }} />
        </div>
      ))}
    </div>
  );
}
