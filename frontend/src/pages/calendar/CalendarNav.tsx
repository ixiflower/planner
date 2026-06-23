import * as React from "react";
import {
  format,
  addDays,
  subMonths,
  addMonths,
  setMonth,
  setYear,
  getMonth,
  getYear,
  isToday
} from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Upload,
  Plus,
  Calendar as CalendarIcon,
  RefreshCw,
  BarChart3,
  CheckSquare,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  Users,
  Menu,
  User,
  Settings,
  HelpCircle,
  LogOut,
  Star,
  Send,
  LayoutTemplate,
  PanelRight,
  Archive,
  Music as MusicIcon,
  Target
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { CalendarNotifications } from "@/components/calendar/calendar-notifications";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Link } from "react-router-dom";
import type { CalendarEvent } from "./types";

interface CalendarNavProps {
  isAuthenticated: boolean;
  user: {
    id: string;
    email: string;
    name?: string;
    username: string;
    is_admin?: boolean;
    is_v2ray_admin?: boolean;
    has_v2ray_access?: boolean;
    profile_picture?: string;
  } | null;
  logout: () => void;
  selectedDate: Date;
  setSelectedDate: React.Dispatch<React.SetStateAction<Date>>;
  setCreatingEvent: React.Dispatch<React.SetStateAction<boolean>>;
  showChecklist: boolean;
  setShowChecklist: React.Dispatch<React.SetStateAction<boolean>>;
  setShowSummary: React.Dispatch<React.SetStateAction<boolean>>;
  isRefreshing: boolean;
  saveAllAndRefresh: () => Promise<void>;
  handleImport: () => void;
  handleExport: () => void;
  handleDeleteAllData: (password: string) => Promise<void>;
  events: CalendarEvent[];
  todayEvents: CalendarEvent[];
  importantEvents: CalendarEvent[];
  isScrolled: boolean;
  isSearchOpen: boolean;
  setIsSearchOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  activeSection: string;
  setActiveSection: React.Dispatch<React.SetStateAction<string>>;
}

export const CalendarNav: React.FC<CalendarNavProps> = ({
  isAuthenticated,
  user,
  logout,
  selectedDate,
  setSelectedDate,
  setCreatingEvent,
  showChecklist,
  setShowChecklist,
  setShowSummary,
  isRefreshing,
  saveAllAndRefresh,
  handleImport,
  handleExport,
  handleDeleteAllData,
  events,
  todayEvents,
  importantEvents,
  isScrolled,
  activeSection,
  setActiveSection
}) => {
  const [leftOpen, setLeftOpen] = React.useState(false);
  const [rightOpen, setRightOpen] = React.useState(false);
  const [isTelegramDialogOpen, setIsTelegramDialogOpen] = React.useState(false);
  const [telegramUsername, setTelegramUsername] = React.useState("");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [deletePassword, setDeletePassword] = React.useState("");

  const navItems = [
    { id: "calendar", label: "Calendar", icon: CalendarIcon },
    { id: "tasks", label: "Tasks", icon: CheckSquare },
    { id: "teams", label: "Teams", icon: Users },
    { id: "notifications", label: "Exercise", icon: Target },
    { id: "music", label: "Music", icon: MusicIcon }
  ];

  const getUserInitials = () => {
    if (!user?.name) return "U";
    return user.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getProfileImageUrl = () => {
    return user?.profile_picture || null;
  };

  const ProfileDropdown = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="relative h-10 w-10 rounded-lg p-0 hover:bg-muted/50 transition-all duration-200"
          aria-label="User menu"
        >
          {getProfileImageUrl() ? (
            <img
              src={getProfileImageUrl()!}
              alt={user?.name || 'Profile'}
              className="h-10 w-10 rounded-lg object-cover border-2 border-border"
            />
          ) : (
            <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-muted text-foreground font-medium text-sm">
              {getUserInitials()}
            </div>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="flex items-center gap-3 p-2">
          <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-muted text-foreground font-medium text-xs">
            {getUserInitials()}
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {user?.name || "User"}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {user?.email || ""}
            </p>
          </div>
        </div>
        <DropdownMenuSeparator />
        <Link to="/settings">
          <DropdownMenuItem className="flex items-center gap-3">
            <Settings className="w-4 h-4" />
            Settings
          </DropdownMenuItem>
        </Link>
        <DropdownMenuItem
          onSelect={() => setIsTelegramDialogOpen(true)}
          className="flex items-center gap-3"
        >
          <Send className="w-4 h-4" />
          Connect to Telegram
        </DropdownMenuItem>
        <DropdownMenuItem className="flex items-center gap-3">
          <HelpCircle className="w-4 h-4" />
          Help & Support
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="flex items-center gap-3 text-destructive focus:text-destructive"
          onClick={logout}
        >
          <LogOut className="w-4 h-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <>
      {isAuthenticated && (
        <header
          className={`fixed top-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-md transition-all duration-300 ${
            isScrolled ? "border-b border-border shadow-sm" : ""
          }`}
        >
          <div className="container mx-auto px-4 sm:px-6 py-3">
            <div className="flex items-center justify-between md:hidden">
              <Sheet open={leftOpen} onOpenChange={setLeftOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9">
                    <Menu className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-80 p-6">
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold">Calendar Menu</h3>
                    {navItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeSection === item.id;
                      return (
                        <Button
                          key={item.id}
                          variant={isActive ? "secondary" : "ghost"}
                          className="w-full justify-start h-10"
                          onClick={() => {
                            setActiveSection(item.id);
                            setLeftOpen(false);
                          }}
                        >
                          <Icon className="mr-3 h-4 w-4" />
                          {item.label}
                        </Button>
                      );
                    })}
                    <Collapsible>
                      <CollapsibleTrigger asChild>
                        <Button
                          variant="ghost"
                          className="w-full justify-start h-10"
                        >
                          <LayoutTemplate className="mr-3 h-4 w-4" />
                          Templates
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="pl-8 space-y-1 pt-2">
                          <Button
                            variant="ghost"
                            className="w-full justify-start h-9"
                          >
                            - Event Template 1
                          </Button>
                          <Button
                            variant="ghost"
                            className="w-full justify-start h-9"
                          >
                            - Event Template 2
                          </Button>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                    <Separator />
                    <CalendarNotifications
                      events={events.map((event) => ({
                        id: event.id,
                        title: event.title,
                        startTime: new Date(event.startDate),
                        endTime: new Date(event.endDate)
                      }))}
                    />
                    <Button
                      variant={showChecklist ? "default" : "outline"}
                      className="w-full justify-start h-10"
                      onClick={() => {
                        setShowChecklist(!showChecklist);
                        setLeftOpen(false);
                      }}
                    >
                      <PanelRight className="mr-3 h-4 w-4" />
                      Checklist
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start h-10"
                      onClick={() => {
                        setShowSummary(true);
                        setLeftOpen(false);
                      }}
                    >
                      <BarChart3 className="mr-3 h-4 w-4" />
                      Summary
                    </Button>
                    <Button
                      variant="outline"
                      disabled={isRefreshing}
                      className="w-full justify-start h-10"
                      onClick={() => {
                        saveAllAndRefresh();
                        setLeftOpen(false);
                      }}
                    >
                      <RefreshCw
                        className={`mr-3 h-4 w-4 ${
                          isRefreshing ? "animate-spin" : ""
                        }`}
                      />
                      Sync
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start h-10"
                      onClick={() => {
                        handleImport();
                        setLeftOpen(false);
                      }}
                    >
                      <Upload className="mr-3 h-4 w-4" />
                      Import
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start h-10"
                      onClick={() => {
                        handleExport();
                        setLeftOpen(false);
                      }}
                    >
                      <Download className="mr-3 h-4 w-4" />
                      Export
                    </Button>
                    <Button
                      className="w-full justify-start h-10"
                      onClick={() => {
                        setCreatingEvent(true);
                        setLeftOpen(false);
                      }}
                    >
                      <Plus className="mr-3 h-4 w-4" />
                      New Event
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>

              <div className="flex flex-col items-center flex-1 mx-4">
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-lg font-bold text-foreground">
                    {format(selectedDate, "EEEE")}
                  </h1>
                  <div className="flex bg-muted rounded-lg p-1 gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => setSelectedDate(addDays(selectedDate, -1))}
                    >
                      <ChevronLeft className="h-3 w-3" />
                    </Button>
                    <Button
                      variant={isToday(selectedDate) ? "default" : "ghost"}
                      size="sm"
                      className="h-6 px-2 text-xs font-medium min-w-[45px]"
                      onClick={() => setSelectedDate(new Date())}
                    >
                      {format(selectedDate, "EEE")}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => setSelectedDate(addDays(selectedDate, 1))}
                    >
                      <ChevronRight className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
                    >
                      {format(selectedDate, "MMM d, yyyy")}
                      <ChevronDown className="w-3 h-3 ml-1 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-4" align="center">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-sm">
                          Select Month & Year
                        </h4>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-muted-foreground">
                            Month
                          </label>
                          <Select
                            value={getMonth(selectedDate).toString()}
                            onValueChange={(value) =>
                              setSelectedDate(
                                setMonth(selectedDate, parseInt(value))
                              )
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 12 }, (_, i) => (
                                <SelectItem key={i} value={i.toString()}>
                                  {format(new Date(2024, i, 1), "MMMM")}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-muted-foreground">
                            Year
                          </label>
                          <Select
                            value={getYear(selectedDate).toString()}
                            onValueChange={(value) =>
                              setSelectedDate(
                                setYear(selectedDate, parseInt(value))
                              )
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 11 }, (_, i) => {
                                const year = getYear(new Date()) - 5 + i;
                                return (
                                  <SelectItem
                                    key={year}
                                    value={year.toString()}
                                  >
                                    {year}
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <Button
                          onClick={() => setSelectedDate(new Date())}
                          variant="outline"
                          size="sm"
                        >
                          Today
                        </Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              <Sheet open={rightOpen} onOpenChange={setRightOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9">
                    <User className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-80 p-6">
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold">
                      Profile & Settings
                    </h3>
                    <div className="flex items-center gap-4">
                      {getProfileImageUrl() ? (
                        <img
                          src={getProfileImageUrl()!}
                          alt={user?.name || 'Profile'}
                          className="h-10 w-10 rounded-lg object-cover border-2 border-border"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-muted text-foreground font-medium">
                          {getUserInitials()}
                        </div>
                      )}
                      <div>
                        <p className="font-medium">{user?.name || "User"}</p>
                        <p className="text-sm text-muted-foreground">
                          {user?.email}
                        </p>
                      </div>
                    </div>
                    <Separator />
                    <Button
                      variant="ghost"
                      className="w-full justify-start h-10"
                    >
                      <Settings className="mr-3 h-4 w-4" />
                      Settings
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full justify-start h-10"
                    >
                      <HelpCircle className="mr-3 h-4 w-4" />
                      Help & Support
                    </Button>
                    <Button
                      variant="destructive"
                      className="w-full justify-start h-10"
                      onClick={logout}
                    >
                      <LogOut className="mr-3 h-4 w-4" />
                      Log out
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            <div className="hidden md:flex items-center justify-between">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                {/* Desktop navigation - show dropdown on smaller screens, full nav on larger */}
                <div className="hidden xl:flex items-center gap-1">
                  <nav className="flex items-center gap-1">
                    {navItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeSection === item.id;
                      return (
                        <Button
                          key={item.id}
                          variant="ghost"
                          size="sm"
                          className={`h-9 px-3 font-medium whitespace-nowrap ${
                            isActive ? "bg-muted" : ""
                          }`}
                          onClick={() => setActiveSection(item.id)}
                        >
                          <Icon className="mr-2 h-4 w-4" />
                          {item.label}
                        </Button>
                      );
                    })}
                  </nav>
                </div>

                {/* Dropdown navigation for medium screens */}
                <div className="flex xl:hidden items-center">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 px-3 font-medium"
                      >
                        <Menu className="mr-2 h-4 w-4" />
                        {navItems.find(item => item.id === activeSection)?.label || "Navigation"}
                        <ChevronDown className="ml-2 h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-48">
                      {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeSection === item.id;
                        return (
                          <DropdownMenuItem
                            key={item.id}
                            onClick={() => setActiveSection(item.id)}
                            className={`cursor-pointer ${
                              isActive ? "bg-muted" : ""
                            }`}
                          >
                            <Icon className="mr-2 h-4 w-4" />
                            {item.label}
                          </DropdownMenuItem>
                        );
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <Separator orientation="vertical" className="h-6" />

                <div className="flex items-center gap-2">
                  <CalendarNotifications
                    events={events.map((event) => ({
                      id: event.id,
                      title: event.title,
                      startTime: new Date(event.startDate),
                      endTime: new Date(event.endDate)
                    }))}
                  />
                  <Button
                    variant={showChecklist ? "default" : "outline"}
                    size="sm"
                    className="h-9"
                    onClick={() => setShowChecklist(!showChecklist)}
                  >
                    <PanelRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex flex-col items-center mx-8 flex-shrink-0">
                <div className="flex items-center gap-4 mb-2">

                  <div className="flex items-center gap-2">
                    <div className="flex bg-muted rounded-lg p-1 gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() =>
                          setSelectedDate(subMonths(selectedDate, 1))
                        }
                      >
                        <ChevronsLeft className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() =>
                          setSelectedDate(addDays(selectedDate, -1))
                        }
                      >
                        <ChevronLeft className="h-3 w-3" />
                      </Button>
                      <Button
                        variant={isToday(selectedDate) ? "default" : "ghost"}
                        size="sm"
                        className="h-7 px-3 text-xs font-medium min-w-[60px]"
                        onClick={() => setSelectedDate(new Date())}
                      >
                        {format(selectedDate, "EEE")}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() =>
                          setSelectedDate(addDays(selectedDate, 1))
                        }
                      >
                        <ChevronRight className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() =>
                          setSelectedDate(addMonths(selectedDate, 1))
                        }
                      >
                        <ChevronsRight className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      className="h-auto p-0 text-sm text-muted-foreground hover:text-foreground"
                    >
                      {format(selectedDate, "MMMM d, yyyy")}
                      <ChevronDown className="w-4 h-4 ml-2 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-4" align="center">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-sm">
                          Select Month & Year
                        </h4>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-muted-foreground">
                            Month
                          </label>
                          <Select
                            value={getMonth(selectedDate).toString()}
                            onValueChange={(value) =>
                              setSelectedDate(
                                setMonth(selectedDate, parseInt(value))
                              )
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 12 }, (_, i) => (
                                <SelectItem key={i} value={i.toString()}>
                                  {format(new Date(2024, i, 1), "MMMM")}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-muted-foreground">
                            Year
                          </label>
                          <Select
                            value={getYear(selectedDate).toString()}
                            onValueChange={(value) =>
                              setSelectedDate(
                                setYear(selectedDate, parseInt(value))
                              )
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 11 }, (_, i) => {
                                const year = getYear(new Date()) - 5 + i;
                                return (
                                  <SelectItem
                                    key={year}
                                    value={year.toString()}
                                  >
                                    {year}
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <Button
                          onClick={() => setSelectedDate(new Date())}
                          variant="outline"
                          size="sm"
                        >
                          Today
                        </Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex items-center gap-3 flex-1 justify-end">
                <div className="hidden lg:flex items-center gap-3">
                  <Badge variant="secondary" className="h-7 px-3 text-xs">
                    <BarChart3 className="mr-1 h-3 w-3" />
                    {todayEvents.length} events
                  </Badge>
                  {importantEvents.length > 0 && (
                    <Badge className="h-7 px-3 text-xs">
                      <Star className="mr-1 h-3 w-3" />
                      {importantEvents.length} important
                    </Badge>
                  )}
                </div>

                <Separator orientation="vertical" className="h-6" />

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9"
                    onClick={() => setShowSummary(true)}
                  >
                    <BarChart3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isRefreshing}
                    className="h-9"
                    onClick={saveAllAndRefresh}
                  >
                    <RefreshCw
                      className={`h-4 w-4 ${
                        isRefreshing ? "animate-spin" : ""
                      }`}
                    />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9"
                      >
                        <Archive className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={handleImport}>
                        <Upload className="mr-2 h-4 w-4" />
                        <span>Import</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleExport}>
                        <Download className="mr-2 h-4 w-4" />
                        <span>Export</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => setIsDeleteDialogOpen(true)}
                      >
                        <Archive className="mr-2 h-4 w-4" />
                        <span>Delete all data…</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button
                    size="sm"
                    className="h-9"
                    onClick={() => setCreatingEvent(true)}
                  >
                    <Plus className="h-4 w-4" />
                    <span className="hidden lg:inline ml-2">New Event</span>
                  </Button>
                </div>

                <Separator orientation="vertical" className="h-6" />

                <ProfileDropdown />
              </div>
            </div>
          </div>
        </header>
      )}
      <Dialog open={isTelegramDialogOpen} onOpenChange={setIsTelegramDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Connect to Telegram</DialogTitle>
            <DialogDescription>
              this part is for when the alert dose not working and the telgegram
              bot will alert you
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex flex-col space-y-2">
              <p className="text-sm text-muted-foreground">
                Click the link below to start the bot, then enter your Telegram
                username here to sync your account.
              </p>
              <a
                href="https://t.me/Ixi_flower_bot"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline"
              >
                @Ixi_flower_bot
              </a>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="telegram-username" className="text-right">
                Username
              </Label>
              <Input
                id="telegram-username"
                value={telegramUsername}
                onChange={(e) => setTelegramUsername(e.target.value)}
                className="col-span-3"
                placeholder="Your Telegram username"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsTelegramDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              onClick={() => {
                console.log("Telegram username to save:", telegramUsername);
                setIsTelegramDialogOpen(false);
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete all data</DialogTitle>
            <DialogDescription>
              This will permanently remove all your planner data (events, tasks, goals, templates, notes) from your account. Enter your account password to confirm.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="delete-password" className="text-right">
                Password
              </Label>
              <Input
                id="delete-password"
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                className="col-span-3"
                placeholder="Enter your password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                const pwd = deletePassword;
                setDeletePassword("");
                setIsDeleteDialogOpen(false);
                await handleDeleteAllData(pwd);
              }}
            >
              Permanently delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
