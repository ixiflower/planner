import * as React from "react";
import { useState, useRef, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { API_BASE_URL, BACKEND_URL } from "@/config/backend";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { User, Image as ImageIcon, Lock, Download, Upload, CloudUpload, CloudDownload, RefreshCw, Play, Pause, Trash2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
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
const Settings: React.FC = () => {
  const {
    user,
    token,
    updateUser,
    isAuthenticated
  } = useAuth();
  const [username, setUsername] = useState(user?.username || "");
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
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
    is_ixi_bot: false
  });
  const [savingTelegram, setSavingTelegram] = useState(false);
  const [telegramBots, setTelegramBots] = useState<TelegramBotItem[]>([]);
  const [botStatus, setBotStatus] = useState<"start" | "restart" | "pause" | "idle">("idle");
  const [botToDelete, setBotToDelete] = useState<TelegramBotItem | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isUploadingToSheets, setIsUploadingToSheets] = useState(false);
  const [isDownloadingFromSheets, setIsDownloadingFromSheets] = useState(false);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);
  const [syncInterval, setSyncInterval] = useState(10);
  const [lastSyncTime, setLastSyncTime] = useState<string>("");
  const [uploadUsers, setUploadUsers] = useState(true);
  const [uploadSubmissions, setUploadSubmissions] = useState(true);
  const [uploadReports, setUploadReports] = useState(true);
  const [saeDataOnTelegram, setSaeDataOnTelegram] = useState(false);
  const [saeAutomationHours, setSaeAutomationHours] = useState(5);
  const [isManualSync, setIsManualSync] = useState(false);
  const dbFileInputRef = useRef<HTMLInputElement | null>(null);
  const getMediaUrl = useCallback((path: string | null) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    const baseUrl = import.meta.env.VITE_BACKEND_URL;
    const cleanPath = path.replace(/^\/+/, '');
    return `${baseUrl}/${cleanPath}`;
  }, []);
  const getProfileImageUrl = useCallback(() => {
    if (imagePreview) return imagePreview;
    if (user?.profile_picture) {
      const mediaUrl = getMediaUrl(user.profile_picture);
      return mediaUrl || '/default-avatar.png';
    }
    return "/default-avatar.png";
  }, [imagePreview, user?.profile_picture, getMediaUrl]);
  const handlePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setProfilePicture(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUsername(e.target.value);
  };
  const handleProfileUpdate = async () => {
    const formData = new FormData();
    formData.append("username", username);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/update-profile`, {
        method: "POST",
        headers: {
          Authorization: token || ""
        },
        body: formData
      });
      if (response.ok) {
        const data = await response.json();
        updateUser(data.user);
        toast.success("Profile updated successfully!");
      } else {
        const errorData = await response.json();
        toast.error(`Failed to update profile: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("An error occurred while updating profile.");
    }
  };
  const handlePictureUpload = async () => {
    if (!profilePicture) {
      toast.warning("Please select a picture to upload.");
      return;
    }
    const formData = new FormData();
    formData.append("profile_picture", profilePicture);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/update-profile`, {
        method: "POST",
        headers: {
          Authorization: token || ""
        },
        body: formData
      });
      if (response.ok) {
        const data = await response.json();
        if (data.user || data.profile_picture_url) {
          const updatedUser = {
            ...user,
            ...(data.user || {}),
            profile_picture: data.profile_picture_url || data.user?.profile_picture
          };
          updateUser(updatedUser);
          toast.success("Picture uploaded successfully!");
          setProfilePicture(null);
          setImagePreview(null);
          const fileInput = document.getElementById('picture') as HTMLInputElement;
          if (fileInput) fileInput.value = '';
        } else {
          toast.warning("Picture uploaded but user data was not returned.");
        }
      } else {
        const errorData = await response.json();
        toast.error(`Failed to upload picture: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error("Error uploading picture:", error);
      toast.error("An error occurred while uploading the picture.");
    }
  };
  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match.");
      return;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/auth/update-profile`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token || ""
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword
        })
      });
      if (response.ok) {
        toast.success("Password changed successfully!");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        const errorData = await response.json();
        toast.error(`Failed to change password: ${errorData.error}`);
      }
    } catch (error) {
      console.error("Error changing password:", error);
      toast.error("An error occurred while changing the password.");
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
      const res = await fetch(url, {
        method: "POST",
        body: payload
      });
      console.log("Telegram sendMessage status:", res.status);
    } catch (e) {
      console.error("Failed to send Telegram message:", e);
    }
  };
  const postTelegramUpdate = async (partial: Partial<TelegramData>) => {
    try {
      let authToken = token || "";
      if (authToken && !authToken.startsWith("Token ")) authToken = `Token ${authToken}`;
      const res = await fetch(`${BACKEND_URL}/api/telegram/update/`, {
        method: "POST",
        headers: {
          Authorization: authToken,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(partial)
      });
      const data = await res.json();
      if (res.ok && data.telegram) {
        setTelegramData(prev => ({
          ...prev,
          ...data.telegram
        }));
      }
    } catch (e) {
      console.error("Failed to update Telegram status:", e);
    }
  };
  const startPlannerBot = async () => {
    try {
      let authToken = token || "";
      if (!authToken) return;
      if (!authToken.startsWith("Token ")) authToken = `Token ${authToken}`;
      const response = await fetch(`${BACKEND_URL}/api/bot/start-planner/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authToken
        }
      });
      if (!response.ok) {
        const data = await response.json();
        console.error("Failed to start planner bot:", data.error || "Unknown error");
        return;
      }
      const data = await response.json();
      console.log("Planner bot started successfully:", data.message);
    } catch (error) {
      console.error("Error starting planner bot:", error);
    }
  };
  const handleBotAction = async (action: "start" | "restart" | "pause") => {
    if (action === "pause") {
      setBotStatus("pause");
      setTelegramData({
        ...telegramData,
        is_active: false
      });
      await postTelegramUpdate({
        is_active: false,
        bot_status: "pause"
      });
      if (telegramData.send_log) {
        await sendTelegramMessage(`bot paused\nname: ${telegramData.bot_name || "-"}\nowner: ${user?.username || "-"}\ntoken: ${maskToken(telegramData.api_token)}`);
      }
      return;
    }
    if (action === "restart") {
      setBotStatus("restart");
      setTelegramData({
        ...telegramData,
        is_active: true
      });
      await postTelegramUpdate({
        is_active: true,
        bot_status: "start"
      });
      try {
        let authToken = token || "";
        if (authToken && !authToken.startsWith("Token ")) authToken = `Token ${authToken}`;
        const response = await fetch(`${BACKEND_URL}/api/telegram/restart/`, {
          method: "POST",
          headers: {
            "Authorization": authToken,
            "Content-Type": "application/json"
          }
        });
        if (!response.ok) {
          const data = await response.json();
          console.error("Failed to restart bot:", data.error || "Unknown error");
        }
      } catch (error) {
        console.error("Failed to restart bot:", error);
      }
      if (telegramData.send_log) {
        await sendTelegramMessage(`bot restarted now\nname: ${telegramData.bot_name || "-"}\nowner: ${user?.username || "-"}\ntoken: ${maskToken(telegramData.api_token)}`);
      }
      setBotStatus("start");
      await sendTelegramMessage("the bot is started now");
      return;
    }
    await startPlannerBot();
    setBotStatus("start");
    setTelegramData({
      ...telegramData,
      is_active: true
    });
    await postTelegramUpdate({
      is_active: true,
      bot_status: "start"
    });
    try {
      let authToken = token || "";
      if (authToken && !authToken.startsWith("Token ")) authToken = `Token ${authToken}`;
      const response = await fetch(`${BACKEND_URL}/api/telegram/start/`, {
        method: "POST",
        headers: {
          "Authorization": authToken,
          "Content-Type": "application/json"
        }
      });
      if (!response.ok) {
        const data = await response.json();
        console.error("Failed to start bot:", data.error || "Unknown error");
      }
    } catch (error) {
      console.error("Failed to start bot:", error);
    }
    await sendTelegramMessage("the bot is started now");
  };
  const fetchTelegramData = async () => {
    try {
      let authToken = token || "";
      if (authToken && !authToken.startsWith("Token ")) authToken = `Token ${authToken}`;
      const response = await fetch(`${BACKEND_URL}/api/telegram/`, {
        method: "GET",
        headers: {
          "Authorization": authToken,
          "Content-Type": "application/json"
        }
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
            google_sheets_sync_interval: data.telegram.google_sheets_sync_interval || 10
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
      let authToken = token || "";
      if (authToken && !authToken.startsWith("Token ")) authToken = `Token ${authToken}`;
      const response = await fetch(`${BACKEND_URL}/api/telegram/update/`, {
        method: "POST",
        headers: {
          "Authorization": authToken,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(telegramData)
      });
      if (response.ok) {
        await fetchTelegramData();
        toast.success("Telegram settings saved.");
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || "Failed to update Telegram data");
      }
    } catch (error) {
      console.error("Error updating Telegram data:", error);
      toast.error("Failed to update Telegram data");
    } finally {
      setSavingTelegram(false);
    }
  };
  const fetchTelegramBots = async () => {
    try {
      let authToken = token || "";
      if (authToken && !authToken.startsWith("Token ")) authToken = `Token ${authToken}`;
      const response = await fetch(`${BACKEND_URL}/api/telegram/bots/`, {
        method: "GET",
        headers: {
          Authorization: authToken,
          "Content-Type": "application/json"
        }
      });
      if (response.ok) {
        const data = await response.json();
        setTelegramBots(Array.isArray(data.bots) ? data.bots : []);
      }
    } catch (error) {
      console.error("Failed to fetch Telegram bots:", error);
    }
  };
  const handleExportDatabase = async () => {
    setIsExporting(true);
    try {
      let authToken = token || "";
      if (authToken && !authToken.startsWith("Token ")) authToken = `Token ${authToken}`;
      const response = await fetch(`${BACKEND_URL}/api/database/export/`, {
        method: "GET",
        headers: {
          Authorization: authToken
        }
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
        toast.error("Failed to export database");
      }
    } catch (error) {
      console.error("Failed to export database:", error);
      toast.error("Failed to export database");
    } finally {
      setIsExporting(false);
    }
  };
  const handleImportDatabase = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    try {
      let authToken = token || "";
      if (authToken && !authToken.startsWith("Token ")) authToken = `Token ${authToken}`;
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch(`${BACKEND_URL}/api/database/import/`, {
        method: "POST",
        headers: {
          Authorization: authToken
        },
        body: formData
      });
      if (response.ok) {
        toast.success("Database imported successfully. Please refresh the page.");
        window.location.reload();
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to import database");
      }
    } catch (error) {
      console.error("Failed to import database:", error);
      toast.error("Failed to import database");
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
      let authToken = token || "";
      if (authToken && !authToken.startsWith("Token ")) authToken = `Token ${authToken}`;
      const response = await fetch(`/api/google-sheets/upload/`, {
        method: "POST",
        headers: {
          Authorization: authToken,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          upload_users: uploadUsers,
          upload_submissions: uploadSubmissions,
          upload_reports: uploadReports,
          auto_sync: autoSyncEnabled
        })
      });
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        const data = await response.json();
        if (response.ok) {
          setLastSyncTime(new Date().toLocaleString());
          toast.success(data.message || "Data successfully uploaded to Google Sheets!");
        } else {
          toast.error(data.error || "Failed to upload to Google Sheets");
        }
      } else {
        toast.error(`Failed to upload to Google Sheets: ${response.status}`);
      }
    } catch (error) {
      console.error("Failed to upload to Google Sheets:", error);
      toast.error("Failed to upload to Google Sheets");
    } finally {
      setIsUploadingToSheets(false);
    }
  };
  const handleDownloadFromGoogleSheets = async () => {
    setIsDownloadingFromSheets(true);
    try {
      let authToken = token || "";
      if (authToken && !authToken.startsWith("Token ")) authToken = `Token ${authToken}`;
      const response = await fetch(`/api/google-sheets/download/`, {
        method: "POST",
        headers: {
          Authorization: authToken,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({})
      });
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        const data = await response.json();
        if (response.ok) {
          toast.success("Data successfully downloaded from Google Sheets!");
        } else {
          toast.error(data.error || "Failed to download from Google Sheets");
        }
      } else {
        toast.error(`Failed to download from Google Sheets: ${response.status}`);
      }
    } catch (error) {
      console.error("Failed to download from Google Sheets:", error);
      toast.error("Failed to download from Google Sheets");
    } finally {
      setIsDownloadingFromSheets(false);
    }
  };
  const toggleAutoSync = async (enabled: boolean) => {
    setAutoSyncEnabled(enabled);
    try {
      let authToken = token || "";
      if (authToken && !authToken.startsWith("Token ")) authToken = `Token ${authToken}`;
      await fetch(`${BACKEND_URL}/api/telegram/update/`, {
        method: "POST",
        headers: {
          Authorization: authToken,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          google_sheets_auto_sync_enabled: enabled,
          google_sheets_sync_interval: syncInterval
        })
      });
      const response = await fetch(`${BACKEND_URL}/api/google-sheets/auto-sync/`, {
        method: "POST",
        headers: {
          Authorization: authToken,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          enabled,
          interval_hours: syncInterval
        })
      });
      if (!response.ok) {
        setAutoSyncEnabled(!enabled);
        toast.error("Failed to update auto-sync settings");
      }
    } catch (error) {
      console.error("Failed to update auto-sync settings:", error);
      setAutoSyncEnabled(!enabled);
      toast.error("Failed to update auto-sync settings");
    }
  };
  const handleManualSaeSync = async () => {
    if (!saeDataOnTelegram) return;
    setIsManualSync(true);
    try {
      let authToken = token || "";
      if (authToken && !authToken.startsWith("Token ")) authToken = `Token ${authToken}`;
      const response = await fetch(`${BACKEND_URL}/api/sae-data/sync/`, {
        method: "POST",
        headers: {
          Authorization: authToken,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          automation_enabled: saeDataOnTelegram,
          automation_interval_hours: saeAutomationHours,
          manual_trigger: true
        })
      });
      if (response.ok) {
        toast.success("Website data successfully synced to Telegram!");
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to sync data to Telegram");
      }
    } catch (error) {
      console.error("Failed to sync data to Telegram:", error);
      toast.error("Failed to sync data to Telegram");
    } finally {
      setIsManualSync(false);
    }
  };
  const saveSaeDataSettings = async () => {
    try {
      let authToken = token || "";
      if (authToken && !authToken.startsWith("Token ")) authToken = `Token ${authToken}`;
      await fetch(`${BACKEND_URL}/api/telegram/update/`, {
        method: "POST",
        headers: {
          Authorization: authToken,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          sae_data_enabled: saeDataOnTelegram,
          sae_automation_interval: saeAutomationHours
        })
      });
    } catch (error) {
      console.error("Failed to save SAE data settings:", error);
    }
  };
  const handleDeleteBot = async (bot: TelegramBotItem) => {
    try {
      let authToken = token || "";
      if (authToken && !authToken.startsWith("Token ")) authToken = `Token ${authToken}`;
      const response = await fetch(`${BACKEND_URL}/api/telegram/delete/${bot.id}/`, {
        method: "DELETE",
        headers: {
          Authorization: authToken
        }
      });
      if (response.ok) {
        setTelegramBots(prev => prev.filter(b => b.id !== bot.id));
        toast.success("Bot deleted successfully");
      } else {
        toast.error("Failed to delete bot");
      }
    } catch (error) {
      console.error("Failed to delete bot:", error);
      toast.error("Failed to delete bot");
    }
  };
  useEffect(() => {
    if (isAuthenticated && token && user?.developer) {
      fetchTelegramData();
      fetchTelegramBots();
    }
  }, [isAuthenticated, token, user]);
  return <div className="container mx-auto py-10 px-4 sm:px-6 lg:px-8 pb-32">
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your account and preferences.</p>
      </div>

      <div className="space-y-8">
        { }
        <Card className="bg-[var(--calendar-date-bg)]/90 border-border/60 shadow-lg overflow-hidden">
          <CardHeader className="px-6 pt-5 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-muted rounded-lg">
                <ImageIcon className="w-5 h-5" />
              </div>
              <div>
                <CardTitle>🖼️ Profile Picture</CardTitle>
                <CardDescription>Upload a clear image for your avatar.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <Separator className="bg-border" />
          <CardContent className="space-y-4 px-6 py-5">
            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
              <img src={getProfileImageUrl()} alt="Profile" className="w-28 h-28 rounded-full object-cover ring-2 ring-primary/40 shadow-sm" onError={e => {
                const target = e.target as HTMLImageElement;
                target.src = "/default-avatar.png";
              }} />
              <div className="flex-1 w-full">
                <Label htmlFor="picture" className="text-sm">Upload new picture</Label>
                <div className="mt-2 flex gap-2">
                  <Input id="picture" type="file" onChange={handlePictureChange} className="w-full" />
                  <Button onClick={handlePictureUpload} className="shrink-0">Upload</Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        { }
        <Card className="bg-[var(--calendar-date-bg)]/90 border-border/60 shadow-lg overflow-hidden">
          <CardHeader className="px-6 pt-5 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-muted rounded-lg">
                <User className="w-5 h-5" />
              </div>
              <div>
                <CardTitle>👤 Profile Information</CardTitle>
                <CardDescription>Update your basic details.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <Separator className="bg-border" />
          <CardContent className="space-y-4 px-6 py-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="username">Username</Label>
                <Input id="username" type="text" value={username} onChange={handleUsernameChange} placeholder="Your username" />
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleProfileUpdate}>Save Changes</Button>
            </div>
          </CardContent>
        </Card>

        { }
        <Card className="bg-[var(--calendar-date-bg)]/90 border-border/60 shadow-lg overflow-hidden">
          <CardHeader className="px-6 pt-5 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-muted rounded-lg">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <CardTitle>🔒 Change Password</CardTitle>
                <CardDescription>Use a strong, unique password.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <Separator className="bg-border" />
          <CardContent className="space-y-4 px-6 py-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="current-password">Current Password</Label>
                <Input id="current-password" type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="••••••••" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input id="new-password" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="••••••••" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input id="confirm-password" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" />
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={handlePasswordChange}>Update Password</Button>
            </div>
          </CardContent>
        </Card>

        { }
        {user?.developer && <div className="space-y-8 animate-fade-in">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight">Developer Settings</h2>
            <Badge variant="outline">Dev Mode</Badge>
          </div>

          { }
          <Card>
            <CardHeader>
              <CardTitle>Telegram Bot Configuration</CardTitle>
              <CardDescription>Configure your Telegram bot settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="bot-name">Bot Name</Label>
                <Input id="bot-name" value={telegramData.bot_name} onChange={e => setTelegramData({
                  ...telegramData,
                  bot_name: e.target.value
                })} placeholder="Enter bot name" />
              </div>
              <div>
                <Label htmlFor="api-token">API Token</Label>
                <Input id="api-token" type="password" value={telegramData.api_token} onChange={e => setTelegramData({
                  ...telegramData,
                  api_token: e.target.value
                })} placeholder="Enter bot API token" />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="bot-active">Bot Active</Label>
                <Switch id="bot-active" checked={telegramData.is_active} onCheckedChange={checked => setTelegramData({
                  ...telegramData,
                  is_active: checked
                })} />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="send-log">Send Logs</Label>
                <Switch id="send-log" checked={telegramData.send_log || false} onCheckedChange={checked => setTelegramData({
                  ...telegramData,
                  send_log: checked
                })} />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="send-report">Send Reports</Label>
                <Switch id="send-report" checked={telegramData.send_report || false} onCheckedChange={checked => setTelegramData({
                  ...telegramData,
                  send_report: checked
                })} />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="send-tasks">Send Tasks</Label>
                <Switch id="send-tasks" checked={telegramData.send_tasks || false} onCheckedChange={checked => setTelegramData({
                  ...telegramData,
                  send_tasks: checked
                })} />
              </div>

              <div className="flex gap-2 mt-4">
                <Button onClick={() => handleBotAction("start")} variant="default" size="sm">
                  <Play className="w-4 h-4 mr-2" />
                  Start
                </Button>
                <Button onClick={() => handleBotAction("restart")} variant="outline" size="sm">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Restart
                </Button>
                <Button onClick={() => handleBotAction("pause")} variant="secondary" size="sm">
                  <Pause className="w-4 h-4 mr-2" />
                  Pause
                </Button>
              </div>

              <Button onClick={updateTelegramData} disabled={savingTelegram} className="w-full">
                {savingTelegram ? "Saving..." : "Save Telegram Settings"}
              </Button>
            </CardContent>
          </Card>

          { }
          <Card>
            <CardHeader>
              <CardTitle>Database Operations</CardTitle>
              <CardDescription>Export and import database</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button onClick={handleExportDatabase} disabled={isExporting} variant="outline" className="flex-1">
                  <Download className="w-4 h-4 mr-2" />
                  {isExporting ? "Exporting..." : "Export Database"}
                </Button>
                <Button onClick={() => dbFileInputRef.current?.click()} disabled={isImporting} variant="outline" className="flex-1">
                  <Upload className="w-4 h-4 mr-2" />
                  {isImporting ? "Importing..." : "Import Database"}
                </Button>
              </div>
              <input ref={dbFileInputRef} type="file" accept=".json" onChange={handleImportDatabase} className="hidden" />
            </CardContent>
          </Card>

          { }
          <Card>
            <CardHeader>
              <CardTitle>Google Sheets Integration</CardTitle>
              <CardDescription>Sync data with Google Sheets</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Data to Sync</Label>
                <div className="flex items-center space-x-2">
                  <Checkbox id="upload-users" checked={uploadUsers} onCheckedChange={checked => setUploadUsers(checked as boolean)} />
                  <label htmlFor="upload-users" className="text-sm">Upload Users</label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="upload-submissions" checked={uploadSubmissions} onCheckedChange={checked => setUploadSubmissions(checked as boolean)} />
                  <label htmlFor="upload-submissions" className="text-sm">Upload Submissions</label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="upload-reports" checked={uploadReports} onCheckedChange={checked => setUploadReports(checked as boolean)} />
                  <label htmlFor="upload-reports" className="text-sm">Upload Reports</label>
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleUploadToGoogleSheets} disabled={isUploadingToSheets} variant="outline" className="flex-1">
                  <CloudUpload className="w-4 h-4 mr-2" />
                  {isUploadingToSheets ? "Uploading..." : "Upload to Sheets"}
                </Button>
                <Button onClick={handleDownloadFromGoogleSheets} disabled={isDownloadingFromSheets} variant="outline" className="flex-1">
                  <CloudDownload className="w-4 h-4 mr-2" />
                  {isDownloadingFromSheets ? "Downloading..." : "Download from Sheets"}
                </Button>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="auto-sync">Auto Sync</Label>
                <Switch id="auto-sync" checked={autoSyncEnabled} onCheckedChange={toggleAutoSync} />
              </div>

              {autoSyncEnabled && <div>
                <Label htmlFor="sync-interval">Sync Interval (hours)</Label>
                <Input id="sync-interval" type="number" value={syncInterval} onChange={e => setSyncInterval(parseInt(e.target.value))} min="1" />
              </div>}
            </CardContent>
          </Card>

          { }
          <Card>
            <CardHeader>
              <CardTitle>SAE Data Sync to Telegram</CardTitle>
              <CardDescription>Automatically sync website data to Telegram</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="sae-data">Enable SAE Data Sync</Label>
                <Switch id="sae-data" checked={saeDataOnTelegram} onCheckedChange={checked => {
                  setSaeDataOnTelegram(checked);
                  saveSaeDataSettings();
                }} />
              </div>

              {saeDataOnTelegram && <>
                <div>
                  <Label htmlFor="sae-interval">Automation Interval (hours)</Label>
                  <Input id="sae-interval" type="number" value={saeAutomationHours} onChange={e => {
                    setSaeAutomationHours(parseInt(e.target.value));
                    saveSaeDataSettings();
                  }} min="1" />
                </div>
                <Button onClick={handleManualSaeSync} disabled={isManualSync} variant="outline" className="w-full">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  {isManualSync ? "Syncing..." : "Manual Sync Now"}
                </Button>
              </>}
            </CardContent>
          </Card>

          { }
          {telegramBots.length > 0 && <Card>
            <CardHeader>
              <CardTitle>Active Telegram Bots</CardTitle>
              <CardDescription>Manage your telegram bots</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bot Name</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {telegramBots.map(bot => <TableRow key={bot.id}>
                    <TableCell>{bot.bot_name}</TableCell>
                    <TableCell>{bot.owner}</TableCell>
                    <TableCell>
                      <Badge variant={bot.is_active ? "default" : "secondary"}>
                        {bot.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteBot(bot)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>)}
                </TableBody>
              </Table>
            </CardContent>
          </Card>}
        </div>}
      </div>
    </div>
  </div>;
};
export default Settings;
