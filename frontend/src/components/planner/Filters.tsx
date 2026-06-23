import * as React from "react";
import { SearchIcon, CheckCircleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";

const CATEGORIES = {
  work: { name: "Work", color: "#ef4444" },
  personal: { name: "Personal", color: "#3b82f6" },
  study: { name: "Study", color: "#10b981" },
  travel: { name: "Travel", color: "#f59e0b" },
  health: { name: "Health", color: "#8b5cf6" },
  other: { name: "Other", color: "#6b7280" }
} as const;

interface FiltersProps {
  searchQuery: string;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  categoryFilter: string;
  setCategoryFilter: React.Dispatch<React.SetStateAction<string>>;
  dateRangeFilter: string;
  setDateRangeFilter: React.Dispatch<React.SetStateAction<string>>;
  showCompleted: boolean;
  setShowCompleted: React.Dispatch<React.SetStateAction<boolean>>;
  CATEGORIES: typeof CATEGORIES;
}

export function Filters({
  searchQuery,
  setSearchQuery,
  categoryFilter,
  setCategoryFilter,
  dateRangeFilter,
  setDateRangeFilter,
  showCompleted,
  setShowCompleted
}: FiltersProps) {
  return (
    <div className="mt-4 flex flex-col sm:flex-row gap-4">
      <div className="relative flex-1">
        <SearchIcon className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search events..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-8"
        />
      </div>
      <div className="flex gap-2">
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {Object.entries(CATEGORIES).map(([id, category]) => (
              <SelectItem key={id} value={id}>
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: category.color }}
                  />
                  {category.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={dateRangeFilter} onValueChange={setDateRangeFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Date range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All dates</SelectItem>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">This week</SelectItem>
            <SelectItem value="month">This month</SelectItem>
            <SelectItem value="next7days">Next 7 days</SelectItem>
            <SelectItem value="next30days">Next 30 days</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant={showCompleted ? "default" : "outline"}
          size="icon"
          onClick={() => setShowCompleted(!showCompleted)}
          title={showCompleted ? "Hide completed" : "Show completed"}
        >
          <CheckCircleIcon className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}