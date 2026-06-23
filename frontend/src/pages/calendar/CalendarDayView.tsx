import * as React from "react";
import { format, parseISO, isSameDay } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TooltipProvider } from "@/components/ui/tooltip";
import { updateTask } from "./api";
import { getEventsForDay } from "./utils";
import type { CalendarEvent, EventTemplate } from "./types";
import { dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { setHours, startOfHour, addHours } from 'date-fns';
import EventBlock from "./EventBlock";
import EventCreator from "./EventCreator";
import EventEditor from "./EventEditor";
import TimeSlot from "./TimeSlot";

interface Props {
  selectedDate: Date;
  events: CalendarEvent[];
  setEvents: React.Dispatch<React.SetStateAction<CalendarEvent[]>>;
  token?: string;
}

const DroppableHourSlot: React.FC<{
  hour: number;
  selectedDate: Date;
  setEvents: React.Dispatch<React.SetStateAction<CalendarEvent[]>>;
  children: React.ReactNode;
  onDoubleClick: (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
  handleCreateEvent: (event: CalendarEvent) => Promise<void>;
  onMoveExisting: (id: string, newStart: string, newEnd: string, saveImmediately?: boolean) => void;
}> = ({ hour, selectedDate, setEvents, children, onDoubleClick, handleCreateEvent, onMoveExisting }) => {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const [isDraggedOver, setIsDraggedOver] = React.useState(false);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;

    return dropTargetForElements({
      element: el,
      getData: () => ({ hour }),
      onDragEnter: () => setIsDraggedOver(true),
      onDragLeave: () => setIsDraggedOver(false),
      onDrop: ({ source }) => {
        const data = source.data as any;
        const startDate = startOfHour(setHours(selectedDate, hour));
        const endDate = addHours(startDate, 1);

        if (data && (data as { template?: EventTemplate }).template) {
          const { template } = data as { template: EventTemplate };
          const newEvent: CalendarEvent = {
            id: `temp-${Date.now()}`,
            title: template.title,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            color: template.color,
            isImportant: false,
            description: "",
          };
          handleCreateEvent(newEvent);
          setIsDraggedOver(false);
          return;
        }

        if (data && data.type === 'event' && data.event) {
          const { event, durationMs } = data as { type: string; event: CalendarEvent; durationMs: number };
          const newStart = startDate.toISOString();
          const newEnd = new Date(startDate.getTime() + (durationMs ?? (parseISO(event.endDate).getTime() - parseISO(event.startDate).getTime()))).toISOString();
          onMoveExisting(event.id, newStart, newEnd, true);
          setIsDraggedOver(false);
          return;
        }

        setIsDraggedOver(false);
      },
    });
  }, [hour, selectedDate, setEvents, handleCreateEvent]);

  return (
    <div
      ref={ref}
      className={`relative border-b ${isDraggedOver ? 'bg-primary/20' : ''}`}
      style={{ height: "48px", minHeight: "48px" }}
      onDoubleClick={onDoubleClick}
    >
      {children}
    </div>
  );
};

const CalendarDayView: React.FC<Props> = ({
  selectedDate,
  events,
  setEvents,
  token
}) => {
  const [editingEvent, setEditingEvent] = React.useState<CalendarEvent | null>(
    null
  );
  const [creatingEvent, setCreatingEvent] = React.useState(false);
  const [tempEvent, setTempEvent] = React.useState<CalendarEvent | null>(null);
  const [currentTime, setCurrentTime] = React.useState(new Date());
  const moveTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const resizeTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const moveEvent = (id: string, newStartDate: string, newEndDate: string) => {
    setEvents((prevEvents) =>
      prevEvents.map((event) =>
        event.id === id
          ? { ...event, startDate: newStartDate, endDate: newEndDate }
          : event
      )
    );
  };

  const resizeEvent = (id: string, newEndDate: string) => {
    setEvents((prevEvents) =>
      prevEvents.map((event) =>
        event.id === id ? { ...event, endDate: newEndDate } : event
      )
    );
  };

  const deleteEvent = async (id: string) => {
    try {
      const { deleteTask } = await import("./api");
      const success = await deleteTask(id, token);
      if (success) {
        setEvents((prevEvents) =>
          prevEvents.filter((event) => event.id !== id)
        );
      }
    } catch (error) {
      console.error("Error deleting event:", error);
    }
  };

  const editEvent = (event: CalendarEvent) => {
    setEditingEvent(event);
  };

  const saveEvent = async (updatedEvent: CalendarEvent) => {
    setEvents((prevEvents) =>
      prevEvents.map((event) =>
        event.id === updatedEvent.id ? updatedEvent : event
      )
    );

    try {
      console.log("Saving updated event:", updatedEvent);
      const result = await updateTask(updatedEvent, token);

      if (result) {
        setEvents((prevEvents) =>
          prevEvents.map((event) =>
            event.id === updatedEvent.id ? result : event
          )
        );
        console.log("Event updated successfully:", result);
      } else {
        console.error("Failed to update event: No response from server");
        setEvents((prevEvents) => {
          const previousEvent = prevEvents.find(
            (e) => e.id === updatedEvent.id
          );
          if (previousEvent) {
            return prevEvents.map((event) =>
              event.id === updatedEvent.id ? previousEvent : event
            );
          }
          return prevEvents;
        });
      }
    } catch (error) {
      console.error("Error updating event:", error);
      setEvents((prevEvents) => {
        const previousEvent = prevEvents.find((e) => e.id === updatedEvent.id);
        if (previousEvent) {
          return prevEvents.map((event) =>
            event.id === updatedEvent.id ? previousEvent : event
          );
        }
        return prevEvents;
      });
    }
    setEditingEvent(null);
  };

  const closeEditor = () => {
    setEditingEvent(null);
  };

  const dayEvents = getEventsForDay(selectedDate, events);

  const eventsOverlap = (event1: CalendarEvent, event2: CalendarEvent) => {
    const start1 = parseISO(event1.startDate);
    const end1 = parseISO(event1.endDate);
    const start2 = parseISO(event2.startDate);
    const end2 = parseISO(event2.endDate);

    return start1 < end2 && start2 < end1;
  };

  const getOverlappingGroups = (events: CalendarEvent[]) => {
    const groups: CalendarEvent[][] = [];
    const visited = new Set<string>();

    events.forEach((event) => {
      if (visited.has(event.id)) return;

      const group: CalendarEvent[] = [event];
      visited.add(event.id);

      const checkOverlaps = (currentEvent: CalendarEvent) => {
        events.forEach((otherEvent) => {
          if (
            !visited.has(otherEvent.id) &&
            eventsOverlap(currentEvent, otherEvent)
          ) {
            group.push(otherEvent);
            visited.add(otherEvent.id);
            checkOverlaps(otherEvent);
          }
        });
      };

      checkOverlaps(event);
      groups.push(group);
    });

    return groups;
  };

  const eventPositions: Record<string, { left: number; width: number }> = {};

  const overlappingGroups = getOverlappingGroups(dayEvents);

  overlappingGroups.forEach((group) => {
    group.sort(
      (a, b) =>
        parseISO(a.startDate).getTime() - parseISO(b.startDate).getTime()
    );

    if (group.length === 1) {
      eventPositions[group[0].id] = { left: 0.5, width: 99 };
    } else {
      const width = 100 / group.length;
      group.forEach((event, index) => {
        eventPositions[event.id] = {
          left: index * width + 0.25,
          width: width - 0.5
        };
      });
    }
  });

  const hours = Array.from({ length: 24 }, (_, i) => i);

  const [draggingEventId, setDraggingEventId] = React.useState<string | null>(
    null
  );
  
  const handleMoveEvent = (
    id: string,
    newStartDate: string,
    newEndDate: string,
    saveImmediately: boolean = false
  ) => {
    setDraggingEventId(id);
    moveEvent(id, newStartDate, newEndDate);

    if (moveTimeoutRef.current) {
      clearTimeout(moveTimeoutRef.current);
    }

    if (saveImmediately) {
      void saveMovedEvent(id, newStartDate, newEndDate);
    } else {
      moveTimeoutRef.current = setTimeout(async () => {
        await saveMovedEvent(id, newStartDate, newEndDate);
      }, 200);
    }
  };

  const saveMovedEvent = async (
    id: string,
    newStartDate: string,
    newEndDate: string
  ) => {
    setEvents((currentEvents) => {
      const eventToUpdate = currentEvents.find((event) => event.id === id);
      if (eventToUpdate) {
        const isTemporaryEvent = isNaN(Number(eventToUpdate.id));
        if (isTemporaryEvent) {
          console.log("Skipping save for temporary event:", eventToUpdate.id);
          return currentEvents;
        }

        const updatedEvent = {
          ...eventToUpdate,
          startDate: newStartDate,
          endDate: newEndDate
        };

        updateTask(updatedEvent, token)
          .then((result) => {
            if (result) {
              setEvents((prevEvents) =>
                prevEvents.map((event) => (event.id === id ? result : event))
              );
              console.log("Event moved and saved successfully:", result);
            } else {
              console.error("Failed to save moved event");
            }
          })
          .catch((error) => {
            console.error("Error saving moved event:", error);
          })
          .finally(() => {
            setDraggingEventId(null);
          });

        return currentEvents.map((event) =>
          event.id === id ? updatedEvent : event
        );
      }
      return currentEvents;
    });
  };

  const handleResizeEvent = (id: string, newEndDate: string) => {
    setDraggingEventId(id);
    resizeEvent(id, newEndDate);

    if (resizeTimeoutRef.current) {
      clearTimeout(resizeTimeoutRef.current);
    }

    resizeTimeoutRef.current = setTimeout(async () => {
      await saveResizedEvent(id, newEndDate);
    }, 200);
  };

  const saveResizedEvent = async (id: string, newEndDate: string) => {
    setEvents((currentEvents) => {
      const eventToUpdate = currentEvents.find((event) => event.id === id);
      if (eventToUpdate) {
        const isTemporaryEvent = isNaN(Number(eventToUpdate.id));
        if (isTemporaryEvent) {
          console.log("Skipping save for temporary event:", eventToUpdate.id);
          return currentEvents;
        }

        const updatedEvent = {
          ...eventToUpdate,
          endDate: newEndDate
        };

        updateTask(updatedEvent, token)
          .then((result) => {
            if (result) {
              setEvents((prevEvents) =>
                prevEvents.map((event) => (event.id === id ? result : event))
              );
              console.log("Event resized and saved successfully:", result);
            } else {
              console.error("Failed to save resized event");
            }
          })
          .catch((error) => {
            console.error("Error saving resized event:", error);
          })
          .finally(() => {
            setDraggingEventId(null);
          });

        return currentEvents.map((event) =>
          event.id === id ? updatedEvent : event
        );
      }
      return currentEvents;
    });
  };

  const handleCreateEvent = async (newEvent: CalendarEvent) => {
    console.log("Creating new event:", newEvent);
    try {
      setEvents((prev) => [...prev, newEvent]);

      const eventData = {
        title: newEvent.title,
        description: newEvent.description,
        startDate: newEvent.startDate,
        endDate: newEvent.endDate,
        color: newEvent.color,
        isImportant: newEvent.isImportant,
        category: newEvent.category || 'general'
      };
      console.log("Event data being sent to API:", eventData);
      console.log("Event startDate:", newEvent.startDate, "endDate:", newEvent.endDate);

      const { createTask } = await import("./api");
      const createdTask = await createTask(eventData, token || undefined);

      if (createdTask) {
        setEvents((prev) =>
          prev.map((event) => (event.id === newEvent.id ? createdTask : event))
        );
        console.log("Event created successfully:", createdTask);
      } else {
        console.error("Failed to create event: No response from server");
        setEvents((prev) => prev.filter((event) => event.id !== newEvent.id));
      }
    } catch (error) {
      console.error("Error creating event:", error);
      setEvents((prev) => prev.filter((event) => event.id !== newEvent.id));
    }
    setCreatingEvent(false);
    setEditingEvent(null);
  };

  React.useEffect(() => {
    const handleMouseUp = () => {
      if (moveTimeoutRef.current) {
        clearTimeout(moveTimeoutRef.current);
        moveTimeoutRef.current = null;

        if (draggingEventId) {
          const movedEvent = events.find(
            (event) => event.id === draggingEventId
          );
          if (movedEvent) {
            saveMovedEvent(
              draggingEventId,
              movedEvent.startDate,
              movedEvent.endDate
            );
          }
        }
      }

      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
        resizeTimeoutRef.current = null;

        if (draggingEventId) {
          const resizedEvent = events.find(
            (event) => event.id === draggingEventId
          );
          if (resizedEvent) {
            saveResizedEvent(draggingEventId, resizedEvent.endDate);
          }
        }
      }

      setDraggingEventId(null);
    };

    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mouseup", handleMouseUp);

      if (moveTimeoutRef.current) {
        clearTimeout(moveTimeoutRef.current);
      }
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, [draggingEventId, events]);

  return (
    <div className="flex flex-col px-1">
      <TooltipProvider>
        <div className="flex flex-1 overflow-auto select-none">
          <div className="w-10 sm:w-[3rem] flex-shrink-0 py-2 px-3.5">
            {hours.map((hour) => (
              <TimeSlot key={hour} hour={hour} />
            ))}
          </div>

          <div className="flex-1 border-l relative pt-1 pb-1">
            {}
            {isSameDay(selectedDate, currentTime) && (
              <div
                className="absolute left-0 right-0 h-0.5 bg-red-500 z-20 pointer-events-none"
                style={{
                  top: `${
                    (currentTime.getHours() * 60 +
                      currentTime.getMinutes() +
                      currentTime.getSeconds() / 60) *
                    0.8
                  }px`
                }}
              >
                <div className="absolute -top-1.5 -left-3 w-3 h-3 bg-red-500 rounded-full"></div>
                <div className="absolute -top-6 right-2 text-red-500 text-xs px-2 py-1 rounded font-mono">
                  {format(currentTime, "HH:mm")}
                </div>
              </div>
            )}

            {hours.map((hour) => (
              <DroppableHourSlot
                key={hour}
                hour={hour}
                selectedDate={selectedDate}
                setEvents={setEvents}
                handleCreateEvent={handleCreateEvent}
              onMoveExisting={handleMoveEvent}
                onDoubleClick={(e) => {
                  if (e.target === e.currentTarget) {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const y = e.clientY - rect.top;
                    const minutes = Math.round((y / 48) * 60);

                    const startMinutes = Math.floor(minutes / 15) * 15;
                    const endMinutes = startMinutes + 60;

                    const newTempEvent: CalendarEvent = {
                      id: Math.random().toString(36).substr(2, 9),
                      title: "",
                      startDate: new Date(
                        selectedDate.getFullYear(),
                        selectedDate.getMonth(),
                        selectedDate.getDate(),
                        hour,
                        startMinutes
                      ).toISOString(),
                      endDate: new Date(
                        selectedDate.getFullYear(),
                        selectedDate.getMonth(),
                        selectedDate.getDate(),
                        hour + Math.floor(endMinutes / 60),
                        endMinutes % 60
                      ).toISOString(),
                      color: "blue"
                    };

                    console.log(
                      "Double-click created temp event:",
                      newTempEvent
                    );
                    setTempEvent(newTempEvent);
                    setCreatingEvent(true);
                  }
                }}
              >
                {dayEvents
                  .filter(
                    (event) => parseISO(event.startDate).getHours() === hour
                  )
                  .map((event) => (
                    <EventBlock
                      key={event.id}
                      event={event}
                      onMove={handleMoveEvent}
                      onResize={handleResizeEvent}
                      onEdit={editEvent}
                      onDelete={deleteEvent}
                      position={
                        eventPositions[event.id] || { left: 0, width: 100 }
                      }
                      isDraggingId={draggingEventId}
                      />
                  ))}
              </DroppableHourSlot>
            ))}
          </div>
        </div>
      </TooltipProvider>

      {editingEvent && !creatingEvent && (
        <EventEditor
          event={editingEvent}
          onSave={saveEvent}
          onCancel={closeEditor}
          onDelete={deleteEvent}
          open={!!editingEvent}
          onOpenChange={(open) => !open && closeEditor()}
        />
      )}

      {creatingEvent && (
        <Dialog open={creatingEvent} onOpenChange={setCreatingEvent}>
          <DialogContent className="sm:max-w-[425px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Event</DialogTitle>
            </DialogHeader>
            <EventCreator
              selectedDate={selectedDate}
              onSave={handleCreateEvent}
              onCancel={() => {
                setCreatingEvent(false);
                setTempEvent(null);
              }}
              tempEvent={tempEvent}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default CalendarDayView;
