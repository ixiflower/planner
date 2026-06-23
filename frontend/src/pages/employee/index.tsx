import { useMemo, useState, useEffect } from "react";
import { ResizableGrid } from "@/components/ResizableGrid";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogOverlay
} from "@/components/ui/dialog";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent
} from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  BarChart3,
  ClipboardList,
  CheckSquare,
  Calendar as CalendarIcon,
  Menu,
  X,
  Layout,
  FileText,
  MessageSquare,
  Search,
  Filter,
  ArrowRight,
  Plus
} from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { useAuth } from "@/contexts/AuthContext";
import {
  users as teamUsers,
  type TeamUser as TeamUserData,
  type UserType as UserTypeData
} from "@/data/users";
import { format } from "date-fns";
import { toast } from "sonner";
import { ChevronsUpDown } from "lucide-react";
import { BACKEND_URL } from "@/config/backend";

type UserType = UserTypeData;

type TeamUser = TeamUserData;

type TaskItem = {
  id: string;
  title?: string;
  text: string;
  done: boolean;
};

type Report = {
  id: string;
  userId: string;
  name: string;
  role: string;
  type: UserType;
  avatarUrl?: string;
  tasks: TaskItem[];
  note: string;
  noteType?: "text" | "voice";
  submittedAt: string;
  status?: "approved" | "declined" | "pending";
  rating?: 1 | 2 | 3 | 4 | 5;
  images?: string[];
};

type Submission = {
  id: string;
  userId: string;
  username: string;
  date: string;
  report: string;
  rating?: 1 | 2 | 3 | 4 | 5;
  created_at: string;
};

function useTeam() {
  return teamUsers;
}

async function submitReportToBackend(
  payload: { tasks: TaskItem[]; note: string; noteType: "text" | "voice" },
  token: string,
  images?: File[]
) {
  const url = `${BACKEND_URL}/tickets/api/reports/`;

  // If images are provided, use multipart/form-data
  if (images && images.length > 0) {
    const formData = new FormData();
    formData.append('data', JSON.stringify(payload));

    // Add all images
    images.forEach((image) => {
      formData.append('images', image);
    });

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: token
      },
      body: formData
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      const error = new Error(String(res.status));
      (error as any).details = errorData;
      throw error;
    }
    return (await res.json()) as Report;
  } else {
    // Regular JSON request
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: token
    };
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      const error = new Error(String(res.status));
      (error as any).details = errorData;
      throw error;
    }
    return (await res.json()) as Report;
  }
}

async function submitSubmissionToBackend(
  payload: { date: string; report: string },
  token: string
) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: token
  };
  const url = `${BACKEND_URL}/tickets/api/submissions/`;
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const error = new Error(String(res.status));
    (error as any).details = errorData;
    throw error;
  }
  return await res.json();
}

async function fetchReportsByDate(date: Date, token: string) {
  const iso = format(date, "yyyy-MM-dd");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: token
  };
  const url = `${BACKEND_URL}/tickets/api/reports/?date=${encodeURIComponent(
    iso
  )}`;
  const res = await fetch(url, { method: "GET", headers });
  if (!res.ok) throw new Error(String(res.status));
  const data = await res.json();
  return Array.isArray(data?.reports) ? (data.reports as Report[]) : [];
}

async function fetchSubmissionsByDate(date: Date, token: string) {
  const iso = format(date, "yyyy-MM-dd");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: token
  };
  const url = `${BACKEND_URL}/tickets/api/submissions/?date=${encodeURIComponent(
    iso
  )}`;
  const res = await fetch(url, { method: "GET", headers });
  if (!res.ok) throw new Error(String(res.status));
  const data = await res.json();
  const submissions = Array.isArray(data?.submissions)
    ? (data.submissions as Submission[])
    : [];
  const reports = Array.isArray(data?.reports)
    ? (data.reports as Report[])
    : [];
  return { submissions, reports };
}

function getNoteDraftFor(userId: string, date: Date) {
  const all = JSON.parse(localStorage.getItem("noteDrafts") || "[]") as {
    userId: string;
    date: string;
    note: string;
    updatedAt: string;
  }[];
  const iso = format(date, "yyyy-MM-dd");
  const found = all.find((e) => e.userId === userId && e.date === iso);
  return found || null;
}

function saveNoteDraftFor(userId: string, date: Date, note: string) {
  const key = "noteDrafts";
  const all = JSON.parse(localStorage.getItem(key) || "[]") as {
    userId: string;
    date: string;
    note: string;
    updatedAt: string;
  }[];
  const iso = format(date, "yyyy-MM-dd");
  const updated = [
    ...all.filter((e) => !(e.userId === userId && e.date === iso)),
    { userId, date: iso, note, updatedAt: new Date().toISOString() }
  ];
  localStorage.setItem(key, JSON.stringify(updated));
}

function clearNoteDraftFor(userId: string, date: Date) {
  const key = "noteDrafts";
  const all = JSON.parse(localStorage.getItem(key) || "[]") as {
    userId: string;
    date: string;
    note: string;
    updatedAt: string;
  }[];
  const iso = format(date, "yyyy-MM-dd");
  const updated = all.filter((e) => !(e.userId === userId && e.date === iso));
  localStorage.setItem(key, JSON.stringify(updated));
}

function getEmployeeTodosFor(userId: string, date: Date) {
  const all = JSON.parse(localStorage.getItem("employeeTodos") || "[]") as {
    userId: string;
    date: string;
    tasks: TaskItem[];
  }[];
  const iso = format(date, "yyyy-MM-dd");
  const found = all.find((e) => e.userId === userId && e.date === iso);
  return found ? found.tasks : [];
}

async function fetchEmployeeTodosFromBackend(date: Date, token: string) {
  const iso = format(date, "yyyy-MM-dd");
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: token
    };

    const url = `${BACKEND_URL}/tickets/api/employee-todos/?date=${encodeURIComponent(
      iso
    )}`;
    const res = await fetch(url, { method: "GET", headers });

    if (!res.ok) {
      throw new Error(`Failed to fetch employee todos: ${res.status}`);
    }

    const data = await res.json();
    return Array.isArray(data?.todos) ? (data.todos as TaskItem[]) : [];
  } catch (e) {
    console.error("Failed to fetch employee todos from backend:", e);
    return [];
  }
}

async function saveEmployeeTodosToBackend(
  date: Date,
  todos: TaskItem[],
  token: string
) {
  const iso = format(date, "yyyy-MM-dd");
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: token
    };

    const payload = {
      date: iso,
      todos: todos.map((t) => ({
        text: t.text,
        done: t.done
      }))
    };

    const url = `${BACKEND_URL}/tickets/api/employee-todos/`;
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      throw new Error(`Failed to save employee todos: ${res.status}`);
    }

    return true;
  } catch (e) {
    console.error("Failed to save employee todos to backend:", e);
    return false;
  }
}

function saveEmployeeTodosFor(userId: string, date: Date, tasks: TaskItem[]) {
  const key = "employeeTodos";
  const all = JSON.parse(localStorage.getItem(key) || "[]") as {
    userId: string;
    date: string;
    tasks: TaskItem[];
  }[];
  const iso = format(date, "yyyy-MM-dd");
  const updated = [
    ...all.filter((e) => !(e.userId === userId && e.date === iso)),
    { userId, date: iso, tasks }
  ];
  localStorage.setItem(key, JSON.stringify(updated));
}

function getAssignedTasksFor(userId: string, date: Date) {
  const all = JSON.parse(localStorage.getItem("assignedTasks") || "[]") as {
    userId: string;
    date: string;
    tasks: TaskItem[];
  }[];
  const iso = format(date, "yyyy-MM-dd");
  const found = all.find((e) => e.userId === userId && e.date === iso);
  return found ? found.tasks : [];
}

async function fetchAssignedTasksFromBackend(
  userId: string,
  date: Date,
  token: string
) {
  const iso = format(date, "yyyy-MM-dd");
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: token
    };

    const url = `${BACKEND_URL}/tickets/api/assigned-tasks/?userId=${encodeURIComponent(
      userId
    )}&date=${encodeURIComponent(iso)}`;
    const res = await fetch(url, { method: "GET", headers });

    if (!res.ok) {
      throw new Error(`Failed to fetch assigned tasks: ${res.status}`);
    }

    const data = await res.json();
    return Array.isArray(data?.tasks) ? (data.tasks as TaskItem[]) : [];
  } catch (e) {
    console.error("Failed to fetch assigned tasks from backend:", e);
    return [];
  }
}

async function updateTaskInBackend(
  userId: string,
  taskId: string,
  done: boolean,
  date: Date,
  token: string
) {
  const iso = format(date, "yyyy-MM-dd");
  try {
    const tasks = await fetchAssignedTasksFromBackend(userId, date, token);

    const updatedTasks = tasks.map((task) =>
      task.id === taskId ? { ...task, done } : task
    );

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: token
    };

    const payload = {
      userId,
      date: iso,
      tasks: updatedTasks.map((t) => ({
        title: t.title,
        text: t.text,
        done: t.done
      }))
    };

    const url = `${BACKEND_URL}/tickets/api/assigned-tasks/`;
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      throw new Error(`Failed to update task: ${res.status}`);
    }

    return true;
  } catch (e) {
    console.error("Failed to update task in backend:", e);
    return false;
  }
}

export default function EmployeePage() {
  const { user, token, updateUser } = useAuth();
  const team = useTeam();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [activeTab, setActiveTab] = useState<"task" | "todo">("task");
  const [todos, setTodos] = useState<TaskItem[]>([]);
  const [newTodo, setNewTodo] = useState("");
  const [todoEditingId, setTodoEditingId] = useState<string | null>(null);
  const [todoDraft, setTodoDraft] = useState("");
  const [note, setNote] = useState("");
  const [noteMode, setNoteMode] = useState<"text" | "voice">("text");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [reportImages, setReportImages] = useState<File[]>([]);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deleteStep, setDeleteStep] = useState<1 | 2>(1);
  const [refreshTick, setRefreshTick] = useState(0);
  const [draftTick, setDraftTick] = useState(0);
  const [openViewId, setOpenViewId] = useState<string | null>(null);
  const [reportDialog, setReportDialog] = useState<{
    open: boolean;
    status?: "approved" | "declined" | "pending";
  }>({ open: false });

  // Sidebar state
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeMainView, setActiveMainView] = useState<'write' | 'submissions' | 'chat'>('write');
  const [selectedChatUser, setSelectedChatUser] = useState<string | null>(null);

  const me = useMemo<TeamUser>(() => {
    if (!user) return { id: "me", name: "You", role: "Member", type: "Member" };
    const inTeam = teamUsers.find((t) => t.id === user.id);
    return (
      inTeam || {
        id: user.id,
        name: user.name || user.username,
        role: "Member",
        type: "Member",
        avatarUrl: user.profile_picture
      }
    );
  }, [user]);

  const today = useMemo(() => new Date(), []);
  const [todayReports, setTodayReports] = useState<Report[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [subsReports, setSubsReports] = useState<Record<string, Report>>({});
  const myTodayReport = useMemo(
    () => todayReports.find((r) => r.userId === me.id) || null,
    [todayReports, me.id]
  );
  const maxWords = 600;
  const noteWords = useMemo(
    () => note.trim().split(/\s+/).filter(Boolean).length,
    [note]
  );
  const noteDraft = useMemo(
    () => getNoteDraftFor(me.id, today),
    [me.id, draftTick]
  );
  const doneTasks = useMemo(() => tasks.filter((t) => t.done).length, [tasks]);
  const totalTasks = useMemo(() => tasks.length, [tasks]);
  const progressValue = useMemo(
    () => (totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0),
    [doneTasks, totalTasks]
  );

  useEffect(() => {
    setTodos(getEmployeeTodosFor(me.id, today));
  }, [me.id, today]);

  useEffect(() => {
    if (token && me.id) {
      fetchEmployeeTodosFromBackend(today, token).then((todos) => {
        setTodos(todos);
        saveEmployeeTodosFor(me.id, today, todos);
      });

      fetchAssignedTasksFromBackend(me.id, today, token).then(setTasks);
      fetchReportsByDate(today, token)
        .then(setTodayReports)
        .catch(() => setTodayReports([]));
      fetchSubmissionsByDate(today, token)
        .then(({ submissions, reports }) => {
          setSubmissions(submissions);
          const map: Record<string, Report> = {};
          for (const r of reports) map[r.userId] = r;
          setSubsReports(map);
        })
        .catch(() => {
          setSubmissions([]);
          setSubsReports({});
        });
    }
  }, [me.id, token, refreshTick, today]);

  useEffect(() => {
    if (!editingId && !note && noteDraft) {
      setNote(noteDraft.note);
    }
  }, [editingId, noteDraft, note]);

  useEffect(() => {
    const handle = setTimeout(() => {
      if (note.trim()) {
        saveNoteDraftFor(me.id, today, note);
        setDraftTick((t) => t + 1);
      }
    }, 600);
    return () => clearTimeout(handle);
  }, [note, me.id, today]);

  const clampNote = (text: string) => {
    const words = text.trim().split(/\s+/).filter(Boolean);
    if (words.length <= maxWords) return text;
    return words.slice(0, maxWords).join(" ");
  };

  const toggleTask = async (id: string) => {
    if (!token) return;

    const task = tasks.find((t) => t.id === id);
    if (!task) return;

    const updatedTasks = tasks.map((t) =>
      t.id === id ? { ...t, done: !t.done } : t
    );
    setTasks(updatedTasks);

    const success = await updateTaskInBackend(
      me.id,
      id,
      !task.done,
      today,
      token
    );
    if (!success) {
      setTasks(tasks);
      toast.error("Failed to update task status");
    }
  };

  const addTodo = async () => {
    const text = newTodo.trim();
    if (!text) return;
    const next = [...todos, { id: crypto.randomUUID(), text, done: false }];
    setTodos(next);

    if (token) {
      const success = await saveEmployeeTodosToBackend(today, next, token);
      if (!success) {
        toast.error("Failed to save todo to server");
      }
    }

    saveEmployeeTodosFor(me.id, today, next);
    setNewTodo("");
  };

  const toggleTodo = async (id: string) => {
    setTodos((prev) => {
      const next = prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t));

      if (token) {
        saveEmployeeTodosToBackend(today, next, token).then((success) => {
          if (!success) {
            toast.error("Failed to save todo to server");
          }
        });
      }

      saveEmployeeTodosFor(me.id, today, next);
      return next;
    });
  };

  const startEditTodo = (id: string) => {
    const item = todos.find((t) => t.id === id);
    if (!item) return;
    setTodoEditingId(id);
    setTodoDraft(item.text);
  };

  const saveEditTodo = async () => {
    if (!todoEditingId) return;
    const text = todoDraft.trim();
    setTodos((prev) => {
      const next = prev.map((t) =>
        t.id === todoEditingId ? { ...t, text } : t
      );

      if (token) {
        saveEmployeeTodosToBackend(today, next, token).then((success) => {
          if (!success) {
            toast.error("Failed to save todo to server");
          }
        });
      }

      saveEmployeeTodosFor(me.id, today, next);
      return next;
    });
    setTodoEditingId(null);
    setTodoDraft("");
  };

  const deleteTodo = async (id: string) => {
    setTodos((prev) => {
      const next = prev.filter((t) => t.id !== id);

      if (token) {
        saveEmployeeTodosToBackend(today, next, token).then((success) => {
          if (!success) {
            toast.error("Failed to save todo to server");
          }
        });
      }

      saveEmployeeTodosFor(me.id, today, next);
      return next;
    });
  };

  async function updateReportBackend(
    reportId: string,
    payload: { tasks: TaskItem[]; note: string; noteType: "text" | "voice" },
    token: string
  ) {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: token
    };
    const url = `${BACKEND_URL}/tickets/api/reports/${encodeURIComponent(
      reportId
    )}/`;
    const res = await fetch(url, {
      method: "PUT",
      headers,
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(String(res.status));
  }

  async function deleteReportBackend(reportId: string, token: string) {
    const headers: Record<string, string> = {
      Authorization: token
    };
    const url = `${BACKEND_URL}/tickets/api/reports/${encodeURIComponent(
      reportId
    )}/`;
    const res = await fetch(url, { method: "DELETE", headers });
    if (!res.ok) throw new Error(String(res.status));
  }

  const submitReport = async () => {
    if (!token) return;

    // Validate tasks - check if at least one task is marked as done
    const doneTasks = tasks.filter((t) => t.done);
    const doneTodos = todos.filter((t) => t.done);

    if (doneTasks.length === 0 && doneTodos.length === 0) {
      toast.error("Please select at least one task or todo as done before submitting");
      return;
    }

    // Validate note
    if (!note || note.trim().length === 0) {
      toast.error("Please write a report before submitting");
      return;
    }

    // Combine tasks and todos for the report
    const allCompletedItems = [
      ...tasks.filter(t => t.done).map(t => ({ ...t, type: 'task' })),
      ...todos.filter(t => t.done).map(t => ({ ...t, type: 'todo' }))
    ];

    const payload = {
      tasks: allCompletedItems,
      note,
      noteType: noteMode
    };

    try {
      if (editingId) {
        await updateReportBackend(editingId, payload, token);
      } else {
        await submitReportToBackend(payload, token, reportImages);
      }

      const submissionPayload = {
        date: format(today, "yyyy-MM-dd"),
        report: note
      };
      await submitSubmissionToBackend(submissionPayload, token);

      setNote("");
      setEditingId(null);
      // Clean up object URLs before clearing images
      reportImages.forEach(file => URL.revokeObjectURL(URL.createObjectURL(file)));
      setReportImages([]);
      setRefreshTick((t) => t + 1);
      if (token) {
        fetchReportsByDate(today, token)
          .then(setTodayReports)
          .catch(() => {});
      }
      toast.success(editingId ? "Report updated" : "Report submitted");
    } catch (error: any) {
      // Parse backend error messages
      let errorMessage = "Failed to submit report";

      // Check if backend returned a specific error message
      if (error?.details?.error) {
        errorMessage = error.details.error;
      } else if (error?.message) {
        const statusCode = parseInt(error.message);

        if (statusCode === 400) {
          errorMessage = "Invalid data. Please check your report and try again";
        } else if (statusCode === 401) {
          errorMessage = "Authentication failed. Please login again";
        } else if (statusCode === 403) {
          errorMessage = "You don't have permission to perform this action";
        } else if (statusCode === 500) {
          errorMessage = "Server error. Please try again later";
        }
      }

      toast.error(errorMessage);
    }
  };

  return (
    <div className="main h-[100svh] flex overflow-hidden bg-background">
      {/* Left Sidebar */}
      <div className={`transition-all duration-300 ${isSidebarOpen ? 'w-80' : 'w-0'} overflow-hidden border-r bg-muted/30`}>
        <div className="h-full p-4 space-y-6 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-lg">Menu</h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSidebarOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Navigation Tabs in Sidebar */}
          <div className="space-y-2">
            <label className="text-sm font-medium">View</label>
            <ToggleGroup
              type="single"
              value={activeMainView}
              onValueChange={(value) => value && setActiveMainView(value as any)}
              className="flex flex-col items-stretch bg-muted/50 border rounded-lg p-1 gap-1"
            >
              <ToggleGroupItem
                value="write"
                className="data-[state=on]:bg-background data-[state=on]:shadow-sm justify-start px-4 h-10 gap-2"
              >
                <FileText className="h-4 w-4" /> Write Report
              </ToggleGroupItem>
              <ToggleGroupItem
                value="submissions"
                className="data-[state=on]:bg-background data-[state=on]:shadow-sm justify-start px-4 h-10 gap-2"
              >
                <CheckSquare className="h-4 w-4" /> Submissions
              </ToggleGroupItem>
              <ToggleGroupItem
                value="chat"
                className="data-[state=on]:bg-background data-[state=on]:shadow-sm justify-start px-4 h-10 gap-2"
              >
                <MessageSquare className="h-4 w-4" /> Chat
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          {activeMainView === 'chat' ? (
            <div className="flex-1 flex flex-col min-h-0 animate-in slide-in-from-right duration-300">
              <Separator className="mb-4" />
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium">Messages</h4>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto space-y-2">
                {team.filter(u => u.id !== me.id).map(u => (
                  <div
                    key={u.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                    onClick={() => setSelectedChatUser(u.id)}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={u.avatarUrl} />
                      <AvatarFallback>{u.name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{u.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{u.role}</p>
                    </div>
                    <Badge variant="secondary" className="text-[10px] px-1 h-4">
                      Online
                    </Badge>
                  </div>
                ))}
              </div>
              {selectedChatUser && (
                <div className="mt-4 p-3 border rounded-lg bg-background">
                  <div className="flex items-center gap-2 mb-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback>{team.find(u => u.id === selectedChatUser)?.name[0]}</AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium">{team.find(u => u.id === selectedChatUser)?.name}</span>
                  </div>
                  <div className="h-32 mb-2 bg-muted/50 rounded p-2 text-[10px] overflow-y-auto">
                    <p className="text-muted-foreground italic text-center mt-8">Start your conversation...</p>
                  </div>
                  <div className="flex gap-1">
                    <Input className="h-7 text-xs" placeholder="Type a message..." />
                    <Button size="icon" className="h-7 w-7"><ArrowRight className="h-3 w-3" /></Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <Separator />

              {/* Calendar in Sidebar */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Date</label>
                <div className="flex justify-center mt-4">
                  <Calendar
                    mode="single"
                    className="rounded-md border mx-auto"
                  />
                </div>
                <Button
                  variant="outline"
                  className="w-full mt-2"
                  onClick={() => {}}
                >
                  Jump to Today
                </Button>
              </div>

              <Separator />
              <div className="space-y-2">
                <label className="text-sm font-medium">Your Stats</label>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Today's Tasks:</span>
                    <span className="font-medium">{totalTasks}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Completed:</span>
                    <span className="font-medium text-green-600">
                      {doneTasks}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <Badge
                      variant={myTodayReport ? "outline" : "secondary"}
                      className={myTodayReport ? "bg-green-100 text-green-700" : ""}
                    >
                      {myTodayReport ? "Submitted" : "Pending"}
                    </Badge>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col p-4 pb-24 gap-4 overflow-y-auto">
        {/* Top Bar - Hamburger & Dashboard Title */}
        <div className="flex items-center gap-4">
          {!isSidebarOpen && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu className="h-4 w-4" />
            </Button>
          )}
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">Employee Dashboard</h1>
            <Badge variant="outline" className="ml-2">
              {me.role}
            </Badge>
          </div>
        </div>

        <div className="section h-full">
          <ResizableGrid className="hidden min-[1700px]:grid">
            {/* Write Report - Large left area (div1) */}
            <Card className="h-full">
              <CardHeader>
                <CardTitle>Write Report</CardTitle>
                <CardDescription>Tasks and detailed notes</CardDescription>
              </CardHeader>
              <CardContent className="h-full overflow-hidden min-h-0">
                <div className="flex flex-col min-[1700px]:flex-row gap-6 h-full">
                  <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
                    <Tabs
                      value={activeTab}
                      onValueChange={(v) => setActiveTab(v as "task" | "todo")}
                    >
                      <TabsList>
                        <TabsTrigger value="task">Task</TabsTrigger>
                        <TabsTrigger value="todo">Todo</TabsTrigger>
                      </TabsList>
                      <TabsContent value="task" className="space-y-3">
                        <div className="text-sm font-medium">Tasks</div>
                        <div className="text-xs text-muted-foreground">
                          Tasks are assigned by employer
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="inline-flex items-center gap-2 text-sm">
                            <Badge variant="secondary">
                              {doneTasks} / {totalTasks} completed
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {progressValue}%
                            </span>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              if (token && me.id) {
                                fetchAssignedTasksFromBackend(
                                  me.id,
                                  today,
                                  token
                                ).then(setTasks);
                              }
                            }}
                          >
                            Refresh
                          </Button>
                        </div>
                        <Progress value={progressValue} />
                        <div>
                          {tasks.length > 0 ? (
                            <ScrollArea className="h-[35svh] md:h-[40svh]">
                              <div className="divide-y p-2 pr-4">
                                {tasks.map((t) => (
                                  <div
                                    key={t.id}
                                    className="flex items-start gap-3 py-2"
                                  >
                                    <Checkbox
                                      checked={t.done}
                                      onCheckedChange={() => toggleTask(t.id)}
                                    />
                                    <div className="flex-1 truncate">
                                      {t.title && (
                                        <div className="font-medium text-sm truncate">
                                          {t.title}
                                        </div>
                                      )}
                                      <div className="text-sm truncate">
                                        {t.text}
                                      </div>
                                    </div>
                                    <Badge
                                      variant={t.done ? "default" : "secondary"}
                                    >
                                      {t.done ? "Done" : "Todo"}
                                    </Badge>
                                  </div>
                                ))}
                              </div>
                            </ScrollArea>
                          ) : (
                            <div className="p-2 py-6 text-center text-sm text-muted-foreground">
                              No tasks assigned ok ?
                            </div>
                          )}
                        </div>
                      </TabsContent>
                      <TabsContent value="todo" className="space-y-3">
                        <div className="text-sm font-medium">Your Todo</div>
                        <div className="text-xs text-muted-foreground">
                          Personal tasks you add for yourself
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            placeholder="Add a todo"
                            value={newTodo}
                            onChange={(e) => setNewTodo(e.target.value)}
                          />
                          <Button size="sm" onClick={addTodo}>
                            Add
                          </Button>
                        </div>
                        <div className="border rounded-md p-2">
                          {todos.length > 0 ? (
                            <div className="divide-y">
                              {todos.map((t) => (
                                <div
                                  key={t.id}
                                  className="flex items-center gap-3 py-2"
                                >
                                  <Checkbox
                                    checked={t.done}
                                    onCheckedChange={() => toggleTodo(t.id)}
                                  />
                                  <div className="flex-1">
                                    {todoEditingId === t.id ? (
                                      <Input
                                        value={todoDraft}
                                        onChange={(e) =>
                                          setTodoDraft(e.target.value)
                                        }
                                      />
                                    ) : (
                                      <div className="text-sm truncate">
                                        {t.text}
                                      </div>
                                    )}
                                  </div>
                                  {todoEditingId === t.id ? (
                                    <div className="inline-flex items-center gap-2">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={saveEditTodo}
                                      >
                                        Save
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => {
                                          setTodoEditingId(null);
                                          setTodoDraft("");
                                        }}
                                      >
                                        Cancel
                                      </Button>
                                    </div>
                                  ) : (
                                    <div className="inline-flex items-center gap-2">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => startEditTodo(t.id)}
                                      >
                                        Edit
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="destructive"
                                        onClick={() => deleteTodo(t.id)}
                                      >
                                        Delete
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="py-6 text-center text-sm text-muted-foreground">
                              No todos yet
                            </div>
                          )}
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>
                  <Separator orientation="vertical" className="hidden min-[1700px]:block" />
                  <div className="flex flex-col gap-4 flex-1 min-h-0">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium">Notes</div>
                      <div className="inline-flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">Text</span>
                        <Switch
                          checked={noteMode === "voice"}
                          onCheckedChange={(c) => setNoteMode(c ? "voice" : "text")}
                        />
                        <span className="text-muted-foreground">Voice</span>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 min-h-10">
                      <div className="inline-flex items-center gap-2 overflow-x-auto whitespace-nowrap">
                        {noteMode === "text" && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setNote((p) =>
                                  clampNote(`${p}${p ? "\n\n" : ""}Summary:\n- `)
                                )
                              }
                            >
                              Add Summary
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setNote((p) =>
                                  clampNote(
                                    `${p}${p ? "\n\n" : ""}Achievements:\n- `
                                  )
                                )
                              }
                            >
                              Add Achievements
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setNote((p) =>
                                  clampNote(`${p}${p ? "\n\n" : ""}Challenges:\n- `)
                                )
                              }
                            >
                              Add Challenges
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setNote((p) =>
                                  clampNote(`${p}${p ? "\n\n" : ""}Next Steps:\n- `)
                                )
                              }
                            >
                              Add Next Steps
                            </Button>
                          </>
                        )}
                      </div>
                      <div className="inline-flex items-center gap-3">
                        <div className="inline-flex items-center gap-2 text-xs text-muted-foreground h-6 min-w-[176px] justify-end">
                          {noteMode === "text" ? (
                            <>
                              <Badge
                                variant={
                                  noteWords >= maxWords
                                    ? "destructive"
                                    : "secondary"
                                }
                                className="min-w-[120px] justify-center font-mono"
                              >
                                {noteWords} / {maxWords} words
                              </Badge>
                              <Badge
                                variant="secondary"
                                className="min-w-[80px] justify-center font-mono"
                              >
                                {note.length} chars
                              </Badge>
                            </>
                          ) : (
                            <Badge
                              variant="secondary"
                              className="min-w-[176px] justify-center"
                            >
                              Voice note mode
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    {noteMode === "text" ? (
                      <Textarea
                        placeholder="Write detailed report"
                        value={note}
                        onChange={(e) => setNote(clampNote(e.target.value))}
                        className="flex-1 resize-none overflow-y-auto min-h-[200px]"
                      />
                    ) : (
                      <div className="border rounded-md p-4 min-h-[220px] md:min-h-[30vh] flex flex-col items-center justify-center gap-3 text-center">
                        <div className="text-sm font-medium">Voice note</div>
                        <div className="text-xs text-muted-foreground">
                          Recording and upload are not implemented
                        </div>
                        <div className="inline-flex items-center gap-2">
                          <Button size="sm" variant="outline" disabled>
                            Record
                          </Button>
                          <Button size="sm" variant="outline" disabled>
                            Stop
                          </Button>
                          <Button size="sm" variant="outline" disabled>
                            Attach Audio
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Image Upload Section */}
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Attach Images (Optional)</div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={(e) => {
                            const files = Array.from(e.target.files || []);
                            setReportImages((prev) => [...prev, ...files]);
                          }}
                          className="flex-1"
                        />
                        {reportImages.length > 0 && (
                          <Badge variant="secondary">{reportImages.length} image(s)</Badge>
                        )}
                      </div>
                      {reportImages.length > 0 && (
                        <div className="border rounded-md p-3 space-y-3">
                          <div className="text-xs font-medium text-muted-foreground">Preview:</div>
                          <ScrollArea className="w-full whitespace-nowrap">
                            <div className="flex gap-3 pb-2">
                              {reportImages.map((file, idx) => (
                                <div key={idx} className="relative inline-block group">
                                  <img
                                    src={URL.createObjectURL(file)}
                                    alt={file.name}
                                    className="h-24 w-24 object-cover rounded border shadow-sm"
                                  />
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => {
                                      setReportImages((prev) => prev.filter((_, i) => i !== idx));
                                      URL.revokeObjectURL(URL.createObjectURL(file));
                                    }}
                                  >
                                    ×
                                  </Button>
                                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] px-1 py-0.5 truncate rounded-b">
                                    {file.name}
                                  </div>
                                  <div className="absolute top-0 left-0 bg-black/60 text-white text-[10px] px-1 py-0.5 rounded-tl rounded-br">
                                    {(file.size / 1024).toFixed(1)} KB
                                  </div>
                                </div>
                              ))}
                            </div>
                            <ScrollBar orientation="horizontal" />
                          </ScrollArea>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="text-xs text-muted-foreground">
                        {noteMode === "text"
                          ? note.trim()
                            ? "Autosaves while typing"
                            : noteDraft
                            ? "Draft available"
                            : ""
                          : "Voice note mode"}
                      </div>
                      <div className="inline-flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={noteMode !== "text" || !noteDraft}
                          onClick={() => {
                            if (noteDraft) {
                              setNote(clampNote(noteDraft.note));
                              toast.info("Draft restored");
                            }
                          }}
                        >
                          Restore Draft
                        </Button>
                        {note && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setNote("");
                              clearNoteDraftFor(me.id, today);
                              setDraftTick((t) => t + 1);
                            }}
                          >
                            Clear
                          </Button>
                        )}
                      </div>
                    </div>
                    <Separator />
                    <div className="flex justify-end">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-flex">
                            <Button
                              onClick={submitReport}
                              disabled={
                                (!note.trim() && tasks.length === 0) ||
                                noteWords > maxWords
                              }
                            >
                              {editingId ? "Update Report" : "Submit Report"}
                            </Button>
                          </span>
                        </TooltipTrigger>
                      </Tooltip>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Submissions - Top right area (div2) */}
            <Card className="h-full overflow-hidden">
              <CardHeader>
                <CardTitle>Submissions</CardTitle>
                <CardDescription>Who submitted reports today</CardDescription>
              </CardHeader>
              <CardContent className="h-full overflow-hidden min-h-0">
                <ScrollArea className="h-full">
                  <div className="border rounded-md overflow-x-auto min-[1700px]:overflow-x-visible">
                    <div className="min-w-[900px] min-[1700px]:min-w-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead>Report</TableHead>
                            <TableHead>Submitted</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {submissions.map((s) => (
                            <TableRow key={s.id}>
                              <TableCell className="flex items-center gap-2">
                                <Avatar>
                                  {subsReports[s.userId]?.avatarUrl && (
                                    <AvatarImage
                                      src={subsReports[s.userId]?.avatarUrl}
                                      alt={s.username}
                                    />
                                  )}
                                  <AvatarFallback>
                                    {s.username?.slice(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="font-medium">{s.username}</span>
                              </TableCell>
                              <TableCell className="max-w-[400px] truncate">
                                {s.report}
                              </TableCell>
                              <TableCell>
                                {format(new Date(s.created_at), "yyyy-MM-dd HH:mm")}
                              </TableCell>
                              <TableCell>
                                {(() => {
                                  const status =
                                    subsReports[s.userId]?.status || "pending";
                                  const ratingVal =
                                    subsReports[s.userId]?.rating ?? s.rating;
                                  const colorClass =
                                    status === "approved"
                                      ? [
                                          "bg-red-100 text-red-700",
                                          "bg-orange-100 text-orange-700",
                                          "bg-amber-100 text-amber-700",
                                          "bg-lime-100 text-lime-700",
                                          "bg-green-100 text-green-700"
                                        ][
                                          Math.min(5, Math.max(1, ratingVal || 5)) -
                                            1
                                        ]
                                      : undefined;
                                  return (
                                    <Badge
                                      variant={
                                        status === "declined"
                                          ? "destructive"
                                          : "secondary"
                                      }
                                      className={colorClass}
                                    >
                                      {status}
                                      {ratingVal ? ` • ${ratingVal}` : ""}
                                    </Badge>
                                  );
                                })()}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="inline-flex items-center gap-2 justify-end">
                                  <Dialog
                                    open={openViewId === s.id}
                                    onOpenChange={(o) => !o && setOpenViewId(null)}
                                  >
                                    <DialogTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setOpenViewId(s.id)}
                                      >
                                        View
                                      </Button>
                                    </DialogTrigger>
                                    <DialogOverlay className="backdrop-blur-sm" />
                                    <DialogContent className="w-[900px] max-w-[95vw] max-h-[92dvh] sm:max-h-[88dvh] overflow-hidden grid grid-rows-[auto_1fr_auto]">
                                      <DialogHeader>
                                        <DialogTitle>{s.username}</DialogTitle>
                                      </DialogHeader>
                                      <div className="space-y-4 min-h-0 overflow-hidden">
                                        <div className="flex items-center gap-2">
                                          <Badge variant="secondary">
                                            {format(
                                              new Date(s.created_at),
                                              "yyyy-MM-dd HH:mm"
                                            )}
                                          </Badge>
                                        </div>
                                        <div className="grid gap-4 md:grid-cols-[1fr] h-full min-h-0">
                                          <div className="h-full min-w-0">
                                            <div className="text-sm font-medium mb-2">
                                              Report
                                            </div>
                                            <div className="space-y-3">
                                              <Textarea
                                                value={s.report || "No report"}
                                                readOnly
                                                className="w-full max-w-full resize-none h-[35vh] md:h-[40vh] overflow-y-auto break-words whitespace-pre-wrap"
                                              />
                                              {subsReports[s.userId]?.images && subsReports[s.userId].images!.length > 0 && (
                                                <div className="space-y-2">
                                                  <div className="text-sm font-medium">Attached Images</div>
                                                  <ScrollArea className="w-full whitespace-nowrap">
                                                    <div className="flex gap-2 pb-2">
                                                      {subsReports[s.userId].images!.map((imgUrl, idx) => (
                                                        <div key={idx} className="relative inline-block">
                                                          <img
                                                            src={`${BACKEND_URL}${imgUrl}`}
                                                            alt={`Report image ${idx + 1}`}
                                                            className="h-24 w-auto object-cover rounded border cursor-pointer hover:opacity-80 transition"
                                                            onClick={() => window.open(`${BACKEND_URL}${imgUrl}`, '_blank')}
                                                          />
                                                        </div>
                                                      ))}
                                                    </div>
                                                    <ScrollBar orientation="horizontal" />
                                                  </ScrollArea>
                                                </div>
                                              )}
                                              <div className="flex justify-end gap-2">
                                                <Button
                                                  size="sm"
                                                  variant="outline"
                                                  onClick={() => {
                                                    const r = subsReports[s.userId];
                                                    const isMine =
                                                      user &&
                                                      String(user.id) ===
                                                        String(s.userId);
                                                    const isPending =
                                                      r?.status === "pending";
                                                    if (!isMine) {
                                                      toast.error(
                                                        "You can only edit your own report"
                                                      );
                                                      return;
                                                    }
                                                    if (!isPending) {
                                                      toast.error(
                                                        "Report is not pending and cannot be edited"
                                                      );
                                                      return;
                                                    }
                                                    setEditingId(r?.id);
                                                    setNote(
                                                      clampNote(s.report || "")
                                                    );
                                                    setOpenViewId(null);
                                                  }}
                                                >
                                                  Load to Editor
                                                </Button>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </DialogContent>
                                  </Dialog>
                                  {(() => {
                                    const r = subsReports[s.userId];
                                    const isMine =
                                      user && String(user.id) === String(s.userId);
                                    const isPending = r?.status === "pending";
                                    if (!r || !isMine || !isPending) return null;
                                    return (
                                      <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                          <Button size="sm" variant="destructive">
                                            Delete
                                          </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                          <AlertDialogHeader>
                                            <AlertDialogTitle>
                                              Delete report?
                                            </AlertDialogTitle>
                                            <AlertDialogDescription>
                                              This will remove today's report.
                                            </AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter>
                                            <AlertDialogCancel>
                                              Cancel
                                            </AlertDialogCancel>
                                            <AlertDialogAction
                                              onClick={async () => {
                                                if (!token || !r?.id) return;
                                                try {
                                                  await deleteReportBackend(
                                                    r.id,
                                                    token
                                                  );
                                                  setOpenViewId(null);
                                                  setEditingId(null);
                                                  setNote("");
                                                  setRefreshTick((t) => t + 1);
                                                  toast.success("Report deleted");
                                                } catch (_) {
                                                  toast.error(
                                                    "Failed to delete report"
                                                  );
                                                }
                                              }}
                                            >
                                              Delete
                                            </AlertDialogAction>
                                          </AlertDialogFooter>
                                        </AlertDialogContent>
                                      </AlertDialog>
                                    );
                                  })()}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                          {submissions.length === 0 && (
                            <TableRow>
                              <TableCell
                                colSpan={5}
                                className="text-muted-foreground"
                              >
                                No submissions
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              </CardContent>
            </Card>
          </ResizableGrid>

          {/* Mobile Layout Fallback */}
          <div className="min-[1700px]:hidden space-y-6">
            {/* Write Report - Mobile */}
            <Card className="h-[85svh]">
              <CardHeader>
                <CardTitle>Write Report</CardTitle>
                <CardDescription>Tasks and detailed notes</CardDescription>
              </CardHeader>
              <CardContent className="h-full overflow-hidden min-h-0">
                <div className="flex flex-col gap-6 h-full">
                  <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
                    <Tabs
                      value={activeTab}
                      onValueChange={(v) => setActiveTab(v as "task" | "todo")}
                    >
                      <TabsList>
                        <TabsTrigger value="task">Task</TabsTrigger>
                        <TabsTrigger value="todo">Todo</TabsTrigger>
                      </TabsList>
                      <TabsContent value="task" className="space-y-3">
                        <div className="text-sm font-medium">Tasks</div>
                        <div className="text-xs text-muted-foreground">
                          Tasks are assigned by employer
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="inline-flex items-center gap-2 text-sm">
                            <Badge variant="secondary">
                              {doneTasks} / {totalTasks} completed
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {progressValue}%
                            </span>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              if (token && me.id) {
                                fetchAssignedTasksFromBackend(
                                  me.id,
                                  today,
                                  token
                                ).then(setTasks);
                              }
                            }}
                          >
                            Refresh
                          </Button>
                        </div>
                        <Progress value={progressValue} />
                        <div>
                          {tasks.length > 0 ? (
                            <ScrollArea className="h-[35svh] md:h-[40svh]">
                              <div className="divide-y p-2 pr-4">
                                {tasks.map((t) => (
                                  <div
                                    key={t.id}
                                    className="flex items-start gap-3 py-2"
                                  >
                                    <Checkbox
                                      checked={t.done}
                                      onCheckedChange={() => toggleTask(t.id)}
                                    />
                                    <div className="flex-1 truncate">
                                      {t.title && (
                                        <div className="font-medium text-sm truncate">
                                          {t.title}
                                        </div>
                                      )}
                                      <div className="text-sm truncate">
                                        {t.text}
                                      </div>
                                    </div>
                                    <Badge
                                      variant={t.done ? "default" : "secondary"}
                                    >
                                      {t.done ? "Done" : "Todo"}
                                    </Badge>
                                  </div>
                                ))}
                              </div>
                            </ScrollArea>
                          ) : (
                            <div className="p-2 py-6 text-center text-sm text-muted-foreground">
                              No tasks assigned ok ?
                            </div>
                          )}
                        </div>
                      </TabsContent>
                      <TabsContent value="todo" className="space-y-3">
                        <div className="text-sm font-medium">Your Todo</div>
                        <div className="text-xs text-muted-foreground">
                          Personal tasks you add for yourself
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            placeholder="Add a todo"
                            value={newTodo}
                            onChange={(e) => setNewTodo(e.target.value)}
                          />
                          <Button size="sm" onClick={addTodo}>
                            Add
                          </Button>
                        </div>
                        <div className="border rounded-md p-2">
                          {todos.length > 0 ? (
                            <div className="divide-y">
                              {todos.map((t) => (
                                <div
                                  key={t.id}
                                  className="flex items-center gap-3 py-2"
                                >
                                  <Checkbox
                                    checked={t.done}
                                    onCheckedChange={() => toggleTodo(t.id)}
                                  />
                                  <div className="flex-1">
                                    {todoEditingId === t.id ? (
                                      <Input
                                        value={todoDraft}
                                        onChange={(e) =>
                                          setTodoDraft(e.target.value)
                                        }
                                      />
                                    ) : (
                                      <div className="text-sm truncate">
                                        {t.text}
                                      </div>
                                    )}
                                  </div>
                                  {todoEditingId === t.id ? (
                                    <div className="inline-flex items-center gap-2">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={saveEditTodo}
                                      >
                                        Save
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => {
                                          setTodoEditingId(null);
                                          setTodoDraft("");
                                        }}
                                      >
                                        Cancel
                                      </Button>
                                    </div>
                                  ) : (
                                    <div className="inline-flex items-center gap-2">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => startEditTodo(t.id)}
                                      >
                                        Edit
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="destructive"
                                        onClick={() => deleteTodo(t.id)}
                                      >
                                        Delete
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="py-6 text-center text-sm text-muted-foreground">
                              No todos yet
                            </div>
                          )}
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>
                  <Separator />
                  <div className="flex flex-col gap-4 min-h-0">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium">Notes</div>
                      <div className="inline-flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">Text</span>
                        <Switch
                          checked={noteMode === "voice"}
                          onCheckedChange={(c) => setNoteMode(c ? "voice" : "text")}
                        />
                        <span className="text-muted-foreground">Voice</span>
                      </div>
                    </div>
                    <Textarea
                      placeholder="Write detailed report"
                      value={note}
                      onChange={(e) => setNote(clampNote(e.target.value))}
                      className="flex-1 resize-none overflow-y-auto min-h-[200px]"
                    />
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-muted-foreground">
                        {note.trim() ? "Autosaves while typing" : noteDraft ? "Draft available" : ""}
                      </div>
                      <div className="inline-flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={!noteDraft}
                          onClick={() => {
                            if (noteDraft) {
                              setNote(clampNote(noteDraft.note));
                              toast.info("Draft restored");
                            }
                          }}
                        >
                          Restore Draft
                        </Button>
                        {note && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setNote("");
                              clearNoteDraftFor(me.id, today);
                              setDraftTick((t) => t + 1);
                            }}
                          >
                            Clear
                          </Button>
                        )}
                      </div>
                    </div>
                    <Separator />
                    <div className="flex justify-end">
                      <Button
                        onClick={submitReport}
                        disabled={(!note.trim() && tasks.length === 0) || noteWords > maxWords}
                      >
                        {editingId ? "Update Report" : "Submit Report"}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Submissions - Mobile */}
            <Card className="h-[60vh] overflow-hidden">
              <CardHeader>
                <CardTitle>Submissions</CardTitle>
                <CardDescription>Who submitted reports today</CardDescription>
              </CardHeader>
              <CardContent className="h-full overflow-hidden min-h-0">
                <ScrollArea className="h-full">
                  <div className="border rounded-md overflow-x-auto">
                    <div className="min-w-[900px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead>Report</TableHead>
                            <TableHead>Submitted</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {submissions.map((s) => (
                            <TableRow key={s.id}>
                              <TableCell className="flex items-center gap-2">
                                <Avatar>
                                  {subsReports[s.userId]?.avatarUrl && (
                                    <AvatarImage
                                      src={subsReports[s.userId]?.avatarUrl}
                                      alt={s.username}
                                    />
                                  )}
                                  <AvatarFallback>
                                    {s.username?.slice(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="font-medium">{s.username}</span>
                              </TableCell>
                              <TableCell className="max-w-[400px] truncate">
                                {s.report}
                              </TableCell>
                              <TableCell>
                                {format(new Date(s.created_at), "yyyy-MM-dd HH:mm")}
                              </TableCell>
                              <TableCell>
                                <Badge variant="secondary">pending</Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button size="sm" variant="outline">
                                  View
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                          {submissions.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center py-6">
                                <div className="text-sm text-muted-foreground">
                                  No submissions today
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <AlertDialog
        open={reportDialog.open}
        onOpenChange={(o) => setReportDialog({ open: o })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {reportDialog.status === "pending"
                ? "You already submitted today's report"
                : reportDialog.status === "approved"
                ? "Report is approved"
                : reportDialog.status === "declined"
                ? "Report is declined"
                : "Report status"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {reportDialog.status === "pending"
                ? "You can still edit your report while it is pending."
                : "You can't change the report after it is approved or declined."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            {reportDialog.status === "pending" ? (
              <>
                <AlertDialogAction
                  onClick={() => {
                    if (myTodayReport) {
                      setEditingId(myTodayReport.id);
                      if (myTodayReport.note) {
                        setNote(clampNote(myTodayReport.note));
                      }
                    }
                    setReportDialog({ open: false });
                  }}
                >
                  Edit Report
                </AlertDialogAction>
                <AlertDialogAction
                  onClick={() => {
                    if (noteDraft) {
                      setNote(clampNote(noteDraft.note));
                    }
                    setReportDialog({ open: false });
                  }}
                >
                  Restore Draft
                </AlertDialogAction>
                <AlertDialogCancel
                  onClick={() => setReportDialog({ open: false })}
                >
                  Close
                </AlertDialogCancel>
              </>
            ) : (
              <AlertDialogAction
                onClick={() => setReportDialog({ open: false })}
              >
                OK
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
