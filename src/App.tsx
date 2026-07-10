import React, { useState, useEffect } from 'react';
import { Shield, Users, ArrowRight, Link as LinkIcon, Copy, Gift, LogOut, Loader2, Wallet, UserCheck, Eye, MoreVertical, Coins, Upload, ArrowLeft, Plus, Maximize, Briefcase, MessageSquare, Search, User, Edit2, Check, ShieldCheck, Bell, MapPin, Phone, Globe, Sparkles, Trash2, Camera, Award, Image as ImageIcon, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GigsView } from './GigsView';
import { SeekersView } from './SeekersView';
import { ChatView } from './components/ChatView';
import { supabase } from './lib/supabase';
import { Session } from '@supabase/supabase-js';
import { ensureFriendship, sendLocalMessage } from './lib/chat';

type Tab = 'admin' | 'referral' | 'wallet' | 'gigs' | 'chat' | 'seekers';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('gigs');
  const [activeContactId, setActiveContactId] = useState<string | null>(null);
  const [onlineUsersCount, setOnlineUsersCount] = useState(0);
  const [profile, setProfile] = useState<{ 
    id: string; 
    name: string; 
    email: string; 
    status: string; 
    is_admin: boolean;
    avatar_url?: string;
    bio?: string;
    location?: string;
    title?: string;
    phone?: string;
    website?: string;
    skills?: string[];
    pin_code?: string;
  } | null>(null);
  const [showMenuDropdown, setShowMenuDropdown] = useState(false);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);
  const [notifications, setNotifications] = useState<Array<{ id: string; title: string; body: string; time: string; read: boolean }>>([
    {
      id: '1',
      title: 'Welcome to the Platform!',
      body: 'Get started by creating your gig or exploring active seekers in your area.',
      time: 'Just now',
      read: false,
    },
    {
      id: '2',
      title: 'Profile Status: Active',
      body: 'Your account is active. To unlock referral rewards, verify your profile with a wallet top-up!',
      time: '2 hours ago',
      read: false,
    },
    {
      id: '3',
      title: 'Pro Tip: Chat Instantly',
      body: 'You can now coordinate terms and details directly inside the brand-new Chat tab.',
      time: '1 day ago',
      read: true,
    }
  ]);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pinCode, setPinCode] = useState<string>('');
  const [confirmPin, setConfirmPin] = useState<string>('');
  const [isProfileLocked, setIsProfileLocked] = useState<boolean>(false);
  const [enteredPin, setEnteredPin] = useState<string>('');
  const [showPinSetup, setShowPinSetup] = useState<boolean>(false);
  const [pinError, setPinError] = useState<string>('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [title, setTitle] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [savingProfile, setSavingProfile] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  const fetchProfile = async () => {
    if (!session) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();
      
      const localExtra = localStorage.getItem(`profile_extra_${session.user.id}`);
      const parsedLocal = localExtra ? JSON.parse(localExtra) : {};
      const fallbackName = parsedLocal.name || session.user.user_metadata?.display_name || (session.user.email ? session.user.email.split('@')[0] : 'User');

      const dbAvatar = data?.avatar_url || parsedLocal.avatar_url || session.user.user_metadata?.avatar_url || '';
      const dbBio = data?.bio || parsedLocal.bio || session.user.user_metadata?.bio || '';
      const dbLocation = data?.location || parsedLocal.location || session.user.user_metadata?.location || '';
      const dbTitle = data?.title || parsedLocal.title || session.user.user_metadata?.title || '';
      const dbPhone = data?.phone || parsedLocal.phone || session.user.user_metadata?.phone || '';
      const dbWebsite = data?.website || parsedLocal.website || session.user.user_metadata?.website || '';
      const dbSkills = data?.skills || parsedLocal.skills || session.user.user_metadata?.skills || [];
      const dbPin = data?.pin_code || parsedLocal.pin_code || session.user.user_metadata?.pin_code || '';

      setAvatarUrl(dbAvatar);
      setBio(dbBio);
      setLocation(dbLocation);
      setTitle(dbTitle);
      setPhone(dbPhone);
      setWebsite(dbWebsite);
      setSkills(dbSkills);
      setPinCode(dbPin);
      setConfirmPin(dbPin);

      if (data) {
        setProfile({
          ...data,
          name: data.name || fallbackName,
          avatar_url: dbAvatar,
          bio: dbBio,
          location: dbLocation,
          title: dbTitle,
          phone: dbPhone,
          website: dbWebsite,
          skills: dbSkills
        });
        setNewName(data.name || fallbackName);
      } else {
        // If profile doesn't exist, insert one
        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: session.user.id,
            email: session.user.email,
            name: fallbackName,
            status: 'Active',
            is_admin: false
          })
          .select()
          .single();
        
        if (insertError) {
          console.error('Initial profile insert failed, trying minimal insert:', insertError);
          const { data: retryProfile, error: retryError } = await supabase
            .from('profiles')
            .insert({
              id: session.user.id,
              name: fallbackName
            })
            .select()
            .single();
          
          if (retryProfile) {
            setProfile({
              ...retryProfile,
              name: retryProfile.name || fallbackName,
              avatar_url: dbAvatar,
              bio: dbBio,
              location: dbLocation,
              title: dbTitle,
              phone: dbPhone,
              website: dbWebsite,
              skills: dbSkills
            });
            setNewName(retryProfile.name || fallbackName);
          } else {
            console.error('Minimal insert also failed:', retryError);
            const fallbackProfile = {
              id: session.user.id,
              email: session.user.email || '',
              name: fallbackName,
              status: 'Active',
              is_admin: false,
              avatar_url: dbAvatar,
              bio: dbBio,
              location: dbLocation,
              title: dbTitle,
              phone: dbPhone,
              website: dbWebsite,
              skills: dbSkills
            };
            setProfile(fallbackProfile);
            setNewName(fallbackProfile.name);
          }
        } else if (newProfile) {
          setProfile({
            ...newProfile,
            name: newProfile.name || fallbackName,
            avatar_url: dbAvatar,
            bio: dbBio,
            location: dbLocation,
            title: dbTitle,
            phone: dbPhone,
            website: dbWebsite,
            skills: dbSkills
          });
          setNewName(newProfile.name || fallbackName);
        }
      }
    } catch (e: any) {
      console.error('Error fetching profile:', e);
      const localExtra = localStorage.getItem(`profile_extra_${session.user.id}`);
      const parsedLocal = localExtra ? JSON.parse(localExtra) : {};
      const fallbackName = parsedLocal.name || session.user.user_metadata?.display_name || (session.user.email ? session.user.email.split('@')[0] : 'User');

      const dbAvatar = parsedLocal.avatar_url || session.user.user_metadata?.avatar_url || '';
      const dbBio = parsedLocal.bio || session.user.user_metadata?.bio || '';
      const dbLocation = parsedLocal.location || session.user.user_metadata?.location || '';
      const dbTitle = parsedLocal.title || session.user.user_metadata?.title || '';
      const dbPhone = parsedLocal.phone || session.user.user_metadata?.phone || '';
      const dbWebsite = parsedLocal.website || session.user.user_metadata?.website || '';
      const dbSkills = parsedLocal.skills || session.user.user_metadata?.skills || [];

      setAvatarUrl(dbAvatar);
      setBio(dbBio);
      setLocation(dbLocation);
      setTitle(dbTitle);
      setPhone(dbPhone);
      setWebsite(dbWebsite);
      setSkills(dbSkills);

      const fallbackProfile = {
        id: session.user.id,
        email: session.user.email || '',
        name: fallbackName,
        status: 'Active',
        is_admin: false,
        avatar_url: dbAvatar,
        bio: dbBio,
        location: dbLocation,
        title: dbTitle,
        phone: dbPhone,
        website: dbWebsite,
        skills: dbSkills
      };
      setProfile(fallbackProfile);
      setNewName(fallbackProfile.name);
    }
  };

  useEffect(() => {
    if (session) {
      // Set immediate local fallback state so there is zero delay/flash
      const localExtra = localStorage.getItem(`profile_extra_${session.user.id}`);
      const parsedLocal = localExtra ? JSON.parse(localExtra) : {};
      const dbAvatar = parsedLocal.avatar_url || session.user.user_metadata?.avatar_url || '';
      const dbBio = parsedLocal.bio || session.user.user_metadata?.bio || '';
      const dbLocation = parsedLocal.location || session.user.user_metadata?.location || '';
      const dbTitle = parsedLocal.title || session.user.user_metadata?.title || '';
      const dbPhone = parsedLocal.phone || session.user.user_metadata?.phone || '';
      const dbWebsite = parsedLocal.website || session.user.user_metadata?.website || '';
      const dbSkills = parsedLocal.skills || session.user.user_metadata?.skills || [];
      const dbPin = parsedLocal.pin_code || session.user.user_metadata?.pin_code || '';
      const defaultName = parsedLocal.name || session.user.user_metadata?.display_name || session.user.email?.split('@')[0] || 'User';

      setProfile({
        id: session.user.id,
        email: session.user.email || '',
        name: defaultName,
        status: 'Active',
        is_admin: false,
        avatar_url: dbAvatar,
        bio: dbBio,
        location: dbLocation,
        title: dbTitle,
        phone: dbPhone,
        website: dbWebsite,
        skills: dbSkills,
        pin_code: dbPin
      });
      setNewName(defaultName);
      setAvatarUrl(dbAvatar);
      setBio(dbBio);
      setLocation(dbLocation);
      setTitle(dbTitle);
      setPhone(dbPhone);
      setWebsite(dbWebsite);
      setSkills(dbSkills);
      setPinCode(dbPin);
      setConfirmPin(dbPin);
    }
    fetchProfile();
  }, [session]);

  useEffect(() => {
    if (showProfileModal && profile) {
      setNewName(profile.name || '');
      setAvatarUrl(profile.avatar_url || '');
      setBio(profile.bio || '');
      setLocation(profile.location || '');
      setTitle(profile.title || '');
      setPhone(profile.phone || '');
      setWebsite(profile.website || '');
      setSkills(profile.skills || []);
      setPinCode(profile.pin_code || '');
      setConfirmPin(profile.pin_code || '');
    }
  }, [showProfileModal, profile]);

  const handleUpdateProfile = async () => {
    if (!session || !newName.trim()) return;

    // PIN validation
    if (pinCode && (pinCode !== confirmPin || pinCode.length !== 5)) {
      alert('Please enter a valid 5-digit PIN and confirm it.');
      return;
    }

    setSavingProfile(true);
    try {
      let finalAvatarUrl = avatarUrl;

      if (selectedFile) {
        // Prepare file path: avatars/uid-timestamp.ext
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${session.user.id}-${Date.now()}.${fileExt}`;
        const filePath = fileName;

        // 1. Upload image to Supabase Storage (bucket: 'avatars')
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, selectedFile, { 
            cacheControl: '3600',
            upsert: true 
          });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          throw uploadError;
        }

        console.log('Upload success');
        console.log('Storage path:', filePath);

        // 2. Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);
        
        finalAvatarUrl = publicUrl;
        console.log('Generated image URL:', finalAvatarUrl);
      }

      // 3. Upsert public.profiles (including all fields)
      // We'll try a full update first, but we'll be careful about fields that might not exist or have constraints
      const profileUpdate: any = {
        id: session.user.id,
        name: newName.trim(),
        avatar_url: finalAvatarUrl,
        updated_at: new Date().toISOString(),
      };

      if (pinCode && pinCode.length === 5) {
        profileUpdate.pin_code = pinCode;
      }

      // Only add email if it's available in the session
      if (session.user.email) {
        profileUpdate.email = session.user.email;
      }

      // 3. Update public.profiles (if available)
      // We wrap this in a way that doesn't block the rest of the update if the table is missing/locked
      try {
        const fullUpdateData = {
          ...profileUpdate,
          bio,
          location,
          title,
          phone,
          website,
          skills,
        };

        const { error: upsertError } = await supabase
          .from('profiles')
          .upsert(fullUpdateData, { onConflict: 'id' });

        if (upsertError) {
          console.warn('Profiles table update skipped or failed (likely missing table or RLS):', upsertError.message);
          
          // Try a minimal retry without non-essential fields
          const { error: minimalError } = await supabase
            .from('profiles')
            .upsert({
              id: session.user.id,
              name: newName.trim(),
              avatar_url: finalAvatarUrl,
              pin_code: pinCode
            }, { onConflict: 'id' });
            
          if (minimalError) {
            console.log('Using Auth Metadata and LocalStorage as primary persistence for this session.');
          }
        }
      } catch (dbErr) {
        console.log('Database table "profiles" is not accessible, using fallbacks.');
      }

      console.log('Profile persistence synchronized');

      console.log('Database operation completed');

      // 4. Save metadata in User Auth (This is often more reliable than public tables)
      const authMetadata: any = {
        display_name: newName.trim(),
        avatar_url: finalAvatarUrl,
        bio: bio,
        location: location,
        title: title,
        phone: phone,
        website: website,
        skills: skills
      };

      if (pinCode && pinCode.length === 5) {
        authMetadata.pin_code = pinCode;
      }

      const { error: authError } = await supabase.auth.updateUser({
        data: authMetadata
      });

      if (authError) {
        console.error('Auth metadata update error:', authError);
      }

      // 5. Save to localStorage for instant local retrieval
      const extraData = {
        name: newName.trim(),
        avatar_url: finalAvatarUrl,
        bio,
        location,
        title,
        phone,
        website,
        skills,
        pin_code: pinCode
      };
      localStorage.setItem(`profile_extra_${session.user.id}`, JSON.stringify(extraData));

      // 6. Update local state immediately
      setAvatarUrl(finalAvatarUrl);
      setSelectedFile(null);
      
      // Lock the profile if a PIN is set
      if (pinCode && pinCode.length === 5) {
        setIsProfileLocked(true);
        setEnteredPin('');
      }

      // 7. Reload the user's profile immediately
      await fetchProfile();

      // 8. Show congratulations celebration!
      setShowCelebration(true);
    } catch (e: any) {
      console.error('Error updating profile:', e);
      alert('Could not update profile. Some changes may be saved locally.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleDirectToChat = async (contactId: string, starterMessage: string) => {
    if (!session?.user?.id) return;
    const currentUserId = session.user.id;
    try {
      await ensureFriendship(currentUserId, contactId);
      sendLocalMessage(currentUserId, contactId, starterMessage);
      setActiveContactId(contactId);
      setActiveTab('chat');
    } catch (err: any) {
      console.error('Detailed Error routing to chat:', {
        message: err?.message || 'Unknown error',
        code: err?.code || 'N/A',
        details: err?.details || '',
        hint: err?.hint || '',
        fullError: err
      });
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    
    const channel = supabase.channel('online-users', {
      config: {
        presence: {
          key: session.user.id,
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        setOnlineUsersCount(Object.keys(state).length);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ online_at: new Date().toISOString() });
        }
      });

    return () => {
      channel.unsubscribe();
    };
  }, [session]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (!session) {
    return <AuthView />;
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans flex flex-col">
      {/* Top Bar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between items-center">
            {/* Left Nav Tabs */}
            <div className="flex items-center justify-between sm:justify-start sm:space-x-4 md:space-x-6 flex-1 mr-4 sm:mr-6 overflow-x-auto no-scrollbar">
              <button
                onClick={() => setActiveTab('referral')}
                title="Referral Program"
                className={`transition-all duration-300 focus:outline-none flex flex-col items-center justify-center flex-1 sm:flex-initial shrink-0 relative px-3 py-1 h-12 rounded-xl ${
                  activeTab === 'referral'
                    ? 'text-green-600 font-semibold bg-green-50/30'
                    : 'text-gray-400 hover:text-gray-700 hover:bg-gray-50/50'
                }`}
              >
                <Gift className="w-5 h-5 transition-transform duration-300" />
                {activeTab === 'referral' && (
                  <motion.span
                    initial={{ opacity: 0, y: -2 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-[9px] font-bold tracking-wide mt-1 leading-none select-none"
                  >
                    Referrals
                  </motion.span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('gigs')}
                title="Gigs"
                className={`transition-all duration-300 focus:outline-none flex flex-col items-center justify-center flex-1 sm:flex-initial shrink-0 relative px-3 py-1 h-12 rounded-xl ${
                  activeTab === 'gigs'
                    ? 'text-indigo-600 font-semibold bg-indigo-50/30'
                    : 'text-gray-400 hover:text-gray-700 hover:bg-gray-50/50'
                }`}
              >
                <Briefcase className="w-5 h-5 transition-transform duration-300" />
                {activeTab === 'gigs' && (
                  <motion.span
                    initial={{ opacity: 0, y: -2 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-[9px] font-bold tracking-wide mt-1 leading-none select-none"
                  >
                    Gigs
                  </motion.span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('chat')}
                title="Chat"
                className={`transition-all duration-300 focus:outline-none flex flex-col items-center justify-center flex-1 sm:flex-initial shrink-0 relative px-3 py-1 h-12 rounded-xl ${
                  activeTab === 'chat'
                    ? 'text-pink-600 font-semibold bg-pink-50/30'
                    : 'text-gray-400 hover:text-gray-700 hover:bg-gray-50/50'
                }`}
              >
                <MessageSquare className="w-5 h-5 transition-transform duration-300" />
                {activeTab === 'chat' && (
                  <motion.span
                    initial={{ opacity: 0, y: -2 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-[9px] font-bold tracking-wide mt-1 leading-none select-none"
                  >
                    Chat
                  </motion.span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('seekers')}
                title="Seekers"
                className={`transition-all duration-300 focus:outline-none flex flex-col items-center justify-center flex-1 sm:flex-initial shrink-0 relative px-3 py-1 h-12 rounded-xl ${
                  activeTab === 'seekers'
                    ? 'text-orange-600 font-semibold bg-orange-50/30'
                    : 'text-gray-400 hover:text-gray-700 hover:bg-gray-50/50'
                }`}
              >
                <Search className="w-5 h-5 transition-transform duration-300" />
                {activeTab === 'seekers' && (
                  <motion.span
                    initial={{ opacity: 0, y: -2 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-[9px] font-bold tracking-wide mt-1 leading-none select-none"
                  >
                    Seekers
                  </motion.span>
                )}
              </button>
            </div>

            {/* Right Controls with Online status & 3-dot menu */}
            <div className="flex items-center space-x-4 shrink-0">
              {/* Online Users Count */}
              <div className="hidden sm:flex items-center space-x-1.5 text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full border border-gray-200 relative">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
                <span className="w-2 h-2 rounded-full bg-emerald-500 absolute shrink-0" />
                <span className="pl-3 font-semibold text-gray-600">{onlineUsersCount} online</span>
              </div>

              {/* Notification Bell */}
              <div className="relative">
                <button
                  onClick={() => {
                    setShowNotificationsDropdown(!showNotificationsDropdown);
                    setShowMenuDropdown(false);
                  }}
                  className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all duration-300 focus:outline-none flex items-center justify-center shrink-0 relative"
                  title="Notifications"
                >
                  <Bell className="w-5 h-5" />
                  {notifications.some(n => !n.read) && (
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-rose-500 border border-white" />
                  )}
                </button>

                <AnimatePresence>
                  {showNotificationsDropdown && (
                    <>
                      {/* Backdrop to close */}
                      <div 
                        className="fixed inset-0 z-20" 
                        onClick={() => setShowNotificationsDropdown(false)} 
                      />
                      
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 z-30 overflow-hidden text-gray-900"
                      >
                        <div className="p-3.5 border-b border-gray-100 flex items-center justify-between">
                          <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">Notifications</span>
                          {notifications.some(n => !n.read) && (
                            <button 
                              onClick={() => {
                                setNotifications(notifications.map(n => ({ ...n, read: true })));
                              }}
                              className="text-[10px] font-semibold text-indigo-600 hover:underline hover:text-indigo-700"
                            >
                              Mark all as read
                            </button>
                          )}
                        </div>
                        <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                          {notifications.map((n) => (
                            <div 
                              key={n.id} 
                              onClick={() => {
                                setNotifications(notifications.map(notif => notif.id === n.id ? { ...notif, read: true } : notif));
                              }}
                              className={`p-3.5 hover:bg-gray-50/50 cursor-pointer transition-colors flex gap-2.5 items-start ${!n.read ? 'bg-indigo-50/30' : ''}`}
                            >
                              <div className="mt-1 shrink-0">
                                <div className={`w-2 h-2 rounded-full ${!n.read ? 'bg-indigo-600' : 'bg-transparent'}`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`text-xs text-gray-900 truncate ${!n.read ? 'font-bold' : 'font-medium'}`}>{n.title}</p>
                                <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed break-words">{n.body}</p>
                                <span className="text-[9px] text-gray-400 font-semibold block mt-1">{n.time}</span>
                              </div>
                            </div>
                          ))}
                          {notifications.length === 0 && (
                            <div className="p-6 text-center text-gray-400 text-xs">
                              No notifications yet.
                            </div>
                          )}
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              {/* 3-dot Menu dropdown with user profile avatar */}
              <div className="relative">
                <button
                  onClick={() => {
                    setShowMenuDropdown(!showMenuDropdown);
                    setShowNotificationsDropdown(false);
                  }}
                  className="flex items-center space-x-1.5 p-1 pr-2 rounded-full border border-gray-100 hover:border-gray-200 bg-white hover:bg-gray-50 transition-all duration-300 focus:outline-none shrink-0 shadow-xs"
                  title="Account Menu"
                >
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-tr from-indigo-500 to-blue-600 flex items-center justify-center text-white shrink-0 shadow-xs border border-white">
                    {(showProfileModal ? avatarUrl : profile?.avatar_url) ? (
                      <img src={showProfileModal ? avatarUrl : profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <User className="w-4.5 h-4.5 text-white" />
                    )}
                  </div>
                  <MoreVertical className="w-4 h-4 text-gray-400 hover:text-gray-600 transition-colors" />
                </button>

                <AnimatePresence>
                  {showMenuDropdown && (
                    <>
                      {/* Backdrop to close */}
                      <div 
                        className="fixed inset-0 z-20" 
                        onClick={() => setShowMenuDropdown(false)} 
                      />
                      
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-100 z-30 overflow-hidden text-gray-900"
                      >
                        {/* User Header Info inside dropdown */}
                        <div className="p-3 bg-gray-50/50 border-b border-gray-100 flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-tr from-indigo-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm shrink-0 border border-white shadow-xs">
                            {profile?.avatar_url ? (
                              <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              profile?.name ? profile.name.substring(0, 2).toUpperCase() : <User className="w-5 h-5 text-white" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-gray-900 truncate">{profile?.name || 'User'}</p>
                            <p className="text-[11px] text-gray-500 truncate">{profile?.email}</p>
                          </div>
                        </div>

                        <div className="p-2">
                          {/* Admin Panel Link */}
                          <button
                            onClick={() => {
                              setActiveTab('admin');
                              setShowMenuDropdown(false);
                            }}
                            className={`w-full flex items-center space-x-2.5 px-3 py-2.5 text-sm rounded-lg transition-colors text-left font-medium ${
                              activeTab === 'admin'
                                ? 'bg-blue-50 text-blue-600 font-bold'
                                : 'text-gray-700 hover:bg-indigo-50 hover:text-indigo-600'
                            }`}
                          >
                            <Shield className={`w-4 h-4 ${activeTab === 'admin' ? 'text-blue-500' : 'text-gray-400'}`} />
                            <span>Admin Panel</span>
                          </button>

                          {/* Wallet Link */}
                          <button
                            onClick={() => {
                              setActiveTab('wallet');
                              setShowMenuDropdown(false);
                            }}
                            className={`w-full flex items-center space-x-2.5 px-3 py-2.5 text-sm rounded-lg transition-colors text-left font-medium ${
                              activeTab === 'wallet'
                                ? 'bg-purple-50 text-purple-600 font-bold'
                                : 'text-gray-700 hover:bg-indigo-50 hover:text-indigo-600'
                            }`}
                          >
                            <Wallet className={`w-4 h-4 ${activeTab === 'wallet' ? 'text-purple-500' : 'text-gray-400'}`} />
                            <span>Wallet</span>
                          </button>

                          <div className="border-t border-gray-100 my-1"></div>

                          {/* User Profile */}
                          <button
                            onClick={() => {
                              if (pinCode) {
                                setIsProfileLocked(true);
                                setEnteredPin('');
                              }
                              setShowProfileModal(true);
                              setShowMenuDropdown(false);
                            }}
                            className="w-full flex items-center space-x-2.5 px-3 py-2.5 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition-colors text-left font-medium"
                          >
                            <User className="w-4 h-4 text-gray-400" />
                            <span>User Profile</span>
                          </button>
                          
                          <div className="border-t border-gray-100 my-1"></div>
                          
                          {/* Logout */}
                          <button
                            onClick={async () => {
                              try {
                                await supabase.auth.signOut();
                                setShowMenuDropdown(false);
                              } catch (err: any) {
                                console.error('Detailed Error during logout:', {
                                  message: err?.message || 'Unknown error',
                                  code: err?.code || 'N/A',
                                  details: err?.details || '',
                                  hint: err?.hint || '',
                                  fullError: err
                                });
                              }
                            }}
                            className="w-full flex items-center space-x-2.5 px-3 py-2.5 text-sm text-rose-600 hover:bg-rose-50 rounded-lg transition-colors text-left font-medium"
                          >
                            <LogOut className="w-4 h-4 text-rose-400" />
                            <span>Logout</span>
                          </button>
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className={`flex-1 w-full mx-auto min-h-0 ${activeTab === 'chat' ? 'w-full h-[calc(100vh-4rem)] flex flex-col overflow-hidden' : 'max-w-7xl px-4 sm:px-6 lg:px-8 py-8'}`}>
        <AnimatePresence mode="wait">
          {activeTab === 'admin' && <AdminView key="admin" onlineUsersCount={onlineUsersCount} />}
          {activeTab === 'referral' && <ReferralView key="referral" userId={session.user.id} />}
          {activeTab === 'wallet' && <WalletView key="wallet" userId={session.user.id} />}
          {activeTab === 'gigs' && <GigsView key="gigs" onDirectToChat={handleDirectToChat} />}
          {activeTab === 'chat' && (
            <ChatView 
              key="chat" 
              userId={session.user.id} 
              activeContactId={activeContactId} 
              setActiveContactId={setActiveContactId} 
            />
          )}
          {activeTab === 'seekers' && <SeekersView key="seekers" onDirectToChat={handleDirectToChat} />}
        </AnimatePresence>
      </main>

      {/* Profile Modal */}
      <AnimatePresence>
        {showProfileModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowProfileModal(false);
                setIsEditingName(false);
              }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden text-gray-900 z-10 my-8 flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                <div className="flex items-center space-x-2">
                  <div className="p-1.5 bg-indigo-50 rounded-lg text-indigo-600">
                    <User className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">Configure Your Profile</h3>
                </div>
                {isProfileLocked && pinCode ? null : (
                <button
                  onClick={() => {
                    setShowProfileModal(false);
                    setIsEditingName(false);
                  }}
                  className="p-1.5 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                >
                  <span className="sr-only">Close</span>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                )}
              </div>

              {/* Scrollable Body */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1 relative">
                {isProfileLocked && pinCode && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-0 z-20 bg-white/95 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center"
                  >
                    <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4 text-amber-600">
                      <Lock className="w-8 h-8" />
                    </div>
                    <h4 className="text-xl font-bold text-gray-900 mb-2">Profile Locked</h4>
                    <p className="text-sm text-gray-500 mb-6">Enter your 5-digit PIN to access your profile settings.</p>
                    
                    <div className="space-y-4 w-full max-w-[200px]">
                      <input
                        type="password"
                        inputMode="numeric"
                        maxLength={5}
                        placeholder="•••••"
                        autoFocus
                        value={enteredPin}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '');
                          setEnteredPin(val);
                          if (val.length === 5) {
                            if (val === pinCode) {
                              setIsProfileLocked(false);
                              setPinError('');
                            } else {
                              setPinError('Incorrect PIN');
                              setTimeout(() => setEnteredPin(''), 500);
                            }
                          }
                        }}
                        className={`w-full px-4 py-3 text-2xl border ${pinError ? 'border-rose-500 bg-rose-50' : 'border-gray-200'} rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-100 text-center font-mono tracking-[0.5em] transition-all`}
                      />
                      {pinError && <p className="text-xs font-bold text-rose-500">{pinError}</p>}
                      
                      <button
                        onClick={() => {
                          setPinCode('');
                          setConfirmPin('');
                          setIsProfileLocked(false);
                          setEnteredPin('');
                          setPinError('');
                        }}
                        className="text-sm text-gray-400 hover:text-gray-600 font-medium hover:underline"
                      >
                        Forgot PIN?
                      </button>
                      
                      <button
                        onClick={() => setShowProfileModal(false)}
                        className="text-xs text-gray-400 hover:text-gray-500 font-medium hover:underline block mx-auto mt-2"
                      >
                        Go back
                      </button>
                    </div>
                  </motion.div>
                )}
                {/* 1. Profile Picture & Name */}
                <div className="flex flex-col md:flex-row items-center gap-6 pb-6 border-b border-gray-100">
                  {/* Image Uploader & Drag/Drop */}
                  <div className="flex flex-col items-center space-y-2">
                    <div 
                      onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); }}
                      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                      onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                          const file = e.dataTransfer.files[0];
                          setSelectedFile(file);
                          const reader = new FileReader();
                          reader.onloadstart = () => {
                            // Could add a loading state here if needed
                          };
                          reader.onloadend = () => {
                            setAvatarUrl(reader.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      onClick={() => document.getElementById('avatar-file-input')?.click()}
                      className="w-24 h-24 rounded-full border-2 border-dashed border-gray-300 hover:border-indigo-500 bg-gray-50 flex flex-col items-center justify-center cursor-pointer overflow-hidden relative group transition-all shrink-0 shadow-sm"
                      title="Click or drag image to upload"
                    >
                      {avatarUrl ? (
                        <>
                          <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Camera className="w-6 h-6 text-white" />
                          </div>
                          <div className="absolute top-1 right-1 bg-indigo-600 rounded-full p-1 shadow-lg transform scale-0 group-hover:scale-100 transition-transform">
                            <ImageIcon className="w-3 h-3 text-white" />
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center p-2 text-center text-gray-400">
                          <Camera className="w-6 h-6 text-gray-400 mb-1" />
                          <span className="text-[10px] font-semibold">Upload Photo</span>
                        </div>
                      )}
                      
                      {profile?.status === 'Verified' && (
                        <span className="absolute bottom-0 right-0 bg-green-500 border-2 border-white rounded-full p-0.5" title="Verified Account">
                          <ShieldCheck className="w-4 h-4 text-white" />
                        </span>
                      )}
                    </div>

                    {avatarUrl && (
                      <div className="flex flex-col items-center space-y-1 mt-2">
                        <div className="flex items-center space-x-2 px-2 py-1 bg-indigo-50 rounded-full border border-indigo-100 animate-pulse mb-1">
                          <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full"></div>
                          <span className="text-[9px] font-bold text-indigo-700 uppercase tracking-tight">Live Preview Active</span>
                        </div>
                        <div className="flex items-center space-x-2 p-1.5 rounded-lg bg-gray-50 border border-gray-100">
                          <span className="text-[10px] text-gray-400 font-medium px-1">Menu:</span>
                          <div className="w-6 h-6 rounded-full overflow-hidden bg-indigo-100 flex items-center justify-center border border-white shadow-sm">
                             <img src={avatarUrl} alt="Preview" className="w-full h-full object-cover" />
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <input 
                      type="file" 
                      id="avatar-file-input" 
                      className="hidden" 
                      accept="image/*" 
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          const file = e.target.files[0];
                          setSelectedFile(file);
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setAvatarUrl(reader.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />

                    {avatarUrl && (
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setAvatarUrl('');
                          setSelectedFile(null);
                        }}
                        className="text-[10px] text-rose-500 hover:text-rose-700 hover:underline font-semibold flex items-center space-x-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Remove Photo</span>
                      </button>
                    )}
                  </div>

                  {/* Name field */}
                  <div className="flex-1 w-full space-y-1.5">
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide">Display Name</label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-sm border border-gray-200 hover:border-gray-300 focus:border-indigo-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-100 bg-white text-gray-900 transition-all font-medium"
                        placeholder="Your name"
                        maxLength={30}
                      />
                    </div>
                    <p className="text-[11px] text-gray-400 font-medium">Your email address: <span className="text-gray-500">{profile?.email}</span></p>
                  </div>
                </div>

                {/* 2. Professional Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide flex items-center space-x-1">
                      <Briefcase className="w-3.5 h-3.5 text-gray-400" />
                      <span>Professional Title</span>
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm border border-gray-200 hover:border-gray-300 focus:border-indigo-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-100 bg-white text-gray-900 transition-all"
                      placeholder="e.g. Expert Painter, Electrician, Designer"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide flex items-center space-x-1">
                      <MapPin className="w-3.5 h-3.5 text-gray-400" />
                      <span>Location</span>
                    </label>
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm border border-gray-200 hover:border-gray-300 focus:border-indigo-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-100 bg-white text-gray-900 transition-all"
                      placeholder="e.g. Cape Town, Western Cape"
                    />
                  </div>
                </div>

                {/* 3. Bio */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide">Short Bio</label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={3}
                    maxLength={200}
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-200 hover:border-gray-300 focus:border-indigo-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-100 bg-white text-gray-900 transition-all resize-none"
                    placeholder="Tell other members a little bit about yourself, your experience, or what services you offer..."
                  />
                  <div className="flex justify-end">
                    <span className="text-[10px] text-gray-400 font-medium">{bio.length}/200 characters</span>
                  </div>
                </div>

                {/* 4. Contact Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide flex items-center space-x-1">
                      <Phone className="w-3.5 h-3.5 text-gray-400" />
                      <span>Phone Number</span>
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm border border-gray-200 hover:border-gray-300 focus:border-indigo-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-100 bg-white text-gray-900 transition-all"
                      placeholder="e.g. +27 82 123 4567"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide flex items-center space-x-1">
                      <Globe className="w-3.5 h-3.5 text-gray-400" />
                      <span>Website / Portfolio</span>
                    </label>
                    <input
                      type="url"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm border border-gray-200 hover:border-gray-300 focus:border-indigo-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-100 bg-white text-gray-900 transition-all"
                      placeholder="e.g. https://myportfolio.com"
                    />
                  </div>
                </div>

                {/* 5. Skills Input with tags */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide flex items-center space-x-1">
                    <Award className="w-3.5 h-3.5 text-gray-400" />
                    <span>Skills / Keywords (Comma-separated)</span>
                  </label>
                  <input
                    type="text"
                    value={typeof skills === 'string' ? skills : skills.join(', ')}
                    onChange={(e) => {
                      const list = e.target.value;
                      // Keep it as a parsed array
                      const parsed = list.split(',').map(s => s.trim()).filter(s => s.length > 0);
                      setSkills(parsed);
                    }}
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-200 hover:border-gray-300 focus:border-indigo-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-100 bg-white text-gray-900 transition-all"
                    placeholder="e.g. Carpentry, Plumbing, House Painting"
                  />
                  
                  {/* Skill tags list */}
                  {skills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {skills.map((skill, index) => (
                        <span 
                          key={index} 
                          className="inline-flex items-center text-xs font-semibold bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full border border-indigo-100"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* 6. PIN Lock Setup */}
                <div className="space-y-4 p-4 bg-amber-50/50 border border-amber-100 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Lock className="w-4 h-4 text-amber-600" />
                      <h4 className="text-sm font-bold text-amber-800">Security PIN Lock</h4>
                    </div>
                    {pinCode && (
                      <button
                        onClick={() => {
                          setPinCode('');
                          setConfirmPin('');
                        }}
                        className="text-[10px] font-bold text-rose-600 hover:text-rose-700 uppercase tracking-wider"
                      >
                        Clear PIN
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-amber-700 leading-relaxed">
                    Set a 5-digit PIN to lock your profile. You will be prompted for this PIN whenever you try to access or modify your profile details after saving.
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-amber-700 uppercase tracking-wide">Enter 5-Digit PIN</label>
                      <input
                        type="password"
                        inputMode="numeric"
                        maxLength={5}
                        placeholder="00000"
                        value={pinCode}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '');
                          setPinCode(val);
                        }}
                        className="w-full px-3.5 py-2.5 text-sm border border-amber-200 focus:border-amber-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-100 bg-white text-gray-900 transition-all font-mono tracking-[0.5em] text-center"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-amber-700 uppercase tracking-wide">Confirm PIN</label>
                      <input
                        type="password"
                        inputMode="numeric"
                        maxLength={5}
                        placeholder="00000"
                        value={confirmPin}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '');
                          setConfirmPin(val);
                        }}
                        className="w-full px-3.5 py-2.5 text-sm border border-amber-200 focus:border-amber-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-100 bg-white text-gray-900 transition-all font-mono tracking-[0.5em] text-center"
                      />
                    </div>
                  </div>
                  {pinCode && confirmPin && pinCode !== confirmPin && (
                    <p className="text-[10px] text-rose-500 font-bold">PINs do not match!</p>
                  )}
                  {pinCode && pinCode.length !== 5 && (
                    <p className="text-[10px] text-amber-600 font-medium">PIN must be exactly 5 digits.</p>
                  )}
                </div>

                {/* Account Status Card */}
                <div className="p-4 bg-gray-50 border border-gray-100 rounded-xl">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-500">Account Tier</span>
                    <span className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-bold ${
                      profile?.status === 'Verified'
                        ? 'bg-green-50 text-green-700 border border-green-200 shadow-xs'
                        : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                    }`}>
                      <ShieldCheck className="w-4 h-4" />
                      <span>{profile?.status || 'Active'}</span>
                    </span>
                  </div>
                  {profile?.status !== 'Verified' && (
                    <p className="text-xs text-gray-500 mt-2.5 leading-relaxed text-left">
                      Top up <strong className="font-semibold text-indigo-600">R20</strong> or more in the Wallet to verify your account and unlock referral rewards.
                    </p>
                  )}
                </div>
              </div>

              {/* Footer Actions */}
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end space-x-3 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setShowProfileModal(false);
                    setIsEditingName(false);
                  }}
                  className="px-4.5 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 text-sm font-semibold rounded-xl shadow-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleUpdateProfile}
                  disabled={savingProfile || !newName.trim() || (pinCode !== confirmPin && pinCode.length > 0) || (pinCode.length > 0 && pinCode.length !== 5)}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold shadow-md shadow-indigo-200 hover:shadow-lg transition-all flex items-center space-x-2"
                >
                  {savingProfile ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Celebration Modal (Success Alert Screen) */}
      <AnimatePresence>
        {showCelebration && (
          <div className="fixed inset-0 z-55 flex items-center justify-center p-4">
            {/* Dark blur backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowCelebration(false);
                setShowProfileModal(false);
              }}
              className="fixed inset-0 bg-slate-900/70 backdrop-blur-md"
            />

            {/* Confetti & Congratulations Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, rotate: -2, y: 50 }}
              animate={{ opacity: 1, scale: 1, rotate: 0, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, rotate: 2, y: 50 }}
              transition={{ type: "spring", damping: 15, stiffness: 100 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden text-gray-950 z-10 p-8 text-center flex flex-col items-center"
            >
              {/* Confetti elements built with pure motion elements */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {[...Array(20)].map((_, i) => {
                  const colors = ['bg-indigo-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-sky-500', 'bg-violet-500'];
                  const colorClass = colors[i % colors.length];
                  const xStart = Math.random() * 300 - 150;
                  const yStart = Math.random() * -100 - 50;
                  const delay = Math.random() * 0.5;
                  return (
                    <motion.div
                      key={i}
                      initial={{ x: xStart, y: yStart, opacity: 1, scale: Math.random() * 0.5 + 0.5, rotate: 0 }}
                      animate={{ 
                        y: 500, 
                        opacity: 0, 
                        rotate: Math.random() * 720, 
                        x: xStart + (Math.random() * 200 - 100) 
                      }}
                      transition={{ duration: 2.5, delay, repeat: Infinity, repeatType: "loop" }}
                      className={`absolute w-3.5 h-3.5 rounded-sm ${colorClass}`}
                      style={{ top: "10%" }}
                    />
                  );
                })}
              </div>

              {/* Celebration Icon */}
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.2, 1] }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 mb-6 border border-indigo-100 shadow-sm relative shrink-0"
              >
                <Sparkles className="w-10 h-10 animate-bounce" />
                <motion.div 
                  animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.8, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute inset-0 bg-indigo-500 rounded-full -z-10" 
                />
              </motion.div>

              {/* Text content */}
              <h4 className="text-2xl font-black text-gray-900 tracking-tight">Congratulations!</h4>
              <p className="text-sm font-semibold text-indigo-600 mt-1">Your Profile is Stunningly Complete!</p>
              
              <p className="text-xs text-gray-500 mt-3 max-w-xs leading-relaxed">
                Great job! Your profile looks professional, making you stand out to clients and potential partners in the network.
              </p>

              {/* Card preview */}
              <div className="w-full mt-6 p-4 bg-gray-50 border border-gray-100 rounded-2xl flex items-center space-x-4 text-left">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-tr from-indigo-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg shrink-0 border-2 border-white shadow-sm">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    newName ? newName.substring(0, 2).toUpperCase() : 'ME'
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center space-x-1">
                    <h5 className="text-sm font-bold text-gray-900 truncate">{newName}</h5>
                    {profile?.status === 'Verified' && <ShieldCheck className="w-4 h-4 text-green-600" />}
                  </div>
                  {title && <p className="text-[11px] text-indigo-600 font-bold truncate mt-0.5 uppercase tracking-wider">{title}</p>}
                  {location && <p className="text-[10px] text-gray-400 font-medium truncate mt-0.5">{location}</p>}
                </div>
              </div>

              {/* Button */}
              <button
                type="button"
                onClick={() => {
                  setShowCelebration(false);
                  setShowProfileModal(false);
                }}
                className="w-full mt-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-2xl shadow-lg shadow-indigo-100 hover:shadow-xl transition-all"
              >
                Awesome, thank you!
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AuthView() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
      }
    } catch (err: any) {
      console.error('Detailed Error during authentication:', {
        message: err?.message || 'Unknown error',
        code: err?.code || 'N/A',
        details: err?.details || '',
        hint: err?.hint || '',
        fullError: err
      });
      setError(err.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-center text-3xl font-extrabold text-gray-900">
            {isLogin ? 'Sign in to your account' : 'Create an account'}
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleAuth}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <input
                id="email-address"
                name="email"
                type="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isLogin ? 'Sign in' : 'Sign up')}
            </button>
          </div>
          
          <div className="text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm font-medium text-blue-600 hover:text-blue-500"
            >
              {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AdminView({ onlineUsersCount = 0 }: { onlineUsersCount?: number; key?: string }) {
  const [stats, setStats] = useState({ profit: 0, refProfit: 0, verifiedUsers: 0, totalOwed: 0, adminProfitAfterPayments: 0 });
  const [usersList, setUsersList] = useState<any[]>([]);
  const [agentPayouts, setAgentPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingTopups, setPendingTopups] = useState<any[]>([]);
  const [allTopups, setAllTopups] = useState<any[]>([]);
  const [selectedProof, setSelectedProof] = useState<any>(null);
  const [showAllUsers, setShowAllUsers] = useState(false);
  const [showAllProofs, setShowAllProofs] = useState(false);
  const [showAllAgentPayouts, setShowAllAgentPayouts] = useState(false);

  const fetchAdminData = async () => {
    try {
      const [profilesRes, topupsRes, referralsRes] = await Promise.all([
        supabase.from('profiles').select('*'),
        supabase.from('topups').select('*').order('created_at', { ascending: false }),
        supabase.from('referrals').select('*')
      ]);

      const profiles = profilesRes.data || [];
      const topups = topupsRes.data || [];
      const referrals = referralsRes.data || [];

      // Enrich topups
      const enrichedTopups = topups.map(pt => {
        const user = profiles.find(p => p.id === pt.user_id);
        return { ...pt, user_name: user?.name || user?.email || 'Unknown User' };
      });
      setAllTopups(enrichedTopups);
      
      const pending = enrichedTopups.filter(t => t.status === 'Pending');
      setPendingTopups(pending);

      let totalProfit = 0;
      topups.forEach(t => {
        if (t.status === 'Approved' || !t.status) {
          totalProfit += Number(t.amount);
        }
      });

      const enrichedUsers = profiles.map(p => {
        const userTopups = topups.filter(t => t.user_id === p.id && (t.status === 'Approved' || !t.status)).reduce((sum, t) => sum + Number(t.amount), 0);
        const userReferrals = referrals.filter(r => r.referrer_id === p.id).length;
        const isVerified = userTopups >= 20;
        return { ...p, status: isVerified ? 'Verified' : 'Active', totalTopups: userTopups, referralCount: userReferrals };
      });

      let totalOwedToAgents = 0;
      let refProfit = 0;

      const calculatedPayouts = enrichedUsers.map(p => {
        if (p.status !== 'Verified') {
          return { ...p, verifiedReferrals: 0, rewardStatus: 'Not Qualified', owedAmount: 0 };
        }
        
        const userReferrals = referrals.filter(r => r.referrer_id === p.id);
        let verifiedReferrals = 0;
        let commission = 0;
        
        userReferrals.forEach(r => {
          const rTopups = topups.filter(t => t.user_id === r.referred_id && (t.status === 'Approved' || !t.status)).reduce((sum, t) => sum + Number(t.amount), 0);
          if (rTopups >= 20) {
            verifiedReferrals++;
            commission += (rTopups * 0.5);
            refProfit += (rTopups * 0.5); // Admin logic backwards compatibility
          }
        });
        
        let owedAmount = 0;
        let rewardStatus = '';
        if (verifiedReferrals >= 15) {
          rewardStatus = 'Completed Program (15+)';
          owedAmount = 160; // 60 + 100
        } else if (verifiedReferrals >= 10) {
          rewardStatus = '10 Referrals Cashout';
          owedAmount = 60;
        } else if (verifiedReferrals > 0) {
          rewardStatus = '50% Commission';
          owedAmount = commission;
        } else {
          rewardStatus = 'No Verified Referrals';
          owedAmount = 0;
        }
        
        totalOwedToAgents += owedAmount;
        return { ...p, verifiedReferrals, rewardStatus, owedAmount };
      });

      const verifiedCount = enrichedUsers.filter(p => p.status === 'Verified').length;
      const adminProfitAfterPayments = totalProfit - totalOwedToAgents;

      setStats({
        profit: totalProfit,
        refProfit: refProfit,
        verifiedUsers: verifiedCount,
        totalOwed: totalOwedToAgents,
        adminProfitAfterPayments
      });

      setUsersList(enrichedUsers);
      setAgentPayouts(calculatedPayouts.filter(p => p.owedAmount > 0 || p.verifiedReferrals > 0));
    } catch (error: any) {
      console.error('Detailed Error fetching admin data:', {
        message: error?.message || 'Unknown error',
        code: error?.code || 'N/A',
        details: error?.details || '',
        hint: error?.hint || '',
        fullError: error
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleReviewTopup = async (id: string, newStatus: 'Approved' | 'Rejected') => {
    try {
      await supabase
        .from('topups')
        .update({ status: newStatus })
        .eq('id', id);
        
      setPendingTopups(prev => prev.filter(pt => pt.id !== id));
      setSelectedProof(null);
      fetchAdminData();
    } catch (err: any) {
      console.error('Detailed Error updating topup status:', {
        message: err?.message || 'Unknown error',
        code: err?.code || 'N/A',
        details: err?.details || '',
        hint: err?.hint || '',
        fullError: err
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">Monitor live platform statistics and user activity.</p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 mb-6">
        {[
          { title: 'Total Platform Revenue', value: `R ${stats.profit.toFixed(2)}`, icon: Wallet, color: 'text-gray-600', bg: 'bg-gray-100' },
          { title: 'Total Owed to Agents', value: `R ${stats.totalOwed.toFixed(2)}`, icon: Gift, color: 'text-red-600', bg: 'bg-red-100' },
          { title: 'Net Profit (After Payouts)', value: `R ${stats.adminProfitAfterPayments.toFixed(2)}`, icon: Wallet, color: 'text-green-600', bg: 'bg-green-100' },
          { title: 'Live Verified Active Users', value: stats.verifiedUsers.toString(), icon: UserCheck, color: 'text-indigo-600', bg: 'bg-indigo-100' },
          { title: 'Live Online Visits', value: onlineUsersCount.toString(), icon: Eye, color: 'text-purple-600', bg: 'bg-purple-100' },
          { title: 'Commission Generated (50%)', value: `R ${stats.refProfit.toFixed(2)}`, icon: Coins, color: 'text-blue-600', bg: 'bg-blue-100' },
        ].map((stat, idx) => (
          <div key={idx} className="bg-white overflow-hidden shadow rounded-lg border border-gray-100">
            <div className="p-5">
              <div className="flex items-center">
                <div className={`flex-shrink-0 p-3 rounded-md ${stat.bg}`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} aria-hidden="true" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">{stat.title}</dt>
                    <dd>
                      <div className="text-xl font-semibold text-gray-900 mt-1">{stat.value}</div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pending Topups Section */}
      {pendingTopups.length > 0 && (
        <div className="bg-white shadow sm:rounded-lg border border-yellow-200 overflow-hidden mb-6">
          <div className="px-4 py-5 border-b border-gray-200 sm:px-6 bg-yellow-50 flex justify-between items-center">
            <h3 className="text-lg leading-6 font-medium text-yellow-900 flex items-center">
               <Wallet className="w-5 h-5 mr-2 text-yellow-600" /> Pending Topup Approvals ({pendingTopups.length})
            </h3>
          </div>
          <ul className="divide-y divide-gray-200 max-h-[400px] overflow-y-auto">
            {pendingTopups.map((pt, idx) => (
              <li key={idx} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                <div>
                  <p className="text-sm font-medium text-gray-900">{pt.user_name}</p>
                  <p className="text-sm text-gray-500">Requested: R {Number(pt.amount).toFixed(2)} ({Number(pt.amount) * 100}c)</p>
                  <p className="text-xs text-gray-400">{new Date(pt.created_at).toLocaleString()}</p>
                </div>
                <button
                  onClick={() => setSelectedProof(pt)}
                  className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Eye className="w-4 h-4 mr-2 text-gray-400" /> View Proof
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Topup History / All Proofs */}
      <div className="bg-white shadow sm:rounded-lg border border-gray-100 overflow-hidden mb-6">
        <div className="px-4 py-5 border-b border-gray-200 sm:px-6 flex justify-between items-center">
          <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center">
             <Wallet className="w-5 h-5 mr-2 text-gray-500" /> Payment Proofs
          </h3>
          <button onClick={() => setShowAllProofs(true)} className="text-sm text-blue-600 font-medium hover:text-blue-500 flex items-center">
             View All <ArrowRight className="w-4 h-4 ml-1" />
          </button>
        </div>
        <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Proof</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {allTopups.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">No topups found</td></tr>
              ) : allTopups.map((topup, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{topup.user_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">R {Number(topup.amount).toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(topup.created_at).toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      topup.status === 'Approved' ? 'bg-green-100 text-green-800' : 
                      topup.status === 'Rejected' ? 'bg-red-100 text-red-800' : 
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {topup.status || 'Approved'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {topup.proof_url ? (
                      <button
                        onClick={() => setSelectedProof(topup)}
                        className="text-blue-600 hover:text-blue-900 bg-blue-50 px-3 py-1 rounded-md"
                      >
                        View Proof
                      </button>
                    ) : (
                      <span className="text-gray-400 italic">No proof</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Proof Review Modal */}
      <AnimatePresence>
        {selectedProof && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex flex-col bg-black/90 backdrop-blur-sm"
          >
            <div className="flex items-center justify-between p-4 bg-black/50 text-white border-b border-white/10">
              <div>
                <h3 className="text-lg font-medium">Review Payment Proof</h3>
                <p className="text-sm text-gray-300">
                  {selectedProof.user_name} • R {Number(selectedProof.amount).toFixed(2)}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button 
                  onClick={() => {
                    const elem = document.getElementById('proof-container');
                    if (elem && elem.requestFullscreen) {
                      elem.requestFullscreen();
                    }
                  }}
                  className="p-2 bg-gray-800 hover:bg-gray-700 rounded-full transition-colors flex items-center justify-center group relative"
                  title="View Full Screen"
                >
                  <Maximize className="w-5 h-5" />
                  <span className="absolute -bottom-8 bg-gray-900 text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity">Full Screen</span>
                </button>
                <button 
                  onClick={() => setSelectedProof(null)}
                  className="p-2 bg-gray-800 hover:bg-gray-700 rounded-full transition-colors"
                  title="Close"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div id="proof-container" className="flex-1 overflow-auto p-4 flex items-center justify-center bg-black/90">
              {selectedProof.proof_url ? (
                selectedProof.proof_url.endsWith('.pdf') || selectedProof.proof_url.startsWith('data:application/pdf') ? (
                  <iframe src={selectedProof.proof_url} className="w-full max-w-4xl h-full bg-white rounded-lg" />
                ) : (
                  <img src={selectedProof.proof_url} alt="Proof of payment" className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" />
                )
              ) : (
                <div className="text-gray-400">No proof URL provided</div>
              )}
            </div>

            {selectedProof.status === 'Pending' && (
              <div className="p-6 bg-black/50 flex flex-col sm:flex-row justify-center items-center gap-4 border-t border-white/10">
                <button
                  onClick={() => handleReviewTopup(selectedProof.id, 'Rejected')}
                  className="w-full sm:w-auto px-8 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg shadow-lg transition-colors flex justify-center items-center"
                >
                  Reject Payment
                </button>
                <button
                  onClick={() => handleReviewTopup(selectedProof.id, 'Approved')}
                  className="w-full sm:w-auto px-8 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg shadow-lg transition-colors flex justify-center items-center"
                >
                  Approve & Credit Coins
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white shadow sm:rounded-lg border border-gray-100 overflow-hidden mb-6">
        <div className="px-4 py-5 border-b border-gray-200 sm:px-6 flex justify-between items-center">
          <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center">
            <Gift className="w-5 h-5 mr-2 text-gray-500" /> Agent Payouts
          </h3>
          <button onClick={() => setShowAllAgentPayouts(true)} className="text-sm text-blue-600 font-medium hover:text-blue-500 flex items-center">
             View All <ArrowRight className="w-4 h-4 ml-1" />
          </button>
        </div>
        <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Agent</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Verified Referrals</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reward Status</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount Owed</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {agentPayouts.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">No agent payouts found</td></tr>
              ) : agentPayouts.map((agent, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{agent.name || 'Unknown User'}</div>
                    <div className="text-sm text-gray-500">{agent.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{agent.verifiedReferrals}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      agent.rewardStatus.includes('Completed') ? 'bg-purple-100 text-purple-800' : 
                      agent.rewardStatus.includes('Cashout') ? 'bg-green-100 text-green-800' : 
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {agent.rewardStatus}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    R {agent.owedAmount.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white shadow sm:rounded-lg border border-gray-100 overflow-hidden">
        <div className="px-4 py-5 border-b border-gray-200 sm:px-6 flex justify-between items-center">
          <h3 className="text-lg leading-6 font-medium text-gray-900">User Monitoring</h3>
          <button onClick={() => setShowAllUsers(true)} className="text-sm text-blue-600 font-medium hover:text-blue-500 flex items-center">
             View All <ArrowRight className="w-4 h-4 ml-1" />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Topups</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Referrals</th>
                <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">Loading...</td></tr>
              ) : usersList.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">No users found</td></tr>
              ) : usersList.map((user, idx) => (
                <tr key={idx}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-medium uppercase">
                        {user.name ? user.name.charAt(0) : user.email?.charAt(0) || '?'}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{user.name || 'Unknown User'}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      user.status === 'Verified' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {user.status || 'Active'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">R {user.totalTopups.toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.referralCount}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button className="text-gray-400 hover:text-gray-500">
                      <MoreVertical className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* All Users Modal */}
      <AnimatePresence>
        {showAllUsers && (
          <motion.div
            id="all-users-container"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex flex-col bg-gray-50 backdrop-blur-sm"
          >
            <div className="flex items-center justify-between p-4 bg-white text-gray-900 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-medium">All Users</h3>
                <p className="text-sm text-gray-500">
                  {usersList.length} total users
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button 
                  onClick={() => {
                    const elem = document.getElementById('all-users-container');
                    if (elem && elem.requestFullscreen) {
                      elem.requestFullscreen();
                    }
                  }}
                  className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors flex items-center justify-center group relative"
                  title="View Full Screen"
                >
                  <Maximize className="w-5 h-5 text-gray-600" />
                  <span className="absolute -bottom-8 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity">Full Screen</span>
                </button>
                <button 
                  onClick={() => {
                    if (document.fullscreenElement) {
                      document.exitFullscreen();
                    }
                    setShowAllUsers(false);
                  }}
                  className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
                  title="Close"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-auto bg-white">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Topups</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Referrals</th>
                    <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loading ? (
                    <tr><td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">Loading...</td></tr>
                  ) : usersList.length === 0 ? (
                    <tr><td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">No users found</td></tr>
                  ) : usersList.map((user, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-medium uppercase">
                            {user.name ? user.name.charAt(0) : user.email?.charAt(0) || '?'}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{user.name || 'Unknown User'}</div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          user.status === 'Verified' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {user.status || 'Active'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">R {user.totalTopups.toFixed(2)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.referralCount}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button className="text-gray-400 hover:text-gray-500">
                          <MoreVertical className="h-5 w-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* All Proofs Modal */}
      <AnimatePresence>
        {showAllProofs && (
          <motion.div
            id="all-proofs-container"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex flex-col bg-gray-50 backdrop-blur-sm"
          >
            <div className="flex items-center justify-between p-4 bg-white text-gray-900 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-medium">Payment Proofs</h3>
                <p className="text-sm text-gray-500">
                  {allTopups.length} total proofs
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button 
                  onClick={() => {
                    const elem = document.getElementById('all-proofs-container');
                    if (elem && elem.requestFullscreen) {
                      elem.requestFullscreen();
                    }
                  }}
                  className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors flex items-center justify-center group relative"
                  title="View Full Screen"
                >
                  <Maximize className="w-5 h-5 text-gray-600" />
                  <span className="absolute -bottom-8 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity">Full Screen</span>
                </button>
                <button 
                  onClick={() => {
                    if (document.fullscreenElement) {
                      document.exitFullscreen();
                    }
                    setShowAllProofs(false);
                  }}
                  className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
                  title="Close"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-auto bg-white">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Proof</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {allTopups.length === 0 ? (
                    <tr><td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">No topups found</td></tr>
                  ) : allTopups.map((topup, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{topup.user_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">R {Number(topup.amount).toFixed(2)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(topup.created_at).toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          topup.status === 'Approved' ? 'bg-green-100 text-green-800' : 
                          topup.status === 'Rejected' ? 'bg-red-100 text-red-800' : 
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {topup.status || 'Approved'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {topup.proof_url ? (
                          <button
                            onClick={() => setSelectedProof(topup)}
                            className="text-blue-600 hover:text-blue-900 bg-blue-50 px-3 py-1 rounded-md"
                          >
                            View Proof
                          </button>
                        ) : (
                          <span className="text-gray-400 italic">No proof</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* All Agent Payouts Modal */}
      <AnimatePresence>
        {showAllAgentPayouts && (
          <motion.div
            id="all-agent-payouts-container"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex flex-col bg-gray-50 backdrop-blur-sm"
          >
            <div className="flex items-center justify-between p-4 bg-white text-gray-900 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-medium">Agent Payouts</h3>
                <p className="text-sm text-gray-500">
                  {agentPayouts.length} total payouts
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button 
                  onClick={() => {
                    const elem = document.getElementById('all-agent-payouts-container');
                    if (elem && elem.requestFullscreen) {
                      elem.requestFullscreen();
                    }
                  }}
                  className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors flex items-center justify-center group relative"
                  title="View Full Screen"
                >
                  <Maximize className="w-5 h-5 text-gray-600" />
                  <span className="absolute -bottom-8 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity">Full Screen</span>
                </button>
                <button 
                  onClick={() => {
                    if (document.fullscreenElement) {
                      document.exitFullscreen();
                    }
                    setShowAllAgentPayouts(false);
                  }}
                  className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
                  title="Close"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-auto bg-white">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Agent</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Verified Referrals</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reward Status</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount Owed</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {agentPayouts.length === 0 ? (
                    <tr><td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">No agent payouts found</td></tr>
                  ) : agentPayouts.map((agent, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{agent.name || 'Unknown User'}</div>
                        <div className="text-sm text-gray-500">{agent.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{agent.verifiedReferrals}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          agent.rewardStatus.includes('Completed') ? 'bg-purple-100 text-purple-800' : 
                          agent.rewardStatus.includes('Cashout') ? 'bg-green-100 text-green-800' : 
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {agent.rewardStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        R {agent.owedAmount.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function ReferralView({ userId }: { userId: string; key?: string }) {
  const [copied, setCopied] = useState(false);
  const [stats, setStats] = useState({ verifiedCount: 0, pendingRewards: 0, isCurrentUserVerified: false });
  const [activity, setActivity] = useState<any[]>([]);
  const referralLink = `https://platform.example.com/ref/${userId.substring(0, 8)}`;

  useEffect(() => {
    const fetchReferralData = async () => {
      try {
        // Fetch referrals where this user is the referrer
        const { data: referrals } = await supabase
          .from('referrals')
          .select('*, referred:profiles!referrals_referred_id_fkey(name, status)')
          .eq('referrer_id', userId);

        if (!referrals) return;

        // Fetch topups for all referred users AND the current user
        const referredIds = referrals.map(r => r.referred_id);
        const { data: topups } = await supabase
          .from('topups')
          .select('*')
          .in('user_id', [...referredIds, userId]);

        const topupsData = topups || [];
        
        // Check if current user is verified (has topped up >= 20)
        const currentUserTopups = topupsData.filter(t => t.user_id === userId && (t.status === 'Approved' || !t.status));
        const currentUserTotalTopups = currentUserTopups.reduce((sum, t) => sum + Number(t.amount), 0);
        const isCurrentUserVerified = currentUserTotalTopups >= 20;

        let verifiedCount = 0;
        let commissionRewards = 0;

        let enrichedActivity = referrals.map(r => {
          const userTopups = topupsData.filter(t => t.user_id === r.referred_id && (t.status === 'Approved' || !t.status));
          const totalTopups = userTopups.reduce((sum, t) => sum + Number(t.amount), 0);
          
          const isVerified = totalTopups >= 20;
          if (isVerified) verifiedCount++;

          const reward = totalTopups * 0.5;
          if (isVerified && isCurrentUserVerified) commissionRewards += reward;

          return {
            name: r.referred?.name || 'Unknown User',
            date: new Date(r.created_at).toLocaleDateString(),
            status: isVerified ? 'Completed' : 'Pending',
            reward: isVerified 
              ? (isCurrentUserVerified ? `+R ${(reward).toFixed(2)}` : 'Not Qualified') 
              : 'Pending Topup',
            rawReward: reward
          };
        });

        let pendingRewards = 0;
        if (isCurrentUserVerified) {
          if (verifiedCount >= 10) {
            // agent that cashout at 10 referrals dont qualify for 50% topups
            pendingRewards = 60; // 10 referrals milestone
            if (verifiedCount >= 15) pendingRewards += 100; // 15 referrals milestone
            
            // Update UI to show they don't get the commission anymore
            enrichedActivity = enrichedActivity.map(a => ({
              ...a,
              reward: a.status === 'Completed' ? 'Included in Cashout' : a.reward
            }));
          } else {
            pendingRewards = commissionRewards;
          }
        }

        setStats({ verifiedCount, pendingRewards, isCurrentUserVerified });
        setActivity(enrichedActivity);
      } catch (err: any) {
        console.error('Detailed Error fetching referral data:', {
          message: err?.message || 'Unknown error',
          code: err?.code || 'N/A',
          details: err?.details || '',
          hint: err?.hint || '',
          fullError: err
        });
      }
    };
    fetchReferralData();
  }, [userId]);

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Referral Program</h1>
        <p className="mt-1 text-sm text-gray-500">Invite users and earn rewards for successful verified referrals with topups.</p>
      </div>

      {!stats.isCurrentUserVerified && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                <strong>Attention:</strong> You must topup R20.00 and up to qualify as a verified user and earn rewards from your referrals.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white shadow sm:rounded-lg border border-gray-100 overflow-hidden">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Your Referral Link</h3>
              <div className="mt-2 max-w-xl text-sm text-gray-500">
                <p>Share this link with your network. Earn bonuses based on verified signups and topups.</p>
              </div>
              <div className="mt-5 sm:flex sm:items-center">
                <div className="w-full relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <LinkIcon className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    name="referral-link"
                    id="referral-link"
                    className="focus:ring-green-500 focus:border-green-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-2 px-3 border bg-gray-50"
                    value={referralLink}
                    readOnly
                  />
                </div>
                <button
                  type="button"
                  onClick={handleCopy}
                  className={`mt-3 w-full inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm font-medium rounded-md text-white sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm transition-colors ${
                    copied ? 'bg-gray-600 hover:bg-gray-700' : 'bg-green-600 hover:bg-green-700'
                  } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500`}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  {copied ? 'Copied!' : 'Copy Link'}
                </button>
              </div>
            </div>
            <div className="bg-gray-50 px-4 py-4 sm:px-6 border-t border-gray-200">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">Verified Referrals: <strong className="text-gray-900">{stats.verifiedCount}</strong></span>
                <span className="text-gray-500 font-medium flex items-center">
                  Pending Rewards: 
                  <strong className="text-lg text-transparent bg-clip-text bg-gradient-to-r from-green-500 to-emerald-600 ml-1.5 font-bold tracking-tight">
                    R {stats.pendingRewards.toFixed(2)}
                  </strong>
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white shadow sm:rounded-lg border border-gray-100 p-6">
             <div className="flex justify-between items-center mb-4">
               <h3 className="text-lg leading-6 font-medium text-gray-900">Recent Activity</h3>
               <button 
                 className="text-sm text-blue-600 hover:text-blue-500 font-medium disabled:opacity-50" 
                 disabled={stats.verifiedCount < 10 || !stats.isCurrentUserVerified}
                 title={!stats.isCurrentUserVerified ? 'You must top up R20 to cashout' : stats.verifiedCount < 10 ? 'Reach 10 verified users to cashout' : 'Cashout now'}
               >
                 Cashout
               </button>
             </div>
             {activity.length === 0 ? (
               <div className="text-center py-6 text-gray-500 text-sm">
                 No referral activity yet. Share your link to get started!
               </div>
             ) : (
               <div className="flow-root">
                 <ul className="-mb-8">
                   {activity.map((event, eventIdx) => (
                     <li key={eventIdx}>
                       <div className="relative pb-8">
                         {eventIdx !== activity.length - 1 ? (
                           <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
                         ) : null}
                         <div className="relative flex space-x-3">
                           <div>
                             <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${event.status === 'Completed' ? 'bg-green-500' : 'bg-gray-400'}`}>
                               <Users className="h-4 w-4 text-white" aria-hidden="true" />
                             </span>
                           </div>
                           <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                             <div>
                               <p className="text-sm text-gray-500">
                                 Referred <span className="font-medium text-gray-900">{event.name}</span>
                               </p>
                             </div>
                             <div className="text-right text-sm whitespace-nowrap text-gray-500">
                               <time dateTime={event.date}>{event.date}</time>
                               <p className={`font-medium mt-0.5 ${event.status === 'Completed' ? 'text-green-600' : 'text-gray-500'}`}>
                                 {event.reward}
                               </p>
                             </div>
                           </div>
                         </div>
                       </div>
                     </li>
                   ))}
                 </ul>
               </div>
             )}
          </div>
        </div>

        <div className="bg-white shadow sm:rounded-lg border border-gray-100 p-6 self-start">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4 flex items-center">
            <Gift className="w-5 h-5 mr-2 text-green-500" /> Reward Rules
          </h3>
          <ul className="space-y-4 text-sm text-gray-600">
            <li className="flex items-start">
              <div className="flex-shrink-0 h-5 w-5 rounded-full bg-green-100 flex items-center justify-center mt-0.5">
                <span className="text-green-600 font-bold text-xs">1</span>
              </div>
              <p className="ml-3">
                <strong className="text-gray-900">10 Verified Users</strong><br/>
                Reach 10 verified referrals with topups to unlock cashout and receive a <strong>R60.00</strong> bonus.
              </p>
            </li>
            <li className="flex items-start">
              <div className="flex-shrink-0 h-5 w-5 rounded-full bg-green-100 flex items-center justify-center mt-0.5">
                <span className="text-green-600 font-bold text-xs">2</span>
              </div>
              <p className="ml-3">
                <strong className="text-gray-900">15 Verified Users</strong><br/>
                Reach 15 verified referrals with topups to receive <strong>R100.00 weekly</strong>.
              </p>
            </li>
            <li className="flex items-start">
              <div className="flex-shrink-0 h-5 w-5 rounded-full bg-blue-100 flex items-center justify-center mt-0.5">
                <span className="text-blue-600 font-bold text-xs">%</span>
              </div>
              <p className="ml-3">
                <strong className="text-gray-900">50% Commission</strong><br/>
                Earn 50% commission on all topup amounts from your verified referrals.
              </p>
            </li>
          </ul>
        </div>
      </div>
    </motion.div>
  );
}

const COIN_OPTIONS = [
  { coins: 500, price: 5 },
  { coins: 1000, price: 10 },
  { coins: 2000, price: 20 },
  { coins: 3000, price: 30 },
  { coins: 4000, price: 40 },
  { coins: 5000, price: 50 },
  { coins: 6000, price: 60 },
  { coins: 8000, price: 80 },
  { coins: 10000, price: 100 },
];

function WalletView({ userId }: { userId: string; key?: string }) {
  const [view, setView] = useState<'overview' | 'topup' | 'payment'>('overview');
  const [selectedOption, setSelectedOption] = useState<{coins: number, price: number} | null>(null);
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reviewMessage, setReviewMessage] = useState('');

  useEffect(() => {
    if (view === 'overview') {
      fetchWalletData();
    }
  }, [view, userId]);

  const fetchWalletData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('topups')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const topups = data || [];
      const approvedTopups = topups.filter(t => t.status === 'Approved' || !t.status);
      const totalAmount = approvedTopups.reduce((sum, t) => sum + Number(t.amount), 0);
      setBalance(totalAmount * 100);
      setTransactions(topups);
    } catch (err: any) {
      console.error('Detailed Error fetching wallet data:', {
        message: err?.message || 'Unknown error',
        code: err?.code || 'N/A',
        details: err?.details || '',
        hint: err?.hint || '',
        fullError: err
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile || !selectedOption) return;

    setIsSubmitting(true);
    setReviewMessage('Uploading proof of payment...');
    
    try {
      let proofUrl = '';
      
      if (uploadFile.type.startsWith('image/')) {
        proofUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
              const canvas = document.createElement('canvas');
              let width = img.width;
              let height = img.height;
              const MAX_SIZE = 1000;
              
              if (width > height && width > MAX_SIZE) {
                height *= MAX_SIZE / width;
                width = MAX_SIZE;
              } else if (height > MAX_SIZE) {
                width *= MAX_SIZE / height;
                height = MAX_SIZE;
              }
              
              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext('2d');
              ctx?.drawImage(img, 0, 0, width, height);
              resolve(canvas.toDataURL('image/jpeg', 0.8));
            };
            img.onerror = reject;
            img.src = e.target?.result as string;
          };
          reader.onerror = reject;
          reader.readAsDataURL(uploadFile);
        });
      } else {
        // For PDFs or other files
        const reader = new FileReader();
        proofUrl = await new Promise((resolve, reject) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(uploadFile);
        });
      }

      setReviewMessage('Submitting topup request...');

      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { error: insertError } = await supabase.from('topups').insert({
        user_id: user.id,
        amount: selectedOption.price,
        status: 'Pending',
        proof_url: proofUrl
      });
      
      if (insertError) {
        console.error('Insert error:', insertError);
        setReviewMessage(`Database Error: Please run the SQL migration in your Supabase dashboard to add 'status' and 'proof_url' columns to the 'topups' table. Error: ${insertError.message}`);
        setIsSubmitting(false);
        return;
      }
      
      setReviewMessage('Your proof of payment has been submitted for review. Coins will be credited once approved.');
      
      setTimeout(() => {
        setReviewMessage('');
        setIsSubmitting(false);
        setUploadFile(null);
        setSelectedOption(null);
        setView('overview');
      }, 2500);
      
    } catch (err: any) {
      console.error('Detailed Error submitting topup:', {
        message: err?.message || 'Unknown error',
        code: err?.code || 'N/A',
        details: err?.details || '',
        hint: err?.hint || '',
        fullError: err
      });
      setReviewMessage('Failed to submit. Please try again.');
      setIsSubmitting(false);
    }
  };

  if (view === 'payment' && selectedOption) {
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="max-w-xl mx-auto space-y-6"
      >
        <div className="flex items-center space-x-4">
          <button onClick={() => setView('topup')} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Complete Payment</h1>
            <p className="mt-1 text-sm text-gray-500">Pay via bank transfer and upload proof.</p>
          </div>
        </div>

        {reviewMessage ? (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-6 rounded-lg text-center shadow-sm">
            <div className="flex justify-center mb-4"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
            <p className="font-medium text-lg">{reviewMessage}</p>
            <p className="text-sm mt-2 text-blue-600">Redirecting to wallet...</p>
          </div>
        ) : (
          <div className="bg-white shadow sm:rounded-lg border border-gray-100 overflow-hidden">
            <div className="px-4 py-5 sm:p-6 space-y-6">
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="text-sm font-medium text-gray-700 uppercase tracking-wide mb-3">Bank Details (Capitec)</h3>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Account Name:</dt>
                    <dd className="font-medium text-gray-900">Matthews</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Account Number:</dt>
                    <dd className="font-medium text-gray-900 font-mono">1334067366</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Amount Due:</dt>
                    <dd className="font-medium text-gray-900">R {selectedOption.price.toFixed(2)}</dd>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-gray-200">
                    <dt className="text-gray-900 font-medium">Reference:</dt>
                    <dd className="font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{selectedOption.coins}c</dd>
                  </div>
                </dl>
                <p className="text-xs text-red-500 mt-3 font-medium">* Ensure you use exactly this reference so we can allocate your coins.</p>
              </div>

              <form onSubmit={handlePaymentSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Upload Proof of Payment</label>
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md bg-white">
                    <div className="space-y-1 text-center">
                      <Upload className="mx-auto h-12 w-12 text-gray-400" />
                      <div className="flex text-sm text-gray-600 justify-center">
                        <label
                          htmlFor="file-upload"
                          className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                        >
                          <span>{uploadFile ? uploadFile.name : 'Upload a file'}</span>
                          <input id="file-upload" name="file-upload" type="file" className="sr-only" accept="image/*,.pdf" onChange={(e) => setUploadFile(e.target.files?.[0] || null)} required />
                        </label>
                      </div>
                      <p className="text-xs text-gray-500">PNG, JPG, PDF up to 5MB</p>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!uploadFile || isSubmitting}
                  className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Submit Payment for Review'}
                </button>
              </form>
            </div>
          </div>
        )}
      </motion.div>
    );
  }

  if (view === 'topup') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="max-w-4xl mx-auto space-y-6"
      >
        <div className="flex items-center space-x-4">
          <button onClick={() => setView('overview')} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Topup Coins</h1>
            <p className="mt-1 text-sm text-gray-500">Select a coin package to purchase.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {COIN_OPTIONS.map((opt, idx) => (
            <div 
              key={idx} 
              onClick={() => {
                setSelectedOption(opt);
                setView('payment');
              }}
              className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md hover:border-purple-300 transition-all cursor-pointer overflow-hidden group"
            >
              <div className="p-6 text-center space-y-4">
                <div className="w-16 h-16 mx-auto bg-purple-50 rounded-full flex items-center justify-center group-hover:bg-purple-100 transition-colors">
                  <Coins className="w-8 h-8 text-purple-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{opt.coins}c</div>
                  <div className="text-sm font-medium text-gray-500 mt-1">For only</div>
                </div>
                <div className="text-xl font-bold text-green-600">
                  R {opt.price.toFixed(2)}
                </div>
              </div>
              <div className="bg-gray-50 px-6 py-3 border-t border-gray-100 text-center text-sm font-medium text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                Select Package
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className="space-y-6 max-w-5xl mx-auto"
    >
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Wallet</h1>
        <p className="mt-1 text-sm text-gray-500">Manage your coins and view transaction history.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <div className="bg-white shadow sm:rounded-lg border border-gray-100 overflow-hidden text-center p-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-100 mb-4">
              <Wallet className="w-8 h-8 text-purple-600" />
            </div>
            <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Coin Balance</h2>
            <div className="mt-2 text-4xl font-extrabold text-gray-900 flex items-center justify-center">
              {loading ? <Loader2 className="w-6 h-6 animate-spin text-gray-400" /> : balance}
              {!loading && <span className="text-xl text-purple-500 ml-1">c</span>}
            </div>
            
            <button
              onClick={() => setView('topup')}
              className="mt-8 w-full inline-flex items-center justify-center px-4 py-2.5 border border-transparent shadow-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors"
            >
              <Plus className="w-5 h-5 mr-2" /> Topup Coins
            </button>
          </div>
        </div>

        <div className="md:col-span-2">
          <div className="bg-white shadow sm:rounded-lg border border-gray-100 overflow-hidden">
            <div className="px-4 py-5 border-b border-gray-200 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Recent Transactions</h3>
            </div>
            {loading ? (
              <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin text-gray-400 mx-auto" /></div>
            ) : transactions.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm">No transactions yet.</div>
            ) : (
              <ul className="divide-y divide-gray-200 max-h-[400px] overflow-y-auto">
                {transactions.map((t, idx) => (
                  <li key={idx} className="px-4 py-4 sm:px-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className={`flex-shrink-0 rounded-full p-2 ${
                          t.status === 'Pending' ? 'bg-yellow-100' : 
                          t.status === 'Rejected' ? 'bg-red-100' : 'bg-green-100'
                        }`}>
                          <Coins className={`h-5 w-5 ${
                            t.status === 'Pending' ? 'text-yellow-600' : 
                            t.status === 'Rejected' ? 'text-red-600' : 'text-green-600'
                          }`} />
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-900">Topup - {(Number(t.amount) * 100)}c</p>
                          <div className="flex items-center gap-2">
                             <p className="text-xs text-gray-500">{new Date(t.created_at).toLocaleString()}</p>
                             {t.status && (
                               <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                                  t.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' : 
                                  t.status === 'Rejected' ? 'bg-red-100 text-red-700' : 
                                  'bg-green-100 text-green-700'
                               }`}>
                                 {t.status}
                               </span>
                             )}
                          </div>
                        </div>
                      </div>
                      <div className="text-sm font-semibold text-gray-900">
                        R {Number(t.amount).toFixed(2)}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}



