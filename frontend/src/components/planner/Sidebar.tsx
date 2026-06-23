import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { DayEvent, PermanentNote } from "@/pages/planner";

interface SidebarProps {
  selectedDate: Date | undefined;
  events: Record<string, DayEvent>;
  formatKey: (date: Date | string | number) => string;
  draftDescription: string;
  setDraftDescription: React.Dispatch<React.SetStateAction<string>>;
  setDraftCategory: React.Dispatch<React.SetStateAction<string>>;
  setDraftReminder: React.Dispatch<React.SetStateAction<string>>;
  setDraftRecurrence: React.Dispatch<React.SetStateAction<string>>;
  setDraftCompleted: React.Dispatch<React.SetStateAction<boolean>>;
  saveFromSideEditor: () => void;
  permanentNotes: PermanentNote[];
  setQuickNote: React.Dispatch<React.SetStateAction<string>>;
  setNotePreviewMode: React.Dispatch<React.SetStateAction<boolean>>;
  setNotePopupOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export function Sidebar({
  selectedDate,
  events,
  formatKey,
  draftDescription,
  setDraftDescription,
  setDraftCategory,
  setDraftReminder,
  setDraftRecurrence,
  setDraftCompleted,
  saveFromSideEditor,
  permanentNotes,
  setQuickNote,
  setNotePreviewMode,
  setNotePopupOpen
}: SidebarProps) {
  return (
    <ScrollArea
      className="pr-4 pl-2 h-auto min-h-fit"
      style={{ scrollbarGutter: "stable" }}
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-medium">Selected</h3>
          <div className="text-xs text-muted-foreground">
            {selectedDate ? selectedDate.toLocaleDateString() : "—"}
          </div>
        </div>
        <div>
          {selectedDate && events[formatKey(selectedDate)] ? (
            <Badge>Saved</Badge>
          ) : (
            <Badge variant="outline">Empty</Badge>
          )}
        </div>
      </div>
      <div className="mt-2">
        <Label htmlFor="side-desc">Description</Label>
        <Textarea
          className="mt-2"
          id="side-desc"
          placeholder="Type a short description and press Save"
          value={draftDescription}
          onChange={(e) => setDraftDescription(e.target.value)}
          rows={4}
        />
        <div className="flex justify-end gap-2 mt-3">
          <Button
            variant="outline"
            onClick={() => {
              setDraftDescription("");
              setDraftCategory("_none_");
              setDraftReminder("_none_");
              setDraftRecurrence("none");
              setDraftCompleted(false);
            }}
          >
            Reset
          </Button>
          <Button
            onClick={saveFromSideEditor}
            disabled={!selectedDate || !draftDescription.trim()}
          >
            Save
          </Button>
        </div>
        <div className="mt-4">
          <Label>Full note</Label>
          <div className="mt-2 text-sm text-muted-foreground">
            {selectedDate && events[formatKey(selectedDate)]?.note
              ? events[formatKey(selectedDate)]!.note
              : "No full note. Use the note button beside Edit to open the full‑screen notepad."}
          </div>
        </div>
      </div>
      <div className="mt-6 text-sm text-muted-foreground">
        Tips: Description and full notes are stored separately. Press{" "}
        <kbd className="rounded border px-1">Ctrl</kbd> +{" "}
        <kbd className="rounded border px-1">Enter</kbd> to save in
        editors.
      </div>
      
      {}
      {permanentNotes.length > 0 && (
        <div className="mt-4 sm:mt-6">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <h3 className="text-sm font-medium">Permanent Notes</h3>
            <Badge variant="secondary" className="text-xs">{permanentNotes.length}</Badge>
          </div>
          <div className="space-y-1 sm:space-y-2">
            {permanentNotes.slice(0, 3).map((note) => (
              <div 
                key={note.id} 
                className="p-2 border rounded text-sm cursor-pointer hover:bg-muted transition-colors touch-manipulation"
                onClick={() => {
                  setQuickNote(note.content);
                  setNotePreviewMode(true);
                  setNotePopupOpen(true);
                }}
              >
                <div className="line-clamp-2 text-xs sm:text-sm">{note.content}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {note.timestamp ? new Date(note.timestamp).toLocaleDateString() : 'Unknown date'}
                </div>
              </div>
            ))}
            {permanentNotes.length > 3 && (
              <div className="text-xs text-muted-foreground text-center pt-1">
                +{permanentNotes.length - 3} more notes
              </div>
            )}
          </div>
        </div>
      )}
    </ScrollArea>
  );
}