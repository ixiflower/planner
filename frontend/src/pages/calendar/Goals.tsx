import * as React from 'react';
import { toast } from 'sonner';
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2, Pencil, Play, Pause, RotateCcw, CheckCircle } from 'lucide-react';
import { GoalDialog } from './GoalDialog';
import type { DailyGoal } from './types';
import { createDailyGoal, updateDailyGoal, deleteDailyGoal } from './api';

interface GoalsProps {
  goals: DailyGoal[];
  setGoals: React.Dispatch<React.SetStateAction<DailyGoal[]>>;
  token: string | null;
  isGoalDialogOpen: boolean;
  setIsGoalDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  editingGoal: DailyGoal | null;
  setEditingGoal: React.Dispatch<React.SetStateAction<DailyGoal | null>>;
}

export function Goals({ goals, setGoals, token, isGoalDialogOpen, setIsGoalDialogOpen, editingGoal, setEditingGoal }: GoalsProps) {
  const [expandedGoalId, setExpandedGoalId] = React.useState<number | null>(null);
  const [timeSpent, setTimeSpent] = React.useState<{[key: number]: number}>(() => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem('planner_goals_time_spent') : null;
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  });
  const [isRunning, setIsRunning] = React.useState<{[key: number]: boolean}>(() => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem('planner_goals_is_running') : null;
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  });

  React.useEffect(() => {
    try {
      localStorage.setItem('planner_goals_time_spent', JSON.stringify(timeSpent));
      localStorage.setItem('planner_goals_is_running', JSON.stringify(isRunning));
    } catch {}
  }, [timeSpent, isRunning]);

  React.useEffect(() => {
    const now = new Date();
    const msUntilMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0).getTime() - now.getTime();
    const timeout = setTimeout(() => {
      setTimeSpent({});
      setIsRunning({});
    }, msUntilMidnight);
    return () => clearTimeout(timeout);
  }, [goals]);

  React.useEffect(() => {
    const intervals: NodeJS.Timeout[] = [];
    Object.keys(isRunning).forEach(goalId => {
      const id = parseInt(goalId);
      if (isRunning[id] && !(goals.find(g => g.id === id)?.completed)) {
        const interval = setInterval(() => {
          setTimeSpent(prev => ({
            ...prev,
            [id]: (prev[id] || 0) + 1
          }));
        }, 1000);
        intervals.push(interval);
      }
    });
    return () => {
      intervals.forEach(interval => clearInterval(interval));
    };
  }, [isRunning, goals]);

  const handleSaveGoal = async (goalData: Partial<DailyGoal> & { text: string; date: string; }) => {
    if (goalData.text.trim()) {
      if (goalData.id) { 
        try {
          const updated = await updateDailyGoal({ ...editingGoal, ...goalData } as DailyGoal, token ?? undefined);
          setGoals(goals.map(g => g.id === updated.id ? updated : g));
        } catch (error: any) {
          console.error("Failed to update goal:", error);
          toast.error(`Failed to update goal: ${error?.message ?? String(error)}`);
        }
      } else { 
        try {
          const normalizedText = goalData.text.trim();
          const duplicate = goals.some(g => g.date === goalData.date && g.text.trim() === normalizedText);
          if (duplicate) {
            toast.warning('A goal with the same text and date already exists.');
            return;
          }
          const newGoal = await createDailyGoal({
            text: goalData.text,
            date: goalData.date,
            completed: false,
            priority: goalData.priority,
            category: goalData.category,
            color: goalData.color,
            notes: goalData.notes
          }, token ?? undefined);
          setGoals([...goals, newGoal]);
          setTimeSpent(prev => ({ ...prev, [newGoal.id]: 0 }));
          setIsRunning(prev => ({ ...prev, [newGoal.id]: false }));
        } catch (error: any) {
          console.error("Failed to create goal:", error);
          toast.error(`Failed to create goal: ${error?.message ?? String(error)}`);
        }
      }
    }
  };

  const EXPANDED_KEY = 'planner_goals_expanded_goal_id';
  React.useEffect(() => {
    try {
      const saved = typeof window !== 'undefined' ? localStorage.getItem(EXPANDED_KEY) : null;
      if (saved) {
        const id = parseInt(saved, 10);
        if (!Number.isNaN(id)) setExpandedGoalId(id);
      }
    } catch (e) {
    }
  }, []);

  React.useEffect(() => {
    try {
      if (expandedGoalId !== null) {
        localStorage.setItem(EXPANDED_KEY, String(expandedGoalId));
      } else {
        localStorage.removeItem(EXPANDED_KEY);
      }
    } catch (e) {
    }
  }, [expandedGoalId]);

  const toggleTimer = (id: number) => {
    const goal = goals.find(g => g.id === id);
    if (goal?.completed) return; 
    setTimeSpent(prev => ({ ...prev, [id]: prev[id] ?? 0 }));
    setIsRunning(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const resetTimer = (id: number) => {
    setTimeSpent(prev => ({ ...prev, [id]: 0 }));
    setIsRunning(prev => ({ ...prev, [id]: false }));
  };


  const extractTargetTime = (notes: string | undefined): number | null => {
    if (!notes) return null;
    const timeMatch = notes.match(/Target time: (\d+) minutes/);
    return timeMatch ? parseInt(timeMatch[1]) : null;
  };

  const handleEditClick = (e: React.MouseEvent, goal: DailyGoal) => {
    e.stopPropagation();
    setEditingGoal(goal);
    setIsGoalDialogOpen(true);
  };

  const handleDeleteGoal = async (id: number) => {
    try {
      await deleteDailyGoal(id, token ?? undefined);
      setGoals(goals.filter(goal => goal.id !== id));
      const newTimeSpent = { ...timeSpent };
      const newIsRunning = { ...isRunning };
      delete newTimeSpent[id];
      delete newIsRunning[id];
      setTimeSpent(newTimeSpent);
      setIsRunning(newIsRunning);
    } catch (error) {
      console.error("Failed to delete goal:", error);
    }
  };

  const toggleExpand = (id: number) => {
    setExpandedGoalId(expandedGoalId === id ? null : id);
  };

  return (
    <div className="mt-2">
      <ScrollArea className="h-32">
        <div className="space-y-1">
          {goals.map(goal => {
            const isExpanded = expandedGoalId === goal.id;
            const currentTime = timeSpent[goal.id] || 0;
            const running = isRunning[goal.id] || false;
            const targetTime = goal.targetTime || extractTargetTime(goal.notes);
            const progressPercentage = targetTime 
              ? Math.min(100, Math.round((currentTime / (targetTime * 60)) * 100))
              : Math.min(100, Math.round((currentTime / 3600) * 100)); 

            const isDone = !!goal.completed;

            return (
              <div
                key={goal.id}
                className={`border rounded-lg relative overflow-hidden transition-all duration-300 bg-card cursor-pointer ${isExpanded ? 'p-2' : 'py-0.5 px-2 mt-3 '}`}
                onClick={() => toggleExpand(goal.id)}
              >
                {}
                {isDone && (
                  <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                    <span className="bg-green-100 text-green-700 px-4 py-1 rounded-full text-sm font-bold flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" /> Done
                    </span>
                  </div>
                )}
                <div className="relative">
                  <div className={`flex items-center justify-between ${isExpanded ? 'mb-5' : ''}`}> 
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-xs">{goal.text}</span>
                        <span className="text-xs text-muted-foreground">
                          <span>{Math.floor(currentTime / 60)}m</span>
                          <span className="ml-auto">/{targetTime || 60}m</span>
                          <span className="text-xs opacity-75 ml-2">{currentTime % 60}s</span>
                        </span>
                      </div>
                      {isExpanded && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {goal.category && (
                            <span className="capitalize">{goal.category}</span>
                          )}
                          {goal.priority && (
                            <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                              goal.priority === 'high' ? 'bg-red-100 text-red-700' :
                              goal.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-blue-100 text-blue-700'
                            }`}>
                              {goal.priority}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {}
                      <Button 
                        variant="outline" 
                        size="icon"
                        className="h-6 w-6"
                        onClick={e => { e.stopPropagation(); toggleTimer(goal.id); }}
                        disabled={isDone}
                      >
                        {running ? (
                          <Pause className="w-3 h-3" />
                        ) : (
                          <Play className="w-3 h-3" />
                        )}
                      </Button>
                      {isExpanded && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-6 px-2"
                          onClick={e => { e.stopPropagation(); resetTimer(goal.id); }}
                          disabled={isDone}
                        >
                          <RotateCcw className="w-3 h-3" />
                        </Button>
                      )}
                      {isExpanded && (
                        <>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => handleEditClick(e, goal)}>
                            <Pencil className="w-3 h-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => {e.stopPropagation(); handleDeleteGoal(goal.id);}}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 space-y-4 pb-3">
                      {goal.notes && (
                        <div className="text-xs text-muted-foreground">
                          {goal.notes.split('\n\nTarget time:')[0]}
                        </div>
                      )}
                      {targetTime && (
                        <div className="text-xs text-muted-foreground">
                          Target time: {targetTime} minutes
                        </div>
                      )}
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div 
                          className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${progressPercentage}%` }}
                        ></div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Progress: {progressPercentage}%
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
      <GoalDialog
        open={isGoalDialogOpen}
        onOpenChange={setIsGoalDialogOpen}
        onSave={handleSaveGoal}
        goal={editingGoal}
      />
    </div>
  );
}