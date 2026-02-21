import React, { useState, useEffect, useRef } from 'react';
import { PhysiotherapistLayout } from '../../components/layouts/PhysiotherapistLayout';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { User, Send, Paperclip, Video, Search, Phone, MoreVertical, MessageSquare } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../../context/AuthContext';

interface Patient {
  id: string;
  name: string;
  lastMessage: string;
  time: string;
  unread?: number;
  online?: boolean;
}

interface Message {
  senderId: string;
  text: string;
  timestamp: any;
  type: string;
}

const mockPatients: Patient[] = [
  { id: '1', name: 'John Doe', lastMessage: 'Thanks for the feedback!', time: '10:30 AM', online: true },
  { id: '2', name: 'Sarah Smith', lastMessage: 'The shoulder exercises are helping.', time: 'Yesterday', online: false },
  { id: '3', name: 'Michael Brown', lastMessage: 'When is our next session?', time: '2 days ago', unread: 2, online: true },
];

export function PhysioMessages() {
  const { user } = useAuth();
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(mockPatients[0]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [chatId, setChatId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user || !selectedPatient) return;

    const initializeChat = async () => {
      try {
        const response = await fetch('http://localhost:5000/chat/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ patient_id: selectedPatient.id, physio_id: user.id })
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
  }, [user, selectedPatient]);

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
    const interval = setInterval(fetchMessages, 3000);
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
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  return (
    <PhysiotherapistLayout>
      <div className="h-[calc(100vh-8rem)] flex gap-6">
        {/* Patients List */}
        <Card className="w-80 flex flex-col overflow-hidden">
          <div className="p-4 border-b">
            <h3 className="font-semibold mb-4">Patient Conversations</h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search patients..." className="pl-9 h-9" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {mockPatients.map((patient) => (
              <button
                key={patient.id}
                onClick={() => setSelectedPatient(patient)}
                className={`w-full p-4 flex gap-3 hover:bg-muted transition-colors ${
                  selectedPatient?.id === patient.id ? 'bg-primary/5 border-r-4 border-primary' : ''
                }`}
              >
                <div className="relative flex-shrink-0">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary font-semibold text-lg">
                    {patient.name.charAt(0)}
                  </div>
                  {patient.online && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
                  )}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex justify-between items-start mb-1">
                    <p className="font-medium truncate">{patient.name}</p>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{patient.time}</span>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{patient.lastMessage}</p>
                </div>
              </button>
            ))}
          </div>
        </Card>

        {/* Chat Area */}
        <Card className="flex-1 flex flex-col overflow-hidden">
          {selectedPatient ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b flex items-center justify-between bg-white">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-semibold">
                    {selectedPatient.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold">{selectedPatient.name}</p>
                    <p className="text-xs text-green-600">{selectedPatient.online ? 'Online' : 'Offline'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon"><Phone className="w-4 h-4" /></Button>
                  <Button variant="outline" size="icon"><Video className="w-4 h-4" /></Button>
                  <Button variant="outline" size="icon"><MoreVertical className="w-4 h-4" /></Button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-muted/30">
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.senderId === user?.id ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                      msg.senderId === user?.id ? 'bg-primary text-white' : 'bg-white border'
                    }`}>
                      <p className="text-sm">{msg.text}</p>
                      <p className={`text-[10px] mt-1 ${msg.senderId === user?.id ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                        {formatTime(msg.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={scrollRef} />
              </div>

              {/* Input Area */}
              <form onSubmit={handleSendMessage} className="p-4 border-t bg-white">
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="icon"><Paperclip className="w-4 h-4" /></Button>
                  <Input
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="flex-1"
                  />
                  <Button type="submit" className="bg-primary hover:bg-primary/90">
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
              <MessageSquare className="w-12 h-12 mb-4 opacity-20" />
              <p>Select a patient to start messaging</p>
            </div>
          )}
        </Card>
      </div>
    </PhysiotherapistLayout>
  );
}