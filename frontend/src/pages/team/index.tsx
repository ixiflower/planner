import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogOverlay,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import { BACKEND_URL } from "@/config/backend";
import { useAuth } from "@/contexts/AuthContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Upload,
  X,
  Image as ImageIcon,
  Loader2,
  ZoomIn,
  ZoomOut,
  Trash2,
  MessageCircle,
  MoreVertical,
  GripVertical,
  Paperclip,
  Search,
  Bookmark,
} from "lucide-react";
import EnhancedChatWindow from '@/components/chat/EnhancedChatWindow';

type Filter = "All" | "Leader" | "Mod" | "Member";

type TeamUser = {
  id: string;
  name: string;
  role: string;
  type: Filter;
  avatarUrl?: string;
  telegramId?: string;
  isDeveloper?: boolean;
  last_seen?: string;
  is_online?: boolean;
  hasUnreadMessages?: boolean;
};

type FileItem = {
  id: string;
  name: string;
  url: string;
  uploaded_by: string; // Name of uploader
  uploaded_by_id: string;
  recipient: string; // Name of recipient or "Everyone" or "All Leaders" etc.
  is_public: boolean;
  target_role: string | null;
  uploaded_at: string; // ISO string date
};

type Task = {
  id: string;
  title?: string;
  text: string;
  done: boolean;
};

export default function TeamPage() {
  const { user, token } = useAuth();

  // Helper functions for cookie
  const setCookie = (name: string, value: string, days: number) => {
    let expires = "";
    if (days) {
      const date = new Date();
      date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
      expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "") + expires + "; path=/";
  };

  const getCookie = (name: string): string | null => {
    const nameEQ = name + "=";
    const ca = document.cookie.split(";");
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === " ") c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
  };

  const [users, setUsers] = useState<TeamUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("All");

  // Load saved tab preference from localStorage
  const [activeTab, setActiveTab] = useState<"members" | "chat">(() => {
    const savedTab = localStorage.getItem('team-active-tab');
    return savedTab === 'chat' ? 'chat' : 'members';
  });
  const [selectedChat, setSelectedChat] = useState<
    { type: "general" } | { type: "dm"; user: TeamUser } | { type: "saved" } | null
  >({ type: "general" });
  const [chatRooms, setChatRooms] = useState<any[]>([]);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  
  // Debug log for selectedRoomId (commented to prevent infinite loop)
  // console.log("🔍 Current selectedRoomId:", selectedRoomId, "messageInput enabled:", !!selectedRoomId);
  const [searchQuery, setSearchQuery] = useState("");
  const [savedMessages, setSavedMessages] = useState<any[]>([]);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const messagesScrollRef = useRef<HTMLDivElement>(null);

  // Helper function to format time ago
  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const messageTime = new Date(timestamp);
    const diffMs = now.getTime() - messageTime.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 1) return 'just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return messageTime.toLocaleDateString();
  };

  const [sidebarWidth, setSidebarWidth] = useState(320);
  const isResizing = useRef(false);

  const startResizing = useCallback(() => {
    isResizing.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, []);

  const stopResizing = useCallback(() => {
    isResizing.current = false;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }, []);

  const resize = useCallback((mouseMoveEvent: MouseEvent) => {
    if (isResizing.current) {
      setSidebarWidth((prevWidth) => {
        const newWidth = prevWidth + mouseMoveEvent.movementX;
        if (newWidth < 200) return 200;
        if (newWidth > 600) return 600;
        return newWidth;
      });
    }
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", resize);
    window.addEventListener("mouseup", stopResizing);
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [resize, stopResizing]);

  // floating chat popups (used from Members tab)
  const [chatTargets, setChatTargets] = useState<TeamUser[]>([]);

  // Chat functions
  const fetchChatRooms = useCallback(async () => {
    if (!token) {
      console.error("❌ No token available for fetching chat rooms");
      return;
    }
    console.log("📂 Fetching chat rooms...");
    console.log("🔑 Using token for rooms:", token ? `${token.substring(0, 20)}...` : "No token");
    try {
      const response = await fetch(`${BACKEND_URL}/tickets/api/chat/my-rooms/`, {
        headers: {
          Authorization: token,
          "Content-Type": "application/json",
        },
      });
      if (response.ok) {
        const data = await response.json();
        setChatRooms(data);
      }
    } catch (error) {
      console.error("Failed to fetch chat rooms:", error);
    }
  }, [token]);

  const fetchChatMessages = useCallback(async (roomId: number) => {
    if (!token) {
      console.error("❌ No token for fetching messages");
      return;
    }
    console.log("📨 Fetching messages for room:", roomId);
    setIsLoadingMessages(true);
    try {
      const response = await fetch(`${BACKEND_URL}/tickets/api/chat/room/${roomId}/messages/`, {
        headers: {
          Authorization: token,
          "Content-Type": "application/json",
        },
      });
      console.log("📨 Messages response:", response.status);
      if (response.ok) {
        const data = await response.json();
        console.log("✅ Messages data:", data);
        setChatMessages(data.messages || []);
        
        // Auto-scroll to bottom after loading messages
        setTimeout(() => {
          if (messagesScrollRef.current) {
            messagesScrollRef.current.scrollIntoView({ behavior: "smooth" });
          }
        }, 500); // Extra delay for message rendering
      } else {
        console.error("❌ Messages failed:", await response.text());
        setChatMessages([]);
      }
    } catch (error) {
      console.error("❌ Failed to fetch chat messages:", error);
      setChatMessages([]);
    } finally {
      setIsLoadingMessages(false);
    }
  }, [token]);

  const sendMessage = useCallback(async (content: string, imageFile?: File) => {
    if (!token || !selectedRoomId || (!content.trim() && !imageFile)) return;

    try {
      const formData = new FormData();
      if (content.trim()) {
        formData.append("message", content);
      }
      if (imageFile) {
        formData.append("image", imageFile);
      }

      const response = await fetch(`${BACKEND_URL}/tickets/api/chat/room/${selectedRoomId}/send/`, {
        method: "POST",
        headers: {
          Authorization: token,
        },
        body: formData,
      });

      if (response.ok) {
        setMessageInput("");
        // Refresh messages to show the new one
        fetchChatMessages(selectedRoomId);
      } else {
        console.error("Failed to send message");
      }
    } catch (error) {
      console.error("Error sending message:", error);
    }
  }, [token, selectedRoomId, fetchChatMessages]);

  const getOrCreateChatRoom = useCallback(async (targetUserId: number) => {
    if (!token) {
      console.error("❌ No token for creating chat room");
      return null;
    }
    console.log("🏠 Creating/getting chat room for user:", targetUserId);
    try {
      const response = await fetch(`${BACKEND_URL}/tickets/api/chat/room/${targetUserId}/`, {
        method: "POST",
        headers: {
          Authorization: token,
          "Content-Type": "application/json",
        },
      });
      console.log("🏠 Chat room response:", response.status);
      if (response.ok) {
        const data = await response.json();
        console.log("✅ Chat room data:", data);
        return data.chat_room_id || data.room_id;
      } else {
        console.error("❌ Chat room failed:", await response.text());
      }
    } catch (error) {
      console.error("❌ Failed to create chat room:", error);
    }
    return null;
  }, [token]);

  const handleChatSelect = useCallback(async (chatType: "general" | "dm" | "saved", targetUser?: TeamUser) => {
    console.log("🔍 Chat select called:", chatType, targetUser?.username);
    console.log("🔑 Token:", token ? "Present" : "Missing");
    
    if (chatType === "saved") {
      console.log("💾 Opening saved messages...");
      setSelectedRoomId(null);
      setSelectedChat({ type: "saved" });
      // Get saved messages from localStorage directly to avoid dependency loop
      const saved = localStorage.getItem(`saved-messages-${user?.id}`);
      const messages = saved ? JSON.parse(saved) : [];
      setChatMessages(messages);
      setIsLoadingMessages(false);
    } else if (chatType === "general") {
      // Clear any existing state first
      setSelectedRoomId(null);
      setSelectedChat({ type: "general" });
      setChatMessages([]);
      setIsLoadingMessages(true);
      
      // Get general room
      try {
        console.log("📡 Fetching general room...");
        console.log("🔑 Using token:", token ? `${token.substring(0, 20)}...` : "No token");
        const response = await fetch(`${BACKEND_URL}/tickets/api/chat/general/`, {
          headers: {
            Authorization: token || "",
            "Content-Type": "application/json",
          },
        });
        console.log("📡 General room response:", response.status);
        if (response.ok) {
          const data = await response.json();
          console.log("✅ General room data:", data);
          console.log("✅ General room ID field:", data.room_id);
          console.log("✅ General room keys:", Object.keys(data));
          
          const roomId = data.chat_room_id || data.room_id || data.id || data.room?.id;
          console.log("✅ Final room ID:", roomId);
          
          if (roomId) {
            console.log("🎯 Setting room ID:", roomId);
            setSelectedRoomId(roomId);
            setSelectedChat({ type: "general" });
            console.log("🎯 Room ID set, fetching messages...");
            // Add a small delay to ensure state is set before fetching
            setTimeout(() => {
              fetchChatMessages(roomId);
            }, 100);
          } else {
            console.error("❌ No room ID found in general room data");
            // Try to fetch messages anyway with a fallback room ID
            console.log("🔄 Trying fallback: fetching messages without room ID...");
            try {
              const messagesResponse = await fetch(`${BACKEND_URL}/tickets/api/chat/general/`, {
                headers: {
                  Authorization: token || "",
                  "Content-Type": "application/json",
                },
              });
              if (messagesResponse.ok) {
                const messagesData = await messagesResponse.json();
                console.log("✅ Fallback messages data:", messagesData);
                setChatMessages(messagesData.messages || []);
              }
            } catch (fallbackError) {
              console.error("❌ Fallback also failed:", fallbackError);
            }
            setIsLoadingMessages(false);
          }
        } else {
          console.error("❌ General room failed:", await response.text());
          setIsLoadingMessages(false);
        }
      } catch (error) {
        console.error("❌ Failed to get general room:", error);
        setIsLoadingMessages(false);
      }
    } else if (targetUser) {
      console.log("👤 Getting DM room for user:", targetUser.id);
      const roomId = await getOrCreateChatRoom(targetUser.id);
      if (roomId) {
        console.log("✅ Got DM room ID:", roomId);
        setSelectedRoomId(roomId);
        setSelectedChat({ type: "dm", user: targetUser });
        fetchChatMessages(roomId);
      } else {
        console.error("❌ Failed to get DM room for user:", targetUser.id);
      }
    }
  }, [token, getOrCreateChatRoom, fetchChatMessages]);

  const handleFileUpload = useCallback((file: File) => {
    // Instead of sending immediately, show preview
    setSelectedImageFile(file);
    const previewUrl = URL.createObjectURL(file);
    setImagePreviewUrl(previewUrl);
  }, []);

  const handleRemoveImage = useCallback(() => {
    setSelectedImageFile(null);
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
      setImagePreviewUrl(null);
    }
  }, [imagePreviewUrl]);

  const handleSendMessage = useCallback(() => {
    if (messageInput.trim() || selectedImageFile) {
      sendMessage(messageInput, selectedImageFile || undefined);
      // Clear image preview after sending
      if (selectedImageFile) {
        handleRemoveImage();
      }
    }
  }, [messageInput, selectedImageFile, sendMessage, handleRemoveImage]);

  // Handle tab change and save to localStorage
  const handleTabChange = useCallback((newTab: "members" | "chat") => {
    setActiveTab(newTab);
    localStorage.setItem('team-active-tab', newTab);
  }, []);

  // Fetch saved messages
  const fetchSavedMessages = useCallback(async () => {
    if (!token) return;
    try {
      // For now, we'll filter saved messages from all rooms
      // You can create a dedicated backend endpoint for saved messages later
      const saved = localStorage.getItem(`saved-messages-${user?.id}`);
      if (saved) {
        setSavedMessages(JSON.parse(saved));
      }
    } catch (error) {
      console.error("Failed to fetch saved messages:", error);
    }
  }, [token, user?.id]);

  // Toggle save message
  const toggleSaveMessage = useCallback(async (message: any) => {
    try {
      const saved = localStorage.getItem(`saved-messages-${user?.id}`);
      let savedList = saved ? JSON.parse(saved) : [];
      
      const existingIndex = savedList.findIndex((m: any) => m.id === message.id);
      
      if (existingIndex >= 0) {
        // Remove from saved
        savedList.splice(existingIndex, 1);
      } else {
        // Add to saved
        savedList.push({
          ...message,
          saved_at: new Date().toISOString(),
        });
      }
      
      localStorage.setItem(`saved-messages-${user?.id}`, JSON.stringify(savedList));
      setSavedMessages(savedList);
      
      // Update the current messages to reflect save status
      setChatMessages(prev => prev.map(m => 
        m.id === message.id 
          ? { ...m, is_saved: existingIndex < 0 }
          : m
      ));
      
    } catch (error) {
      console.error("Failed to toggle save message:", error);
    }
  }, [user?.id]);

  // Check if message is saved
  const isMessageSaved = useCallback((messageId: number) => {
    return savedMessages.some(m => m.id === messageId);
  }, [savedMessages]);


  const openMemberChat = useCallback((target: TeamUser) => {
    // Keep the user on the Members tab but open a floating chat window (popup)
    setChatTargets((prev) => {
      // If already open, move it to the end (top-most) instead of duplicating
      const without = prev.filter((u) => u.id !== target.id);
      return [...without, target];
    });

    // Mark unread badge as seen when opening the chat
    setUsers((prevUsers) =>
      prevUsers.map((u) =>
        u.id === target.id ? { ...u, hasUnreadMessages: false } : u
      )
    );
  }, []);
  const leaders = useMemo(
    () => users.filter((u) => u.type === "Leader"),
    [users]
  );
  const mods = useMemo(() => users.filter((u) => u.type === "Mod"), [users]);
  const members = useMemo(
    () => users.filter((u) => u.type === "Member"),
    [users]
  );
  const [openUserId, setOpenUserId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<TeamUser | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskText, setNewTaskText] = useState("");
  const [isAddingTask, setIsAddingTask] = useState(false);
  const today = useMemo(() => new Date(), []);
  const [roleChangeDialog, setRoleChangeDialog] = useState<{
    open: boolean;
    userId?: string;
    newRole?: string;
    userName?: string;
  }>({ open: false });

  // Upload state
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [recipientId, setRecipientId] = useState<string>("all");

  // Uploads Gallery state
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<FileItem[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [selectedFileForViewer, setSelectedFileForViewer] =
    useState<FileItem | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/team/`, {
          headers: {
            Authorization: token || "",
            "Content-Type": "application/json",
          },
        });

        if (response.ok) {
          const data = await response.json();
          const mapped = Array.isArray(data.users)
            ? data.users.map((u: any) => ({
                ...u,
                isDeveloper: u.developer ?? u.isDeveloper ?? false,
              }))
            : [];
          setUsers(mapped);
        }
      } catch (error) {
        console.error("Failed to fetch users:", error);
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchUsers();
    }
  }, [token]);

  // Effect to save chat target to cookie
  useEffect(() => {
    if (chatTargets.length > 0) {
      setCookie("openChatUserId", chatTargets[0].id, 7); // Save for 7 days
    } else {
      setCookie("openChatUserId", "", -1); // Clear cookie if no chat is open
    }
  }, [chatTargets]);

  // Effect to load chat target from cookie
  useEffect(() => {
    const savedUserId = getCookie("openChatUserId");
    if (savedUserId && users.length > 0) {
      const userToRestore = users.find((u) => u.id === savedUserId);
      if (userToRestore) {
        setChatTargets([userToRestore]);
      }
    }
  }, [users]); // Trigger when users list is loaded

  // Effect to fetch unread message counts
  // Fetch chat rooms when component loads
  useEffect(() => {
    if (token) {
      fetchChatRooms();
      fetchSavedMessages();
    }
  }, [token, fetchChatRooms, fetchSavedMessages]);

  // Auto-load general chat when chat tab is first accessed
  useEffect(() => {
    if (activeTab === "chat" && token && selectedChat?.type === "general" && !selectedRoomId && chatMessages.length === 0 && !isLoadingMessages) {
      console.log("🚀 Auto-loading general chat on first visit...");
      handleChatSelect("general");
    }
  }, [activeTab, token, selectedChat, selectedRoomId, chatMessages.length, isLoadingMessages, handleChatSelect]);

  // Auto-scroll to bottom when messages change or load initially
  useEffect(() => {
    if (messagesScrollRef.current && chatMessages.length > 0) {
      setTimeout(() => {
        messagesScrollRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 200); // Increased delay for initial load
    }
  }, [chatMessages]);

  // Auto-scroll to bottom when chat is selected (for initial load)
  useEffect(() => {
    if (selectedChat?.type === "general" && chatMessages.length > 0 && messagesScrollRef.current) {
      setTimeout(() => {
        messagesScrollRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 300); // Extra delay for chat selection
    }
  }, [selectedChat, chatMessages.length]);

  useEffect(() => {
    const fetchUnreadCounts = async () => {
      if (!token) return;

      try {
        const response = await fetch(
          `${BACKEND_URL}/tickets/api/chat/my-rooms/`,
          {
            headers: {
              Authorization: token || "",
              "Content-Type": "application/json",
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          const chatRooms = Array.isArray(data) ? data : data.rooms || []; // Assume it's data.rooms or directly an array

          // Create a map for quick lookup of unread counts by target_user_id
          const unreadMap = new Map<string, number>();
          chatRooms.forEach((room: any) => {
            if (room.target_user_id && room.unread_count > 0) {
              unreadMap.set(String(room.target_user_id), room.unread_count);
            }
          });

          setUsers((prevUsers) =>
            prevUsers.map((u) => ({
              ...u,
              hasUnreadMessages: unreadMap.has(u.id),
            }))
          );
        }
      } catch (error) {
        console.error("Failed to fetch unread message counts:", error);
      }
    };

    // Fetch only once when the component mounts or when token changes
    fetchUnreadCounts();
  }, [token]); // Only depend on token, not users

  useEffect(() => {
    if (galleryOpen && token) {
      fetchFiles();
    }
  }, [galleryOpen, token]);

  const fetchFiles = async () => {
    setLoadingFiles(true);
    try {
      const response = await fetch(`${BACKEND_URL}/tickets/api/files/`, {
        headers: { Authorization: token || "" },
      });
      if (response.ok) {
        const data = await response.json();
        setUploadedFiles(data.files || []);
      }
    } catch (error) {
      console.error("Failed to fetch files:", error);
    } finally {
      setLoadingFiles(false);
    }
  };

  useEffect(() => {
    const fetchTasks = async () => {
      if (!openUserId || !token) return;

      try {
        const isoDate = format(today, "yyyy-MM-dd");
        const response = await fetch(
          `${BACKEND_URL}/tickets/api/assigned-tasks/?userId=${openUserId}&date=${isoDate}`,
          {
            headers: {
              Authorization: token,
              "Content-Type": "application/json",
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          setTasks(data.tasks || []);
        }
      } catch (error) {
        console.error("Failed to fetch tasks:", error);
      }
    };

    fetchTasks();
  }, [openUserId, token, today]);

  const openManage = (userId: string) => {
    const user = users.find((u) => u.id === userId) || null;
    setSelectedUser(user);
    setOpenUserId(userId);
    setNewTaskTitle("");
    setNewTaskText("");
  };

  const toggleDeveloper = async (userId: string, value: boolean) => {
    if (!token) return;
    try {
      const response = await fetch(`${BACKEND_URL}/api/team/update-user/`, {
        method: "PATCH",
        headers: {
          Authorization: token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId, developer: value }),
      });
      if (response.ok) {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, isDeveloper: value } : u))
        );
      }
    } catch (error) {
      console.error("Failed to update developer flag:", error);
    }
  };

  const closeManage = () => {
    setOpenUserId(null);
    setSelectedUser(null);
    setTasks([]);
  };

  const addTask = async () => {
    if (
      isAddingTask ||
      (!newTaskTitle.trim() && !newTaskText.trim()) ||
      !openUserId ||
      !token
    )
      return;

    setIsAddingTask(true);
    try {
      const isoDate = format(today, "yyyy-MM-dd");
      const response = await fetch(
        `${BACKEND_URL}/tickets/api/assigned-tasks/`,
        {
          method: "POST",
          headers: {
            Authorization: token,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: openUserId,
            date: isoDate,
            tasks: [
              ...tasks,
              { title: newTaskTitle, text: newTaskText, done: false },
            ],
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setTasks(data.tasks);
        setNewTaskTitle("");
        setNewTaskText("");
      }
    } catch (error) {
      console.error("Failed to add task:", error);
    } finally {
      setIsAddingTask(false);
    }
  };

  const removeTask = async (id: string) => {
    if (!openUserId || !token) return;

    try {
      const updatedTasks = tasks.filter((t) => t.id !== id);
      const isoDate = format(today, "yyyy-MM-dd");

      const response = await fetch(
        `${BACKEND_URL}/tickets/api/assigned-tasks/`,
        {
          method: "POST",
          headers: {
            Authorization: token,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: openUserId,
            date: isoDate,
            tasks: updatedTasks,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setTasks(data.tasks);
      }
    } catch (error) {
      console.error("Failed to remove task:", error);
    }
  };

  const toggleTask = async (id: string) => {
    if (!openUserId || !token) return;

    try {
      const updatedTasks = tasks.map((t) =>
        t.id === id ? { ...t, done: !t.done } : t
      );

      const isoDate = format(today, "yyyy-MM-dd");
      const response = await fetch(
        `${BACKEND_URL}/tickets/api/assigned-tasks/`,
        {
          method: "POST",
          headers: {
            Authorization: token,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: openUserId,
            date: isoDate,
            tasks: updatedTasks,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setTasks(data.tasks);
      }
    } catch (error) {
      console.error("Failed to toggle task:", error);
    }
  };

  const updateTask = async (id: string, title: string, text: string) => {
    if (!openUserId || !token) return;

    try {
      const updatedTasks = tasks.map((t) =>
        t.id === id ? { ...t, title, text } : t
      );

      const isoDate = format(today, "yyyy-MM-dd");
      const response = await fetch(
        `${BACKEND_URL}/tickets/api/assigned-tasks/`,
        {
          method: "POST",
          headers: {
            Authorization: token,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: openUserId,
            date: isoDate,
            tasks: updatedTasks,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setTasks(data.tasks);
      }
    } catch (error) {
      console.error("Failed to update task:", error);
    }
  };

  // Check if current user can manage tasks for a given user role
  const canManageTasks = (targetUserRole: string) => {
    // If no user data, assume no permissions
    if (!user) return false;

    // Get current user's role
    const currentUserRole = user.team_role || "Member";

    // Leaders can manage everyone's tasks
    if (currentUserRole === "Leader") return true;

    // Moderators can manage members' tasks but not leaders' or other moderators' tasks
    if (currentUserRole === "Mod") {
      return targetUserRole === "Member";
    }

    // Members cannot manage anyone's tasks
    return false;
  };

  // Request role change with confirmation
  const requestRoleChange = (userId: string, newRole: string) => {
    const targetUser = users.find((u) => u.id === userId);
    if (targetUser) {
      setRoleChangeDialog({
        open: true,
        userId,
        newRole,
        userName: targetUser.name,
      });
    }
  };

  // Confirm and update user role
  const confirmRoleChange = async () => {
    if (!token || !roleChangeDialog.userId || !roleChangeDialog.newRole) return;

    try {
      const response = await fetch(`${BACKEND_URL}/api/team/update-user/`, {
        method: "PATCH",
        headers: {
          Authorization: token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: roleChangeDialog.userId,
          team_role: roleChangeDialog.newRole,
        }),
      });

      if (response.ok) {
        // Update the user in the local state
        setUsers((prevUsers) =>
          prevUsers.map((u) =>
            u.id === roleChangeDialog.userId
              ? {
                  ...u,
                  role: roleChangeDialog.newRole!,
                  type: roleChangeDialog.newRole as Filter,
                }
              : u
          )
        );
        toast.success("User role updated successfully");
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to update user role");
      }
    } catch (error) {
      console.error("Failed to update user role:", error);
      toast.error("Failed to update user role");
    } finally {
      setRoleChangeDialog({ open: false });
    }
  };

  // Cancel role change
  const cancelRoleChange = () => {
    setRoleChangeDialog({ open: false });
  };

  // Handle Drag & Drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith("image/")) {
        setUploadFile(file);
      } else {
        toast.error("Please select an image file");
      }
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type.startsWith("image/")) {
        setUploadFile(file);
      } else {
        toast.error("Please select an image file");
      }
    }
  };

  const handleUpload = async () => {
    if (!uploadFile || !token) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", uploadFile);
    formData.append("recipient_id", recipientId);

    try {
      const response = await fetch(`${BACKEND_URL}/tickets/api/api/upload/`, {
        method: "POST",
        headers: {
          Authorization: token,
        },
        body: formData,
      });

      if (response.ok) {
        toast.success("Image uploaded successfully");
        setUploadFile(null);
        setUploadDialogOpen(false);
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to upload image");
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("An error occurred while uploading");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteFile = async (fileId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!token) return;

    if (!window.confirm("Are you sure you want to delete this file?")) return;

    try {
      const response = await fetch(
        `${BACKEND_URL}/tickets/api/files/${fileId}/`,
        {
          method: "DELETE",
          headers: {
            Authorization: token,
          },
        }
      );

      if (response.ok) {
        toast.success("File deleted successfully");
        setUploadedFiles((prev) => prev.filter((f) => f.id !== fileId));
        if (selectedFileForViewer?.id === fileId) {
          setViewerOpen(false);
          setSelectedFileForViewer(null);
        }
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to delete file");
      }
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("An error occurred while deleting");
    }
  };

  if (loading) {
    return <div className="px-4 md:px-8 py-6">Loading team members...</div>;
  }

  const currentUserRole = user?.team_role || "Member";
  const isCurrentUserDeveloper = user?.developer || false;
  const isCurrentUserLeader = currentUserRole === "Leader";

  return (
    <div className="main h-[100svh] p-4 pb-24">
      <Card className="h-full min-h-0">
        <Tabs
          value={activeTab}
          onValueChange={(v) => handleTabChange(v as "members" | "chat")}
          className="h-full min-h-0 flex flex-col"
        >
          <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-2 shrink-0">
            <div className="flex flex-col space-y-1.5">
              <CardTitle>Ecode Chat</CardTitle>
            </div>
            <div className="flex flex-col md:flex-row flex-wrap gap-2 w-full md:w-auto">
              <div className="inline-flex items-center rounded-md bg-background border border-input text-muted-foreground w-full md:w-auto h-9">
                <button
                  className={`h-9 rounded-l-md px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 flex-1 ${
                    activeTab === "members"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted hover:bg-accent hover:text-accent-foreground"
                  }`}
                  onClick={() => handleTabChange("members")}
                >
                  Members
                </button>
                <div className="w-px h-6 bg-border"></div>
                <button
                  className={`h-9 rounded-r-md px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 flex-1 ${
                    activeTab === "chat"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted hover:bg-accent hover:text-accent-foreground"
                  }`}
                  onClick={() => handleTabChange("chat")}
                >
                  Chat
                </button>
              </div>

              <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 h-9"
                  style={{ height: "36px" }}
                  onClick={() => setGalleryOpen(true)}
                >
                  <ImageIcon className="mr-2 h-4 w-4" />
                  View Uploads
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 h-9"
                  style={{ height: "36px" }}
                  onClick={() => setUploadDialogOpen(true)}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Image
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="h-full overflow-hidden min-h-0 pt-6 flex-1">
            <TabsContent
              value="members"
              className="h-full min-h-0 flex flex-col flex-1"
            >
              <div className="flex items-center justify-between gap-3 mb-4">
                <ToggleGroup
                  type="single"
                  value={filter}
                  onValueChange={(v) => v && setFilter(v as Filter)}
                >
                  <ToggleGroupItem value="All">
                    <span className="px-2">All</span>
                  </ToggleGroupItem>
                  <ToggleGroupItem value="Leader">
                    <span className="px-2">Leaders</span>
                  </ToggleGroupItem>
                  <ToggleGroupItem value="Mod">
                    <span className="px-2">Mods</span>
                  </ToggleGroupItem>
                  <ToggleGroupItem value="Member">
                    <span className="px-2">Members</span>
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>

              <ScrollArea className="flex-1">
                {filter === "All" ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pr-2">
                    <div>
                      <div className="text-sm font-medium mb-3">Leaders</div>
                      <div className="space-y-3">
                        {leaders.map((u) => (
                          <UserRow
                            key={u.id}
                            u={u}
                            currentUserRole={currentUserRole}
                            isCurrentUserDeveloper={isCurrentUserDeveloper}
                            isCurrentUserLeader={isCurrentUserLeader}
                            onManage={() => openManage(u.id)}
                            onToggleDeveloper={(checked) =>
                              toggleDeveloper(u.id, checked)
                            }
                            onUpdateRole={(role) =>
                              requestRoleChange(u.id, role)
                            }
                            onChat={() => openMemberChat(u)}
                            hasUnreadMessages={u.hasUnreadMessages}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="md:border-l md:border-r border-gray-200 dark:border-neutral-600 md:px-6 px-0">
                      <div className="text-sm font-medium mb-3">TM-lead</div>
                      <div className="space-y-3">
                        {mods.map((u) => (
                          <UserRow
                            key={u.id}
                            u={u}
                            currentUserRole={currentUserRole}
                            isCurrentUserDeveloper={isCurrentUserDeveloper}
                            isCurrentUserLeader={isCurrentUserLeader}
                            onManage={() => openManage(u.id)}
                            onToggleDeveloper={(checked) =>
                              toggleDeveloper(u.id, checked)
                            }
                            onUpdateRole={(role) =>
                              requestRoleChange(u.id, role)
                            }
                            onChat={() => openMemberChat(u)}
                            hasUnreadMessages={u.hasUnreadMessages}
                          />
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium mb-3">Developer</div>
                      <div className="space-y-3">
                        {members.map((u) => (
                          <UserRow
                            key={u.id}
                            u={u}
                            currentUserRole={currentUserRole}
                            isCurrentUserDeveloper={isCurrentUserDeveloper}
                            isCurrentUserLeader={isCurrentUserLeader}
                            onManage={() => openManage(u.id)}
                            onUpdateRole={(role) =>
                              requestRoleChange(u.id, role)
                            }
                            onChat={() => openMemberChat(u)}
                            hasUnreadMessages={u.hasUnreadMessages}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 pr-2">
                    <div className="text-sm font-medium mb-1">
                      {filter === "Leader"
                        ? "Leaders"
                        : filter === "Mod"
                        ? "Mods"
                        : "Members"}
                    </div>
                    {(filter === "Leader"
                      ? leaders
                      : filter === "Mod"
                      ? mods
                      : members
                    ).map((u) => (
                      <UserRow
                        key={u.id}
                        u={u}
                        currentUserRole={currentUserRole}
                        isCurrentUserDeveloper={isCurrentUserDeveloper}
                        isCurrentUserLeader={isCurrentUserLeader}
                        onManage={() => openManage(u.id)}
                        onToggleDeveloper={(checked) =>
                          toggleDeveloper(u.id, checked)
                        }
                        onUpdateRole={(role) => requestRoleChange(u.id, role)}
                        onChat={() => openMemberChat(u)}
                        hasUnreadMessages={u.hasUnreadMessages}
                      />
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent
              value="chat"
              className="h-full min-h-0 flex flex-col flex-1"
            >
              <div className="flex h-full">
                {/* Chat sidebar */}
                <div className="w-1/3 border-r flex flex-col">
                  <div className="p-4 border-b">
                    <h3 className="text-lg font-semibold">Chats</h3>
                    
                    {/* Search bar */}
                    <div className="mt-3 relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Search chats..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-muted rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-background"
                      />
                    </div>
                  </div>
                  <ScrollArea className="flex-1">
                    <div className="space-y-1 p-2">
                      {/* Saved Messages */}
                      <div
                        className={`flex items-center gap-3 p-3 rounded-md cursor-pointer transition-colors ${
                          selectedChat?.type === "saved"
                            ? "bg-accent text-accent-foreground"
                            : "hover:bg-accent hover:text-accent-foreground"
                        }`}
                        onClick={() => handleChatSelect("saved")}
                      >
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600">
                          <Bookmark className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">Saved Messages</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {savedMessages.length} messages
                          </div>
                        </div>
                        <div className="w-2 h-2 bg-transparent rounded-full"></div>
                      </div>
                      {/* General channel */}
                      <div
                        className={`flex items-center gap-3 p-3 rounded-md cursor-pointer transition-colors ${
                          selectedChat?.type === "general"
                            ? "bg-accent text-accent-foreground"
                            : "hover:bg-accent hover:text-accent-foreground"
                        }`}
                        onClick={() => handleChatSelect("general")}
                      >
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary">
                          #
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">general</div>
                          <div className="text-xs text-muted-foreground truncate">
                            Public channel
                          </div>
                        </div>
                        <div className="w-2 h-2 bg-transparent rounded-full"></div>
                      </div>

                      {/* DM chats */}
                      {users
                        .filter((u) => u.id !== user?.id)
                        .filter((u) => 
                          searchQuery === "" || 
                          (u.name || u.username).toLowerCase().includes(searchQuery.toLowerCase())
                        )
                        .map((u) => (
                          <div
                            key={u.id}
                            className={`flex items-center gap-3 p-3 rounded-md cursor-pointer transition-colors ${
                              selectedChat?.type === "dm" &&
                              selectedChat.user?.id === u.id
                                ? "bg-accent text-accent-foreground"
                                : "hover:bg-accent hover:text-accent-foreground"
                            }`}
                            onClick={() => handleChatSelect("dm", u)}
                          >
                            <Avatar className="w-8 h-8">
                              <AvatarImage
                                src={u.profilePicture}
                                alt={u.name}
                              />
                              <AvatarFallback>
                                {(u.name || u.username)
                                  ?.split(" ")
                                  .map((n) => n[0])
                                  .join("")
                                  .toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm truncate">
                                {u.name || u.username}
                              </div>
                            </div>
                            {u.hasUnreadMessages && (
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            )}
                          </div>
                        ))}
                    </div>
                  </ScrollArea>
                </div>

                {/* Chat content */}
                <div className="flex-1 flex flex-col">
                  {selectedChat ? (
                    <>
                      {/* Chat header */}
                      <div className="p-4 border-b flex items-center gap-3">
                        {selectedChat.type === "saved" ? (
                          <>
                            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 text-blue-600">
                              <Bookmark className="h-5 w-5" />
                            </div>
                            <div>
                              <h3 className="font-semibold">Saved Messages</h3>
                              <p className="text-sm text-muted-foreground">
                                {savedMessages.length} saved messages
                              </p>
                            </div>
                          </>
                        ) : selectedChat.type === "general" ? (
                          <>
                            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary">
                              #
                            </div>
                            <div>
                              <h3 className="font-semibold">general</h3>
                              <p className="text-sm text-muted-foreground">
                                Public channel
                              </p>
                            </div>
                          </>
                        ) : (
                          <>
                            <Avatar>
                              <AvatarImage
                                src={selectedChat.user?.profilePicture}
                                alt={selectedChat.user?.name}
                              />
                              <AvatarFallback>
                                {(selectedChat.user?.name || selectedChat.user?.username)
                                  ?.split(" ")
                                  .map((n) => n[0])
                                  .join("")
                                  .toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <h3 className="font-semibold">
                                {selectedChat.user?.name || selectedChat.user?.username}
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                {selectedChat.user?.type}
                              </p>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Messages area */}
                      <ScrollArea className="flex-1 p-4">
                        {isLoadingMessages ? (
                          <div className="flex items-center justify-center h-32">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                          </div>
                        ) : chatMessages.length === 0 ? (
                          <div className="flex items-center justify-center h-32 text-muted-foreground">
                            <div className="text-center">
                              <p>No messages yet</p>
                              <p className="text-sm">Start the conversation!</p>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {chatMessages.map((message) => {
                              const isCurrentUser = message.sender_id === user?.id;
                              const timeAgo = formatTimeAgo(message.timestamp);
                              
                              return (
                                <div
                                  key={message.id}
                                  className={`flex gap-3 ${isCurrentUser ? 'flex-row-reverse' : ''}`}
                                >
                                  <Avatar className="w-8 h-8">
                                    {message.sender_profile_picture && (
                                      <AvatarImage
                                        src={message.sender_profile_picture.startsWith('http') ? message.sender_profile_picture : `${BACKEND_URL}${message.sender_profile_picture}`}
                                        alt={message.sender_username}
                                      />
                                    )}
                                    <AvatarFallback className={`${
                                      isCurrentUser 
                                        ? 'bg-primary text-primary-foreground' 
                                        : 'bg-muted text-muted-foreground'
                                    }`}>
                                      {message.sender_username?.charAt(0).toUpperCase() || 'U'}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className={`flex-1 ${isCurrentUser ? 'text-right' : ''}`}>
                                    <div className={`flex items-center gap-2 mb-1 ${isCurrentUser ? 'flex-row-reverse' : ''}`}>
                                      <span className="font-semibold text-sm">{message.sender_username}</span>
                                      <span className="text-xs text-muted-foreground">{timeAgo}</span>
                                    </div>
                                    <div className={`inline-block ${
                                      isCurrentUser 
                                        ? 'bg-primary text-primary-foreground' 
                                        : 'bg-muted'
                                    } rounded-lg px-3 py-2 text-sm max-w-xs group relative`}>
                                      {message.message && (
                                        <div className="whitespace-pre-wrap">{message.message}</div>
                                      )}
                                      {message.image && (
                                        <div className="mt-2">
                                          <img
                                            src={`${BACKEND_URL}${message.image}`}
                                            alt="Shared image"
                                            className="max-w-full max-h-64 rounded cursor-pointer"
                                            onClick={() => window.open(`${BACKEND_URL}${message.image}`, '_blank')}
                                          />
                                        </div>
                                      )}
                                      
                                      {/* Save message button - only show for non-saved messages view */}
                                      {selectedChat?.type !== "saved" && (
                                        <button
                                          onClick={() => toggleSaveMessage(message)}
                                          className={`absolute top-1 right-1 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity ${
                                            isMessageSaved(message.id)
                                              ? 'text-yellow-500 hover:text-yellow-600'
                                              : 'text-muted-foreground hover:text-foreground'
                                          }`}
                                          title={isMessageSaved(message.id) ? "Remove from saved" : "Save message"}
                                        >
                                          <Bookmark className={`h-3 w-3 ${isMessageSaved(message.id) ? 'fill-current' : ''}`} />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </ScrollArea>

                      {/* Message input - hidden for saved messages */}
                      {selectedChat.type !== "saved" && (
                        <div className="p-4 border-t">
                          <div className="flex gap-2">
                            <div className="flex-1 relative">
                              <input
                                type="text"
                                value={messageInput}
                                onChange={(e) => setMessageInput(e.target.value)}
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSendMessage();
                                  }
                                }}
                                placeholder={`Message ${selectedChat.type === "general" ? "#general" : selectedChat.user?.name || "user"}...`}
                                className="w-full px-3 py-2 pr-10 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                disabled={!selectedRoomId}
                                title={!selectedRoomId ? "Select a chat room first" : ""}
                              />
                              <input
                                type="file"
                                accept="image/*,video/*"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    handleFileUpload(file);
                                    e.target.value = '';
                                  }
                                }}
                                className="hidden"
                                id="file-upload"
                              />
                              <label
                                htmlFor="file-upload"
                                className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 rounded-md hover:bg-muted cursor-pointer"
                                title="Upload file"
                              >
                                <Paperclip className="h-4 w-4 text-muted-foreground" />
                              </label>
                            </div>
                            <button 
                              onClick={handleSendMessage}
                              disabled={!messageInput.trim() || !selectedRoomId}
                              className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Send
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-muted-foreground">
                      <div className="text-center">
                        <p>Select a chat</p>
                        <p className="text-sm">Choose a conversation to start chatting!</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
      <Dialog open={!!openUserId} onOpenChange={(o) => !o && closeManage()}>
        <DialogOverlay className="backdrop-blur-sm" />
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manage Tasks</DialogTitle>
            {selectedUser && (
              <div className="text-sm text-muted-foreground">
                {selectedUser.name}
                {selectedUser.telegramId && (
                  <span className="block mt-1">
                    Telegram: {selectedUser.telegramId}
                  </span>
                )}
              </div>
            )}
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Input
                placeholder="Task title (optional)"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
              />
              <div className="flex items-center gap-2">
                <Textarea
                  placeholder="Task description"
                  value={newTaskText}
                  onChange={(e) => setNewTaskText(e.target.value)}
                />
                <Button onClick={addTask} disabled={isAddingTask}>
                  {isAddingTask ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    "Add"
                  )}
                </Button>
              </div>
            </div>
            <div className="border rounded-md max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tasks.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="max-w-[200px]">
                        <Input
                          value={t.title || ""}
                          onChange={(e) =>
                            updateTask(t.id, e.target.value, t.text)
                          }
                          placeholder="Title"
                        />
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        <Input
                          value={t.text}
                          onChange={(e) =>
                            updateTask(t.id, t.title || "", e.target.value)
                          }
                          placeholder="Description"
                        />
                      </TableCell>
                      <TableCell>
                        <Badge variant={t.done ? "default" : "secondary"}>
                          {t.done ? "Done" : "Todo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleTask(t.id)}
                        >
                          {t.done ? "Undo" : "Mark"}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => removeTask(t.id)}
                        >
                          Remove
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {tasks.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="text-muted-foreground text-center"
                      >
                        No tasks assigned for today
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeManage}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Role Change Confirmation Dialog */}
      <AlertDialog open={roleChangeDialog.open} onOpenChange={cancelRoleChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to change the role of{" "}
              <strong>{roleChangeDialog.userName}</strong> to{" "}
              <strong>{roleChangeDialog.newRole}</strong>? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelRoleChange}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmRoleChange}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Upload Image Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Image</DialogTitle>
            <DialogDescription>
              Select a recipient and upload an image.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Send to:</label>
              <Select value={recipientId} onValueChange={setRecipientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select recipient" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  <SelectItem value="role:Leader">All Leaders</SelectItem>
                  <SelectItem value="role:Mod">All Mods</SelectItem>
                  <SelectItem value="role:Member">All Members</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div
              className={`
                flex flex-col items-center justify-center rounded-lg border-2 border-dashed
                p-8 text-center transition-colors
                ${
                  isDragging
                    ? "border-primary bg-primary/10"
                    : "border-muted-foreground/25 hover:border-primary/50"
                }
              `}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => document.getElementById("file-upload")?.click()}
            >
              <div className="flex flex-col items-center gap-2">
                {uploadFile ? (
                  <>
                    <ImageIcon className="h-8 w-8 text-primary" />
                    <p className="text-sm font-medium">{uploadFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(uploadFile.size / 1024).toFixed(2)} KB
                    </p>
                  </>
                ) : (
                  <>
                    <Upload className="h-8 w-8 text-muted-foreground" />
                    <p className="text-sm font-medium text-muted-foreground">
                      Drag & drop or click to upload
                    </p>
                  </>
                )}
              </div>
              <Input
                id="file-upload"
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleFileSelect}
              />
            </div>
          </div>
          <DialogFooter className="sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setUploadDialogOpen(false);
                setUploadFile(null);
              }}
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleUpload}
              disabled={!uploadFile || isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                "Upload"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Uploads Gallery Dialog */}
      <Dialog open={galleryOpen} onOpenChange={setGalleryOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Uploaded Images</DialogTitle>
            <DialogDescription>
              Images uploaded by you or shared with you.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1 pr-4">
            {loadingFiles ? (
              <div className="py-8 text-center text-muted-foreground">
                Loading files...
              </div>
            ) : uploadedFiles.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                No images found.
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-4">
                {uploadedFiles.map((file) => (
                  <div
                    key={file.id}
                    className="border rounded-lg overflow-hidden bg-card cursor-pointer group relative"
                    onClick={() => {
                      setSelectedFileForViewer(file);
                      setZoomLevel(1);
                      setViewerOpen(true);
                    }}
                  >
                    {isCurrentUserDeveloper && (
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 z-10 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => handleDeleteFile(file.id, e)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                    <div className="aspect-square relative bg-muted/20">
                      {file.url.match(
                        /\.(jpeg|jpg|gif|png|webp|avif|tiff|bmp|svg)$/i
                      ) ? (
                        <img
                          src={`${BACKEND_URL}${file.url}`}
                          alt={file.name}
                          className="object-cover w-full h-full"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex items-center justify-center w-full h-full text-muted-foreground text-sm">
                          <span className="flex flex-col items-center">
                            <ImageIcon className="h-8 w-8" />
                            File
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="p-2 text-xs">
                      <div className="font-medium truncate" title={file.name}>
                        {file.name}
                      </div>
                      <div className="text-muted-foreground mt-1">
                        By: {file.uploaded_by}
                      </div>
                      <div className="text-muted-foreground">
                        To:{" "}
                        {file.is_public
                          ? "Everyone"
                          : file.recipient || "Unknown"}
                      </div>
                      <div className="text-muted-foreground opacity-70 mt-1">
                        {format(new Date(file.uploaded_at), "MMM d, yyyy")}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* File Viewer Dialog */}
      <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 bg-transparent border-none">
          {selectedFileForViewer && (
            <div
              className="relative w-full h-full flex items-center justify-center bg-black bg-opacity-75 rounded-lg overflow-hidden"
              style={{ minHeight: "60vh" }}
            >
              {selectedFileForViewer.url.match(
                /\.(jpeg|jpg|gif|png|webp|avif|tiff|bmp|svg)$/i
              ) ? (
                <div className="w-full h-full flex items-center justify-center overflow-auto">
                  <img
                    src={`${BACKEND_URL}${selectedFileForViewer.url}`}
                    alt={selectedFileForViewer.name}
                    className="max-w-full max-h-full object-contain transition-transform duration-200"
                    style={{ transform: `scale(${zoomLevel})` }}
                  />
                </div>
              ) : selectedFileForViewer.url.match(/\.(mp4|webm|ogg)$/i) ? (
                <video
                  controls
                  className="max-w-full max-h-full object-contain"
                >
                  <source
                    src={`${BACKEND_URL}${selectedFileForViewer.url}`}
                    type={`video/${selectedFileForViewer.url.split(".").pop()}`}
                  />
                  Your browser does not support the video tag.
                </video>
              ) : (
                <div className="text-white text-lg">
                  Cannot display this file type.
                  <a
                    href={`${BACKEND_URL}${selectedFileForViewer.url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 underline ml-2"
                  >
                    Download ({selectedFileForViewer.name})
                  </a>
                </div>
              )}

              {/* Controls Overlay */}
              <div className="absolute top-2 right-12 flex items-center gap-2">
                {" "}
                {/* Moved left to accommodate close button */}
                {selectedFileForViewer.url.match(
                  /\.(jpeg|jpg|gif|png|webp|avif|tiff|bmp|svg)$/i
                ) && (
                  <div className="flex bg-black/50 rounded-lg p-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-white hover:bg-white/20 hover:text-white"
                      onClick={() =>
                        setZoomLevel((prev) => Math.max(0.5, prev - 0.25))
                      }
                    >
                      <ZoomOut className="h-5 w-5" />
                    </Button>
                    <span className="flex items-center justify-center min-w-[3rem] text-white text-xs font-mono">
                      {Math.round(zoomLevel * 100)}%
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-white hover:bg-white/20 hover:text-white"
                      onClick={() =>
                        setZoomLevel((prev) => Math.min(3, prev + 0.25))
                      }
                    >
                      <ZoomIn className="h-5 w-5" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      {chatTargets.map((target, index) => (
        <div
          key={target.id}
          style={{
            position: "fixed",
            right: 50,
            bottom: `${90 + index * 60}px`,
            zIndex: 50,
          }}
        >
          <EnhancedChatWindow
            targetUser={target}
            onClose={() =>
              setChatTargets((prev) => prev.filter((u) => u.id !== target.id))
            }
            isEmbedded={true}
          />
        </div>
      ))}
    </div>
  );
}

function DialogDescription({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

function UserRow({
  u,
  onManage,
  onChat,
  onToggleDeveloper,
  onUpdateRole,
  currentUserRole,
  isCurrentUserDeveloper,
  isCurrentUserLeader,
  hasUnreadMessages,
}: {
  u: TeamUser;
  onManage?: () => void;
  onChat?: () => void;
  onToggleDeveloper?: (checked: boolean) => void;
  onUpdateRole?: (role: string) => void;
  currentUserRole?: string;
  isCurrentUserDeveloper?: boolean;
  isCurrentUserLeader?: boolean;
  hasUnreadMessages?: boolean;
}) {
  // Determine if the current user can manage tasks for this user
  // Developers can manage everyone's tasks regardless of their team role
  const isManageable =
    isCurrentUserDeveloper ||
    (currentUserRole
      ? currentUserRole === "Leader" ||
        (currentUserRole === "Mod" && u.role === "Member")
      : false);

  // Format last seen time
  const formatLastSeen = (lastSeen?: string) => {
    if (!lastSeen) return "Never seen";

    const lastSeenDate = new Date(lastSeen);
    const now = new Date();
    const diffInSeconds = Math.floor(
      (now.getTime() - lastSeenDate.getTime()) / 1000
    );

    if (u.is_online) {
      return "Online now";
    }

    if (diffInSeconds < 60) {
      return "Just now";
    }

    if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
    }

    if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    }

    const days = Math.floor(diffInSeconds / 86400);
    return `${days} day${days > 1 ? "s" : ""} ago`;
  };

  // Create a state for last seen display that updates every minute
  const [lastSeenDisplay, setLastSeenDisplay] = useState(
    formatLastSeen(u.last_seen)
  );

  useEffect(() => {
    // Update the display every minute
    const interval = setInterval(() => {
      setLastSeenDisplay(formatLastSeen(u.last_seen));
    }, 60000);

    // Clear interval on component unmount
    return () => clearInterval(interval);
  }, [u.last_seen]);

  return (
    <div className="p-3 border rounded-lg bg-card grid grid-cols-1 sm:grid-cols-[auto_1fr_auto] items-start gap-3">
      <div className="relative">
        <Avatar className="size-12">
          {u.avatarUrl && <AvatarImage src={u.avatarUrl} alt={u.name} />}
          <AvatarFallback>
            {u.name
              .split(" ")
              .map((p) => p[0])
              .join("")}
          </AvatarFallback>
        </Avatar>
        {u.is_online && (
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-800"></div>
        )}
      </div>
      <div className="min-w-0">
        <div className="font-medium break-words whitespace-normal">
          {u.name}
        </div>
        <div className="text-xs text-muted-foreground">{u.role}</div>
        <div className="text-xs text-muted-foreground">{lastSeenDisplay}</div>
        {u.telegramId && (
          <div className="text-xs text-muted-foreground">
            Telegram: {u.telegramId}
          </div>
        )}
      </div>
      {/* Desktop view (2xl+) - show all buttons */}
      <div className="hidden 2xl:flex flex-wrap items-center gap-2 justify-start">
        {onChat && (
          <div className="relative">
            <Button
              size="icon"
              variant="ghost"
              onClick={onChat}
              title="Message"
            >
              <MessageCircle className="h-4 w-4" />
            </Button>
            {hasUnreadMessages && (
              <div className="absolute top-0 right-0 w-2 h-2 bg-green-500 rounded-full border-white dark:border-gray-800 border-1" />
            )}
          </div>
        )}
        <Badge>{u.type}</Badge>
        {(isCurrentUserLeader || isCurrentUserDeveloper) && onUpdateRole && (
          <Select onValueChange={(value) => onUpdateRole(value)} value={u.role}>
            <SelectTrigger className="w-[100px]">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="None">None</SelectItem>
              <SelectItem value="Leader">Leader</SelectItem>
              <SelectItem value="Mod">Mod</SelectItem>
              <SelectItem value="Member">Member</SelectItem>
            </SelectContent>
          </Select>
        )}
        {isManageable && onManage && (
          <Button size="sm" variant="outline" onClick={onManage}>
            Manage Tasks
          </Button>
        )}
      </div>

      {/* Mobile/Tablet/Laptop view (<= xl) - show 3-dot menu */}
      <div className="flex 2xl:hidden items-center gap-2 justify-end">
        <Badge>{u.type}</Badge>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="ghost" className="relative">
              <MoreVertical className="h-4 w-4" />
              {hasUnreadMessages && (
                <div className="absolute top-1 right-1 w-2 h-2 bg-green-500 rounded-full border-white dark:border-gray-800 border-1" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {onChat && (
              <>
                <DropdownMenuItem onClick={onChat} className="cursor-pointer">
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Message
                  {hasUnreadMessages && (
                    <div className="ml-auto w-2 h-2 bg-green-500 rounded-full" />
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}

            {(isCurrentUserLeader || isCurrentUserDeveloper) &&
              onUpdateRole && (
                <>
                  <div className="px-2 py-1.5 text-sm font-semibold">
                    Change Role
                  </div>
                  <DropdownMenuItem
                    onClick={() => onUpdateRole("None")}
                    className="cursor-pointer"
                  >
                    {u.role === "None" && "✓ "}None
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onUpdateRole("Leader")}
                    className="cursor-pointer"
                  >
                    {u.role === "Leader" && "✓ "}Leader
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onUpdateRole("Mod")}
                    className="cursor-pointer"
                  >
                    {u.role === "Mod" && "✓ "}Mod
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onUpdateRole("Member")}
                    className="cursor-pointer"
                  >
                    {u.role === "Member" && "✓ "}Member
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}

            {isManageable && onManage && (
              <DropdownMenuItem onClick={onManage} className="cursor-pointer">
                Manage Tasks
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
