import * as React from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from '@/components/ui/button';
import { FilePenLine, Eye, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import type { PermanentNote } from './types';
import { deletePermanentNote } from './api';

interface PermanentNotesProps {
  permanentNotes: PermanentNote[];
  setPermanentNotes: React.Dispatch<React.SetStateAction<PermanentNote[]>>;
  setQuickNote: React.Dispatch<React.SetStateAction<string>>;
  setNotePreviewMode: React.Dispatch<React.SetStateAction<boolean>>;
  setNotePopupOpen: React.Dispatch<React.SetStateAction<boolean>>;
  token: string | null;
}

export function PermanentNotes({
  permanentNotes,
  setPermanentNotes,
  setQuickNote,
  setNotePreviewMode,
  setNotePopupOpen,
  token
}: PermanentNotesProps) {
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const [noteToDelete, setNoteToDelete] = React.useState<number | null>(null);

  const handleDelete = async () => {
    if (!noteToDelete) return;
    
    try {
      await deletePermanentNote(noteToDelete, token ?? undefined);
      setPermanentNotes(prev => prev.filter(note => note.id !== noteToDelete));
      setDeleteConfirmOpen(false);
      setNoteToDelete(null);
    } catch (error) {
      console.error("Failed to delete note:", error);
    }
  };

  const confirmDelete = (noteId: number) => {
    setNoteToDelete(noteId);
    setDeleteConfirmOpen(true);
  };

  return (
    <>
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
                className="p-2 border rounded text-sm transition-colors"
              >
                <div
                  className="cursor-pointer"
                  onClick={() => {
                    setQuickNote(note.content);
                    setNotePreviewMode(true);
                    setNotePopupOpen(true);
                  }}
                >
                  <div 
                    className="line-clamp-2 text-xs sm:text-sm prose prose-xs dark:prose-invert"
                    dangerouslySetInnerHTML={{
                      __html: note.content
                        .replace(/^# (.*$)/gim, '<span class="text-base font-bold block">$1</span>')
                        .replace(/^## (.*$)/gim, '<span class="text-sm font-bold block">$1</span>')
                        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                        .replace(/\*(.*?)\*/g, '<em>$1</em>')
                        .replace(/~~(.*?)~~/g, '<del>$1</del>')
                        .replace(/^- \[ \] (.*$)/gim, '<div class="flex items-center"><input type="checkbox" class="mr-1" disabled> <span>$1</span></div>')
                        .replace(/^- \[x\] (.*$)/gim, '<div class="flex items-center"><input type="checkbox" class="mr-1" checked disabled> <span>$1</span></div>')
                        .replace(/\n/g, '<br>')
                    }}
                  />
                </div>
                <div className="flex items-center justify-between mt-1">
                  <div className="text-xs text-muted-foreground">
                    {new Date(note.created_at).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => {
                        setQuickNote(note.content);
                        setNotePreviewMode(false); 
                        setNotePopupOpen(true);
                      }}
                    >
                      <FilePenLine className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => {
                        setQuickNote(note.content);
                        setNotePreviewMode(true); 
                        setNotePopupOpen(true);
                      }}
                    >
                      <Eye className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => confirmDelete(note.id)}
                    >
                      <Trash2 className="w-3 h-3 text-destructive" />
                    </Button>
                  </div>
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

      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Note</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this note? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteConfirmOpen(false);
                setNoteToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}