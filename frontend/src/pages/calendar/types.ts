export type CalendarColor = "blue" | "green" | "red" | "yellow" | "purple" | "orange" | "gray";

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  color: CalendarColor;
  isImportant?: boolean;
  category?: string;
  emoji?: string;
}

export const initialEvents: CalendarEvent[] = [];

export interface EventTemplate {
  id: number;
  name: string;
  title: string;
  color: CalendarColor;
  category?: string;
}

export interface PermanentNote {
  id: number;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface DailyGoal {
  id: number;
  text: string;
  completed: boolean;
  date: string;
  priority?: string;
  category?: string;
  color?: CalendarColor;
  notes?: string;
  targetTime?: number; 
}