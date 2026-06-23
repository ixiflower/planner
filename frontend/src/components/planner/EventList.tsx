import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip";
import {
  CheckCircleIcon,
  Edit3Icon,
  FileTextIcon,
  Trash2Icon,
  BellIcon,
  RotateCcwIcon
} from "lucide-react";
import type { DayEvent } from "@/pages/planner";

const CATEGORIES = {
  work: { name: "Work", color: "#ef4444" },
  personal: { name: "Personal", color: "#3b82f6" },
  study: { name: "Study", color: "#10b981" },
  travel: { name: "Travel", color: "#f59e0b" },
  health: { name: "Health", color: "#8b5cf6" },
  other: { name: "Other", color: "#6b7280" }
} as const;

interface EventListProps {
  daysArray: Date[];
  viewEvents: Record<string, DayEvent>;
  selectedDate: Date | undefined;
  handleDateSelect: (date: Date | undefined) => void;
  toggleCompletion: (key: string) => void;
  setEditingKey: React.Dispatch<React.SetStateAction<string | null>>;
  onOpenChange: (open: boolean) => void;
  setDraftDescription: React.Dispatch<React.SetStateAction<string>>;
  setDraftCategory: React.Dispatch<React.SetStateAction<string>>;
  setDraftReminder: React.Dispatch<React.SetStateAction<string>>;
  setDraftRecurrence: React.Dispatch<React.SetStateAction<string>>;
  setDraftCompleted: React.Dispatch<React.SetStateAction<boolean>>;
  setFullDraft: React.Dispatch<React.SetStateAction<string>>;
  setFullEditorOpen: React.Dispatch<React.SetStateAction<string | null>>;
  deleteEvent: (key: string) => void;
  formatKey: (date: Date | string | number) => string;
  eventCount: number;
  currentMonth: string;
  currentYear: number;
}

export function EventList({
  daysArray,
  viewEvents,
  selectedDate,
  handleDateSelect,
  toggleCompletion,
  setEditingKey,
  onOpenChange,
  setDraftDescription,
  setDraftCategory,
  setDraftReminder,
  setDraftRecurrence,
  setDraftCompleted,
  setFullDraft,
  setFullEditorOpen,
  deleteEvent,
  formatKey,
  eventCount,
  currentMonth,
  currentYear
}: EventListProps) {
  return (
    <ScrollArea
      className="h-full pr-4"
      style={{ scrollbarGutter: "stable" }}
    >
      <div className="sticky top-0 mb-1 z-10 bg-[var(--calendar-date-bg)]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 gap-2 sm:gap-0">
          <div>
            <div className="text-base sm:text-lg font-medium">
              {currentMonth} {currentYear}
            </div>
            <div className="text-xs sm:text-sm text-muted-foreground">
              Tap a day to select - days with events are highlighted
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="text-xs sm:text-sm">{eventCount}</Badge>
            <Button
              variant="outline"
              size="sm"
              className="text-xs sm:text-sm px-2 sm:px-3"
              onClick={() => {
                if (
                  window.confirm(
                    "Are you sure you want to clear all events?"
                  )
                ) {
                  localStorage.removeItem("planner_events_v2");
                  window.location.reload();
                }
              }}
            >
              Clear all
            </Button>
          </div>
        </div>
      </div>
      <div className="grid gap-2">
        {daysArray.map((day) => {
          const key = formatKey(day);
          const evt = viewEvents[key];
          const isSelected = selectedDate && formatKey(selectedDate) === key;
          const isToday = formatKey(new Date()) === key;
          return (
            <div
              key={key}
              role="button"
              tabIndex={0}
              onKeyDown={(e) =>
                e.key === "Enter" && handleDateSelect(day)
              }
              onClick={() => handleDateSelect(day)}
              className={`flex items-center gap-2 sm:gap-3 p-2 mx-1 rounded-lg cursor-pointer transition-shadow ${
                isSelected
                  ? "ring-1 ring-secondary-foreground"
                  : "hover:shadow"
              } ${isToday ? "bg-blue-50 dark:bg-blue-950/20" : ""}`}
              style={{ backgroundColor: "var(--calendar-date-bg)" }}
              aria-pressed={isSelected}
            >
              <div className="w-10 sm:w-12 text-center flex-shrink-0">
                <div
                  className={`text-base sm:text-lg font-semibold ${
                    isToday ? "text-blue-600" : ""
                  }`}
                >
                  {day.getDate()}
                </div>
                <div className="text-xs text-muted-foreground">
                  {day.toLocaleString(undefined, { weekday: "short" })}
                </div>
              </div>
              <Separator orientation="vertical" className="h-6 sm:h-8" />
              <div className="flex-1 min-w-0">
                <div
                  className={`text-sm font-medium truncate ${
                    evt?.completed ? "line-through opacity-70" : ""
                  }`}
                >
                  {evt?.description
                    ? evt.description
                    : "No event planned"}
                </div>
                {evt && (
                  <div className="flex flex-wrap gap-1 items-center mt-1">
                    <div className="text-xs text-muted-foreground">
                      {evt.date}
                    </div>
                    {evt.category && (
                      <Badge
                        variant="outline"
                        className="text-xs py-0 px-1"
                        style={{
                          backgroundColor: `${
                            CATEGORIES[
                              evt.category as keyof typeof CATEGORIES
                            ]?.color
                          }20`,
                          borderColor:
                            CATEGORIES[
                              evt.category as keyof typeof CATEGORIES
                            ]?.color,
                          color:
                            CATEGORIES[
                              evt.category as keyof typeof CATEGORIES
                            ]?.color
                        }}
                      >
                        {
                          CATEGORIES[
                            evt.category as keyof typeof CATEGORIES
                          ]?.name
                        }
                      </Badge>
                    )}
                    {evt.note && <Badge variant="outline" className="text-xs py-0 px-1">Note</Badge>}
                    {evt.reminder && (
                      <Badge variant="outline" className="gap-1 text-xs py-0 px-1">
                        <BellIcon className="h-2.5 w-2.5" />
                        Reminder
                      </Badge>
                    )}
                    {evt.recurrence && (
                      <Badge variant="outline" className="gap-1 text-xs py-0 px-1">
                        <RotateCcwIcon className="h-2.5 w-2.5" />
                        {evt.recurrence.frequency}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {evt && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 touch-manipulation min-h-[32px] min-w-[32px]"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleCompletion(key);
                          }}
                          aria-label={
                            evt.completed
                              ? "Mark as not completed"
                              : "Mark as completed"
                          }
                        >
                          <CheckCircleIcon
                            className={`h-4 w-4 ${
                              evt.completed
                                ? "text-green-500"
                                : "text-muted-foreground"
                            }`}
                          />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>
                          {evt.completed
                            ? "Completed"
                            : "Mark as completed"}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 touch-manipulation min-h-[32px] min-w-[32px]"
                        onClick={(e) => {
                          e.stopPropagation();
                          const dayToSelect = new Date(day); 
                          handleDateSelect(dayToSelect);
                          setDraftDescription(evt?.description || "");
                          setDraftCategory(evt?.category || "_none_");
                          setDraftReminder(evt?.reminder?.time || "_none_");
                          setDraftRecurrence(
                            evt?.recurrence?.frequency || "none"
                          );
                          setDraftCompleted(evt?.completed || false);
                          setEditingKey(key);
                          onOpenChange(true);
                        }}
                        aria-label={`Edit event on ${key}`}
                      >
                        <Edit3Icon className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Edit</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 touch-manipulation min-h-[32px] min-w-[32px]"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDateSelect(day);
                          setFullDraft(evt?.note || "");
                          setFullEditorOpen(key);
                        }}
                        aria-label={`Open full note for ${key}`}
                      >
                        <FileTextIcon className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Open full‑screen note</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                {evt && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 touch-manipulation min-h-[32px] min-w-[32px]"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Delete event on ${key}?`))
                              deleteEvent(key);
                          }}
                          aria-label={`Delete event on ${key}`}
                        >
                          <Trash2Icon className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Delete</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}