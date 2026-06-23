import * as React from "react";
import { formatISO, addHours } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CheckSquare, Trash2, Plus, Clock, Star } from "lucide-react";
import { EmojiPicker } from "@/components/ui/emoji-picker";
import Checklist from "./Checklist";
import type { CalendarEvent, CalendarColor } from "./types";
import { fetchTasks, createTask, deleteTask } from "./api";
import { useAuth } from "@/contexts/AuthContext";

const defaultColor: CalendarColor = "blue";

const colorOptions: { value: CalendarColor; label: string }[] = [
  { value: "blue", label: "Blue" },
  { value: "green", label: "Green" },
  { value: "red", label: "Red" },
  { value: "yellow", label: "Yellow" },
  { value: "purple", label: "Purple" },
  { value: "orange", label: "Orange" },
  { value: "gray", label: "Gray" },
];

export const Tasks: React.FC = () => {
  const { token } = useAuth();

  const [tasks, setTasks] = React.useState<CalendarEvent[]>([]);
  const [events, setEvents] = React.useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [title, setTitle] = React.useState<string>("");
  const [description, setDescription] = React.useState<string>("");
  const [startDate, setStartDate] = React.useState<string>(() => formatISO(new Date()));
  const [endDate, setEndDate] = React.useState<string>(() => formatISO(addHours(new Date(), 1)));
  const [color, setColor] = React.useState<CalendarColor>(defaultColor);
  const [isImportant, setIsImportant] = React.useState<boolean>(false);
  const [emoji, setEmoji] = React.useState<string>("");

  const loadTasks = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchTasks(token || undefined);
      setTasks(data);
    } catch (e) {
      console.error("Failed to load tasks", e);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  React.useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const onAddTask = async () => {
    if (!title.trim()) return;
    const payload: Omit<CalendarEvent, "id"> = {
      title: title.trim(),
      description: description.trim() || undefined,
      startDate,
      endDate,
      color,
      isImportant,
    };
    const created = await createTask(payload, token || undefined);
    if (created) {
      setTasks((prev) => [created, ...prev]);
      setTitle("");
      setDescription("");
      setStartDate(formatISO(new Date()));
      setEndDate(formatISO(addHours(new Date(), 1)));
      setColor(defaultColor);
      setIsImportant(false);
    }
  };

  const onDeleteTask = async (id: string) => {
    const ok = await deleteTask(id, token || undefined);
    if (ok) setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="space-y-4">
      <Card className="border border-border bg-[var(--calendar-date-bg)]">
        <CardHeader className="py-3 px-4">
          <CardTitle className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5" />
            Tasks
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-3 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            <div className="flex items-center gap-2">
              <EmojiPicker value={emoji} onChange={setEmoji} />
              <Input
                placeholder="Task title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full"
              />
            </div>
            <Input
              placeholder="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full"
            />
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <Clock className="h-4 w-4" />
              <Input
                type="datetime-local"
                value={startDate.slice(0, 16)}
                onChange={(e) => setStartDate(new Date(e.target.value).toISOString())}
                className="w-full sm:w-auto"
              />
              <span className="text-xs text-muted-foreground">to</span>
              <Input
                type="datetime-local"
                value={endDate.slice(0, 16)}
                onChange={(e) => setEndDate(new Date(e.target.value).toISOString())}
                className="w-full sm:w-auto"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                className="h-10 px-3 rounded-md border bg-background min-w-[140px]"
                value={color}
                onChange={(e) => setColor(e.target.value as CalendarColor)}
              >
                {colorOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <button
                type="button"
                className={`h-10 px-3 rounded-md border flex items-center gap-2 ${isImportant ? "bg-yellow-500/20" : "bg-background"}`}
                onClick={() => setIsImportant((v) => !v)}
                aria-pressed={isImportant}
              >
                <Star className={`h-4 w-4 ${isImportant ? "text-yellow-500" : "text-foreground"}`} />
                <span className="text-sm">Important</span>
              </button>
              <Button onClick={onAddTask} className="ml-auto sm:ml-0">
                <Plus className="h-4 w-4 mr-2" /> Add Task
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border bg-[var(--calendar-date-bg)]">
        <CardHeader className="py-3 px-4">
          <CardTitle className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5" />
            Daily Checklist
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-3">
          <Checklist 
            events={events} 
            setEvents={setEvents} 
            token={token || undefined} 
          />
        </CardContent>
      </Card>

      <Card className="border border-border bg-[var(--calendar-date-bg)]">
        <CardHeader className="py-3 px-4">
          <CardTitle>My Tasks {isLoading ? "(Loading...)" : `(${tasks.length})`}</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-2">
          <Separator />
          <div className="space-y-2 max-h-[60vh] overflow-auto">
            {tasks.map((t) => (
              <div key={t.id} className="flex items-center gap-3 p-2 sm:p-3 rounded-lg border border-border bg-[var(--calendar-date-bg)]">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: t.color }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {t.emoji && <span className="mr-2">{t.emoji}</span>}
                    {t.title}
                  </p>
                  {t.description ? (
                    <p className="text-xs text-muted-foreground truncate">{t.description}</p>
                  ) : null}
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onDeleteTask(t.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {tasks.length === 0 && !isLoading && (
              <p className="text-sm text-muted-foreground">No tasks yet. Add your first task above.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Tasks;
