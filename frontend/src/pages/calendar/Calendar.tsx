import * as React from "react";
import { toast } from "sonner";
import { format, parseISO, isSameDay } from "date-fns";
import { BarChart3 } from "lucide-react";
import alertSound from "@/assets/alert.mp3";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchAllEvents,
  fetchTasks,
  deleteTask,
  fetchPermanentNotes,
  createPermanentNote,
  fetchDailyGoals,
  fetchEventTemplates,
  createEventTemplate,
  updateEventTemplate,
  deleteEventTemplate,
} from "./api";
import { initialEvents } from "./types";
import type {
  CalendarEvent,
  EventTemplate,
  DailyGoal,
  PermanentNote,
} from "./types";
import CalendarDayView from "./CalendarDayView";
import Tasks from "./Tasks";
import Teams from "./Teams";
import { CalendarNav } from "./CalendarNav";
import Music from "./Music";
import ExerciseBoard from "./ExerciseBoard";
import EventSummary from "@/components/planner/EventSummary";
import AddTemplateDialog from "@/components/planner/AddTemplateDialog";
import EditTemplateDialog from "@/components/planner/EditTemplateDialog";
import { QuickNoteDialog } from "@/components/planner";
import SidebarChecklist from "./SidebarChecklist";
import { getCookie, setCookie } from "./utils";

const Calendar: React.FC = () => {
  const { token, isAuthenticated, user, logout } = useAuth();
  const [selectedDate, setSelectedDate] = React.useState(new Date());
  const [events, setEvents] = React.useState<CalendarEvent[]>(initialEvents);
  const [, setIsLoading] = React.useState(true);
  const [showSummary, setShowSummary] = React.useState(false);
  const [showChecklist, setShowChecklist] = React.useState<boolean>(() => {
    const saved = getCookie("showChecklist");
    return saved ? JSON.parse(saved) : false;
  });
  const [showAll, setShowAll] = React.useState(false);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [activeSection, setActiveSection] = React.useState("calendar");
  const [isScrolled, setIsScrolled] = React.useState(false);
  const [permanentNotes, setPermanentNotes] = React.useState<PermanentNote[]>([]);
  const [notePopupOpen, setNotePopupOpen] = React.useState(false);
  const [quickNote, setQuickNote] = React.useState("");
  const [notePreviewMode, setNotePreviewMode] = React.useState(true);
  const [pinnedItems, setPinnedItems] = React.useState<string[]>(() => {
    const saved = getCookie("pinnedItems");
    return saved ? JSON.parse(saved) : [];
  }); 
  const [isAddTemplateOpen, setIsAddTemplateOpen] = React.useState(false);  
  const [templates, setTemplates] = React.useState<EventTemplate[]>([]);
  const [newTemplate, setNewTemplate] = React.useState<Omit<EventTemplate, "id">>({
    name: "",
    title: "",
    color: "blue",
    category: "general",
  });
  const [isEditTemplateOpen, setIsEditTemplateOpen] = React.useState(false);
  const [editingTemplate, setEditingTemplate] = React.useState<EventTemplate | null>(null);
  const [templateCategories, setTemplateCategories] = React.useState<string[]>(["general", "work", "personal", "education", "health"]);
  const [dailyGoals, setDailyGoals] = React.useState<DailyGoal[]>([]);
  const [isGoalDialogOpen, setIsGoalDialogOpen] = React.useState(false);
  const [editingGoal, setEditingGoal] = React.useState<DailyGoal | null>(null);

  const alertAudioRef = React.useRef<HTMLAudioElement | null>(null);

  React.useEffect(() => {
    setCookie("showChecklist", JSON.stringify(showChecklist), 365);
  }, [showChecklist]);

  React.useEffect(() => {
    setCookie("pinnedItems", JSON.stringify(pinnedItems), 365);
  }, [pinnedItems]);

  const handleSaveTemplate = async () => {
    if (newTemplate.name.trim() && newTemplate.title.trim()) {
      try {
        const createdTemplate = await createEventTemplate(
          newTemplate,
          token || undefined
        );
        setTemplates((prev) => [...prev, createdTemplate]);
        setNewTemplate({ name: "", title: "", color: "blue" });
        setIsAddTemplateOpen(false);
      } catch (error) {
        console.error("Failed to save template:", error);
      }
    }
  };

  const handleDeleteTemplate = async (templateToDelete: EventTemplate) => {
    try {
      await deleteEventTemplate(templateToDelete.id, token || undefined);
      setTemplates((prev) => prev.filter((t) => t.id !== templateToDelete.id));
    } catch (error) {
      console.error("Failed to delete template:", error);
    }
  };

  const handleUpdateTemplate = async () => {
    if (!editingTemplate) return;
    try {
      const updated = await updateEventTemplate(editingTemplate, token || undefined);
      setTemplates((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      setEditingTemplate(null);
      setIsEditTemplateOpen(false);
    } catch (error) {
      console.error('Failed to update template:', error);
    }
  };

  const playAlertSound = async () => {
    try {
      const audio = new Audio(alertSound);
      alertAudioRef.current = audio;
      await audio.play();
      console.log("Alert sound played successfully");
    } catch (error) {
      console.error("Error playing alert sound:", error);
      toast.info("Event reminder!");
    }
  };

  React.useEffect(() => {
    return () => {
      if (alertAudioRef.current) {
        alertAudioRef.current.pause();
        alertAudioRef.current = null;
      }
    };
  }, []);

  const togglePin = (item: string) => {
    setPinnedItems((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  React.useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  React.useEffect(() => {
    const handleScrollTop = () => {
      if (window.scrollY > 300) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };
    window.addEventListener("scroll", handleScrollTop);
    return () => window.removeEventListener("scroll", handleScrollTop);
  }, []);

  React.useEffect(() => {
    const loadNotes = async () => {
      if (isAuthenticated) {
        try {
          const notes = await fetchPermanentNotes(token || undefined);
          setPermanentNotes(notes);
        } catch (error) {
          console.error("Failed to load permanent notes:", error);
        }
      }
    };
    loadNotes();
  }, [isAuthenticated, token]);

  React.useEffect(() => {
    const loadGoals = async () => {
      if (isAuthenticated) {
        try {
          const goals = await fetchDailyGoals(token || undefined);
          setDailyGoals(goals);
        } catch (error) {
          console.error("Failed to load daily goals:", error);
        }
      }
    };
    loadGoals();
  }, [isAuthenticated, token]);

  React.useEffect(() => {
    const loadTemplates = async () => {
      if (isAuthenticated) {
        try {
          const templates = await fetchEventTemplates(token || undefined);
          setTemplates(templates);
        } catch (error) {
          console.error("Failed to load event templates:", error);
        }
      }
    };
    loadTemplates();
  }, [isAuthenticated, token]);

  const saveAllAndRefresh = async () => {
    try {
      setIsRefreshing(true);
      setIsLoading(true);
      const fetchedEvents = await fetchAllEvents(token || undefined);
      setEvents(fetchedEvents);
      console.log(
        "All events refreshed from database successfully",
        fetchedEvents
      );
      toast.success("Calendar data refreshed successfully!");
    } catch (error) {
      console.error("Error refreshing events:", error);
      toast.error("Error refreshing calendar data. Please try again.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  React.useEffect(() => {
    const loadTasks = async () => {
      setIsLoading(true);
      try {
        const tasksData = await fetchTasks(token || undefined);
        setEvents(tasksData);
      } catch (error) {
        console.error("Failed to load tasks:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (isAuthenticated) {
      loadTasks();
    }
  }, [token, isAuthenticated]);

  const handleDeleteEvent = async (eventId: string) => {
    try {
      const success = await deleteTask(eventId, token ?? undefined);
      if (success) {
        setEvents((prevEvents) =>
          prevEvents.filter((event) => event.id !== eventId)
        );
      } else {
        console.error("Failed to delete event");
      }
    } catch (error) {
      console.error("Error deleting event:", error);
    }
  };

  const handleExport = () => {
    const payload = {
      meta: {
        version: 1,
        exportedAt: new Date().toISOString(),
      },
      events,
      dailyGoals,
      permanentNotes,
      eventTemplates: templates,
      pinnedItems,
      preferences: {
        showChecklist,
      },
    };

    const dataStr = JSON.stringify(payload, null, 2);
    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
    const exportFileDefaultName = `planner-backup-${format(new Date(), "yyyy-MM-dd")}.json`;

    const linkElement = document.createElement("a");
    linkElement.setAttribute("href", dataUri);
    linkElement.setAttribute("download", exportFileDefaultName);
    linkElement.click();
  };

  const handleImport = () => {
    const inputElement = document.createElement("input");
    inputElement.type = "file";
    inputElement.accept = ".json,.txt";

    inputElement.onchange = (event) => {
      const target = event.target as HTMLInputElement;
      const file = target.files?.[0];

      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const parsed = JSON.parse(e.target?.result as string);

            if (Array.isArray(parsed)) {
              setEvents((prevEvents) => [...prevEvents, ...parsed]);
              toast.success(`Imported ${parsed.length} events.`);
              return;
            }

            if (parsed.events && Array.isArray(parsed.events)) {
              setEvents(parsed.events);
            }
            if (parsed.dailyGoals && Array.isArray(parsed.dailyGoals)) {
              setDailyGoals(parsed.dailyGoals);
            }
            if (parsed.permanentNotes && Array.isArray(parsed.permanentNotes)) {
              setPermanentNotes(parsed.permanentNotes);
            }
            if (parsed.eventTemplates && Array.isArray(parsed.eventTemplates)) {
              setTemplates(parsed.eventTemplates);
            }
            if (parsed.pinnedItems && Array.isArray(parsed.pinnedItems)) {
              setPinnedItems(parsed.pinnedItems);
            }
            if (parsed.preferences && typeof parsed.preferences === "object") {
              if (typeof parsed.preferences.showChecklist === "boolean") {
                setShowChecklist(parsed.preferences.showChecklist);
              }
            }

            const counts = {
              events: parsed.events?.length || 0,
              goals: parsed.dailyGoals?.length || 0,
              notes: parsed.permanentNotes?.length || 0,
              templates: parsed.eventTemplates?.length || 0,
            };
            toast.success(`Import completed. Events: ${counts.events}, Goals: ${counts.goals}, Notes: ${counts.notes}, Templates: ${counts.templates}`);
          } catch (error) {
            console.error("Error parsing imported file:", error);
            toast.error("Failed to import file. Please ensure it is a valid JSON export.");
          }
        };
        reader.readAsText(file);
      }
    };

    inputElement.click();
  };

  const handleSaveNote = React.useCallback(async () => {
    if (!quickNote.trim()) return;

    try {
      const newNote = await createPermanentNote(
        {
          title: "Permanent Note",
          content: quickNote.trim(),
        },
        token ?? undefined
      );
      setPermanentNotes((prev) => [newNote, ...prev]);
      setQuickNote("");
      setNotePopupOpen(false);
    } catch (error) {
      console.error("Failed to save note:", error);
    }
  }, [quickNote, token]);

  const handleDeleteAllData = async (password: string) => {
    try {
      if (!isAuthenticated || !user) {
        toast.error("You must be signed in.");
        return;
      }

      if (!password || password.length < 1) {
        toast.warning("Password is required.");
        return;
      }

      const loginResp = await fetch(`${import.meta.env.VITE_BACKEND_URL || ''}/auth/login/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email, password }),
        credentials: "include",
      });

      if (!loginResp.ok) {
        toast.error("Password incorrect. Deletion aborted.");
        return;
      }

      const authHeader = token && token.startsWith('Token ') ? token : `Token ${token || ''}`;

      const apiBase = (import.meta.env.VITE_BACKEND_URL || '') as string;

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (authHeader.trim()) headers["Authorization"] = authHeader.trim();

      try {
        const bulkTasks = await fetch(`${apiBase}/tasks/clear/`, { method: "POST", headers, credentials: "include" });
        if (!bulkTasks.ok) {
          await Promise.allSettled(events.map(ev => fetch(`${apiBase}/tasks/${ev.id}/`, { method: "DELETE", headers, credentials: "include" })));
        }
      } catch {}

      try {
        const bulkNotes = await fetch(`${apiBase}/notes/clear/`, { method: "POST", headers, credentials: "include" });
        if (!bulkNotes.ok) {
          await Promise.allSettled(permanentNotes.map(n => fetch(`${apiBase}/notes/${n.id}/`, { method: "DELETE", headers, credentials: "include" })));
        }
      } catch {}

      try {
        const bulkGoals = await fetch(`${apiBase}/daily-goals/clear/`, { method: "POST", headers, credentials: "include" });
        if (!bulkGoals.ok) {
          await Promise.allSettled(dailyGoals.map(g => fetch(`${apiBase}/daily-goals/${g.id}/`, { method: "DELETE", headers, credentials: "include" })));
        }
      } catch {}

      try {
        const bulkTemplates = await fetch(`${apiBase}/event-templates/clear/`, { method: "POST", headers, credentials: "include" });
        if (!bulkTemplates.ok) {
          await Promise.allSettled(templates.map(t => fetch(`${apiBase}/event-templates/${t.id}/`, { method: "DELETE", headers, credentials: "include" })));
        }
      } catch {}

      setEvents([]);
      setPermanentNotes([]);
      setDailyGoals([]);
      setTemplates([]);
      setPinnedItems([]);
      setShowChecklist(false);

      toast.success("All your planner data has been deleted.");
    } catch (e) {
      console.error("Delete all data failed:", e);
      toast.error("Failed to delete all data. Please try again.");
    }
  };

  const applyFormatting = React.useCallback(
    (prefix: string, suffix: string) => {
      const textarea = document.getElementById(
        "quick-note"
      ) as HTMLTextAreaElement;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = quickNote.substring(start, end);
      let cursorPos = textarea.selectionStart;

      if (selectedText) {
        const newText =
          quickNote.substring(0, start) +
          prefix +
          selectedText +
          suffix +
          quickNote.substring(end);
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
          textarea.setSelectionRange(
            start,
            end + prefix.length + suffix.length
          );
        } else {
          textarea.setSelectionRange(
            cursorPos + prefix.length,
            cursorPos + prefix.length
          );
        }
      }, 0);
    },
    [quickNote]
  );

  const todayEvents = events.filter((event) =>
    isSameDay(parseISO(event.startDate), selectedDate)
  );

  const importantEvents = todayEvents.filter((event) => event.isImportant);

  const donutPalette = React.useMemo(
    () => [
      "#7C3AED", 
      "#3B82F6", 
      "#10B981", 
      "#F59E0B", 
      "#EC4899", 
      "#06B6D4", 
      "#EF4444", 
      "#F97316", 
      "#14B8A6", 
      "#8B5CF6", 
    ],
    []
  );

  const hoursData = React.useMemo(() => {
    const data = todayEvents.map((event) => {
      const start = parseISO(event.startDate).getTime();
      const end = parseISO(event.endDate).getTime();
      const hours = Math.max((end - start) / (1000 * 60 * 60), 0);
      return {
        name: event.title,
        value: Number(hours.toFixed(2)),
        fill: event.color,
      };
    });
    const filtered = data.filter((d) => d.value > 0);
    return filtered.map((d, i) => ({ ...d, fill: donutPalette[i % donutPalette.length] }));
  }, [todayEvents, donutPalette]);

  const totalHours = React.useMemo(
    () => hoursData.reduce((sum, d) => sum + d.value, 0),
    [hoursData]
  );

  const chartConfig = React.useMemo(
    () =>
      Object.fromEntries(
        hoursData.map((d) => [d.name, { label: d.name }])
      ),
    [hoursData]
  );

  return (
    <div className="min-h-screen mb-20 bg-background">
      <CalendarNav
        isAuthenticated={isAuthenticated}
        user={user}
        logout={logout}
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        setCreatingEvent={() => {}}
        showChecklist={showChecklist}
        setShowChecklist={setShowChecklist}
        setShowSummary={setShowSummary}
        isRefreshing={isRefreshing}
        saveAllAndRefresh={saveAllAndRefresh}
        handleImport={handleImport}
        handleExport={handleExport}
        handleDeleteAllData={handleDeleteAllData}
        events={events}
        todayEvents={todayEvents}
        importantEvents={importantEvents}
        isScrolled={isScrolled}
        isSearchOpen={isSearchOpen}
        setIsSearchOpen={setIsSearchOpen}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        activeSection={activeSection}
        setActiveSection={setActiveSection}
      />

      {}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {}
        <div className="flex flex-1 gap-4 md:gap-6 flex-col xl:flex-row">
          {}
          <div className="flex-1">
            {activeSection === "tasks" ? (
              <Tasks />
            ) : activeSection === "teams" ? (
              <Teams />
            ) : activeSection === "notifications" ? (
              <ExerciseBoard />
            ) : activeSection === "music" ? (
              <Music />
            ) : (
              <Card className="shadow-lg border border-border bg-[var(--calendar-date-bg)] backdrop-blur overflow-hidden">
                <CardContent className="py-2 pl-2 pr-0">
                  <CalendarDayView
                    selectedDate={selectedDate}
                    events={events}
                    setEvents={setEvents}
                    token={token || undefined}
                  />
                </CardContent>
              </Card>
            )}
          </div>

          {}
          {showChecklist && (
            <SidebarChecklist
              events={events}
              setEvents={setEvents}
              token={token || undefined}
              pinnedItems={pinnedItems}
              togglePin={togglePin}
              dailyGoals={dailyGoals}
              setDailyGoals={setDailyGoals}
              permanentNotes={permanentNotes}
              setPermanentNotes={setPermanentNotes}
              templates={templates}
              handleDeleteTemplate={handleDeleteTemplate}
              setIsAddTemplateOpen={setIsAddTemplateOpen}
              setEditingTemplate={setEditingTemplate}
              setIsEditTemplateOpen={setIsEditTemplateOpen}
              setNotePopupOpen={setNotePopupOpen}
              setQuickNote={setQuickNote}
              setNotePreviewMode={setNotePreviewMode}
              isGoalDialogOpen={isGoalDialogOpen}
              setIsGoalDialogOpen={setIsGoalDialogOpen}
              editingGoal={editingGoal}
              setEditingGoal={setEditingGoal}
            />
          )}
        </div>
      </div>

      {}
      <AddTemplateDialog
        isAddTemplateOpen={isAddTemplateOpen}
        setIsAddTemplateOpen={setIsAddTemplateOpen}
        newTemplate={newTemplate}
        setNewTemplate={setNewTemplate}
        templateCategories={templateCategories}
        setTemplateCategories={setTemplateCategories}
        handleSaveTemplate={handleSaveTemplate}
      />

      {}
      <EditTemplateDialog
        isEditTemplateOpen={isEditTemplateOpen}
        setIsEditTemplateOpen={setIsEditTemplateOpen}
        editingTemplate={editingTemplate}
        setEditingTemplate={setEditingTemplate}
        templateCategories={templateCategories}
        setTemplateCategories={setTemplateCategories}
        handleUpdateTemplate={handleUpdateTemplate}
      />

      {}
      <Dialog open={showSummary} onOpenChange={setShowSummary}>
        <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto rounded-2xl border border-border shadow-2xl bg-[var(--calendar-date-bg)] p-0">
          <DialogHeader className="p-6 pb-4 border-b border-border">
            <DialogTitle className="flex items-center gap-3 text-2xl font-bold text-foreground">
              <div className="p-2 bg-muted rounded-lg">
                <BarChart3 className="w-6 h-6 text-foreground" />
              </div>
              Event Summary
            </DialogTitle>
          </DialogHeader>
          <EventSummary
            events={events}
            todayEvents={todayEvents}
            showAll={showAll}
            setShowAll={setShowAll}
            hoursData={hoursData}
            totalHours={totalHours}
            chartConfig={chartConfig}
            handleDeleteEvent={handleDeleteEvent}
            playAlertSound={playAlertSound}
            setShowSummary={setShowSummary}
          />
        </DialogContent>
      </Dialog>
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
  );
};

export default Calendar;