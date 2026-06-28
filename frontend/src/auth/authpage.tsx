import { useState, useRef, useEffect } from "react";
import { MoreVertical, LogOut, Trash2, RefreshCw, Play, Pause, Download, Upload, CloudUpload, CloudDownload, Settings, Plus, ExternalLink, ChevronDown, ChevronRight, Users, LogIn, UsersRound, Clock, CheckCircle, Share2, User, Mail, Shield, MessageSquare, LayoutGrid, Hash, Activity, Code, CalendarDays, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Edit3, Check, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { BACKEND_URL } from "@/config/backend";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface FormData {
  name?: string;
  email: string;
  password: string;
  password2?: string;
  username?: string;
}

interface UnassignedUser {
  id: string;
  name?: string;
  email: string;
  username: string;
  profile_picture?: string;
}

interface TelegramData {
  is_active: boolean;
  bot_name: string;
  api_token: string;
  send_log?: boolean;
  send_report?: boolean;
  send_tasks?: boolean;
  send_dollar_price?: boolean;
  send_gold_price?: boolean;
  dollar_price_cmd?: string;
  gold_price_cmd?: string;
  bot_status?: "start" | "restart" | "pause" | "idle";
  is_ixi_bot?: boolean;
  sae_data_enabled?: boolean;
  sae_automation_interval?: number;
  google_sheets_auto_sync_enabled?: boolean;
  google_sheets_sync_interval?: number;
}

interface TelegramBotItem {
  id: number;
  bot_name: string;
  is_active: boolean;
  owner: string;
  owner_id: string;
  api_token?: string;
}

import { API_BASE_URL } from "@/config/backend";
import SimpleWorkHours from "@/components/SimpleWorkHours";

export default function AuthPage() {
  const defaultAvatar = "/src/assets/defult.jpg";
  const [isSignIn, setIsSignIn] = useState(true);
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    password: "",
    password2: "",
    username: ""
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState("");
  const [updatingName, setUpdatingName] = useState(false);
  const [editingEmail, setEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [updatingEmail, setUpdatingEmail] = useState(false);
  const [editingBio, setEditingBio] = useState(false);
  const [newBio, setNewBio] = useState("");
  const [updatingBio, setUpdatingBio] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const navigate = useNavigate();
  const { user, isAuthenticated, login, logout, updateUser, token, refreshUser } = useAuth();
  const [telegramId, setTelegramId] = useState<string>("");
  const [telegramBotApi, setTelegramBotApi] = useState<string>("");
  const [unassignedUsers, setUnassignedUsers] = useState<UnassignedUser[]>([]);
  const [loadingUnassigned, setLoadingUnassigned] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<Record<string, string>>({});
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [autoHideNavbar, setAutoHideNavbar] = useState(false);
  // Developer-only: control which pages appear in Navbar
  const [devNavPages, setDevNavPages] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem('dev_nav_visible_pages');
      const arr = raw ? JSON.parse(raw) : null;
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem('dev_nav_visible_pages', JSON.stringify(devNavPages));
    } catch {}
  }, [devNavPages]);

  const [groupToDelete, setGroupToDelete] = useState<{ id: number, name: string } | null>(null);
  const [showDeleteSubmissionsConfirm, setShowDeleteSubmissionsConfirm] = useState(false);
  const [isDeletingGroup, setIsDeletingGroup] = useState(false);

  
  // Submissions management
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [selectedSubmissions, setSelectedSubmissions] = useState<Set<number>>(new Set());
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [deletingSubmissions, setDeletingSubmissions] = useState(false);

  // Tasks management
  const [tasks, setTasks] = useState<any[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());

  // Telegram bot state
  const [telegramData, setTelegramData] = useState<TelegramData>({
    is_active: false,
    bot_name: "",
    api_token: "",
    send_log: false,
    send_report: false,
    send_tasks: false,
    send_dollar_price: false,
    send_gold_price: false,
    dollar_price_cmd: "/dollar",
    gold_price_cmd: "/gold",
    is_ixi_bot: false,
  });
  const [savingTelegram, setSavingTelegram] = useState(false);
  const [telegramBots, setTelegramBots] = useState<TelegramBotItem[]>([]);
  const [botStatus, setBotStatus] = useState<"start" | "restart" | "pause" | "idle">("idle");
  const [botToDelete, setBotToDelete] = useState<TelegramBotItem | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isManualSync, setIsManualSync] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isUploadingToSheets, setIsUploadingToSheets] = useState(false);
  const [isDownloadingFromSheets, setIsDownloadingFromSheets] = useState(false);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);
  const [syncInterval, setSyncInterval] = useState(10); // hours
  const [lastSyncTime, setLastSyncTime] = useState<string>("");
  const [uploadUsers, setUploadUsers] = useState(true);
  const [uploadSubmissions, setUploadSubmissions] = useState(true);
  const [uploadReports, setUploadReports] = useState(true);
  const [saeDataOnTelegram, setSaeDataOnTelegram] = useState(false);
  const [saeAutomationHours, setSaeAutomationHours] = useState(5);
  
  const dbFileInputRef = useRef<HTMLInputElement | null>(null);

  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [manageUsersOpen, setManageUsersOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<any | null>(null);
  const [isDeleteUserDialogOpen, setIsDeleteUserDialogOpen] = useState(false);

  // Groups state
  const [groupName, setGroupName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [isJoiningGroup, setIsJoiningGroup] = useState(false);
  const [userGroups, setUserGroups] = useState<any[]>([]);

  // Services state for developers
  interface Service {
    id: string;
    name: string;
    url: string;
    status: "running" | "stopped" | "unknown";
  }
  const [services, setServices] = useState<Service[]>([]);
  const [isAddServiceOpen, setIsAddServiceOpen] = useState(false);
  const [newServiceName, setNewServiceName] = useState("");
  const [newServiceUrl, setNewServiceUrl] = useState("");
  const [editingService, setEditingService] = useState<string | null>(null);
  const [editServiceName, setEditServiceName] = useState("");
  const [editServiceUrl, setEditServiceUrl] = useState("");
  const [loadingServices, setLoadingServices] = useState(false);

  const fetchServices = async () => {
    if (!token) return;
    setLoadingServices(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/structure/services/`, {
        headers: {
          'Authorization': token,
          'Content-Type': 'application/json',
        }
      });
      if (response.ok) {
        const data = await response.json();
        setServices(data);
      }
    } catch (error) {
      console.error("Failed to fetch services:", error);
    } finally {
      setLoadingServices(false);
    }
  };

  useEffect(() => {
    if (token && user?.developer) {
      void fetchServices();
    }
  }, [token, user?.developer]);

  const addService = async () => {
    if (!newServiceName.trim() || !newServiceUrl.trim() || !token) return;
    try {
      const response = await fetch(`${BACKEND_URL}/api/structure/services/`, {
        method: 'POST',
        headers: {
          'Authorization': token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newServiceName.trim(),
          url: newServiceUrl.trim(),
          status: "unknown",
        }),
      });
      if (response.ok) {
        const newService = await response.json();
        setServices([...services, newService]);
        setNewServiceName("");
        setNewServiceUrl("");
        setIsAddServiceOpen(false);
      }
    } catch (error) {
      console.error("Failed to add service:", error);
    }
  };

  const removeService = async (id: string) => {
    if (!token) return;
    try {
      const response = await fetch(`${BACKEND_URL}/api/structure/services/${id}/`, {
        method: 'DELETE',
        headers: {
          'Authorization': token,
        },
      });
      if (response.ok) {
        setServices(services.filter(s => s.id !== id));
      }
    } catch (error) {
      console.error("Failed to remove service:", error);
    }
  };

  const startEditService = (service: Service) => {
    setEditingService(service.id);
    setEditServiceName(service.name);
    setEditServiceUrl(service.url);
  };

  const cancelEditService = () => {
    setEditingService(null);
    setEditServiceName("");
    setEditServiceUrl("");
  };

  const updateService = async () => {
    if (!editServiceName.trim() || !editServiceUrl.trim() || !editingService || !token) return;
    try {
      const response = await fetch(`${BACKEND_URL}/api/structure/services/${editingService}/`, {
        method: 'PATCH',
        headers: {
          'Authorization': token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editServiceName.trim(),
          url: editServiceUrl.trim(),
        }),
      });
      if (response.ok) {
        const updatedService = await response.json();
        setServices(services.map(s => s.id === editingService ? updatedService : s));
        setEditingService(null);
        setEditServiceName("");
        setEditServiceUrl("");
      }
    } catch (error) {
      console.error("Failed to update service:", error);
    }
  };

  const checkServiceStatus = async (url: string): Promise<"running" | "stopped" | "unknown"> => {
    try {
      const response = await fetch(url, { method: "HEAD", mode: "no-cors" });
      return response.ok || response.type === "opaque" ? "running" : "stopped";
    } catch {
      return "stopped";
    }
  };

  const refreshServicesStatus = async () => {
    setLoadingServices(true);
    const updated = await Promise.all(
      services.map(async (s) => ({
        ...s,
        status: await checkServiceStatus(s.url),
      }))
    );
    setServices(updated);
    setLoadingServices(false);
  };

  const [groupTab, setGroupTab] = useState<'create' | 'pending' | 'all'>('create');
  interface Group {
    id: number;
    name: string;
    description: string;
    owner_username: string;
    status: 'pending' | 'approved' | 'rejected';
    join_code: string;
    members_count: number;
    members_detail?: { id: string, username: string, name: string, profile_picture: string, team_role: string }[];
    is_public: boolean;
    created_at: string;
    updated_at: string;
  }
  const [allGroups, setAllGroups] = useState<Group[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [sharingGroup, setSharingGroup] = useState<{ name: string, code: string } | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [isGroupDetailOpen, setIsGroupDetailOpen] = useState(false);

  const fetchAllGroups = async () => {
    if (!token || !user) return;
    setLoadingGroups(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/structure/groups/`, {
        headers: {
          'Authorization': token,
          'Content-Type': 'application/json',
        }
      });
      if (response.ok) {
        const data = await response.json();
        setAllGroups(data);
      }
    } catch (error) {
      console.error("Failed to fetch groups:", error);
    } finally {
      setLoadingGroups(false);
    }
  };

  useEffect(() => {
    if (token && user) {
      void fetchAllGroups();
    }
  }, [token, user]);

  const approveGroup = async (id: number) => {
    if (!token) return;
    try {
      const response = await fetch(`${BACKEND_URL}/api/structure/groups/${id}/approve/`, {
        method: 'POST',
        headers: { 'Authorization': token }
      });
      if (response.ok) {
        void fetchAllGroups();
      }
    } catch (error) {
      console.error("Failed to approve group:", error);
    }
  };

  const rejectGroup = async (id: number) => {
    if (!token) return;
    try {
      const response = await fetch(`${BACKEND_URL}/api/structure/groups/${id}/reject/`, {
        method: 'POST',
        headers: { 'Authorization': token }
      });
      if (response.ok) {
        void fetchAllGroups();
      }
    } catch (error) {
      console.error("Failed to reject group:", error);
    }
  };

  const leaveGroup = async (id: number) => {
    if (!token) return;
    try {
      const response = await fetch(`${BACKEND_URL}/api/structure/groups/${id}/leave/`, {
        method: 'POST',
        headers: { 'Authorization': token }
      });
      if (response.ok) {
        void fetchAllGroups();
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to leave group");
      }
    } catch (error) {
      console.error("Failed to leave group:", error);
      toast.error("An error occurred while leaving group");
    }
  };

  const deleteGroup = (id: number, name: string) => {
    setGroupToDelete({ id, name });
  };

  const confirmDeleteGroup = async () => {
    if (!token || !groupToDelete) return;
    setIsDeletingGroup(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/structure/groups/${groupToDelete.id}/`, {
        method: 'DELETE',
        headers: { 'Authorization': token }
      });
      if (response.ok) {
        void fetchAllGroups();
        toast.success(`Group "${groupToDelete.name}" deleted successfully`);
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to delete group");
      }
    } catch (error) {
      console.error("Failed to delete group:", error);
      toast.error("An error occurred while deleting group");
    } finally {
      setIsDeletingGroup(false);
      setGroupToDelete(null);
    }
  };

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      let authToken = localStorage.getItem("authToken") || token || "";
      if (authToken && !authToken.startsWith("Token ")) authToken = `Token ${authToken}`;
      
      const response = await fetch(`${BACKEND_URL}/api/team/`, {
        headers: {
          Authorization: authToken,
          "Content-Type": "application/json"
        }
      });

      if (response.ok) {
        const data = await response.json();
        const sortedUsers = (data.users || []).sort((a: any, b: any) => {
          const getPriority = (user: any) => {
            if (user.developer) return 0;
            const role = user.role || user.team_role;
            if (role === 'Leader') return 1;
            if (role === 'Mod') return 2;
            if (role === 'Member') return 3;
            return 4;
          };
          return getPriority(a) - getPriority(b);
        });
        setUsers(sortedUsers);
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
      setError("Failed to fetch users");
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    
    try {
      let authToken = localStorage.getItem("authToken") || token || "";
      if (authToken && !authToken.startsWith("Token ")) authToken = `Token ${authToken}`;
      
      const response = await fetch(`${BACKEND_URL}/api/users/delete/${userToDelete.id}/`, {
        method: "DELETE",
        headers: {
          Authorization: authToken,
        },
      });

      if (response.ok) {
        setUsers(prev => prev.filter(u => u.id !== userToDelete.id));
        toast.success("User deleted successfully");
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to delete user");
      }
    } catch (error) {
      console.error("Failed to delete user:", error);
      toast.error("An error occurred while deleting user");
    } finally {
      setIsDeleteUserDialogOpen(false);
      setUserToDelete(null);
    }
  };

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedTheme = (localStorage.getItem("theme") as "light" | "dark" | null) || "dark";
    setTheme(savedTheme);
    document.documentElement.classList.toggle("dark", savedTheme === "dark");
    
    const savedAutoHide = localStorage.getItem("autoHideNavbar") === "true";
    setAutoHideNavbar(savedAutoHide);
    
    // Apply auto-hide class to navbar if enabled
    if (savedAutoHide) {
      const navbar = document.querySelector('nav');
      if (navbar) {
        navbar.classList.add('auto-hide-navbar');
      }
    }

    // Fetch submissions and tasks if user is developer
    if (user?.developer) {
      void fetchSubmissions();
      void fetchAllUsersTasks();
    }
  }, [user?.developer]); // Re-run if developer status changes

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
  };

  const toggleAutoHideNavbar = () => {
    const newValue = !autoHideNavbar;
    setAutoHideNavbar(newValue);
    localStorage.setItem("autoHideNavbar", String(newValue));
    
    // Apply/remove the auto-hide class to navbar
    const navbar = document.querySelector('nav');
    if (navbar) {
      if (newValue) {
        navbar.classList.add('auto-hide-navbar');
      } else {
        navbar.classList.remove('auto-hide-navbar');
      }
    }
  };

  // Fetch submissions - fetch from multiple recent dates to get all submissions
  const fetchSubmissions = async () => {
    if (!token) {
      toast.error("Please log in to view submissions");
      return;
    }
    
    setLoadingSubmissions(true);
    try {
      // Fetch submissions from the last 30 days
      const allSubmissions: any[] = [];
      const today = new Date();
      
      for (let i = 0; i < 30; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const response = await fetch(`${BACKEND_URL}/tickets/api/submissions/?date=${dateStr}`, {
          headers: {
            Authorization: token,
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.submissions && data.submissions.length > 0) {
            allSubmissions.push(...data.submissions);
          }
        }
      }
      
      // Remove duplicates by id
      const uniqueSubmissions = Array.from(
        new Map(allSubmissions.map(s => [s.id, s])).values()
      );
      
      setSubmissions(uniqueSubmissions);
    } catch (error) {
      console.error("Error fetching submissions:", error);
    } finally {
      setLoadingSubmissions(false);
    }
  };

  // Delete selected submissions
  const deleteSelectedSubmissions = () => {
    if (selectedSubmissions.size === 0) return;
    setShowDeleteSubmissionsConfirm(true);
  };

  const confirmDeleteSubmissions = async () => {
    if (!token) {
      toast.error("Please log in to delete submissions");
      return;
    }
    
    setShowDeleteSubmissionsConfirm(false);
    setDeletingSubmissions(true);
    try {
      const deletePromises = Array.from(selectedSubmissions).map(id =>
        fetch(`${BACKEND_URL}/tickets/api/submissions/${id}/`, {
          method: "DELETE",
          headers: {
            Authorization: token,
          },
        })
      );
      
      await Promise.all(deletePromises);
      setSelectedSubmissions(new Set());
      await fetchSubmissions();
      toast.success(`Successfully deleted ${deletePromises.length} submission(s)`);
    } catch (error) {
      console.error("Error deleting submissions:", error);
      toast.error("Error deleting some submissions");
    } finally {
      setDeletingSubmissions(false);
    }
  };

  // Fetch assigned tasks (developer view)
  const fetchTasks = async () => {
    if (!token) {
      toast.error("Please log in to view tasks");
      return;
    }

    setLoadingTasks(true);
    try {
      const dateStr = new Date().toISOString().slice(0, 10);
      const response = await fetch(`${API_BASE_URL}/assigned-tasks/?date=${dateStr}`, {
        headers: {
          Authorization: token,
        },
      });

      if (response.ok) {
        const data = await response.json();
        // Normalize to a flat array of tasks with username
        const normalized: any[] = [];
        const items = data.items || [];
        for (const item of items) {
          if (Array.isArray(item.tasks)) {
            for (const t of item.tasks) {
              normalized.push({
                id: t.id,
                username: item.username,
                title: t.title,
                text: t.text,
                done: t.done,
                date: data.date || dateStr,
              });
            }
          } else if (item.task) {
            const t = item.task;
            normalized.push({
              id: t.id,
              username: item.username,
              title: t.title,
              text: t.text,
              done: t.done,
              date: data.date || dateStr,
            });
          }
        }
        setTasks(normalized);
      } else {
        const errorData = await response.json();
        console.error("Error fetching tasks:", errorData.error);
        toast.error(`Error fetching tasks: ${errorData.error}`);
      }
    } catch (error) {
      console.error("Error fetching tasks:", error);
      toast.error("Error fetching tasks.");
    } finally {
      setLoadingTasks(false);
    }
  };

  // Fetch all users' assigned tasks (developer or leader/mod view)
  const fetchAllUsersTasks = async () => {
    if (!token) {
      toast.error("Please log in to view tasks");
      return;
    }

    void fetchUsers();
    setLoadingTasks(true);
    try {
      const dateStr = new Date().toISOString().slice(0, 10);
      const response = await fetch(`${API_BASE_URL}/assigned-tasks/?date=${dateStr}`, {
        headers: {
          Authorization: token,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const items = data.items || [];
        // Flatten into table rows compatible with the existing UI
        const normalized: any[] = [];
        for (const item of items) {
          if (Array.isArray(item.tasks)) {
            for (const t of item.tasks) {
              normalized.push({
                id: t.id,
                username: item.username,
                title: t.title,
                text: t.text,
                done: t.done,
                date: data.date || dateStr,
              });
            }
          } else if (item.task) {
            const t = item.task;
            normalized.push({
              id: t.id,
              username: item.username,
              title: t.title,
              text: t.text,
              done: t.done,
              date: data.date || dateStr,
            });
          }
        }
        setTasks(normalized);
      } else {
        const errorData = await response.json();
        console.error("Error fetching all users tasks:", errorData.error);
        toast.error(`Error fetching all users tasks: ${errorData.error}`);
      }
    } catch (error) {
      console.error("Error fetching all users tasks:", error);
      toast.error("Error fetching all users tasks.");
    } finally {
      setLoadingTasks(false);
    }
  };

  // Toggle submission selection
  const toggleSubmissionSelection = (id: number) => {
    const newSelected = new Set(selectedSubmissions);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedSubmissions(newSelected);
  };

  const handleNameUpdate = async () => {
    if (!newName.trim()) {
      setError("Name cannot be empty");
      return;
    }

    setUpdatingName(true);
    setError(null);

    try {
      let authToken = localStorage.getItem("authToken") || token || '';
      if (authToken && !authToken.startsWith('Token ')) authToken = `Token ${authToken}`;
      const res = await fetch(`${BACKEND_URL}/api/auth/update-profile/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": authToken,
        },
        credentials: "include",
        body: JSON.stringify({ name: newName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || "Failed to update name");
      if (data.user && user) {
        updateUser({ ...user, name: data.user.name });
      }
      await refreshUser();

      setEditingName(false);
      setNewName("");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update name";
      setError(message);
    } finally {
      setUpdatingName(false);
    }
  };

  const handleEmailUpdate = async () => {
    if (!newEmail.trim()) {
      setError("Email cannot be empty");
      return;
    }

    setUpdatingEmail(true);
    setError(null);

    try {
      let authToken = localStorage.getItem("authToken") || token || '';
      if (authToken && !authToken.startsWith('Token ')) authToken = `Token ${authToken}`;
      const res = await fetch(`${BACKEND_URL}/api/auth/update-profile/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": authToken,
        },
        credentials: "include",
        body: JSON.stringify({ email: newEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || "Failed to update email");
      if (data.user && user) {
        updateUser({ ...user, email: data.user.email });
        toast.success("Email updated successfully");
      }
      await refreshUser();

      setEditingEmail(false);
      setNewEmail("");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update email";
      setError(message);
    } finally {
      setUpdatingEmail(false);
    }
  };

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setAvatarFile(file);
    setError(null);
  };

  const handleAvatarUpload = async () => {
    if (!avatarFile) return;
    setUploadingAvatar(true);
    setError(null);
    try {
      let authToken = localStorage.getItem("authToken") || token || '';
      if (authToken && !authToken.startsWith('Token ')) authToken = `Token ${authToken}`;
      const form = new FormData();
      form.append("profile_picture", avatarFile);
      const res = await fetch(`${BACKEND_URL}/api/auth/update-profile/`, {
        method: "POST",
        headers: {
          "Authorization": authToken,
        },
        body: form,
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || "Failed to upload avatar");
      const returnedUser = data.user;
      if (returnedUser && user) {
        const updated = {
          ...user,
          profile_picture: returnedUser.profile_picture || returnedUser.profile_picture_url || user.profile_picture,
        };
        updateUser(updated);
      }
      setAvatarFile(null);
      setAvatarPreview(null);
      await refreshUser();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to upload avatar";
      setError(message);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleTelegramSave = async () => {
    setError(null);
    try {
      let authToken = localStorage.getItem("authToken") || token || '';
      if (authToken && !authToken.startsWith('Token ')) authToken = `Token ${authToken}`;
      const res = await fetch(`${BACKEND_URL}/api/auth/update-profile/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": authToken,
        },
        body: JSON.stringify({ telegram_id: telegramId }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || "Failed to save Telegram ID");
      if (data.user && user) {
        updateUser({ ...user, telegram_id: data.user.telegram_id });
      }
      await refreshUser();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save Telegram ID";
      setError(message);
    }
  };

  const handleBioUpdate = async () => {
    setUpdatingBio(true);
    setError(null);

    try {
      let authToken = localStorage.getItem("authToken") || token || '';
      if (authToken && !authToken.startsWith('Token ')) authToken = `Token ${authToken}`;
      const res = await fetch(`${BACKEND_URL}/api/auth/update-profile/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": authToken,
        },
        credentials: "include",
        body: JSON.stringify({ bio: newBio }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || "Failed to update bio");
      if (data.user && user) {
        updateUser({ ...user, bio: data.user.bio });
        toast.success("Bio updated successfully");
      }
      await refreshUser();

      setEditingBio(false);
      setNewBio("");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update bio";
      setError(message);
    } finally {
      setUpdatingBio(false);
    }
  };

  const postTelegramUpdate = async (partial: Partial<TelegramData>) => {
    try {
      let authToken = localStorage.getItem("authToken") || token || '';
      if (authToken && !authToken.startsWith('Token ')) authToken = `Token ${authToken}`;
      const res = await fetch(`${BACKEND_URL}/tickets/api/telegram/update/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": authToken,
        },
        body: JSON.stringify(partial),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update Telegram settings");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update Telegram settings";
      setError(message);
    }
  };

  const assignRole = async (userId: string) => {
    const role = selectedRoles[userId];
    if (!role) {
      toast.warning("Please select a role first");
      return;
    }

    try {
      let authToken = localStorage.getItem("authToken") || token || '';
      if (authToken && !authToken.startsWith('Token ')) authToken = `Token ${authToken}`;
      const res = await fetch(`${BACKEND_URL}/api/auth/assign-role/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": authToken,
        },
        body: JSON.stringify({ user_id: userId, role }),
        credentials: "include",
      });
      
      if (!res.ok) throw new Error("Failed to assign role");
      
      toast.success("Role assigned successfully");
      // Refresh the unassigned users list
      // You may want to call a function here to refresh the list
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to assign role";
      toast.error(message);
    }
  };

  const maskToken = (t?: string) => {
    const token = (t || "").trim();
    if (!token) return "<empty>";
    const start = token.slice(0, 6);
    const end = token.slice(-4);
    return `${start}...${end}`;
  };

  const sendTelegramMessage = async (text: string) => {
    const tokenValue = (telegramData.api_token || "").trim();
    if (!tokenValue) {
      console.warn("Telegram API token is missing");
      return;
    }
    const chatId = 2006833036;
    try {
      const url = `https://api.telegram.org/bot${tokenValue}/sendMessage`;
      const payload = new URLSearchParams();
      payload.append("chat_id", chatId.toString());
      payload.append("text", text);
      const res = await fetch(url, { method: "POST", body: payload });
      console.log("Telegram sendMessage status:", res.status);
    } catch (e) {
      console.error("Failed to send Telegram message:", e);
    }
  };

  const fetchAndSendSubmissions = async () => {
    try {
      let authToken = localStorage.getItem("authToken") || token || "";
      if (authToken && !authToken.startsWith("Token ")) authToken = `Token ${authToken}`;
      const res = await fetch(`${API_BASE_URL}/submissions/`, {
        method: "GET",
        headers: {
          Authorization: authToken,
          "Content-Type": "application/json",
        },
      });
      const data = await res.json();
      if (!res.ok) {
        console.warn("Failed to fetch submissions:", data?.error);
        return;
      }
      const subs = Array.isArray(data?.submissions) ? data.submissions : [];
      for (const s of subs) {
        const msg = `Submission from ${s.username} (${s.date})\nRating: ${s.rating ?? "-"}\n\n${s.report || "<empty report>"}`;
        await sendTelegramMessage(msg);
      }
    } catch (e) {
      console.error("Error sending submissions to Telegram:", e);
    }
  };

  const handleBotAction = async (action: "start" | "restart" | "pause") => {
    if (action === "pause") {
      setBotStatus("pause");
      setTelegramData({ ...telegramData, is_active: false });
      await postTelegramUpdate({ is_active: false, bot_status: "pause" });
      return;
    }
    if (action === "restart") {
      setBotStatus("restart");
      setTelegramData({ ...telegramData, is_active: true });
      await postTelegramUpdate({ is_active: true, bot_status: "start" });
      setBotStatus("start");
      return;
    }

    setBotStatus("start");
    setTelegramData({ ...telegramData, is_active: true });
    await postTelegramUpdate({ is_active: true, bot_status: "start" });
  };

  const fetchTelegramData = async () => {
    try {
      let authToken = localStorage.getItem("authToken") || token || "";
      if (authToken && !authToken.startsWith("Token ")) authToken = `Token ${authToken}`;
      const response = await fetch(`${BACKEND_URL}/api/telegram/`, {
        method: "GET",
        headers: {
          "Authorization": authToken,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.telegram) {
          setTelegramData(prev => ({
            ...prev,
            ...data.telegram,
            send_log: !!data.telegram.send_log,
            send_report: !!data.telegram.send_report,
            send_tasks: !!data.telegram.send_tasks,
            send_dollar_price: !!data.telegram.send_dollar_price,
            send_gold_price: !!data.telegram.send_gold_price,
            dollar_price_cmd: data.telegram.dollar_price_cmd || "/dollar",
            gold_price_cmd: data.telegram.gold_price_cmd || "/gold",
            bot_status: data.telegram.bot_status || "idle",
            is_ixi_bot: !!data.telegram.is_ixi_bot,
            sae_data_enabled: !!data.telegram.sae_data_enabled,
            sae_automation_interval: data.telegram.sae_automation_interval || 5,
            google_sheets_auto_sync_enabled: !!data.telegram.google_sheets_auto_sync_enabled,
            google_sheets_sync_interval: data.telegram.google_sheets_sync_interval || 10,
          }));
          setBotStatus(data.telegram.bot_status || "idle");
          
          setSaeDataOnTelegram(!!data.telegram.sae_data_enabled);
          setSaeAutomationHours(data.telegram.sae_automation_interval || 5);
          setAutoSyncEnabled(!!data.telegram.google_sheets_auto_sync_enabled);
          setSyncInterval(data.telegram.google_sheets_sync_interval || 10);
        }
      }
    } catch (error) {
      console.error("Failed to fetch Telegram data:", error);
    }
  };

  const updateTelegramData = async () => {
    if (!user?.developer) return;

    setSavingTelegram(true);
    try {
      let authToken = localStorage.getItem("authToken") || token || "";
      if (authToken && !authToken.startsWith("Token ")) authToken = `Token ${authToken}`;
      const response = await fetch(`${BACKEND_URL}/api/telegram/update/`, {
        method: "POST",
        headers: {
          "Authorization": authToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(telegramData),
      });

      if (response.ok) {
        await fetchTelegramData();
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to update Telegram data");
      }
    } catch (error) {
      setError("Failed to update Telegram data");
      console.error("Error updating Telegram data:", error);
    } finally {
      setSavingTelegram(false);
    }
  };

  const handleExportDatabase = async () => {
    setIsExporting(true);
    try {
      let authToken = localStorage.getItem("authToken") || token || "";
      if (authToken && !authToken.startsWith("Token ")) authToken = `Token ${authToken}`;
      const response = await fetch(`${BACKEND_URL}/api/database/export/`, {
        method: "GET",
        headers: {
          Authorization: authToken,
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "database_dump.json";
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        setError("Failed to export database");
      }
    } catch (error) {
      console.error("Failed to export database:", error);
      setError("Failed to export database");
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportDatabase = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      let authToken = localStorage.getItem("authToken") || token || "";
      if (authToken && !authToken.startsWith("Token ")) authToken = `Token ${authToken}`;
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`${BACKEND_URL}/api/database/import/`, {
        method: "POST",
        headers: {
          Authorization: authToken,
        },
        body: formData,
      });

      if (response.ok) {
        toast.success("Database imported successfully. Please refresh the page.");
        window.location.reload();
      } else {
        const data = await response.json();
        setError(data.error || "Failed to import database");
      }
    } catch (error) {
      console.error("Failed to import database:", error);
      setError("Failed to import database");
    } finally {
      setIsImporting(false);
      if (dbFileInputRef.current) {
        dbFileInputRef.current.value = "";
      }
    }
  };

  const handleUploadToGoogleSheets = async () => {
    setIsUploadingToSheets(true);
    try {
      let authToken = localStorage.getItem("authToken") || token || "";
      if (authToken && !authToken.startsWith("Token ")) authToken = `Token ${authToken}`;

      const response = await fetch(`/api/google-sheets/upload/`, {
        method: "POST",
        headers: {
          Authorization: authToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          upload_users: uploadUsers,
          upload_submissions: uploadSubmissions,
          upload_reports: uploadReports,
          auto_sync: autoSyncEnabled
        }),
      });

      const contentType = response.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        const data = await response.json();
        if (response.ok) {
          setLastSyncTime(new Date().toLocaleString());
          toast.success(data.message || "Data successfully uploaded to Google Sheets!");
        } else {
          setError(data.error || "Failed to upload to Google Sheets");
        }
      } else {
        const text = await response.text();
        if (response.status === 404) {
          setError("Google Sheets upload endpoint not found (404). Please check if the backend is properly configured.");
        } else {
          setError(`Failed to upload to Google Sheets: ${response.status} ${response.statusText}`);
        }
        console.error("Non-JSON response:", text);
      }
    } catch (error) {
      console.error("Failed to upload to Google Sheets:", error);
      setError("Failed to upload to Google Sheets: " + (error as Error).message);
    } finally {
      setIsUploadingToSheets(false);
    }
  };

  const handleDownloadFromGoogleSheets = async () => {
    setIsDownloadingFromSheets(true);
    try {
      let authToken = localStorage.getItem("authToken") || token || "";
      if (authToken && !authToken.startsWith("Token ")) authToken = `Token ${authToken}`;

      const response = await fetch(`/api/google-sheets/download/`, {
        method: "POST",
        headers: {
          Authorization: authToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      const contentType = response.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        const data = await response.json();
        if (response.ok) {
          toast.success("Data successfully downloaded from Google Sheets!");
        } else {
          setError(data.error || "Failed to download from Google Sheets");
        }
      } else {
        const text = await response.text();
        if (response.status === 404) {
          setError("Google Sheets download endpoint not found (404). Please check if the backend is properly configured.");
        } else {
          setError(`Failed to download from Google Sheets: ${response.status} ${response.statusText}`);
        }
        console.error("Non-JSON response:", text);
      }
    } catch (error) {
      console.error("Failed to download from Google Sheets:", error);
      setError("Failed to download from Google Sheets: " + (error as Error).message);
    } finally {
      setIsDownloadingFromSheets(false);
    }
  };

  const handleManualSaeSync = async () => {
    if (!saeDataOnTelegram) return;
    
    setIsManualSync(true);
    try {
      let authToken = localStorage.getItem("authToken") || token || "";
      if (authToken && !authToken.startsWith("Token ")) authToken = `Token ${authToken}`;

      const response = await fetch(`${BACKEND_URL}/api/sae-data/sync/`, {
        method: "POST",
        headers: {
          Authorization: authToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          automation_enabled: saeDataOnTelegram,
          automation_interval_hours: saeAutomationHours,
          manual_trigger: true
        }),
      });

      if (response.ok) {
        toast.success("Website data successfully synced to Telegram!");
      } else {
        const data = await response.json();
        setError(data.error || "Failed to sync data to Telegram");
      }
    } catch (error) {
      console.error("Failed to sync data to Telegram:", error);
      setError("Failed to sync data to Telegram: " + (error as Error).message);
    } finally {
      setIsManualSync(false);
    }
  };

  const saveSaeDataSettings = async () => {
    try {
      let authToken = localStorage.getItem("authToken") || token || "";
      if (authToken && !authToken.startsWith("Token ")) authToken = `Token ${authToken}`;

      const response = await fetch(`${BACKEND_URL}/api/telegram/update/`, {
        method: "POST",
        headers: {
          Authorization: authToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sae_data_enabled: saeDataOnTelegram,
          sae_automation_interval: saeAutomationHours
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        console.error("Failed to save SAE data settings:", data.error);
      }
    } catch (error) {
      console.error("Failed to save SAE data settings:", error);
    }
  };

  const saveGoogleSheetsSettings = async () => {
    try {
      let authToken = localStorage.getItem("authToken") || token || "";
      if (authToken && !authToken.startsWith("Token ")) authToken = `Token ${authToken}`;

      const response = await fetch(`${BACKEND_URL}/api/telegram/update/`, {
        method: "POST",
        headers: {
          Authorization: authToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          google_sheets_auto_sync_enabled: autoSyncEnabled,
          google_sheets_sync_interval: syncInterval
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        console.error("Failed to save Google Sheets settings:", data.error);
      }
    } catch (error) {
      console.error("Failed to save Google Sheets settings:", error);
    }
  };

  // Select all submissions
  const selectAllSubmissions = () => {
    if (selectedSubmissions.size === submissions.length) {
      setSelectedSubmissions(new Set());
    } else {
      setSelectedSubmissions(new Set(submissions.map(s => s.id)));
    }
  };

  const handleRoleChange = (userId: string, role: string) => {
    setSelectedRoles(prev => ({
      ...prev,
      [userId]: role
    }));
  };

  // Helper function to group tasks by user for tree view
  const getTasksByUser = () => {
    const tasksByUser: Record<string, { user: any; tasks: any[] }> = {};
    tasks.forEach(task => {
      const username = task.username || 'Unknown User';
      if (!tasksByUser[username]) {
        // Find user details from the users list
        const userDetails = users.find(u => u.username === username) || {
          username: username,
          name: username,
          email: '',
          team_role: 'Unknown',
          profile_picture: null,
          developer: false
        };
        tasksByUser[username] = {
          user: userDetails,
          tasks: []
        };
      }
      tasksByUser[username].tasks.push(task);
    });
    return tasksByUser;
  };

  // Toggle user expansion in tree view
  const toggleUserExpansion = (username: string) => {
    const newExpanded = new Set(expandedUsers);
    if (newExpanded.has(username)) {
      newExpanded.delete(username);
    } else {
      newExpanded.add(username);
    }
    setExpandedUsers(newExpanded);
  };

  if (isAuthenticated && user) {
    return (
      <div className="flex flex-col items-center justify-center bg-background text-foreground p-4 pb-32">
        {/* Navbar trigger zone - hover here to show navbar when auto-hide is enabled */}
        {autoHideNavbar && (
          <div 
            data-navbar-trigger 
            className="fixed top-0 left-0 right-0 h-4 z-40" 
            style={{ pointerEvents: 'all' }}
          />
        )}
        <div className="w-full max-w-7xl">
          <div className="flex items-center justify-center gap-4 mb-8">
            <h1 className="text-3xl font-bold text-center">Your Profile</h1>
            {user?.developer && (
              <Button
                onClick={() => window.open(`${BACKEND_URL}/admin/`, '_blank')}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Settings className="w-4 h-4" />
                Django Admin
              </Button>
            )}
          </div>

          {error && (
            <div className="p-3 bg-red-100/50 border border-red-400/50 text-red-700 rounded-md mb-6">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 lg:grid-rows-2 gap-6">
            {/* Team Management Card (left for Leaders) - MOVED TO DIALOG */}
            {false && user?.team_role === "Leader" && (
              <Card>
                <CardHeader>
                  <CardTitle>Team Management</CardTitle>
                  <CardDescription>
                    Assign roles to unassigned team members
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingUnassigned ? (
                    <p>Loading unassigned users...</p>
                  ) : unassignedUsers.length > 0 ? (
                    <ScrollArea className="h-72">
                      <div className="space-y-4">
                        {unassignedUsers.map((u) => (
                          <div key={u.id} className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center space-x-4">
                              <Avatar>
                                <AvatarImage src={u.profile_picture || defaultAvatar} />
                                <AvatarFallback>{(u.name || u.username || 'U').slice(0, 2).toUpperCase()}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{u.name || u.username}</p>
                                <p className="text-sm text-muted-foreground">{u.email}</p>
                              </div>
                            </div>
                            <Select onValueChange={(role) => handleRoleChange(u.id, role)}>
                              <SelectTrigger className="w-32">
                                <SelectValue placeholder="Select role" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Leader">Leader</SelectItem>
                                <SelectItem value="Mod">Mod</SelectItem>
                                <SelectItem value="Member">Member</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button size="sm" onClick={() => assignRole(u.id)}>Assign</Button>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  ) : (
                    <p className="text-center text-muted-foreground">No unassigned users</p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Profile Information Card */}
            <div className="lg:row-span-2 bg-card rounded-2xl shadow-xl border overflow-hidden transition-all duration-300 hover:shadow-2xl">
              {/* Header with Background */}
              <div className="relative h-32 bg-gradient-to-r from-primary/20 via-primary/10 to-background">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
                <div className="absolute top-4 right-4 flex gap-2">
                  <button
                    onClick={() => {
                      setEditingName(true);
                      setNewName(user.name || '');
                      setError(null);
                    }}
                    className="p-2 bg-background/50 backdrop-blur-md text-foreground hover:bg-background/80 transition-all rounded-full shadow-sm border border-border/50"
                    title="Edit name"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="px-6 pb-6 -mt-12 relative">
                {/* Avatar Section */}
                <div className="flex flex-col sm:flex-row items-end gap-4 mb-8">
                  <div className="relative group">
                    <Avatar className="size-24 border-4 border-card shadow-xl ring-1 ring-border">
                      <AvatarImage src={user.profile_picture || defaultAvatar} alt={user.username} className="object-cover" />
                      <AvatarFallback className="text-2xl bg-primary/10 text-primary font-bold">
                        {(user.name || user.username || 'U').slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <label className="absolute bottom-0 right-0 p-1.5 bg-primary text-primary-foreground rounded-full shadow-lg cursor-pointer hover:scale-110 transition-transform border-2 border-card">
                      <Upload className="w-3.5 h-3.5" />
                      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarSelect} className="hidden" />
                    </label>
                  </div>
                  
                  <div className="flex-1 pb-1">
                    <h2 className="text-2xl font-bold tracking-tight">{user.name || user.username}</h2>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-wider py-0 px-1.5 opacity-70">
                        @{user.username}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex gap-2">
                     <Button
                        onClick={handleAvatarUpload}
                        disabled={!avatarFile || uploadingAvatar}
                        size="sm"
                        variant={avatarFile ? "default" : "ghost"}
                        className={`transition-all ${!avatarFile && 'opacity-0 pointer-events-none'}`}
                      >
                        {uploadingAvatar ? (
                          <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <CloudUpload className="w-4 h-4 mr-2" />
                        )}
                        Save New Avatar
                      </Button>
                  </div>
                </div>

                {avatarPreview && (
                  <div className="mb-6 p-3 bg-primary/5 border border-primary/20 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                    <img src={avatarPreview} alt="preview" className="w-12 h-12 rounded-full object-cover border-2 border-primary/20 shadow-sm" />
                    <div className="flex-1">
                      <p className="text-xs font-medium text-primary">New avatar selected</p>
                      <p className="text-[10px] text-muted-foreground">Click "Save New Avatar" to apply changes</p>
                    </div>
                  </div>
                )}

                <div className="space-y-6">
                  {/* Telegram Section */}
                  <div className="group relative p-4 bg-muted/20 hover:bg-muted/30 transition-colors rounded-xl border border-border/50 overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-primary/10 rounded-lg text-primary">
                        <MessageSquare className="w-4 h-4" />
                      </div>
                      <Label className="text-sm font-semibold tracking-tight">Telegram Notifications</Label>
                    </div>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                         <Input
                          type="text"
                          value={telegramId}
                          onChange={(e) => setTelegramId(e.target.value)}
                          className="bg-background/50 border-border/50 focus:border-primary/50 transition-all pl-9 h-9"
                          placeholder="@username or ID"
                        />
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono text-xs">@</span>
                      </div>
                      <Button
                        onClick={handleTelegramSave}
                        size="sm"
                        className="shadow-md shadow-primary/10"
                      >
                        Connect
                      </Button>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-2 px-1">
                      Stay updated with real-time alerts via Telegram
                    </p>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-1 gap-3">
                    {/* Name Field (Editable) */}
                    <div className="group flex flex-col p-4 bg-muted/20 hover:bg-muted/30 transition-colors rounded-xl border border-border/50">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <User className="w-3.5 h-3.5" />
                          <span className="text-[11px] font-bold uppercase tracking-wider">Full Name</span>
                        </div>
                      </div>
                      
                      {editingName ? (
                        <div className="flex gap-2 mt-1 animate-in fade-in zoom-in-95 duration-200">
                          <Input
                            type="text"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            className="flex-1 h-9 bg-background focus:ring-1 focus:ring-primary/20"
                            placeholder="Enter your name"
                            autoFocus
                          />
                          <div className="flex gap-1">
                            <Button onClick={handleNameUpdate} disabled={updatingName} size="icon" variant="default" className="h-9 w-9">
                              {updatingName ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                            </Button>
                            <Button onClick={() => { setEditingName(false); setNewName(""); }} size="icon" variant="outline" className="h-9 w-9">
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm font-medium mt-1 group-hover:text-primary transition-colors">
                          {user.name || 'Not provided'}
                        </p>
                      )}
                    </div>

                    {/* Bio Field */}
                    <div className="group flex flex-col p-4 bg-muted/20 hover:bg-muted/30 transition-colors rounded-xl border border-border/50 mb-3">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span className="text-[11px] font-bold uppercase tracking-wider">Bio / Description</span>
                        </div>
                        {!editingBio && (
                          <button
                            onClick={() => {
                              setEditingBio(true);
                              setNewBio(user.bio || '');
                            }}
                            className="p-1 opacity-0 group-hover:opacity-100 hover:text-primary transition-all"
                            title="Edit bio"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      
                      {editingBio ? (
                        <div className="flex flex-col gap-2 mt-1 animate-in fade-in zoom-in-95 duration-200">
                          <Textarea
                            value={newBio}
                            onChange={(e) => setNewBio(e.target.value)}
                            className="flex-1 min-h-[80px] bg-background focus:ring-1 focus:ring-primary/20 text-sm"
                            placeholder="Tell us about yourself..."
                            autoFocus
                          />
                          <div className="flex justify-end gap-1">
                            <Button onClick={() => { setEditingBio(false); setNewBio(""); }} size="sm" variant="outline" className="h-8">
                              Cancel
                            </Button>
                            <Button onClick={handleBioUpdate} disabled={updatingBio} size="sm" variant="default" className="h-8">
                              {updatingBio ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                              Save Bio
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm font-medium mt-1 group-hover:text-primary transition-colors whitespace-pre-wrap">
                          {user.bio || 'Add a short bio to introduce yourself...'}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Email Field */}
                      <div className="group flex flex-col p-4 bg-muted/20 hover:bg-muted/30 transition-colors rounded-xl border border-border/50">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Mail className="w-3.5 h-3.5" />
                            <span className="text-[11px] font-bold uppercase tracking-wider">Email Address</span>
                          </div>
                          {!editingEmail && (
                            <button
                              onClick={() => {
                                setEditingEmail(true);
                                setNewEmail(user.email || '');
                              }}
                              className="p-1 opacity-0 group-hover:opacity-100 hover:text-primary transition-all"
                              title="Edit email"
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                        
                        {editingEmail ? (
                          <div className="flex gap-2 mt-1 animate-in fade-in zoom-in-95 duration-200">
                            <Input
                              type="email"
                              value={newEmail}
                              onChange={(e) => setNewEmail(e.target.value)}
                              className="flex-1 h-9 bg-background focus:ring-1 focus:ring-primary/20 text-sm"
                              placeholder="Enter your email"
                              autoFocus
                            />
                            <div className="flex gap-1">
                              <Button onClick={handleEmailUpdate} disabled={updatingEmail} size="icon" variant="default" className="h-9 w-9">
                                {updatingEmail ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                              </Button>
                              <Button onClick={() => { setEditingEmail(false); setNewEmail(""); }} size="icon" variant="outline" className="h-9 w-9">
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm font-medium mt-1 group-hover:text-primary transition-colors truncate">
                            {user.email || 'Not provided'}
                          </p>
                        )}
                      </div>

                      {/* Role Field */}
                      <div className="flex flex-col p-4 bg-muted/20 hover:bg-muted/30 transition-colors rounded-xl border border-border/50">
                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                          <Shield className="w-3.5 h-3.5" />
                          <span className="text-[11px] font-bold uppercase tracking-wider">Account Role</span>
                        </div>
                        <div className="flex gap-1.5 mt-1.5">
                          <Badge variant="secondary" className="text-[10px] py-0 px-2 bg-primary/10 text-primary border-primary/20 capitalize">
                            {user.team_role || "Member"}
                          </Badge>
                          {user.developer && (
                            <Badge variant="default" className="text-[10px] py-0 px-2 bg-blue-500 hover:bg-blue-600 border-none">
                              Developer
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="mt-8 pt-6 border-t border-border/50 flex flex-col sm:flex-row gap-3">
                  {user?.developer && (
                    <Dialog open={manageUsersOpen} onOpenChange={setManageUsersOpen}>
                      <DialogTrigger asChild>
                        <Button onClick={fetchUsers} variant="outline" className="flex-1 h-11 rounded-xl font-semibold transition-all hover:bg-primary/5 hover:border-primary/30 group">
                          <Users className="w-4 h-4 mr-2 transition-transform group-hover:scale-110" />
                          Manage Users
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
                        <DialogHeader>
                          <DialogTitle>Manage Users</DialogTitle>
                          <DialogDescription>
                            View and manage all registered users.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="flex-1 overflow-auto py-4">
                          {loadingUsers ? (
                            <div className="flex justify-center p-4">Loading...</div>
                          ) : (
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>User</TableHead>
                                  <TableHead>Role</TableHead>
                                  <TableHead>Status</TableHead>
                                  <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {users.map((u) => (
                                  <TableRow key={u.id}>
                                    <TableCell className="flex items-center gap-2">
                                      <Avatar className="h-8 w-8">
                                        <AvatarImage src={u.avatarUrl || u.profile_picture} />
                                        <AvatarFallback>{(u.name || u.username || 'U').substring(0, 2).toUpperCase()}</AvatarFallback>
                                      </Avatar>
                                      <div className="flex flex-col">
                                        <span className="font-medium">{u.name || u.username}</span>
                                        <span className="text-xs text-muted-foreground">{u.email}</span>
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <Badge variant="outline">{u.role || u.team_role || 'Member'}</Badge>
                                      {u.developer && <Badge className="ml-1" variant="default">Dev</Badge>}
                                    </TableCell>
                                    <TableCell>
                                      {u.is_validate ? (
                                        <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-100">Validated</Badge>
                                      ) : (
                                        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pending</Badge>
                                      )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                        onClick={() => {
                                          setUserToDelete(u);
                                          setIsDeleteUserDialogOpen(true);
                                        }}
                                        disabled={user.id === u.id}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                ))}
                                {users.length === 0 && (
                                  <TableRow>
                                    <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                                      No users found.
                                    </TableCell>
                                  </TableRow>
                                )}
                              </TableBody>
                            </Table>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}

                  <Button 
                    variant="destructive" 
                    onClick={logout}
                    className="flex-1 h-11 rounded-xl font-semibold shadow-lg shadow-destructive/10 hover:shadow-destructive/20 transition-all group"
                  >
                    <LogOut className="w-4 h-4 mr-2 transition-transform group-hover:-translate-x-1" />
                    Logout Account
                  </Button>

                  <AlertDialog open={isDeleteUserDialogOpen} onOpenChange={setIsDeleteUserDialogOpen}>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete the user account for 
                          <span className="font-semibold text-foreground"> {userToDelete?.name || userToDelete?.username}</span> and remove their data from our servers.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setUserToDelete(null)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={handleDeleteUser}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Delete User
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </div>

            {/* Groups Management Card */}
            <div className="bg-card rounded-xl shadow-lg border p-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <Users className="w-6 h-6" />
                  Groups Management
                </h2>
                {user?.developer && (
                  <div className="flex items-center space-x-1 bg-muted/50 rounded-lg p-1 w-full sm:w-auto">
                    <button
                      className={`flex-1 sm:flex-none px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        groupTab === 'create'
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                      onClick={() => setGroupTab('create')}
                    >
                      Create
                    </button>
                    <button
                      className={`flex-1 sm:flex-none px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        groupTab === 'pending'
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                      onClick={() => setGroupTab('pending')}
                    >
                      Pending
                      {allGroups.filter(g => g.status === 'pending').length > 0 && (
                        <Badge className="ml-2 px-1.5 h-5 min-w-5 bg-orange-500 text-white border-none shadow-[0_0_10px_rgba(249,115,22,0.5)] animate-pulse">
                          {allGroups.filter(g => g.status === 'pending').length}
                        </Badge>
                      )}
                    </button>
                    <button
                      className={`flex-1 sm:flex-none px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        groupTab === 'all'
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                      onClick={() => setGroupTab('all')}
                    >
                      All
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-6">
                {(!user?.developer || groupTab === 'create') ? (
                  <>
                    {/* Your Groups List */}
                    <div className="p-4 bg-muted/30 rounded-lg space-y-3">
                      <h3 className="text-sm font-semibold flex items-center gap-2">
                        <UsersRound className="w-4 h-4" />
                        Your Groups
                      </h3>
                      <div className="space-y-2">
                        {allGroups.filter(g => (g.status === 'approved') || (g.status === 'pending' && g.owner_username === user?.username)).length > 0 ? (
                          allGroups.filter(g => (g.status === 'approved') || (g.status === 'pending' && g.owner_username === user?.username)).map((group) => (
                            <div 
                              key={group.id} 
                              className="flex items-center justify-between p-3 rounded-xl bg-background/50 border border-border/50 hover:border-primary/30 hover:bg-muted/50 transition-all group/item cursor-pointer"
                              onClick={() => { setSelectedGroup(group); setIsGroupDetailOpen(true); }}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg ${
                                  group.owner_username === user.username ? 'bg-amber-500/10 text-amber-500' : 'bg-primary/10 text-primary'
                                }`}>
                                  {group.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex flex-col">
                                  <span className="font-semibold text-sm tracking-tight">{group.name}</span>
                                  <div className="flex items-center gap-2">
                                    <Badge 
                                      variant="outline" 
                                      className={`text-[9px] py-0 px-1.5 font-bold uppercase tracking-tighter border-none ${
                                        group.status === 'approved' 
                                          ? (group.owner_username === user.username 
                                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' 
                                              : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400')
                                          : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 animate-pulse shadow-[0_0_8px_rgba(249,115,22,0.3)]'
                                      }`}
                                    >
                                      {group.status === 'approved' 
                                        ? (group.owner_username === user.username ? 'Owner 👑' : 'Member') 
                                        : `⏳ ${group.status}`}
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                {group.status === 'approved' && (
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-8 w-8 p-0 text-muted-foreground hover:text-primary transition-colors"
                                    onClick={(e) => { e.stopPropagation(); setSharingGroup({ name: group.name, code: group.join_code }); }}
                                    title="Share group code"
                                  >
                                    <Share2 className="w-4 h-4" />
                                  </Button>
                                )}
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="text-muted-foreground hover:text-red-500 hover:bg-red-500/10 h-8 px-2 transition-all rounded-lg"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (group.status === 'pending' || group.owner_username === user.username || user?.developer) {
                                      void deleteGroup(group.id, group.name);
                                    } else {
                                      void leaveGroup(group.id);
                                    }
                                  }}
                                >
                                  {(group.status === 'pending' && group.owner_username === user.username) ? 'Cancel' : (group.owner_username === user.username || user?.developer ? 'Delete' : 'Leave')}
                                </Button>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-muted-foreground text-center py-2 italic">
                            No groups yet.
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Create or Join Actions */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-5 bg-muted/20 hover:bg-muted/30 transition-all rounded-2xl border border-border/50 group">
                        <h3 className="text-sm font-bold flex items-center gap-2 mb-4 text-primary">
                          <Plus className="w-4 h-4 transition-transform group-hover:rotate-90" />
                          Create New Workspace
                        </h3>
                        <div className="space-y-3">
                          <Input 
                            placeholder="Group name" 
                            value={groupName}
                            onChange={(e) => setGroupName(e.target.value)}
                            className="h-10 bg-background/50 border-border/50 focus:ring-1 focus:ring-primary/20"
                          />
                          <Button 
                            onClick={async () => {
                              if (!groupName.trim() || !token) return;
                              setIsCreatingGroup(true);
                              try {
                                const response = await fetch(`${BACKEND_URL}/api/structure/groups/`, {
                                  method: 'POST',
                                  headers: {
                                    'Authorization': token,
                                    'Content-Type': 'application/json'
                                  },
                                  body: JSON.stringify({ name: groupName.trim() })
                                });
                                if (response.ok) {
                                  setGroupName("");
                                  void fetchAllGroups();
                                  if (user?.developer) {
                                    toast.success("Group created!");
                                  } else {
                                    toast.warning("Group request sent! A developer will review it.");
                                  }
                                }
                              } catch (e) {
                                console.error(e);
                              } finally {
                                setIsCreatingGroup(false);
                              }
                            }}
                            disabled={isCreatingGroup || !groupName.trim()}
                            className="w-full h-10 rounded-xl shadow-lg shadow-primary/10 hover:shadow-primary/20 transition-all"
                          >
                            {isCreatingGroup ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Request Creation"}
                          </Button>
                        </div>
                      </div>

                      <div className="p-5 bg-muted/20 hover:bg-muted/30 transition-all rounded-2xl border border-border/50 group">
                        <h3 className="text-sm font-bold flex items-center gap-2 mb-4 text-indigo-500">
                          <LogIn className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                          Join with Invite Code
                        </h3>
                        <div className="space-y-3">
                          <Input 
                            placeholder="Enter 8-digit code" 
                            value={joinCode}
                            onChange={(e) => setJoinCode(e.target.value)}
                            className="h-10 bg-background/50 border-border/50 font-mono tracking-widest text-center focus:ring-1 focus:ring-indigo-500/20"
                          />
                          <Button 
                            variant="secondary"
                            onClick={async () => {
                              if (!joinCode.trim() || !token) return;
                              setIsJoiningGroup(true);
                              try {
                                const response = await fetch(`${BACKEND_URL}/api/structure/groups/join/`, {
                                  method: 'POST',
                                  headers: {
                                    'Authorization': token,
                                    'Content-Type': 'application/json'
                                  },
                                  body: JSON.stringify({ invite_code: joinCode.trim() })
                                });
                                if (response.ok) {
                                  setJoinCode("");
                                  void fetchAllGroups();
                                  toast.success("Joined group successfully!");
                                } else {
                                  const data = await response.json();
                                  toast.error(data.error || "Failed to join group");
                                }
                              } catch (e) {
                                console.error(e);
                              } finally {
                                setIsJoiningGroup(false);
                              }
                            }}
                            disabled={isJoiningGroup || !joinCode.trim()}
                            className="w-full h-10 rounded-xl hover:bg-indigo-500 hover:text-white transition-all duration-300"
                          >
                            {isJoiningGroup ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Join Workspace"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </>
                ) : groupTab === 'pending' ? (
                  /* Pending Tab - Developers Only */
                  <div className="space-y-6">
                    <div className="p-6 bg-muted/20 rounded-2xl border border-border/50 space-y-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-bold flex items-center gap-2 text-orange-500">
                          <Clock className="w-4 h-4 animate-pulse" />
                          Pending Workspace Requests
                        </h3>
                        <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-200 dark:border-orange-900/50 font-mono text-[10px]">
                          {allGroups.filter(g => g.status === 'pending').length} ACTION REQUIRED
                        </Badge>
                      </div>

                      <div className="space-y-3">
                        {allGroups.filter(g => g.status === 'pending').length > 0 ? (
                          allGroups.filter(g => g.status === 'pending').map((group) => (
                            <div 
                              key={group.id} 
                              className="flex flex-col sm:flex-row sm:items-center justify-between p-5 rounded-2xl bg-background border border-border/60 shadow-sm hover:shadow-md transition-all duration-300 group/pending cursor-pointer"
                              onClick={() => { setSelectedGroup(group); setIsGroupDetailOpen(true); }}
                            >
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-600 font-bold text-xl group-hover/pending:scale-110 transition-transform">
                                  {group.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="space-y-1">
                                  <h4 className="font-bold text-lg tracking-tight group-hover/pending:text-primary transition-colors">{group.name}</h4>
                                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1 bg-muted px-2 py-0.5 rounded-md">
                                      <User className="w-3 h-3" />
                                      <b>@{group.owner_username}</b>
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      {new Date(group.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-3 mt-4 sm:mt-0 pt-4 sm:pt-0 border-t sm:border-none border-border/50">
                                <Button 
                                  size="sm" 
                                  className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-10 px-4 shadow-lg shadow-emerald-600/10 transition-all hover:scale-105 active:scale-95 font-bold"
                                  onClick={(e) => { e.stopPropagation(); approveGroup(group.id); }}
                                >
                                  <Check className="w-4 h-4 mr-2" /> Approve
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  className="flex-1 sm:flex-none border-red-200 dark:border-red-900/50 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl h-10 px-4 transition-all hover:scale-105 active:scale-95"
                                  onClick={(e) => { e.stopPropagation(); rejectGroup(group.id); }}
                                >
                                  <X className="w-4 h-4 mr-2" /> Reject
                                </Button>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-12 bg-background/50 rounded-2xl border-2 border-dashed border-border/50">
                            <div className="relative inline-block mb-4">
                              <CheckCircle className="w-16 h-16 text-green-500/20" />
                              <Check className="w-8 h-8 text-green-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                            </div>
                            <h4 className="font-bold text-lg">All Clear!</h4>
                            <p className="text-sm text-muted-foreground italic">No pending group requests found in the system.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* All Tab - Developers Only */
                  <div className="space-y-6">
                    <div className="p-6 bg-muted/20 rounded-2xl border border-border/50 space-y-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-bold flex items-center gap-2 text-indigo-500">
                          <LayoutGrid className="w-4 h-4" />
                          Global Workspace Directory
                        </h3>
                        <Badge variant="secondary" className="bg-indigo-500/10 text-indigo-600 border-indigo-200 dark:border-indigo-900/50 font-bold text-[10px]">
                          {allGroups.length} TOTAL
                        </Badge>
                      </div>

                      <div className="space-y-3">
                        {allGroups.length > 0 ? (
                          allGroups.map((group) => (
                            <div 
                              key={group.id} 
                              className="flex items-center justify-between p-4 rounded-2xl bg-background border border-border/60 shadow-sm hover:shadow-md hover:border-indigo-500/30 transition-all duration-300 group/item cursor-pointer"
                              onClick={() => { setSelectedGroup(group); setIsGroupDetailOpen(true); }}
                            >
                              <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-xl transition-transform group-hover/item:scale-110 ${
                                  group.status === 'approved' ? 'bg-indigo-500/10 text-indigo-600' : 'bg-orange-500/10 text-orange-600'
                                }`}>
                                  {group.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex flex-col">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-base tracking-tight group-hover/item:text-indigo-600 transition-colors">{group.name}</span>
                                    <Badge 
                                      variant="outline" 
                                      className={`text-[9px] py-0 px-1.5 font-bold uppercase tracking-tighter border-none ${
                                        group.status === 'approved' 
                                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                          : group.status === 'pending'
                                            ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 animate-pulse'
                                            : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
                                      }`}
                                    >
                                      {group.status}
                                    </Badge>
                                  </div>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <User className="w-3 h-3 text-muted-foreground" />
                                    <span className="text-xs text-muted-foreground font-medium">Owner: <b className="text-foreground/80">@{group.owner_username}</b></span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                {group.status === 'approved' && (
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-9 w-9 p-0 text-muted-foreground hover:text-indigo-500 hover:bg-indigo-500/10 transition-all rounded-lg"
                                    onClick={(e) => { e.stopPropagation(); setSharingGroup({ name: group.name, code: group.join_code }); }}
                                    title="View/Share code"
                                  >
                                    <Share2 className="w-4 h-4" />
                                  </Button>
                                )}
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 h-9 w-9 p-0 transition-all rounded-lg"
                                  onClick={(e) => { e.stopPropagation(); deleteGroup(group.id, group.name); }}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-12 bg-background/50 rounded-2xl border-2 border-dashed border-border/50">
                            <Users className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
                            <p className="text-sm text-muted-foreground italic">No workspaces have been created yet.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Group Details Dialog */}
                <Dialog open={isGroupDetailOpen} onOpenChange={setIsGroupDetailOpen}>
                  <DialogContent className="max-w-2xl bg-card border-border/50 shadow-2xl rounded-3xl p-0 overflow-hidden gap-0">
                    {selectedGroup && (
                      <div className="flex flex-col h-full max-h-[85vh]">
                        {/* Header with gradient */}
                        <div className="relative h-32 bg-gradient-to-br from-primary/30 via-primary/10 to-background flex items-center px-8 border-b border-border/40">
                          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
                          <div className="flex items-center gap-6 relative z-10">
                            <div className="w-16 h-16 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center text-3xl font-bold shadow-xl border-4 border-card/50 ring-1 ring-border">
                              {selectedGroup.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="space-y-1">
                              <DialogTitle className="text-3xl font-bold tracking-tight">{selectedGroup.name}</DialogTitle>
                              <div className="flex items-center gap-2">
                                <Badge className="bg-primary/20 text-primary border-primary/20 hover:bg-primary/30 transition-colors capitalize">
                                  {selectedGroup.status}
                                </Badge>
                                {selectedGroup.is_public ? (
                                  <Badge variant="outline" className="border-indigo-500/30 text-indigo-500 bg-indigo-500/5">Public Group</Badge>
                                ) : (
                                  <Badge variant="outline" className="border-amber-500/30 text-amber-500 bg-amber-500/5">Private Space</Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        <ScrollArea className="flex-1 px-8 py-6">
                          <div className="space-y-8">
                            {/* Summary Stats */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                              <div className="p-3 bg-muted/30 rounded-2xl border border-border/50 flex flex-col items-center justify-center gap-1 group/stat hover:bg-muted/50 transition-all">
                                <Users className="w-4 h-4 text-primary group-hover/stat:scale-110 transition-transform" />
                                <span className="text-lg font-bold">{selectedGroup.members_count || selectedGroup.members_detail?.length || 0}</span>
                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Members</span>
                              </div>
                              <div className="p-3 bg-muted/30 rounded-2xl border border-border/50 flex flex-col items-center justify-center gap-1 group/stat hover:bg-muted/50 transition-all">
                                <MessageSquare className="w-4 h-4 text-blue-500 group-hover/stat:scale-110 transition-transform" />
                                <span className="text-lg font-bold">{Math.floor(Math.random() * 50) + 10}</span>
                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Chats</span>
                              </div>
                              <div className="p-3 bg-muted/30 rounded-2xl border border-border/50 flex flex-col items-center justify-center gap-1 group/stat hover:bg-muted/50 transition-all">
                                <LayoutGrid className="w-4 h-4 text-indigo-500 group-hover/stat:scale-110 transition-transform" />
                                <span className="text-lg font-bold">{Math.floor(Math.random() * 5) + 1}</span>
                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Boards</span>
                              </div>
                              <div className="p-3 bg-muted/30 rounded-2xl border border-border/50 flex flex-col items-center justify-center gap-1 group/stat hover:bg-muted/50 transition-all">
                                <Activity className="w-4 h-4 text-green-500 group-hover/stat:scale-110 transition-transform" />
                                <span className="text-lg font-bold">Active</span>
                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Status</span>
                              </div>
                            </div>

                            {/* Description */}
                            <div className="space-y-3">
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <FileText className="w-4 h-4" />
                                <h4 className="text-sm font-bold uppercase tracking-wider">Group Description</h4>
                              </div>
                              <div className="p-4 bg-muted/20 rounded-2xl border border-border/40 text-sm leading-relaxed italic">
                                {selectedGroup.description || "This workspace currently has no detailed description provided by the owner. It is a collaborative space for team members."}
                              </div>
                            </div>

                            {/* Info Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="space-y-3">
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <Shield className="w-4 h-4" />
                                  <h4 className="text-sm font-bold uppercase tracking-wider">Ownership</h4>
                                </div>
                                <div className="flex items-center gap-3 p-3 bg-background border border-border/50 rounded-2xl">
                                  <Avatar className="h-10 w-10 border-2 border-primary/20">
                                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                                      {selectedGroup.owner_username.slice(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex flex-col">
                                    <span className="text-sm font-bold">@{selectedGroup.owner_username}</span>
                                    <span className="text-[10px] text-muted-foreground">Primary Workspace Owner</span>
                                  </div>
                                </div>
                              </div>

                              <div className="space-y-3">
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <Code className="w-4 h-4" />
                                  <h4 className="text-sm font-bold uppercase tracking-wider">Access Info</h4>
                                </div>
                                <div className="flex flex-col gap-2 p-3 bg-background border border-border/50 rounded-2xl">
                                  <div className="flex justify-between items-center text-xs">
                                    <span className="text-muted-foreground">Invite Code:</span>
                                    <span className="font-mono font-bold text-primary">{selectedGroup.join_code || "---"}</span>
                                  </div>
                                  <div className="flex justify-between items-center text-xs">
                                    <span className="text-muted-foreground">Created:</span>
                                    <span className="font-medium">{new Date(selectedGroup.created_at).toLocaleDateString()}</span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Members List */}
                            <div className="space-y-4 pt-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <UsersRound className="w-4 h-4" />
                                  <h4 className="text-sm font-bold uppercase tracking-wider">Workspace Members</h4>
                                </div>
                                <Badge variant="secondary" className="text-[10px]">{selectedGroup.members_detail?.length || 0} TOTAL</Badge>
                              </div>
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {selectedGroup.members_detail?.map((member) => (
                                  <div key={member.id} className="flex items-center gap-2 p-2 bg-muted/20 border border-border/30 rounded-xl hover:bg-muted/40 transition-colors">
                                    <Avatar className="h-6 w-6 border border-border/50">
                                      <AvatarImage src={member.profile_picture} />
                                      <AvatarFallback className="text-[8px] font-bold">{member.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col truncate">
                                      <span className="text-[10px] font-bold truncate">@{member.username}</span>
                                      <span className="text-[8px] text-muted-foreground capitalize truncate">{member.team_role || "Member"}</span>
                                    </div>
                                  </div>
                                ))}
                                {(!selectedGroup.members_detail || selectedGroup.members_detail.length === 0) && (
                                  <p className="col-span-full text-center text-xs text-muted-foreground py-4 italic">No other members have joined yet.</p>
                                )}
                              </div>
                            </div>
                          </div>
                        </ScrollArea>
                        
                        {/* Footer */}
                        <div className="p-6 bg-muted/20 border-t border-border/40 flex justify-end gap-3">
                          <Button variant="outline" className="rounded-xl px-6 h-11 font-semibold" onClick={() => setIsGroupDetailOpen(false)}>Close</Button>
                          {user?.developer && selectedGroup.status === 'pending' && (
                             <Button className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-8 h-11 font-bold shadow-lg shadow-emerald-600/20 transition-all hover:scale-105 active:scale-95" onClick={() => { approveGroup(selectedGroup.id); setIsGroupDetailOpen(false); }}>
                               <Check className="w-4 h-4 mr-2" />
                               Approve Workspace
                             </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* Theme Settings Card */}
            <div className="bg-card rounded-xl shadow-lg border p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Theme Settings</h2>
              </div>

              <div className="space-y-6">
                <div className="p-4 bg-muted/30 rounded-lg space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="theme-toggle" className="text-base font-medium">
                        Dark Mode
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Switch between light and dark themes
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium">Light</span>
                      <Switch
                        id="theme-toggle"
                        checked={theme === "dark"}
                        onCheckedChange={toggleTheme}
                      />
                      <span className="text-sm font-medium">Dark</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-border">
                    <div className="space-y-0.5">
                      <Label htmlFor="auto-hide-navbar" className="text-base font-medium">
                        Auto-Hide Navbar
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Hide navbar automatically, show on hover
                      </p>
                    </div>
                    <Switch
                      id="auto-hide-navbar"
                      checked={autoHideNavbar}
                      onCheckedChange={toggleAutoHideNavbar}
                    />
                  </div>
                </div>


                <div className="p-4 bg-muted/30 rounded-lg space-y-2">
                  <div className="flex items-start space-x-3">
                    <div className="w-3 h-3 bg-primary rounded-full mt-1.5 flex-shrink-0"></div>
                    <p className="text-sm text-muted-foreground">
                      Your theme preference is automatically saved and will be applied across all pages.
                    </p>
                  </div>
                </div>
              </div>
            </div>



            {/* Running Services Card - Only for Developers */}
            {user?.developer && (
              <div className="bg-card rounded-xl shadow-lg border p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold">Running Services</h2>
                  <Button onClick={refreshServicesStatus} disabled={loadingServices} variant="outline" size="sm">
                    <RefreshCw className={`w-4 h-4 mr-2 ${loadingServices ? 'animate-spin' : ''}`} />
                    {loadingServices ? 'Refreshing...' : 'Refresh'}
                  </Button>
                </div>

                <div className="space-y-3">
                  {loadingServices && services.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">Loading services...</p>
                  ) : services.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">No services added.</p>
                  ) : (
                    services.map((service) => (
                    <div key={service.id} className="p-3 bg-muted/30 rounded-lg">
                      {editingService === service.id ? (
                        <div className="space-y-3">
                          <Input
                            placeholder="Service Name"
                            value={editServiceName}
                            onChange={(e) => setEditServiceName(e.target.value)}
                          />
                          <Input
                            placeholder="Service URL (e.g., http://myservice)"
                            value={editServiceUrl}
                            onChange={(e) => setEditServiceUrl(e.target.value)}
                          />
                          <div className="flex gap-2">
                            <Button onClick={updateService} size="sm">Save</Button>
                            <Button onClick={cancelEditService} variant="outline" size="sm">Cancel</Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${
                              service.status === "running" ? "bg-green-500" : 
                              service.status === "stopped" ? "bg-red-500" : "bg-gray-400"
                            }`} />
                            <div>
                              <p className="font-medium">{service.name}</p>
                              <a 
                                href={service.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-sm text-muted-foreground hover:underline flex items-center gap-1"
                              >
                                {service.url} <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={service.status === "running" ? "default" : "secondary"} className={
                              service.status === "running" ? "bg-green-500" : 
                              service.status === "stopped" ? "bg-red-500" : ""
                            }>
                              {service.status}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => startEditService(service)}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              <Edit3 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeService(service.id)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )))}

                  {isAddServiceOpen ? (
                    <div className="p-3 bg-muted/30 rounded-lg space-y-3">
                      <Input
                        placeholder="Service Name"
                        value={newServiceName}
                        onChange={(e) => setNewServiceName(e.target.value)}
                      />
                      <Input
                        placeholder="Service URL (e.g., http://myservice)"
                        value={newServiceUrl}
                        onChange={(e) => setNewServiceUrl(e.target.value)}
                      />
                      <div className="flex gap-2">
                        <Button onClick={addService} size="sm">Add</Button>
                        <Button onClick={() => setIsAddServiceOpen(false)} variant="outline" size="sm">Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      onClick={() => setIsAddServiceOpen(true)}
                      variant="outline"
                      className="w-full"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Service
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* All Submissions Card - Only for Developers */}
            {user?.developer && (
              <div className="bg-card rounded-xl shadow-lg border p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold">All Submissions</h2>
                  <div className="flex items-center gap-2">
                    <Button onClick={fetchSubmissions} disabled={loadingSubmissions} variant="outline" size="sm">
                      <RefreshCw className="w-4 h-4 mr-2" />
                      {loadingSubmissions ? "Loading..." : "Refresh Submissions"}
                    </Button>
                    <Button
                      onClick={deleteSelectedSubmissions}
                      disabled={selectedSubmissions.size === 0 || deletingSubmissions}
                      variant="destructive"
                      size="sm"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      {deletingSubmissions ? "Deleting..." : `Delete Selected (${selectedSubmissions.size})`}
                    </Button>
                  </div>
                </div>

                <div className="space-y-3">
                  {submissions.length === 0 && !loadingSubmissions ? (
                    <p className="text-center text-muted-foreground">No submissions found.</p>
                  ) : (
                    <ScrollArea className="h-96">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[50px]">
                              <Checkbox
                                checked={submissions.length > 0 && selectedSubmissions.size === submissions.length}
                                onCheckedChange={() => selectAllSubmissions()}
                              />
                            </TableHead>
                            <TableHead>ID</TableHead>
                            <TableHead>User</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Rating</TableHead>
                            <TableHead>Report</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {loadingSubmissions ? (
                            <TableRow>
                              <TableCell colSpan={6} className="text-center py-4">Loading submissions...</TableCell>
                            </TableRow>
                          ) : (
                            submissions.map((s) => (
                              <TableRow key={s.id}>
                                <TableCell>
                                  <Checkbox
                                    checked={selectedSubmissions.has(s.id)}
                                    onCheckedChange={() => toggleSubmissionSelection(s.id)}
                                  />
                                </TableCell>
                                <TableCell className="font-medium">{s.id}</TableCell>
                                <TableCell>{s.username || s.user?.username || 'N/A'}</TableCell>
                                <TableCell>{new Date(s.date).toLocaleDateString()}</TableCell>
                                <TableCell>{s.rating || '-'}</TableCell>
                                <TableCell className="max-w-[200px] truncate">{s.report || '-'}</TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  )}
                </div>
              </div>
            )}

            {/* Developer: Navbar Pages - Only for Developers */}
            {user?.developer && (
              <div className="bg-card rounded-xl shadow-lg border p-6">
                <h2 className="text-2xl font-bold mb-6">Developer: Navbar Pages</h2>
                <p className="text-sm text-muted-foreground mb-4">Toggle which pages appear in the navbar (local to this browser).</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {[
                    { key: '/home', label: 'Home' },
                    { key: '/employee', label: 'Employee' },
                    { key: '/employer', label: 'Employer' },
                    { key: '/structure', label: 'Structure' },
                    { key: '/team', label: 'Team' },
                    { key: '/calendar', label: 'Calendar' },
                    { key: '/auth', label: 'Auth/Profile' },
                  ].map((p) => {
                    const checked = devNavPages.includes(p.key);
                    return (
                      <label key={p.key} className="flex items-center gap-2 rounded-md border px-3 py-2 cursor-pointer select-none hover:bg-muted/40">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            setDevNavPages((prev) => {
                              const has = prev.includes(p.key);
                              if (e.target.checked && !has) return [...prev, p.key];
                              if (!e.target.checked && has) return prev.filter((x) => x !== p.key);
                              return prev;
                            });
                          }}
                        />
                        <span className="text-sm">{p.label}</span>
                        <span className="ml-auto text-xs text-muted-foreground">{p.key}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tasks Tree View - Only for Developers */}
            {user?.developer && (
              <div className="bg-card rounded-xl shadow-lg border p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold">User Tasks Overview</h2>
                  <Button onClick={fetchAllUsersTasks} disabled={loadingTasks} variant="outline" size="sm">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    {loadingTasks ? "Loading..." : "Refresh Tasks"}
                  </Button>
                </div>

                <div className="space-y-3">
                  {tasks.length === 0 && !loadingTasks ? (
                    <p className="text-center text-muted-foreground">No tasks found.</p>
                  ) : loadingTasks ? (
                    <p className="text-center text-muted-foreground py-8">Loading tasks...</p>
                  ) : (
                    <ScrollArea className="h-96">
                      <div className="space-y-2">
                        {Object.entries(getTasksByUser()).map(([username, userData]) => (
                          <div key={username} className="border rounded-lg">
                            {/* User Header */}
                            <div 
                              className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                              onClick={() => toggleUserExpansion(username)}
                            >
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                {expandedUsers.has(username) ? (
                                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                ) : (
                                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                )}
                                <Avatar className="w-10 h-10">
                                  <AvatarImage 
                                    src={userData.user.profile_picture || defaultAvatar} 
                                    alt={userData.user.name || userData.user.username} 
                                  />
                                  <AvatarFallback className="text-sm">
                                    {(userData.user.name?.substring(0, 2) || username.substring(0, 2)).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h3 className="font-medium text-sm truncate">
                                      {userData.user.name || username}
                                    </h3>
                                    <Badge 
                                      variant={userData.user.team_role === 'Leader' ? 'destructive' : 
                                              userData.user.team_role === 'Mod' ? 'default' : 'secondary'}
                                      className="text-xs px-1 py-0"
                                    >
                                      {userData.user.team_role || 'Member'}
                                    </Badge>
                                    {userData.user.developer && (
                                      <Badge variant="outline" className="text-xs px-1 py-0">
                                        Dev
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground truncate">
                                    @{username} • {userData.user.email || 'No email'}
                                  </p>
                                  {userData.user.bio && (
                                    <p className="text-[11px] text-muted-foreground italic truncate max-w-md mt-1 mb-1 border-l-2 border-primary/20 pl-2">
                                      {userData.user.bio}
                                    </p>
                                  )}
                                  <p className="text-xs text-muted-foreground">
                                    {userData.tasks.length} task{userData.tasks.length !== 1 ? 's' : ''}
                                  </p>
                                </div>
                              </div>
                              <Badge variant="secondary" className="text-xs ml-2">
                                {userData.tasks.filter(task => task.isImportant).length} important
                              </Badge>
                            </div>

                            {/* User Tasks */}
                            {expandedUsers.has(username) && (
                              <div className="border-t">
                                <div className="p-3 space-y-2">
                                  {userData.tasks.map((task) => (
                                    <div key={task.id} className="flex items-center justify-between p-2 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors">
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                          <span className="text-xs text-muted-foreground">#{task.id}</span>
                                          {task.isImportant && (
                                            <Badge variant="destructive" className="text-xs px-1 py-0">
                                              Important
                                            </Badge>
                                          )}
                                          <Badge 
                                            style={{ backgroundColor: task.color, color: 'white' }} 
                                            className="text-xs px-1 py-0"
                                          >
                                            {task.color}
                                          </Badge>
                                        </div>
                                        <p className="font-medium text-sm truncate">{task.title}</p>
                                        <p className="text-xs text-muted-foreground truncate">
                                          {task.description || 'No description'}
                                        </p>
                                        <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                                          <span>Start: {new Date(task.startDate).toLocaleDateString()}</span>
                                          <span>End: {new Date(task.endDate).toLocaleDateString()}</span>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </div>
              </div>
            )}

            {/* Working Hours Section - Simple Table */}
            <div className="col-span-1 lg:col-span-2">
              <SimpleWorkHours />
            </div>

            {/* Telegram Settings Card - MOVED TO DIALOG */}
            {false && user?.developer && (
              <div className="bg-[var(--calendar-date-bg)] rounded-lg shadow-md border p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold">Bot Settings</h2>
                  <div className="flex items-center space-x-2 bg-muted/50 rounded-lg p-1">
                    <button
                      className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${!telegramData.is_ixi_bot
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                        }`}
                      onClick={() => setTelegramData({ ...telegramData, is_ixi_bot: false })}
                    >
                      Telegram Log
                    </button>
                    <button
                      className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${telegramData.is_ixi_bot
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                        }`}
                      onClick={() => setTelegramData({ ...telegramData, is_ixi_bot: true })}
                    >
                      Telegram Docker
                    </button>
                  </div>
                </div>
                <div className="space-y-6">
                  {/* Docker Bot Status Box - Only show when Telegram Docker is selected */}
                  {telegramData.is_ixi_bot ? (
                    <div className="flex items-center justify-between border rounded-lg p-4 bg-muted/30">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
                          {botStatus === "start" || botStatus === "restart" ? (
                            <Pause className="w-4 h-4 text-primary" />
                          ) : (
                            <Play className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-sm">planner-bot docker</div>
                          <div className="text-xs text-muted-foreground">
                            {botStatus === "start" || botStatus === "restart" ? "Running" : "Stopped"}
                          </div>
                        </div>
                      </div>
                      <Badge
                        variant="secondary"
                        className={`capitalize ${
                          botStatus === "start" || botStatus === "restart"
                            ? "bg-green-600 text-white border-transparent"
                            : "bg-muted text-foreground border-transparent"
                        }`}
                      >
                        {botStatus === "start" || botStatus === "restart" ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  ) : (
                    /* Regular Telegram Bot Settings - Hide when Docker is selected */
                    <>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="telegram-active"
                          checked={telegramData.is_active}
                          onCheckedChange={(checked) => {
                            setTelegramData({ ...telegramData, is_active: !!checked });
                            void postTelegramUpdate({ is_active: !!checked });
                          }}
                        />
                        <Label htmlFor="telegram-active">Active</Label>
                      </div>

                      <div className="flex items-center justify-between">
                        <Label htmlFor="send-tasks">Send Tasks</Label>
                        <Switch
                          id="send-tasks"
                          checked={telegramData.send_tasks}
                          onCheckedChange={(checked) =>
                            setTelegramData({ ...telegramData, send_tasks: checked })
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="send-dollar-price">Send Dollar Price</Label>
                        <Switch
                          id="send-dollar-price"
                          checked={telegramData.send_dollar_price}
                          onCheckedChange={(checked) =>
                            setTelegramData({ ...telegramData, send_dollar_price: checked })
                          }
                        />
                      </div>
                      {telegramData.send_dollar_price && (
                        <div className="space-y-2 pl-4 border-l-2 border-muted">
                          <Label htmlFor="dollar-cmd">Dollar Command</Label>
                          <Input
                            id="dollar-cmd"
                            value={telegramData.dollar_price_cmd}
                            onChange={(e) =>
                              setTelegramData({ ...telegramData, dollar_price_cmd: e.target.value })
                            }
                            placeholder="/dollar"
                          />
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <Label htmlFor="send-gold-price">Send Gold Price</Label>
                        <Switch
                          id="send-gold-price"
                          checked={telegramData.send_gold_price}
                          onCheckedChange={(checked) =>
                            setTelegramData({ ...telegramData, send_gold_price: checked })
                          }
                        />
                      </div>
                      {telegramData.send_gold_price && (
                        <div className="space-y-2 pl-4 border-l-2 border-muted">
                          <Label htmlFor="gold-cmd">Gold Command</Label>
                          <Input
                            id="gold-cmd"
                            value={telegramData.gold_price_cmd}
                            onChange={(e) =>
                              setTelegramData({ ...telegramData, gold_price_cmd: e.target.value })
                            }
                            placeholder="/gold"
                          />
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label htmlFor="bot-name">Bot Name</Label>
                        <Input
                          id="bot-name"
                          value={telegramData.bot_name || ""}
                          onChange={(e) =>
                            setTelegramData({ ...telegramData, bot_name: e.target.value })
                          }
                          placeholder="Enter bot name"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="api-token">API Token</Label>
                        <Input
                          id="api-token"
                          value={telegramData.api_token || ""}
                          onChange={(e) =>
                            setTelegramData({ ...telegramData, api_token: e.target.value })
                          }
                          placeholder="Enter API token"
                        />
                      </div>

                      <Button
                        onClick={updateTelegramData}
                        disabled={savingTelegram}
                        className="w-full"
                      >
                        {savingTelegram ? "Saving..." : "Save Telegram Settings"}
                      </Button>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <label className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={!!telegramData.send_log}
                            onCheckedChange={(checked) =>
                              setTelegramData({ ...telegramData, send_log: !!checked })
                            }
                            id="send-log"
                          />
                          <span>Send Log</span>
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={!!telegramData.send_report}
                            onCheckedChange={(checked) => {
                              const val = !!checked;
                              setTelegramData({ ...telegramData, send_report: val });
                              if (val) {
                                void fetchAndSendSubmissions();
                              }
                            }
                            }
                            id="send-report"
                          />
                          <span>Send Report</span>
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={!!telegramData.send_tasks}
                            onCheckedChange={(checked) =>
                              setTelegramData({ ...telegramData, send_tasks: !!checked })
                            }
                            id="send-tasks"
                          />
                          <span>Send Tasks</span>
                        </label>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between border rounded-md p-4">
                          <div className="text-sm">
                            <div className="font-semibold">{telegramData.bot_name || "Bot Preview"}</div>
                            <div className="text-muted-foreground">@{(telegramData.bot_name || "your_bot").replace(/\s+/g, "_")}</div>
                          </div>
                          <Badge
                            variant="default"
                            className={`capitalize ${botStatus === "start"
                              ? "bg-green-600 text-white border-transparent"
                              : botStatus === "restart"
                                ? "bg-purple-600 text-white border-transparent"
                                : botStatus === "pause"
                                  ? "bg-red-600 text-white border-transparent"
                                  : "bg-muted text-foreground border-transparent"
                              }`}
                          >
                            {botStatus}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant={botStatus === "start" ? "default" : "outline"}
                            onClick={() => void handleBotAction("start")}
                          >
                            Start
                          </Button>
                          <Button
                            variant={botStatus === "restart" ? "default" : "outline"}
                            onClick={() => void handleBotAction("restart")}
                          >
                            Restart
                          </Button>
                          <Button
                            variant={botStatus === "pause" ? "default" : "outline"}
                            onClick={() => void handleBotAction("pause")}
                          >
                            Pause
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="text-lg font-semibold">Created Bots</div>
                        <div className="border rounded-md overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Bot Name</TableHead>
                                <TableHead>Owner</TableHead>
                                <TableHead>Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {telegramBots.map((b) => (
                                <TableRow 
                                  key={b.id} 
                                  className="group cursor-pointer"
                                  onClick={() => {
                                    // Sync the selected bot's data to the Bot Settings fields
                                    setTelegramData({
                                      ...telegramData,
                                      bot_name: b.bot_name || "",
                                      api_token: b.api_token || "",
                                      is_active: b.is_active
                                    });
                                  }}
                                >
                                  <TableCell className="relative">
                                    <span className="group-hover:opacity-0 transition-opacity duration-200">
                                      {b.bot_name || "-"}
                                    </span>
                                    <div className="absolute inset-0 flex items-center justify-end pr-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation(); // Prevent row click when deleting
                                          setBotToDelete(b);
                                          setIsDeleteDialogOpen(true);
                                        }}
                                        className="p-1 text-red-500 hover:text-red-700 hover:bg-red-100 rounded pointer-events-auto"
                                        title="Delete Bot"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </TableCell>
                                  <TableCell>{b.owner}</TableCell>
                                  <TableCell>
                                    <Badge variant={b.is_active ? "default" : "secondary"}>
                                      {b.is_active ? "Active" : "Inactive"}
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              ))}
                              {telegramBots.length === 0 && (
                                <TableRow>
                                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                                    No bots found
                                  </TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Database Operations Card - MOVED TO DIALOG */}
            {false && user?.developer && (
              <div className="bg-[var(--calendar-date-bg)] rounded-lg shadow-md border p-6">
                <h2 className="text-2xl font-bold mb-6">Database Operations</h2>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Export the entire database as a JSON file or import a previously exported database dump.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Button
                      onClick={handleExportDatabase}
                      disabled={isExporting}
                      className="flex-1"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      {isExporting ? "Exporting..." : "Export Database"}
                    </Button>
                    <div className="flex-1">
                      <input
                        type="file"
                        accept=".json"
                        ref={dbFileInputRef}
                        onChange={handleImportDatabase}
                        className="hidden"
                      />
                      <Button
                        onClick={() => dbFileInputRef.current?.click()}
                        disabled={isImporting}
                        className="w-full"
                        variant="outline"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        {isImporting ? "Importing..." : "Import Database"}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Google Sheets Integration Card - MOVED TO DIALOG */}
            {false && user?.developer && (
              <div className="bg-[var(--calendar-date-bg)] rounded-lg shadow-md border p-6">
                <h2 className="text-2xl font-bold mb-6">Google Sheets Integration</h2>
                <div className="space-y-6">
                  <p className="text-sm text-muted-foreground">
                    Sync your Django database with Google Sheets for backup and external access.
                  </p>

                  {/* Data Selection Checkboxes */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Select data to upload:</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <label className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={uploadUsers}
                          onCheckedChange={(checked) => setUploadUsers(!!checked)}
                          id="upload-users"
                        />
                        <span>Users Data</span>
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={uploadSubmissions}
                          onCheckedChange={(checked) => setUploadSubmissions(!!checked)}
                          id="upload-submissions"
                        />
                        <span>Submissions</span>
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={uploadReports}
                          onCheckedChange={(checked) => setUploadReports(!!checked)}
                          id="upload-reports"
                        />
                        <span>Reports</span>
                      </label>
                    </div>
                  </div>

                  {/* SAE Data on Telegram Toggle */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="sae-data-telegram" className="text-sm font-medium">
                          SAE Data on Telegram
                        </Label>
                        {saeDataOnTelegram && (
                          <button
                            onClick={handleManualSaeSync}
                            disabled={isManualSync}
                            className="p-1 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 disabled:opacity-50"
                            title="Sync Now"
                          >
                            <RefreshCw className={`w-3 h-3 ${isManualSync ? 'animate-spin' : ''}`} />
                          </button>
                        )}
                      </div>
                      <Switch
                        id="sae-data-telegram"
                        checked={saeDataOnTelegram}
                        onCheckedChange={(checked) => {
                          setSaeDataOnTelegram(checked);
                          void saveSaeDataSettings();
                        }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Enable this to save website data to Telegram
                    </p>
                    
                    {/* Automation Settings - Show when toggle is on */}
                    {saeDataOnTelegram && (
                      <div className="space-y-3 pl-4 border-l-2 border-muted">
                        <div className="flex items-center space-x-3">
                          <Label htmlFor="sae-automation-hours" className="text-sm font-medium whitespace-nowrap">
                            Automation every
                          </Label>
                          <Input
                            id="sae-automation-hours"
                            type="number"
                            min="1"
                            max="24"
                            value={saeAutomationHours}
                            onChange={(e) => {
                              const value = parseInt(e.target.value) || 1;
                              setSaeAutomationHours(value);
                              void saveSaeDataSettings();
                            }}
                            className="w-20 text-sm"
                          />
                          <span className="text-sm text-muted-foreground">hours</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Set the automatic sync interval for saving data to Telegram
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Manual Sync Buttons */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Button
                      onClick={handleUploadToGoogleSheets}
                      disabled={isUploadingToSheets}
                      className="flex-1"
                    >
                      <CloudUpload className="w-4 h-4 mr-2" />
                      {isUploadingToSheets ? "Uploading..." : "Upload to Google Sheets"}
                    </Button>
                    <Button
                      onClick={handleDownloadFromGoogleSheets}
                      disabled={isDownloadingFromSheets}
                      variant="outline"
                      className="flex-1"
                    >
                      <CloudDownload className="w-4 h-4 mr-2" />
                      {isDownloadingFromSheets ? "Downloading..." : "Download from Google Sheets"}
                    </Button>
                  </div>

                  {/* Auto-Sync Settings */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="auto-sync" className="text-sm font-medium">
                        Enable Automatic Sync
                      </Label>
                      <Switch
                        id="auto-sync"
                        checked={autoSyncEnabled}
                        onCheckedChange={(checked) => {
                          setAutoSyncEnabled(checked);
                          void saveGoogleSheetsSettings();
                        }}
                      />
                    </div>

                    {autoSyncEnabled && (
                      <div className="space-y-3">
                        <div className="flex items-center space-x-3">
                          <Label htmlFor="sync-interval" className="text-sm font-medium whitespace-nowrap">
                            Sync every
                          </Label>
                          <Select
                            value={syncInterval.toString()}
                            onValueChange={(value) => {
                              const interval = parseInt(value);
                              setSyncInterval(interval);
                              if (autoSyncEnabled) {
                                void saveGoogleSheetsSettings();
                              }
                            }}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">1 hour</SelectItem>
                              <SelectItem value="6">6 hours</SelectItem>
                              <SelectItem value="10">10 hours</SelectItem>
                              <SelectItem value="12">12 hours</SelectItem>
                              <SelectItem value="24">24 hours</SelectItem>
                            </SelectContent>
                          </Select>
                          <span className="text-sm text-muted-foreground">hours</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Sync Status */}
                  {lastSyncTime && (
                    <div className="bg-muted/50 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-sm">
                        <RefreshCw className="w-4 h-4" />
                        <span>Last sync: {lastSyncTime}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Share Group Dialog */}
        <Dialog open={!!sharingGroup} onOpenChange={(open) => !open && setSharingGroup(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Share Group</DialogTitle>
              <DialogDescription>
                Share this 6-digit code with others so they can join <b>{sharingGroup?.name}</b>.
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center justify-center p-6 bg-muted/30 rounded-xl border-2 border-dashed border-primary/20 my-4">
              <span className="text-5xl font-black tracking-[0.5em] text-primary font-mono ml-[0.5em]">
                {sharingGroup?.code}
              </span>
            </div>
            <div className="flex justify-center">
              <Button 
                variant="outline" 
                onClick={() => {
                  if (sharingGroup?.code) {
                    const code = sharingGroup.code;
                    // Robust copy logic
                    if (navigator.clipboard && window.isSecureContext) {
                      void navigator.clipboard.writeText(code).then(() => {
                        toast.success("Code copied to clipboard!");
                      }).catch(() => {
                        // Fallback if promise fails
                        const textArea = document.createElement("textarea");
                        textArea.value = code;
                        document.body.appendChild(textArea);
                        textArea.select();
                        try {
                          document.execCommand('copy');
                          toast.success("Code copied to clipboard!");
                        } catch (err) {
                          console.error('Fallback copy failed', err);
                        }
                        document.body.removeChild(textArea);
                      });
                    } else {
                      // Fallback for non-secure contexts
                      const textArea = document.createElement("textarea");
                      textArea.value = code;
                      document.body.appendChild(textArea);
                      textArea.select();
                      try {
                        document.execCommand('copy');
                        toast.success("Code copied to clipboard!");
                      } catch (err) {
                        console.error('Fallback copy failed', err);
                      }
                      document.body.removeChild(textArea);
                    }
                  }
                }}
                className="gap-2"
              >
                Copy Code
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Group Deletion Confirmation */}
        <AlertDialog open={!!groupToDelete} onOpenChange={(open) => !open && setGroupToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Group</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete group "{groupToDelete?.name}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeletingGroup}>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={(e) => {
                  e.preventDefault();
                  void confirmDeleteGroup();
                }}
                disabled={isDeletingGroup}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeletingGroup ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Submissions Deletion Confirmation */}
        <AlertDialog open={showDeleteSubmissionsConfirm} onOpenChange={setShowDeleteSubmissionsConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Submissions</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete {selectedSubmissions.size} selected submission(s)? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deletingSubmissions}>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={(e) => {
                  e.preventDefault();
                  void confirmDeleteSubmissions();
                }}
                disabled={deletingSubmissions}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deletingSubmissions ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData({ ...formData, [id]: value });

    if (id === "email" && !isSignIn) {
      const username = value.split("@")[0];
      setFormData(prev => ({ ...prev, username }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const url = isSignIn
        ? `${API_BASE_URL}/auth/login`
        : `${API_BASE_URL}/auth/register`;

      const requestData = isSignIn
        ? { 
            // Send as email if it contains @, otherwise as username
            ...(formData.email.includes('@') 
              ? { email: formData.email } 
              : { username: formData.email }
            ),
            password: formData.password 
          }
        : {
            name: formData.name,
            email: formData.email,
            username: formData.username,
            password: formData.password,
            password2: formData.password2,
          };

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      });

      const data = await response.json();

      if (response.ok) {
        if (isSignIn) {
          login(data.user, data.token);
          navigate("/planner");
        } else {
          setIsSignIn(true);
          setFormData({
            name: "",
            email: "",
            password: "",
            password2: "",
            username: "",
          });
        }
      } else {
        setError(data.error || "An error occurred");
      }
    } catch (err) {
      setError("Network error. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground">
      <div className="w-full max-w-md p-8 space-y-6 bg-[var(--calendar-date-bg)] rounded-lg shadow-md border">
        <h2 className="text-3xl font-bold text-center">
          {isSignIn ? "Sign In" : "Sign Up"}
        </h2>

        {error && (
          <div className="p-3 bg-red-100/50 border border-red-400/50 text-red-700 rounded-md">
            {error}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          {!isSignIn && (
            <div>
              <label htmlFor="name" className="block mb-2 text-sm font-medium">
                Name
              </label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-input rounded-md bg-background/50 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Your name"
                required={!isSignIn}
              />
            </div>
          )}

          <div>
            <label htmlFor="email" className="block mb-2 text-sm font-medium">
              {isSignIn ? "Email or Username" : "Email"}
            </label>
            <input
              type={isSignIn ? "text" : "email"}
              id="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-input rounded-md bg-background/50 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder={isSignIn ? "your@email.com or username" : "your@email.com"}
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block mb-2 text-sm font-medium">
              Password
            </label>
            <input
              type="password"
              id="password"
              value={formData.password}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-input rounded-md bg-background/50 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {loading ? "Processing..." : (isSignIn ? "Sign In" : "Sign Up")}
          </button>
        </form>

        {/* OAuth Buttons */}
        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-muted-foreground/20" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>
          
          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={() => {
                // TODO: Implement Google OAuth
                console.log('Google OAuth clicked');
              }}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-input rounded-md bg-background hover:bg-accent hover:text-accent-foreground transition-colors group"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span className="text-sm font-medium">Google</span>
            </button>
            
            <button
              type="button"
              onClick={() => {
                // TODO: Implement GitHub OAuth
                console.log('GitHub OAuth clicked');
              }}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-input rounded-md bg-background hover:bg-accent hover:text-accent-foreground transition-colors group"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd"/>
              </svg>
              <span className="text-sm font-medium">GitHub</span>
            </button>
          </div>
        </div>

        <div className="text-center mt-6">
          <button
            onClick={() => {
              setIsSignIn(!isSignIn);
              setError(null);
            }}
            className="text-primary hover:underline"
            disabled={loading}
          >
            {isSignIn
              ? "Don't have an account? Sign Up"
              : "Already have an account? Sign In"}
          </button>
        </div>
      </div>
    </div>
  );
}
