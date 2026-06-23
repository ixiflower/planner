import { useEffect, useMemo, useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Calendar as CalendarIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { ArrowUpDown, ChevronUp, ChevronDown, BarChart3, TrendingUp, Users, Clock, Target, PieChart, Award, ChevronRight, Menu, X, ClipboardList, CheckSquare, MessageSquare, Plus, ArrowRight } from "lucide-react";
import { EmployeeAnalytics } from "@/components/EmployeeAnalytics";
import { AnalyticsButtons, QuickActionButtons } from "@/components/AnalyticsButtons";
import { UserReportPopup } from "@/components/UserReportPopup";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogOverlay
} from "@/components/ui/dialog";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel
} from "@/components/ui/alert-dialog";
import { RateSlider } from "@/components/rate-slider";
import { format } from "date-fns";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { BACKEND_URL } from "@/config/backend";

type UserType = "Leader" | "Mod" | "Member";

type TaskItem = { id: string; text: string; done: boolean };
type TaskItemFull = { id: string; title?: string; text: string; done: boolean };

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
};
type AssignedUserTasks = {
  userId: string;
  username: string;
  role: string;
  avatarUrl?: string;
  tasks: TaskItemFull[];
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



async function updateReportDecision(
  id: string,
  data: Partial<Pick<Report, "status" | "rating">>,
  token: string
) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: token
  };
  const url = `${BACKEND_URL}/tickets/api/reports/${encodeURIComponent(id)}/`;
  const res = await fetch(url, {
    method: "PATCH",
    headers,
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error(String(res.status));
}

export default function EmployerPage() {
  const { token } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [reports, setReports] = useState<Report[]>([]);
  const [assigned, setAssigned] = useState<AssignedUserTasks[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [rating, setRating] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [pendingDeclineId, setPendingDeclineId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<
    keyof Pick<Report, "name" | "role" | "type" | "submittedAt"> | null
  >(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const [allSubmissions, setAllSubmissions] = useState<Submission[]>([]);
  const [allSubmissionsReports, setAllSubmissionsReports] = useState<Record<string, Report>>({});
  const [submissionView, setSubmissionView] = useState<"today" | "all">("today");
  
  // Reports state
  const [allReports, setAllReports] = useState<Report[]>([]);
  const [reportView, setReportView] = useState<"today" | "all">("today");
  
  // Analytics state
  const [showAnalytics, setShowAnalytics] = useState(true);
  const [activeAnalyticsButton, setActiveAnalyticsButton] = useState<string | undefined>();
  
  // Main tab state
  const [activeTab, setActiveTab] = useState<'analyze' | 'reports' | 'submissions' | 'chat'>('analyze');
  const [selectedChatUser, setSelectedChatUser] = useState<string | null>(null);
  
  // Expanded users in tree view
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  
  // Selected user for popup
  const [selectedUserForPopup, setSelectedUserForPopup] = useState<string | null>(null);
  
  // Sidebar state
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    if (token) {
      fetchAllSubmissions(token)
        .then(({ submissions, reportMap }) => {
          setAllSubmissions(submissions);
          setAllSubmissionsReports(reportMap);
        })
        .catch(() => {
          setAllSubmissions([]);
          setAllSubmissionsReports({});
        });
      
      fetchAllReports(token)
        .then(setAllReports)
        .catch(() => setAllReports([]));
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchReportsByDate(selectedDate, token)
        .then(setReports)
        .catch(() => setReports([]));
      fetchAssignedTasksForAll(selectedDate, token)
        .then(setAssigned)
        .catch(() => setAssigned([]));
    }
  }, [selectedDate, token]);

  const today = useMemo(() => new Date(), []);
  const openReport = (id: string) => setOpenId(id);
  const closeReport = () => setOpenId(null);

  const approve = async () => {
    if (!openId || !token) return;
    try {
      await updateReportDecision(openId, { status: "approved", rating }, token);
      fetchReportsByDate(selectedDate, token)
        .then(setReports)
        .catch(() => { });
      closeReport();
      toast.success("Report approved");
    } catch {
      toast.error("Failed to approve");
    }
  };

  const decline = async () => {
    if (!pendingDeclineId || !token) return;
    try {
      await updateReportDecision(
        pendingDeclineId,
        { status: "declined", rating: undefined },
        token
      );
      fetchReportsByDate(selectedDate, token)
        .then(setReports)
        .catch(() => { });
      setPendingDeclineId(null);
      closeReport();
      toast.error("Report declined");
    } catch {
      toast.error("Failed to decline");
    }
  };

  const sortedReports = useMemo(() => {
    const arr = [...reports];
    if (!sortKey) return arr;
    return arr.sort((a, b) => {
      if (sortKey === "submittedAt") {
        const at = new Date(a.submittedAt).getTime();
        const bt = new Date(b.submittedAt).getTime();
        return sortDir === "asc" ? at - bt : bt - at;
      }
      const va = String(a[sortKey]).toLowerCase();
      const vb = String(b[sortKey]).toLowerCase();
      return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
    });
  }, [reports, sortKey, sortDir]);

  function toggleSort(
    key: keyof Pick<Report, "name" | "role" | "type" | "submittedAt">
  ) {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir(key === "submittedAt" ? "desc" : "asc");
    } else {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    }
  }

  async function fetchAssignedTasksForAll(date: Date, token: string) {
    const iso = format(date, "yyyy-MM-dd");
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: token
    };
    const url = `${BACKEND_URL}/tickets/api/assigned-tasks/?date=${encodeURIComponent(
      iso
    )}`;
    const res = await fetch(url, { method: "GET", headers });
    if (!res.ok) throw new Error(String(res.status));
    const data = await res.json();
    const items = Array.isArray(data?.items) ? (data.items as AssignedUserTasks[]) : [];
    return items.map((it) => ({
      ...it,
      tasks: Array.isArray(it.tasks) ? it.tasks : [],
    }));
  }

  async function fetchAllSubmissions(token: string) {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: token
    };
    const url = `${BACKEND_URL}/tickets/api/submissions/all/`;
    const res = await fetch(url, { method: "GET", headers });
    if (!res.ok) throw new Error(String(res.status));
    const data = await res.json();
    const submissions = Array.isArray(data?.submissions)
      ? (data.submissions as Submission[])
      : [];
    const reports = Array.isArray(data?.reports)
      ? (data.reports as Report[])
      : [];

    // Create a map of reports by userId for quick lookup
    const reportMap: Record<string, Report> = {};
    for (const r of reports) {
      reportMap[r.userId] = r;
    }

    return { submissions, reportMap };
  }

  async function fetchAllReports(token: string) {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: token
    };
    const url = `${BACKEND_URL}/tickets/api/reports/all/`;
    const res = await fetch(url, { method: "GET", headers });
    if (!res.ok) throw new Error(String(res.status));
    const data = await res.json();
    return Array.isArray(data?.reports) ? (data.reports as Report[]) : [];
  }

  // Analytics functions
  const handleAnalyticsButtonClick = (action: string) => {
    setActiveAnalyticsButton(action);
    setShowAnalytics(true);
    console.log(`Analytics action: ${action}`);
  };

  const handleQuickAction = (action: string) => {
    console.log(`Quick action: ${action}`);
    // Implement quick actions
  };

  const handleEmployeeSelect = (userId: string) => {
    console.log('Selected employee for analytics:', userId);
    // The EmployeeAnalytics component handles its own modal internally
  };

  // Toggle user expansion in tree view
  const toggleUserExpansion = (userId: string) => {
    const newExpanded = new Set(expandedUsers);
    if (newExpanded.has(userId)) {
      newExpanded.delete(userId);
    } else {
      newExpanded.add(userId);
    }
    setExpandedUsers(newExpanded);
  };

  // Group reports by user
  const reportsByUser = useMemo(() => {
    const grouped = new Map<string, Report[]>();
    reports.forEach(report => {
      const existing = grouped.get(report.userId) || [];
      grouped.set(report.userId, [...existing, report]);
    });
    return grouped;
  }, [reports]);

  // Generate mock analytics data from reports
  const generateAnalyticsData = useMemo(() => {
    const employeeMap = new Map();
    const departments = ['Engineering', 'Design', 'Marketing', 'Support', 'Product'];
    
    // Process reports to generate employee stats
    reports.forEach(report => {
      if (!employeeMap.has(report.userId)) {
        const prod = Math.floor(Math.random() * 40) + 60;
        const rating = report.rating || (Math.random() * 2 + 3);
        employeeMap.set(report.userId, {
          userId: report.userId,
          username: report.username || report.name,
          name: report.name,
          profilePicture: report.avatarUrl,
          totalHours: Math.floor(Math.random() * 5) + 35, // 35-40 hours weekly
          productivity: prod,
          tasksCompleted: report.tasks.filter(t => t.done).length || Math.floor(Math.random() * 10) + 5,
          tasksPending: Math.floor(Math.random() * 5),
          averageRating: rating,
          streak: Math.floor(Math.random() * 15) + 1,
          isActive: report.status === 'approved' || Math.random() > 0.3,
          department: departments[Math.floor(Math.random() * departments.length)],
          performanceScore: Math.floor((prod + (rating * 20)) / 2),
          recentTrends: Array.from({ length: 7 }, () => Math.floor(Math.random() * 40) + 60),
          lastActive: 'Active now'
        });
      }
    });

    // Add some mock employees if no reports
    if (employeeMap.size === 0) {
      const mockEmployees = [
        { name: 'John Doe', avatar: null },
        { name: 'Jane Smith', avatar: null },
        { name: 'Mike Johnson', avatar: null },
        { name: 'Sarah Wilson', avatar: null },
        { name: 'Alex Brown', avatar: null },
        { name: 'Emma Davis', avatar: null },
        { name: 'David Lee', avatar: null },
        { name: 'Lisa Wang', avatar: null },
        { name: 'Tom Garcia', avatar: null },
        { name: 'Amy Chen', avatar: null },
        { name: 'James Rodriguez', avatar: null },
        { name: 'Maria Lopez', avatar: null }
      ];

      mockEmployees.forEach((emp, index) => {
        const prod = Math.floor(Math.random() * 40) + 60;
        const rating = Math.random() * 2 + 3;
        employeeMap.set(`mock-${index}`, {
          userId: `mock-${index}`,
          username: emp.name.toLowerCase().replace(' ', '_'),
          name: emp.name,
          profilePicture: emp.avatar,
          totalHours: Math.floor(Math.random() * 10) + 30,
          productivity: prod,
          tasksCompleted: Math.floor(Math.random() * 12) + 4,
          tasksPending: Math.floor(Math.random() * 4),
          averageRating: rating,
          streak: Math.floor(Math.random() * 10) + 1,
          isActive: Math.random() > 0.2,
          department: departments[index % departments.length],
          performanceScore: Math.floor((prod + (rating * 20)) / 2),
          recentTrends: Array.from({ length: 7 }, () => Math.floor(Math.random() * 40) + 60),
          lastActive: Math.random() > 0.5 ? 'Active now' : '2h ago'
        });
      });
    }

    return Array.from(employeeMap.values());
  }, [reports]);

  // Calculate analytics stats
  const analyticsStats = useMemo(() => {
    const employees = generateAnalyticsData;
    return {
      activeEmployees: employees.filter(e => e.isActive).length,
      totalEmployees: employees.length,
      avgProductivity: employees.reduce((sum, e) => sum + e.productivity, 0) / employees.length || 0,
      totalTasks: employees.reduce((sum, e) => sum + e.tasksCompleted, 0),
      avgRating: employees.reduce((sum, e) => sum + e.averageRating, 0) / employees.length || 0,
      totalHours: employees.reduce((sum, e) => sum + e.totalHours, 0)
    };
  }, [generateAnalyticsData]);

  // Handler functions for approval/rejection
  const handleApprove = async (reportId: string) => {
    try {
      const authToken = localStorage.getItem('authToken');
      if (!authToken) return;
      
      await updateReportDecision(reportId, { status: 'approved' }, authToken);
      
      // Update local state
      setReports(prev => prev.map(report => 
        report.id === reportId ? { ...report, status: 'approved' } : report
      ));
      
      toast.success('Report approved successfully');
    } catch (error) {
      toast.error('Failed to approve report');
      console.error('Error approving report:', error);
    }
  };

  const handleReject = async (reportId: string) => {
    try {
      const authToken = localStorage.getItem('authToken');
      if (!authToken) return;
      
      await updateReportDecision(reportId, { status: 'declined' }, authToken);
      
      // Update local state
      setReports(prev => prev.map(report => 
        report.id === reportId ? { ...report, status: 'declined' } : report
      ));
      
      toast.error('Report rejected');
    } catch (error) {
      toast.error('Failed to reject report');
      console.error('Error rejecting report:', error);
    }
  };

  return (
    <div className="main h-[100svh] flex overflow-hidden bg-background">
      {/* Left Sidebar */}
      <div className={`transition-all duration-300 ${isSidebarOpen ? 'w-80' : 'w-0'} overflow-hidden border-r bg-muted/30`}>
        <div className="h-full p-4 space-y-6 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-lg">Filters</h3>
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
              value={activeTab}
              onValueChange={(value) => value && setActiveTab(value as 'analyze' | 'reports' | 'submissions' | 'chat')}
              className="flex flex-col items-stretch bg-muted/50 border rounded-lg p-1 gap-1"
            >
              <ToggleGroupItem 
                value="analyze" 
                className="data-[state=on]:bg-background data-[state=on]:shadow-sm justify-start px-4 h-10 gap-2"
              >
                <BarChart3 className="h-4 w-4" /> Analyze
              </ToggleGroupItem>
              <ToggleGroupItem 
                value="reports"
                className="data-[state=on]:bg-background data-[state=on]:shadow-sm justify-start px-4 h-10 gap-2"
              >
                <ClipboardList className="h-4 w-4" /> Reports
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

          {activeTab === 'chat' ? (
            <div className="flex-1 flex flex-col min-h-0 animate-in slide-in-from-right duration-300">
              <Separator className="mb-4" />
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium">Messages</h4>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto space-y-2">
                {generateAnalyticsData.map(u => (
                  <div 
                    key={u.userId} 
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                    onClick={() => setSelectedChatUser(u.userId)}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={u.profilePicture} />
                      <AvatarFallback>{u.name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{u.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{u.department}</p>
                    </div>
                    {u.isActive && (
                      <Badge variant="secondary" className="text-[10px] px-1 h-4">
                        Active
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
              {selectedChatUser && (
                <div className="mt-4 p-3 border rounded-lg bg-background">
                  <div className="flex items-center gap-2 mb-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback>{generateAnalyticsData.find(u => u.userId === selectedChatUser)?.name[0]}</AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium">{generateAnalyticsData.find(u => u.userId === selectedChatUser)?.name}</span>
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
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    className="rounded-md border mx-auto"
                  />
                </div>
                <Button
                  variant="outline"
                  className="w-full mt-2"
                  onClick={() => setSelectedDate(today)}
                >
                  Jump to Today
                </Button>
              </div>

              {/* Additional filters can go here */}
              <Separator />
              <div className="space-y-2">
                <label className="text-sm font-medium">Quick Stats</label>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Reports:</span>
                    <span className="font-medium">{reports.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Pending:</span>
                    <span className="font-medium text-yellow-600">
                      {reports.filter(r => !r.status || r.status === 'pending').length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Approved:</span>
                    <span className="font-medium text-green-600">
                      {reports.filter(r => r.status === 'approved').length}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col p-4 pb-24 gap-4 overflow-hidden">
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
            <h1 className="text-2xl font-bold">Employer Dashboard</h1>
            <Badge variant="outline" className="ml-2">Manager View</Badge>
          </div>
        </div>

        {/* Main Content Window */}
        <Card className="flex-1 overflow-hidden">
        <CardContent className="p-6 h-full overflow-hidden">
          <ScrollArea className="h-full">
            {/* Analyze Tab */}
            {activeTab === 'analyze' && (
              <div className="space-y-6">
                <EmployeeAnalytics 
                  employees={generateAnalyticsData}
                  onEmployeeSelect={handleEmployeeSelect}
                />
              </div>
            )}

            {/* Reports Tab */}
            {activeTab === 'reports' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-bold">Reports</h2>
                    <p className="text-sm text-muted-foreground">
                      {reportView === "today" 
                        ? `Reports for ${format(selectedDate, "MMMM dd, yyyy")}`
                        : "All reports from all dates"
                      }
                    </p>
                  </div>
                  <ToggleGroup
                    type="single"
                    value={reportView}
                    onValueChange={(value) => value && setReportView(value as "today" | "all")}
                    className="bg-background border rounded-lg"
                  >
                    <ToggleGroupItem 
                      value="today" 
                      className="data-[state=on]:bg-foreground data-[state=on]:text-background"
                    >
                      Today
                    </ToggleGroupItem>
                    <ToggleGroupItem 
                      value="all"
                      className="data-[state=on]:bg-foreground data-[state=on]:text-background"
                    >
                      All
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        {reportView === "today" && (
                          <button
                            className="inline-flex items-center gap-1"
                            onClick={() => toggleSort("name")}
                          >
                            User
                            {sortKey === "name" ? (
                              sortDir === "asc" ? (
                                <ChevronUp className="size-4" />
                              ) : (
                                <ChevronDown className="size-4" />
                              )
                            ) : (
                              <ArrowUpDown className="size-4 opacity-60" />
                            )}
                          </button>
                        )}
                        {reportView === "all" && "User"}
                      </TableHead>
                      <TableHead>Tasks</TableHead>
                      <TableHead>Note</TableHead>
                      <TableHead>
                        {reportView === "today" && (
                          <button
                            className="inline-flex items-center gap-1"
                            onClick={() => toggleSort("submittedAt")}
                          >
                            Submitted
                            {sortKey === "submittedAt" ? (
                              sortDir === "asc" ? (
                                <ChevronUp className="size-4" />
                              ) : (
                                <ChevronDown className="size-4" />
                              )
                            ) : (
                              <ArrowUpDown className="size-4 opacity-60" />
                            )}
                          </button>
                        )}
                        {reportView === "all" && "Date"}
                      </TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportView === "today" && sortedReports.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="flex items-center gap-2">
                          <Avatar>
                            {r.avatarUrl && (
                              <AvatarImage src={r.avatarUrl} alt={r.name} />
                            )}
                            <AvatarFallback>
                              {r.name
                                .split(" ")
                                .map((p) => p[0])
                                .join("")}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{r.name}</span>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {r.tasks.filter(t => t.done).length}/{r.tasks.length} completed
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[400px] truncate">
                          {r.noteType === "voice" ? (
                            <Badge variant="secondary">Voice</Badge>
                          ) : (
                            r.note || "No note"
                          )}
                        </TableCell>
                        <TableCell>
                          {format(
                            new Date(r.submittedAt),
                            "yyyy-MM-dd HH:mm"
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              r.status === "declined"
                                ? "destructive"
                                : "secondary"
                            }
                            className={
                              r.status === "approved"
                                ? [
                                  "bg-red-100 text-red-700",
                                  "bg-orange-100 text-orange-700",
                                  "bg-amber-100 text-amber-700",
                                  "bg-lime-100 text-lime-700",
                                  "bg-green-100 text-green-700"
                                ][
                                Math.min(5, Math.max(1, r.rating || 5)) -
                                1
                                ]
                                : undefined
                            }
                          >
                            {r.status || "pending"}
                            {r.status === "approved" && r.rating
                              ? ` • ${r.rating}`
                              : ""}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setRating((r.rating ?? 3) as 1 | 2 | 3 | 4 | 5);
                              openReport(r.id);
                            }}
                          >
                            Open
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    
                    {reportView === "all" && allReports.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="flex items-center gap-2">
                          <Avatar>
                            {r.avatarUrl && (
                              <AvatarImage src={r.avatarUrl} alt={r.name} />
                            )}
                            <AvatarFallback>
                              {r.name
                                .split(" ")
                                .map((p) => p[0])
                                .join("")}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{r.name}</span>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {r.tasks.filter(t => t.done).length}/{r.tasks.length} completed
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[400px] truncate">
                          {r.noteType === "voice" ? (
                            <Badge variant="secondary">Voice</Badge>
                          ) : (
                            r.note || "No note"
                          )}
                        </TableCell>
                        <TableCell>
                          {format(
                            new Date(r.submittedAt),
                            "yyyy-MM-dd HH:mm"
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              r.status === "declined"
                                ? "destructive"
                                : "secondary"
                            }
                            className={
                              r.status === "approved"
                                ? [
                                  "bg-red-100 text-red-700",
                                  "bg-orange-100 text-orange-700",
                                  "bg-amber-100 text-amber-700",
                                  "bg-lime-100 text-lime-700",
                                  "bg-green-100 text-green-700"
                                ][
                                Math.min(5, Math.max(1, r.rating || 5)) -
                                1
                                ]
                                : undefined
                            }
                          >
                            {r.status || "pending"}
                            {r.status === "approved" && r.rating
                              ? ` • ${r.rating}`
                              : ""}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setRating((r.rating ?? 3) as 1 | 2 | 3 | 4 | 5);
                              openReport(r.id);
                            }}
                          >
                            Open
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    
                    {reportView === "today" && reports.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="text-muted-foreground text-center"
                        >
                          No reports for today
                        </TableCell>
                      </TableRow>
                    )}
                    
                    {reportView === "all" && allReports.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="text-muted-foreground text-center"
                        >
                          No reports
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Submissions Tab */}
            {activeTab === 'submissions' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-bold">Submissions</h2>
                    <p className="text-sm text-muted-foreground">
                      {submissionView === "today" 
                        ? `Who submitted reports on ${format(selectedDate, "yyyy-MM-dd")}`
                        : "All submissions from all dates"
                      }
                    </p>
                  </div>
                  <ToggleGroup
                    type="single"
                    value={submissionView}
                    onValueChange={(value) => value && setSubmissionView(value as "today" | "all")}
                    className="bg-background border rounded-lg"
                  >
                    <ToggleGroupItem 
                      value="today" 
                      className="data-[state=on]:bg-foreground data-[state=on]:text-background"
                    >
                      Today
                    </ToggleGroupItem>
                    <ToggleGroupItem 
                      value="all"
                      className="data-[state=on]:bg-foreground data-[state=on]:text-background"
                    >
                      All
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>
                          {submissionView === "today" && (
                            <button
                              className="inline-flex items-center gap-1"
                              onClick={() => toggleSort("name")}
                            >
                              User
                              {sortKey === "name" ? (
                                sortDir === "asc" ? (
                                  <ChevronUp className="size-4" />
                                ) : (
                                  <ChevronDown className="size-4" />
                                )
                              ) : (
                                <ArrowUpDown className="size-4 opacity-60" />
                              )}
                            </button>
                          )}
                          {submissionView === "all" && "User"}
                        </TableHead>
                        <TableHead>Report</TableHead>
                        <TableHead>
                          {submissionView === "today" && (
                            <button
                              className="inline-flex items-center gap-1"
                              onClick={() => toggleSort("submittedAt")}
                            >
                              Submitted
                              {sortKey === "submittedAt" ? (
                                sortDir === "asc" ? (
                                  <ChevronUp className="size-4" />
                                ) : (
                                  <ChevronDown className="size-4" />
                                )
                              ) : (
                                <ArrowUpDown className="size-4 opacity-60" />
                              )}
                            </button>
                          )}
                          {submissionView === "all" && "Date"}
                        </TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {submissionView === "today" && sortedReports.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className="flex items-center gap-2">
                            <Avatar>
                              {r.avatarUrl && (
                                <AvatarImage src={r.avatarUrl} alt={r.name} />
                              )}
                              <AvatarFallback>
                                {r.name
                                  .split(" ")
                                  .map((p) => p[0])
                                  .join("")}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{r.name}</span>
                          </TableCell>
                          <TableCell className="max-w-[400px] truncate">
                            {r.noteType === "voice" ? (
                              <Badge variant="secondary">Voice</Badge>
                            ) : (
                              r.note
                            )}
                          </TableCell>
                          <TableCell>
                            {format(
                              new Date(r.submittedAt),
                              "yyyy-MM-dd HH:mm"
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                r.status === "declined"
                                  ? "destructive"
                                  : "secondary"
                              }
                              className={
                                r.status === "approved"
                                  ? [
                                    "bg-red-100 text-red-700",
                                    "bg-orange-100 text-orange-700",
                                    "bg-amber-100 text-amber-700",
                                    "bg-lime-100 text-lime-700",
                                    "bg-green-100 text-green-700"
                                  ][
                                  Math.min(5, Math.max(1, r.rating || 5)) -
                                  1
                                  ]
                                  : undefined
                              }
                            >
                              {r.status || "pending"}
                              {r.status === "approved" && r.rating
                                ? ` • ${r.rating}`
                                : ""}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setRating((r.rating ?? 3) as 1 | 2 | 3 | 4 | 5);
                                openReport(r.id);
                              }}
                            >
                              Open
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      
                      {submissionView === "all" && allSubmissions.map((s) => {
                        const r = allSubmissionsReports[s.userId];
                        const status = r?.status || "pending";
                        const ratingVal = r?.rating ?? s.rating;
                        return (
                          <TableRow key={s.id}>
                            <TableCell className="flex items-center gap-2">
                              <Avatar>
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
                              {format(
                                new Date(s.created_at),
                                "yyyy-MM-dd HH:mm"
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  status === "declined"
                                    ? "destructive"
                                    : "secondary"
                                }
                                className={
                                  status === "approved"
                                    ? [
                                      "bg-red-100 text-red-700",
                                      "bg-orange-100 text-orange-700",
                                      "bg-amber-100 text-amber-700",
                                      "bg-lime-100 text-lime-700",
                                      "bg-green-100 text-green-700"
                                    ][
                                    Math.min(
                                      5,
                                      Math.max(1, ratingVal || 5)
                                    ) - 1
                                    ]
                                    : undefined
                                }
                              >
                                {status}
                                {status === "approved" && ratingVal
                                  ? ` • ${ratingVal}`
                                  : ""}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={!r?.id}
                                onClick={() => {
                                  const seed = (ratingVal ?? 3) as
                                    | 1
                                    | 2
                                    | 3
                                    | 4
                                    | 5;
                                  setRating(seed);
                                  if (r?.id) openReport(r.id);
                                }}
                              >
                                Open
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      
                      {submissionView === "today" && reports.length === 0 && (
                        <TableRow>
                          <TableCell
                            colSpan={5}
                            className="text-muted-foreground"
                          >
                            No submissions for today
                          </TableCell>
                        </TableRow>
                      )}
                      
                      {submissionView === "all" && allSubmissions.length === 0 && (
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
            )}
          </ScrollArea>
        </CardContent>
        </Card>

        {/* User Report Popup */}
        <UserReportPopup
          userId={selectedUserForPopup}
          reports={reports}
          onClose={() => setSelectedUserForPopup(null)}
          onApprove={handleApprove}
          onReject={handleReject}
          onRate={(userId, rating) => {
            // Handle rating submission
            console.log(`Rating ${userId}: ${rating} stars`);
            toast.success(`Rating submitted: ${rating} stars`);
          }}
          onSendMessage={(userId) => {
            setSelectedChatUser(userId);
            setActiveTab('chat');
            setIsSidebarOpen(true);
            setSelectedUserForPopup(null);
          }}
        />
      </div>
    </div>
  );
}
