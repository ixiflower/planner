import { useState } from 'react';
import EnhancedChatWindow from './EnhancedChatWindow';
import { Button } from '@/components/ui/button';

export default function ChatDemo() {
  const [showChat, setShowChat] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  const currentUser = {
    id: '1',
    username: 'you',
    name: 'You',
    profile_picture: '/src/assets/defult.jpg'
  };

  const otherUser = {
    id: '2',
    username: 'freaky',
    name: 'Freaky',
    profile_picture: '/src/assets/defult.jpg'
  };

  const handleClose = () => {
    setShowChat(false);
    setIsMinimized(false);
    setIsMaximized(false);
  };

  const handleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  const handleMaximize = () => {
    setIsMaximized(!isMaximized);
  };

  return (
    <div>
      <Button onClick={() => setShowChat(true)}>
        Open Enhanced Chat
      </Button>

      {showChat && (
        <EnhancedChatWindow
          currentUser={currentUser}
          otherUser={otherUser}
          isGroup={false}
          onClose={handleClose}
          onMinimize={handleMinimize}
          onMaximize={handleMaximize}
          isMinimized={isMinimized}
          isMaximized={isMaximized}
        />
      )}
    </div>
  );
}