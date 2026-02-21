import React, { useState, useEffect, useRef } from 'react';
import { PatientLayout } from '../../components/layouts/PatientLayout';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Avatar } from '../../components/ui/avatar';
import { Send, Paperclip, Video, User, Search } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../../context/AuthContext';

interface Message {
  senderId: string;
  text: string;
  timestamp: any;
  type: string;
}

export function Messages() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [chatId, setChatId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // For demo purposes, we'll try to find or create a chat with a default physio ID
  const DEFAULT_PHYSIO_ID = 'demo-physio-id';

  useEffect(() => {
    if (!user) return;

    const initializeChat = async () => {
      try {
        // In a real app, you'd fetch the existing chat ID for this patient/physio pair
        // For now, let's assume we have one or create it
        const response = await fetch('http://localhost:5000/chat/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ patient_id: user.id, physio_id: DEFAULT_PHYSIO_ID })
        });
        const data = await response.json();
        if (data.chat_id) {
          setChatId(data.chat_id);
        }
      } catch (err) {
        console.error('Error initializing chat:', err);
      }
    };

    initializeChat();
  }, [user]);

  useEffect(() => {
    if (!chatId) return;

    const fetchMessages = async () => {
      try {
        const response = await fetch(`http://localhost:5000/chat/messages/${chatId}`);
        const data = await response.json();
        if (data.messages) {
          setMessages(data.messages);
        }
      } catch (err) {
        console.error('Error fetching messages:', err);
      }
    };

    fetchMessages();
    const interval = setInterval(fetchMessages, 3000); // Poll for new messages
    return () => clearInterval(interval);
  }, [chatId]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !chatId || !user) return;

    const text = newMessage;
    setNewMessage('');

    try {
      await fetch('http://localhost:5000/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          sender_id: user.id,
          text: text,
          type: 'text'
        })
      });
      // Refresh messages immediately
      const response = await fetch(`http://localhost:5000/chat/messages/${chatId}`);
      const data = await response.json();
      if (data.messages) {
        setMessages(data.messages);
      }
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  return (
    <PatientLayout>
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl mb-2">Messages</h1>
          <p className="text-muted-foreground">
            Chat with your physiotherapist for guidance and support
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Conversation List (Sidebar) */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-4"
          >
            <Card className="h-[calc(100vh-16rem)]">
              <div className="p-4 border-b border-border">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search conversations..." 
                    className="pl-10 bg-muted border-0"
                  />
                </div>
              </div>

              <div className="overflow-y-auto">
                <button className="w-full p-4 hover:bg-muted transition-colors border-l-4 border-primary bg-primary/5">
                  <div className="flex items-start gap-3">
                    <div className="relative">
                      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                        <User className="w-6 h-6 text-primary" />
                      </div>
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-medium truncate">Physiotherapist</p>
                        <span className="text-xs text-muted-foreground">Online</span>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {messages.length > 0 ? messages[messages.length - 1].text : 'Start a conversation'}
                      </p>
                    </div>
                  </div>
                </button>
              </div>
            </Card>
          </motion.div>

          {/* Chat Window */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-8"
          >
            <Card className="h-[calc(100vh-16rem)] flex flex-col">
              {/* Chat Header */}
              <div className="p-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                  </div>
                  <div>
                    <p className="font-medium">Physiotherapist</p>
                    <p className="text-xs text-green-600">Online</p>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {messages.map((message, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex gap-3 ${
                      message.senderId === user?.id ? 'flex-row-reverse' : ''
                    }`}
                  >
                    {message.senderId !== user?.id && (
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-primary" />
                      </div>
                    )}

                    <div className={`flex-1 max-w-[70%] ${
                      message.senderId === user?.id ? 'flex justify-end' : ''
                    }`}>
                      <div className={`rounded-2xl p-4 ${
                        message.senderId === user?.id
                          ? 'bg-primary text-white'
                          : 'bg-muted'
                      }`}>
                        <p className="text-sm leading-relaxed">{message.text}</p>
                      </div>
                      <p className={`text-xs text-muted-foreground mt-1 ${
                        message.senderId === user?.id ? 'text-right' : ''
                      }`}>
                        {formatTime(message.timestamp)}
                      </p>
                    </div>
                  </motion.div>
                ))}
                <div ref={scrollRef} />
              </div>

              {/* Input */}
              <form onSubmit={handleSendMessage} className="p-4 border-t border-border">
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="flex-shrink-0"
                  >
                    <Paperclip className="w-5 h-5" />
                  </Button>
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-1 bg-muted border-0"
                  />
                  <Button
                    type="submit"
                    className="flex-shrink-0 bg-primary hover:bg-primary/90"
                  >
                    <Send className="w-5 h-5" />
                  </Button>
                </div>
              </form>
            </Card>
          </motion.div>
        </div>
      </div>
    </PatientLayout>
  );
}
