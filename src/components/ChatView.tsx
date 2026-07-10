import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, 
  ArrowLeft, 
  Send, 
  Paperclip, 
  Smile, 
  MessageSquare, 
  User, 
  Users,
  Bell,
  Search,
  Check, 
  CheckCheck,
  Zap,
  PhoneCall
} from 'lucide-react';
import { 
  fetchContacts, 
  fetchFriendRequests, 
  fetchAllUsers, 
  sendFriendRequest, 
  acceptFriendRequest, 
  rejectFriendRequest, 
  Profile,
  getLocalMessages,
  sendLocalMessage,
  Message
} from '../lib/chat';
import { supabase } from '../lib/supabase';

interface ChatViewProps {
  userId: string;
  activeContactId?: string | null;
  setActiveContactId?: (id: string | null) => void;
  key?: string;
}

export function ChatView({ userId, activeContactId: propActiveContactId, setActiveContactId: propSetActiveContactId }: ChatViewProps) {
  const [internalActiveContactId, setInternalActiveContactId] = useState<string | null>(null);
  const activeContactId = propActiveContactId !== undefined ? propActiveContactId : internalActiveContactId;
  const setActiveContactId = propSetActiveContactId || setInternalActiveContactId;

  const [subTab, setSubTab] = useState<'Chats' | 'Contacts' | 'Requests' | 'Discover'>('Chats');
  const [contacts, setContacts] = useState<any[]>([]);
  const [activeProfile, setActiveProfile] = useState<any>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [showProfileDetails, setShowProfileDetails] = useState<Profile | null>(null);

  useEffect(() => {
    const interval = setInterval(() => setLastActivity(Date.now()), 2000);
    return () => clearInterval(interval);
  }, []);
  
  // Message input state
  const [messageText, setMessageText] = useState('');
  const [activeMessages, setActiveMessages] = useState<Message[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      if (subTab === 'Contacts' || subTab === 'Chats') {
        const data = await fetchContacts(userId);
        setContacts(data || []);
      } else if (subTab === 'Requests') {
        const data = await fetchFriendRequests(userId);
        setRequests(data || []);
      } else if (subTab === 'Discover') {
        const data = await fetchAllUsers(userId);
        setUsers(data || []);
      }
    } catch (e: any) {
      console.error('Detailed Error loading data:', {
        message: e?.message || 'Unknown error',
        code: e?.code || 'N/A',
        details: e?.details || '',
        hint: e?.hint || '',
        fullError: e
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Poll for data to keep lists fresh (new friends, new requests, status changes)
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [subTab, userId]);

  // Sync active profile when contacts or activeContactId change
  useEffect(() => {
    if (!activeContactId) {
      setActiveProfile(null);
      return;
    }

    const found = contacts.find(c => c.friend_id === activeContactId);
    if (found) {
      setActiveProfile(found.profiles);
    } else {
      // If not in contacts yet (e.g. newly added), try to fetch it
      const fetchNewProfile = async () => {
        try {
          const { data } = await supabase
            .from('profiles')
            .select('id, name, email, status')
            .eq('id', activeContactId)
            .single();
          
          if (data) {
            setActiveProfile(data);
          } else {
            // Fallback for mock users
            setActiveProfile({
              id: activeContactId,
              name: activeContactId.startsWith('user-') ? activeContactId.replace('user-', '').split('-')[0].charAt(0).toUpperCase() + activeContactId.replace('user-', '').split('-')[0].slice(1) : 'User',
              email: `${activeContactId.substring(0, 5)}@example.com`,
              status: 'Active'
            });
          }
        } catch (e) {
          console.warn('Could not fetch active profile, using fallback:', e);
          setActiveProfile({
            id: activeContactId,
            name: 'User',
            status: 'Active'
          });
        }
      };
      fetchNewProfile();
    }
  }, [activeContactId, contacts]);

  // Handle active message loading & polling
  useEffect(() => {
    if (!activeContactId) {
      setActiveMessages([]);
      return;
    }

    // Initial load
    const loadMessages = () => {
      const msgs = getLocalMessages(userId, activeContactId);
      setActiveMessages(msgs);
    };

    loadMessages();

    // Poll every 1 second for live feeling
    const interval = setInterval(loadMessages, 1000);
    return () => clearInterval(interval);
  }, [activeContactId, userId]);

  // Scroll to bottom whenever messages list updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeMessages]);

  const handleSendMessage = (textToSend?: string) => {
    const text = textToSend !== undefined ? textToSend : messageText;
    if (!text.trim() || !activeContactId) return;

    sendLocalMessage(userId, activeContactId, text.trim());
    if (textToSend === undefined) {
      setMessageText('');
    }
    
    // Instantly append to messages for snappy visual update
    const updated = getLocalMessages(userId, activeContactId);
    setActiveMessages(updated);
  };

  const handleAccept = async (requestId: string, senderId: string) => {
    try {
      await acceptFriendRequest(requestId, senderId, userId);
      loadData();
    } catch (e: any) {
      console.error('Detailed Error accepting friend request:', {
        message: e?.message || 'Unknown error',
        code: e?.code || 'N/A',
        details: e?.details || '',
        hint: e?.hint || '',
        fullError: e
      });
    }
  };

  const handleReject = async (requestId: string) => {
    try {
      await rejectFriendRequest(requestId);
      loadData();
    } catch (e: any) {
      console.error('Detailed Error rejecting friend request:', {
        message: e?.message || 'Unknown error',
        code: e?.code || 'N/A',
        details: e?.details || '',
        hint: e?.hint || '',
        fullError: e
      });
    }
  };

  const handleSendRequest = async (receiverId: string) => {
    try {
      await sendFriendRequest(userId, receiverId);
      loadData();
    } catch (e: any) {
      console.error('Detailed Error sending friend request:', {
        message: e?.message || 'Unknown error',
        code: e?.code || 'N/A',
        details: e?.details || '',
        hint: e?.hint || '',
        fullError: e
      });
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 h-full">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-1 grid grid-cols-1 md:grid-cols-3 bg-white overflow-hidden h-full min-h-0"
      >
        {/* LEFT COLUMN: CONTACTS LIST & REQUESTS & DISCOVER */}
      <div className={`flex flex-col h-full border-r border-gray-100 bg-gray-50/20 ${activeContactId ? 'hidden md:flex' : 'flex'}`}>
        {/* Navigation Sub-Tabs */}
        <div className="flex border-b border-gray-100 bg-gray-50/50">
          {(['Chats', 'Contacts', 'Requests', 'Discover'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setSubTab(tab);
                setActiveContactId(null); // Clear selected conversation when moving tabs
              }}
              className={`flex-1 p-3.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider transition-all relative flex flex-col items-center justify-center gap-1 ${
                subTab === tab 
                  ? 'text-indigo-600 border-b-2 border-indigo-600 bg-white' 
                  : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              {tab === 'Chats' && <MessageSquare className="w-4 h-4" />}
              {tab === 'Contacts' && <Users className="w-4 h-4" />}
              {tab === 'Requests' && <Bell className="w-4 h-4" />}
              {tab === 'Discover' && <Search className="w-4 h-4" />}
              
              <span className="mt-0.5">{tab}</span>
              
              {tab === 'Requests' && requests.length > 0 && (
                <span className="absolute top-2 right-2 bg-rose-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold">
                  {requests.length}
                </span>
              )}
            </button>
          ))}
        </div>
        
        {/* Scrollable Container */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading && (
            <div className="flex flex-col items-center justify-center h-48 space-y-2">
              <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-indigo-600"></div>
              <p className="text-xs text-gray-400">Loading connections...</p>
            </div>
          )}
          
          {!loading && subTab === 'Chats' && (
            <div className="space-y-2.5">
              {contacts
                .map(c => ({
                  ...c,
                  latestMsg: getLocalMessages(userId, c.friend_id).pop()
                }))
                .filter(c => c.latestMsg !== undefined) // Only show active chats in 'Chats' tab
                .sort((a, b) => {
                  const timeA = a.latestMsg ? new Date(a.latestMsg.created_at).getTime() : 0;
                  const timeB = b.latestMsg ? new Date(b.latestMsg.created_at).getTime() : 0;
                  return timeB - timeA;
                })
                .map((c) => {
                  const isSelected = c.friend_id === activeContactId;
                  const latestMsg = c.latestMsg;
                  const isIncoming = latestMsg && latestMsg.sender_id !== userId;
                  
                  return (
                    <button
                      key={c.friend_id}
                      onClick={() => setActiveContactId(c.friend_id)}
                      className={`w-full text-left p-3.5 rounded-xl transition-all flex items-center justify-between border ${
                        isSelected 
                          ? 'bg-indigo-50 border-indigo-200 shadow-sm' 
                          : 'bg-white hover:bg-gray-50 border-gray-100'
                      }`}
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        {c.profiles?.avatar_url ? (
                          <img 
                            src={c.profiles.avatar_url} 
                            alt={c.profiles.name} 
                            className="w-10 h-10 rounded-full object-cover border border-indigo-50"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm shrink-0 border border-indigo-50">
                            {c.profiles?.name?.charAt(0).toUpperCase() || 'U'}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center space-x-1.5">
                            <p className={`font-bold text-xs sm:text-sm truncate ${isSelected ? 'text-indigo-900' : 'text-gray-900'}`}>
                              {c.profiles?.name || 'User'}
                            </p>
                            {c.profiles?.status === 'Verified' && (
                              <span className="inline-flex items-center shrink-0">
                                <ShieldCheck className="w-3.5 h-3.5 text-green-600 fill-green-50" />
                              </span>
                            )}
                          </div>
                          <p className={`text-[11px] truncate mt-0.5 ${latestMsg ? (isSelected ? 'text-indigo-600' : 'text-gray-500') : 'text-gray-400'}`}>
                            {latestMsg ? (
                              <>
                                <span className="font-semibold text-[10px] uppercase tracking-wider mr-1">
                                  {isIncoming ? 'Them:' : 'You:'}
                                </span>
                                {latestMsg.content}
                              </>
                            ) : (
                              c.profiles?.email || 'Active connection'
                            )}
                          </p>
                        </div>
                      </div>
                      {latestMsg && (
                        <div className="flex flex-col items-end space-y-1.5 shrink-0 ml-2">
                          <span className="text-[9px] text-gray-400 font-bold uppercase whitespace-nowrap">
                            {new Date(latestMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {!isSelected && isIncoming && (
                            <div className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse shadow-sm shadow-indigo-200" />
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              {contacts.filter(c => getLocalMessages(userId, c.friend_id).length > 0).length === 0 && (
                <div className="text-center py-12">
                  <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                    <MessageSquare className="w-6 h-6 text-gray-300" />
                  </div>
                  <p className="text-gray-400 text-xs sm:text-sm mb-3">No active chats.</p>
                  <button onClick={() => setSubTab('Contacts')} className="text-indigo-600 text-xs font-bold hover:underline uppercase tracking-wider">
                    Browse Contacts
                  </button>
                </div>
              )}
            </div>
          )}

          {!loading && subTab === 'Contacts' && (
            <div className="space-y-2.5">
              {contacts.map((c) => {
                const isSelected = c.friend_id === activeContactId;
                return (
                  <button
                    key={c.friend_id}
                    onClick={() => setActiveContactId(c.friend_id)}
                    className={`w-full text-left p-3.5 rounded-xl transition-all flex items-center justify-between border ${
                      isSelected 
                        ? 'bg-indigo-50 border-indigo-200 shadow-sm' 
                        : 'bg-white hover:bg-gray-50 border-gray-100'
                    }`}
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      {c.profiles?.avatar_url ? (
                        <img 
                          src={c.profiles.avatar_url} 
                          alt={c.profiles.name} 
                          className="w-10 h-10 rounded-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-100 text-gray-700 flex items-center justify-center font-bold text-sm shrink-0">
                          {c.profiles?.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center space-x-1.5">
                          <p className={`font-bold text-xs sm:text-sm truncate ${isSelected ? 'text-indigo-900' : 'text-gray-900'}`}>
                            {c.profiles?.name || 'User'}
                          </p>
                          {c.profiles?.status === 'Verified' && (
                            <span className="inline-flex items-center shrink-0">
                              <ShieldCheck className="w-3.5 h-3.5 text-green-600 fill-green-50" />
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-400 truncate mt-0.5">
                          {c.profiles?.email || 'Active connection'}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
              {contacts.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-400 text-xs sm:text-sm mb-3">No contacts yet.</p>
                  <button onClick={() => setSubTab('Discover')} className="text-indigo-600 text-xs sm:text-sm font-semibold hover:underline">
                    Find new connections
                  </button>
                </div>
              )}
            </div>
          )}

          {!loading && subTab === 'Requests' && (
            <div className="space-y-2.5">
              {requests.map((r) => (
                <div key={r.id} className="p-3.5 bg-white rounded-xl flex flex-col space-y-3 border border-gray-100 shadow-sm">
                  <div className="flex items-center space-x-2.5">
                    {r.profiles?.avatar_url ? (
                      <img 
                        src={r.profiles.avatar_url} 
                        alt={r.profiles.name} 
                        className="w-9 h-9 rounded-full object-cover shrink-0"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-bold text-xs shrink-0">
                        {r.profiles?.name?.charAt(0).toUpperCase() || 'R'}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-semibold text-xs sm:text-sm text-gray-900 truncate">{r.profiles?.name || 'Incoming Friend Request'}</p>
                      <p className="text-[10px] text-gray-400 truncate">{r.profiles?.email}</p>
                    </div>
                  </div>
                  <div className="flex space-x-2 w-full pt-1">
                    <button 
                      onClick={() => handleAccept(r.id, r.sender_id)}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-1.5 rounded-lg text-xs transition-colors shadow-sm"
                    >
                      Accept
                    </button>
                    <button 
                      onClick={() => handleReject(r.id)}
                      className="flex-1 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 font-semibold py-1.5 rounded-lg text-xs transition-colors"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
              {requests.length === 0 && (
                <div className="text-center py-12 text-gray-400 text-xs sm:text-sm">
                  No pending friend requests.
                </div>
              )}
            </div>
          )}

          {!loading && subTab === 'Discover' && (
            <div className="space-y-2.5">
              {users.map((u) => (
                <div key={u.id} className="p-3.5 bg-white rounded-xl flex items-center justify-between border border-gray-100 shadow-sm">
                  <div className="flex items-center space-x-2.5 min-w-0">
                    {u.avatar_url ? (
                      <img 
                        src={u.avatar_url} 
                        alt={u.name} 
                        className="w-9 h-9 rounded-full object-cover shrink-0 cursor-pointer"
                        referrerPolicy="no-referrer"
                        onClick={() => setShowProfileDetails(u)}
                      />
                    ) : (
                      <div 
                        className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0 cursor-pointer"
                        onClick={() => setShowProfileDetails(u)}
                      >
                        {u.name?.charAt(0).toUpperCase() || 'U'}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center space-x-1.5 flex-wrap gap-y-0.5">
                        <p 
                          className="font-semibold text-xs sm:text-sm text-gray-900 truncate cursor-pointer hover:text-indigo-600"
                          onClick={() => setShowProfileDetails(u)}
                        >
                          {u.name || 'User'}
                        </p>
                        {u.status === 'Verified' ? (
                          <span className="inline-flex items-center space-x-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 shrink-0" title="Verified Member">
                            <ShieldCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                            <span>Verified</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-50/70 text-amber-700 border border-amber-100 shrink-0" title="Unverified Member">
                            <span>Unverified</span>
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-gray-400 truncate mt-0.5">{u.email}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleSendRequest(u.id)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-3 py-1.5 rounded-lg text-xs transition-colors shadow-sm shrink-0"
                  >
                    Add Friend
                  </button>
                </div>
              ))}
              {users.length === 0 && (
                <div className="text-center py-12 text-gray-400 text-xs sm:text-sm">
                  Everyone is already connected or requested!
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: ACTIVE CONVERSATION */}
      <div className={`col-span-2 flex flex-col h-full bg-white relative ${activeContactId ? 'flex' : 'hidden md:flex'}`}>
        {activeProfile ? (
          <>
            {/* Conversation Header */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-100 bg-white">
              <div className="flex items-center space-x-3 min-w-0">
                {/* Back Button for mobile */}
                <button 
                  onClick={() => setActiveContactId(null)}
                  className="p-1 rounded-full text-gray-500 hover:bg-gray-100 md:hidden"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div 
                  className="relative cursor-pointer group"
                  onClick={() => setShowProfileDetails(activeProfile)}
                >
                  {activeProfile.avatar_url ? (
                    <img 
                      src={activeProfile.avatar_url} 
                      alt={activeProfile.name} 
                      className="w-10 h-10 rounded-full object-cover shadow-sm group-hover:ring-2 group-hover:ring-indigo-500 transition-all"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-sm group-hover:bg-indigo-700 transition-all">
                      {activeProfile.name?.charAt(0).toUpperCase() || 'C'}
                    </div>
                  )}
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                </div>
                <div 
                  className="min-w-0 cursor-pointer"
                  onClick={() => setShowProfileDetails(activeProfile)}
                >
                  <div className="flex items-center space-x-1.5">
                    <h4 className="font-bold text-sm sm:text-base text-gray-900 truncate group-hover:text-indigo-600">
                      {activeProfile.name || 'Contact'}
                    </h4>
                    {activeProfile.status === 'Verified' && (
                      <span className="inline-flex items-center">
                        <ShieldCheck className="w-4 h-4 text-green-600 fill-green-50" />
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-400 truncate">
                    {activeProfile.email || 'Active connection'}
                  </p>
                </div>
              </div>
            </div>

            {/* Conversation Messages */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-4 bg-gray-50/50">
              {activeMessages.map((msg) => {
                const isMe = msg.sender_id === userId;
                return (
                  <div key={msg.id} className="flex flex-col w-full">
                    <div 
                      className={`flex flex-col max-w-[75%] sm:max-w-[70%] space-y-1 ${
                        isMe ? 'items-end ml-auto' : 'items-start mr-auto'
                      }`}
                    >
                      {/* Message Bubble */}
                      <div 
                        className={`p-3.5 text-xs sm:text-sm shadow-sm ${
                          isMe 
                            ? 'bg-indigo-600 text-white rounded-2xl rounded-tr-none font-medium' 
                            : 'bg-white text-gray-800 rounded-2xl rounded-tl-none border border-gray-100'
                        }`}
                      >
                        {msg.content}
                      </div>
                      
                      {/* Meta */}
                      <div className="flex items-center space-x-1 text-[9px] text-gray-400 px-1">
                        <span>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {isMe && (
                          <CheckCheck className="w-3.5 h-3.5 text-indigo-500" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
              
              {activeMessages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full py-12 text-center text-gray-400 space-y-2">
                  <MessageSquare className="w-10 h-10 text-gray-300 stroke-1" />
                  <p className="text-sm font-semibold">No messages yet</p>
                  <p className="text-xs max-w-xs text-gray-400">Say hello! Type your first message below or use a quick action preset.</p>
                </div>
              )}
            </div>

            {/* Quick Action Presets */}
            <div className="px-4 py-2 border-t border-gray-100/60 bg-white flex items-center gap-2 overflow-x-auto no-scrollbar whitespace-nowrap">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Quick Reply:</span>
              <button 
                onClick={() => handleSendMessage("Is this still available?")}
                className="px-3 py-1 bg-gray-50 hover:bg-gray-100 text-[11px] text-gray-600 border border-gray-200 rounded-full font-medium transition-colors"
              >
                Is this still available?
              </button>
              <button 
                onClick={() => handleSendMessage("When are you free to meet?")}
                className="px-3 py-1 bg-gray-50 hover:bg-gray-100 text-[11px] text-gray-600 border border-gray-200 rounded-full font-medium transition-colors"
              >
                When are you free?
              </button>
              <button 
                onClick={() => handleSendMessage("Let's coordinate terms.")}
                className="px-3 py-1 bg-gray-50 hover:bg-gray-100 text-[11px] text-gray-600 border border-gray-200 rounded-full font-medium transition-colors"
              >
                Coordinate terms
              </button>
            </div>

            {/* Message Input Box inside the column */}
            <div className="p-4 bg-white border-t border-gray-100 flex items-center gap-2 shrink-0">
              <button className="text-gray-400 hover:text-gray-600 shrink-0 p-1.5 hover:bg-gray-50 rounded-lg transition-colors">
                <Paperclip className="w-5 h-5" />
              </button>
              <input
                type="text"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSendMessage();
                  }
                }}
                placeholder="Type a message..."
                className="flex-1 py-2.5 px-4 bg-gray-100 hover:bg-gray-150/50 rounded-full text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-gray-900 transition-shadow"
              />
              <button className="text-gray-400 hover:text-gray-600 shrink-0 p-1.5 hover:bg-gray-50 rounded-lg transition-colors">
                <Smile className="w-5 h-5" />
              </button>
              <button 
                onClick={() => handleSendMessage()}
                className="p-2.5 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-colors shadow-sm hover:shadow shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-gray-400 bg-gray-50/20">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <MessageSquare className="w-8 h-8 text-indigo-400" />
            </div>
            <h3 className="text-base font-bold text-gray-900">Your Conversations</h3>
            <p className="text-xs sm:text-sm text-gray-500 mt-2 max-w-sm">
              Select a contact from the list on the left to start chatting. You can also click 
              <strong className="text-indigo-600 mx-1">Apply</strong> on any Gig, or 
              <strong className="text-orange-600 mx-1">Hire Seeker</strong> on any Seeker profile to start a new chat instantly!
            </p>
          </div>
        )}
      </div>
      </motion.div>

      {/* Profile Details Modal */}
      <AnimatePresence>
        {showProfileDetails && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden relative"
            >
              <button 
                onClick={() => setShowProfileDetails(null)}
                className="absolute top-4 right-4 p-2 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-full transition-colors z-10"
              >
                <ArrowLeft className="w-5 h-5 rotate-180" />
              </button>

              <div className="h-32 bg-gradient-to-r from-indigo-500 to-purple-600 w-full relative">
                <div className="absolute -bottom-12 left-1/2 -translate-x-1/2">
                  {showProfileDetails.avatar_url ? (
                    <img 
                      src={showProfileDetails.avatar_url} 
                      alt={showProfileDetails.name} 
                      className="w-24 h-24 rounded-3xl object-cover border-4 border-white shadow-lg"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-3xl bg-indigo-100 text-indigo-700 flex items-center justify-center text-3xl font-bold border-4 border-white shadow-lg">
                      {showProfileDetails.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-16 pb-8 px-8 text-center">
                <div className="flex items-center justify-center space-x-2 mb-1">
                  <h3 className="text-2xl font-black text-gray-900 tracking-tight">
                    {showProfileDetails.name}
                  </h3>
                  {showProfileDetails.status === 'Verified' && (
                    <ShieldCheck className="w-6 h-6 text-green-600" />
                  )}
                </div>
                <p className="text-gray-500 text-sm font-medium mb-6">
                  {showProfileDetails.email}
                </p>

                <div className="bg-gray-50 rounded-2xl p-6 text-left mb-6">
                  <h4 className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest mb-2">About</h4>
                  <p className="text-gray-700 text-sm leading-relaxed">
                    {showProfileDetails.bio || "No bio provided yet. This user is part of our verified community and is ready to help!"}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Member Type</p>
                    <p className="text-sm font-bold text-gray-900">
                      {showProfileDetails.status === 'Verified' ? 'Professional' : 'Standard'}
                    </p>
                  </div>
                  <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Status</p>
                    <div className="flex items-center space-x-1.5 justify-center">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <p className="text-sm font-bold text-gray-900">Online</p>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => setShowProfileDetails(null)}
                  className="mt-8 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-indigo-200 active:scale-95"
                >
                  Back to Chat
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
