import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckSquare } from "lucide-react";
import Checklist from "./Checklist";
import PinnedItems from "./PinnedItems";
import SidebarAccordion from "./SidebarAccordion";
import type { CalendarEvent, DailyGoal, PermanentNote, EventTemplate } from "./types";

interface SidebarChecklistProps {
  events: CalendarEvent[];
  setEvents: React.Dispatch<React.SetStateAction<CalendarEvent[]>>;
  token: string | undefined;
  pinnedItems: string[];
  togglePin: (item: string) => void;
  dailyGoals: DailyGoal[];
  setDailyGoals: React.Dispatch<React.SetStateAction<DailyGoal[]>>;
  permanentNotes: PermanentNote[];
  setPermanentNotes: React.Dispatch<React.SetStateAction<PermanentNote[]>>;
  templates: EventTemplate[];
  handleDeleteTemplate: (templateToDelete: EventTemplate) => void;
  setIsAddTemplateOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setEditingTemplate: React.Dispatch<React.SetStateAction<EventTemplate | null>>;
  setIsEditTemplateOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setNotePopupOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setQuickNote: React.Dispatch<React.SetStateAction<string>>;
  setNotePreviewMode: React.Dispatch<React.SetStateAction<boolean>>;
  isGoalDialogOpen: boolean;
  setIsGoalDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  editingGoal: DailyGoal | null;
  setEditingGoal: React.Dispatch<React.SetStateAction<DailyGoal | null>>;
}

const SidebarChecklist: React.FC<SidebarChecklistProps> = ({
  events,
  setEvents,
  token,
  pinnedItems,
  togglePin,
  dailyGoals,
  setDailyGoals,
  permanentNotes,
  setPermanentNotes,
  templates,
  handleDeleteTemplate,
  setIsAddTemplateOpen,
  setEditingTemplate,
  setIsEditTemplateOpen,
  setNotePopupOpen,
  setQuickNote,
  setNotePreviewMode,
  isGoalDialogOpen,
  setIsGoalDialogOpen,
  editingGoal,
  setEditingGoal
}) => {
  return (
    <div className="w-full xl:w-96 md:shrink-0 transition-all duration-300">
      <Card className="shadow-lg border border-border bg-[var(--calendar-date-bg)] backdrop-blur supports-[backdrop-filter]:bg-[var(--calendar-date-bg)]/70 h-full flex flex-col">
        {}
        <div>
          <CardHeader className="pb-3 pt-4 px-6">
            <CardTitle className="flex items-center gap-3 text-xl font-bold text-foreground">
              <div className="p-2 bg-muted rounded-lg">
                <CheckSquare className="w-5 h-5 text-foreground" />
              </div>
              Daily Checklist
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <Checklist
              events={events}
              setEvents={setEvents}
              token={token || undefined}
            />
          </CardContent>
        </div>

        {}
        <PinnedItems
          pinnedItems={pinnedItems}
          togglePin={togglePin}
          dailyGoals={dailyGoals}
          setDailyGoals={setDailyGoals}
          permanentNotes={permanentNotes}
          setPermanentNotes={setPermanentNotes}
          templates={templates}
          handleDeleteTemplate={handleDeleteTemplate}
          setIsAddTemplateOpen={setIsAddTemplateOpen}
          setEditingTemplate={setEditingTemplate}
          setIsEditTemplateOpen={setIsEditTemplateOpen}
          setNotePopupOpen={setNotePopupOpen}
          setQuickNote={setQuickNote}
          setNotePreviewMode={setNotePreviewMode}
          token={token}
          isGoalDialogOpen={isGoalDialogOpen}
          setIsGoalDialogOpen={setIsGoalDialogOpen}
          editingGoal={editingGoal}
          setEditingGoal={setEditingGoal}
        />

        {}
        <SidebarAccordion
          pinnedItems={pinnedItems}
          togglePin={togglePin}
          dailyGoals={dailyGoals}
          setDailyGoals={setDailyGoals}
          permanentNotes={permanentNotes}
          setPermanentNotes={setPermanentNotes}
          templates={templates}
          handleDeleteTemplate={handleDeleteTemplate}
          setIsAddTemplateOpen={setIsAddTemplateOpen}
          setEditingTemplate={setEditingTemplate}
          setIsEditTemplateOpen={setIsEditTemplateOpen}
          setNotePopupOpen={setNotePopupOpen}
          token={token}
          isGoalDialogOpen={isGoalDialogOpen}
          setIsGoalDialogOpen={setIsGoalDialogOpen}
          editingGoal={editingGoal}
          setEditingGoal={setEditingGoal}
        />
      </Card>
    </div>
  );
};

export default SidebarChecklist;