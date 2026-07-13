import React, { useState, useEffect, useCallback } from 'react';
import { Shield, Users, ArrowRight, Link as LinkIcon, Copy, Gift, LogOut, Loader2, Wallet, UserCheck, Eye, MoreVertical, Coins, Upload, ArrowLeft, Plus, Maximize, Briefcase, MessageSquare, Search, User, Edit2, Check, ShieldCheck, Bell, MapPin, Phone, Globe, Sparkles, Trash2, Camera, Award, Image as ImageIcon, Lock, X, ChevronRight, Settings, Volume2, VolumeX, SlidersHorizontal, Wifi, WifiOff, BellRing, Clock, Star, CreditCard } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GigsView } from './GigsView';
import { SeekersView } from './SeekersView';
import { ChatView } from './components/ChatView';
import { supabase } from './lib/supabase';
import { Session } from '@supabase/supabase-js';
import { ensureFriendship, sendLocalMessage, fetchUnreadMessageCount, fetchFriendRequests, isFriend, markAllMessagesAsRead } from './lib/chat';
import { getInitials, getAvatarColorClass } from './lib/avatar';
import { playNotificationSound } from './lib/sound';
import {
  sendDesktopNotification,
  setupOfflineListeners
} from './lib/notifications';

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80'
];

type Tab = 'admin' | 'referral' | 'wallet' | 'gigs' | 'chat' | 'seekers' | 'notifications';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('gigs');
  const [activeContactId, setActiveContactId] = useState<string | null>(null);
  const [profileToView, setProfileToView] = useState<any | null>(null);
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
    reward_balance?: number;
  } | null>(null);
  const [showMenuDropdown, setShowMenuDropdown] = useState(false);
  const [notifications, setNotifications] = useState<Array<{ id: string; title: string; body: string; time: string; read: boolean; sourceTab?: Tab }>>([
    {
      id: '1',
      title: 'Welcome to the Platform!',
      body: 'Get started by creating your gig or exploring active seekers in your area.',
      time: 'Just now',
      read: false,
      sourceTab: 'gigs'
    },
    {
      id: '2',
      title: 'Profile Status: Active',
      body: 'Your account is active. To unlock referral rewards, verify your profile with a wallet top-up!',
      time: '2 hours ago',
      read: false,
      sourceTab: 'referral'
    },
    {
      id: '3',
      title: 'Pro Tip: Chat Instantly',
      body: 'You can now coordinate terms and details directly inside the brand-new Chat tab.',
      time: '1 day ago',
      read: true,
      sourceTab: 'chat'
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
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);
  const [profilePrivacy, setProfilePrivacy] = useState<'public' | 'private'>(() => {
    return (localStorage.getItem('profile_privacy') as 'public' | 'private') || 'public';
  });
  const [showSplash, setShowSplash] = useState(true);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [unreadRequestsCount, setUnreadRequestsCount] = useState(0);
  const [isDeactivating, setIsDeactivating] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab') as any;
      const idParam = params.get('id');
      
      if (tabParam && ['gigs', 'seekers', 'chat', 'wallet', 'referral'].includes(tabParam)) {
        setActiveTab(tabParam);
        if (idParam) {
          localStorage.setItem('deeplink_id', idParam);
          localStorage.setItem('deeplink_tab', tabParam);
        }
      }
    }
  }, []);

  const BackgroundPattern = () => (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none select-none opacity-[0.04] blur-[1.5px]">
      <div className="flex flex-wrap gap-x-16 gap-y-12 w-[150%] h-[150%] -translate-x-[20%] -translate-y-[20%] rotate-[-12deg] content-start">
        {Array.from({ length: 400 }).map((_, i) => (
          <span key={i} className="font-space font-bold text-[10px] sm:text-xs whitespace-nowrap text-black">
            TimeGiG
          </span>
        ))}
      </div>
    </div>
  );

  const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean>(() => {
    return localStorage.getItem('has_seen_onboarding') === 'true';
  });

  const [muteSounds, setMuteSounds] = useState<boolean>(() => {
    return localStorage.getItem('mute_sounds') === 'true';
  });
  const [compactLayout, setCompactLayout] = useState<boolean>(() => {
    return localStorage.getItem('compact_layout') === 'true';
  });

  const [notifyChat, setNotifyChat] = useState<boolean>(() => {
    return localStorage.getItem('notify_chat') !== 'false';
  });
  const [notifyGigs, setNotifyGigs] = useState<boolean>(() => {
    return localStorage.getItem('notify_gigs') !== 'false';
  });
  const [notifySeekers, setNotifySeekers] = useState<boolean>(() => {
    return localStorage.getItem('notify_seekers') !== 'false';
  });
  const [notifyProfiles, setNotifyProfiles] = useState<boolean>(() => {
    return localStorage.getItem('notify_profiles') !== 'false';
  });
  const [notifyNetwork, setNotifyNetwork] = useState<boolean>(() => {
    return localStorage.getItem('notify_network') !== 'false';
  });

  const [isOffline, setIsOffline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' ? !navigator.onLine : false;
  });
  const [isInIframe] = useState<boolean>(() => {
    return typeof window !== 'undefined' && window.self !== window.top;
  });

  const [systemTime, setSystemTime] = useState<string>(() => {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setSystemTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const previousRequestIdsRef = React.useRef<string[] | null>(null);
  const notifiedTopupsRef = React.useRef<Record<string, string>>({});

  // Load and process incoming promotions
  const checkAndLoadPromotions = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      // 1. Fetch from Supabase promotions table
      let dbPromotions: any[] = [];
      try {
        const { data, error } = await supabase
          .from('promotions')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (data) dbPromotions = data;
      } catch (err) {
        // Safe fallback
      }

      // 2. Fetch from local fallback
      let localPromotions: any[] = [];
      try {
        localPromotions = JSON.parse(localStorage.getItem('chat_global_promotions') || '[]');
      } catch (err) {
        // Safe fallback
      }

      // 3. Merge lists uniquely
      const allPromos = [...dbPromotions, ...localPromotions];
      
      // Get list of already seen promotion IDs for this user
      const seenKey = `seen_promotion_ids_${session.user.id}`;
      const seenIds: string[] = JSON.parse(localStorage.getItem(seenKey) || '[]');
      
      const newPromos = allPromos.filter(p => p.id && !seenIds.includes(String(p.id)));

      if (newPromos.length > 0) {
        const newNotifications: any[] = [];
        const updatedSeenIds = [...seenIds];

        newPromos.forEach(p => {
          updatedSeenIds.push(String(p.id));
          
          // Play sound
          playNotificationSound('notification');

          // Send desktop notification if configured
          const isEnabled = localStorage.getItem('notify_network') !== 'false';
          if (isEnabled) {
            sendDesktopNotification(`📢 Promo: ${p.title}`, {
              body: p.body,
              tag: `promo-${p.id}`,
            });
          }

          newNotifications.push({
            id: `promo-${p.id}-${Date.now()}`,
            title: `📢 ${p.title}`,
            body: p.body,
            time: 'Just now',
            read: false,
            sourceTab: p.source_tab || undefined
          });
        });

        // Save seen status
        localStorage.setItem(seenKey, JSON.stringify(updatedSeenIds));

        // Update notification state
        setNotifications(prev => [...newNotifications, ...prev]);
      }
    } catch (err) {
      console.warn('Error checking promotions:', err);
    }
  }, [session?.user?.id]);

  const fetchCounts = useCallback(async () => {
    if (!session?.user?.id) return;
    
    // One-time ghost messages cleanup for already registered users
    const fixAppliedKey = `ghost_messages_fix_v5_${session.user.id}`;
    if (!localStorage.getItem(fixAppliedKey)) {
      try {
        await markAllMessagesAsRead(session.user.id);
        localStorage.setItem(fixAppliedKey, 'true');
      } catch (err) {
        console.warn('Ghost fix failed:', err);
      }
    }

    const msgCount = await fetchUnreadMessageCount(session.user.id);
    setUnreadMessagesCount(msgCount);
    
    const requests = await fetchFriendRequests(session.user.id);
    setUnreadRequestsCount(requests.length);

    // Let user receive friend request notifications
    if (previousRequestIdsRef.current !== null) {
      const currentIds = requests.map(r => r.id);
      const newRequests = requests.filter(r => !previousRequestIdsRef.current?.includes(r.id));
      if (newRequests.length > 0) {
        newRequests.forEach(req => {
          const senderName = req.profiles?.name || 'A user';
          
          // Play sound
          playNotificationSound('notification');

          // Desktop notification
          sendDesktopNotification('👥 New Friend Request', {
            body: `${senderName} wants to be friends.`,
            tag: `friend-request-${req.id}`,
          });

          // Append to Notification Center
          setNotifications(prev => [
            {
              id: `friend-req-${req.id}-${Date.now()}`,
              title: '👥 New Friend Request',
              body: `${senderName} wants to be friends. Click here to check your friend requests.`,
              time: 'Just now',
              read: false,
              sourceTab: 'chat'
            },
            ...prev
          ]);
        });
      }
      previousRequestIdsRef.current = currentIds;
    } else {
      previousRequestIdsRef.current = requests.map(r => r.id);
    }

    // Run promotions check
    await checkAndLoadPromotions();
  }, [session?.user?.id, checkAndLoadPromotions]);

  useEffect(() => {
    if (!session?.user?.id) return;

    fetchCounts();
    const interval = setInterval(fetchCounts, 4000);
    return () => clearInterval(interval);
  }, [session?.user?.id, activeTab, fetchCounts]);

  useEffect(() => {
    if (unreadMessagesCount > 0) {
      document.title = `(${unreadMessagesCount}) Messages`;
    } else {
      document.title = 'Job Gigs & Services';
    }
  }, [unreadMessagesCount]);

  const handleDeactivateAccount = async () => {
    if (!session || !profile) return;
    
    const isCurrentlyActive = profile.status !== 'Disabled';
    const confirmMsg = isCurrentlyActive 
      ? "Are you sure you want to disable your account? You won't be discoverable by others."
      : "Would you like to re-enable your account?";
      
    if (!window.confirm(confirmMsg)) return;

    try {
      setIsDeactivating(true);
      const newStatus = isCurrentlyActive ? 'Disabled' : 'Active';
      
      const { error } = await supabase
        .from('profiles')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', session.user.id);
        
      if (error) throw error;
      
      setProfile({ ...profile, status: newStatus });
      fetchProfile();
      alert(`Account ${isCurrentlyActive ? 'disabled' : 'enabled'} successfully.`);
    } catch (err: any) {
      alert('Failed to update account status: ' + err.message);
    } finally {
      setIsDeactivating(false);
    }
  };

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
      const fallbackName = session.user.user_metadata?.display_name || data?.name || parsedLocal.name || session.user.user_metadata?.name || (session.user.email ? session.user.email.split('@')[0] : 'User');

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
        // Auto-sync missing fields (like avatar_url or name) to public.profiles table
        const metadataAvatar = session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture || '';
        const metadataName = session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.user_metadata?.display_name || '';
        
        const updates: any = {};
        if (!data.avatar_url && metadataAvatar) {
          updates.avatar_url = metadataAvatar;
        }
        if (!data.name && metadataName) {
          updates.name = metadataName;
        }
        
        if (Object.keys(updates).length > 0) {
          console.log('Auto-syncing missing profile fields to Supabase DB:', updates);
          const { error: syncError } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', session.user.id);
            
          if (!syncError) {
            if (updates.avatar_url) data.avatar_url = updates.avatar_url;
            if (updates.name) data.name = updates.name;
          } else {
            console.warn('Auto-sync profile failed:', syncError);
          }
        }

        setProfile({
          ...data,
          name: fallbackName,
          avatar_url: data.avatar_url || dbAvatar,
          bio: dbBio,
          location: dbLocation,
          title: dbTitle,
          phone: dbPhone,
          website: dbWebsite,
          skills: dbSkills,
          reward_balance: data.reward_balance || 0,
        });
        setNewName(fallbackName);
      } else {
        // Automatically insert the profile if it is missing in the database completely!
        console.log('Profile missing in DB. Auto-creating profile row...');
        const metadataAvatar = session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture || '';
        const metadataName = session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.user_metadata?.display_name || fallbackName;
        
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: session.user.id,
            email: session.user.email || '',
            name: metadataName,
            avatar_url: metadataAvatar
          });
          
        if (insertError) {
          console.warn('Auto-create profile table row failed:', insertError);
        } else {
          // New registered user - clear any ghost unread counts by marking all as read
          console.log('New user detected, resetting unread counts.');
          markAllMessagesAsRead(session.user.id);
          localStorage.setItem(`ghost_messages_fix_v4_${session.user.id}`, 'true');
        }

        // If profile doesn't exist, just use fallback profile and wait for user to save
        const fallbackProfile = {
          id: session.user.id,
          email: session.user.email || '',
          name: metadataName,
          status: 'Active',
          is_admin: false,
          avatar_url: metadataAvatar || dbAvatar,
          bio: dbBio,
          location: dbLocation,
          title: dbTitle,
          phone: dbPhone,
          website: dbWebsite,
          skills: dbSkills,
          reward_balance: data?.reward_balance || 0
        };
        setProfile(fallbackProfile);
        setNewName(fallbackProfile.name);
      }
    } catch (e: any) {
      console.warn('Profile fetch error, falling back to local/metadata:', e?.message || e);
      const localExtra = localStorage.getItem(`profile_extra_${session.user.id}`);
      const parsedLocal = localExtra ? JSON.parse(localExtra) : {};
      const fallbackName = session.user.user_metadata?.display_name || parsedLocal.name || session.user.user_metadata?.name || (session.user.email ? session.user.email.split('@')[0] : 'User');

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
        skills: dbSkills,
        reward_balance: 0
      };
      setProfile(fallbackProfile);
      setNewName(fallbackProfile.name);
    }
  };

  useEffect(() => {
    const ensureAvatarsBucket = async () => {
      try {
        const { data: buckets } = await supabase.storage.listBuckets();
        const hasAvatars = buckets?.some(b => b.name === 'avatars');
        if (!hasAvatars) {
          await supabase.storage.createBucket('avatars', {
            public: true,
            allowedMimeTypes: ['image/*']
          });
        }
      } catch (e) {
        console.warn('Could not ensure avatars bucket exists:', e);
      }
    };
    ensureAvatarsBucket();

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
        pin_code: dbPin,
        reward_balance: parsedLocal.reward_balance || 0
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

  useEffect(() => {
    if (profile?.status === 'Disabled') {
      setIsOffline(true);
    } else {
      setIsOffline(typeof navigator !== 'undefined' ? !navigator.onLine : false);
    }
  }, [profile?.status]);

  useEffect(() => {
    // Setup the real network online/offline listeners
    const cleanupOffline = setupOfflineListeners(
      () => {
        setIsOffline(true);
        if (localStorage.getItem('notify_network') !== 'false') {
          playNotificationSound('notification');
        }
      },
      () => {
        if (profile?.status !== 'Disabled') {
          setIsOffline(false);
          if (localStorage.getItem('notify_network') !== 'false') {
            playNotificationSound('notification');
          }
        }
      }
    );

    return () => {
      cleanupOffline();
    };
  }, [profile?.status]);

  // Real-time Postgres changes on profiles table to trigger in-app notifications
  useEffect(() => {
    if (!session?.user?.id) return;

    const channel = supabase
      .channel('public-profile-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles'
        },
        (payload) => {
          const updatedProfile = payload.new as any;

          // Trigger a notification if the update belongs to another user
          if (updatedProfile && updatedProfile.id !== session.user.id) {
            const isEnabled = localStorage.getItem('notify_profiles') !== 'false';
            if (isEnabled) {
              sendDesktopNotification('👤 Profile Updated!', {
                body: `${updatedProfile.name || 'A user'} updated their profile display name.`,
                tag: `profile-update-${updatedProfile.id}`,
              });

              // Play notification sound
              playNotificationSound('notification');

              // Also append to the in-app notification center
              setNotifications(prev => [
                {
                  id: String(Date.now()),
                  title: '👤 Profile Updated',
                  body: `${updatedProfile.name || 'A user'} updated their profile display name.`,
                  time: 'Just now',
                  read: false,
                  sourceTab: 'seekers'
                },
                ...prev
              ]);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.user?.id]);

  // Real-time Postgres changes on topups table for Admin to receive notifications whenever a payment (topup) is submitted
  useEffect(() => {
    if (!session?.user?.id) return;
    const isAdmin = profile?.email?.toLowerCase() === '21lucihanomatthews@gmail.com' || session?.user?.email?.toLowerCase() === '21lucihanomatthews@gmail.com';
    if (!isAdmin) return;

    const channel = supabase
      .channel('admin-topup-submissions')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'topups'
        },
        async (payload) => {
          const topup = payload.new as any;
          if (!topup) return;

          // Only notify if it's from another user (to avoid self-notification during admin testing)
          if (topup.user_id === session.user.id) return;

          // Fetch user's name for a better notification message
          let userName = 'A user';
          try {
            const { data } = await supabase
              .from('profiles')
              .select('name')
              .eq('id', topup.user_id)
              .maybeSingle();
            if (data?.name) {
              userName = data.name;
            }
          } catch (err) {
            console.error('Error fetching user name for admin topup notification:', err);
          }

          const notificationTitle = '🪙 New Payment Proof Submitted';
          const notificationBody = `${userName} submitted a payment of R ${Number(topup.amount).toFixed(2)} for review.`;

          sendDesktopNotification(notificationTitle, {
            body: notificationBody,
            tag: `admin-topup-${topup.id}`,
          });

          playNotificationSound('notification');

          setNotifications(prev => [
            {
              id: `admin-topup-notif-${topup.id}-${Date.now()}`,
              title: notificationTitle,
              body: notificationBody,
              time: 'Just now',
              read: false,
              sourceTab: 'admin'
            },
            ...prev
          ]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.user?.id, profile?.email, session?.user?.email]);

  // Real-time Postgres changes on topups table to notify users when their topup status changes
  useEffect(() => {
    if (!session?.user?.id) return;

    const channel = supabase
      .channel(`user-topup-changes-${session.user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'topups',
          filter: `user_id=eq.${session.user.id}`
        },
        (payload) => {
          const topup = payload.new as any;
          if (!topup) return;

          // Check if we already sent notification for this topup status
          if (notifiedTopupsRef.current[topup.id] === topup.status) {
            return; // Already notified for this status
          }
          notifiedTopupsRef.current[topup.id] = topup.status;

          if (topup.status === 'Approved') {
            sendDesktopNotification('🪙 Topup Approved!', {
              body: `Your topup of R ${Number(topup.amount).toFixed(2)} has been Approved! Your coins have been added to your wallet.`,
              tag: `topup-approved-${topup.id}`,
            });

            playNotificationSound('notification');

            setNotifications(prev => [
              {
                id: String(Date.now()),
                title: '🪙 Topup Approved',
                body: `Your topup of R ${Number(topup.amount).toFixed(2)} has been Approved! Your coins have been successfully added to your wallet.`,
                time: 'Just now',
                read: false,
                sourceTab: 'wallet'
              },
              ...prev
            ]);

            fetchProfile();
          } else if (topup.status === 'Rejected') {
            sendDesktopNotification('❌ Topup Rejected', {
              body: `Your topup of R ${Number(topup.amount).toFixed(2)} was rejected. Please review the payment proof or details.`,
              tag: `topup-rejected-${topup.id}`,
            });

            playNotificationSound('notification');

            setNotifications(prev => [
              {
                id: String(Date.now()),
                title: '❌ Topup Rejected',
                body: `Your topup of R ${Number(topup.amount).toFixed(2)} was rejected. Please verify your reference or upload a valid payment proof.`,
                time: 'Just now',
                read: false,
                sourceTab: 'wallet'
              },
              ...prev
            ]);
            
            fetchProfile();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.user?.id]);

  const [showPinSetupForm, setShowPinSetupForm] = useState(false);
  const [newPinInput, setNewPinInput] = useState('');
  const [confirmNewPinInput, setConfirmNewPinInput] = useState('');

  const handleToggleMute = () => {
    const newVal = !muteSounds;
    setMuteSounds(newVal);
    localStorage.setItem('mute_sounds', String(newVal));
    if (!newVal) {
      setTimeout(() => {
        playNotificationSound('notification');
      }, 50);
    }
  };

  const handleToggleCompact = () => {
    const newVal = !compactLayout;
    setCompactLayout(newVal);
    localStorage.setItem('compact_layout', String(newVal));
  };


  const handleDisablePIN = async () => {
    if (!session) return;
    try {
      const confirmDisable = window.confirm('Are you sure you want to disable PIN protection? This will remove your 5-digit security lock.');
      if (!confirmDisable) return;
      
      const { error } = await supabase
        .from('profiles')
        .update({ pin_code: '', updated_at: new Date().toISOString() })
        .eq('id', session.user.id);
        
      if (error) throw error;
      
      setPinCode('');
      setConfirmPin('');
      
      // Update local storage too
      const localExtra = localStorage.getItem(`profile_extra_${session.user.id}`);
      const parsedLocal = localExtra ? JSON.parse(localExtra) : {};
      parsedLocal.pin_code = '';
      localStorage.setItem(`profile_extra_${session.user.id}`, JSON.stringify(parsedLocal));
      
      alert('PIN security disabled successfully!');
      fetchProfile();
    } catch (err: any) {
      alert('Failed to disable PIN: ' + err.message);
    }
  };

  const handleSaveNewPIN = async () => {
    if (!session || !newPinInput || newPinInput !== confirmNewPinInput || newPinInput.length !== 5) return;
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ pin_code: newPinInput, updated_at: new Date().toISOString() })
        .eq('id', session.user.id);
        
      if (error) throw error;
      
      setPinCode(newPinInput);
      setConfirmPin(newPinInput);
      setShowPinSetupForm(false);
      setNewPinInput('');
      setConfirmNewPinInput('');
      
      // Update local storage too
      const localExtra = localStorage.getItem(`profile_extra_${session.user.id}`);
      const parsedLocal = localExtra ? JSON.parse(localExtra) : {};
      parsedLocal.pin_code = newPinInput;
      localStorage.setItem(`profile_extra_${session.user.id}`, JSON.stringify(parsedLocal));
      
      alert('PIN security updated successfully!');
      fetchProfile();
    } catch (err: any) {
      alert('Failed to save PIN: ' + err.message);
    }
  };

  const handleUpdateProfile = async () => {
    if (!session || !newName.trim()) return;

    // PIN validation
    if (pinCode && (pinCode !== confirmPin || pinCode.length !== 5)) {
      alert('Please enter a valid 5-digit PIN and confirm it.');
      return;
    }

    // Name change limit validation (5 times a month)
    const currentName = profile?.name || session.user.user_metadata?.display_name || '';
    let nameChangeHistory: number[] = session.user.user_metadata?.name_change_history || [];
    let nameChanged = false;

    if (newName.trim() !== currentName.trim()) {
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      
      // Filter changes from the current month
      nameChangeHistory = nameChangeHistory.filter((timestamp: number) => {
        const d = new Date(timestamp);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      });
      
      if (nameChangeHistory.length >= 5) {
        alert('You can only change your display name 5 times a month.');
        return;
      }
      
      nameChangeHistory.push(now.getTime());
      nameChanged = true;
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

      // 3. Clean, Single-Step Update to public.profiles
      try {
        // Query one row from profiles to see which columns actually exist in the DB schema
        let existingColumns: string[] = [];
        try {
          const { data: testCols } = await supabase
            .from('profiles')
            .select('*')
            .limit(1);
          if (testCols && testCols.length > 0) {
            existingColumns = Object.keys(testCols[0]);
          } else {
            // Check if we can get columns from the current user's possible existing profile record
            const { data: userRecord } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .maybeSingle();
            if (userRecord) {
              existingColumns = Object.keys(userRecord);
            }
          }
        } catch (colErr) {
          console.warn('Failed to dynamically check profile table columns:', colErr);
        }

        // If we couldn't retrieve existing columns, default to known basic columns
        if (existingColumns.length === 0) {
          existingColumns = ['id', 'name', 'email', 'avatar_url', 'pin_code', 'updated_at'];
        }

        console.log('Detected accessible columns on profiles table:', existingColumns);

        // Build potential fields object
        const potentialFields: any = {
          id: session.user.id,
          name: newName.trim(),
          bio,
          location,
          title,
          phone,
          website,
          skills,
          avatar_url: finalAvatarUrl,
          updated_at: new Date().toISOString(),
        };

        if (pinCode && pinCode.length === 5) {
          potentialFields.pin_code = pinCode;
        }

        if (session.user.email) {
          potentialFields.email = session.user.email;
        }

        // Filter and only keep fields that actually exist in the database table columns
        const fullUpdateData: any = {};
        for (const key of Object.keys(potentialFields)) {
          if (existingColumns.includes(key)) {
            fullUpdateData[key] = potentialFields[key];
          }
        }

        console.log('Upserting schema-safe profile data:', fullUpdateData);

        // Perform ONE clean upsert. This triggers exactly ONE real-time broadcast and never fails due to missing columns.
        const { error: upsertError } = await supabase
          .from('profiles')
          .upsert(fullUpdateData, { onConflict: 'id' });

        if (upsertError) {
          console.error('Database sync failed. Check your RLS policies:', upsertError.message);
          
          // Fallback: Attempt to save ONLY the critical identity fields if the full write fails
          console.log('Attempting minimal profile recovery save...');
          const minimalFields: any = {
            id: session.user.id,
            name: newName.trim(),
            avatar_url: finalAvatarUrl,
          };
          if (existingColumns.includes('pin_code')) {
            minimalFields.pin_code = pinCode;
          }
          await supabase
            .from('profiles')
            .upsert(minimalFields, { onConflict: 'id' });
        } else {
          console.log('Profile and name broadcasted successfully to all users!');
        }

      } catch (dbErr) {
        console.error('Critical database connection error:', dbErr);
      }

      console.log('Profile persistence synchronized');

      console.log('Database operation completed');

      // 4. Save metadata in User Auth (This is often more reliable than public tables)
      const authMetadata: any = {
        display_name: newName.trim(),
        full_name: newName.trim(),
        avatar_url: finalAvatarUrl,
        bio: bio,
        location: location,
        title: title,
        phone: phone,
        website: website,
        skills: skills,
        ...(nameChanged ? { name_change_history: nameChangeHistory } : {})
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
      if (profile) {
        setProfile({
          ...profile,
          name: newName.trim(),
          avatar_url: finalAvatarUrl,
          bio,
          location,
          title,
          phone,
          website,
          skills
        });
      }
      
      setAvatarUrl(finalAvatarUrl);
      setSelectedFile(null);
      
      // Lock the profile if a PIN is set
      if (pinCode && pinCode.length === 5) {
        setIsProfileLocked(true);
        setEnteredPin('');
      }

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
    if (!session?.user?.id) {
      console.warn('Cannot direct to chat: No active session');
      return;
    }
    const currentUserId = session.user.id;
    console.log('Directing to chat with:', contactId);
    try {
      // Switch tab first for perceived speed
      setActiveTab('chat');
      setActiveContactId(contactId);
      
      // Check friendship before sending message
      const friends = await isFriend(currentUserId, contactId);
      if (!friends) {
        alert('You must be friends to chat.');
        return;
      }
      
      // Ensure friendship syncs state
      await ensureFriendship(currentUserId, contactId);
      sendLocalMessage(currentUserId, contactId, starterMessage);
      
      console.log('Successfully initialized chat with:', contactId);
    } catch (err: any) {
      console.error('Detailed Error routing to chat:', err);
    }
  };

  const handleViewProfile = (p: any) => {
    setProfileToView(p);
    setActiveTab('chat');
  };

  const handleAddNotification = useCallback((notif: { title: string; body: string; sourceTab?: Tab }) => {
    setNotifications(prev => [
      {
        id: `custom-notif-${Date.now()}`,
        title: notif.title,
        body: notif.body,
        time: 'Just now',
        read: false,
        sourceTab: notif.sourceTab
      },
      ...prev
    ]);
    sendDesktopNotification(notif.title, {
      body: notif.body,
      tag: `notification-${Date.now()}`
    });
    playNotificationSound('notification');
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession((prevSession) => {
        if (session && event === 'SIGNED_IN' && !prevSession) {
          setActiveTab('gigs');
        }
        return session;
      });
      if (!session) {
        // Fully clear all user-specific states to prevent any glitches on logout
        setProfile(null);
        setActiveTab('gigs');
        setActiveContactId(null);
        setProfileToView(null);
        setUnreadMessagesCount(0);
        setUnreadRequestsCount(0);
        setShowProfileModal(false);
        setShowSettingsModal(false);
        setShowMenuDropdown(false);
        notifiedTopupsRef.current = {};
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session || profile?.status === 'Disabled') return;
    
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
  }, [session, profile?.status]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (!session) {
    return <AuthView />;
  }

  return (
    <>
      <AnimatePresence>
        {fullScreenImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10000] bg-black/95 flex items-center justify-center p-4"
            onClick={() => setFullScreenImage(null)}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                setFullScreenImage(null);
              }}
              className="absolute top-6 right-6 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
            >
              <X className="w-8 h-8" />
            </button>
            <motion.img
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              src={fullScreenImage}
              alt="Profile Full Screen"
              className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSplash && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="fixed inset-0 z-[9999] bg-white flex flex-col items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="flex items-center"
            >
              <h1 className="font-instagram text-4xl sm:text-5xl md:text-6xl tracking-wide text-black select-none">
                TimeGiG
              </h1>
            </motion.div>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "200px" }}
              transition={{ delay: 0.5, duration: 2.5 }}
              className="h-1 bg-black mt-8 rounded-full"
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="h-screen h-[100dvh] w-full bg-gray-50 text-gray-900 font-sans flex flex-col overflow-x-hidden overflow-y-hidden relative">
        <BackgroundPattern />
      {/* Top Bar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 w-full shrink-0">
        {/* Brand Name ontop of the navigation bar */}
        <div className="bg-white border-b border-gray-100 py-2 md:py-2.5 relative">
          <div className="w-full px-4 sm:px-6 lg:px-8 flex justify-between items-center relative">
            {/* Left Slot Spacer to maintain layout balance */}
            <div className="w-10 sm:w-16 h-8 flex items-center" />

            {/* Center Slot: Brand Title */}
            <div className="flex items-center select-none">
              <span className="font-instagram text-2xl sm:text-3xl tracking-wide text-black">
                TimeGiG
              </span>
            </div>

            {/* Right Slot: 3-dot Account menu moved here */}
            <div className="relative z-30">
              <button
                onClick={() => {
                  setShowMenuDropdown(!showMenuDropdown);
                }}
                className="flex items-center space-x-1.5 p-1 pr-1.5 rounded-full border border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50 transition-all duration-300 focus:outline-none shrink-0 shadow-xs"
                title="Account Menu"
              >
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full overflow-hidden bg-gradient-to-tr from-indigo-500 to-blue-600 flex items-center justify-center text-white shrink-0 shadow-xs border border-gray-800">
                  {(showProfileModal ? avatarUrl : profile?.avatar_url) ? (
                    <img 
                      src={showProfileModal ? avatarUrl : profile.avatar_url} 
                      alt="Avatar" 
                      className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity" 
                      referrerPolicy="no-referrer" 
                    />
                  ) : (
                    <span className="text-[10px] sm:text-xs font-bold">
                      {getInitials(profile?.name)}
                    </span>
                  )}
                </div>
                <MoreVertical className="w-3.5 h-3.5 text-indigo-600 hover:text-white transition-colors" />
              </button>

              <AnimatePresence>
                {showMenuDropdown && (
                  <>
                    {/* Backdrop to close */}
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setShowMenuDropdown(false)} 
                    />
                    
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 10 }}
                      className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden text-gray-900"
                    >
                      {/* User Header Info inside dropdown */}
                      <div className="p-3 bg-gray-50/50 border-b border-gray-100 flex items-center space-x-3">
                        <div className={`w-10 h-10 rounded-full overflow-hidden flex items-center justify-center font-bold text-sm shrink-0 border border-white shadow-xs ${getAvatarColorClass(profile?.name)}`}>
                          {profile?.avatar_url ? (
                            <img 
                              src={profile.avatar_url} 
                              alt="Avatar" 
                              className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity" 
                              referrerPolicy="no-referrer" 
                              onClick={(e) => {
                                e.stopPropagation();
                                setFullScreenImage(profile.avatar_url || '');
                              }}
                            />
                          ) : (
                            getInitials(profile?.name)
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-gray-900 truncate">{profile?.name || 'User'}</p>
                          <p className="text-[11px] text-gray-500 truncate">{profile?.email}</p>
                        </div>
                      </div>

                      <div className="p-2">
                        {/* Admin Panel Link */}
                        {(profile?.email?.toLowerCase() === '21lucihanomatthews@gmail.com' || session?.user?.email?.toLowerCase() === '21lucihanomatthews@gmail.com') && (
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
                            <Shield className={`w-4 h-4 ${activeTab === 'admin' ? 'text-indigo-600' : 'text-indigo-600'}`} />
                            <span>Admin Panel</span>
                          </button>
                        )}

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
                          <Wallet className={`w-4 h-4 ${activeTab === 'wallet' ? 'text-indigo-600' : 'text-indigo-600'}`} />
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
                          <User className="w-4 h-4 text-indigo-600" />
                          <span>User Profile</span>
                        </button>
                        
                        <div className="border-t border-gray-100 my-1"></div>

                        {/* Settings */}
                        <button
                          onClick={() => {
                            setShowSettingsModal(true);
                            setShowMenuDropdown(false);
                          }}
                          className="w-full flex items-center space-x-2.5 px-3 py-2.5 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition-colors text-left font-medium"
                        >
                          <Settings className="w-4 h-4 text-indigo-600" />
                          <span>Settings</span>
                        </button>
                        
                        <div className="border-t border-gray-100 my-1"></div>
                        
                        {/* Logout */}
                        <button
                          onClick={async () => {
                            try {
                              await supabase.auth.signOut().catch(() => {});
                            } catch (err: any) {
                              console.error('Error during signout:', err);
                            } finally {
                              // Reset state variables completely
                              setSession(null);
                              setProfile(null);
                              setActiveTab('gigs');
                              setActiveContactId(null);
                              setProfileToView(null);
                              setUnreadMessagesCount(0);
                              setUnreadRequestsCount(0);
                              setShowProfileModal(false);
                              setShowSettingsModal(false);
                              notifiedTopupsRef.current = {};
                              
                              // Clear supabase-specific keys from localStorage
                              const keysToRemove: string[] = [];
                              for (let i = 0; i < localStorage.length; i++) {
                                const key = localStorage.key(i);
                                if (key && (key.includes('supabase') || key.includes('sb-'))) {
                                  keysToRemove.push(key);
                                }
                              }
                              keysToRemove.forEach(key => localStorage.removeItem(key));
                              setShowMenuDropdown(false);
                            }
                          }}
                          className="w-full flex items-center space-x-2.5 px-3 py-2.5 text-sm text-rose-600 hover:bg-rose-50 rounded-lg transition-colors text-left font-medium"
                        >
                          <LogOut className="w-4 h-4 text-rose-600" />
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
        <div className="w-full">
          <div className="flex h-16 justify-between items-center relative bg-white border-b border-gray-100 shadow-sm px-2">
            {/* Nav Tabs */}
            <div className="flex items-center flex-1 py-1">
              <button
                onClick={() => setActiveTab('referral')}
                title="Referral Program"
                className={`transition-all duration-200 focus:outline-none flex flex-col items-center justify-center flex-1 px-1 py-1.5 h-14 rounded-xl border min-w-0 relative ${
                  activeTab === 'referral'
                    ? 'text-emerald-700 bg-emerald-50 border-emerald-200 shadow-xs'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50 border-transparent'
                }`}
              >
                <Gift className={`w-5 h-5 shrink-0 transition-colors ${activeTab === 'referral' ? 'text-indigo-600' : 'text-indigo-600'}`} strokeWidth={2} />
                {activeTab === 'referral' && (
                  <span className="text-[10px] sm:text-xs font-bold leading-tight mt-0.5 select-none truncate">Referral</span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('gigs')}
                title="Gigs"
                className={`transition-all duration-200 focus:outline-none flex flex-col items-center justify-center flex-1 px-1 py-1.5 h-14 rounded-xl border min-w-0 ${
                  activeTab === 'gigs'
                    ? 'text-indigo-700 bg-indigo-50 border-indigo-200 shadow-xs'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50 border-transparent'
                }`}
              >
                <Briefcase className={`w-5 h-5 shrink-0 transition-colors ${activeTab === 'gigs' ? 'text-indigo-600' : 'text-indigo-600'}`} strokeWidth={2} />
                {activeTab === 'gigs' && (
                  <span className="text-[10px] sm:text-xs font-bold leading-tight mt-0.5 select-none truncate">Job Gigs</span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('chat')}
                title="Chat"
                className={`transition-all duration-200 focus:outline-none flex flex-col items-center justify-center flex-1 px-1 py-1.5 h-14 rounded-xl border min-w-0 relative ${
                  activeTab === 'chat'
                    ? 'text-indigo-700 bg-indigo-50 border-indigo-200 shadow-xs'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50 border-transparent'
                }`}
              >
                <MessageSquare className={`w-5 h-5 shrink-0 transition-colors ${activeTab === 'chat' ? 'text-indigo-600' : 'text-indigo-600'}`} strokeWidth={2} />
                <AnimatePresence>
                  {unreadMessagesCount > 0 && (
                    <motion.span 
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.5, opacity: 0 }}
                      className="absolute -top-1 -right-1 min-w-[20px] h-[20px] bg-red-600 text-white text-[11px] font-black rounded-full flex items-center justify-center px-1 border-2 border-white shadow-sm z-10"
                    >
                      {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}
                    </motion.span>
                  )}
                </AnimatePresence>
                {activeTab === 'chat' && (
                  <span className="text-[10px] sm:text-xs font-bold leading-tight mt-0.5 select-none truncate">Messages</span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('notifications')}
                title="Notifications"
                className={`transition-all duration-200 focus:outline-none flex flex-col items-center justify-center flex-1 px-1 py-1.5 h-14 rounded-xl border min-w-0 relative ${
                  activeTab === 'notifications'
                    ? 'text-yellow-700 bg-yellow-50 border-yellow-200 shadow-xs'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50 border-transparent'
                }`}
              >
                <motion.div
                  animate={notifications.some(n => !n.read) ? { rotate: [0, -15, 15, -15, 0] } : {}}
                  transition={notifications.some(n => !n.read) ? { repeat: Infinity, duration: 0.5, ease: "easeInOut" } : {}}
                >
                  <Bell className={`w-5 h-5 shrink-0 transition-colors ${activeTab === 'notifications' ? 'text-indigo-600' : 'text-indigo-600'}`} strokeWidth={2} />
                </motion.div>
                {notifications.some(n => !n.read) && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-rose-500 border border-white" />
                )}
                {activeTab === 'notifications' && (
                  <span className="text-[10px] sm:text-xs font-bold leading-tight mt-0.5 select-none truncate">Notifications</span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('seekers')}
                title="Seekers"
                className={`transition-all duration-200 focus:outline-none flex flex-col items-center justify-center flex-1 px-1 py-1.5 h-14 rounded-xl border min-w-0 relative ${
                  activeTab === 'seekers'
                    ? 'text-amber-700 bg-amber-50 border-amber-200 shadow-xs'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50 border-transparent'
                }`}
              >
                <Search className={`w-5 h-5 shrink-0 transition-colors ${activeTab === 'seekers' ? 'text-indigo-600' : 'text-indigo-600'}`} strokeWidth={2} />
                {unreadRequestsCount > 0 && (
                  <span className="absolute top-1 right-1 min-w-[18px] h-[18px] bg-amber-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 border-2 border-white shadow-sm">
                    {unreadRequestsCount}
                  </span>
                )}
                {activeTab === 'seekers' && (
                  <span className="text-[10px] sm:text-xs font-bold leading-tight mt-0.5 select-none truncate">Find Talents</span>
                )}
              </button>
            </div>

            {/* Right Controls with Online status & 3-dot menu */}
            <div className="flex items-center space-x-4 shrink-0">
              {/* Online / Offline Network Status */}
              {isOffline ? (
                <div className="flex items-center space-x-1.5 text-xs text-rose-700 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200 animate-pulse font-bold">
                  <WifiOff className="w-3.5 h-3.5" />
                  <span className="font-sans">Offline Mode</span>
                </div>
              ) : (
                <div className="hidden sm:flex items-center space-x-1.5 text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full border border-gray-200 relative">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
                  <span className="w-2 h-2 rounded-full bg-emerald-500 absolute shrink-0" />
                  <span className="pl-3 font-semibold text-gray-600 font-sans">{onlineUsersCount} online</span>
                </div>
              )}

            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className={`flex-1 min-h-0 ${['chat', 'seekers', 'gigs', 'notifications'].includes(activeTab) ? 'flex flex-col overflow-hidden w-full' : 'w-full px-4 sm:px-6 lg:px-8 py-8 overflow-y-auto'}`}>
        <AnimatePresence mode="wait">
          {activeTab === 'admin' && (profile?.email?.toLowerCase() === '21lucihanomatthews@gmail.com' || session?.user?.email?.toLowerCase() === '21lucihanomatthews@gmail.com') && <AdminView key="admin" onlineUsersCount={onlineUsersCount} setFullScreenImage={setFullScreenImage} />}
          {activeTab === 'referral' && <ReferralView key="referral" userId={session.user.id} />}
          {activeTab === 'wallet' && <WalletView key="wallet" userId={session.user.id} onGoToReferral={() => setActiveTab('referral')} onAddNotification={handleAddNotification} onGoToGigs={() => setActiveTab('gigs')} />}
          {activeTab === 'gigs' && <GigsView key="gigs" onDirectToChat={handleDirectToChat} onViewProfile={handleViewProfile} />}
          {activeTab === 'notifications' && (
            <div key="notifications" className="h-full flex justify-center bg-gray-50 p-4 sm:p-6 lg:p-8">
              <div className="w-full max-w-md bg-white shadow-md border border-gray-100 rounded-2xl flex flex-col overflow-hidden max-h-[600px] mt-4">
                <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-indigo-100 rounded-lg">
                      <Bell className="w-5 h-5 text-indigo-600" />
                    </div>
                    <span className="text-lg font-bold text-gray-900 tracking-tight">Notification Center</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    {notifications.length > 0 && (
                      <button 
                        onClick={() => setNotifications([])}
                        className="text-xs font-bold text-red-600 hover:text-red-700 transition-colors mr-3"
                      >
                        Clear All
                      </button>
                    )}
                    {notifications.some(n => !n.read) && (
                      <button 
                        onClick={() => {
                          setNotifications(notifications.map(n => ({ ...n, read: true })));
                        }}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                  {notifications.map((n) => (
                    <div 
                      key={n.id} 
                      onClick={() => {
                        setNotifications(notifications.map(notif => notif.id === n.id ? { ...notif, read: true } : notif));
                        if (n.sourceTab) {
                          setActiveTab(n.sourceTab);
                        }
                      }}
                      className={`group p-4 rounded-xl hover:bg-gray-50 cursor-pointer transition-all border border-transparent hover:border-gray-100 flex gap-4 items-start ${!n.read ? 'bg-indigo-50/40 border-indigo-50 shadow-sm' : 'bg-white border-gray-50'}`}
                    >
                      <div className="mt-1 shrink-0 relative">
                        <div className={`w-3 h-3 rounded-full border-2 border-white ${!n.read ? 'bg-indigo-600 ring-4 ring-indigo-50' : 'bg-gray-200 group-hover:bg-gray-300'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1">
                          <p className={`text-sm text-gray-900 leading-tight ${!n.read ? 'font-bold' : 'font-medium'}`}>{n.title}</p>
                          <span className="text-[10px] text-gray-400 font-bold uppercase shrink-0 ml-4">{n.time}</span>
                        </div>
                        <p className="text-xs text-gray-600 leading-relaxed break-words">{n.body}</p>
                        {n.sourceTab && (
                          <div className="mt-3 flex items-center text-xs font-bold text-indigo-600 group-hover:translate-x-1 transition-transform">
                            <span>Go to {n.sourceTab}</span>
                            <ChevronRight className="w-3 h-3 ml-1" />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {notifications.length === 0 && (
                    <div className="py-20 text-center">
                      <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Bell className="w-10 h-10 text-indigo-600" />
                      </div>
                      <p className="text-lg font-bold text-gray-900">No notifications yet</p>
                      <p className="text-sm text-gray-400 mt-1 max-w-xs mx-auto">We'll notify you when you have new messages or profile views.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          {activeTab === 'chat' && (
            <ChatView 
              key="chat" 
              userId={session.user.id} 
              activeContactId={activeContactId} 
              setActiveContactId={setActiveContactId} 
              profileToView={profileToView}
              setProfileToView={setProfileToView}
              myProfile={profile}
              onClose={() => setActiveTab('gigs')}
              setFullScreenImage={setFullScreenImage}
              onRefreshCounts={fetchCounts}
            />
          )}
          {activeTab === 'seekers' && <SeekersView key="seekers" onDirectToChat={handleDirectToChat} onViewProfile={handleViewProfile} />}
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
                          <img 
                            src={avatarUrl} 
                            alt="Avatar" 
                            className="w-full h-full object-cover" 
                            referrerPolicy="no-referrer" 
                          />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Camera className="w-6 h-6 text-white" />
                          </div>
                          <div className="absolute top-1 right-1 bg-indigo-600 rounded-full p-1 shadow-lg transform scale-0 group-hover:scale-100 transition-transform">
                            <ImageIcon className="w-3 h-3 text-white" />
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center p-2 text-center text-gray-400">
                          <Camera className="w-6 h-6 text-indigo-600 mb-1" />
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

                    {/* Choose a Preset Avatar */}
                    <div className="pt-2">
                      <label className="block text-[10px] font-bold text-indigo-600 uppercase tracking-wide mb-1.5">Or Choose a Preset Profile Picture</label>
                      <div className="flex flex-wrap gap-2">
                        {PRESET_AVATARS.map((url, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => {
                              setAvatarUrl(url);
                              setSelectedFile(null);
                            }}
                            className={`w-8 h-8 rounded-full overflow-hidden border-2 transition-all shrink-0 hover:scale-110 active:scale-95 ${
                              avatarUrl === url ? 'border-indigo-600 scale-110 shadow-xs' : 'border-gray-100 hover:border-indigo-200'
                            }`}
                            title={`Preset Avatar ${i + 1}`}
                          >
                            <img 
                              src={url} 
                              alt={`Preset ${i + 1}`} 
                              className="w-full h-full object-cover" 
                              referrerPolicy="no-referrer" 
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Professional Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide flex items-center space-x-1">
                      <Briefcase className="w-3.5 h-3.5 text-indigo-600" />
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
                      <MapPin className="w-3.5 h-3.5 text-indigo-600" />
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
                      <Phone className="w-3.5 h-3.5 text-indigo-600" />
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
                      <Globe className="w-3.5 h-3.5 text-indigo-600" />
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
                    <Award className="w-3.5 h-3.5 text-indigo-600" />
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
                      <Lock className="w-4 h-4 text-indigo-600" />
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
                      Top up <strong className="font-semibold text-indigo-600">more than R20</strong> in the Wallet to verify your account and unlock referral rewards.
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
                    <img 
                      src={avatarUrl} 
                      alt="Avatar" 
                      className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity" 
                      referrerPolicy="no-referrer" 
                      onClick={(e) => {
                        e.stopPropagation();
                        setFullScreenImage(avatarUrl);
                      }}
                    />
                  ) : (
                    newName ? newName.substring(0, 2).toUpperCase() : 'ME'
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center space-x-1">
                    <h5 className="text-sm font-bold text-gray-900 truncate">{newName}</h5>
                    {profile?.status === 'Verified' && <ShieldCheck className="w-4 h-4 text-indigo-600" />}
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

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettingsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto bg-black/40 backdrop-blur-xs">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSettingsModal(false)}
              className="fixed inset-0 bg-black/20"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden text-gray-900 z-10 my-8 flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 shrink-0">
                <div className="flex items-center space-x-2">
                  <Settings className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-base font-bold text-gray-900">Application Settings</h3>
                </div>
                <button
                  onClick={() => setShowSettingsModal(false)}
                  className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Body */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm text-gray-600">
                
                {/* Sound & Notifications */}
                <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100/80 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                        {muteSounds ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 font-sans">Sound Notifications</h4>
                        <p className="text-xs text-gray-400">Play organic sound chimes for alerts</p>
                      </div>
                    </div>
                    {/* Toggle Switch */}
                    <button
                      onClick={handleToggleMute}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        !muteSounds ? 'bg-indigo-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                          !muteSounds ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                  
                  {/* Test Sound Actions */}
                  <div className="flex items-center space-x-2 pt-1 border-t border-slate-100">
                    <span className="text-[10px] text-gray-400 font-medium font-sans">Test Sound:</span>
                    <button
                      onClick={() => playNotificationSound('message')}
                      className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-md transition-colors"
                    >
                      Bubble Pop (Chat)
                    </button>
                    <button
                      onClick={() => playNotificationSound('notification')}
                      className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-md transition-colors"
                    >
                      Double Chime (Alert)
                    </button>
                  </div>
                </div>

                {/* Profile Privacy Setting */}
                <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100/80 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
                        <Lock className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 font-sans">Profile Privacy</h4>
                        <p className="text-xs text-gray-400">Control who can see your profile details</p>
                      </div>
                    </div>
                    <select
                      value={profilePrivacy}
                      onChange={async (e) => {
                        const val = e.target.value as 'public' | 'private';
                        setProfilePrivacy(val);
                        localStorage.setItem('profile_privacy', val);
                        if (session?.user?.id) {
                          try {
                            await supabase.from('profiles').update({ is_discoverable: val === 'public' }).eq('id', session.user.id);
                          } catch (err) {
                            console.error('Failed to update discoverability:', err);
                          }
                        }
                      }}
                      className="bg-white border border-gray-200 rounded-lg text-xs font-bold px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="public">Public</option>
                      <option value="private">Private</option>
                    </select>
                  </div>
                  <p className="text-[10px] text-gray-400 italic">
                    * Private profiles are only visible to confirmed friends and gig partners.
                  </p>
                </div>

                {/* Fine-grained Notification Preferences */}
                <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100/80 space-y-4">
                  <div className="flex items-center space-x-2 pb-2 border-b border-gray-100">
                    <ShieldCheck className="w-4 h-4 text-rose-600" />
                    <h4 className="font-bold text-gray-900 font-sans text-sm">Account Status</h4>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-gray-800">
                        {profile?.status === 'Disabled' ? 'Account Disabled' : 'Account Active'}
                      </p>
                      <p className="text-[10px] text-gray-400">
                        {profile?.status === 'Disabled' 
                          ? 'Your profile is hidden. Re-enable to be visible again.' 
                          : 'Your profile is visible to other users.'}
                      </p>
                    </div>
                    <button
                      onClick={handleDeactivateAccount}
                      disabled={isDeactivating}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-colors ${
                        profile?.status === 'Disabled'
                          ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                          : 'bg-rose-100 text-rose-700 hover:bg-rose-200'
                      }`}
                    >
                      {isDeactivating ? <Loader2 className="w-3 h-3 animate-spin" /> : profile?.status === 'Disabled' ? 'Enable Account' : 'Disable Account'}
                    </button>
                  </div>
                </div>

                {/* Fine-grained Notification Preferences */}
                <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100/80 space-y-4">
                  <div className="flex items-center space-x-2 pb-2 border-b border-gray-100">
                    <BellRing className="w-4 h-4 text-indigo-600 animate-pulse" />
                    <h4 className="font-bold text-gray-900 font-sans text-sm">Notification Preferences</h4>
                  </div>
                  
                  <p className="text-[11px] text-gray-400 leading-normal">
                    Choose which system events trigger audio alerts, visual indicators, and status updates:
                  </p>

                  <div className="space-y-3.5 pt-1">
                    {/* Chat Messages */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2.5">
                        <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg shrink-0">
                          <MessageSquare className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-gray-800">Chat Messages</p>
                          <p className="text-[10px] text-gray-400 truncate">Receive audio & visual chimes for incoming peer chats</p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          const val = !notifyChat;
                          setNotifyChat(val);
                          localStorage.setItem('notify_chat', String(val));
                        }}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          notifyChat ? 'bg-indigo-600' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                            notifyChat ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Gig Board Updates */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2.5">
                        <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg shrink-0">
                          <Briefcase className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-gray-800">Gig Board Updates</p>
                          <p className="text-[10px] text-gray-400 truncate">Alerts for new gig posts and application matching</p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          const val = !notifyGigs;
                          setNotifyGigs(val);
                          localStorage.setItem('notify_gigs', String(val));
                        }}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          notifyGigs ? 'bg-indigo-600' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                            notifyGigs ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Talent Directory Alerts */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2.5">
                        <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg shrink-0">
                          <Users className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-gray-800">Talent Directory Alerts</p>
                          <p className="text-[10px] text-gray-400 truncate">Alerts for view activity and search selections</p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          const val = !notifySeekers;
                          setNotifySeekers(val);
                          localStorage.setItem('notify_seekers', String(val));
                        }}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          notifySeekers ? 'bg-indigo-600' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                            notifySeekers ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Profile Changes */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2.5">
                        <div className="p-1.5 bg-purple-50 text-purple-600 rounded-lg shrink-0">
                          <UserCheck className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-gray-800">Profile Updates</p>
                          <p className="text-[10px] text-gray-400 truncate">Real-time alerts when other members edit profiles</p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          const val = !notifyProfiles;
                          setNotifyProfiles(val);
                          localStorage.setItem('notify_profiles', String(val));
                        }}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          notifyProfiles ? 'bg-indigo-600' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                            notifyProfiles ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Network Status Alerts */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2.5">
                        <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg shrink-0">
                          <Globe className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-gray-800">Network Connection Alerts</p>
                          <p className="text-[10px] text-gray-400 truncate">Offline/Online connectivity changes & sync status</p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          const val = !notifyNetwork;
                          setNotifyNetwork(val);
                          localStorage.setItem('notify_network', String(val));
                        }}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          notifyNetwork ? 'bg-indigo-600' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                            notifyNetwork ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>


                {/* Layout Density */}
                <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
                        <SlidersHorizontal className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900">Compact Layout</h4>
                        <p className="text-xs text-gray-400">Tight, dense list mode for cards</p>
                      </div>
                    </div>
                    {/* Toggle Switch */}
                    <button
                      onClick={handleToggleCompact}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        compactLayout ? 'bg-amber-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                          compactLayout ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                  <p className="text-[11px] text-gray-400 leading-normal">
                    Fits twice as many items on the screen by switching card lists into lightweight horizontal bars. Avoids excessive scrolling.
                  </p>
                </div>

                {/* Profile Lock Settings (PIN Security) */}
                <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <div className="p-1.5 bg-rose-50 text-rose-600 rounded-lg">
                        <Lock className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900">Profile PIN Security</h4>
                        <p className="text-xs text-gray-400">Lock sensitive profile changes with a PIN</p>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      pinCode ? 'bg-rose-50 text-rose-700 border border-rose-100' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {pinCode ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>

                  {/* PIN Management Panel */}
                  <div className="space-y-3 pt-3 border-t border-slate-100">
                    {pinCode ? (
                      <div className="space-y-3">
                        <p className="text-[11px] text-gray-400 leading-normal">
                          A 5-digit PIN is currently active. Your profile editing is protected against unauthorized changes.
                        </p>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={handleDisablePIN}
                            className="text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-lg transition-colors border border-rose-100"
                          >
                            Disable PIN Protection
                          </button>
                          <button
                            onClick={() => {
                              setShowPinSetupForm(true);
                              setNewPinInput('');
                              setConfirmNewPinInput('');
                            }}
                            className="text-xs font-semibold text-gray-700 hover:text-gray-900 hover:bg-gray-100 px-3 py-1.5 rounded-lg transition-colors border border-gray-200"
                          >
                            Change PIN
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-[11px] text-gray-400 leading-normal">
                          Enable a 5-digit security PIN to restrict profile adjustments and add extra protection.
                        </p>
                        <button
                          onClick={() => {
                            setShowPinSetupForm(true);
                            setNewPinInput('');
                            setConfirmNewPinInput('');
                          }}
                          className="text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-xl transition-colors"
                        >
                          + Set 5-Digit PIN
                        </button>
                      </div>
                    )}

                    {/* Inline PIN form */}
                    {showPinSetupForm && (
                      <div className="p-3 bg-white rounded-lg border border-slate-100 mt-2 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-gray-700">Configure Security PIN</span>
                          <button
                            onClick={() => setShowPinSetupForm(false)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] text-gray-400 font-semibold mb-1">Enter 5-digit PIN</label>
                            <input
                              type="password"
                              maxLength={5}
                              pattern="[0-9]*"
                              value={newPinInput}
                              onChange={(e) => setNewPinInput(e.target.value.replace(/\D/g, ''))}
                              className="w-full text-center px-2 py-1 bg-slate-50 border border-gray-200 rounded-md focus:outline-none focus:border-indigo-500 font-mono text-sm tracking-widest"
                              placeholder="•••••"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-gray-400 font-semibold mb-1">Confirm PIN</label>
                            <input
                              type="password"
                              maxLength={5}
                              pattern="[0-9]*"
                              value={confirmNewPinInput}
                              onChange={(e) => setConfirmNewPinInput(e.target.value.replace(/\D/g, ''))}
                              className="w-full text-center px-2 py-1 bg-slate-50 border border-gray-200 rounded-md focus:outline-none focus:border-indigo-500 font-mono text-sm tracking-widest"
                              placeholder="•••••"
                            />
                          </div>
                        </div>
                        {newPinInput && (newPinInput.length !== 5 || confirmNewPinInput.length !== 5) && (
                          <p className="text-[10px] text-amber-500">PIN must be exactly 5 numeric digits.</p>
                        )}
                        {newPinInput && confirmNewPinInput && newPinInput !== confirmNewPinInput && (
                          <p className="text-[10px] text-rose-500">PINs do not match.</p>
                        )}
                        <button
                          onClick={handleSaveNewPIN}
                          disabled={!newPinInput || newPinInput !== confirmNewPinInput || newPinInput.length !== 5}
                          className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl text-xs transition-colors"
                        >
                          Save Security PIN
                        </button>
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end shrink-0">
                <button
                  onClick={() => setShowSettingsModal(false)}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors shadow-xs"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Onboarding Tour Overlay */}
      <AnimatePresence>
        {!hasSeenOnboarding && profile && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-indigo-900/40 backdrop-blur-sm"
              onClick={() => {
                setHasSeenOnboarding(true);
                localStorage.setItem('has_seen_onboarding', 'true');
              }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[90vh]"
            >
              <div className="bg-gradient-to-r from-indigo-600 to-blue-600 p-8 text-center text-white relative shrink-0">
                <button
                  onClick={() => {
                    setHasSeenOnboarding(true);
                    localStorage.setItem('has_seen_onboarding', 'true');
                  }}
                  className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
                <div className="flex items-center justify-center mx-auto mb-4">
                  <h1 className="font-instagram text-5xl md:text-6xl tracking-wide text-white select-none">TimeGiG</h1>
                </div>
                <h2 className="text-3xl font-bold mb-2 tracking-tight">Welcome to TimeGiG!</h2>
                <p className="text-indigo-100 font-medium">Your platform to connect, work, and earn.</p>
                <p className="text-white/90 text-sm font-bold mt-1 bg-white/10 inline-block px-3 py-1 rounded-full">Empowering communities, creating jobs for all.</p>
              </div>
              
              <div className="p-6 overflow-y-auto space-y-6 flex-1">
                <div className="space-y-4">
                  <div className="flex items-start gap-4 p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100/50">
                    <div className="p-2 bg-indigo-100 rounded-xl text-indigo-600 shrink-0">
                      <Gift className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-lg">Referral Program <span className="ml-2 inline-flex items-center px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] rounded-full uppercase tracking-wider font-bold"><Clock className="w-3 h-3 mr-1" /> Ends in 90 Days</span></h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Share your unique link! When friends sign up and top up more than R20, you earn <strong>50% commission</strong>. Reach 10 or 15 friends to unlock <strong>cashout bonuses</strong>.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 rounded-2xl bg-amber-50/50 border border-amber-100/50">
                    <div className="p-2 bg-amber-100 rounded-xl text-amber-600 shrink-0">
                      <Briefcase className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-lg">Gigs & Seekers</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Offer your services in <strong>Gigs</strong>, or hire someone in <strong>Seekers</strong>. Negotiate securely and pay via your wallet.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100/50">
                    <div className="p-2 bg-emerald-100 rounded-xl text-emerald-600 shrink-0">
                      <Wallet className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-lg">Digital Wallet</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Top up your wallet to start messaging Seekers or getting verified. Manage your earnings and withdraw easily.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-gray-50 border-t border-gray-100 shrink-0">
                <button
                  onClick={() => {
                    setHasSeenOnboarding(true);
                    localStorage.setItem('has_seen_onboarding', 'true');
                  }}
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl transition-all shadow-lg hover:shadow-indigo-500/25 flex items-center justify-center text-lg"
                >
                  Let's Get Started <ArrowRight className="w-5 h-5 ml-2" />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
    </>
  );
}

function AuthView() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLogin && !termsAccepted) {
      setError("You must accept the terms and conditions to sign up.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            data: {
              first_name: firstName,
              last_name: lastName,
              full_name: `${firstName} ${lastName}`.trim()
            }
          }
        });
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
          <h1 className="text-center font-instagram text-5xl md:text-6xl tracking-wide text-black select-none mb-2">TimeGiG</h1>
          <p className="text-center text-sm font-medium text-indigo-600 mt-2 mb-1">
            Empowering communities, creating jobs for all.
          </p>
          <h2 className="text-center text-xl font-bold text-gray-900 mt-4">
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
            {!isLogin && (
              <>
                <div>
                  <input
                    id="first-name"
                    name="firstName"
                    type="text"
                    required
                    className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                    placeholder="First Name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </div>
                <div>
                  <input
                    id="last-name"
                    name="lastName"
                    type="text"
                    required
                    className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                    placeholder="Last Name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
              </>
            )}
            <div>
              <input
                id="email-address"
                name="email"
                type="email"
                required
                className={`appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 ${isLogin ? 'rounded-t-md' : ''} focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm`}
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

          {!isLogin && (
            <div className="flex items-center mt-4">
              <input
                id="terms"
                name="terms"
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="terms" className="ml-2 block text-sm text-gray-900">
                I accept the <a href="#" className="text-blue-600 hover:text-blue-500">Terms and Conditions</a>
              </label>
            </div>
          )}

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

        <div className="mt-6 pt-6 border-t border-gray-100">
          <div className="bg-indigo-50 rounded-xl p-5 border border-indigo-100 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 p-2 opacity-10 pointer-events-none">
              <Gift className="w-16 h-16 text-indigo-600" />
            </div>
            <h3 className="text-indigo-800 font-bold text-lg mb-2 relative z-10 flex justify-center items-center gap-2">
              TimeGiG Referral Program
            </h3>
            <p className="text-indigo-700 text-sm mb-3 relative z-10">
              Did you know? You can earn real money by inviting friends to TimeGiG!
            </p>
            <div className="mb-4 relative z-10">
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-200 text-amber-900 shadow-sm">
                <Clock className="w-3 h-3 mr-1.5" /> Ends in 90 Days
              </span>
            </div>
            <div className="bg-white rounded-lg p-3 text-left relative z-10 space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">1</span>
                <span className="text-gray-700">Invite friends using your unique link.</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">2</span>
                <span className="text-gray-700">Earn <strong>50% commission</strong> when they top up.</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">3</span>
                <span className="text-gray-700">Hit milestones for <strong>cashout bonuses</strong>!</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

function AdminView({ onlineUsersCount = 0, setFullScreenImage }: { onlineUsersCount?: number; key?: string; setFullScreenImage: (url: string | null) => void }) {
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
  const [localStoragePayouts, setLocalStoragePayouts] = useState<any[]>([]);
  const [payoutTab, setPayoutTab] = useState<'eligible' | 'requested'>('requested');

  const fetchLocalStoragePayouts = () => {
    try {
      const allPayouts = JSON.parse(localStorage.getItem('payout_requests') || '[]');
      setLocalStoragePayouts(allPayouts);
    } catch (e) {
      console.warn("Failed to load payout requests from localStorage:", e);
    }
  };

  const handleApprovePayout = (payoutId: string) => {
    try {
      const allPayouts = JSON.parse(localStorage.getItem('payout_requests') || '[]');
      const updatedPayouts = allPayouts.map((p: any) => {
        if (p.id === payoutId) {
          return { ...p, status: 'Paid' };
        }
        return p;
      });
      localStorage.setItem('payout_requests', JSON.stringify(updatedPayouts));
      fetchLocalStoragePayouts();
    } catch (e) {
      console.warn("Failed to approve payout request:", e);
    }
  };

  // States for Admin promotions
  const [promoTitle, setPromoTitle] = useState('');
  const [promoBody, setPromoBody] = useState('');
  const [promoTab, setPromoTab] = useState<string>('referral');
  const [promoSending, setPromoSending] = useState(false);
  const [promoSuccess, setPromoSuccess] = useState(false);
  const [promoError, setPromoError] = useState('');

  const handleSendPromotion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoTitle.trim() || !promoBody.trim()) return;

    setPromoSending(true);
    setPromoError('');
    setPromoSuccess(false);

    const promotionData = {
      id: `promo-${Date.now()}`,
      title: promoTitle,
      body: promoBody,
      source_tab: promoTab,
      created_at: new Date().toISOString(),
    };

    try {
      // 1. Attempt DB write (this matches the custom sql schema we setup)
      try {
        const { error } = await supabase
          .from('promotions')
          .insert({
            title: promoTitle,
            body: promoBody,
            source_tab: promoTab
          });
        if (error) console.warn("Supabase promotions insert error:", error);
      } catch (dbErr) {
        console.warn("DB Promotions insert failed, falling back to local storage:", dbErr);
      }

      // 2. Save to local storage for robust multi-user client-side notifications
      const existing: any[] = JSON.parse(localStorage.getItem('chat_global_promotions') || '[]');
      existing.unshift(promotionData);
      localStorage.setItem('chat_global_promotions', JSON.stringify(existing));

      // 3. Clear fields & flag success
      setPromoTitle('');
      setPromoBody('');
      setPromoSuccess(true);
      setTimeout(() => setPromoSuccess(false), 4000);
    } catch (err: any) {
      setPromoError(err?.message || 'Failed to dispatch app promotion.');
    } finally {
      setPromoSending(false);
    }
  };

  const fetchAdminData = async () => {
    try {
      let profiles: any[] = [];
      let topups: any[] = [];
      let referrals: any[] = [];

      try {
        const res = await supabase.from('profiles').select('*');
        if (res.error) throw res.error;
        profiles = res.data || [];
      } catch (err) {
        console.warn('Admin fetch profiles failed:', err);
      }

      try {
        const res = await supabase.from('topups').select('*').order('created_at', { ascending: false });
        if (res.error) throw res.error;
        topups = res.data || [];
      } catch (err) {
        console.warn('Admin fetch topups failed:', err);
      }

      try {
        const res = await supabase.from('referrals').select('*');
        if (res.error) throw res.error;
        referrals = res.data || [];
      } catch (err) {
        console.warn('Admin fetch referrals failed:', err);
      }

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
        const isVerified = userTopups > 20;
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
          if (rTopups > 20) {
            verifiedReferrals++;
            commission += (rTopups * 0.5);
            refProfit += (rTopups * 0.5); // Admin logic backwards compatibility
          }
        });
        
        const cappedReferrals = Math.min(verifiedReferrals, 25);
        let owedAmount = 0;
        let rewardStatus = '';
        if (cappedReferrals >= 15) {
          rewardStatus = 'Completed (15+ Capped 25)';
          owedAmount = 100 + commission;
        } else if (cappedReferrals >= 10) {
          rewardStatus = '10 Referrals Cashout';
          owedAmount = 60;
        } else if (cappedReferrals > 0) {
          rewardStatus = '50% Commission';
          owedAmount = commission;
        } else {
          rewardStatus = 'No Verified Referrals';
          owedAmount = 0;
        }
        
        totalOwedToAgents += owedAmount;
        return { ...p, verifiedReferrals: cappedReferrals, rewardStatus, owedAmount };
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
    fetchLocalStoragePayouts();

    // Subscribe to topups changes to keep Admin dashboard updated in real-time
    const channel = supabase
      .channel('admin-realtime-topups')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'topups'
        },
        () => {
          fetchAdminData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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

      {/* App Promotions Composer Section */}
      <div className="bg-white shadow sm:rounded-lg border border-indigo-100 overflow-hidden mb-6">
        <div className="px-4 py-5 border-b border-gray-100 sm:px-6 bg-indigo-50/40 flex justify-between items-center">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
              <Bell className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <h3 className="text-lg leading-6 font-semibold text-gray-900">
                Compose App Promotion
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Dispatch platform-wide campaigns that alert users instantly with their notification bell.
              </p>
            </div>
          </div>
        </div>
        
        <form onSubmit={handleSendPromotion} className="p-6 space-y-4">
          {promoSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-800 text-sm font-medium flex items-center space-x-2 animate-pulse">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>Promotion broadcasted successfully! All active users will receive the notification bell ring.</span>
            </div>
          )}

          {promoError && (
            <div className="p-3 bg-rose-50 border border-rose-100 rounded-lg text-rose-800 text-sm font-medium">
              {promoError}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label htmlFor="promo-title" className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">
                Promotion Title
              </label>
              <input
                id="promo-title"
                type="text"
                required
                placeholder="e.g. 🎁 Special R30 Sign-up Bonus!"
                value={promoTitle}
                onChange={(e) => setPromoTitle(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3.5 py-2 text-sm text-gray-900 bg-gray-50/50 hover:bg-white focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
              />
            </div>

            <div>
              <label htmlFor="promo-tab" className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">
                Link Action View
              </label>
              <select
                id="promo-tab"
                value={promoTab}
                onChange={(e) => setPromoTab(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3.5 py-2 text-sm text-gray-900 bg-gray-50/50 hover:bg-white focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all cursor-pointer"
              >
                <option value="referral">Referral Program</option>
                <option value="wallet">Wallet Top-up</option>
                <option value="gigs">Gigs View</option>
                <option value="seekers">Seekers View</option>
                <option value="chat">Messenger Chat</option>
                <option value="notifications">Notification Center</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="promo-body" className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">
              Promotion Message Body
            </label>
            <textarea
              id="promo-body"
              rows={3}
              required
              placeholder="Provide a compelling call-to-action details for your users..."
              value={promoBody}
              onChange={(e) => setPromoBody(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3.5 py-2 text-sm text-gray-900 bg-gray-50/50 hover:bg-white focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all resize-none"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={promoSending}
              className="inline-flex items-center px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm hover:shadow transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 active:scale-95 cursor-pointer"
            >
              {promoSending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Broadcasting...
                </>
              ) : (
                <>
                  <BellRing className="w-4 h-4 mr-2" />
                  Dispatch Promotion
                </>
              )}
            </button>
          </div>
        </form>
      </div>
      {pendingTopups.length > 0 && (
        <div className="bg-white shadow sm:rounded-lg border border-yellow-200 overflow-hidden mb-6">
          <div className="px-4 py-5 border-b border-gray-200 sm:px-6 bg-yellow-50 flex justify-between items-center">
            <h3 className="text-lg leading-6 font-medium text-yellow-900 flex items-center">
               <Wallet className="w-5 h-5 mr-2 text-indigo-600" /> Pending Topup Approvals ({pendingTopups.length})
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
                  <Eye className="w-4 h-4 mr-2 text-indigo-600" /> View Proof
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
             <Wallet className="w-5 h-5 mr-2 text-indigo-600" /> Payment Proofs
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
          <div className="flex items-center space-x-4">
            <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center">
              <Gift className="w-5 h-5 mr-2 text-indigo-600" /> Agent Payouts
            </h3>
            <div className="flex bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setPayoutTab('requested')}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${payoutTab === 'requested' ? 'bg-white text-indigo-600 shadow' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Requests ({localStoragePayouts.filter(p => p.status === 'Pending').length})
              </button>
              <button
                onClick={() => setPayoutTab('eligible')}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${payoutTab === 'eligible' ? 'bg-white text-indigo-600 shadow' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Eligible
              </button>
            </div>
          </div>
          <button onClick={() => setShowAllAgentPayouts(true)} className="text-sm text-blue-600 font-medium hover:text-blue-500 flex items-center">
             View All <ArrowRight className="w-4 h-4 ml-1" />
          </button>
        </div>
        <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
          {payoutTab === 'requested' ? (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Agent Details</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID Document</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {localStoragePayouts.length === 0 ? (
                  <tr><td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">No payout requests found</td></tr>
                ) : localStoragePayouts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map((req, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(req.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{req.user_name || req.user_id}</div>
                      <div className="text-sm text-gray-500">{req.phone_number}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                      R {req.amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        req.status === 'Paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {req.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {req.id_document_url ? (
                        <button 
                          onClick={() => setFullScreenImage(req.id_document_url)}
                          className="text-blue-600 hover:text-blue-800 flex items-center"
                        >
                          <Eye className="w-4 h-4 mr-1" /> View ID
                        </button>
                      ) : (
                        <span className="text-gray-400">N/A</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {req.status === 'Pending' ? (
                        <button
                          onClick={() => handleApprovePayout(req.id)}
                          className="text-indigo-600 hover:text-indigo-900 font-semibold bg-indigo-50 px-3 py-1 rounded hover:bg-indigo-100"
                        >
                          Mark Paid
                        </button>
                      ) : (
                        <span className="text-gray-400">Done</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
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
          )}
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
                  <Maximize className="w-5 h-5 text-indigo-600" />
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
                  <ArrowLeft className="w-5 h-5 text-indigo-600" />
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
                          {user.avatar_url ? (
                            <img 
                              src={user.avatar_url} 
                              alt={user.name} 
                              className="h-10 w-10 rounded-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                              referrerPolicy="no-referrer" 
                              onClick={(e) => {
                                e.stopPropagation();
                                setFullScreenImage(user.avatar_url || '');
                              }}
                            />
                          ) : (
                            <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm uppercase ${getAvatarColorClass(user.name)}`}>
                              {getInitials(user.name || user.email)}
                            </div>
                          )}
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
                  <Maximize className="w-5 h-5 text-indigo-600" />
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
                  <ArrowLeft className="w-5 h-5 text-indigo-600" />
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
                  <Maximize className="w-5 h-5 text-indigo-600" />
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
                  <ArrowLeft className="w-5 h-5 text-indigo-600" />
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
  const [cashoutAlert, setCashoutAlert] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });
  const [cashoutLoading, setCashoutLoading] = useState(false);
  const [showCashoutModal, setShowCashoutModal] = useState(false);
  const [idDocumentUrl, setIdDocumentUrl] = useState<string | null>(null);
  
  const [bankDetails, setBankDetails] = useState<{bankName: string, accountNumber: string} | null>(() => {
    const saved = localStorage.getItem(`bank_details_${userId}`);
    return saved ? JSON.parse(saved) : null;
  });
  const [bankNameInput, setBankNameInput] = useState('');
  const [accountNumberInput, setAccountNumberInput] = useState('');

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
        
        // Check if current user is verified (has topped up > 20)
        const currentUserTopups = topupsData.filter(t => t.user_id === userId && (t.status === 'Approved' || !t.status));
        const currentUserTotalTopups = currentUserTopups.reduce((sum, t) => sum + Number(t.amount), 0);
        const isCurrentUserVerified = currentUserTotalTopups > 20;

        let verifiedCount = 0;
        let commissionRewards = 0;

        let enrichedActivity = referrals.map(r => {
          const userTopups = topupsData.filter(t => t.user_id === r.referred_id && (t.status === 'Approved' || !t.status));
          const totalTopups = userTopups.reduce((sum, t) => sum + Number(t.amount), 0);
          
          const isVerified = totalTopups > 20;
          if (isVerified) verifiedCount++;

          const reward = totalTopups * 0.5;
          if (isVerified && isCurrentUserVerified && verifiedCount <= 25) {
            commissionRewards += reward;
          }

          return {
            name: r.referred?.name || 'Unknown User',
            date: new Date(r.created_at).toLocaleDateString(),
            status: isVerified ? 'Completed' : 'Pending',
            reward: isVerified 
              ? (isCurrentUserVerified 
                  ? (verifiedCount > 25 
                      ? 'Exceeds Cap (Max 25)' 
                      : `+R ${(reward).toFixed(2)}`)
                  : 'Not Qualified') 
              : 'Pending Topup',
            rawReward: reward
          };
        });

        let pendingRewards = 0;
        if (isCurrentUserVerified) {
          const cappedCount = Math.min(verifiedCount, 25);
          if (cappedCount >= 10) {
            // Tier 1: 10 referrals milestone
            pendingRewards = 60; 
            
            // Tier 2: 15 referrals milestone
            if (cappedCount >= 15) {
                pendingRewards = 100 + commissionRewards;
            } else {
                // For 10 <= count < 15, no commission
                enrichedActivity = enrichedActivity.map(a => ({
                  ...a,
                  reward: a.status === 'Completed' ? 'Included in Cashout' : a.reward
                }));
            }
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCashoutLoading(true);
    setCashoutAlert({ type: null, message: '' });
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(`ids/${fileName}`, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(`ids/${fileName}`);
      setIdDocumentUrl(publicUrl);
    } catch (e) {
      console.error(e);
      setCashoutAlert({ type: 'error', message: 'Failed to upload document' });
    } finally {
      setCashoutLoading(false);
    }
  };

  const handleCashout = async () => {
    setCashoutLoading(true);
    setCashoutAlert({ type: null, message: '' });
    
    if (!idDocumentUrl) {
      setCashoutAlert({ type: 'error', message: 'Please upload an ID document first.' });
      setCashoutLoading(false);
      return;
    }
    
    try {
      // Get the profile to know the phone number/name
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).single();
      
      const currentRequests = JSON.parse(localStorage.getItem('payout_requests') || '[]');
      
      // Check if there's already a pending request
      const hasPending = currentRequests.some((req: any) => req.user_id === userId && req.status === 'Pending');
      if (hasPending) {
        setCashoutAlert({ type: 'error', message: 'You already have a pending cashout request.' });
        return;
      }
      
      // Check time constraint 05:00 to 17:00
      const currentHour = new Date().getHours();
      if (currentHour < 5 || currentHour >= 17) {
        setCashoutAlert({ type: 'error', message: 'Cashouts are only processed between 05:00 and 17:00.' });
        return;
      }

      const newRequest = {
        id: crypto.randomUUID(),
        user_id: userId,
        user_name: profile?.name || 'Unknown',
        phone_number: profile?.phone_number || 'N/A',
        amount: stats.pendingRewards,
        status: 'Pending',
        id_document_url: idDocumentUrl,
        created_at: new Date().toISOString()
      };
      
      currentRequests.push(newRequest);
      localStorage.setItem('payout_requests', JSON.stringify(currentRequests));
      
      setCashoutAlert({ type: 'success', message: `Cashout request for R ${stats.pendingRewards.toFixed(2)} submitted successfully! Processing will be done soon.` });
      setShowCashoutModal(false);
      setIdDocumentUrl(null);
    } catch (e) {
      console.error(e);
      setCashoutAlert({ type: 'error', message: 'Failed to submit cashout. Try again later.' });
    } finally {
      setCashoutLoading(false);
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
        <h1 className="text-2xl font-semibold text-gray-900">Referral Program</h1>
        <p className="mt-1 text-sm text-gray-500">Invite users and earn rewards for successful verified referrals with topups.</p>
      </div>

      {!stats.isCurrentUserVerified && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                <strong>Attention:</strong> You must topup more than R20.00 to qualify as a verified user and earn rewards from your referrals.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mb-6">
        <div className="flex items-center">
          <Clock className="w-5 h-5 text-amber-600 mr-2" />
          <p className="text-sm text-amber-800 font-medium">
            <strong>Limited Time Offer:</strong> The referral program ends in 90 days. Start inviting friends now to secure your bonuses!
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="p-3 bg-emerald-50 rounded-lg">
            <Coins className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Reward Money</p>
            <p className="text-xl font-bold text-gray-900">R {stats.pendingRewards.toFixed(2)}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="p-3 bg-blue-50 rounded-lg">
            <Users className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Verified Referrals</p>
            <p className="text-xl font-bold text-gray-900">{stats.verifiedCount}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="p-3 bg-indigo-50 rounded-lg">
            <ShieldCheck className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Status</p>
            <p className={`text-sm font-bold ${stats.isCurrentUserVerified ? 'text-green-600' : 'text-amber-600'}`}>
              {stats.isCurrentUserVerified ? 'Verified' : 'Unverified'}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white shadow sm:rounded-lg border border-gray-100 overflow-hidden">
            {!bankDetails ? (
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-indigo-600" />
                  Bank Details Required
                </h3>
                <div className="mt-2 max-w-xl text-sm text-gray-500">
                  <p>Please provide your bank details to unlock your referral link and start earning cashout bonuses.</p>
                </div>
                <div className="mt-5 space-y-4 max-w-sm">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Bank Name</label>
                    <input
                      type="text"
                      className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm border py-2 px-3"
                      placeholder="e.g. FNB, Standard Bank"
                      value={bankNameInput}
                      onChange={(e) => setBankNameInput(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Account Number</label>
                    <input
                      type="text"
                      className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm border py-2 px-3"
                      placeholder="Account Number"
                      value={accountNumberInput}
                      onChange={(e) => setAccountNumberInput(e.target.value.replace(/\D/g, ''))}
                    />
                  </div>
                  <button
                    onClick={() => {
                      if (bankNameInput && accountNumberInput) {
                        const details = { bankName: bankNameInput, accountNumber: accountNumberInput };
                        localStorage.setItem(`bank_details_${userId}`, JSON.stringify(details));
                        setBankDetails(details);
                      }
                    }}
                    disabled={!bankNameInput || !accountNumberInput}
                    className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                  >
                    Save & Unlock Referral Link
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="px-4 py-5 sm:p-6 relative">
                  <button
                    onClick={() => {
                      setBankNameInput(bankDetails.bankName);
                      setAccountNumberInput(bankDetails.accountNumber);
                      setBankDetails(null);
                      localStorage.removeItem(`bank_details_${userId}`);
                    }}
                    className="absolute top-4 right-4 text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center"
                  >
                    <CreditCard className="w-3 h-3 mr-1" /> Edit Bank Details
                  </button>
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
              </>
            )}
          </div>

          <div className="bg-white shadow sm:rounded-lg border border-gray-100 p-6">
             <div className="flex justify-between items-center mb-4">
               <h3 className="text-lg leading-6 font-medium text-gray-900">Recent Activity</h3>
               <button 
                 className="text-sm text-blue-600 hover:text-blue-500 font-medium disabled:opacity-50" 
                 disabled={stats.verifiedCount < 10 || !stats.isCurrentUserVerified || cashoutLoading}
                 onClick={() => setShowCashoutModal(true)}
                 title={!stats.isCurrentUserVerified ? 'You must top up more than R20 to cashout' : stats.verifiedCount < 10 ? 'Reach 10 verified users to cashout' : 'Cashout now'}
               >
                 {cashoutLoading ? 'Processing...' : 'Cashout'}
               </button>
             </div>
             {cashoutAlert.message && (
               <div className={`mb-4 p-3 rounded text-sm ${cashoutAlert.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                 {cashoutAlert.message}
               </div>
             )}
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
            <Gift className="w-5 h-5 mr-2 text-indigo-600" /> Reward Rules
          </h3>
          <ul className="space-y-4 text-sm text-gray-600">
            <li className="flex items-start">
              <div className="flex-shrink-0 h-5 w-5 rounded-full bg-green-100 flex items-center justify-center mt-0.5">
                <span className="text-green-600 font-bold text-xs">1</span>
              </div>
              <p className="ml-3">
                <strong className="text-gray-900">Cashout Milestones</strong><br/>
                Reach <strong>10 or 15</strong> verified referrals to unlock your cashout.
              </p>
            </li>
            <li className="flex items-start">
              <div className="flex-shrink-0 h-5 w-5 rounded-full bg-green-100 flex items-center justify-center mt-0.5">
                <span className="text-green-600 font-bold text-xs">2</span>
              </div>
              <p className="ml-3">
                <strong className="text-gray-900">Maximum Referrals</strong><br/>
                The maximum number of referrals you can earn from is <strong>25</strong>.
              </p>
            </li>
            <li className="flex items-start">
              <div className="flex-shrink-0 h-5 w-5 rounded-full bg-blue-100 flex items-center justify-center mt-0.5">
                <span className="text-blue-600 font-bold text-xs">🕒</span>
              </div>
              <p className="ml-3">
                <strong className="text-gray-900">Payout Hours</strong><br/>
                Payout processing runs daily from <strong>05:00 to 17:00</strong>.
              </p>
            </li>
          </ul>
        </div>
      </div>

      {/* Referral Process Explanation Table */}
      <div className="bg-white shadow sm:rounded-lg border border-gray-100 overflow-hidden mt-6">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200 bg-gray-50/50">
          <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center">
            <Gift className="w-5 h-5 mr-2 text-indigo-600 animate-pulse" />
            Cashout & Payout Information
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Milestone</th>
                <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Details</th>
                <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Processing Times</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200 text-sm">
              <tr className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap font-semibold text-gray-900">10 Referrals</td>
                <td className="px-6 py-4 text-gray-600">First cashout milestone unlocked</td>
                <td className="px-6 py-4 text-right" rowSpan={3}>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    5:00 AM - 5:00 PM
                  </span>
                </td>
              </tr>
              <tr className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap font-semibold text-gray-900">15 Referrals</td>
                <td className="px-6 py-4 text-gray-600">Second cashout milestone unlocked</td>
              </tr>
              <tr className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap font-semibold text-gray-900">25 Referrals (Max)</td>
                <td className="px-6 py-4 text-gray-600">Maximum cashout limit reached</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {showCashoutModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-0">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-gray-500/75 backdrop-blur-sm transition-opacity"
              onClick={() => setShowCashoutModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-xl shadow-xl max-w-lg w-full p-6 sm:p-8 overflow-hidden"
            >
              <div className="absolute top-4 right-4">
                <button
                  onClick={() => setShowCashoutModal(false)}
                  className="text-gray-400 hover:text-gray-500 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <h2 className="text-xl font-bold text-gray-900 mb-2">Cashout Request</h2>
              <p className="text-sm text-gray-500 mb-6">
                Please upload a clear copy of your ID document to proceed. This information is securely sent to our administrators for verification.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Upload ID Document
                  </label>
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-indigo-500 transition-colors bg-gray-50">
                    <div className="space-y-1 text-center">
                      <div className="flex flex-col items-center">
                        {idDocumentUrl ? (
                          <div className="flex flex-col items-center">
                            <Check className="mx-auto h-12 w-12 text-green-500 mb-2" />
                            <span className="text-sm font-medium text-green-600">Document Uploaded Successfully</span>
                          </div>
                        ) : (
                          <>
                            <Upload className="mx-auto h-12 w-12 text-gray-400" />
                            <div className="flex text-sm text-gray-600 mt-2">
                              <label
                                htmlFor="cashout-id-upload"
                                className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500"
                              >
                                <span>Upload a file</span>
                                <input id="cashout-id-upload" name="cashout-id-upload" type="file" className="sr-only" onChange={handleFileUpload} accept="image/*,.pdf" />
                              </label>
                              <p className="pl-1">or drag and drop</p>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">PNG, JPG, PDF up to 5MB</p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    onClick={() => setShowCashoutModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCashout}
                    disabled={!idDocumentUrl || cashoutLoading}
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    {cashoutLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Submit Cashout
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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

function WalletView({ userId, onGoToReferral, onAddNotification, onGoToGigs }: { userId: string; onGoToReferral?: () => void; onAddNotification?: (notif: { title: string; body: string; sourceTab?: Tab }) => void; onGoToGigs?: () => void; key?: string }) {
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

    // Subscribe to real-time changes to automatically update transactions & balance instantly!
    const channel = supabase
      .channel(`wallet-view-topup-changes-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'topups',
          filter: `user_id=eq.${userId}`
        },
        () => {
          fetchWalletData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [view, userId]);

  const fetchWalletData = async () => {
    console.log('Fetching wallet data for userId:', userId);
    console.log('Supabase client:', !!supabase);
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
        name: err?.name,
        stack: err?.stack
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
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      // 1. Ensure the user's profile row exists in the DB to satisfy foreign key constraint
      try {
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', user.id)
          .maybeSingle();

        if (!existingProfile) {
          console.log('Profile row missing before topup. Creating profile row now...');
          const fallbackName = user.email ? user.email.split('@')[0] : 'User';
          const metadataAvatar = user.user_metadata?.avatar_url || user.user_metadata?.picture || '';
          const metadataName = user.user_metadata?.full_name || user.user_metadata?.name || user.user_metadata?.display_name || fallbackName;
          
          const { error: profileInsErr } = await supabase
            .from('profiles')
            .insert({
              id: user.id,
              email: user.email || '',
              name: metadataName,
              avatar_url: metadataAvatar,
              status: 'Active',
              is_discoverable: true
            });
          if (profileInsErr) {
            console.warn('Profile auto-creation error:', profileInsErr.message);
          }
        }
      } catch (profileErr) {
        console.warn('Failed to verify profile row before topup:', profileErr);
      }

      let proofUrl = '';
      
      // 2. Upload file to Supabase Storage bucket 'avatars' at path 'proofs/*'
      const fileExt = uploadFile.name.split('.').pop() || 'jpg';
      const fileName = `${user.id}-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const storagePath = `proofs/${fileName}`;

      if (uploadFile.type.startsWith('image/')) {
        setReviewMessage('Optimizing proof of payment image...');
        const resizedBlob: Blob = await new Promise((resolve, reject) => {
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
              canvas.toBlob((blob) => {
                if (blob) {
                  resolve(blob);
                } else {
                  reject(new Error('Canvas conversion to blob failed'));
                }
              }, 'image/jpeg', 0.8);
            };
            img.onerror = reject;
            img.src = e.target?.result as string;
          };
          reader.onerror = reject;
          reader.readAsDataURL(uploadFile);
        });

        setReviewMessage('Uploading optimized payment proof...');
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(storagePath, resizedBlob, {
            contentType: 'image/jpeg',
            cacheControl: '3600'
          });
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(storagePath);
        proofUrl = publicUrl;
      } else {
        setReviewMessage('Uploading payment proof...');
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(storagePath, uploadFile, {
            contentType: uploadFile.type,
            cacheControl: '3600'
          });
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(storagePath);
        proofUrl = publicUrl;
      }

      setReviewMessage('Submitting topup request...');

      // Fetch the admin's profile ID to send a backup message directly via chat
      let adminId = '';
      let senderName = user.email || 'A user';
      try {
        const { data: adminData } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', '21lucihanomatthews@gmail.com')
          .maybeSingle();
        if (adminData?.id) {
          adminId = adminData.id;
        }

        const { data: userData } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', user.id)
          .maybeSingle();
        if (userData?.name) {
          senderName = userData.name;
        }
      } catch (err) {
        console.warn('Failed to query admin/user details for chat fallback:', err);
      }

      // Attempt DB insert into the 'topups' table first
      let dbInsertSuccess = true;
      try {
        const { error: insertError } = await supabase.from('topups').insert({
          user_id: user.id,
          amount: selectedOption.price,
          status: 'Pending',
          proof_url: proofUrl,
          updated_at: new Date().toISOString()
        });

        if (insertError) {
          console.warn('Failed to write to topups table, using secure chat channel fallback:', insertError);
          dbInsertSuccess = false;
        }
      } catch (err) {
        console.warn('Database error while inserting topup:', err);
        dbInsertSuccess = false;
      }

      // Construct a structured message containing the payment details
      let notificationContent = `🔔 [PAYMENT PROOF SUBMISSION]
User: ${senderName}
Amount: R ${selectedOption.price.toFixed(2)} (${selectedOption.coins} Coins)
Status: Pending
Proof of payment submitted. Please review this topup request on your Admin Dashboard under the Topups tab.
Proof Link: ${proofUrl}`;

      if (!dbInsertSuccess) {
        notificationContent += `\n\n⚠️ [Critical Fallback: Topup database registration failed. Proof media link attached below:]\n${proofUrl}`;
      }

      // Always try to send the direct chat message to the admin so they get an instant notification!
      if (adminId) {
        try {
          const { error: msgErr } = await supabase.from('messages').insert({
            sender_id: user.id,
            receiver_id: adminId,
            content: notificationContent,
            created_at: new Date().toISOString(),
            is_read: false
          });
          if (msgErr) {
            console.warn('Failed to send instant payment proof chat message to admin:', msgErr.message);
          }
        } catch (msgErr) {
          console.warn('Failed to send instant payment proof chat message to admin:', msgErr);
        }
      }

      if (dbInsertSuccess) {
        setReviewMessage('Your proof of payment has been submitted for review. Coins will be credited once approved.');
      } else {
        setReviewMessage('Proof submitted securely to Admin via fallback chat message! Coins will be credited once approved.');
      }

      // Add a review notification message for the user who completed the topup submission
      if (onAddNotification) {
        onAddNotification({
          title: '🪙 Topup Under Review',
          body: `Your topup request of R ${selectedOption.price.toFixed(2)} (${selectedOption.coins} Coins) has been submitted. It is now under review by an admin.`,
          sourceTab: 'wallet'
        });
      } else {
        // Fallback if not passed
        sendDesktopNotification('🪙 Topup Submitted', {
          body: `Your topup request of R ${selectedOption.price.toFixed(2)} has been submitted and is under review.`,
          tag: `topup-review-${Date.now()}`
        });
        playNotificationSound('notification');
      }
      
      setTimeout(() => {
        setReviewMessage('');
        setIsSubmitting(false);
        setUploadFile(null);
        setSelectedOption(null);
        setView('overview');
        if (onGoToGigs) {
          onGoToGigs();
        }
      }, 3500);
      
    } catch (err: any) {
      console.error('Detailed Error submitting topup:', {
        message: err?.message || 'Unknown error',
        code: err?.code || 'N/A',
        details: err?.details || '',
        hint: err?.hint || '',
        fullError: err
      });
      setReviewMessage(`Failed to submit. ${err?.message || 'Please try again.'}`);
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
            <div className="flex justify-center mb-4"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>
            <p className="font-medium text-lg">{reviewMessage}</p>
            <p className="text-sm mt-2 text-blue-600">Redirecting to gigs...</p>
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
                      <Upload className="mx-auto h-12 w-12 text-indigo-600" />
                      <div className="flex text-sm text-gray-600 justify-center">
                        <label
                          htmlFor="payment-proof-upload"
                          className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                        >
                          <span>{uploadFile ? uploadFile.name : 'Upload a file'}</span>
                          <input id="payment-proof-upload" name="payment-proof-upload" type="file" className="sr-only" accept="image/*,.pdf" onChange={(e) => setUploadFile(e.target.files?.[0] || null)} required />
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
                  <Coins className="w-8 h-8 text-indigo-600" />
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
        <div className="md:col-span-1 space-y-6">
          <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-fuchsia-600 shadow-xl rounded-2xl overflow-hidden relative text-white p-6 border border-white/10">
            <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-white/10 blur-2xl"></div>
            <div className="absolute bottom-0 left-0 -ml-8 -mb-8 w-24 h-24 rounded-full bg-black/10 blur-xl"></div>
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-8">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm">
                  <Wallet className="w-5 h-5 text-white" />
                </div>
                <div className="text-xs font-medium tracking-wider uppercase text-indigo-100">Premium Pass</div>
              </div>
              
              <h2 className="text-sm font-medium text-indigo-100 mb-1">Available Balance</h2>
              <div className="text-5xl font-black tracking-tight flex items-baseline">
                {loading ? <Loader2 className="w-8 h-8 animate-spin" /> : balance}
                {!loading && <span className="text-2xl text-indigo-200 ml-1">c</span>}
              </div>
              
              <button
                onClick={() => setView('topup')}
                className="mt-8 w-full inline-flex items-center justify-center px-4 py-3 shadow-lg font-bold rounded-xl text-indigo-900 bg-white hover:bg-indigo-50 focus:outline-none transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Plus className="w-5 h-5 mr-2" /> Topup Coins
              </button>
            </div>
          </div>

          <div className="bg-gradient-to-r from-amber-100 to-orange-100 rounded-2xl p-6 border border-amber-200 relative overflow-hidden shadow-sm">
            <div className="absolute -right-4 -bottom-4 opacity-20">
              <Sparkles className="w-24 h-24 text-amber-500" />
            </div>
            <div className="relative z-10">
              <h3 className="text-lg font-bold text-amber-900 mb-2 flex items-center">
                <Gift className="w-5 h-5 mr-2 text-amber-600" /> Refer & Earn!
              </h3>
              <p className="text-sm text-amber-800 mb-4 leading-relaxed font-medium">
                Get <span className="font-bold text-amber-900 bg-amber-200/50 px-1 py-0.5 rounded">free coins</span> for every friend who joins. Use your coins to unlock premium features!
              </p>
              <button 
                onClick={() => onGoToReferral && onGoToReferral()}
                className="text-sm font-bold text-amber-900 bg-white/60 hover:bg-white backdrop-blur-sm px-4 py-2.5 rounded-xl transition-colors w-full border border-amber-200 shadow-sm flex items-center justify-center"
              >
                Get My Link <ChevronRight className="w-4 h-4 ml-1" />
              </button>
            </div>
          </div>
        </div>

        <div className="md:col-span-2">
          <div className="bg-white shadow sm:rounded-lg border border-gray-100 overflow-hidden">
            <div className="px-4 py-5 border-b border-gray-200 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Recent Transactions</h3>
            </div>
            {loading ? (
              <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin text-indigo-600 mx-auto" /></div>
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
                            t.status === 'Pending' ? 'text-indigo-600' : 
                            t.status === 'Rejected' ? 'text-indigo-600' : 'text-indigo-600'
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



