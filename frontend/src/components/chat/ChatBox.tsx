import { useEffect, useState, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { X, Minus, Square, Copy, Paperclip, Image as ImageIcon, Trash2, Check, CheckCheck, Video, Pencil, MoreVertical, Bookmark, BookmarkCheck, Share, Send } from 'lucide-react';
import { BACKEND_URL } from '@/config/backend';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type ChatBoxProps =
  | {
      mode?: "dm";
      targetUser: {
        id: string;
        name: string;
        avatarUrl?: string;
      };
      onClose: () => void;
      isEmbedded?: boolean;
      /** When embedding inside a page layout, make the chat fill the parent container */
      fullSize?: boolean;
      hideHeaderControls?: boolean;
      hideHeader?: boolean; // New prop to hide the entire header
      onBackToChats?: () => void; // Callback for back to chats button
      showBackButton?: boolean; // Whether to show the back button
      backgroundClassName?: string; // New prop
    }
  | {
      mode: "general";
      targetUser?: undefined;
      onClose: () => void;
      isEmbedded?: boolean;
      fullSize?: boolean;
      hideHeaderControls?: boolean;
      hideHeader?: boolean; // New prop to hide the entire header
      onBackToChats?: () => void; // Callback for back to chats button
      showBackButton?: boolean; // Whether to show the back button
      backgroundClassName?: string; // New prop
    };

type Message = {
    id: number;
    sender_id: number;
    sender_username: string;
    message: string;
    image?: string;
    timestamp: string;
    is_seen?: boolean;
    is_saved?: boolean;
    saved_by?: number[];
};

export default function ChatBox(props: ChatBoxProps) {
  const {
    mode = "dm",
    onClose,
    isEmbedded = false,
    fullSize = false,
    hideHeaderControls = false, // Destructure new prop with default false
    hideHeader = false, // Destructure new prop with default false
    onBackToChats,
    showBackButton = false, // Destructure new prop with default false
    backgroundClassName = "bg-background", // Destructure with default
  } = props as any;

  const currentTarget = mode === "dm" ? (props as any).targetUser : { id: 'general', name: '#general' };

  const { user, token: authToken } = useAuth();
  const isDeveloper = user?.developer === true;
  const [chatRoomId, setChatRoomId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Chat window resizing (custom handle)
  const [chatSize, setChatSize] = useState<{ width: number; height: number }>({
    width: 768, // ~w-192
    height: 600,
  });
  const resizeDragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
  } | null>(null);
  const prevSizeBeforeFullscreenRef = useRef<{ width: number; height: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const enterFullscreen = useCallback(() => {
    if (!prevSizeBeforeFullscreenRef.current) {
      prevSizeBeforeFullscreenRef.current = chatSize;
    }
    setIsFullscreen(true);
  }, [chatSize]);

  const exitFullscreen = useCallback(() => {
    setIsFullscreen(false);
    if (prevSizeBeforeFullscreenRef.current) {
      setChatSize(prevSizeBeforeFullscreenRef.current);
      prevSizeBeforeFullscreenRef.current = null;
    }
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (isFullscreen) exitFullscreen();
    else enterFullscreen();
  }, [enterFullscreen, exitFullscreen, isFullscreen]);
  const [editingMessageId, setEditingMessageId] = useState<number | null>(null);
  const [editingMessageText, setEditingMessageText] = useState<string>('');
  const [editingFile, setEditingFile] = useState<File | null>(null);
  const [selectedMessageIds, setSelectedMessageIds] = useState<Set<number>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchChatRoomAndMessages = useCallback(async () => {
    if (!user || !authToken) { // Removed !targetUser check here
        setLoading(false); // Ensure loading is set to false even if no user/token
        return;
    }

    let url = '';
    if (mode === 'general') {
        url = `${BACKEND_URL}/tickets/api/chat/general/`;
    } else if (mode === 'dm' && currentTarget.id) { // Ensure currentTarget.id exists for DM
        url = `${BACKEND_URL}/tickets/api/chat/room/${currentTarget.id}/`;
    } else {
        console.error("Invalid chat mode or target for fetching chat room.");
        setError("Invalid chat room configuration.");
        setLoading(false);
        return;
    }

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authToken.startsWith('Token ') ? authToken : `Token ${authToken}`
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch chat room or messages');
      }

      const data = await response.json();
      setChatRoomId(data.chat_room_id);
      setMessages(data.messages);
    } catch (e: any) {
      console.error("Error fetching chat room and messages:", e);
      setError(e.message || "Failed to load chat");
    } finally {
      setLoading(false);
    }
  }, [user, currentTarget.id, authToken, mode]); // Updated dependencies

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchChatRoomAndMessages();
  }, [fetchChatRoomAndMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // ESC minimizes the chat window (and exits fullscreen first if needed)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;

      // If user is typing in an input/textarea, let ESC behave normally
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;

      if (isFullscreen) {
        exitFullscreen();
      }
      setIsMinimized(true);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [exitFullscreen, isFullscreen]);

  // Global pointer listeners while resizing (works for mouse + touch)
  useEffect(() => {
    const stopResize = () => {
      if (!resizeDragRef.current) return;
      resizeDragRef.current = null;
      // restore global styles in case we disabled selection/cursor
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!resizeDragRef.current) return;
      if (e.pointerId !== resizeDragRef.current.pointerId) return;

      const dx = e.clientX - resizeDragRef.current.startX;
      const dy = e.clientY - resizeDragRef.current.startY;

      // Dragging the top-left handle: moving mouse left/up should increase size
      const nextWidth = resizeDragRef.current.startWidth - dx;
      const nextHeight = resizeDragRef.current.startHeight - dy;

      const minWidth = 256; // 16rem
      const minHeight = 192; // 12rem
      const maxWidth = Math.floor(window.innerWidth * 0.95);
      const maxHeight = Math.floor(window.innerHeight * 0.85);

      // don't allow manual resizing while fullscreen
      if (isFullscreen) return;

      setChatSize({
        width: Math.max(minWidth, Math.min(maxWidth, nextWidth)),
        height: Math.max(minHeight, Math.min(maxHeight, nextHeight)),
      });
    };

    const handleBlur = () => stopResize();
    const handleVisibility = () => {
      if (document.visibilityState !== 'visible') stopResize();
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', stopResize);
    window.addEventListener('pointercancel', stopResize);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', stopResize);
      window.removeEventListener('pointercancel', stopResize);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('visibilitychange', handleVisibility);
      stopResize();
    };
  }, [isFullscreen]);

  useEffect(() => {
    if (!chatRoomId || !authToken) return;

    const pollMessages = setInterval(async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/tickets/api/chat/room/${chatRoomId}/messages/`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authToken.startsWith('Token ') ? authToken : `Token ${authToken}`
          },
        });

        if (!response.ok) {
          throw new Error('Failed to poll new messages');
        }

        const data = await response.json();
        setMessages(prevMessages => {
            // Only update if there are new messages or message count has changed
            if (data.messages.length !== prevMessages.length || 
                (data.messages.length > 0 && prevMessages.length > 0 && 
                 data.messages[data.messages.length - 1].id !== prevMessages[prevMessages.length - 1].id)) {
                return data.messages;
            }
            return prevMessages;
        });
      } catch (e) {
        console.error("Error polling messages:", e);
      }
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(pollMessages);
  }, [chatRoomId, authToken]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      // Allow any file type for now, validation can be more sophisticated if needed
      setSelectedFile(file);
    }
  };

  const handleSendMessage = async () => {
    if ((!newMessage.trim() && !selectedFile) || !chatRoomId || !authToken || !user) return;

    try {
      let body;
      const headers: HeadersInit = {
        'Authorization': authToken.startsWith('Token ') ? authToken : `Token ${authToken}`
      };

      if (selectedFile) {
        const formData = new FormData();
        formData.append('message', newMessage);
        formData.append('image', selectedFile);
        body = formData;
        // Content-Type is not set here to allow browser to set boundary
      } else {
        headers['Content-Type'] = 'application/json';
        body = JSON.stringify({ message: newMessage });
      }

      const response = await fetch(`${BACKEND_URL}/tickets/api/chat/room/${chatRoomId}/send/`, {
        method: 'POST',
        headers: headers,
        body: body
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json();
      setMessages(prevMessages => [...prevMessages, data.message]);
      setNewMessage('');
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      scrollToBottom();
    } catch (e: any) {
      console.error("Error sending message:", e);
      setError(e.message || "Failed to send message");
    }
  };

  const handleEditClick = (msg: Message) => {
    setEditingMessageId(msg.id);
    setEditingMessageText(msg.message || "");
    setEditingFile(null);
  };

  const handleEditFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setEditingFile(e.target.files[0]);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingMessageId || !authToken) return;
    if (!editingMessageText.trim() && !editingFile) return;

    try {
      let body: BodyInit;
      const headers: HeadersInit = {
        'Authorization': authToken.startsWith('Token ') ? authToken : `Token ${authToken}`
      };

      if (editingFile) {
        const formData = new FormData();
        formData.append('message', editingMessageText);
        formData.append('image', editingFile);
        body = formData;
      } else {
        headers['Content-Type'] = 'application/json';
        body = JSON.stringify({ message: editingMessageText });
      }

      const response = await fetch(`${BACKEND_URL}/tickets/api/chat/message/${editingMessageId}/`, {
        method: 'POST',
        headers,
        body
      });

      if (!response.ok) {
        throw new Error('Failed to update message');
      }

      const data = await response.json();
      if (data?.message) {
        setMessages(prevMessages =>
          prevMessages.map(msg =>
            msg.id === editingMessageId ? { ...msg, ...data.message } : msg
          )
        );
      }

      setEditingMessageId(null);
      setEditingMessageText('');
      setEditingFile(null);
    } catch (e: any) {
      console.error("Error saving edited message:", e);
      // Optionally show a toast error
    }
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditingMessageText('');
    setEditingFile(null);
  };

  const handleSaveMessage = async (messageId: number) => {
    if (!authToken || !user) return;
    try {
      const response = await fetch(`${BACKEND_URL}/tickets/api/chat/message/${messageId}/save/`, {
        method: 'POST',
        headers: {
          'Authorization': authToken.startsWith('Token ') ? authToken : `Token ${authToken}`,
          'Content-Type': 'application/json'
        },
      });

      if (!response.ok) {
        throw new Error('Failed to save message');
      }

      const data = await response.json();
      setMessages(prev => 
        prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, saved_by: data.saved_by || [], is_saved: data.is_saved || false }
            : msg
        )
      );
    } catch (error) {
      console.error("Error saving message:", error);
    }
  };

  const handleCopyMessage = async (messageText: string) => {
    try {
      await navigator.clipboard.writeText(messageText);
    } catch (error) {
      console.error("Error copying message:", error);
    }
  };

  const handleForwardMessage = async (messageId: number) => {
    // This would open a dialog to select recipients for forwarding
    // For now, we'll just copy the message to clipboard
    const message = messages.find(m => m.id === messageId);
    if (message) {
      await handleCopyMessage(message.message || '');
    }
  };

  const handleDeleteMessage = async (messageId: number) => {
    if (!authToken) return;
    try {
      const response = await fetch(`${BACKEND_URL}/tickets/api/chat/message/${messageId}/delete/`, {
        method: 'DELETE',
        headers: {
          'Authorization': authToken.startsWith('Token ') ? authToken : `Token ${authToken}`
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete message');
      }

      setMessages(prev => prev.filter(m => m.id !== messageId));
      setSelectedMessageIds(prev => {
        const next = new Set(prev);
        next.delete(messageId);
        return next;
      });
    } catch (error) {
      console.error("Error deleting message:", error);
      // Optionally show a toast error
    }
  };

  const toggleSelectionMode = () => {
    setIsSelectionMode(prev => {
      if (prev) {
        setSelectedMessageIds(new Set());
      }
      return !prev;
    });
  };

  const toggleMessageSelection = (messageId: number) => {
    setSelectedMessageIds(prev => {
      const next = new Set(prev);
      if (next.has(messageId)) {
        next.delete(messageId);
        return next;
      }
      if (next.size >= 100) return next;
      next.add(messageId);
      return next;
    });
  };

  const handleBulkDelete = async () => {
    if (!authToken || selectedMessageIds.size === 0) return;
    const selectedIds = Array.from(selectedMessageIds);
    const allowedIds = selectedIds.filter((id) => {
      const msg = messages.find((m) => m.id === id);
      return msg && String(msg.sender_id) === String(user?.id);
    });

    if (allowedIds.length === 0) return;
    if (!window.confirm(`Delete ${allowedIds.length} selected messages? This cannot be undone.`)) return;

    try {
      const response = await fetch(`${BACKEND_URL}/tickets/api/chat/messages/bulk-delete/`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authToken.startsWith('Token ') ? authToken : `Token ${authToken}`
        },
        body: JSON.stringify({ message_ids: allowedIds.slice(0, 100) })
      });

      if (!response.ok) {
        throw new Error('Failed to delete selected messages');
      }

      const data = await response.json();
      if (data?.deleted_ids) {
        setMessages(prev => prev.filter(m => !data.deleted_ids.includes(m.id)));
      }
      setSelectedMessageIds(new Set());
      setIsSelectionMode(false);
    } catch (error) {
      console.error("Error deleting selected messages:", error);
    }
  };

  const handleDeleteChatRoom = async () => {
    if (!authToken || !chatRoomId) return;
    // Prevent deletion of the general chat room
    if (mode === 'general') {
        toast.warning("The general chat room cannot be deleted.");
        return;
    }
    if (!window.confirm("Are you sure you want to delete this chat history? This cannot be undone.")) return;

    try {
      const response = await fetch(`${BACKEND_URL}/tickets/api/chat/room/${chatRoomId}/delete/`, {
        method: 'DELETE',
        headers: {
          'Authorization': authToken.startsWith('Token ') ? authToken : `Token ${authToken}`
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete chat room');
      }
      
      // If the chat is currently fullscreen, exit fullscreen first so future opens restore size
      exitFullscreen();
      onClose();
    } catch (error) {
      console.error("Error deleting chat room:", error);
    }
  };

  const handleClearGeneralChat = async () => {
    if (!authToken || !isDeveloper) return;
    if (!window.confirm("Clear all messages in #general? This cannot be undone.")) return;

    try {
      const response = await fetch(`${BACKEND_URL}/tickets/api/chat/general/clear/`, {
        method: 'DELETE',
        headers: {
          'Authorization': authToken.startsWith('Token ') ? authToken : `Token ${authToken}`
        },
      });

      if (!response.ok) {
        throw new Error('Failed to clear general chat');
      }

      setMessages([]);
      setSelectedMessageIds(new Set());
      setIsSelectionMode(false);
    } catch (error) {
      console.error("Error clearing general chat:", error);
    }
  };

  if (loading) {
    return (
      <div className={`${isEmbedded ? 'w-80 h-96' : 'fixed bottom-4 right-4 w-80 h-96'} bg-background border rounded-lg shadow-xl flex items-center justify-center z-50`}>
        <span className="text-sm text-muted-foreground">Connecting...</span>
      </div>
    );
  }

  if (error) {
    const wrapperClassName = isEmbedded
      ? // When embedded (e.g. Team page right pane), center the error in the available space
        'w-full h-full flex flex-col items-center justify-center p-6 text-center'
      : // Floating widget mode
        'fixed bottom-4 right-4 w-80 h-40 flex flex-col items-center justify-center z-50 p-4 gap-2';

    return (
      <div className={`${wrapperClassName} bg-background border rounded-lg shadow-xl gap-2`}>
        <span className="text-sm text-destructive font-medium">Error: {error}</span>
        <button onClick={onClose} className="text-xs underline">Close</button>
      </div>
    );
  }

  if (isMinimized) {
    return (
      <div className={`${isEmbedded ? 'w-60' : 'fixed bottom-4 right-4 w-60'} h-12 bg-background border rounded-t-lg shadow-xl flex items-center justify-between px-4 cursor-pointer z-50 hover:bg-accent`} onClick={() => setIsMinimized(false)}>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500"></div>
          <span className="font-medium text-sm truncate">{currentTarget.name}</span>
        </div>
        <Square className="w-4 h-4 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div
      className={`${isFullscreen ? 'fixed inset-0' : (isEmbedded ? 'w-full h-full' : 'fixed bottom-4 right-4')} ${backgroundClassName} border rounded-lg shadow-2xl flex flex-col z-50 overflow-visible`}
      style={
        isFullscreen
          ? {
              width: '100vw',
              height: '100vh',
              maxWidth: '100vw',
              maxHeight: '100vh',
              borderRadius: 0,
            }
          : (isEmbedded && fullSize) ? {
              width: '100%',
              height: '100%',
              border: 'none',
              boxShadow: 'none',
              borderRadius: 0,
            } : {
              width: chatSize.width,
              height: chatSize.height,
              maxWidth: '95vw',
              maxHeight: '85vh',
              minWidth: '16rem',
              minHeight: '12rem',
            }
      }
    >
      {/* Inner wrapper keeps content clipped while allowing outer element to be resizable */}
      <div className={`flex flex-col h-full w-full overflow-hidden ${isFullscreen ? '' : 'rounded-lg'}`}>
        <div className="h-12 bg-primary text-primary-foreground flex items-center justify-between px-4 shrink-0 relative">
          {/* Top-left resize handle (drag with mouse) */}
          {!isFullscreen && !(isEmbedded && fullSize) && !hideHeader && (
            <div
              role="button"
              aria-label="Resize chat"
              title="Drag to resize"
              className="absolute left-1 top-1 w-6 h-6 rounded-md bg-primary-foreground/20 hover:bg-primary-foreground/30 cursor-nwse-resize flex items-center justify-center"
              onPointerDown={(e) => {
                // pointer events make drag reliable
                e.preventDefault();
                e.currentTarget.setPointerCapture(e.pointerId);

                // prevent accidental text selection + show resize cursor during drag
                document.body.style.userSelect = 'none';
                document.body.style.cursor = 'nwse-resize';

                resizeDragRef.current = {
                  pointerId: e.pointerId,
                  startX: e.clientX,
                  startY: e.clientY,
                  startWidth: chatSize.width,
                  startHeight: chatSize.height,
                };
              }}
              onLostPointerCapture={() => {
                // safety: if pointer capture is lost, stop resizing
                resizeDragRef.current = null;
                document.body.style.userSelect = '';
                document.body.style.cursor = '';
              }}
            >
              <div className="w-3 h-3 border-l-2 border-t-2 border-primary-foreground/60" />
            </div>
          )}

          <div className="flex items-center min-w-0">
            {/* Back button for mobile view when in team page */}
            {showBackButton && (
              <button
                onClick={onBackToChats}
                className="flex items-center text-lg font-medium text-primary-foreground hover:opacity-80 mr-2 md:hidden"
              >
                ←
              </button>
            )}
            <span className="font-semibold text-sm truncate">{currentTarget.name}</span>
          </div>

          <div className="flex items-center gap-2">
            {!hideHeaderControls && !hideHeader && (
              <>
                {/* window controls */}
                {mode !== "general" && (
                  <button
                    title="Delete Chat"
                    onClick={handleDeleteChatRoom}
                    className="hover:opacity-80"
                  >
                    <Trash2 className="w-4 h-4 text-red-300" />
                  </button>
                )}
                {isSelectionMode && (
                  <button
                    title="Delete Selected"
                    onClick={handleBulkDelete}
                    className="hover:opacity-80"
                  >
                    <Trash2 className="w-4 h-4 text-red-300" />
                  </button>
                )}
                <button
                  title={isSelectionMode ? "Cancel selection" : "Select messages"}
                  onClick={toggleSelectionMode}
                  className="hover:opacity-80"
                >
                  <div className="relative">
                    <CheckCheck className="w-4 h-4" />
                    {isSelectionMode && selectedMessageIds.size > 0 && (
                      <span className="absolute -top-2 -right-2 rounded-full bg-primary text-primary-foreground text-[0.55rem] px-1">
                        {selectedMessageIds.size}
                      </span>
                    )}
                  </div>
                </button>
                <button
                  title={isFullscreen ? 'Restore' : 'Maximize'}
                  onClick={toggleFullscreen}
                  className="hover:opacity-80"
                >
                  {isFullscreen ? <Copy className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                </button>
                <button
                  title="Minimize"
                  onClick={() => {
                    if (isFullscreen) exitFullscreen();
                    setIsMinimized(true);
                  }}
                  className="hover:opacity-80"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <button
                  title="Close"
                  onClick={() => {
                    if (isFullscreen) exitFullscreen();
                    onClose();
                  }}
                  className="hover:opacity-80"
                >
                  <X className="w-4 h-4" />
                </button>
              </>
            )}

            {!hideHeader && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="hover:opacity-80" title="More options">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {mode !== 'general' && (
                    <DropdownMenuItem
                      onClick={handleDeleteChatRoom}
                      className="text-red-600 focus:text-red-600 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Clean History
                    </DropdownMenuItem>
                  )}
                  {mode === 'general' && isDeveloper && (
                    <DropdownMenuItem
                      onClick={handleClearGeneralChat}
                      className="text-red-600 focus:text-red-600 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Clear #general
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      <div className="flex-1 min-h-0 p-4 overflow-y-auto custom-scrollbar">
        {messages.map((msg, index) => {
           const isMe = String(msg.sender_id) === String(user?.id);
           const canSelect = isSelectionMode && isMe;
           return (
            <div
                key={msg.id || index}
                className={`flex flex-col mb-2 ${isMe ? 'items-end' : 'items-start'}`}
            >
                <ContextMenu>
                    <ContextMenuTrigger asChild>
                        <div
                        className={`max-w-[98%] sm:max-w-[95%] md:max-w-[90%] min-w-[100px] p-3 rounded-lg break-words ${
                            isMe ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
                        } ${isMe ? 'rounded-br-none rounded-bl-lg' : 'rounded-bl-none rounded-br-lg'} ${canSelect && selectedMessageIds.has(msg.id) ? 'ring-2 ring-primary/70' : ''}`}
                        onClick={() => {
                          if (canSelect) {
                            toggleMessageSelection(msg.id);
                          }
                        }}
                        >
                        {editingMessageId === msg.id && isMe ? (
                            <div className="flex flex-col gap-2">
                                <textarea
                                    value={editingMessageText}
                                    onChange={(e) => setEditingMessageText(e.target.value)}
                                    className="w-full p-1 rounded-md text-gray-800 bg-white resize-none"
                                    rows={Math.max(1, editingMessageText.split('\n').length)} // Dynamic rows
                                    autoFocus
                                />
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="file"
                                            accept="image/*,video/*"
                                            className="text-xs"
                                            onChange={handleEditFileSelect}
                                        />
                                        {editingFile && (
                                            <span className="text-xs text-muted-foreground truncate max-w-[140px]">{editingFile.name}</span>
                                        )}
                                    </div>
                                    <div className="flex justify-end gap-2">
                                        <button onClick={handleCancelEdit} className="text-sm text-muted-foreground hover:underline">Cancel</button>
                                        <button onClick={handleSaveEdit} className="text-sm bg-blue-500 text-white px-2 py-1 rounded-md hover:bg-blue-600">Save</button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <> {/* Existing message content */}
                                <span className="block text-xs font-semibold">{msg.sender_username}</span>
                                {msg.image && (
                                    <div className="mb-2">
                                    {msg.image.match(/\.(jpeg|jpg|gif|png|webp|avif|tiff|bmp|svg)$/i) ? (
                                        <img
                                            src={msg.image.startsWith('http') ? msg.image : `${BACKEND_URL}${msg.image}`}
                                            alt="Shared file"
                                            className="max-w-full rounded cursor-pointer hover:opacity-90 transition-opacity"
                                            onClick={() => window.open(msg.image!.startsWith('http') ? msg.image! : `${BACKEND_URL}${msg.image}`, '_blank')}
                                        />
                                    ) : msg.image.match(/\.(mp4|webm|ogg)$/i) ? (
                                        <video
                                            src={msg.image.startsWith('http') ? msg.image : `${BACKEND_URL}${msg.image}`}
                                            controls
                                            className="max-w-full rounded cursor-pointer hover:opacity-90 transition-opacity"
                                            onClick={(e) => e.stopPropagation()} // Prevent bubble click from opening video in new tab
                                        />
                                    ) : (
                                        <a
                                            href={msg.image.startsWith('http') ? msg.image : `${BACKEND_URL}${msg.image}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-400 underline"
                                        >
                                            Download File
                                        </a>
                                    )}
                                    </div>
                                )}
                                {msg.message && <p className="text-sm">{msg.message}</p>}
                                <span className="inline-flex items-center justify-end gap-1 text-xs text-right opacity-75 mt-1">
                                    {isMe && (
                                        msg.is_seen ? (
                                            <CheckCheck className="h-4 w-4 text-blue-500" />
                                        ) : (
                                            <Check className="h-4 w-4 text-foreground/70" />
                                        )
                                    )}
                                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </>
                        )}
                        </div>
                    </ContextMenuTrigger>
                    <ContextMenuContent className="z-[100]">
                      {/* Save Message */}
                      <ContextMenuItem
                        className="cursor-pointer"
                        onClick={() => handleSaveMessage(msg.id)}
                      >
                        {msg.saved_by?.includes(user?.id) ? (
                          <>
                            <BookmarkCheck className="w-4 h-4 mr-2" />
                            Unsave Message
                          </>
                        ) : (
                          <>
                            <Bookmark className="w-4 h-4 mr-2" />
                            Save Message
                          </>
                        )}
                      </ContextMenuItem>
                      
                      {/* Copy Message */}
                      {msg.message && (
                        <ContextMenuItem
                          className="cursor-pointer"
                          onClick={() => handleCopyMessage(msg.message)}
                        >
                          <Copy className="w-4 h-4 mr-2" />
                          Copy
                        </ContextMenuItem>
                      )}
                      
                      {/* Forward Message */}
                      <ContextMenuItem
                        className="cursor-pointer"
                        onClick={() => handleForwardMessage(msg.id)}
                      >
                        <Share className="w-4 h-4 mr-2" />
                        Forward
                      </ContextMenuItem>
                      
                      {/* Edit (only for message owner) */}
                      {isMe && (msg.message || msg.image) && (
                        <ContextMenuItem
                          className="cursor-pointer"
                          onClick={() => handleEditClick(msg)}
                        >
                          <Pencil className="w-4 h-4 mr-2" />
                          Edit
                        </ContextMenuItem>
                      )}
                      
                      {/* Delete (only for message owner) */}
                      {isMe && (
                        <ContextMenuItem
                          className="text-red-600 focus:text-red-600 cursor-pointer"
                          onClick={() => handleDeleteMessage(msg.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete for Everyone
                        </ContextMenuItem>
                      )}
                    </ContextMenuContent>
                </ContextMenu>
            </div>
           );
        })}
        <div ref={messagesEndRef} />
      </div>
      
      {selectedFile && (
        <div className="px-4 py-2 border-t bg-accent/20 flex items-center justify-between">
            <div className="flex items-center gap-2 overflow-hidden">
                {selectedFile!.type.startsWith("image/") ? (
                    <ImageIcon className="w-4 h-4 flex-shrink-0" />
                ) : selectedFile!.type.startsWith("video/") ? (
                    <Video className="w-4 h-4 flex-shrink-0" />
                ) : (
                    <Paperclip className="w-4 h-4 flex-shrink-0" /> // Generic icon for other types
                )}
                <span className="text-xs truncate">{selectedFile!.name}</span>
            </div>
            <X 
                className="w-4 h-4 cursor-pointer hover:text-destructive" 
                onClick={() => {
                    setSelectedFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                }} 
            />
        </div>
      )}

      <div className="border-t p-4 flex items-center shrink-0 gap-2">
        <input 
            type="file" 
            ref={fileInputRef}
            className="hidden" 
            accept="image/*,video/*"
            onChange={handleFileSelect}
        />
        <button
            className="text-muted-foreground hover:text-foreground transition-colors p-1"
            onClick={() => fileInputRef.current?.click()}
            title="Attach image"
        >
            <Paperclip className="w-5 h-5" />
        </button>
        <input
          type="text"
          className="flex-1 border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Type your message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              handleSendMessage();
            }
          }}
        />
        <button
          className="bg-green-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleSendMessage}
          disabled={(!newMessage.trim() && !selectedFile)}
          title={selectedFile ? `Send file: ${selectedFile.name}` : "Send message"}
        >
          <Send className="w-4 h-4" />
          Send
        </button>
      </div>
      </div>
    </div>
  );
}
