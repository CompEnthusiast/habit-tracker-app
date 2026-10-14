import { Bell, BellRing } from 'lucide-react';

export default function ReminderPanel({ habits, notificationsEnabled, onEnableNotifications }) {
  const reminders = habits.filter((habit) => habit.reminderEnabled && habit.reminderTime);

  return (
    <section className="rounded-xl border-2 border-[#494848] bg-[#1E1D1C] p-6 shadow-[5px_5px_0px_#000000]">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b-2 border-[#494848]">
        {notificationsEnabled ? <BellRing size={18} className="text-[#FF7A00]" /> : <Bell size={18} className="text-[#C1C1C1]" />}
        <h2 className="text-base font-black uppercase text-white tracking-wider">REMINDERS</h2>
        <span className="ml-auto brutal-badge bg-[#100E0C] text-[#C1C1C1] rounded">
          {reminders.length} ACTIVE
        </span>
      </div>
      {reminders.length === 0 ? (
        <p className="text-xs font-mono text-[#C1C1C1]">NO ALERTS CONFIGURED. EDIT A HABIT TO ENABLE.</p>
      ) : (
        <div className="space-y-2">
          {reminders.map((habit) => (
            <div key={habit._id} className="flex items-center justify-between text-xs p-2.5 rounded border-2 border-[#494848] bg-[#100E0C] shadow-[2px_2px_0px_#000000]">
              <span className="truncate text-white font-bold">{habit.name}</span>
              <time className="ml-3 font-mono font-black text-black bg-[#FF7A00] px-2 py-0.5 rounded border border-black text-xs">{habit.reminderTime}</time>
            </div>
          ))}
        </div>
      )}
      {!notificationsEnabled && reminders.length > 0 && (
        <button onClick={onEnableNotifications} className="brutal-btn brutal-btn-primary w-full mt-4 py-2 rounded text-xs">
          ENABLE BROWSER ALERTS
        </button>
      )}
    </section>
  );
}
