import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Star, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface Report {
  userId: string;
  name: string;
  avatarUrl?: string;
  submittedAt: string;
  status?: string;
  rating?: number;
  note?: string;
  tasks: { text: string; done: boolean }[];
}

interface UserReportPopupProps {
  userId: string | null;
  reports: Report[];
  onClose: () => void;
  onApprove: (userId: string) => void;
  onReject: (userId: string) => void;
  onRate: (userId: string, rating: number) => void;
  onSendMessage?: (userId: string) => void;
}

export function UserReportPopup({
  userId,
  reports,
  onClose,
  onApprove,
  onReject,
  onRate,
  onSendMessage,
}: UserReportPopupProps) {
  const [selectedRating, setSelectedRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);

  if (!userId) return null;

  const userReports = reports.filter(r => r.userId === userId);
  if (userReports.length === 0) return null;

  const latestReport = userReports[0];
  const allTasks = userReports.flatMap(r => r.tasks);
  const completedTasks = allTasks.filter(t => t.done);

  return (
    <Dialog open={!!userId} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              {latestReport.avatarUrl && <AvatarImage src={latestReport.avatarUrl} />}
              <AvatarFallback>
                {latestReport.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                {latestReport.name}
                {onSendMessage && (
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    onClick={() => onSendMessage(userId)}
                  >
                    <MessageSquare className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <div className="text-sm font-normal text-muted-foreground">
                Employee Details & Reports
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[50vh] pr-4">
          <div className="space-y-6">
            {/* Statistics */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">{userReports.length}</div>
                <div className="text-xs text-muted-foreground">Total Reports</div>
              </div>
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{completedTasks.length}</div>
                <div className="text-xs text-muted-foreground">Tasks Completed</div>
              </div>
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-orange-600">{allTasks.length}</div>
                <div className="text-xs text-muted-foreground">Total Tasks</div>
              </div>
            </div>

            <Separator />

            {/* All User Reports */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">All Reports</h3>
              {userReports.map((report, idx) => (
                <div
                  key={idx}
                  className="border rounded-lg p-4 space-y-3 bg-muted/20"
                >
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(report.submittedAt), "MMMM dd, yyyy")}
                    </div>
                    <Badge
                      className={
                        report.status === "approved"
                          ? "bg-green-500 text-white"
                          : report.status === "declined"
                          ? "bg-red-500 text-white"
                          : "bg-yellow-500 text-white"
                      }
                    >
                      {report.status || "pending"}
                    </Badge>
                  </div>

                  {/* Tasks */}
                  {report.tasks && report.tasks.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Tasks:</p>
                      <div className="space-y-1">
                        {report.tasks.map((task, taskIdx) => (
                          <div key={taskIdx} className="flex items-start gap-2 text-sm">
                            <span className={task.done ? "text-green-500" : "text-muted-foreground"}>
                              {task.done ? "✓" : "○"}
                            </span>
                            <span className={task.done ? "line-through text-muted-foreground" : ""}>
                              {task.text}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Report Note */}
                  {report.note && (
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Report:</p>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {report.note}
                      </p>
                    </div>
                  )}

                  {/* Rating */}
                  {report.rating && report.rating > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Rating:</span>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={cn(
                              "h-4 w-4",
                              star <= report.rating! ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                            )}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </ScrollArea>

        <Separator />

        {/* Rating Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Rate this submission:</span>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={cn(
                    "h-6 w-6 cursor-pointer transition-colors",
                    star <= (hoveredRating || selectedRating)
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-gray-300 hover:text-yellow-200"
                  )}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  onClick={() => setSelectedRating(star)}
                />
              ))}
            </div>
          </div>

          {selectedRating > 0 && (
            <Button
              onClick={() => {
                onRate(userId, selectedRating);
                setSelectedRating(0);
              }}
              className="w-full"
            >
              Submit Rating ({selectedRating} stars)
            </Button>
          )}
        </div>

        <DialogFooter>
          {latestReport.status === "pending" && (
            <div className="flex gap-2 w-full">
              <Button
                variant="outline"
                className="flex-1 text-green-600 border-green-600 hover:bg-green-50"
                onClick={() => {
                  onApprove(userId);
                  onClose();
                }}
              >
                Approve
              </Button>
              <Button
                variant="outline"
                className="flex-1 text-red-600 border-red-600 hover:bg-red-50"
                onClick={() => {
                  onReject(userId);
                  onClose();
                }}
              >
                Reject
              </Button>
            </div>
          )}
          <Button variant="secondary" onClick={onClose} className="w-full">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
