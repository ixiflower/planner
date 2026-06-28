import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Clock, LogIn, LogOut, Users } from "lucide-react";
import { API_BASE_URL } from "@/config/backend";
import WorkHourCandle from "@/components/WorkHourCandle";

interface WorkingHoursData {
  id: number;
  date: string;
  morning_check_in: string | null;
  morning_check_out: string | null;
  afternoon_check_in: string | null;
  afternoon_check_out: string | null;
  is_currently_working: boolean;
  current_shift: string | null;
}

interface UserAtWork {
  id: number;
  username: string;
  name: string;
  profile_picture: string | null;
  is_currently_working: boolean;
  current_shift: string | null;
  morning_check_in?: string | null;
  morning_check_out?: string | null;
  afternoon_check_in?: string | null;
  afternoon_check_out?: string | null;
}

interface WorkingHoursProps {
  token: string;
}

export default function WorkingHours({ token }: WorkingHoursProps) {
  const [myWorkingHours, setMyWorkingHours] = useState<WorkingHoursData | null>(null);
  const [usersAtWork, setUsersAtWork] = useState<UserAtWork[]>([]);
  const [usersNotAtWork, setUsersNotAtWork] = useState<UserAtWork[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWorkingHours = async () => {
    try {
      let authToken = token;
      if (authToken && !authToken.startsWith("Token ")) {
        authToken = `Token ${authToken}`;
      }

      const response = await fetch(`${API_BASE_URL}/api/working-hours`, {
        method: "GET",
        headers: {
          Authorization: authToken,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setMyWorkingHours(data.my_working_hours);
        setUsersAtWork(data.users_at_work || []);
        setUsersNotAtWork(data.users_not_at_work || []);
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to fetch working hours");
      }
    } catch (err) {
      setError("Failed to fetch working hours");
      console.error("Error fetching working hours:", err);
    }
  };

  useEffect(() => {
    if (token) {
      fetchWorkingHours();
    }
  }, [token]);

  const handleCheckIn = async (shift: "morning" | "afternoon") => {
    setLoading(true);
    setError(null);

    try {
      let authToken = token;
      if (authToken && !authToken.startsWith("Token ")) {
        authToken = `Token ${authToken}`;
      }

      const response = await fetch(`${API_BASE_URL}/api/working-hours/check-in`, {
        method: "POST",
        headers: {
          Authorization: authToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ shift }),
      });

      if (response.ok) {
        const data = await response.json();
        setMyWorkingHours(data.working_hours);
        await fetchWorkingHours();
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to check in");
      }
    } catch (err) {
      setError("Failed to check in");
      console.error("Error checking in:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async (shift: "morning" | "afternoon") => {
    setLoading(true);
    setError(null);

    try {
      let authToken = token;
      if (authToken && !authToken.startsWith("Token ")) {
        authToken = `Token ${authToken}`;
      }

      const response = await fetch(`${API_BASE_URL}/api/working-hours/check-out`, {
        method: "POST",
        headers: {
          Authorization: authToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ shift }),
      });

      if (response.ok) {
        const data = await response.json();
        setMyWorkingHours(data.working_hours);
        await fetchWorkingHours();
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to check out");
      }
    } catch (err) {
      setError("Failed to check out");
      console.error("Error checking out:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateString: string | null) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="space-y-6">
      {/* Users At Work Display - Top of Page */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Team Status
          </CardTitle>
          <CardDescription>Who's at work right now</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Work Hour Candles Visualization */}
            <div>
              <h3 className="text-sm font-medium mb-3">Work Hour Candles</h3>
              <div className="flex flex-wrap gap-4">
                {/* Users At Work */}
                {usersAtWork.map((user) => (
                  <WorkHourCandle
                    key={user.id}
                    username={user.name}
                    profilePicture={user.profile_picture}
                    morningCheckIn={user.morning_check_in}
                    morningCheckOut={user.morning_check_out}
                    afternoonCheckIn={user.afternoon_check_in}
                    afternoonCheckOut={user.afternoon_check_out}
                    isCurrentlyWorking={user.is_currently_working}
                    currentShift={user.current_shift}
                  />
                ))}
                
                {/* Users Not At Work */}
                {usersNotAtWork.map((user) => (
                  <WorkHourCandle
                    key={user.id}
                    username={user.name}
                    profilePicture={user.profile_picture}
                    morningCheckIn={user.morning_check_in}
                    morningCheckOut={user.morning_check_out}
                    afternoonCheckIn={user.afternoon_check_in}
                    afternoonCheckOut={user.afternoon_check_out}
                    isCurrentlyWorking={user.is_currently_working}
                    currentShift={user.current_shift}
                  />
                ))}
              </div>
              {usersAtWork.length === 0 && usersNotAtWork.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">No users found</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Working Hours Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Working Hours
          </CardTitle>
          <CardDescription>Track your working hours (9:00-13:00 & 15:00-19:00)</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-3 bg-red-100/50 border border-red-400/50 text-red-700 rounded-md text-sm">
              {error}
            </div>
          )}

          <div className="space-y-6">
            {/* Morning Shift: 9:00-13:00 */}
            <div className="border rounded-lg p-4 bg-amber-50 dark:bg-amber-900/10">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-lg">Morning Shift</h3>
                  <p className="text-sm text-muted-foreground">9:00 AM - 1:00 PM</p>
                </div>
                <Badge variant={myWorkingHours?.current_shift === "morning" ? "default" : "outline"}>
                  {myWorkingHours?.current_shift === "morning" ? "Active" : "Inactive"}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Check In</label>
                  <p className="text-lg font-semibold">
                    {formatTime(myWorkingHours?.morning_check_in || null)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Check Out</label>
                  <p className="text-lg font-semibold">
                    {formatTime(myWorkingHours?.morning_check_out || null)}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => handleCheckIn("morning")}
                  disabled={loading || !!myWorkingHours?.morning_check_in}
                  className="flex-1"
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  Check In
                </Button>
                <Button
                  onClick={() => handleCheckOut("morning")}
                  disabled={
                    loading ||
                    !myWorkingHours?.morning_check_in ||
                    !!myWorkingHours?.morning_check_out
                  }
                  variant="outline"
                  className="flex-1"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Check Out
                </Button>
              </div>
            </div>

            {/* Afternoon Shift: 15:00-19:00 */}
            <div className="border rounded-lg p-4 bg-blue-50 dark:bg-blue-900/10">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-lg">Afternoon Shift</h3>
                  <p className="text-sm text-muted-foreground">3:00 PM - 7:00 PM</p>
                </div>
                <Badge variant={myWorkingHours?.current_shift === "afternoon" ? "default" : "outline"}>
                  {myWorkingHours?.current_shift === "afternoon" ? "Active" : "Inactive"}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Check In</label>
                  <p className="text-lg font-semibold">
                    {formatTime(myWorkingHours?.afternoon_check_in || null)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Check Out</label>
                  <p className="text-lg font-semibold">
                    {formatTime(myWorkingHours?.afternoon_check_out || null)}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => handleCheckIn("afternoon")}
                  disabled={loading || !!myWorkingHours?.afternoon_check_in}
                  className="flex-1"
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  Check In
                </Button>
                <Button
                  onClick={() => handleCheckOut("afternoon")}
                  disabled={
                    loading ||
                    !myWorkingHours?.afternoon_check_in ||
                    !!myWorkingHours?.afternoon_check_out
                  }
                  variant="outline"
                  className="flex-1"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Check Out
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
