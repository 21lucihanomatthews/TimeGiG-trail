import { supabase } from './supabase';

export interface Profile {
  id: string;
  name: string;
  email: string;
  status: string;
}

let friendshipsSchemaVersion: 'v1' | 'v2' | null = null; // v1: user_id/friend_id, v2: user_id1/user_id2
let useLocalFallback = false;

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
  if (useLocalFallback) return 'v2';
  if (friendshipsSchemaVersion) return friendshipsSchemaVersion;
  
  try {
    const { error } = await supabase
      .from('friendships')
      .select('user_id1, user_id2')
      .limit(1);
      
    if (error) {
      if (error.code === '42P01' || error.message?.includes('does not exist') || error.message?.includes('relation')) {
        useLocalFallback = true;
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
    console.error('Detailed Error detecting friendship schema version:', {
      message: e?.message || 'Unknown error',
      code: e?.code || 'N/A',
      details: e?.details || '',
      hint: e?.hint || '',
      fullError: e
    });
    if (e && (e.code === '42P01' || e.message?.includes('does not exist') || e.message?.includes('relation'))) {
      useLocalFallback = true;
      return 'v2';
    }
    friendshipsSchemaVersion = 'v1';
  }
  return friendshipsSchemaVersion;
}

const defaultProfiles = [
  { id: 'user-alice-123', name: 'Alice Smith', email: 'alice@example.com', status: 'Verified' },
  { id: 'user-bob-456', name: 'Bob Jones', email: 'bob@example.com', status: 'Verified' },
  { id: 'user-charlie-789', name: 'Charlie Brown', email: 'charlie@example.com', status: 'Active' },
  { id: 'user-david-101', name: 'David Miller', email: 'david@example.com', status: 'Active' },
];

const getLocalContacts = async (userId: string) => {
  const localFriendships = getLocalFriendships();
  const friendships = localFriendships.filter((f: any) => f.user_id1 === userId || f.user_id2 === userId);
  const friendIds = friendships.map((f: any) => f.user_id1 === userId ? f.user_id2 : f.user_id1);

  const validFriendIds = friendIds.filter((id): id is string => typeof id === 'string' && id.trim() !== '');
  if (validFriendIds.length === 0) return [];

  let profiles: any[] = [];
  try {
    const { data } = await supabase
      .from('profiles')
      .select('id, name, email, status')
      .in('id', validFriendIds);
    if (data) profiles = data;
  } catch (err: any) {
    console.error('Detailed Error pre-fetching profiles for local contacts:', {
      message: err?.message || 'Unknown error',
      code: err?.code || 'N/A',
      details: err?.details || '',
      hint: err?.hint || '',
      fullError: err
    });
  }

  const profileMap = new Map(profiles.map(p => [p.id, p]));

  return friendships.map((f: any) => {
    const friendId = f.user_id1 === userId ? f.user_id2 : f.user_id1;
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
      .select('id, name, email')
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
    const { data } = await supabase.from('profiles').select('id, name, email, status');
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
    const version = await getFriendshipsSchemaVersion();
    if (useLocalFallback) {
      return getLocalContacts(userId);
    }
    
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
      if (friendshipError.code === '42P01' || friendshipError.message?.includes('relation') || friendshipError.message?.includes('does not exist')) {
        useLocalFallback = true;
        return getLocalContacts(userId);
      }
      throw friendshipError;
    }
    
    if (!friendships || friendships.length === 0) return [];

    const friendIds = friendships.map(f => {
      if (version === 'v2') {
        return f.user_id1 === userId ? f.user_id2 : f.user_id1;
      } else {
        return f.user_id === userId ? f.friend_id : f.user_id;
      }
    });
    
    const validFriendIds = friendIds.filter((id): id is string => typeof id === 'string' && id.trim() !== '');
    if (validFriendIds.length === 0) return [];
    
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, name, email, status')
      .in('id', validFriendIds);

    if (profilesError) throw profilesError;

    const profileMap = new Map(profiles?.map(p => [p.id, p]));

    return friendships.map((f, index) => {
      const friendId = friendIds[index];
      return {
        friend_id: friendId,
        profiles: profileMap.get(friendId) || null
      };
    });
  } catch (e: any) {
    console.error('Detailed Error fetching contacts (falling back to local):', {
      message: e?.message || 'Unknown error',
      code: e?.code || 'N/A',
      details: e?.details || '',
      hint: e?.hint || '',
      fullError: e
    });
    useLocalFallback = true;
    return getLocalContacts(userId);
  }
};

export const fetchFriendRequests = async (userId: string) => {
  try {
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
    if (validSenderIds.length === 0) return [];

    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, name, email')
      .in('id', validSenderIds);

    if (profilesError) throw profilesError;

    const profileMap = new Map(profiles?.map(p => [p.id, p]));

    return requests.map(r => ({
      id: r.id,
      sender_id: r.sender_id,
      profiles: profileMap.get(r.sender_id) || null
    }));
  } catch (e: any) {
    console.error('Detailed Error fetching friend requests (falling back to local):', {
      message: e?.message || 'Unknown error',
      code: e?.code || 'N/A',
      details: e?.details || '',
      hint: e?.hint || '',
      fullError: e
    });
    useLocalFallback = true;
    return getLocalFriendRequestsData(userId);
  }
};

export const fetchAllUsers = async (userId: string) => {
  try {
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

    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, email, status')
      .not('id', 'in', `(${validExcludedIds.join(',')})`);

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
    console.error('Detailed Error fetching all users (falling back to local):', {
      message: e?.message || 'Unknown error',
      code: e?.code || 'N/A',
      details: e?.details || '',
      hint: e?.hint || '',
      fullError: e
    });
    useLocalFallback = true;
    return getLocalAllUsers(userId);
  }
};

export const sendFriendRequest = async (senderId: string, receiverId: string) => {
  if (useLocalFallback) {
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
  if (useLocalFallback) {
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
