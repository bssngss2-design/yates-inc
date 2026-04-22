'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Message, Conversation, MailContextType } from '@/types';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';

const MailContext = createContext<MailContextType | undefined>(undefined);

export function MailProvider({ children }: { children: React.ReactNode }) {
  const { employee } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  
  // Get current user (employee or client from localStorage)
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; mail_handle?: string } | null>(null);

  useEffect(() => {
    if (employee) {
      setCurrentUser(employee);
    } else {
      // Check if client is logged in via localStorage
      const checkClient = () => {
        const savedClient = localStorage.getItem('yates-client');
        if (savedClient) {
          const client = JSON.parse(savedClient);
          setCurrentUser({ id: client.id, name: client.username, mail_handle: client.mail_handle });
        } else {
          setCurrentUser(null);
        }
      };
      
      checkClient();
      
      // Listen for localStorage changes (when client registers)
      window.addEventListener('storage', checkClient);
      
      // Also check periodically in case localStorage changed in same tab
      const interval = setInterval(checkClient, 500);
      
      return () => {
        window.removeEventListener('storage', checkClient);
        clearInterval(interval);
      };
    }
  }, [employee]);

  useEffect(() => {
    if (currentUser) {
      fetchConversations();
      
      // Set up real-time subscription for new messages
      const channel = supabase
        .channel('messages')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'messages',
          },
          () => {
            fetchConversations();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [currentUser]);

  // Update browser tab title when there are unread messages
  useEffect(() => {
    const baseTitle = 'Yates Co.';
    if (unreadCount > 0) {
      document.title = `(${unreadCount}) ${baseTitle}`;
    } else {
      document.title = baseTitle;
    }
  }, [unreadCount]);

  const fetchConversations = async () => {
    if (!currentUser) return;

    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .contains('participants', [currentUser.id])
      .order('last_message_at', { ascending: false });

    if (data) {
      setConversations(data);
      
      // Calculate total unread count for current user
      const total = data.reduce((acc, conv) => {
        const unreadForUser = conv.unread_for?.[currentUser.id] || 0;
        return acc + unreadForUser;
      }, 0);
      setUnreadCount(total);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (data) {
      setMessages(data);
    }
  };

  const sendMessage = async (conversationId: string, content: string, senderId: string) => {
    if (!currentUser) return;

    // Insert message
    const { error: messageError } = await supabase.from('messages').insert([
      {
        conversation_id: conversationId,
        sender_id: senderId,
        sender_name: currentUser.name,
        sender_mail: currentUser.mail_handle || `${currentUser.name.toLowerCase()}.mail`,
        content,
        is_read: false,
      },
    ]);

    if (!messageError) {
      // Update conversation's last message
      const conv = conversations.find((c) => c.id === conversationId);
      if (conv) {
        const unreadFor: Record<string, number> = {};
        
        // Increment unread count for all participants except sender
        conv.participants.forEach((participantId) => {
          if (participantId !== senderId) {
            const currentUnread = (conv.unread_for?.[participantId] || 0);
            unreadFor[participantId] = currentUnread + 1;
          } else {
            unreadFor[participantId] = 0;
          }
        });

        await supabase
          .from('conversations')
          .update({
            last_message: content,
            last_message_at: new Date().toISOString(),
            unread_for: unreadFor,
          })
          .eq('id', conversationId);
      }

      fetchMessages(conversationId);
      fetchConversations();
    }
  };

  const createConversation = async (
    subject: string,
    participantIds: string[],
    initialMessage: string,
    senderId: string,
    priority: 'normal' | 'high' = 'normal'
  ): Promise<string> => {
    if (!currentUser) {
      console.error('No user logged in');
      return '';
    }

    console.log('Creating conversation with participants:', participantIds);

    // Get all participant info - could be employees OR clients
    // First try employees
    const { data: employeeData } = await supabase
      .from('employees')
      .select('id, name, mail_handle')
      .in('id', participantIds);

    // Then try clients for any IDs not found in employees
    const employeeIds = employeeData?.map((e) => e.id) || [];
    const clientIds = participantIds.filter((id) => !employeeIds.includes(id));
    
    let clientData: any[] = [];
    if (clientIds.length > 0) {
      const { data } = await supabase
        .from('clients')
        .select('id, username as name, mail_handle')
        .in('id', clientIds);
      clientData = data || [];
    }

    const participantData = [...(employeeData || []), ...clientData];

    if (!participantData || participantData.length === 0) {
      console.error('No participant data returned');
      return '';
    }

    const participantNames = participantData.map((p) => p.name);
    const participantMails = participantData.map(
      (p) => p.mail_handle || `${p.name.toLowerCase()}.mail`
    );

    // Set up unread counts - everyone except sender has 1 unread
    const unreadFor: Record<string, number> = {};
    participantIds.forEach((id) => {
      unreadFor[id] = id === senderId ? 0 : 1;
    });

    // Create conversation
    const { data: convData, error: convError } = await supabase
      .from('conversations')
      .insert([
        {
          subject,
          participants: participantIds,
          participant_names: participantNames,
          participant_mails: participantMails,
          last_message: initialMessage,
          last_message_at: new Date().toISOString(),
          unread_for: unreadFor,
          priority,
        },
      ])
      .select()
      .single();

    if (convError) {
      console.error('Error creating conversation:', convError);
      alert('Database error: ' + convError.message + '\n\nDid you run the SQL setup from INBOX_COMPLETE_SQL.sql?');
      return '';
    }

    if (!convData) {
      console.error('No conversation data returned');
      return '';
    }

    console.log('Conversation created:', convData);

    // Create initial message
    const { data: messageData, error: messageError } = await supabase.from('messages').insert([
      {
        conversation_id: convData.id,
        sender_id: senderId,
        sender_name: currentUser.name,
        sender_mail: currentUser.mail_handle || `${currentUser.name.toLowerCase()}.mail`,
        content: initialMessage,
        is_read: false,
      },
    ]).select();

    if (messageError) {
      console.error('Error creating message:', messageError);
      console.error('Message error details:', JSON.stringify(messageError, null, 2));
      alert('Message creation failed: ' + messageError.message + '\n\nMake sure all tables are set up properly!');
      // Conversation was created but message failed - still return the ID
    } else {
      console.log('Message created successfully:', messageData);
    }

    fetchConversations();
    console.log('Conversation and message created successfully');
    return convData.id;
  };

  const markAsRead = async (conversationId: string, employeeId: string) => {
    const conv = conversations.find((c) => c.id === conversationId);
    if (!conv) return;

    const unreadFor = { ...conv.unread_for };
    unreadFor[employeeId] = 0;

    await supabase
      .from('conversations')
      .update({ unread_for: unreadFor })
      .eq('id', conversationId);

    // Mark all messages in this conversation as read for this user
    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('conversation_id', conversationId)
      .neq('sender_id', employeeId);

    fetchConversations();
  };

  const deleteConversation = async (conversationId: string, userId: string): Promise<boolean> => {
    const conv = conversations.find((c) => c.id === conversationId);
    if (!conv) return false;

    // Only the creator (first participant) can delete the conversation
    const creatorId = conv.participants[0];
    if (creatorId !== userId) {
      console.error('Only the creator can delete this conversation');
      return false;
    }

    try {
      // Delete all messages in the conversation first
      await supabase
        .from('messages')
        .delete()
        .eq('conversation_id', conversationId);

      // Then delete the conversation
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', conversationId);

      if (error) {
        console.error('Error deleting conversation:', error);
        return false;
      }

      fetchConversations();
      return true;
    } catch (err) {
      console.error('Error deleting conversation:', err);
      return false;
    }
  };

  return (
    <MailContext.Provider
      value={{
        conversations,
        messages,
        unreadCount,
        fetchConversations,
        fetchMessages,
        sendMessage,
        createConversation,
        markAsRead,
        deleteConversation,
      }}
    >
      {children}
    </MailContext.Provider>
  );
}

export function useMail() {
  const context = useContext(MailContext);
  if (context === undefined) {
    throw new Error('useMail must be used within a MailProvider');
  }
  return context;
}

