import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Clock, 
  Target, 
  Award,
  Activity,
  Flame,
  Zap,
  Star,
  ChevronRight,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  Calendar as CalendarIcon,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

export interface EmployeeStats {
  userId: string;
  username: string;
  name?: string;
  profilePicture?: string;
  totalHours: number;
  productivity: number;
  tasksCompleted: number;
  tasksPending: number;
  averageRating: number;
  streak: number;
  isActive: boolean;
  lastActive?: string;
  department?: string;
  recentTrends?: number[];
  performanceScore: number;
}

interface AnalyticsProps {
  employees: EmployeeStats[];
  onEmployeeSelect?: (userId: string) => void;
}

export function EmployeeAnalytics({ employees, onEmployeeSelect }: AnalyticsProps) {
  const [selectedView, setSelectedView] = useState<'candles' | 'bars' | 'grid'>('candles');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

  const filteredEmployees = useMemo(() => {
    return employees.filter(e => 
      e.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.name && e.name.toLowerCase().includes(searchQuery.toLowerCase()))
    ).sort((a, b) => b.performanceScore - a.performanceScore);
  }, [employees, searchQuery]);

  const selectedEmployee = useMemo(() => 
    employees.find(e => e.userId === selectedEmployeeId), 
    [employees, selectedEmployeeId]
  );

  const statsSummary = useMemo(() => {
    const total = employees.length;
    const active = employees.filter(e => e.isActive).length;
    const avgScore = employees.reduce((sum, e) => sum + e.performanceScore, 0) / total || 0;
    const totalTasks = employees.reduce((sum, e) => sum + e.tasksCompleted, 0);
    
    return { total, active, avgScore, totalTasks };
  }, [employees]);

  const handleEmployeeClick = (userId: string) => {
    setSelectedEmployeeId(userId);
    if (onEmployeeSelect) onEmployeeSelect(userId);
  };

  return (
    <div className="space-y-6">
      {/* Summary Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Team</p>
              <h3 className="text-2xl font-bold">{statsSummary.total}</h3>
            </div>
            <div className="p-2 bg-primary/10 rounded-full">
              <Users className="h-5 w-5 text-primary" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-green-500/5 border-green-500/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Active Now</p>
              <h3 className="text-2xl font-bold text-green-600">{statsSummary.active}</h3>
            </div>
            <div className="p-2 bg-green-500/10 rounded-full">
              <Activity className="h-5 w-5 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-blue-500/5 border-blue-500/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Avg. Performance</p>
              <h3 className="text-2xl font-bold text-blue-600">{statsSummary.avgScore.toFixed(0)}%</h3>
            </div>
            <div className="p-2 bg-blue-500/10 rounded-full">
              <Zap className="h-5 w-5 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-purple-500/5 border-purple-500/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Tasks Done</p>
              <h3 className="text-2xl font-bold text-purple-600">{statsSummary.totalTasks}</h3>
            </div>
            <div className="p-2 bg-purple-500/10 rounded-full">
              <CheckCircle2 className="h-5 w-5 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-muted/30 p-3 rounded-xl border">
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search employees..."
            className="w-full pl-9 pr-4 py-2 bg-background border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex bg-background border rounded-lg p-1 gap-1">
          <Button
            variant={selectedView === 'candles' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setSelectedView('candles')}
            className="h-8 gap-2"
          >
            <Flame className="h-4 w-4" />
            Candles
          </Button>
          <Button
            variant={selectedView === 'bars' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setSelectedView('bars')}
            className="h-8 gap-2"
          >
            <BarChart3 className="h-4 w-4" />
            Bars
          </Button>
          <Button
            variant={selectedView === 'grid' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setSelectedView('grid')}
            className="h-8 gap-2"
          >
            <Activity className="h-4 w-4" />
            Grid
          </Button>
        </div>
      </div>

      {/* Analytics Visualization */}
      <Card className="border-none shadow-none bg-transparent">
        <CardContent className="p-0">
          {filteredEmployees.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Users className="h-12 w-12 mb-4 opacity-20" />
              <p>No employees found matching your search.</p>
            </div>
          ) : (
            <>
              {selectedView === 'candles' && (
                <CandleView employees={filteredEmployees} onEmployeeSelect={handleEmployeeClick} />
              )}
              {selectedView === 'bars' && (
                <BarView employees={filteredEmployees} onEmployeeSelect={handleEmployeeClick} />
              )}
              {selectedView === 'grid' && (
                <GridView employees={filteredEmployees} onEmployeeSelect={handleEmployeeClick} />
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Employee Detail Modal */}
      <Dialog open={!!selectedEmployeeId} onOpenChange={(open) => !open && setSelectedEmployeeId(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0">
          {selectedEmployee && (
            <>
              <DialogHeader className="p-6 pb-0">
                <div className="flex items-start gap-4">
                  <Avatar className="h-16 w-16 border-2 border-primary/20">
                    <AvatarImage src={selectedEmployee.profilePicture} />
                    <AvatarFallback className="text-xl">
                      {selectedEmployee.username.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <DialogTitle className="text-2xl">{selectedEmployee.name || selectedEmployee.username}</DialogTitle>
                      {selectedEmployee.isActive && (
                        <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20 border-green-500/20">
                          Active Now
                        </Badge>
                      )}
                    </div>
                    <DialogDescription className="text-base">
                      @{selectedEmployee.username} • {selectedEmployee.department || 'General Member'}
                    </DialogDescription>
                    <div className="flex items-center gap-4 mt-2">
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Star className="h-4 w-4 text-yellow-500 fill-current" />
                        <span className="font-medium text-foreground">{selectedEmployee.averageRating.toFixed(1)}</span>
                        <span>Rating</span>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Flame className="h-4 w-4 text-orange-500" />
                        <span className="font-medium text-foreground">{selectedEmployee.streak}</span>
                        <span>Day Streak</span>
                      </div>
                    </div>
                  </div>
                </div>
              </DialogHeader>

              <Separator className="my-6 mx-6 w-auto" />

              <ScrollArea className="flex-1 p-6 pt-0">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                  <div className="p-4 rounded-xl bg-muted/30 border space-y-1">
                    <p className="text-xs text-muted-foreground uppercase font-semibold">Performance Score</p>
                    <div className="flex items-baseline gap-2">
                      <h4 className="text-3xl font-bold">{selectedEmployee.performanceScore}%</h4>
                      <span className="text-xs text-green-600 flex items-center font-medium">
                        <ArrowUpRight className="h-3 w-3" /> +5%
                      </span>
                    </div>
                    <Progress value={selectedEmployee.performanceScore} className="h-1.5" />
                  </div>
                  
                  <div className="p-4 rounded-xl bg-muted/30 border space-y-1">
                    <p className="text-xs text-muted-foreground uppercase font-semibold">Workload Ratio</p>
                    <div className="flex items-baseline gap-2">
                      <h4 className="text-3xl font-bold">{selectedEmployee.productivity}%</h4>
                      <span className="text-xs text-muted-foreground">Optimal: 85%</span>
                    </div>
                    <Progress 
                      value={selectedEmployee.productivity} 
                      className={cn(
                        "h-1.5",
                        selectedEmployee.productivity > 90 ? "bg-red-500" : ""
                      )} 
                    />
                  </div>

                  <div className="p-4 rounded-xl bg-muted/30 border space-y-1">
                    <p className="text-xs text-muted-foreground uppercase font-semibold">Tasks Overview</p>
                    <div className="flex items-center gap-4">
                      <div>
                        <h4 className="text-2xl font-bold">{selectedEmployee.tasksCompleted}</h4>
                        <p className="text-[10px] text-muted-foreground uppercase">Done</p>
                      </div>
                      <Separator orientation="vertical" className="h-8" />
                      <div>
                        <h4 className="text-2xl font-bold text-muted-foreground">{selectedEmployee.tasksPending}</h4>
                        <p className="text-[10px] text-muted-foreground uppercase">Pending</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h5 className="font-semibold flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Performance Trend (Last 7 Days)
                  </h5>
                  <div className="h-32 w-full bg-muted/20 rounded-xl border border-dashed flex items-end justify-between p-4 gap-2">
                    {(selectedEmployee.recentTrends || [65, 78, 45, 89, 92, 77, 85]).map((val, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-2">
                        <div 
                          className="w-full bg-primary/40 rounded-t-sm hover:bg-primary transition-colors cursor-pointer group relative"
                          style={{ height: `${val}%` }}
                        >
                          <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-popover border text-[10px] px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                            {val}%
                          </div>
                        </div>
                        <span className="text-[10px] text-muted-foreground">D{i+1}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-8">
                  <div className="space-y-2">
                    <h5 className="text-sm font-semibold flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Availability
                    </h5>
                    <div className="text-sm space-y-1">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total Hours:</span>
                        <span className="font-medium">{selectedEmployee.totalHours}h</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Last Active:</span>
                        <span className="font-medium">{selectedEmployee.lastActive || 'Today'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h5 className="text-sm font-semibold flex items-center gap-2">
                      <Award className="h-4 w-4" />
                      Achievements
                    </h5>
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="outline" className="text-[10px]">Top Performer</Badge>
                      <Badge variant="outline" className="text-[10px]">Fast Responder</Badge>
                      {selectedEmployee.streak > 5 && <Badge variant="outline" className="text-[10px]">Consistency King</Badge>}
                    </div>
                  </div>
                </div>
              </ScrollArea>

              <div className="p-6 bg-muted/10 border-t flex justify-between gap-3">
                <Button variant="outline" className="flex-1 gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  View History
                </Button>
                <Button className="flex-1 gap-2">
                  Send Message
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CandleView({ employees, onEmployeeSelect }: { employees: EmployeeStats[]; onEmployeeSelect: (userId: string) => void }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 py-4">
      {employees.map((employee) => (
        <PerformanceCandle
          key={employee.userId}
          employee={employee}
          onClick={() => onEmployeeSelect(employee.userId)}
        />
      ))}
    </div>
  );
}

function PerformanceCandle({ employee, onClick }: { employee: EmployeeStats; onClick: () => void }) {
  const productivityHeight = Math.max(10, employee.productivity);
  const ratingColor = employee.averageRating >= 4 ? 'from-green-500 to-green-400' : 
                     employee.averageRating >= 3 ? 'from-yellow-500 to-yellow-400' : 
                     'from-red-500 to-red-400';

  return (
    <div 
      className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-muted/20 border border-transparent hover:border-primary/20 hover:bg-muted/40 transition-all cursor-pointer group relative overflow-hidden"
      onClick={onClick}
    >
      {/* Decorative Background Glow */}
      <div className={cn(
        "absolute -bottom-10 -right-10 w-24 h-24 blur-3xl rounded-full opacity-10 transition-opacity group-hover:opacity-20",
        employee.averageRating >= 4 ? "bg-green-500" : "bg-primary"
      )} />

      {/* User Avatar */}
      <div className="relative z-10">
        <div className={cn(
          "w-12 h-12 rounded-full overflow-hidden border-2 p-0.5 transition-all duration-300 group-hover:scale-110",
          employee.isActive ? "border-green-500 bg-green-500/5 shadow-[0_0_15px_rgba(34,197,94,0.3)]" : "border-muted bg-muted"
        )}>
          {employee.profilePicture ? (
            <img src={employee.profilePicture} alt={employee.username} className="w-full h-full object-cover rounded-full" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/80 to-purple-600 flex items-center justify-center text-white font-bold text-sm rounded-full">
              {employee.username.slice(0, 2).toUpperCase()}
            </div>
          )}
        </div>
        {employee.isActive && (
          <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full border-2 border-background z-20" />
        )}
      </div>

      {/* Username */}
      <div className="text-center relative z-10">
        <div className="text-sm font-bold truncate w-24 group-hover:text-primary transition-colors">
          {employee.name || employee.username}
        </div>
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
          {employee.department || 'Member'}
        </div>
      </div>

      {/* Performance Candle */}
      <div className="relative w-10 h-28 bg-muted border border-border/50 rounded-full overflow-hidden p-1 z-10 shadow-inner group-hover:shadow-md transition-shadow">
        {/* Productivity Fill */}
        <div 
          className={cn(
            "absolute bottom-1 left-1 right-1 transition-all duration-1000 ease-out rounded-full bg-gradient-to-t shadow-sm",
            ratingColor
          )}
          style={{ height: `calc(${productivityHeight}% - 8px)` }}
        />
        
        {/* Detail text on hover */}
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <span className="text-[8px] font-black text-white drop-shadow-md">{employee.performanceScore}%</span>
        </div>

        {/* Flame Effect for High Performers */}
        {employee.productivity > 85 && (
          <div className="absolute top-1 left-1/2 -translate-x-1/2 flex flex-col items-center">
             <Flame className="h-4 w-4 text-orange-500 animate-bounce" />
          </div>
        )}
      </div>

      {/* Stats Summary */}
      <div className="text-center space-y-1 relative z-10">
        <div className="flex items-center justify-center gap-1.5 px-2 py-0.5 bg-background/50 rounded-full border border-border/40">
           <Star className="h-3 w-3 text-yellow-500 fill-current" />
           <span className="text-xs font-bold">{employee.averageRating.toFixed(1)}</span>
        </div>
        <div className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3" />
          {employee.tasksCompleted} Completed
        </div>
      </div>
    </div>
  );
}

function BarView({ employees, onEmployeeSelect }: { employees: EmployeeStats[]; onEmployeeSelect: (userId: string) => void }) {
  return (
    <div className="space-y-3 py-4">
      {employees.map((employee) => (
        <div 
          key={employee.userId}
          className="group flex items-center gap-4 p-4 rounded-xl bg-muted/20 border border-transparent hover:border-primary/20 hover:bg-muted/40 transition-all cursor-pointer"
          onClick={() => onEmployeeSelect(employee.userId)}
        >
          <div className="relative">
            <Avatar className="h-12 w-12 border-2 border-muted transition-transform group-hover:scale-105">
              <AvatarImage src={employee.profilePicture} />
              <AvatarFallback className="bg-primary/10 text-primary">
                {employee.username.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {employee.isActive && (
              <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-background shadow-sm" />
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <div>
                <span className="text-base font-bold group-hover:text-primary transition-colors">{employee.name || employee.username}</span>
                <span className="text-xs text-muted-foreground ml-2">@{employee.username}</span>
              </div>
              <div className="flex items-center gap-1 text-sm font-bold">
                 <Zap className="h-4 w-4 text-blue-500" />
                 {employee.performanceScore}%
              </div>
            </div>
            
            <div className="relative w-full bg-muted/60 rounded-full h-3.5 overflow-hidden">
              <div 
                className={cn(
                  "h-full rounded-full transition-all duration-1000 ease-out shadow-sm",
                  employee.performanceScore > 80 ? "bg-gradient-to-r from-blue-500 to-primary" : 
                  employee.performanceScore > 60 ? "bg-gradient-to-r from-yellow-500 to-orange-500" :
                  "bg-gradient-to-r from-red-500 to-red-600"
                )}
                style={{ width: `${employee.performanceScore}%` }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-1/2 h-full border-x border-white/5" />
              </div>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-4 text-sm px-4">
            <div className="text-center">
              <p className="font-bold">{employee.tasksCompleted}</p>
              <p className="text-[10px] text-muted-foreground uppercase font-semibold">Tasks</p>
            </div>
            <div className="text-center">
              <p className="font-bold flex items-center gap-1">
                <Star className="h-3 w-3 text-yellow-500 fill-current" />
                {employee.averageRating.toFixed(1)}
              </p>
              <p className="text-[10px] text-muted-foreground uppercase font-semibold">Rating</p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-all group-hover:translate-x-1" />
          </div>
        </div>
      ))}
    </div>
  );
}

function GridView({ employees, onEmployeeSelect }: { employees: EmployeeStats[]; onEmployeeSelect: (userId: string) => void }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 py-4">
      {employees.map((employee) => (
        <Card 
          key={employee.userId}
          className="group cursor-pointer border-none shadow-sm hover:shadow-md transition-all bg-muted/20 hover:bg-muted/30 overflow-hidden relative"
          onClick={() => onEmployeeSelect(employee.userId)}
        >
          {/* Header Accent Bar */}
          <div className={cn(
            "h-1.5 w-full",
            employee.performanceScore > 80 ? "bg-primary" : 
            employee.performanceScore > 60 ? "bg-orange-500" : "bg-red-500"
          )} />

          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Avatar className="h-12 w-12 border border-border">
                    <AvatarImage src={employee.profilePicture} />
                    <AvatarFallback>{employee.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  {employee.isActive && (
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-background shadow-sm" />
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-lg group-hover:text-primary transition-colors">{employee.name || employee.username}</h4>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">@{employee.username}</span>
                    {employee.streak > 5 && (
                      <Badge className="h-4 bg-orange-500/10 text-orange-600 text-[9px] hover:bg-orange-500/20 border-orange-500/20">
                        🔥 {employee.streak}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-black text-foreground">{employee.performanceScore}%</div>
                <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Performance</div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center bg-background/40 rounded-xl p-3 border border-border/30">
              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-[0.1em]">Done</p>
                <p className="text-base font-bold">{employee.tasksCompleted}</p>
              </div>
              <div className="space-y-0.5 border-x border-border/40">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-[0.1em]">Hours</p>
                <p className="text-base font-bold">{employee.totalHours}h</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-[0.1em]">Rating</p>
                <p className="text-base font-bold flex items-center justify-center gap-1">
                  <Star className="h-3 w-3 text-yellow-500 fill-current" />
                  {employee.averageRating > 0 ? employee.averageRating.toFixed(1) : '—'}
                </p>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between">
               <div className="flex -space-x-2">
                 {[1,2,3].map(i => (
                   <div key={i} className="h-5 w-5 rounded-full border-2 border-background bg-muted text-[8px] flex items-center justify-center font-bold text-muted-foreground">
                      {String.fromCharCode(64 + i)}
                   </div>
                 ))}
                 <div className="h-5 w-5 rounded-full border-2 border-background bg-muted text-[8px] flex items-center justify-center font-bold text-muted-foreground">+2</div>
               </div>
               <Button variant="ghost" size="sm" className="h-8 text-xs gap-1 group/btn pr-1">
                 View Details
                 <ArrowUpRight className="h-3 w-3 transition-transform group-hover/btn:-translate-y-0.5 group-hover/btn:translate-x-0.5" />
               </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}