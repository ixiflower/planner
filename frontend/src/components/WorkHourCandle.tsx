import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface WorkHourCandleProps {
  username: string;
  profilePicture?: string | null;
  morningCheckIn?: string | null;
  morningCheckOut?: string | null;
  afternoonCheckIn?: string | null;
  afternoonCheckOut?: string | null;
  isCurrentlyWorking: boolean;
  currentShift?: string | null;
}

export default function WorkHourCandle({
  username,
  profilePicture,
  morningCheckIn,
  morningCheckOut,
  afternoonCheckIn,
  afternoonCheckOut,
  isCurrentlyWorking,
  currentShift,
}: WorkHourCandleProps) {
  // Calculate candle fill percentage for each shift
  const calculateFill = (checkIn: string | null, checkOut: string | null, shiftStart: number, shiftEnd: number) => {
    if (!checkIn) return 0;
    
    const checkInTime = new Date(checkIn);
    const checkOutTime = checkOut ? new Date(checkOut) : new Date();
    
    const checkInHour = checkInTime.getHours() + checkInTime.getMinutes() / 60;
    const checkOutHour = checkOutTime.getHours() + checkOutTime.getMinutes() / 60;
    
    // Clamp values to shift boundaries
    const startHour = Math.max(checkInHour, shiftStart);
    const endHour = Math.min(checkOutHour, shiftEnd);
    
    const workedHours = endHour - startHour;
    const totalShiftHours = shiftEnd - shiftStart;
    
    return Math.max(0, Math.min(100, (workedHours / totalShiftHours) * 100));
  };

  const morningFill = calculateFill(morningCheckIn ?? null, morningCheckOut ?? null, 9, 13);
  const afternoonFill = calculateFill(afternoonCheckIn ?? null, afternoonCheckOut ?? null, 15, 19);

  const getTimeString = (dateString: string | null) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="flex flex-col items-center gap-2 p-3 rounded-lg bg-muted/30 border hover:bg-muted/50 transition-colors">
      {/* User Avatar */}
      <div className="relative">
        <div className={cn(
          "w-12 h-12 rounded-full overflow-hidden border-2 transition-colors",
          isCurrentlyWorking ? "border-green-500" : "border-gray-300"
        )}>
          {profilePicture ? (
            <img src={profilePicture} alt={username} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold">
              {username.slice(0, 2).toUpperCase()}
            </div>
          )}
        </div>
        {isCurrentlyWorking && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-pulse" />
        )}
      </div>

      {/* Username */}
      <div className="text-xs font-medium text-center truncate w-full">{username}</div>

      {/* Candle Visualization */}
      <div className="flex gap-2 items-end h-24">
        {/* Morning Candle */}
        <div className="flex flex-col items-center gap-1">
          <span className="text-[10px] text-muted-foreground font-medium">AM</span>
          <div className="relative w-8 h-20 bg-gradient-to-b from-amber-100 to-amber-200 dark:from-amber-900/20 dark:to-amber-800/20 rounded-t-md border border-amber-300 dark:border-amber-700 overflow-hidden">
            {/* Candle Fill */}
            <div 
              className={cn(
                "absolute bottom-0 left-0 right-0 transition-all duration-500 rounded-t-md",
                morningCheckIn && !morningCheckOut && currentShift === "morning"
                  ? "bg-gradient-to-t from-amber-500 to-amber-400 animate-pulse"
                  : "bg-gradient-to-t from-amber-600 to-amber-500"
              )}
              style={{ height: `${morningFill}%` }}
            />
            {/* Flame if currently working */}
            {morningCheckIn && !morningCheckOut && currentShift === "morning" && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <div className="w-3 h-4 bg-gradient-to-t from-orange-500 via-yellow-400 to-yellow-300 rounded-full animate-pulse" />
              </div>
            )}
          </div>
          {morningCheckIn && (
            <div className="text-[9px] text-center text-muted-foreground">
              <div>{getTimeString(morningCheckIn)}</div>
              {morningCheckOut && <div>-{getTimeString(morningCheckOut)}</div>}
            </div>
          )}
        </div>

        {/* Afternoon Candle */}
        <div className="flex flex-col items-center gap-1">
          <span className="text-[10px] text-muted-foreground font-medium">PM</span>
          <div className="relative w-8 h-20 bg-gradient-to-b from-blue-100 to-blue-200 dark:from-blue-900/20 dark:to-blue-800/20 rounded-t-md border border-blue-300 dark:border-blue-700 overflow-hidden">
            {/* Candle Fill */}
            <div 
              className={cn(
                "absolute bottom-0 left-0 right-0 transition-all duration-500 rounded-t-md",
                afternoonCheckIn && !afternoonCheckOut && currentShift === "afternoon"
                  ? "bg-gradient-to-t from-blue-500 to-blue-400 animate-pulse"
                  : "bg-gradient-to-t from-blue-600 to-blue-500"
              )}
              style={{ height: `${afternoonFill}%` }}
            />
            {/* Flame if currently working */}
            {afternoonCheckIn && !afternoonCheckOut && currentShift === "afternoon" && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <div className="w-3 h-4 bg-gradient-to-t from-orange-500 via-yellow-400 to-yellow-300 rounded-full animate-pulse" />
              </div>
            )}
          </div>
          {afternoonCheckIn && (
            <div className="text-[9px] text-center text-muted-foreground">
              <div>{getTimeString(afternoonCheckIn)}</div>
              {afternoonCheckOut && <div>-{getTimeString(afternoonCheckOut)}</div>}
            </div>
          )}
        </div>
      </div>

      {/* Status Badge */}
      {isCurrentlyWorking && (
        <div className="flex items-center gap-1 text-[10px] text-green-600 dark:text-green-400 font-medium">
          <Clock className="w-3 h-3" />
          <span>{currentShift === "morning" ? "Morning" : "Afternoon"}</span>
        </div>
      )}
    </div>
  );
}
