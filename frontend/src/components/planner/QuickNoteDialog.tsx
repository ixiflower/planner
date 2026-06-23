import * as React from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface QuickNoteDialogProps {
  notePopupOpen: boolean;
  setNotePopupOpen: React.Dispatch<React.SetStateAction<boolean>>;
  quickNote: string;
  setQuickNote: React.Dispatch<React.SetStateAction<string>>;
  handleSaveNote: () => void;
  notePreviewMode: boolean;
  setNotePreviewMode: React.Dispatch<React.SetStateAction<boolean>>;
  applyFormatting: (prefix: string, suffix: string) => void;
}

export function QuickNoteDialog({
  notePopupOpen,
  setNotePopupOpen,
  quickNote,
  setQuickNote,
  handleSaveNote,
  notePreviewMode,
  setNotePreviewMode,
  applyFormatting
}: QuickNoteDialogProps) {
  return (
    <Dialog open={notePopupOpen} onOpenChange={setNotePopupOpen}>
      <DialogContent className="max-w-3xl max-h-[90vh] mx-2 sm:mx-0">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <span>Keep Note Forever</span>
              <div className="flex items-center gap-1 text-yellow-500">
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <span className="text-xs sm:text-sm font-normal">Keep your note here always</span>
              </div>
            </DialogTitle>
          </div>
        </DialogHeader>
        <div className="grid gap-3 sm:gap-4 py-2 sm:py-3">
          <div className="flex justify-end mb-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="note-preview-toggle" className="text-xs sm:text-sm">
                {notePreviewMode ? "Preview" : "Edit"}
              </Label>
              <button
                id="note-preview-toggle"
                role="switch"
                aria-checked={notePreviewMode}
                onClick={() => setNotePreviewMode(!notePreviewMode)}
                className={`relative inline-flex h-5 w-9 sm:h-6 sm:w-11 items-center rounded-full transition-colors ${
                  notePreviewMode ? "bg-primary" : "bg-input"
                }`}
              >
                <span
                  className={`inline-block h-3 w-3 sm:h-4 sm:w-4 transform rounded-full bg-background transition-transform ${
                    notePreviewMode ? "translate-x-5 sm:translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>
          
          {!notePreviewMode ? (
            <div className="grid gap-3 sm:gap-4">
              <div className="flex gap-1 sm:gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => applyFormatting('# ', '')}
                  className="text-xs px-2 py-1 h-7 sm:h-8"
                >
                  H1
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => applyFormatting('**', '**')}
                  className="text-xs font-bold px-2 py-1 h-7 sm:h-8"
                >
                  B
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => applyFormatting('*', '*')}
                  className="text-xs underline px-2 py-1 h-7 sm:h-8"
                >
                  I
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => applyFormatting('~~', '~~')}
                  className="text-xs line-through px-2 py-1 h-7 sm:h-8"
                >
                  S
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => applyFormatting('\n- [ ] ', '')}
                  className="text-xs px-2 py-1 h-7 sm:h-8"
                >
                  ☑
                </Button>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="quick-note" className="text-sm sm:text-base">Note Content</Label>
                <Textarea
                  id="quick-note"
                  value={quickNote}
                  onChange={(e) => setQuickNote(e.target.value)}
                  placeholder="Write your permanent note here..."
                  rows={5}
                  className="resize-none text-sm font-light"
                />
                <p className="text-xs text-muted-foreground">
                  if this Description text box is empty please reload the website or page to fetch to the database
                </p>
              </div>
              
              {quickNote && (
                <div className="grid gap-2">
                  <Label className="text-sm sm:text-base">Preview</Label>
                  <div className="border rounded-md p-2 sm:p-3 bg-muted/30 min-h-[80px] sm:min-h-[100px] max-h-[150px] sm:max-h-[200px] overflow-y-auto">
                    <div className="prose prose-xs sm:prose-sm dark:prose-invert max-w-none">
                      <div dangerouslySetInnerHTML={{
                        __html: quickNote
                          .replace(/^# (.*$)/gim, '<h1 style="font-size: 1.5em; font-weight: bold; margin: 0.5em 0;">$1</h1>')
                          .replace(/^## (.*$)/gim, '<h2 style="font-size: 1.3em; font-weight: bold; margin: 0.6em 0;">$1</h2>')
                          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                          .replace(/\*(.*?)\*/g, '<em>$1</em>')
                          .replace(/~~(.*?)~~/g, '<del>$1</del>')
                          .replace(/^- \[ \] (.*$)/gim, '<div><input type="checkbox" class="mr-2" disabled> $1</div>')
                          .replace(/^- \[x\] (.*$)/gim, '<div><input type="checkbox" class="mr-2" checked disabled> $1</div>')
                          .replace(/\n/g, '<br>')
                      }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="grid gap-0">
              <div className="border rounded-md p-3 sm:p-4 bg-muted/30 min-h-[250px] sm:min-h-[400px] max-h-[400px] sm:max-h-[600px] overflow-y-auto">
                <div className="prose prose-xs sm:prose-sm dark:prose-invert max-w-none">
                  {quickNote ? (
                    <div dangerouslySetInnerHTML={{
                      __html: quickNote
                        .replace(/^# (.*$)/gim, '<h1 style="font-size: 1.5em; font-weight: bold; margin: 0.5em 0;">$1</h1>')
                        .replace(/^## (.*$)/gim, '<h1 style="font-size: 1.3em; font-weight: bold; margin: 0.6em 0;">$1</h2>')
                        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                        .replace(/\*(.*?)\*/g, '<em>$1</em>')
                        .replace(/~~(.*?)~~/g, '<del>$1</del>')
                        .replace(/^- \[ \] (.*$)/gim, '<div><input type="checkbox" class="mr-2" disabled> $1</div>')
                        .replace(/^- \[x\] (.*$)/gim, '<div><input type="checkbox" class="mr-2" checked disabled> $1</div>')
                        .replace(/\n/g, '<br>')
                    }} />
                  ) : (
                    <em>No content to preview</em>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
        <DialogFooter className="gap-2">
          {notePreviewMode ? (
            <Button 
              onClick={() => setNotePopupOpen(false)} 
              className="text-sm sm:text-base"
            >
              OK
            </Button>
          ) : (
            <>
              <Button 
                variant="outline" 
                onClick={() => {
                  setQuickNote("");
                  setNotePopupOpen(false);
                }} 
                className="text-sm sm:text-base"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSaveNote} 
                disabled={!quickNote.trim()} 
                className="text-sm sm:text-base"
              >
                Save Permanent Note
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}