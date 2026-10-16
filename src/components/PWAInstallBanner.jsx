import React, { useState, useEffect } from 'react';
import { Download, Share2, X, Smartphone, Check } from 'lucide-react';
import { subscribeInstallPrompt, promptPWAInstall, isIOSWithoutPWA, isPWAInstalled } from '../utils/pwaManager';

export default function PWAInstallBanner() {
  const [canInstall, setCanInstall] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (isPWAInstalled()) {
      setInstalled(true);
      return;
    }

    setIsIOS(isIOSWithoutPWA());

    const unsubscribe = subscribeInstallPrompt((available) => {
      setCanInstall(available);
    });

    return unsubscribe;
  }, []);

  if (installed || dismissed || (!canInstall && !isIOS)) {
    return null;
  }

  const handleInstallClick = async () => {
    const success = await promptPWAInstall();
    if (success) {
      setInstalled(true);
    }
  };

  return (
    <div className="bg-[#1E1D1C] border-2 border-[#FF7A00] p-3.5 shadow-[4px_4px_0px_#000000] text-stone-100 flex flex-wrap items-center justify-between gap-3 animate-fadeIn">
      <div className="flex items-center gap-3">
        <div className="p-2 border-2 border-[#FF7A00] bg-[#FF7A00]/20 text-[#FF7A00]">
          <Smartphone size={20} />
        </div>
        <div>
          <span className="text-xs font-black uppercase tracking-wider text-white block">
            Install Habit RPG as a Mobile / Desktop App
          </span>
          <span className="text-[11px] text-stone-400">
            {isIOS
              ? 'On iOS Safari: Tap Share button ➔ "Add to Home Screen" to enable push notifications & offline play.'
              : 'Install for instant offline access, lock screen focus audio, and badging reminders.'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {canInstall && (
          <button
            onClick={handleInstallClick}
            className="px-3.5 py-1.5 bg-[#FF7A00] text-black font-black text-xs uppercase border-2 border-black hover:bg-[#ff8f26] flex items-center gap-1.5 shadow-[2px_2px_0px_#000]"
          >
            <Download size={14} /> Install Now
          </button>
        )}
        {isIOS && (
          <span className="px-3 py-1.5 bg-stone-900 border border-stone-700 text-stone-300 text-xs font-bold flex items-center gap-1">
            <Share2 size={13} className="text-[#FF7A00]" /> Tap Share ➔ Add to Home Screen
          </span>
        )}
        <button
          onClick={() => setDismissed(true)}
          className="p-1.5 text-stone-400 hover:text-white"
          title="Dismiss"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
