/**
 * Helper utility for handling standard browser Web Notifications,
 * Service Worker registration, and offline connection status monitoring.
 */

// Key for storage
const NOTIFICATION_PREF_KEY = 'desktop_notifications_enabled';
const OFFLINE_SIMULATION_KEY = 'offline_simulation_enabled';

/**
 * Check if the browser supports standard Web Notifications
 */
export const isNotificationSupported = (): boolean => {
  return typeof window !== 'undefined' && 'Notification' in window;
};

/**
 * Get the current browser Notification permission status
 */
export const getNotificationPermission = (): NotificationPermission => {
  if (!isNotificationSupported()) return 'default';
  return Notification.permission;
};

/**
 * Request notification permissions from the user
 */
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!isNotificationSupported()) return false;
  
  try {
    const permission = await Notification.requestPermission();
    const enabled = permission === 'granted';
    localStorage.setItem(NOTIFICATION_PREF_KEY, String(enabled));
    return enabled;
  } catch (err) {
    console.error('Error requesting notification permission:', err);
    return false;
  }
};

/**
 * Check if notifications are enabled in local preferences
 */
export const areNotificationsEnabled = (): boolean => {
  if (!isNotificationSupported()) return false;
  const isGranted = Notification.permission === 'granted';
  const pref = localStorage.getItem(NOTIFICATION_PREF_KEY) !== 'false'; // Default to true if permission is granted
  return isGranted && pref;
};

/**
 * Set notification preference
 */
export const setNotificationsEnabledPref = (enabled: boolean) => {
  localStorage.setItem(NOTIFICATION_PREF_KEY, String(enabled));
};

/**
 * Send a desktop notification (No-op as desktop notifications are removed per user configuration)
 */
export const sendDesktopNotification = (
  title: string,
  options?: NotificationOptions & { soundType?: 'message' | 'notification' }
) => {
  // Desktop notifications are removed. We only support in-app notifications and sound alerts.
  console.log('[Notification Removed]', title, options?.body);
};

/**
 * Setup offline network listeners to notify the user when connection changes
 */
export const setupOfflineListeners = (
  onOffline: () => void,
  onOnline: () => void
) => {
  if (typeof window === 'undefined') return () => {};

  const handleOffline = () => {
    // Send a system notification when going offline
    sendDesktopNotification('Connection Offline', {
      body: 'You are now working in offline mode. Gigs and messages will be synced when you reconnect.',
      tag: 'network-status',
    });
    onOffline();
  };

  const handleOnline = () => {
    // Send a system notification when going online
    sendDesktopNotification('Connection Restored!', {
      body: 'Your internet connection is back. Syncing your gig boards and pending chats.',
      tag: 'network-status',
    });
    onOnline();
  };

  window.addEventListener('offline', handleOffline);
  window.addEventListener('online', handleOnline);

  return () => {
    window.removeEventListener('offline', handleOffline);
    window.removeEventListener('online', handleOnline);
  };
};

/**
 * Register a lightweight service worker to support offline status and push-like alerts
 */
export const registerNotificationServiceWorker = () => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

  // We register a very simple service worker from inline data or a public endpoint.
  // Using an inline blob URL can sometimes cause origin issues, so we can write a physical file to public/sw.js
  // or serve it. Wait! Since Vite serves any file at root, we can write `/sw.js` at root.
  navigator.serviceWorker.register('/sw.js')
    .then((reg) => {
      console.log('Service Worker registered successfully for offline notifications:', reg);
    })
    .catch((err) => {
      console.warn('Service Worker registration failed:', err);
    });
};
