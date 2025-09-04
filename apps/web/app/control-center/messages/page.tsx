'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageCircle, Send, Search, Plus, User, Building, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderRole: 'admin' | 'business' | 'influencer';
  content: string;
  timestamp: string;
  read: boolean;
}

interface Conversation {
  id: string;
  participants: {
    id: string;
    name: string;
    role: 'admin' | 'business' | 'influencer';
    email: string;
  }[];
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  subject?: string;
}

export default function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [showNewConversationDialog, setShowNewConversationDialog] = useState(false);
  const [newConversationData, setNewConversationData] = useState({
    recipientId: '',
    recipientType: 'business' as 'business' | 'influencer',
    subject: '',
    message: ''
  });
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadConversations = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/messages/conversations');
      if (!response.ok) throw new Error('Failed to fetch conversations');
      const data = await response.json();
      setConversations(data.conversations || []);
    } catch (error) {
      console.error('Error loading conversations:', error);
      toast.error('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      setLoadingMessages(true);
      const response = await fetch(`/api/admin/messages/conversations/${conversationId}`);
      if (!response.ok) throw new Error('Failed to fetch messages');
      const data = await response.json();
      setMessages(data.messages || []);
      
      // Mark messages as read
      await fetch(`/api/admin/messages/conversations/${conversationId}/read`, {
        method: 'POST'
      });
      
      // Update conversation unread count
      setConversations(prev => prev.map(conv => 
        conv.id === conversationId ? { ...conv, unreadCount: 0 } : conv
      ));
    } catch (error) {
      console.error('Error loading messages:', error);
      toast.error('Failed to load messages');
    } finally {
      setLoadingMessages(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    try {
      setSending(true);
      const response = await fetch('/api/admin/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: selectedConversation,
          content: newMessage.trim()
        })
      });

      if (!response.ok) throw new Error('Failed to send message');
      
      setNewMessage('');
      await loadMessages(selectedConversation);
      await loadConversations(); // Refresh to update last message
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const startNewConversation = async () => {
    if (!newConversationData.recipientId || !newConversationData.message.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setSending(true);
      const response = await fetch('/api/admin/messages/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConversationData)
      });

      if (!response.ok) throw new Error('Failed to start conversation');
      
      const data = await response.json();
      setShowNewConversationDialog(false);
      setNewConversationData({
        recipientId: '',
        recipientType: 'business',
        subject: '',
        message: ''
      });
      
      await loadConversations();
      setSelectedConversation(data.conversationId);
      await loadMessages(data.conversationId);
    } catch (error) {
      console.error('Error starting conversation:', error);
      toast.error('Failed to start conversation');
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation);
    }
  }, [selectedConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const filteredConversations = conversations.filter(conv =>
    conv.participants.some(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.email.toLowerCase().includes(searchTerm.toLowerCase())
    ) || conv.subject?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedConv = conversations.find(c => c.id === selectedConversation);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString();
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'business': return 'bg-blue-100 text-blue-800';
      case 'influencer': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Messages</h1>
        <Button onClick={() => setShowNewConversationDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Conversation
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
        {/* Conversations List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center">
              <MessageCircle className="w-5 h-5 mr-2" />
              Conversations
            </CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search conversations..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[500px] overflow-y-auto">
              {loading ? (
                <div className="flex justify-center items-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No conversations found
                </div>
              ) : (
                filteredConversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    className={`p-4 border-b cursor-pointer hover:bg-gray-50 ${
                      selectedConversation === conversation.id ? 'bg-blue-50 border-blue-200' : ''
                    }`}
                    onClick={() => setSelectedConversation(conversation.id)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center">
                        {conversation.participants
                          .filter(p => p.role !== 'admin')
                          .map(participant => (
                            <div key={participant.id} className="flex items-center mr-2">
                              {participant.role === 'business' ? (
                                <Building className="w-4 h-4 mr-1" />
                              ) : (
                                <User className="w-4 h-4 mr-1" />
                              )}
                              <span className="text-sm font-medium">{participant.name}</span>
                              <Badge className={`ml-2 ${getRoleColor(participant.role)}`}>
                                {participant.role}
                              </Badge>
                            </div>
                          ))}
                      </div>
                      {conversation.unreadCount > 0 && (
                        <Badge className="bg-red-500 text-white">
                          {conversation.unreadCount}
                        </Badge>
                      )}
                    </div>
                    {conversation.subject && (
                      <div className="text-sm font-medium text-gray-900 mb-1">
                        {conversation.subject}
                      </div>
                    )}
                    <div className="text-sm text-gray-600 truncate">
                      {conversation.lastMessage}
                    </div>
                    <div className="flex items-center text-xs text-gray-400 mt-1">
                      <Clock className="w-3 h-3 mr-1" />
                      {formatTime(conversation.lastMessageAt)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Messages */}
        <Card className="lg:col-span-2">
          {selectedConversation ? (
            <>
              <CardHeader>
                <CardTitle>
                  {selectedConv?.participants
                    .filter(p => p.role !== 'admin')
                    .map(p => p.name)
                    .join(', ')}
                </CardTitle>
                {selectedConv?.subject && (
                  <p className="text-sm text-gray-600">{selectedConv.subject}</p>
                )}
              </CardHeader>
              <CardContent className="flex flex-col h-full">
                <div className="flex-1 overflow-y-auto mb-4 max-h-[400px] border rounded p-4">
                  {loadingMessages ? (
                    <div className="flex justify-center items-center h-32">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="text-center text-gray-500">
                      No messages yet. Start the conversation!
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${
                            message.senderRole === 'admin' ? 'justify-end' : 'justify-start'
                          }`}
                        >
                          <div
                            className={`max-w-[70%] p-3 rounded-lg ${
                              message.senderRole === 'admin'
                                ? 'bg-blue-500 text-white'
                                : 'bg-gray-100 text-gray-900'
                            }`}
                          >
                            <div className="flex items-center mb-1">
                              <span className="text-sm font-medium">
                                {message.senderName}
                              </span>
                              <Badge className={`ml-2 ${getRoleColor(message.senderRole)}`}>
                                {message.senderRole}
                              </Badge>
                            </div>
                            <p className="text-sm">{message.content}</p>
                            <p className="text-xs opacity-75 mt-1">
                              {formatTime(message.timestamp)}
                            </p>
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>
                
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Type your message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    rows={3}
                    className="flex-1"
                  />
                  <Button onClick={sendMessage} disabled={sending || !newMessage.trim()}>
                    {sending ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </>
          ) : (
            <CardContent className="flex items-center justify-center h-full">
              <div className="text-center text-gray-500">
                <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Select a conversation to start messaging</p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>

      {/* New Conversation Dialog */}
      <Dialog open={showNewConversationDialog} onOpenChange={setShowNewConversationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start New Conversation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Recipient Type</label>
              <Select
                value={newConversationData.recipientType}
                onValueChange={(value: 'business' | 'influencer') =>
                  setNewConversationData(prev => ({ ...prev, recipientType: value, recipientId: '' }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="business">Business</SelectItem>
                  <SelectItem value="influencer">Influencer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Recipient ID</label>
              <Input
                placeholder="Enter recipient ID"
                value={newConversationData.recipientId}
                onChange={(e) =>
                  setNewConversationData(prev => ({ ...prev, recipientId: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium">Subject (Optional)</label>
              <Input
                placeholder="Enter subject"
                value={newConversationData.subject}
                onChange={(e) =>
                  setNewConversationData(prev => ({ ...prev, subject: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium">Message</label>
              <Textarea
                placeholder="Type your message..."
                value={newConversationData.message}
                onChange={(e) =>
                  setNewConversationData(prev => ({ ...prev, message: e.target.value }))
                }
                rows={4}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowNewConversationDialog(false)}>
                Cancel
              </Button>
              <Button onClick={startNewConversation} disabled={sending}>
                {sending ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                ) : (
                  'Start Conversation'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
