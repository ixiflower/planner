import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { UserPlus, Trash2, Shield, Search, Clock, CheckCircle, XCircle, Edit, Save, X, Calendar, RefreshCcw } from "lucide-react";
import { API_BASE_URL } from "@/config/backend";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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

interface Employee {
  id: string;
  name: string;
  username?: string;
  profile_picture?: string | null;
  morningPresent: boolean;
  afternoonPresent: boolean;
  morningCheckIn?: string;
  morningCheckOut?: string;
  afternoonCheckIn?: string;
  afternoonCheckOut?: string;
  // New attendance states
  morningStatus: 'complete' | 'absent' | 'partial';
  afternoonStatus: 'complete' | 'absent' | 'partial';
  morningPartialTime?: string; // Time when employee came for partial shift
  afternoonPartialTime?: string; // Time when employee came for partial shift
}

interface UserAccess {
  id: string;
  name: string;
  username: string;
  profile_picture: string | null;
  can_see_work_hours: boolean;
}

export default function SimpleWorkHours() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [newEmployeeUsername, setNewEmployeeUsername] = useState("");
  const [employeeToDelete, setEmployeeToDelete] = useState<{ id: string, name: string } | null>(null);
  const [isDeletingEmployee, setIsDeletingEmployee] = useState(false);
  const [loading, setLoading] = useState(true);
  const [addingEmployee, setAddingEmployee] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);
  
  // Shift time management
  const [shiftTimes, setShiftTimes] = useState({
    morningStart: "09:00",
    morningEnd: "13:00",
    afternoonStart: "15:00", 
    afternoonEnd: "19:00"
  });
  const [isEditingShiftTimes, setIsEditingShiftTimes] = useState(false);
  const [tempShiftTimes, setTempShiftTimes] = useState(shiftTimes);
  
  // Access Management State
  const [users, setUsers] = useState<UserAccess[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  const token = localStorage.getItem("authToken") || "";
  const backendUrl = API_BASE_URL.replace('/tickets/api', '');

  // Fetch all users and their working hours from backend
  useEffect(() => {
    if (user?.developer || user?.can_see_work_hours) {
      void fetchAttendance();
    }
    
    // Load saved shift times from localStorage
    const savedShiftTimes = localStorage.getItem('workHoursShiftTimes');
    if (savedShiftTimes) {
      try {
        const parsedTimes = JSON.parse(savedShiftTimes);
        setShiftTimes(parsedTimes);
        setTempShiftTimes(parsedTimes);
      } catch (error) {
        console.error('Error loading saved shift times:', error);
      }
    }
  }, [user, selectedDate]);

  // If user doesn't have permission, don't render anything
  if (!user?.developer && !user?.can_see_work_hours) {
    return null;
  }

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      let authToken = token;
      if (authToken && !authToken.startsWith("Token ")) {
        authToken = `Token ${authToken}`;
      }
      
      const response = await fetch(`${backendUrl}/api/team/`, {
        method: "GET",
        headers: {
          Authorization: authToken,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data.users.map((u: any) => ({
          id: u.id.toString(),
          name: u.name || u.username,
          username: u.username,
          profile_picture: u.avatarUrl,
          can_see_work_hours: u.can_see_work_hours || false,
        })));
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const toggleAccess = async (userId: string, currentAccess: boolean) => {
    try {
      let authToken = token;
      if (authToken && !authToken.startsWith("Token ")) {
        authToken = `Token ${authToken}`;
      }

      const response = await fetch(`${backendUrl}/api/team/update-user/`, {
        method: "PATCH",
        headers: {
          Authorization: authToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: userId,
          can_see_work_hours: !currentAccess
        }),
      });

      if (response.ok) {
        setUsers(users.map(u => 
          u.id === userId ? { ...u, can_see_work_hours: !currentAccess } : u
        ));
      }
    } catch (error) {
      console.error("Error updating access:", error);
    }
  };

  const fetchAttendance = useCallback(async () => {
    setLoading(true);
    try {
      let authToken = token;
      if (authToken && !authToken.startsWith("Token ")) {
        authToken = `Token ${authToken}`;
      }

      // First fetch all team members to ensure we have everyone
      const teamRes = await fetch(`${backendUrl}/api/team/`, {
        headers: { Authorization: authToken }
      });
      const teamData = await teamRes.json();
      const allTeamUsers = teamData.users || [];

      // Then fetch attendance records for the selected date
      const attendanceRes = await fetch(`${backendUrl}/api/attendance/?date=${selectedDate}`, {
        headers: { Authorization: authToken }
      });
      const attendanceRecords = await attendanceRes.json();
      
      // Map records by user ID for easy lookup
      const recordsByUser = new Map();
      attendanceRecords.forEach((rec: any) => {
        recordsByUser.set(rec.user.toString(), rec);
      });

      // Merge team members with attendance records
      const employeeList: Employee[] = allTeamUsers.map((u: any) => {
        const record = recordsByUser.get(u.id.toString());
        
        return {
          id: u.id.toString(),
          name: u.name || u.username,
          username: u.username,
          profile_picture: u.avatarUrl,
          morningPresent: record?.morning_status === 'complete',
          afternoonPresent: record?.afternoon_status === 'complete',
          morningCheckIn: record?.morning_check_in,
          morningCheckOut: record?.morning_check_out,
          afternoonCheckIn: record?.afternoon_check_in,
          afternoonCheckOut: record?.afternoon_check_out,
          morningStatus: record?.morning_status || 'absent',
          afternoonStatus: record?.afternoon_status || 'absent',
          morningPartialTime: record?.morning_partial_time || undefined,
          afternoonPartialTime: record?.afternoon_partial_time || undefined,
        };
      });

      setEmployees(employeeList);
    } catch (error) {
      console.error("Error fetching attendance:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedDate, token, backendUrl]);

  const saveAllAttendance = async () => {
    setSaving(true);
    try {
      let authToken = token;
      if (authToken && !authToken.startsWith("Token ")) {
        authToken = `Token ${authToken}`;
      }

      const updates = employees.map(emp => ({
        user: emp.id,
        morning_status: emp.morningStatus,
        morning_partial_time: emp.morningPartialTime || null,
        afternoon_status: emp.afternoonStatus,
        afternoon_partial_time: emp.afternoonPartialTime || null,
      }));

      const response = await fetch(`${backendUrl}/api/attendance/bulk-update/`, {
        method: "POST",
        headers: {
          Authorization: authToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          date: selectedDate,
          updates: updates
        }),
      });

      if (response.ok) {
        await fetchAttendance();
        toast.success("Attendance saved successfully!");
      } else {
        toast.error("Failed to save attendance");
      }
    } catch (error) {
      console.error("Error saving attendance:", error);
      toast.error("Error saving attendance");
    } finally {
      setSaving(false);
    }
  };

  const updateAttendanceStatus = (employeeId: string, shift: 'morning' | 'afternoon', status: 'complete' | 'absent' | 'partial') => {
    setEmployees(prev => prev.map(emp => 
      emp.id === employeeId 
        ? { 
            ...emp, 
            [`${shift}Status`]: status,
            ...(status !== 'partial' ? { [`${shift}PartialTime`]: undefined } : {}),
            [`${shift}Present`]: status === 'complete'
          }
        : emp
    ));
  };

  const updatePartialTime = (employeeId: string, shift: 'morning' | 'afternoon', time: string) => {
    setEmployees(prev => prev.map(emp => 
      emp.id === employeeId 
        ? { ...emp, [`${shift}PartialTime`]: time }
        : emp
    ));
  };

  // Shift time management functions
  const startEditingShiftTimes = () => {
    setTempShiftTimes(shiftTimes);
    setIsEditingShiftTimes(true);
  };

  const cancelEditingShiftTimes = () => {
    setTempShiftTimes(shiftTimes);
    setIsEditingShiftTimes(false);
  };

  const saveShiftTimes = async () => {
    try {
      setShiftTimes(tempShiftTimes);
      setIsEditingShiftTimes(false);
      
      // Save to localStorage for persistence
      localStorage.setItem('workHoursShiftTimes', JSON.stringify(tempShiftTimes));
      
      console.log('Shift times saved:', tempShiftTimes);
    } catch (error) {
      console.error("Error saving shift times:", error);
    }
  };

  const handleShiftTimeChange = (field: keyof typeof shiftTimes, value: string) => {
    setTempShiftTimes(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const updateName = (id: string, newName: string) => {
    setEmployees(employees.map(emp => 
      emp.id === id ? { ...emp, name: newName } : emp
    ));
  };

  const addEmployee = async () => {
    if (!newEmployeeUsername.trim()) {
      setAddError("Please enter a username");
      return;
    }

    setAddingEmployee(true);
    setAddError(null);

    try {
      // Auto-generate password and use username as name
      const autoPassword = "password123"; // Default password
      
      // Register new user via backend
      const response = await fetch(`${API_BASE_URL}/auth/register/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newEmployeeUsername,
          username: newEmployeeUsername,
          password: autoPassword,
          password2: autoPassword,
          email: `${newEmployeeUsername}@company.local`,
        }),
      });

      if (response.ok) {
        // Clear form
        setNewEmployeeUsername("");
        setAddError(null);
        // Refresh employee list
        await fetchWorkingHours();
      } else {
        const data = await response.json();
        setAddError(data.error || data.message || "Failed to add employee");
      }
    } catch (error) {
      console.error("Error adding employee:", error);
      setAddError("Failed to add employee");
    } finally {
      setAddingEmployee(false);
    }
  };

  const confirmDeleteEmployee = async () => {
    if (!employeeToDelete) return;
    setIsDeletingEmployee(true);
    try {
      let authToken = token;
      if (authToken && !authToken.startsWith("Token ")) {
        authToken = `Token ${authToken}`;
      }
      
      const response = await fetch(`${backendUrl}/api/users/delete/${employeeToDelete.id}/`, {
        method: 'DELETE',
        headers: {
          'Authorization': authToken,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setEmployees(employees.filter(emp => emp.id !== employeeToDelete.id));
        toast.success(`Employee ${employeeToDelete.name} removed successfully`);
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to delete user');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Failed to delete user');
    } finally {
      setIsDeletingEmployee(false);
      setEmployeeToDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Simple Table */}
      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Work Hours Attendance
            </CardTitle>
            <CardDescription>
              <div className="space-y-2 mt-1">
                <span className="text-xs">
                  Morning: {shiftTimes.morningStart}-{shiftTimes.morningEnd} | Afternoon: {shiftTimes.afternoonStart}-{shiftTimes.afternoonEnd}
                </span>
                
                <div className="flex flex-wrap items-center gap-4 mt-2">
                  <div className="flex items-center gap-2 bg-muted/50 p-1.5 rounded-lg border">
                    <Label htmlFor="date-picker" className="text-xs font-semibold whitespace-nowrap ml-1">Date:</Label>
                    <Input
                      id="date-picker"
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="h-8 text-xs w-36 border-none bg-transparent focus-visible:ring-0"
                    />
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 w-7 p-0" 
                      onClick={() => void fetchAttendance()}
                      title="Refresh"
                    >
                      <RefreshCcw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>

                  <div className="text-[10px] md:text-xs flex items-center gap-2 flex-wrap">
                    <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-green-600" /> Complete</span>
                    <span className="flex items-center gap-1"><XCircle className="w-3 h-3 text-red-600" /> Absent</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-orange-600" /> Partial</span>
                  </div>
                </div>
              </div>
            </CardDescription>
          </div>

          <div className="flex items-center gap-2 self-end md:self-center">
            {user?.developer && (
              <Button
                onClick={saveAllAttendance}
                disabled={saving || loading}
                className="h-9 px-4 bg-green-600 hover:bg-green-700 text-white font-bold shadow-lg"
              >
                {saving ? (
                  <>
                    <RefreshCcw className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save All
                  </>
                )}
              </Button>
            )}

            {!isEditingShiftTimes && (
              <Button
                variant="outline"
                size="sm"
                onClick={startEditingShiftTimes}
                className="h-9 text-xs"
              >
                <Edit className="w-3 h-3 mr-1" />
                Shift Times
              </Button>
            )}

            {user?.developer && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" onClick={fetchUsers} className="h-9">
                    <Shield className="w-4 h-4 mr-2" />
                    Access
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Attendance Access</DialogTitle>
                    <DialogDescription>
                      Who can view and edit the Attendance sheet.
                    </DialogDescription>
                  </DialogHeader>
                  {/* ... dialog content remains the same ... */}
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search users..."
                      className="pl-8"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <div className="border rounded-md divide-y">
                    {users
                      .filter(u => 
                        u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        u.username.toLowerCase().includes(searchQuery.toLowerCase())
                      )
                      .map((u) => (
                      <div key={u.id} className="flex items-center justify-between p-3">
                        <div className="flex items-center gap-3">
                          {u.profile_picture ? (
                            <img src={u.profile_picture} alt={u.name} className="w-8 h-8 rounded-full" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
                              {u.name.substring(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div className="flex flex-col">
                            <span className="font-medium text-sm">{u.name}</span>
                            <span className="text-xs text-muted-foreground">@{u.username}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground mr-2">
                            {u.can_see_work_hours ? "Can View" : "No Access"}
                          </span>
                          <Checkbox
                            checked={u.can_see_work_hours}
                            onCheckedChange={() => toggleAccess(u.id, u.can_see_work_hours)}
                          />
                        </div>
                      </div>
                    ))}
                    {loadingUsers && (
                      <div className="p-4 text-center text-sm text-muted-foreground">Loading users...</div>
                    )}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Shift Time Editor */}
          {isEditingShiftTimes && (
            <div className="mb-6 p-4 bg-muted/30 rounded-lg border animate-in fade-in slide-in-from-top-2">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Edit Shift Times
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-4">
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Morning Shift</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="time"
                      value={tempShiftTimes.morningStart}
                      onChange={(e) => handleShiftTimeChange('morningStart', e.target.value)}
                      className="h-9"
                    />
                    <span className="text-sm text-muted-foreground">to</span>
                    <Input
                      type="time"
                      value={tempShiftTimes.morningEnd}
                      onChange={(e) => handleShiftTimeChange('morningEnd', e.target.value)}
                      className="h-9"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Afternoon Shift</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="time"
                      value={tempShiftTimes.afternoonStart}
                      onChange={(e) => handleShiftTimeChange('afternoonStart', e.target.value)}
                      className="h-9"
                    />
                    <span className="text-sm text-muted-foreground">to</span>
                    <Input
                      type="time"
                      value={tempShiftTimes.afternoonEnd}
                      onChange={(e) => handleShiftTimeChange('afternoonEnd', e.target.value)}
                      className="h-9"
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={cancelEditingShiftTimes}
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={saveShiftTimes}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Times
                </Button>
              </div>
            </div>
          )}

          {/* Add Employee Form */}
          <div className="mb-6 pb-6 border-b animate-fade-in">
            <h3 className="text-sm font-semibold mb-3">Add New Employee</h3>
            {addError && (
              <div className="mb-3 p-2 bg-red-100 border border-red-400 text-red-700 rounded text-sm animate-fade-in">
                {addError}
              </div>
            )}
            <div className="flex gap-2">
              <Input
                placeholder="Enter username..."
                value={newEmployeeUsername}
                onChange={(e) => setNewEmployeeUsername(e.target.value)}
                disabled={addingEmployee}
                onKeyDown={(e) => e.key === "Enter" && addEmployee()}
                className="flex-1"
              />
              <Button 
                onClick={addEmployee}
                disabled={addingEmployee || !newEmployeeUsername.trim()}
              >
                <UserPlus className="w-4 h-4 mr-2" />
                {addingEmployee ? "Adding..." : "Add Employee"}
              </Button>
            </div>
          </div>

          {loading && (
            <div className="text-center py-8 text-muted-foreground">
              Loading employees...
            </div>
          )}

          {!loading && employees.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No employees found. Add your first employee above.
            </div>
          )}

          {!loading && employees.length > 0 && (
            <>

          {/* Compact Table */}
          <div className="overflow-x-auto animate-fade-in">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 font-medium text-xs">Name</th>
                  <th className="text-center p-2 font-medium text-xs bg-amber-50 dark:bg-amber-900/20">Morning</th>
                  <th className="text-center p-2 font-medium text-xs bg-blue-50 dark:bg-blue-900/20">Afternoon</th>
                  <th className="text-center p-2 font-medium text-xs">Candle</th>
                  <th className="text-center p-2 font-medium text-xs w-12"></th>
                </tr>
              </thead>
              <tbody>
                {employees.map((employee, index) => (
                  <tr key={employee.id} className={`border-b ${index % 2 === 0 ? "bg-muted/20" : ""}`}>
                    {/* Name with Avatar */}
                    <td className="p-2">
                      <div className="flex items-center gap-2">
                        {employee.profile_picture && (
                          <img 
                            src={employee.profile_picture} 
                            alt={employee.name}
                            className="w-8 h-8 rounded-full object-cover border-2 border-muted"
                            onError={(e) => {
                              // Hide image if it fails to load
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        )}
                        <Input
                          value={employee.name}
                          onChange={(e) => updateName(employee.id, e.target.value)}
                          className="border-none bg-transparent font-medium h-8 text-sm p-1 flex-1"
                        />
                      </div>
                    </td>

                    {/* Morning Attendance Options */}
                    <td className="p-2 bg-amber-50/50 dark:bg-amber-900/10">
                      <div className="flex flex-col gap-2 w-full min-w-[200px]">
                        <RadioGroup
                          value={employee.morningStatus || 'absent'}
                          onValueChange={(value: 'complete' | 'absent' | 'partial') => 
                            updateAttendanceStatus(employee.id, 'morning', value)
                          }
                          className="flex flex-col gap-1"
                        >
                          {/* Complete Shift Option */}
                          <div className="flex items-center space-x-2 p-1 rounded hover:bg-green-50 dark:hover:bg-green-900/20">
                            <RadioGroupItem value="complete" id={`morning-complete-${employee.id}`} className="w-4 h-4" />
                            <Label htmlFor={`morning-complete-${employee.id}`} className="text-xs cursor-pointer flex items-center gap-1">
                              <CheckCircle className="w-3 h-3 text-green-600" />
                              Complete
                            </Label>
                          </div>
                          
                          {/* Absent Option */}
                          <div className="flex items-center space-x-2 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20">
                            <RadioGroupItem value="absent" id={`morning-absent-${employee.id}`} className="w-4 h-4" />
                            <Label htmlFor={`morning-absent-${employee.id}`} className="text-xs cursor-pointer flex items-center gap-1">
                              <XCircle className="w-3 h-3 text-red-600" />
                              Absent
                            </Label>
                          </div>
                          
                          {/* Partial Shift Option */}
                          <div className="flex items-center space-x-2 p-1 rounded hover:bg-orange-50 dark:hover:bg-orange-900/20">
                            <RadioGroupItem value="partial" id={`morning-partial-${employee.id}`} className="w-4 h-4" />
                            <Label htmlFor={`morning-partial-${employee.id}`} className="text-xs cursor-pointer flex items-center gap-1">
                              <Clock className="w-3 h-3 text-orange-600" />
                              Partial
                            </Label>
                          </div>
                        </RadioGroup>
                        
                        {/* Partial Time Input */}
                        {employee.morningStatus === 'partial' && (
                          <div className="mt-2 space-y-1">
                            <Label className="text-[10px] text-muted-foreground">Arrival time:</Label>
                            <Input
                              type="time"
                              className="h-7 text-xs w-full"
                              placeholder="Arrival time"
                              value={employee.morningPartialTime || ""}
                              onChange={(e) => updatePartialTime(employee.id, 'morning', e.target.value)}
                            />
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Afternoon Attendance Options */}
                    <td className="p-2 bg-blue-50/50 dark:bg-blue-900/10">
                      <div className="flex flex-col gap-2 w-full min-w-[200px]">
                        <RadioGroup
                          value={employee.afternoonStatus || 'absent'}
                          onValueChange={(value: 'complete' | 'absent' | 'partial') => 
                            updateAttendanceStatus(employee.id, 'afternoon', value)
                          }
                          className="flex flex-col gap-1"
                        >
                          {/* Complete Shift Option */}
                          <div className="flex items-center space-x-2 p-1 rounded hover:bg-green-50 dark:hover:bg-green-900/20">
                            <RadioGroupItem value="complete" id={`afternoon-complete-${employee.id}`} className="w-4 h-4" />
                            <Label htmlFor={`afternoon-complete-${employee.id}`} className="text-xs cursor-pointer flex items-center gap-1">
                              <CheckCircle className="w-3 h-3 text-green-600" />
                              Complete
                            </Label>
                          </div>
                          
                          {/* Absent Option */}
                          <div className="flex items-center space-x-2 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20">
                            <RadioGroupItem value="absent" id={`afternoon-absent-${employee.id}`} className="w-4 h-4" />
                            <Label htmlFor={`afternoon-absent-${employee.id}`} className="text-xs cursor-pointer flex items-center gap-1">
                              <XCircle className="w-3 h-3 text-red-600" />
                              Absent
                            </Label>
                          </div>
                          
                          {/* Partial Shift Option */}
                          <div className="flex items-center space-x-2 p-1 rounded hover:bg-orange-50 dark:hover:bg-orange-900/20">
                            <RadioGroupItem value="partial" id={`afternoon-partial-${employee.id}`} className="w-4 h-4" />
                            <Label htmlFor={`afternoon-partial-${employee.id}`} className="text-xs cursor-pointer flex items-center gap-1">
                              <Clock className="w-3 h-3 text-orange-600" />
                              Partial
                            </Label>
                          </div>
                        </RadioGroup>
                        
                        {/* Partial Time Input */}
                        {employee.afternoonStatus === 'partial' && (
                          <div className="mt-2 space-y-1">
                            <Label className="text-[10px] text-muted-foreground">Arrival time:</Label>
                            <Input
                              type="time"
                              className="h-7 text-xs w-full"
                              placeholder="Arrival time"
                              value={employee.afternoonPartialTime || ""}
                              onChange={(e) => updatePartialTime(employee.id, 'afternoon', e.target.value)}
                            />
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Enhanced Mini Candles */}
                    <td className="p-2">
                      <div className="flex items-center justify-center gap-2">
                        {/* Morning Mini Candle */}
                        <div className="relative w-5 h-12 bg-gradient-to-b from-amber-100 to-amber-200 dark:from-amber-900/20 dark:to-amber-800/20 rounded-t-sm border border-amber-300 dark:border-amber-700 overflow-hidden">
                          {/* Complete Shift - Full candle */}
                          {employee.morningStatus === 'complete' && (
                            <>
                              <div className="absolute bottom-0 left-0 right-0 h-full bg-gradient-to-t from-amber-600 to-amber-500 animate-pulse" />
                              <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                                <div className="w-2 h-3 bg-gradient-to-t from-orange-500 via-yellow-400 to-yellow-300 rounded-full animate-pulse" />
                              </div>
                            </>
                          )}
                          {/* Partial Shift - Half candle */}
                          {employee.morningStatus === 'partial' && (
                            <>
                              <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-orange-600 to-orange-500" />
                              <div className="absolute -top-1 left-1/2 -translate-x-1/2">
                                <div className="w-1.5 h-2 bg-gradient-to-t from-orange-600 via-yellow-500 to-yellow-400 rounded-full" />
                              </div>
                              {/* Time indicator */}
                              {employee.morningPartialTime && (
                                <div className="absolute bottom-0 left-0 right-0 text-[6px] text-center text-amber-800 dark:text-amber-200 font-mono bg-amber-200/50 dark:bg-amber-800/50">
                                  {employee.morningPartialTime.slice(0, 5)}
                                </div>
                              )}
                            </>
                          )}
                          {/* Absent - No light, just border */}
                          {employee.morningStatus === 'absent' && (
                            <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 opacity-50" />
                          )}
                        </div>
                        
                        {/* Afternoon Mini Candle */}
                        <div className="relative w-5 h-12 bg-gradient-to-b from-blue-100 to-blue-200 dark:from-blue-900/20 dark:to-blue-800/20 rounded-t-sm border border-blue-300 dark:border-blue-700 overflow-hidden">
                          {/* Complete Shift - Full candle */}
                          {employee.afternoonStatus === 'complete' && (
                            <>
                              <div className="absolute bottom-0 left-0 right-0 h-full bg-gradient-to-t from-blue-600 to-blue-500 animate-pulse" />
                              <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                                <div className="w-2 h-3 bg-gradient-to-t from-orange-500 via-yellow-400 to-yellow-300 rounded-full animate-pulse" />
                              </div>
                            </>
                          )}
                          {/* Partial Shift - Half candle */}
                          {employee.afternoonStatus === 'partial' && (
                            <>
                              <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-orange-600 to-orange-500" />
                              <div className="absolute -top-1 left-1/2 -translate-x-1/2">
                                <div className="w-1.5 h-2 bg-gradient-to-t from-orange-600 via-yellow-500 to-yellow-400 rounded-full" />
                              </div>
                              {/* Time indicator */}
                              {employee.afternoonPartialTime && (
                                <div className="absolute bottom-0 left-0 right-0 text-[6px] text-center text-blue-800 dark:text-blue-200 font-mono bg-blue-200/50 dark:bg-blue-800/50">
                                  {employee.afternoonPartialTime.slice(0, 5)}
                                </div>
                              )}
                            </>
                          )}
                          {/* Absent - No light, just border */}
                          {employee.afternoonStatus === 'absent' && (
                            <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 opacity-50" />
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Remove Button */}
                    <td className="p-2 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEmployeeToDelete({ id: employee.id, name: employee.name })}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 h-6 w-6 p-0"
                        title="Remove employee"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Bottom Save Button - Only for Developers */}
          {user?.developer && employees.length > 0 && (
            <div className="mt-6 flex justify-end">
              <Button
                onClick={saveAllAttendance}
                disabled={saving || loading}
                size="lg"
                className="bg-green-600 hover:bg-green-700 text-white font-bold shadow-xl px-8"
              >
                {saving ? (
                  <>
                    <RefreshCcw className="w-5 h-5 mr-2 animate-spin" />
                    Saving Attendance...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5 mr-2" />
                    Save All Changes for {selectedDate}
                  </>
                )}
              </Button>
            </div>
          )}
          </>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!employeeToDelete} onOpenChange={(open) => !open && setEmployeeToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Employee</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {employeeToDelete?.name}? This will delete the user account and this action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingEmployee}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault();
                void confirmDeleteEmployee();
              }}
              disabled={isDeletingEmployee}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeletingEmployee ? "Removing..." : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
