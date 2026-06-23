import * as React from "react";
import { format, parseISO } from "date-fns";
import { BarChart3, CalendarIcon, Star, CheckSquare, ChevronUp, ChevronDown, Clock, Bell, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent, 
  ChartLegend, 
  ChartLegendContent 
} from "@/components/ui/chart";
import { PieChart, Pie, Cell } from "recharts";
import type { CalendarEvent } from "@/pages/calendar/types";

interface EventSummaryProps {
  events: CalendarEvent[];
  todayEvents: CalendarEvent[];
  showAll: boolean;
  setShowAll: React.Dispatch<React.SetStateAction<boolean>>;
  hoursData: { name: string; value: number; fill: string }[];
  totalHours: number;
  chartConfig: Record<string, { label: string }>;
  handleDeleteEvent: (eventId: string) => void;
  playAlertSound: () => void;
  setShowSummary: React.Dispatch<React.SetStateAction<boolean>>;
}

const EventSummary: React.FC<EventSummaryProps> = ({
  events,
  todayEvents,
  showAll,
  setShowAll,
  hoursData,
  totalHours,
  chartConfig,
  handleDeleteEvent,
  playAlertSound,
}) => {
  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border border-border bg-[var(--calendar-date-bg)]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-muted rounded-lg">
                <CalendarIcon className="w-4 h-4 text-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {events.length}
                </p>
                <p className="text-xs text-muted-foreground font-medium">
                  Total Events
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-border bg-[var(--calendar-date-bg)]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-muted rounded-lg">
                <Star className="w-4 h-4" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {events.filter((e) => e.isImportant).length}
                </p>
                <p className="text-xs text-muted-foreground font-medium">
                  Important
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-border bg-[var(--calendar-date-bg)]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-muted rounded-lg">
                <BarChart3 className="w-4 h-4 text-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {todayEvents.length}
                </p>
                <p className="text-xs text-muted-foreground font-medium">
                  Today
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-border bg-[var(--calendar-date-bg)]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-muted rounded-lg">
                <CheckSquare className="w-4 h-4 text-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {
                    events.filter(
                      (e) => parseISO(e.endDate).getTime() < Date.now()
                    ).length
                  }
                </p>
                <p className="text-xs text-muted-foreground font-medium">
                  Completed
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator className="bg-border" />

      {}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">
            Hours by Task (Today)
          </h3>
          <p className="text-xs text-muted-foreground">
            Total: {totalHours.toFixed(2)}h
          </p>
        </div>
        <Card className="border border-border bg-[var(--calendar-date-bg)]">
          <CardContent className="p-4">
            {hoursData.length === 0 ? (
              <p className="text-sm text-muted-foreground">No time logged for today.</p>
            ) : (
              <ChartContainer config={chartConfig} className="aspect-[2/1]">
                <PieChart>
                  <Pie
                    data={hoursData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={60}
                    outerRadius={90}
                    strokeWidth={2}
                    isAnimationActive={false}
                  >
                    {hoursData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent hideLabel />}
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                </PieChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">
            All Events
          </h3>
          {events.length > 5 && (
            <Button
              onClick={() => setShowAll(!showAll)}
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs"
            >
              {showAll ? (
                <>
                  Show Less
                  <ChevronUp className="w-3 h-3 ml-1" />
                </>
              ) : (
                <>
                  Show More
                  <ChevronDown className="w-3 h-3 ml-1" />
                </>
              )}
            </Button>
          )}
        </div>

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {(showAll ? events : events.slice(0, 5)).map((event) => (
            <div
              key={event.id}
              className="flex items-center gap-3 p-3 rounded-lg border border-border bg-[var(--calendar-date-bg)] hover:bg-muted/50 transition-colors"
            >
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: event.color }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {event.title}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <Clock className="w-3 h-3 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">
                    {format(
                      parseISO(event.startDate),
                      "MMM d, yyyy h:mm a"
                    )}{" "}
                    - {format(parseISO(event.endDate), "h:mm a")}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={playAlertSound}
                aria-label={`Set alert for event ${event.title}`}
              >
                <Bell className="w-4 h-4 text-muted-foreground" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleDeleteEvent(event.id)}
                aria-label={`Delete event ${event.title}`}
              >
                <Trash2 className="w-4 h-4 text-muted-foreground" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EventSummary;