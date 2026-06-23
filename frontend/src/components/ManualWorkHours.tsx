import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import WorkHourCandle from "@/components/WorkHourCandle";
import { UserPlus, X } from "lucide-react";

interface Employee {
  id: string;
  name: string;
  profilePicture?: string;
  morningCheckIn?: string;
  morningCheckOut?: string;
  afternoonCheckIn?: string;
  afternoonCheckOut?: string;
  isCurrentlyWorking: boolean;
  currentShift?: "morning" | "afternoon" | null;
}

export default function ManualWorkHours() {
  const [employees, setEmployees] = useState<Employee[]>([
    { id: "1", name: "Employee 1", isCurrentlyWorking: false },
    { id: "2", name: "Employee 2", isCurrentlyWorking: false },
    { id: "3", name: "Employee 3", isCurrentlyWorking: false },
    { id: "4", name: "Employee 4", isCurrentlyWorking: false },
    { id: "5", name: "Employee 5", isCurrentlyWorking: false },
  ]);

  const [newEmployeeName, setNewEmployeeName] = useState("");

  const getCurrentTime = () => {
    const now = new Date();
    return now.toISOString();
  };

  const getCurrentHour = () => {
    return new Date().getHours();
  };

  const addEmployee = () => {
    if (!newEmployeeName.trim()) return;
    
    const newEmployee: Employee = {
      id: Date.now().toString(),
      name: newEmployeeName,
      isCurrentlyWorking: false,
    };
    
    setEmployees([...employees, newEmployee]);
    setNewEmployeeName("");
  };

  const removeEmployee = (id: string) => {
    setEmployees(employees.filter(emp => emp.id !== id));
  };

  const markCheckIn = (id: string, shift: "morning" | "afternoon") => {
    setEmployees(employees.map(emp => {
      if (emp.id === id) {
        const currentTime = getCurrentTime();
        if (shift === "morning") {
          return {
            ...emp,
            morningCheckIn: currentTime,
            isCurrentlyWorking: true,
            currentShift: "morning",
          };
        } else {
          return {
            ...emp,
            afternoonCheckIn: currentTime,
            isCurrentlyWorking: true,
            currentShift: "afternoon",
          };
        }
      }
      return emp;
    }));
  };

  const markCheckOut = (id: string, shift: "morning" | "afternoon") => {
    setEmployees(employees.map(emp => {
      if (emp.id === id) {
        const currentTime = getCurrentTime();
        if (shift === "morning") {
          return {
            ...emp,
            morningCheckOut: currentTime,
            isCurrentlyWorking: emp.currentShift === "morning" ? false : emp.isCurrentlyWorking,
            currentShift: emp.currentShift === "morning" ? null : emp.currentShift,
          };
        } else {
          return {
            ...emp,
            afternoonCheckOut: currentTime,
            isCurrentlyWorking: emp.currentShift === "afternoon" ? false : emp.isCurrentlyWorking,
            currentShift: emp.currentShift === "afternoon" ? null : emp.currentShift,
          };
        }
      }
      return emp;
    }));
  };

  const markLeftWork = (id: string) => {
    const hour = getCurrentHour();
    const currentTime = getCurrentTime();
    
    setEmployees(employees.map(emp => {
      if (emp.id === id) {
        // Automatically determine which shift and mark checkout
        if (hour >= 9 && hour < 13) {
          // During morning shift
          return {
            ...emp,
            morningCheckOut: currentTime,
            isCurrentlyWorking: false,
            currentShift: null,
          };
        } else if (hour >= 15 && hour < 19) {
          // During afternoon shift
          return {
            ...emp,
            afternoonCheckOut: currentTime,
            isCurrentlyWorking: false,
            currentShift: null,
          };
        }
        // Just mark as not working if outside shift hours
        return {
          ...emp,
          isCurrentlyWorking: false,
          currentShift: null,
        };
      }
      return emp;
    }));
  };

  return (
    <div className="space-y-6">
      {/* Employee Management */}
      <Card>
        <CardHeader>
          <CardTitle>Add Employee</CardTitle>
          <CardDescription>Add team members to track their work hours</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="employee-name">Employee Name</Label>
              <Input
                id="employee-name"
                placeholder="Enter employee name"
                value={newEmployeeName}
                onChange={(e) => setNewEmployeeName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addEmployee()}
              />
            </div>
            <Button onClick={addEmployee} className="mt-auto">
              <UserPlus className="w-4 h-4 mr-2" />
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Work Hour Candles */}
      <Card>
        <CardHeader>
          <CardTitle>Team Work Hours</CardTitle>
          <CardDescription>
            Morning: 9:00-13:00 | Afternoon: 15:00-19:00 | Click candles to manage attendance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {employees.map((employee) => (
              <div key={employee.id} className="relative group">
                {/* Remove button */}
                <button
                  onClick={() => removeEmployee(employee.id)}
                  className="absolute -top-2 -right-2 z-10 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Remove employee"
                >
                  <X className="w-3 h-3" />
                </button>

                <WorkHourCandle
                  username={employee.name}
                  profilePicture={employee.profilePicture}
                  morningCheckIn={employee.morningCheckIn}
                  morningCheckOut={employee.morningCheckOut}
                  afternoonCheckIn={employee.afternoonCheckIn}
                  afternoonCheckOut={employee.afternoonCheckOut}
                  isCurrentlyWorking={employee.isCurrentlyWorking}
                  currentShift={employee.currentShift}
                />

                {/* Manual Time Entry */}
                <div className="mt-2 space-y-2">
                  {/* Morning Times */}
                  <div className="bg-amber-50 dark:bg-amber-900/10 p-2 rounded border border-amber-200 dark:border-amber-800">
                    <div className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 mb-1">
                      MORNING (9:00 - 13:00)
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      <div>
                        <Input
                          type="time"
                          className="h-7 text-xs"
                          value={employee.morningCheckIn ? new Date(employee.morningCheckIn).toTimeString().slice(0, 5) : ""}
                          onChange={(e) => {
                            if (e.target.value) {
                              const [hours, minutes] = e.target.value.split(":");
                              const date = new Date();
                              date.setHours(parseInt(hours), parseInt(minutes), 0);
                              markCheckIn(employee.id, "morning");
                              setEmployees(employees.map(emp => 
                                emp.id === employee.id 
                                  ? { ...emp, morningCheckIn: date.toISOString() }
                                  : emp
                              ));
                            }
                          }}
                          placeholder="In"
                        />
                      </div>
                      <div>
                        <Input
                          type="time"
                          className="h-7 text-xs"
                          value={employee.morningCheckOut ? new Date(employee.morningCheckOut).toTimeString().slice(0, 5) : ""}
                          onChange={(e) => {
                            if (e.target.value) {
                              const [hours, minutes] = e.target.value.split(":");
                              const date = new Date();
                              date.setHours(parseInt(hours), parseInt(minutes), 0);
                              markCheckOut(employee.id, "morning");
                              setEmployees(employees.map(emp => 
                                emp.id === employee.id 
                                  ? { ...emp, morningCheckOut: date.toISOString() }
                                  : emp
                              ));
                            }
                          }}
                          placeholder="Out"
                          disabled={!employee.morningCheckIn}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Afternoon Times */}
                  <div className="bg-blue-50 dark:bg-blue-900/10 p-2 rounded border border-blue-200 dark:border-blue-800">
                    <div className="text-[10px] font-semibold text-blue-700 dark:text-blue-400 mb-1">
                      AFTERNOON (15:00 - 19:00)
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      <div>
                        <Input
                          type="time"
                          className="h-7 text-xs"
                          value={employee.afternoonCheckIn ? new Date(employee.afternoonCheckIn).toTimeString().slice(0, 5) : ""}
                          onChange={(e) => {
                            if (e.target.value) {
                              const [hours, minutes] = e.target.value.split(":");
                              const date = new Date();
                              date.setHours(parseInt(hours), parseInt(minutes), 0);
                              markCheckIn(employee.id, "afternoon");
                              setEmployees(employees.map(emp => 
                                emp.id === employee.id 
                                  ? { ...emp, afternoonCheckIn: date.toISOString() }
                                  : emp
                              ));
                            }
                          }}
                          placeholder="In"
                        />
                      </div>
                      <div>
                        <Input
                          type="time"
                          className="h-7 text-xs"
                          value={employee.afternoonCheckOut ? new Date(employee.afternoonCheckOut).toTimeString().slice(0, 5) : ""}
                          onChange={(e) => {
                            if (e.target.value) {
                              const [hours, minutes] = e.target.value.split(":");
                              const date = new Date();
                              date.setHours(parseInt(hours), parseInt(minutes), 0);
                              markCheckOut(employee.id, "afternoon");
                              setEmployees(employees.map(emp => 
                                emp.id === employee.id 
                                  ? { ...emp, afternoonCheckOut: date.toISOString() }
                                  : emp
                              ));
                            }
                          }}
                          placeholder="Out"
                          disabled={!employee.afternoonCheckIn}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {employees.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              No employees added yet. Add your first employee above.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
