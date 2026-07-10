import { supabase } from './supabase';

export interface Profile {
  id: string;
  name: string;
  email: string;
  status: string;
  avatar_url?: string;
  bio?: string;
}

let friendshipsSchemaVersion: 'v1' | 'v2' | null = null;
let useLocalFallback = false;

const isUUID = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

// Function to reset fallback state (can be called to retry Supabase)
export const resetChatFallback = () => {
  useLocalFallback = false;
  friendshipsSchemaVersion = null;
};

// Local storage helpers
function getLocalFriendships(): any[] {
  try {
    const data = localStorage.getItem('mock_friendships');
    return data ? JSON.parse(data) : [];
  } catch (err: any) {
    console.error('Detailed Error reading local friendships:', {
      message: err?.message || 'Unknown error',
      code: err?.code || 'N/A',
      details: err?.details || '',
      hint: err?.hint || '',
      fullError: err
    });
    return [];
  }
}

function saveLocalFriendships(friendships: any[]) {
  try {
    localStorage.setItem('mock_friendships', JSON.stringify(friendships));
  } catch (err: any) {
    console.error('Detailed Error saving local friendships:', {
      message: err?.message || 'Unknown error',
      code: err?.code || 'N/A',
      details: err?.details || '',
      hint: err?.hint || '',
      fullError: err
    });
  }
}

function getLocalFriendRequests(): any[] {
  try {
    const data = localStorage.getItem('mock_friend_requests');
    return data ? JSON.parse(data) : [];
  } catch (err: any) {
    console.error('Detailed Error reading local friend requests:', {
      message: err?.message || 'Unknown error',
      code: err?.code || 'N/A',
      details: err?.details || '',
      hint: err?.hint || '',
      fullError: err
    });
    return [];
  }
}

function saveLocalFriendRequests(requests: any[]) {
  try {
    localStorage.setItem('mock_friend_requests', JSON.stringify(requests));
  } catch (err: any) {
    console.error('Detailed Error saving local friend requests:', {
      message: err?.message || 'Unknown error',
      code: err?.code || 'N/A',
      details: err?.details || '',
      hint: err?.hint || '',
      fullError: err
    });
  }
}

async function getFriendshipsSchemaVersion(): Promise<'v1' | 'v2'> {
  if (friendshipsSchemaVersion) return friendshipsSchemaVersion;
  
  try {
    const { error } = await supabase
      .from('friendships')
      .select('user_id1, user_id2')
      .limit(1);
      
    if (error) {
      if (error.code === '42P01' || error.message?.includes('does not exist') || error.message?.includes('relation')) {
        // Table doesn't exist, we'll use local but don't set global flag yet as other tables might exist
        return 'v2';
      }
      if (error.code === '42703' || error.message?.includes('user_id1') || error.message?.includes('column')) {
        friendshipsSchemaVersion = 'v1';
      } else {
        friendshipsSchemaVersion = 'v2';
      }
    } else {
      friendshipsSchemaVersion = 'v2';
    }
  } catch (e: any) {
    friendshipsSchemaVersion = 'v1';
  }
  return friendshipsSchemaVersion || 'v1';
}

const defaultProfiles = [
  { 
    id: 'a11ce000-0000-0000-0000-000000000000', 
    name: 'Alice Smith', 
    email: 'alice@example.com', 
    status: 'Verified',
    avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150',
    bio: 'Professional cleaner with 5 years of experience. I love making spaces sparkle!'
  },
  { 
    id: 'b0b00000-0000-0000-0000-000000000000', 
    name: 'Bob Jones', 
    email: 'bob@example.com', 
    status: 'Verified',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150',
    bio: 'Avid gardener and landscaping expert. Let me help you build your dream garden.'
  },
  { 
    id: 'c8a111e0-0000-0000-0000-000000000000', 
    name: 'Charlie Brown', 
    email: 'charlie@example.com', 
    status: 'Active',
    avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150',
    bio: 'SIRA accredited security guard. Safety and surveillance are my top priorities.'
  },
  { 
    id: 'da71d000-0000-0000-0000-000000000000', 
    name: 'David Miller', 
    email: 'david@example.com', 
    status: 'Active',
    avatar_url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=150',
    bio: 'Handyman and general repair specialist. No job is too small!'
  },
];

const getLocalContacts = async (userId: string) => {
  const localFriendships = getLocalFriendships();
  const friendships = localFriendships.filter((f: any) => f.user_id1 === userId || f.user_id2 === userId);
  const friendIds = new Set(friendships.map((f: any) => f.user_id1 === userId ? f.user_id2 : f.user_id1));

  // Also scan messages to find anyone else we've talked to
  try {
    const data = localStorage.getItem('chat_messages');
    if (data) {
      const allMessages: Message[] = JSON.parse(data);
      allMessages.forEach(m => {
        if (m.sender_id === userId) friendIds.add(m.receiver_id);
        if (m.receiver_id === userId) friendIds.add(m.sender_id);
      });
    }
  } catch (e) {
    console.warn('Error scanning messages for contacts:', e);
  }

  const validFriendIds = Array.from(friendIds).filter((id): id is string => typeof id === 'string' && id.trim() !== '');
  if (validFriendIds.length === 0) return [];

  let profiles: any[] = [];
  try {
    const { data } = await supabase
      .from('profiles')
      .select('id, name, email, status, avatar_url, bio')
      .in('id', validFriendIds);
    if (data) profiles = data;
  } catch (err: any) {
    console.warn('Error pre-fetching profiles for local contacts:', err?.message || err);
  }

  const profileMap = new Map(profiles.map(p => [p.id, p]));

  return validFriendIds.map((friendId) => {
    let profile = profileMap.get(friendId);
    if (!profile) {
      const foundMock = defaultProfiles.find(p => p.id === friendId);
      profile = foundMock || {
        id: friendId,
        name: `User ${friendId.substring(0, 4)}`,
        email: `${friendId.substring(0, 4)}@example.com`,
        status: 'Active'
      };
    }
    return {
      friend_id: friendId,
      profiles: profile
    };
  });
};

const getLocalFriendRequestsData = async (userId: string) => {
  const localRequests = getLocalFriendRequests();
  const requests = localRequests.filter((r: any) => r.receiver_id === userId);
  const senderIds = requests.map((r: any) => r.sender_id);

  const validSenderIds = senderIds.filter((id): id is string => typeof id === 'string' && id.trim() !== '');
  if (validSenderIds.length === 0) return [];

  let profiles: any[] = [];
  try {
    const { data } = await supabase
      .from('profiles')
      .select('id, name, email, avatar_url, bio')
      .in('id', validSenderIds);
    if (data) profiles = data;
  } catch (err: any) {
    console.error('Detailed Error pre-fetching profiles for local friend requests:', {
      message: err?.message || 'Unknown error',
      code: err?.code || 'N/A',
      details: err?.details || '',
      hint: err?.hint || '',
      fullError: err
    });
  }

  const profileMap = new Map(profiles.map(p => [p.id, p]));

  return requests.map((r: any) => {
    let profile = profileMap.get(r.sender_id);
    if (!profile) {
      const foundMock = defaultProfiles.find(p => p.id === r.sender_id);
      profile = foundMock || {
        id: r.sender_id,
        name: `User ${r.sender_id.substring(0, 4)}`,
        email: `${r.sender_id.substring(0, 4)}@example.com`,
        status: 'Active'
      };
    }
    return {
      id: r.id,
      sender_id: r.sender_id,
      profiles: profile
    };
  });
};

const getLocalAllUsers = async (userId: string) => {
  let profiles: any[] = [];
  try {
    let data: any[] | null = null;
    let error: any = null;
    
    const firstResult = await supabase.from('profiles').select('id, name, email, status, avatar_url, bio');
    data = firstResult.data;
    error = firstResult.error;

    if (error && error.message?.includes('status')) {
      console.warn('Profiles table missing status column in getLocalAllUsers, retrying without it');
      const retry = await supabase.from('profiles').select('id, name, email, avatar_url, bio');
      data = retry.data;
      error = retry.error;
    }
    if (data) profiles = data;
  } catch (err: any) {
    console.error('Detailed Error pre-fetching all profiles:', {
      message: err?.message || 'Unknown error',
      code: err?.code || 'N/A',
      details: err?.details || '',
      hint: err?.hint || '',
      fullError: err
    });
  }

  if (profiles.length === 0) {
    profiles = defaultProfiles;
  }

  let topups: any[] = [];
  try {
    const { data } = await supabase.from('topups').select('user_id, amount, status');
    if (data) topups = data;
  } catch (err: any) {
    console.error('Detailed Error pre-fetching topups for verification status:', {
      message: err?.message || 'Unknown error',
      code: err?.code || 'N/A',
      details: err?.details || '',
      hint: err?.hint || '',
      fullError: err
    });
  }

  const userSums: Record<string, number> = {};
  topups.forEach((t: any) => {
    if (t.status === 'Approved' || !t.status) {
      userSums[t.user_id] = (userSums[t.user_id] || 0) + Number(t.amount);
    }
  });

  const localFriendships = getLocalFriendships();
  const friendIds = localFriendships
    .filter((f: any) => f.user_id1 === userId || f.user_id2 === userId)
    .map((f: any) => f.user_id1 === userId ? f.user_id2 : f.user_id1);

  const localRequests = getLocalFriendRequests();
  const sentRequestIds = localRequests
    .filter((r: any) => r.sender_id === userId)
    .map((r: any) => r.receiver_id);
  const receivedRequestIds = localRequests
    .filter((r: any) => r.receiver_id === userId)
    .map((r: any) => r.sender_id);

  const excludedIds = new Set([userId, ...friendIds, ...sentRequestIds, ...receivedRequestIds]);
  return profiles
    .filter(p => !excludedIds.has(p.id))
    .map((p: any) => {
      const totalTopups = userSums[p.id] || 0;
      const isVerified = totalTopups >= 20 || p.status === 'Verified';
      return {
        ...p,
        status: isVerified ? 'Verified' : 'Active',
        totalTopups
      };
    })
    .filter((p: any) => p.status === 'Verified');
};

export const fetchContacts = async (userId: string) => {
  try {
    if (!isUUID(userId)) return getLocalContacts(userId);
    
    const version = await getFriendshipsSchemaVersion();
    
    let friendships: any[] | null = null;
    let friendshipError: any = null;
    
    if (version === 'v2') {
      const { data, error } = await supabase
        .from('friendships')
        .select('user_id1, user_id2')
        .or(`user_id1.eq.${userId},user_id2.eq.${userId}`);
      friendships = data;
      friendshipError = error;
    } else {
      const { data, error } = await supabase
        .from('friendships')
        .select('user_id, friend_id')
        .or(`user_id.eq.${userId},friend_id.eq.${userId}`);
      friendships = data;
      friendshipError = error;
    }
    
    if (friendshipError) {
      // If table is missing, use local fallback quietly
      if (friendshipError.code === '42P01' || friendshipError.message?.includes('relation') || friendshipError.message?.includes('does not exist')) {
        return getLocalContacts(userId);
      }
      throw friendshipError;
    }
    
    if (!friendships || friendships.length === 0) {
      // If DB is empty, also return local contacts to ensure we show something
      const local = await getLocalContacts(userId);
      return local;
    }

    const friendIds = friendships.map(f => {
      if (version === 'v2') {
        return f.user_id1 === userId ? f.user_id2 : f.user_id1;
      } else {
        return f.user_id === userId ? f.friend_id : (f.user_id || f.friend_id);
      }
    });
    
    const validFriendIds = friendIds.filter((id): id is string => typeof id === 'string' && id.trim() !== '');
    const supabaseFriendIds = validFriendIds.filter(isUUID);
    
    // Fetch profiles for these friends
    let profiles: any[] | null = null;
    let profilesError: any = null;

    if (supabaseFriendIds.length > 0) {
      const result = await supabase
        .from('profiles')
        .select('id, name, email, status, avatar_url, bio')
        .in('id', supabaseFriendIds);
      
      profiles = result.data;
      profilesError = result.error;

      if (profilesError && profilesError.message?.includes('status')) {
        console.warn('Profiles table missing status column in fetchContacts, retrying without it');
        const retry = await supabase
          .from('profiles')
          .select('id, name, email, avatar_url, bio')
          .in('id', supabaseFriendIds);
        profiles = retry.data;
        profilesError = retry.error;
      }
    } else {
      profiles = [];
      profilesError = null;
    }

    if (profilesError) {
      console.warn('Error fetching profiles for contacts, using local info:', profilesError);
    }

    const profileMap = new Map((profiles || []).map(p => [p.id, p]));

    // Also get local contacts to merge (to ensure previously made chats display)
    const localContacts = await getLocalContacts(userId);
    const result = friendships.map((f, index) => {
      const friendId = friendIds[index];
      let profile = profileMap.get(friendId);
      
      // If profile not in DB, check local contacts
      if (!profile) {
        const local = localContacts.find(lc => lc.friend_id === friendId);
        if (local) profile = local.profiles;
      }

      return {
        friend_id: friendId,
        profiles: profile || {
          id: friendId,
          name: `User ${friendId.substring(0, 4)}`,
          status: 'Active'
        }
      };
    });

    // Merge in any local contacts that aren't in the DB friendships yet
    localContacts.forEach(lc => {
      if (!result.some(r => r.friend_id === lc.friend_id)) {
        result.push(lc);
      }
    });

    return result;
  } catch (e: any) {
    console.warn('Error fetching contacts from DB, falling back to local:', e?.message || e);
    return getLocalContacts(userId);
  }
};

export const fetchFriendRequests = async (userId: string) => {
  try {
    if (!isUUID(userId)) return getLocalFriendRequestsData(userId);
    await getFriendshipsSchemaVersion();
    if (useLocalFallback) {
      return getLocalFriendRequestsData(userId);
    }

    const { data: requests, error: requestsError } = await supabase
      .from('friend_requests')
      .select('id, sender_id')
      .eq('receiver_id', userId);
    
    if (requestsError) {
      if (requestsError.code === '42P01' || requestsError.message?.includes('relation') || requestsError.message?.includes('does not exist')) {
        useLocalFallback = true;
        return getLocalFriendRequestsData(userId);
      }
      throw requestsError;
    }
    if (!requests || requests.length === 0) return [];

    const senderIds = requests.map(r => r.sender_id);
    const validSenderIds = senderIds.filter((id): id is string => typeof id === 'string' && id.trim() !== '');
    const supabaseSenderIds = validSenderIds.filter(isUUID);

    const { data: profiles, error: profilesError } = supabaseSenderIds.length > 0
      ? await supabase
        .from('profiles')
        .select('id, name, email, avatar_url, bio')
        .in('id', supabaseSenderIds)
      : { data: [], error: null };

    if (profilesError) throw profilesError;

    const profileMap = new Map((profiles || []).map(p => [p.id, p] as [string, any]));

    return requests.map(r => ({
      id: r.id,
      sender_id: r.sender_id,
      profiles: profileMap.get(r.sender_id) || null
    }));
  } catch (e: any) {
    if (e?.code === '42P01' || e?.message?.includes('does not exist')) {
      return getLocalFriendRequestsData(userId);
    }
    console.warn('Error fetching friend requests from DB, falling back to local:', e?.message || e);
    useLocalFallback = true;
    return getLocalFriendRequestsData(userId);
  }
};

export const fetchAllUsers = async (userId: string) => {
  try {
    if (!isUUID(userId)) return getLocalAllUsers(userId);
    const version = await getFriendshipsSchemaVersion();
    if (useLocalFallback) {
      return getLocalAllUsers(userId);
    }
    
    let friendships: any[] | null = null;
    if (version === 'v2') {
      const { data, error } = await supabase
        .from('friendships')
        .select('user_id1, user_id2')
        .or(`user_id1.eq.${userId},user_id2.eq.${userId}`);
      if (error && (error.code === '42P01' || error.message?.includes('does not exist'))) {
        useLocalFallback = true;
        return getLocalAllUsers(userId);
      }
      friendships = data;
    } else {
      const { data, error } = await supabase
        .from('friendships')
        .select('user_id, friend_id')
        .or(`user_id.eq.${userId},friend_id.eq.${userId}`);
      if (error && (error.code === '42P01' || error.message?.includes('does not exist'))) {
        useLocalFallback = true;
        return getLocalAllUsers(userId);
      }
      friendships = data;
    }

    const friendIds = friendships?.map(f => {
      if (version === 'v2') {
        return f.user_id1 === userId ? f.user_id2 : f.user_id1;
      } else {
        return f.user_id === userId ? f.friend_id : f.user_id;
      }
    }) || [];

    // Get sent request receiver_ids
    const { data: sentRequests, error: sentReqError } = await supabase
      .from('friend_requests')
      .select('receiver_id')
      .eq('sender_id', userId);

    if (sentReqError && (sentReqError.code === '42P01' || sentReqError.message?.includes('does not exist'))) {
      useLocalFallback = true;
      return getLocalAllUsers(userId);
    }

    const sentRequestIds = sentRequests?.map(r => r.receiver_id) || [];

    const excludedIds = [userId, ...friendIds, ...sentRequestIds];
    const validExcludedIds = excludedIds.filter((id): id is string => typeof id === 'string' && id.trim() !== '');
    
    // Filter out non-UUIDs for Supabase query if they look like local mock IDs
    const supabaseExcludedIds = validExcludedIds.filter(isUUID);

    let query = supabase
      .from('profiles')
      .select('id, name, email, status, avatar_url, bio');
    
    if (supabaseExcludedIds.length > 0) {
      query = query.not('id', 'in', supabaseExcludedIds);
    }

    let data: any[] | null = null;
    let error: any = null;

    const firstResult = await query;
    data = firstResult.data;
    error = firstResult.error;

    if (error && error.message?.includes('status')) {
      // Try again without status column if it's missing
      console.warn('Profiles table missing status column, retrying without it');
      let retryQuery = supabase
        .from('profiles')
        .select('id, name, email, avatar_url, bio');
      if (supabaseExcludedIds.length > 0) {
        retryQuery = retryQuery.not('id', 'in', supabaseExcludedIds);
      }
      const retry = await retryQuery;
      data = retry.data;
      error = retry.error;
    }

    if (error) throw error;

    let topups: any[] = [];
    try {
      const { data: topupData } = await supabase.from('topups').select('user_id, amount, status');
      if (topupData) topups = topupData;
    } catch (err: any) {
      console.error('Detailed Error pre-fetching topups in all users view:', {
        message: err?.message || 'Unknown error',
        code: err?.code || 'N/A',
        details: err?.details || '',
        hint: err?.hint || '',
        fullError: err
      });
    }

    const userSums: Record<string, number> = {};
    topups.forEach((t: any) => {
      if (t.status === 'Approved' || !t.status) {
        userSums[t.user_id] = (userSums[t.user_id] || 0) + Number(t.amount);
      }
    });

    const enriched = (data || []).map((p: any) => {
      const totalTopups = userSums[p.id] || 0;
      const isVerified = totalTopups >= 20 || p.status === 'Verified';
      return {
        ...p,
        status: isVerified ? 'Verified' : 'Active',
        totalTopups
      };
    });

    return enriched.filter((p: any) => p.status === 'Verified');
  } catch (e: any) {
    if (e?.code === '42P01' || e?.message?.includes('does not exist')) {
      return getLocalAllUsers(userId);
    }
    console.warn('Error fetching all users from DB, falling back to local:', e?.message || e);
    useLocalFallback = true;
    return getLocalAllUsers(userId);
  }
};

export const sendFriendRequest = async (senderId: string, receiverId: string) => {
  if (useLocalFallback || !isUUID(senderId) || !isUUID(receiverId)) {
    const localRequests = getLocalFriendRequests();
    if (!localRequests.some((r: any) => r.sender_id === senderId && r.receiver_id === receiverId)) {
      localRequests.push({
        id: Math.random().toString(36).substring(2, 15),
        sender_id: senderId,
        receiver_id: receiverId,
        status: 'pending',
        created_at: new Date().toISOString()
      });
      saveLocalFriendRequests(localRequests);
    }
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('friend_requests')
      .insert({ sender_id: senderId, receiver_id: receiverId });
    if (error) {
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        useLocalFallback = true;
        return sendFriendRequest(senderId, receiverId);
      }
      throw error;
    }
    return data;
  } catch (e) {
    useLocalFallback = true;
    return sendFriendRequest(senderId, receiverId);
  }
};

export const acceptFriendRequest = async (requestId: string, senderId: string, receiverId: string) => {
  if (useLocalFallback || !isUUID(senderId) || !isUUID(receiverId)) {
    // Remove request
    const localRequests = getLocalFriendRequests();
    const updatedRequests = localRequests.filter((r: any) => r.id !== requestId);
    saveLocalFriendRequests(updatedRequests);

    // Add friendship
    const localFriendships = getLocalFriendships();
    if (!localFriendships.some((f: any) => 
      (f.user_id1 === senderId && f.user_id2 === receiverId) || 
      (f.user_id1 === receiverId && f.user_id2 === senderId)
    )) {
      localFriendships.push({
        id: Math.random().toString(36).substring(2, 15),
        user_id1: senderId,
        user_id2: receiverId,
        created_at: new Date().toISOString()
      });
      saveLocalFriendships(localFriendships);
    }
    return [];
  }

  try {
    const { error: deleteRequestError } = await supabase
      .from('friend_requests')
      .delete()
      .eq('id', requestId);
      
    if (deleteRequestError) {
      if (deleteRequestError.code === '42P01' || deleteRequestError.message?.includes('does not exist')) {
        useLocalFallback = true;
        return acceptFriendRequest(requestId, senderId, receiverId);
      }
      throw deleteRequestError;
    }

    const version = await getFriendshipsSchemaVersion();
    let insertData: any = {};
    if (version === 'v2') {
      insertData = { user_id1: senderId, user_id2: receiverId };
    } else {
      insertData = { user_id: senderId, friend_id: receiverId };
    }

    const { data, error: insertFriendshipError } = await supabase
      .from('friendships')
      .insert(insertData);
      
    if (insertFriendshipError) throw insertFriendshipError;
    return data;
  } catch (e) {
    useLocalFallback = true;
    return acceptFriendRequest(requestId, senderId, receiverId);
  }
};

export const rejectFriendRequest = async (requestId: string) => {
  if (useLocalFallback) {
    const localRequests = getLocalFriendRequests();
    const updatedRequests = localRequests.filter((r: any) => r.id !== requestId);
    saveLocalFriendRequests(updatedRequests);
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('friend_requests')
      .delete()
      .eq('id', requestId);
      
    if (error) {
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        useLocalFallback = true;
        return rejectFriendRequest(requestId);
      }
      throw error;
    }
    return data;
  } catch (e) {
    useLocalFallback = true;
    return rejectFriendRequest(requestId);
  }
};

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
}

export const getLocalMessages = (userId1: string, userId2: string): Message[] => {
  try {
    const data = localStorage.getItem('chat_messages');
    if (!data) return [];
    const allMessages: Message[] = JSON.parse(data);
    return allMessages.filter(
      (m) =>
        (m.sender_id === userId1 && m.receiver_id === userId2) ||
        (m.sender_id === userId2 && m.receiver_id === userId1)
    ).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  } catch (e) {
    return [];
  }
};

export const sendLocalMessage = (senderId: string, receiverId: string, content: string): Message => {
  const newMessage: Message = {
    id: Math.random().toString(36).substring(2, 15),
    sender_id: senderId,
    receiver_id: receiverId,
    content,
    created_at: new Date().toISOString()
  };

  try {
    const data = localStorage.getItem('chat_messages');
    const allMessages: Message[] = data ? JSON.parse(data) : [];
    const isDuplicate = allMessages.some(
      (m) =>
        m.sender_id === senderId &&
        m.receiver_id === receiverId &&
        m.content === content &&
        (new Date().getTime() - new Date(m.created_at).getTime()) < 3000
    );
    if (!isDuplicate) {
      allMessages.push(newMessage);
      localStorage.setItem('chat_messages', JSON.stringify(allMessages));
    }
  } catch (e: any) {
    console.error('Detailed Error saving local message:', {
      message: e?.message || 'Unknown error',
      code: e?.code || 'N/A',
      details: e?.details || '',
      hint: e?.hint || '',
      fullError: e
    });
  }

  return newMessage;
};

export const ensureFriendship = async (userId: string, friendId: string) => {
  // 1. Ensure in local friendships
  const localFriendships = getLocalFriendships();
  const alreadyFriends = localFriendships.some((f: any) => 
    (f.user_id1 === userId && f.user_id2 === friendId) || 
    (f.user_id1 === friendId && f.user_id2 === userId)
  );
  if (!alreadyFriends) {
    localFriendships.push({
      id: Math.random().toString(36).substring(2, 15),
      user_id1: userId,
      user_id2: friendId,
      created_at: new Date().toISOString()
    });
    saveLocalFriendships(localFriendships);
  }

  // 2. Try DB if available
  try {
    const version = await getFriendshipsSchemaVersion();
    if (useLocalFallback) return;

    let query;
    if (version === 'v2') {
      query = supabase
        .from('friendships')
        .select('id')
        .or(`and(user_id1.eq.${userId},user_id2.eq.${friendId}),and(user_id1.eq.${friendId},user_id2.eq.${userId})`);
    } else {
      query = supabase
        .from('friendships')
        .select('id')
        .or(`and(user_id.eq.${userId},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${userId})`);
    }
    const { data: existing } = await query;
    if (!existing || existing.length === 0) {
      let insertData: any = {};
      if (version === 'v2') {
        insertData = { user_id1: userId, user_id2: friendId };
      } else {
        insertData = { user_id: userId, friend_id: friendId };
      }
      await supabase.from('friendships').insert(insertData);
    }
  } catch (e: any) {
    console.error('Detailed Error ensuring friendship sync:', {
      message: e?.message || 'Unknown error',
      code: e?.code || 'N/A',
      details: e?.details || '',
      hint: e?.hint || '',
      fullError: e
    });
  }
};
