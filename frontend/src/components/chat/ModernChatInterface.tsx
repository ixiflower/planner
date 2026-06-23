import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  Send, 
  Paperclip, 
  Smile, 
  MoreVertical, 
  Bookmark,
  BookmarkCheck,
  Users,
  Hash,
  Search,
  Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Message {
  id: number;
  content: string;
  sender: {
    id: number;
    username: string;
    name?: string;
    profile_picture?: string;
    team_role?: string;
  };
  timestamp: string;
  is_saved?: boolean;
  image?: string;
  isNew?: boolean;
}

interface ChatRoom {
  id: number;
  name: string;
  type: 'general' | 'private';
  participants?: any[];
  unread_count?: number;
  is_support?: boolean;
}

interface ModernChatInterfaceProps {
  chatRooms: ChatRoom[];
  selectedRoom: ChatRoom | null;
  messages: Message[];
  onRoomSelect: (room: ChatRoom) => void;
  onSendMessage: (content: string, image?: File) => void;
  onToggleSaveMessage: (messageId: number) => void;
  loading?: boolean;
}

const ModernChatInterface: React.FC<ModernChatInterfaceProps> = ({
  chatRooms,
  selectedRoom,
  messages,
  onRoomSelect,
  onSendMessage,
  onToggleSaveMessage,
  loading = false
}) => {
  const { user } = useAuth();
  const [messageInput, setMessageInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendButtonPressed, setSendButtonPressed] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, sampleMessages]);

  // Sample messages for demo when no real messages exist
  const sampleMessages = messages.length > 0 ? messages : [
    {
      id: 1,
      content: "Hey everyone! Hope you're having a great day 👋",
      sender: { 
        id: 1, 
        username: "alex_j", 
        name: "Alex Johnson", 
        profile_picture: "", 
        team_role: "Leader" 
      },
      timestamp: new Date(Date.now() - 7200000).toISOString(),
      is_saved: false,
    },
    {
      id: 2,
      content: "Good morning! Just finished the project review. Everything looks great!",
      sender: { 
        id: 2, 
        username: "sarah_c", 
        name: "Sarah Chen", 
        profile_picture: "", 
        team_role: "Mod" 
      },
      timestamp: new Date(Date.now() - 5400000).toISOString(),
      is_saved: true,
    },
    {
      id: 3,
      content: "Thanks Sarah! When is our next team meeting scheduled?",
      sender: { 
        id: 3, 
        username: "mike_r", 
        name: "Mike Rodriguez", 
        profile_picture: "", 
        team_role: "Member" 
      },
      timestamp: new Date(Date.now() - 4800000).toISOString(),
      is_saved: false,
    },
    {
      id: 4,
      content: "It's tomorrow at 2 PM. I'll send out the meeting link later today.",
      sender: { 
        id: 2, 
        username: "sarah_c", 
        name: "Sarah Chen", 
        profile_picture: "", 
        team_role: "Mod" 
      },
      timestamp: new Date(Date.now() - 4200000).toISOString(),
      is_saved: false,
    },
    {
      id: 5,
      content: "Perfect! Looking forward to it. By the way, has anyone tried the new deployment pipeline?",
      sender: { 
        id: 1, 
        username: "alex_j", 
        name: "Alex Johnson", 
        profile_picture: "", 
        team_role: "Leader" 
      },
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      is_saved: false,
    },
    {
      id: 6,
      content: "Yes! It's much faster now. Great work on optimizing it! 🚀",
      sender: { 
        id: 4, 
        username: "emma_w", 
        name: "Emma Wilson", 
        profile_picture: "", 
        team_role: "Member" 
      },
      timestamp: new Date(Date.now() - 1800000).toISOString(),
      is_saved: true,
    },
    {
      id: 7,
      content: "Awesome! The CI/CD improvements should save us a lot of time.",
      sender: { 
        id: 3, 
        username: "mike_r", 
        name: "Mike Rodriguez", 
        profile_picture: "", 
        team_role: "Member" 
      },
      timestamp: new Date(Date.now() - 900000).toISOString(),
      is_saved: false,
    },
    {
      id: 8,
      content: "Definitely! Anyone need help with the code review process?",
      sender: { 
        id: 2, 
        username: "sarah_c", 
        name: "Sarah Chen", 
        profile_picture: "", 
        team_role: "Mod" 
      },
      timestamp: new Date(Date.now() - 300000).toISOString(),
      is_saved: false,
    },
  ];

  const handleSendMessage = async () => {
    if (!messageInput.trim() || isSending) return;

    // Trigger send button press animation
    setSendButtonPressed(true);
    setTimeout(() => setSendButtonPressed(false), 150);
    
    setIsSending(true);

    try {
      // Clear input immediately for responsive feel
      const messageToSend = messageInput;
      setMessageInput('');

      // Call the parent's send message function
      await onSendMessage(messageToSend.trim());

    } catch (error) {
      console.error('Failed to send message:', error);
      // Restore message input on error
      setMessageInput(messageInput);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && messageInput.trim()) {
      onSendMessage(messageInput.trim(), file);
      setMessageInput('');
    }
  };

  const getAvatarColors = (userId: number) => {
    const colors = [
      'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500',
      'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500'
    ];
    return colors[userId % colors.length];
  };

  const getInitials = (name: string, username: string) => {
    return name ? name.slice(0, 2).toUpperCase() : username.slice(0, 2).toUpperCase();
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getRoleColor = (role?: string) => {
    switch (role) {
      case 'Leader': return 'bg-red-500';
      case 'Mod': return 'bg-blue-500';
      case 'Member': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const filteredRooms = chatRooms.filter(room => 
    room.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-[calc(100vh-8rem)] bg-background border rounded-lg overflow-hidden">
      {/* Sidebar */}
      <div className="w-80 border-r border-border bg-card">
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Chats</h2>
            <Button variant="ghost" size="sm">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Chat Rooms List */}
        <ScrollArea className="h-full">
          <div className="p-2">
            {filteredRooms.map((room) => (
              <div
                key={room.id}
                onClick={() => onRoomSelect(room)}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors hover:bg-accent",
                  selectedRoom?.id === room.id && "bg-accent"
                )}
              >
                <div className="relative">
                  {room.type === 'general' ? (
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Hash className="h-6 w-6 text-primary" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                      <Users className="h-6 w-6 text-blue-500" />
                    </div>
                  )}
                  {room.unread_count && room.unread_count > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-5 min-w-5 text-xs flex items-center justify-center p-1">
                      {room.unread_count}
                    </Badge>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-sm truncate">
                      {room.type === 'general' ? `#${room.name}` : room.name}
                    </h3>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {room.type === 'general' ? 'Public channel' : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedRoom ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-border bg-card">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    {selectedRoom.type === 'general' ? (
                      <Hash className="h-5 w-5 text-primary" />
                    ) : (
                      <Users className="h-5 w-5 text-blue-500" />
                    )}
                  </div>
                  <div>
                    <h2 className="font-semibold">
                      {selectedRoom.type === 'general' ? `#${selectedRoom.name}` : selectedRoom.name}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {selectedRoom.type === 'general' 
                        ? 'Public channel' 
                        : `${selectedRoom.participants?.length || 0} members`
                      }
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {sampleMessages.map((message, index) => {
                  const isCurrentUser = message.sender.id === user?.id;
                  const showAvatar = index === 0 || sampleMessages[index - 1].sender.id !== message.sender.id;
                  
                  return (
                    <div
                      key={message.id}
                      className={cn(
                        "flex gap-3 group",
                        isCurrentUser && "flex-row-reverse",
                        message.isNew && "animate-in slide-in-from-bottom-2 duration-300"
                      )}
                    >
                      {/* Avatar */}
                      <div className="w-8 h-8 flex-shrink-0">
                        {showAvatar && (
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={message.sender.profile_picture} />
                            <AvatarFallback className={getAvatarColors(message.sender.id)}>
                              <span className="text-white text-xs">
                                {getInitials(message.sender.name || '', message.sender.username)}
                              </span>
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>

                      {/* Message Content */}
                      <div className={cn("flex-1 max-w-md", isCurrentUser && "text-right")}>
                        {showAvatar && (
                          <div className={cn(
                            "flex items-center gap-2 mb-1",
                            isCurrentUser && "flex-row-reverse"
                          )}>
                            <span className="font-medium text-sm">
                              {message.sender.name || message.sender.username}
                            </span>
                            {message.sender.team_role && (
                              <Badge 
                                variant="secondary" 
                                className={cn("text-xs h-4", getRoleColor(message.sender.team_role))}
                              >
                                {message.sender.team_role}
                              </Badge>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {formatTime(message.timestamp)}
                            </span>
                          </div>
                        )}
                        
                        <div className={cn(
                          "relative group-hover:bg-accent/50 rounded-lg p-3 transition-colors",
                          isCurrentUser 
                            ? "bg-primary text-primary-foreground ml-auto" 
                            : "bg-muted"
                        )}>
                          {message.image && (
                            <img 
                              src={message.image} 
                              alt="Attached" 
                              className="max-w-full h-auto rounded mb-2"
                            />
                          )}
                          <p className="text-sm whitespace-pre-wrap break-words">
                            {message.content}
                          </p>
                          
                          {/* Message Actions */}
                          <div className="absolute -top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onToggleSaveMessage(message.id)}
                              className="h-6 w-6 p-0 bg-background border"
                            >
                              {message.is_saved ? (
                                <BookmarkCheck className="h-3 w-3 text-yellow-500" />
                              ) : (
                                <Bookmark className="h-3 w-3" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="p-4 border-t border-border bg-card">
              <div className="flex items-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
                <div className="flex-1">
                  <Input
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={`Message #${selectedRoom.name}...`}
                    disabled={loading}
                    className="min-h-[40px] resize-none"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                >
                  <Smile className="h-4 w-4" />
                </Button>
                <Button
                  onClick={handleSendMessage}
                  disabled={!messageInput.trim() || loading || isSending}
                  size="sm"
                  className={`transition-all duration-200 ${
                    sendButtonPressed ? 'scale-95 bg-primary/80' : 'scale-100'
                  } ${isSending ? 'opacity-70' : 'opacity-100'}`}
                >
                  {isSending ? (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          </>
        ) : (
          /* No Chat Selected */
          <div className="flex-1 flex items-center justify-center bg-muted/20">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-2">Select a chat</h3>
              <p className="text-muted-foreground">
                Choose a conversation from the sidebar to start messaging
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ModernChatInterface;