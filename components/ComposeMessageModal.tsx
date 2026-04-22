'use client';

import { useState, useEffect } from 'react';
import { useMail } from '@/contexts/MailContext';
import { useAuth } from '@/contexts/AuthContext';
import { useClient } from '@/contexts/ClientContext';
import { supabase } from '@/lib/supabase';

interface ComposeMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ClientRecord {
  id: string;
  username: string;
  mail_handle: string;
}

const EMPLOYEES = [
  { id: '000001', name: 'Logan Wall Fencer', mail: 'ceorequest.mail' },
  { id: '123456', name: 'Bernardo', mail: 'partnershiprqs.mail' },
  { id: '007411', name: 'Dylan Mad Hawk', mail: 'custumerspp.mail' },
  { id: '674121', name: 'Harris', mail: 'supplychainH.mail' },
  { id: '319736', name: 'Wyatt', mail: 'legal.mail' },
  { id: '010101', name: 'Suhas', mail: 'bugs.mail' },
];

type RecipientType = 'employees' | 'clients' | 'broadcast';

const BERNARDO_ID = '123456';

export default function ComposeMessageModal({ isOpen, onClose }: ComposeMessageModalProps) {
  const { createConversation, fetchConversations } = useMail();
  const { employee } = useAuth();
  const { client, setClient } = useClient();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [recipientType, setRecipientType] = useState<RecipientType>('employees');
  const [clientsList, setClientsList] = useState<ClientRecord[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [isPurging, setIsPurging] = useState(false);

  // Force refresh client from localStorage when modal opens
  useEffect(() => {
    if (isOpen && !employee) {
      const savedClient = localStorage.getItem('yates-client');
      if (savedClient && !client) {
        setClient(JSON.parse(savedClient));
      }
    }
  }, [isOpen, employee, client, setClient]);

  // Load clients list for employees
  useEffect(() => {
    async function loadClients() {
      if (!employee || !isOpen) return;
      
      setLoadingClients(true);
      console.log('📧 Loading clients for compose modal...');
      try {
        const { data, error } = await supabase
          .from('clients')
          .select('id, username, mail_handle')
          .order('username');
        
        if (error) {
          console.error('❌ Error loading clients:', error.message, error.details);
          throw error;
        }
        console.log(`✅ Loaded ${data?.length || 0} clients`);
        setClientsList(data || []);
      } catch (err) {
        console.error('❌ Exception loading clients:', err);
        setClientsList([]);
      } finally {
        setLoadingClients(false);
      }
    }
    
    // Broadcast mode also needs the full client list so we can blast them
    if (recipientType === 'clients' || recipientType === 'broadcast') {
      loadClients();
    }
  }, [employee, isOpen, recipientType]);

  // Reset recipients and search when switching type
  useEffect(() => {
    setSelectedRecipients([]);
    setClientSearch('');
  }, [recipientType]);

  const currentUser = employee || client;
  if (!isOpen || !currentUser) return null;

  // If client, show all employees. If employee, show other employees OR clients
  const currentUserId = employee?.id || client?.id;
  const availableEmployees = EMPLOYEES.filter((e) => e.id !== currentUserId);
  const isEmployeeUser = !!employee;
  const isBernardo = employee?.id === BERNARDO_ID;
  const broadcastEmployeeIds = EMPLOYEES
    .filter((e) => e.id !== BERNARDO_ID)
    .map((e) => e.id);
  const broadcastClientIds = clientsList.map((c) => c.id);
  const broadcastTotal = broadcastEmployeeIds.length + broadcastClientIds.length;

  const toggleRecipient = (employeeId: string) => {
    if (selectedRecipients.includes(employeeId)) {
      setSelectedRecipients(selectedRecipients.filter((id) => id !== employeeId));
    } else {
      setSelectedRecipients([...selectedRecipients, employeeId]);
    }
  };

  const handlePurgeBroadcasts = async () => {
    if (!isBernardo) {
      alert('Only Bernardo can purge broadcasts.');
      return;
    }

    setIsPurging(true);
    try {
      // Grab every high-priority conversation where Bernardo is the creator
      // (createConversation puts the sender at participants[0]).
      const { data: convs, error: fetchErr } = await supabase
        .from('conversations')
        .select('id, subject, participants')
        .eq('priority', 'high')
        .contains('participants', [BERNARDO_ID]);

      if (fetchErr) {
        console.error('Failed to fetch broadcasts:', fetchErr);
        alert('Could not fetch broadcasts: ' + fetchErr.message);
        return;
      }

      const mine = (convs || []).filter((c) => c.participants?.[0] === BERNARDO_ID);

      if (mine.length === 0) {
        alert('No high-priority broadcasts from you to purge. Inbox is clean.');
        return;
      }

      const ok = confirm(
        `🗑 Delete ${mine.length} high-priority broadcast thread${mine.length === 1 ? '' : 's'} you sent?\n\n` +
          `This wipes the threads + all messages for everyone. No undo.`,
      );
      if (!ok) return;

      const ids = mine.map((c) => c.id);

      const { error: msgErr } = await supabase
        .from('messages')
        .delete()
        .in('conversation_id', ids);
      if (msgErr) {
        console.error('Failed to delete broadcast messages:', msgErr);
        alert('Failed deleting messages: ' + msgErr.message);
        return;
      }

      const { error: convErr } = await supabase
        .from('conversations')
        .delete()
        .in('id', ids);
      if (convErr) {
        console.error('Failed to delete broadcast conversations:', convErr);
        alert('Failed deleting conversations: ' + convErr.message);
        return;
      }

      await fetchConversations();
      alert(`✅ Nuked ${mine.length} broadcast${mine.length === 1 ? '' : 's'}.`);
    } catch (err) {
      console.error('Purge error:', err);
      alert('Purge error. Check console.');
    } finally {
      setIsPurging(false);
    }
  };

  const handleSend = async () => {
    const userId = employee?.id || client?.id || '';

    // ===== Broadcast branch: Bernardo-only =====
    if (recipientType === 'broadcast') {
      if (!isBernardo) {
        alert('Broadcast is restricted to Bernardo (ID 123456).');
        return;
      }
      if (!subject.trim() || !message.trim()) {
        alert('Please fill in subject and message');
        return;
      }

      const allRecipients = [...broadcastEmployeeIds, ...broadcastClientIds];
      if (allRecipients.length === 0) {
        alert('No recipients found to broadcast to.');
        return;
      }

      const ok = confirm(
        `📢 Broadcast "${subject.trim()}" to ${allRecipients.length} people (` +
          `${broadcastEmployeeIds.length} employees + ${broadcastClientIds.length} clients)?\n\n` +
          `This creates ONE shared thread with everyone in it. Any reply is visible to all participants. Cannot be undone.`,
      );
      if (!ok) return;

      setIsSending(true);
      try {
        const participants = [userId, ...allRecipients];
        const convId = await createConversation(
          subject.trim(),
          participants,
          message.trim(),
          userId,
          'high',
        );

        if (convId) {
          setSubject('');
          setMessage('');
          setSelectedRecipients([]);
          onClose();
          alert(`✅ Broadcast sent to ${allRecipients.length} recipients in one shared thread.`);
        } else {
          alert('Broadcast failed. Check the console — likely a Supabase / SQL setup issue.');
        }
      } catch (err) {
        console.error('Broadcast error:', err);
        alert('Broadcast error. Check console for details.');
      } finally {
        setIsSending(false);
      }
      return;
    }

    // ===== Normal (targeted) branch =====
    if (!subject.trim() || !message.trim() || selectedRecipients.length === 0) {
      alert('Please fill in all fields and select at least one recipient');
      return;
    }

    setIsSending(true);

    try {
      const participants = [userId, ...selectedRecipients];
      
      console.log('Sending message:', { subject, participants, message });
      const convId = await createConversation(subject, participants, message, userId, 'normal');
      console.log('Message sent! Conversation ID:', convId);
      
      if (convId) {
        setSubject('');
        setMessage('');
        setSelectedRecipients([]);
        onClose();
        alert('Message sent successfully!');
      } else {
        alert('Failed to send message. Make sure you ran the SQL setup in Supabase!');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Error sending message. Check console for details.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-gradient-to-r from-black/90 via-black/60 to-black/30 z-[70]"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-white dark:bg-gray-800 rounded-lg shadow-2xl z-[80] max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Compose New Message</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl"
            >
              ✕
            </button>
          </div>

          {/* Recipients */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              To:
            </label>
            
            {/* Recipient Type Toggle (only for employees) */}
            {isEmployeeUser && (
              <div className="flex gap-2 mb-3 flex-wrap">
                <button
                  onClick={() => setRecipientType('employees')}
                  className={`flex-1 min-w-[120px] py-2 px-3 rounded-lg text-sm font-medium transition ${
                    recipientType === 'employees'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  👔 Employees
                </button>
                <button
                  onClick={() => setRecipientType('clients')}
                  className={`flex-1 min-w-[120px] py-2 px-3 rounded-lg text-sm font-medium transition ${
                    recipientType === 'clients'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  👤 Clients
                </button>
                {isBernardo && (
                  <button
                    onClick={() => setRecipientType('broadcast')}
                    className={`flex-1 min-w-[140px] py-2 px-3 rounded-lg text-sm font-bold transition border-2 ${
                      recipientType === 'broadcast'
                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white border-purple-700 shadow-lg'
                        : 'bg-gray-200 dark:bg-gray-700 text-purple-700 dark:text-purple-300 border-transparent hover:border-purple-500'
                    }`}
                    title="Send to every employee and every client (Bernardo only)"
                  >
                    📢 Broadcast
                  </button>
                )}
              </div>
            )}
            
            {/* Selected Recipients as Pills */}
            {recipientType !== 'broadcast' && selectedRecipients.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {selectedRecipients.map((id) => {
                  const emp = EMPLOYEES.find((e) => e.id === id);
                  const clientRec = clientsList.find((c) => c.id === id);
                  const name = emp?.name || clientRec?.username || 'Unknown';
                  const isClient = !emp && !!clientRec;
                  
                  return (
                    <div
                      key={id}
                      className={`flex items-center gap-2 px-3 py-1 rounded-full ${
                        isClient 
                          ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                          : 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                      }`}
                    >
                      <span className="text-sm font-medium">{isClient ? '👤' : '👔'} {name}</span>
                      <button
                        onClick={() => toggleRecipient(id)}
                        className="hover:text-red-600"
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Available Recipients as Cards */}
            {recipientType === 'employees' && (
              <div className="grid grid-cols-2 gap-2">
                {availableEmployees.map((emp) => (
                  <button
                    key={emp.id}
                    onClick={() => toggleRecipient(emp.id)}
                    className={`p-3 border-2 rounded-lg text-left transition ${
                      selectedRecipients.includes(emp.id)
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                        : 'border-gray-300 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-700'
                    }`}
                  >
                    <div className="font-medium text-gray-900 dark:text-white text-sm">
                      {emp.name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{emp.mail}</div>
                  </button>
                ))}
              </div>
            )}
            
            {/* Broadcast Preview (Bernardo only) */}
            {recipientType === 'broadcast' && isBernardo && (
              <div className="border-2 border-purple-500 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">📢</span>
                  <div>
                    <div className="font-black text-purple-900 dark:text-purple-200 text-base">
                      Broadcast to everyone
                    </div>
                    <div className="text-[11px] text-purple-700 dark:text-purple-300">
                      One shared thread with every employee + every client. Replies are visible to all participants.
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-3">
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-2 text-center border border-purple-200 dark:border-purple-800">
                    <div className="text-xl font-black text-purple-700 dark:text-purple-300">
                      {broadcastEmployeeIds.length}
                    </div>
                    <div className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">
                      Employees
                    </div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-2 text-center border border-purple-200 dark:border-purple-800">
                    <div className="text-xl font-black text-purple-700 dark:text-purple-300">
                      {loadingClients ? '…' : broadcastClientIds.length}
                    </div>
                    <div className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">
                      Clients
                    </div>
                  </div>
                  <div className="bg-purple-600 text-white rounded-lg p-2 text-center">
                    <div className="text-xl font-black">
                      {loadingClients ? '…' : broadcastTotal}
                    </div>
                    <div className="text-[10px] uppercase tracking-wider font-bold opacity-90">
                      Total
                    </div>
                  </div>
                </div>
                <div className="mt-3 text-[11px] text-purple-800 dark:text-purple-200 italic">
                  Sent as <span className="font-bold">high priority</span>. There's no undo — pick your words.
                </div>
                <button
                  type="button"
                  onClick={handlePurgeBroadcasts}
                  disabled={isPurging || isSending}
                  className={`mt-3 w-full py-2 rounded-lg text-sm font-bold border-2 transition ${
                    isPurging || isSending
                      ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 border-gray-400 cursor-not-allowed'
                      : 'bg-red-600 hover:bg-red-700 text-white border-red-800 shadow'
                  }`}
                  title="Delete every high-priority broadcast you've sent"
                >
                  {isPurging ? 'Nuking broadcasts…' : '🗑 Delete all my broadcasts'}
                </button>
              </div>
            )}

            {/* Clients List (only for employees) */}
            {recipientType === 'clients' && isEmployeeUser && (
              <div>
                {/* Search input */}
                <input
                  type="text"
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  placeholder="Search by username..."
                  className="w-full border dark:border-gray-600 rounded-lg px-4 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                />
                <div className="max-h-48 overflow-y-auto">
                  {loadingClients ? (
                    <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                      Loading clients...
                    </div>
                  ) : clientsList.length === 0 ? (
                    <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                      No clients found. Make sure clients have signed up!
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-2">
                      {clientsList
                        .filter(c => 
                          clientSearch === '' || 
                          c.username.toLowerCase().includes(clientSearch.toLowerCase()) ||
                          c.mail_handle.toLowerCase().includes(clientSearch.toLowerCase())
                        )
                        .map((clientRec) => (
                          <button
                            key={clientRec.id}
                            onClick={() => toggleRecipient(clientRec.id)}
                            className={`p-3 border-2 rounded-lg text-left transition ${
                              selectedRecipients.includes(clientRec.id)
                                ? 'border-green-500 bg-green-50 dark:bg-green-900/30'
                                : 'border-gray-300 dark:border-gray-600 hover:border-green-300 dark:hover:border-green-700'
                            }`}
                          >
                            <div className="font-medium text-gray-900 dark:text-white text-sm">
                              👤 {clientRec.username}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">@{clientRec.mail_handle}</div>
                          </button>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Subject */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Subject:
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Enter subject..."
              className="w-full border dark:border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Message */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Message:
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message..."
              rows={8}
              className="w-full border dark:border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={isSending}
              className={`px-6 py-2 text-white rounded-lg disabled:bg-gray-400 disabled:cursor-not-allowed font-bold ${
                recipientType === 'broadcast'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isSending
                ? recipientType === 'broadcast'
                  ? 'Broadcasting...'
                  : 'Sending...'
                : recipientType === 'broadcast'
                  ? `📢 Broadcast to ${broadcastTotal || '…'}`
                  : 'Send Message'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

