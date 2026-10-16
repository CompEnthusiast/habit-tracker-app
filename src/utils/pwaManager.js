/**
 * PWA Manager & Notification Handler
 * - App Badging API (navigator.setAppBadge / clearAppBadge)
 * - PWA Install Prompt listener and trigger
 * - iOS Home Screen detection & guidance
 * - Notification permission and local reminder dispatching
 * - English & Hinglish reminder messages
 */

let deferredInstallPrompt = null;
const installListeners = new Set();

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    installListeners.forEach((listener) => listener(true));
  });

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    installListeners.forEach((listener) => listener(false));
  });
}

export function subscribeInstallPrompt(callback) {
  installListeners.add(callback);
  if (deferredInstallPrompt) {
    callback(true);
  }
  return () => installListeners.delete(callback);
}

export async function promptPWAInstall() {
  if (!deferredInstallPrompt) return false;
  try {
    deferredInstallPrompt.prompt();
    const { outcome } = await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    installListeners.forEach((listener) => listener(false));
    return outcome === 'accepted';
  } catch (err) {
    console.warn('Install prompt failed:', err);
    return false;
  }
}

export function isPWAInstalled() {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
}

export function isIOSDevice() {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(ua);
}

export function isIOSWithoutPWA() {
  return isIOSDevice() && !isPWAInstalled();
}

/**
 * Update App Badge Count (e.g. pending tasks)
 */
export async function updateAppBadge(pendingCount = 0) {
  if (typeof navigator === 'undefined') return;
  try {
    if ('setAppBadge' in navigator) {
      if (pendingCount > 0) {
        await navigator.setAppBadge(pendingCount);
      } else {
        await navigator.clearAppBadge();
      }
    }
  } catch {
    // Badging API unsupported or blocked by permissions
  }
}

/**
 * Notification Permissions
 */
export async function requestNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch {
    return 'denied';
  }
}

export function getNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

/**
 * Schedule or send in-app/push notification reminder
 */
export function sendHabitReminder({ habitTitle, isHinglish = false, streak = 0 }) {
  if (typeof window === 'undefined') return;

  const title = isHinglish ? 'Habit Reminder ⚡' : 'Discipline Reminder ⚡';
  const body = isHinglish
    ? `Subah ke ghante beet rahe hain! "${habitTitle}" bacha hai. Apna ${streak}-day streak protect karein!`
    : `Don't break the chain! Complete "${habitTitle}" today and preserve your ${streak}-day streak!`;

  if ('Notification' in window && Notification.permission === 'granted') {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.showNotification(title, {
          body,
          icon: '/favicon.svg',
          badge: '/favicon.svg',
          tag: 'habit-reminder',
          vibrate: [150, 50, 150],
          actions: [
            { action: 'mark-done', title: '✓ Done' },
            { action: 'open', title: 'Open' }
          ]
        });
      });
      return;
    }

    new Notification(title, {
      body,
      icon: '/favicon.svg'
    });
  }
}
