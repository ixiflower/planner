import * as React from "react";
import {
  DownloadIcon,
  UploadIcon,
  StickyNoteIcon,
  CalendarIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  EventEditor,
  EventList,
  Sidebar,
  Filters,
  FullNoteEditor,
  QuickNoteDialog
} from "@/components/planner";

interface Reminder {
  time: string;
  enabled: boolean;
}
interface RecurrenceRule {
  frequency: "daily" | "weekly" | "monthly" | "yearly";
  interval: number;
  endDate?: string;
}
export interface DayEvent {
  date: string;
  description?: string;
  note?: string;
  category?: string;
  completed?: boolean;
  reminder?: Reminder;
  recurrence?: RecurrenceRule;
}

export interface PermanentNote {
  id: number;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  timestamp?: number;
}

const STORAGE_KEY = "planner_events_v2";
const CATEGORIES = {
  work: { name: "Work", color: "#ef4444" },
  personal: { name: "Personal", color: "#3b82f6" },
  study: { name: "Study", color: "#10b981" },
  travel: { name: "Travel", color: "#f59e0b" },
  health: { name: "Health", color: "#8b5cf6" },
  other: { name: "Other", color: "#6b7280" }
} as const;

function formatKey(d: Date | string | number) {
  const date = new Date(d);
  return isNaN(date.getTime()) ? "" : date.toISOString().split("T")[0];
}

function formatReadable(d: Date | string | undefined) {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });
}

function generateRecurringEvents(
  baseEvent: DayEvent,
  endDate: Date
): DayEvent[] {
  if (!baseEvent.recurrence) return [baseEvent];
  const events: DayEvent[] = [];
  const startDate = new Date(baseEvent.date);
  const frequency = baseEvent.recurrence.frequency;
  const interval = baseEvent.recurrence.interval || 1;
  const recurrenceEndDate = baseEvent.recurrence.endDate
    ? new Date(baseEvent.recurrence.endDate)
    : endDate;
  const currentDate = new Date(startDate);
  while (currentDate <= recurrenceEndDate) {
    events.push({
      ...baseEvent,
      date: formatKey(currentDate)
    });
    switch (frequency) {
      case "daily":
        currentDate.setDate(currentDate.getDate() + interval);
        break;
      case "weekly":
        currentDate.setDate(currentDate.getDate() + 7 * interval);
        break;
      case "monthly":
        currentDate.setMonth(currentDate.getMonth() + interval);
        break;
      case "yearly":
        currentDate.setFullYear(currentDate.getFullYear() + interval);
        break;
    }
  }
  return events;
}

function checkReminders(events: Record<string, DayEvent>) {
  const now = new Date();
  Object.values(events).forEach((event) => {
    if (event.reminder && event.reminder.enabled) {
      const eventDate = new Date(event.date);
      const reminderTime = new Date(eventDate);
      switch (event.reminder.time) {
        case "30minutes":
          reminderTime.setMinutes(reminderTime.getMinutes() - 30);
          break;
        case "1hour":
          reminderTime.setHours(reminderTime.getHours() - 1);
          break;
        case "2hours":
          reminderTime.setHours(reminderTime.getHours() - 2);
          break;
        case "1day":
          reminderTime.setDate(reminderTime.getDate() - 1);
          break;
        case "2days":
          reminderTime.setDate(reminderTime.getDate() - 2);
          break;
      }
      if (now >= reminderTime && now < eventDate) {
        if (Notification.permission === "granted") {
          new Notification(`Reminder: ${event.description || "Event"}`, {
            body: `Your event is coming up on ${formatReadable(event.date)}`,
            icon: "/icon-192.png"
          });
        }
      }
    }
  });
}

function exportEventsToJSON(events: Record<string, DayEvent>) {
  const dataStr = JSON.stringify(events, null, 2);
  const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(
    dataStr
  )}`;
  const exportFileDefaultName = `planner-export-${
    new Date().toISOString().split("T")[0]
  }.json`;
  const linkElement = document.createElement("a");
  linkElement.setAttribute("href", dataUri);
  linkElement.setAttribute("download", exportFileDefaultName);
  linkElement.click();
}

function exportEventsToCSV(events: Record<string, DayEvent>) {
  const eventsArray = Object.values(events);
  let csvContent = "Date,Description,Category,Completed\n";
  eventsArray.forEach((event) => {
    csvContent += `"${event.date}","${event.description || ""}","${
      event.category || ""
    }","${event.completed ? "Yes" : "No"}"\n`;
  });
  const dataUri = `data:text/csv;charset=utf-8,${encodeURIComponent(
    csvContent
  )}`;
  const exportFileDefaultName = `planner-export-${
    new Date().toISOString().split("T")[0]
  }.csv`;
  const linkElement = document.createElement("a");
  linkElement.setAttribute("href", dataUri);
  linkElement.setAttribute("download", exportFileDefaultName);
  linkElement.click();
}

function importEventsFromFile(
  file: File,
  callback: (events: Record<string, DayEvent>) => void
) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const content = e.target?.result as string;
      let events: Record<string, DayEvent> = {};
      if (file.name.endsWith(".json")) {
        events = JSON.parse(content);
      } else if (file.name.endsWith(".csv")) {
        const lines = content.split("\n").map(
          (line) => line.replace(/^"(.*)"$/, "$1"),
        );
        const headers = lines[0].split(",");
        const dateIndex = headers.findIndex((h) => h.toLowerCase() === "date");
        const descriptionIndex = headers.findIndex(
          (h) => h.toLowerCase() === "description"
        );
        const categoryIndex = headers.findIndex(
          (h) => h.toLowerCase() === "category"
        );
        const completedIndex = headers.findIndex(
          (h) => h.toLowerCase() === "completed"
        );
        if (dateIndex === -1 || descriptionIndex === -1) {
          throw new Error("CSV file must contain Date and Description columns");
        }
        for (let i = 1; i < lines.length; i++) {
          if (!lines[i]) continue;
          const values = lines[i].split(",").map(
            (value) => value.replace(/^"(.*)"$/, "$1"),
          );
          if (values.length < Math.max(dateIndex, descriptionIndex) + 1) {
            continue;
          }
          const date = values[dateIndex];
          if (date && !isNaN(new Date(date).getTime())) {
            events[date] = {
              date: date,
              description: values[descriptionIndex] || "",
              category: values[categoryIndex] || "",
              completed:
                completedIndex !== -1 && values[completedIndex]
                  ? values[completedIndex].toLowerCase() === "yes" ||
                    values[completedIndex] === "1"
                  : false
            };
          }
        }
      }
      callback(events);
    } catch (error) {
      console.error("Error parsing file:", error);
      toast.error("Failed to import events. Please check the file format.");
    }
  };
  reader.readAsText(file);
}

export default function Planner() {
  useAuth();
  const [open, setOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<Date | undefined>(new Date());
  const [events, setEvents] = React.useState<Record<string, DayEvent>>({});
  const [permanentNotes, setPermanentNotes] = React.useState<PermanentNote[]>([]);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState<string>("all");
  const [dateRangeFilter, setDateRangeFilter] = React.useState<string>("all");
  const [showCompleted, setShowCompleted] = React.useState(true);

  const [editingKey, setEditingKey] = React.useState<string | null>(null);
  const [draftDescription, setDraftDescription] = React.useState("");
  const [draftCategory, setDraftCategory] = React.useState("_none_");
  const [draftReminder, setDraftReminder] = React.useState("_none_");
  const [draftRecurrence, setDraftRecurrence] = React.useState("none");
  const [draftCompleted, setDraftCompleted] = React.useState(false);

  const [fullEditorOpen, setFullEditorOpen] = React.useState<string | null>(
    null
  );
  const [fullDraft, setFullDraft] = React.useState("");
  const [markdownPreview, setMarkdownPreview] = React.useState(false);

  const [notePopupOpen, setNotePopupOpen] = React.useState(false);
  const [quickNote, setQuickNote] = React.useState("");
  const [notePreviewMode, setNotePreviewMode] = React.useState(true);

  const minDate = React.useMemo(() => {
    const date = new Date();
    date.setFullYear(date.getFullYear() - 1);
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);

  const maxDate = React.useMemo(() => {
    const date = new Date();
    date.setFullYear(date.getFullYear() + 5);
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);

  const clampDate = React.useCallback(
    (date: Date) => {
      return new Date(
        Math.min(Math.max(date.getTime(), minDate.getTime()), maxDate.getTime())
      );
    },
    [minDate, maxDate]
  );

  const isDateDisabled = React.useCallback(
    (date: Date) => date < minDate || date > maxDate,
    [minDate, maxDate]
  );

  const handleDateSelect = React.useCallback(
    (d: Date | undefined) => {
      if (!d || isNaN(d.getTime())) return;
      const clampedDate = clampDate(d);
      setSelected(clampedDate);
    },
    [clampDate]
  );

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, DayEvent>;
        setEvents(parsed || {});
      }

      setSelected(clampDate(new Date()));
    } catch (e) {
      console.warn("Failed to load planner events", e);
      setSelected(clampDate(new Date()));
    }
  }, [clampDate]);

  React.useEffect(() => {
    try {
      const savedNotes = localStorage.getItem('permanent-notes');
      if (savedNotes) {
        const notes = JSON.parse(savedNotes);
        setPermanentNotes(notes);
      }
    } catch (error) {
      console.error('Error loading notes from localStorage:', error);
    }
  }, []);

  React.useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
    } catch (e) {
      console.warn("Failed to save planner events", e);
    }
  }, [events]);

  React.useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
    const interval = setInterval(() => {
      checkReminders(events);
    }, 60000);
    checkReminders(events);
    return () => clearInterval(interval);
  }, [events]);

  const currentDate = React.useMemo(
    () => selected || clampDate(new Date()),
    [selected, clampDate]
  );
  const currentYear = React.useMemo(
    () => currentDate.getFullYear(),
    [currentDate]
  );
  const currentMonth = React.useMemo(
    () => currentDate.toLocaleString("default", { month: "long" }),
    [currentDate]
  );
  const daysInMonth = React.useMemo(
    () =>
      new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() + 1,
        0
      ).getDate(),
    [currentDate]
  );
  const daysArray = React.useMemo(
    () =>
      Array.from(
        { length: daysInMonth },
        (_, i) =>
          new Date(currentDate.getFullYear(), currentDate.getMonth(), i + 1)
      ),
    [currentDate, daysInMonth]
  );

  const filteredEvents = React.useMemo(() => {
    let filtered = { ...events };
    if (searchQuery) {
      filtered = Object.fromEntries(
        Object.entries(events).filter(
          ([, event]) =>
            (event.description || "")
              .toLowerCase()
              .includes(searchQuery.toLowerCase()) ||
            (event.note || "").toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    }
    if (categoryFilter !== "all") {
      filtered = Object.fromEntries(
        Object.entries(filtered).filter(
          ([, event]) => event.category === categoryFilter
        )
      );
    }
    if (!showCompleted) {
      filtered = Object.fromEntries(
        Object.entries(filtered).filter(([, event]) => !event.completed)
      );
    }
    if (dateRangeFilter !== "all") {
      const today = new Date();
      const startDate = new Date(today);
      const endDate = new Date(today);
      switch (dateRangeFilter) {
        case "today":
          break;
        case "week":
          endDate.setDate(today.getDate() + 7);
          break;
        case "month":
          endDate.setMonth(today.getMonth() + 1);
          break;
        case "next7days":
          endDate.setDate(today.getDate() + 7);
          break;
        case "next30days":
          endDate.setDate(today.getDate() + 30);
          break;
      }
      if (dateRangeFilter !== "today") {
        filtered = Object.fromEntries(
          Object.entries(filtered).filter(([, event]) => {
            const eventDate = new Date(event.date);
            return eventDate >= startDate && eventDate <= endDate;
          })
        );
      } else {
        const todayKey = formatKey(today);
        filtered = Object.fromEntries(
          Object.entries(filtered).filter(([key]) => key === todayKey)
        );
      }
    }
    return filtered;
  }, [events, searchQuery, categoryFilter, dateRangeFilter, showCompleted]);

  const eventsWithRecurrence = React.useMemo(() => {
    const allEvents = { ...events };
    const endDate = new Date();
    endDate.setFullYear(endDate.getFullYear() + 1);
    Object.values(events).forEach((event) => {
      if (event.recurrence) {
        const recurringEvents = generateRecurringEvents(event, endDate);
        recurringEvents.forEach((recurringEvent) => {
          if (
            !allEvents[recurringEvent.date] ||
            recurringEvent.date === event.date
          ) {
            allEvents[recurringEvent.date] = recurringEvent;
          }
        });
      }
    });
    return allEvents;
  }, [events]);

  const viewEvents = React.useMemo(() => {
    return dateRangeFilter === "all" ? eventsWithRecurrence : filteredEvents;
  }, [dateRangeFilter, eventsWithRecurrence, filteredEvents]);

  const saveDescription = React.useCallback(() => {
    if (!selected && !editingKey) return;
    const key = editingKey || (selected ? formatKey(selected) : null);
    if (!key) return;

    const eventData: DayEvent = {
      date: key,
      description: draftDescription,
      category: draftCategory !== "_none_" ? draftCategory : undefined,
      completed: draftCompleted,
      note: events[key]?.note
    };

    if (draftReminder !== "_none_") {
      eventData.reminder = {
        time: draftReminder,
        enabled: true
      };
    }

    if (draftRecurrence !== "none") {
      eventData.recurrence = {
        frequency: draftRecurrence as "daily" | "weekly" | "monthly" | "yearly",
        interval: 1
      };
    }

    setEvents((prev) => ({
      ...prev,
      [key]: eventData
    }));

    setOpen(false);
    setEditingKey(null);
    setDraftDescription("");
    setDraftCategory("_none_");
    setDraftReminder("_none_");
    setDraftRecurrence("none");
    setDraftCompleted(false);
  }, [
    selected,
    editingKey,
    draftDescription,
    draftCategory,
    draftReminder,
    draftRecurrence,
    draftCompleted,
    events
  ]);

  const saveFullNote = React.useCallback(
    (key?: string) => {
      const k = key || fullEditorOpen;
      if (!k) return;
      setEvents((prev) => ({
        ...prev,
        [k]: {
          ...(prev[k] || {}),
          date: k,
          note: fullDraft
        }
      }));
      setFullEditorOpen(null);
      setFullDraft("");
      setMarkdownPreview(false);
    },
    [fullEditorOpen, fullDraft]
  );

  const handleSaveNote = React.useCallback(async () => {
    if (!quickNote.trim()) return;
    
    saveNoteLocally();
    
    setQuickNote("");
    setNotePopupOpen(false);
  }, [quickNote]);

  const saveNoteLocally = React.useCallback(() => {
    const noteKey = `note_${Date.now()}`;
    const noteDate = formatKey(new Date());
    
    setEvents((prev) => ({
      ...prev,
      [noteKey]: {
        date: noteDate,
        description: quickNote.trim(),
        category: "note",
        note: quickNote.trim()
      }
    }));
    
    try {
      const newNote = {
        id: noteKey,
        title: 'Permanent Note',
        content: quickNote.trim(),
        date: noteDate,
        timestamp: Date.now()
      };
      
      const existingNotes = JSON.parse(localStorage.getItem('permanent-notes') || '[]');
      const updatedNotes = [newNote, ...existingNotes];
      localStorage.setItem('permanent-notes', JSON.stringify(updatedNotes));
      
      setPermanentNotes(updatedNotes);
    } catch (error) {
      console.error('Error saving note to localStorage:', error);
    }
  }, [quickNote]);

  const applyFormatting = React.useCallback((prefix: string, suffix: string) => {
    const textarea = document.getElementById('quick-note') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = quickNote.substring(start, end);
    let cursorPos = textarea.selectionStart;

    if (selectedText) {
      const newText = quickNote.substring(0, start) + prefix + selectedText + suffix + quickNote.substring(end);
      setQuickNote(newText);
    } else {
      cursorPos = textarea.selectionStart;
      const textBefore = quickNote.substring(0, cursorPos);
      const textAfter = quickNote.substring(cursorPos);
      setQuickNote(textBefore + prefix + suffix + textAfter);
    }
    
    textarea.focus();
    setTimeout(() => {
      textarea.focus();
      if (selectedText) {
        textarea.setSelectionRange(start, end + prefix.length + suffix.length);
      } else {
        textarea.setSelectionRange(cursorPos + prefix.length, cursorPos + prefix.length);
      }
    }, 0);
  }, [quickNote]);

  const deleteEvent = React.useCallback(
    (key: string) => {
      setEvents((prev) => {
        const copy = { ...prev };
        delete copy[key];
        return copy;
      });
      if (editingKey === key) {
        setEditingKey(null);
        setDraftDescription("");
        setOpen(false);
      }
      if (fullEditorOpen === key) {
        setFullEditorOpen(null);
        setFullDraft("");
      }
    },
    [editingKey, fullEditorOpen]
  );

  const cancelDescriptionEdit = React.useCallback(() => {
    setEditingKey(null);
    setDraftDescription("");
    setDraftCategory("_none_");
    setDraftReminder("_none_");
    setDraftRecurrence("none");
    setDraftCompleted(false);
    setOpen(false);
  }, []);

  const cancelFull = React.useCallback(() => {
    setFullEditorOpen(null);
    setFullDraft("");
    setMarkdownPreview(false);
  }, []);

  const eventCount = React.useMemo(
    () => Object.keys(viewEvents).length,
    [viewEvents]
  );

  const handleTodayClick = React.useCallback(() => {
    const today = new Date();
    const clampedToday = clampDate(today);
    setSelected(clampedToday);
    const todayKey = formatKey(clampedToday);
    const todayEvent = events[todayKey];

    setDraftDescription(todayEvent?.description || "");
    setDraftCategory(todayEvent?.category || "_none_");
    setDraftReminder(todayEvent?.reminder?.time || "_none_");
    setDraftRecurrence(todayEvent?.recurrence?.frequency || "none");
    setDraftCompleted(todayEvent?.completed || false);

    setEditingKey(todayKey);
    setOpen(true);
  }, [events, clampDate]);

  const saveFromSideEditor = React.useCallback(() => {
    if (!selected) return;
    const key = formatKey(selected);

    const eventData: DayEvent = {
      date: key,
      description: draftDescription,
      category: draftCategory !== "_none_" ? draftCategory : undefined,
      completed: draftCompleted,
      note: events[key]?.note
    };

    if (draftReminder !== "_none_") {
      eventData.reminder = {
        time: draftReminder,
        enabled: true
      };
    }

    setEvents((prev) => ({
      ...prev,
      [key]: eventData
    }));
  }, [
    selected,
    draftDescription,
    draftCategory,
    draftReminder,
    draftCompleted,
    events
  ]);

  const toggleCompletion = React.useCallback((key: string) => {
    setEvents((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        completed: !prev[key]?.completed
      }
    }));
  }, []);

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      importEventsFromFile(file, (importedEvents) => {
        if (
          window.confirm(
            "Import events? This will merge with your existing events."
          )
        ) {
          setEvents((prev) => ({ ...prev, ...importedEvents }));
        }
      });
    }
  };

  return (
    <div className="flex flex-col items-center min-h-screen w-full bg-background text-foreground p-3 sm:p-4 gap-3 sm:gap-4 pb-20 md:pb-16">
      <div className="w-full max-w-7xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold">Planner</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Quickly add and manage events :3
            </p>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
            <Label htmlFor="date" className="sr-only">
              Select date
            </Label>
            <EventEditor
              open={open}
              onOpenChange={setOpen}
              selectedDate={selected}
              handleDateSelect={handleDateSelect}
              isDateDisabled={isDateDisabled}
              draftDescription={draftDescription}
              setDraftDescription={setDraftDescription}
              draftCategory={draftCategory}
              setDraftCategory={setDraftCategory}
              draftReminder={draftReminder}
              setDraftReminder={setDraftReminder}
              draftRecurrence={draftRecurrence}
              setDraftRecurrence={setDraftRecurrence}
              draftCompleted={draftCompleted}
              setDraftCompleted={setDraftCompleted}
              saveDescription={saveDescription}
              cancelDescriptionEdit={cancelDescriptionEdit}
              editingKey={editingKey}
            />
            <Button variant="outline" size="icon" onClick={handleTodayClick} title="Today">
              <CalendarIcon className="h-4 w-4" />
            </Button>
            {}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="icon">
                  <DownloadIcon className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-2">
                <div className="space-y-2">
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => exportEventsToJSON(events)}
                  >
                    Export as JSON
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => exportEventsToCSV(events)}
                  >
                    Export as CSV
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
            {}
            <Button variant="outline" size="icon" asChild>
              <Label htmlFor="import-file" className="cursor-pointer">
                <UploadIcon className="h-4 w-4" />
                <input
                  id="import-file"
                  type="file"
                  accept=".json,.csv"
                  onChange={handleFileImport}
                  className="hidden"
                />
              </Label>
            </Button>
            {}
            <Button
              variant="outline"
              size="icon"
              onClick={() => setNotePopupOpen(true)}
              title="Add Note"
            >
              <StickyNoteIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {}
        <Filters
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          categoryFilter={categoryFilter}
          setCategoryFilter={setCategoryFilter}
          dateRangeFilter={dateRangeFilter}
          setDateRangeFilter={setDateRangeFilter}
          showCompleted={showCompleted}
          setShowCompleted={setShowCompleted}
          CATEGORIES={CATEGORIES}
        />
        <div className="mt-4 sm:mt-6 grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
          <aside className="lg:col-span-2 border rounded-lg p-2 sm:p-3 h-[50vh] sm:h-[calc(100vh-16rem)] bg-[var(--calendar-date-bg)]">
            <EventList
              daysArray={daysArray}
              viewEvents={viewEvents}
              selectedDate={selected}
              handleDateSelect={handleDateSelect}
              toggleCompletion={toggleCompletion}
              setEditingKey={setEditingKey}
              onOpenChange={setOpen}
              setDraftDescription={setDraftDescription}
              setDraftCategory={setDraftCategory}
              setDraftReminder={setDraftReminder}
              setDraftRecurrence={setDraftRecurrence}
              setDraftCompleted={setDraftCompleted}
              setFullDraft={setFullDraft}
              setFullEditorOpen={setFullEditorOpen}
              deleteEvent={deleteEvent}
              formatKey={formatKey}
              eventCount={eventCount}
              currentMonth={currentMonth}
              currentYear={currentYear}
            />
          </aside>
          <section className="md:col-span-1 border rounded-lg p-3 bg-[var(--calendar-date-bg)]">
            <Sidebar
              selectedDate={selected}
              events={events}
              formatKey={formatKey}
              draftDescription={draftDescription}
              setDraftDescription={setDraftDescription}
              setDraftCategory={setDraftCategory}
              setDraftReminder={setDraftReminder}
              setDraftRecurrence={setDraftRecurrence}
              setDraftCompleted={setDraftCompleted}
              saveFromSideEditor={saveFromSideEditor}
              permanentNotes={permanentNotes}
              setQuickNote={setQuickNote}
              setNotePreviewMode={setNotePreviewMode}
              setNotePopupOpen={setNotePopupOpen}
            />
          </section>
        </div>
        <FullNoteEditor
          fullEditorOpen={fullEditorOpen}
          setFullEditorOpen={setFullEditorOpen}
          fullDraft={fullDraft}
          setFullDraft={setFullDraft}
          saveFullNote={saveFullNote}
          markdownPreview={markdownPreview}
          setMarkdownPreview={setMarkdownPreview}
          formatReadable={formatReadable}
          cancelFull={cancelFull}
        />
        
        <QuickNoteDialog
          notePopupOpen={notePopupOpen}
          setNotePopupOpen={setNotePopupOpen}
          quickNote={quickNote}
          setQuickNote={setQuickNote}
          handleSaveNote={handleSaveNote}
          notePreviewMode={notePreviewMode}
          setNotePreviewMode={setNotePreviewMode}
          applyFormatting={applyFormatting}
        />
      </div>
    </div>
  );
}