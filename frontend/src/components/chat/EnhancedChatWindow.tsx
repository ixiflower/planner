import { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  X, 
  Minus, 
  Square, 
  Copy, 
  Paperclip, 
  Image as ImageIcon, 
  Trash2, 
  Check, 
  CheckCheck, 
  Video, 
  Pencil, 
  MoreVertical,
  Bookmark,
  BookmarkCheck,
  Search,
  Phone,
  Settings
} from 'lucide-react';
import { BACKEND_URL } from '@/config/backend';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { Button } from "@/components/ui/button";

interface Message {
  id: string;
  message: string;
  timestamp: string;
  user: {
    id: string;
    username: string;
    profile_picture?: string;
    name?: string;
  };
  image?: string;
  is_saved?: boolean;
  isNew?: boolean;
}

interface EnhancedChatWindowProps {
  currentUser: any;
  otherUser?: any;
  isGroup?: boolean;
  roomName?: string;
  onClose?: () => void;
  onMinimize?: () => void;
  onMaximize?: () => void;
  isMinimized?: boolean;
  isMaximized?: boolean;
}

export default function EnhancedChatWindow({
  currentUser,
  otherUser,
  isGroup = false,
  roomName,
  onClose,
  onMinimize,
  onMaximize,
  isMinimized = false,
  isMaximized = false
}: EnhancedChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [savedMessages, setSavedMessages] = useState<Message[]>([]);
  const [showSavedMessages, setShowSavedMessages] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendButtonPressed, setSendButtonPressed] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || isSending) return;

    // Trigger send button press animation
    setSendButtonPressed(true);
    setTimeout(() => setSendButtonPressed(false), 150);
    
    setIsSending(true);

    try {
      const tempMessage: Message = {
        id: Date.now().toString(),
        message: newMessage,
        timestamp: new Date().toISOString(),
        user: currentUser,
      };

      // Clear input immediately for responsive feel
      const messageToSend = newMessage;
      setNewMessage('');

      // Add message with slide-in animation
      setMessages(prev => [...prev, { ...tempMessage, isNew: true }]);
      
      // Simulate sending delay (replace with actual API call)
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Update message to show as sent
      setMessages(prev => prev.map(msg => 
        msg.id === tempMessage.id ? { ...msg, isNew: false } : msg
      ));

    } catch (error) {
      console.error('Failed to send message:', error);
      // Restore message input on error
      setNewMessage(newMessage);
    } finally {
      setIsSending(false);
    }
  };

  const handleSaveMessage = useCallback((message: Message) => {
    setSavedMessages(prev => {
      const isAlreadySaved = prev.find(m => m.id === message.id);
      if (isAlreadySaved) {
        return prev.filter(m => m.id !== message.id);
      }
      return [...prev, { ...message, is_saved: true }];
    });
  }, []);

  const handleDeleteMessage = useCallback((messageId: string) => {
    setMessages(prev => prev.filter(m => m.id !== messageId));
  }, []);

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const filteredMessages = messages.filter(message => 
    message.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
    message.user.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const displayMessages = showSavedMessages ? savedMessages : filteredMessages;

  if (isMinimized) {
    return (
      <div className="fixed bottom-0 right-4 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-t-lg shadow-lg z-50">
        <div className="flex items-center justify-between p-3 bg-blue-600 text-white rounded-t-lg">
          <div className="flex items-center gap-2">
            <Avatar className="w-8 h-8">
              <AvatarImage src={otherUser?.profile_picture} />
              <AvatarFallback>{(otherUser?.name || otherUser?.username || 'U')[0]}</AvatarFallback>
            </Avatar>
            <span className="font-medium text-sm">
              {isGroup ? roomName : (otherUser?.name || otherUser?.username)}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={onMaximize}
              className="text-white hover:bg-blue-700 p-1 h-auto"
            >
              <Square className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-white hover:bg-blue-700 p-1 h-auto"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`fixed ${isMaximized ? 'inset-4' : 'bottom-4 right-4 w-96 h-[600px]'} bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-2xl z-50 flex flex-col`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-lg">
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10 border-2 border-white">
            <AvatarImage src={otherUser?.profile_picture} />
            <AvatarFallback className="bg-white text-blue-600 font-semibold">
              {(otherUser?.name || otherUser?.username || 'U')[0]}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold">
              {isGroup ? roomName : (otherUser?.name || otherUser?.username)}
            </h3>
            <p className="text-xs text-blue-100">
              {isGroup ? `${messages.length} messages` : 'last seen recently'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSearch(!showSearch)}
            className="text-white hover:bg-white/20 p-2 h-auto"
          >
            <Search className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSavedMessages(!showSavedMessages)}
            className="text-white hover:bg-white/20 p-2 h-auto"
          >
            <Bookmark className="w-4 h-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20 p-2 h-auto"
              >
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setShowSavedMessages(true)}>
                <Bookmark className="w-4 h-4 mr-2" />
                Saved Messages ({savedMessages.length})
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="w-4 h-4 mr-2" />
                Chat Settings
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onMinimize}
            className="text-white hover:bg-white/20 p-1 h-auto"
          >
            <Minus className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={isMaximized ? onMaximize : onMaximize}
            className="text-white hover:bg-white/20 p-1 h-auto"
          >
            <Square className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-white hover:bg-white/20 p-1 h-auto"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      {showSearch && (
        <div className="p-3 bg-gray-50 dark:bg-gray-800 border-b">
          <input
            type="text"
            placeholder="Search messages..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}

      {/* Saved Messages Header */}
      {showSavedMessages && (
        <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookmarkCheck className="w-5 h-5 text-yellow-600" />
              <span className="font-medium text-yellow-800 dark:text-yellow-200">
                Saved Messages ({savedMessages.length})
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSavedMessages(false)}
              className="text-yellow-600 hover:bg-yellow-100 dark:hover:bg-yellow-800/30"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {displayMessages.map((message) => (
          <ContextMenu key={message.id}>
            <ContextMenuTrigger>
              <div className={`flex items-start gap-3 group ${
                message.user.id === currentUser.id ? 'flex-row-reverse' : 'flex-row'
              } ${message.isNew ? 'animate-in slide-in-from-bottom-2 duration-300' : ''}`}>
                {/* User Avatar */}
                <Avatar className="w-8 h-8 flex-shrink-0">
                  <AvatarImage src={message.user.profile_picture} />
                  <AvatarFallback className="text-xs">
                    {(message.user.name || message.user.username)[0]}
                  </AvatarFallback>
                </Avatar>
                
                {/* Message Content */}
                <div className={`flex flex-col max-w-[70%] ${
                  message.user.id === currentUser.id ? 'items-end' : 'items-start'
                }`}>
                  {/* Username */}
                  <span className="text-xs text-gray-500 dark:text-gray-400 mb-1 px-1">
                    {message.user.name || message.user.username}
                  </span>
                  
                  {/* Message Bubble */}
                  <div className={`relative px-4 py-2 rounded-2xl max-w-full break-words ${
                    message.user.id === currentUser.id
                      ? 'bg-blue-600 text-white rounded-br-sm'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-bl-sm'
                  } ${message.is_saved ? 'ring-2 ring-yellow-400' : ''}`}>
                    {message.image && (
                      <img
                        src={message.image}
                        alt="Shared image"
                        className="max-w-full rounded-lg mb-2"
                      />
                    )}
                    <p className="text-sm">{message.message}</p>
                    
                    {/* Time and Status */}
                    <div className={`flex items-center gap-1 mt-1 justify-end ${
                      message.user.id === currentUser.id ? 'text-blue-100' : 'text-gray-500'
                    }`}>
                      <span className="text-xs">{formatTime(message.timestamp)}</span>
                      {message.user.id === currentUser.id && (
                        <CheckCheck className="w-3 h-3" />
                      )}
                      {message.is_saved && (
                        <BookmarkCheck className="w-3 h-3 text-yellow-400" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </ContextMenuTrigger>
            
            <ContextMenuContent>
              <ContextMenuItem onClick={() => handleSaveMessage(message)}>
                <Bookmark className="w-4 h-4 mr-2" />
                {savedMessages.find(m => m.id === message.id) ? 'Unsave Message' : 'Save Message'}
              </ContextMenuItem>
              <ContextMenuItem onClick={() => navigator.clipboard.writeText(message.message)}>
                <Copy className="w-4 h-4 mr-2" />
                Copy Message
              </ContextMenuItem>
              {message.user.id === currentUser.id && (
                <ContextMenuItem onClick={() => handleDeleteMessage(message.id)} className="text-red-600">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Message
                </ContextMenuItem>
              )}
            </ContextMenuContent>
          </ContextMenu>
        ))}
        
        {isTyping && (
          <div className="flex items-center gap-2 text-gray-500">
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
            </div>
            <span className="text-sm">Someone is typing...</span>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-4">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
          />
          
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="text-gray-500 hover:text-gray-700 p-2"
          >
            <Paperclip className="w-5 h-5" />
          </Button>
          
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
          />
          
          <Button
            type="submit"
            disabled={!newMessage.trim() || isSending}
            className={`bg-blue-600 hover:bg-blue-700 text-white rounded-full px-6 py-2 transition-all duration-200 ${
              sendButtonPressed ? 'scale-95 bg-blue-800' : 'scale-100'
            } ${isSending ? 'opacity-70' : 'opacity-100'}`}
          >
            {isSending ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Sending...</span>
              </div>
            ) : (
              'Send'
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}