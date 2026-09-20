import { Bell, BellRing } from 'lucide-react';

export default function ReminderPanel({ habits, notificationsEnabled, onEnableNotifications }) {
  const reminders = habits.filter((habit) => habit.reminderEnabled && habit.reminderTime);

  return (
    <section className="rounded-3xl border border-white/5 p-6 shadow-2xl" style={{ background: 'linear-gradient(135deg, #1e1e2e 0%, #252535 100%)' }}>
      <div className="flex items-center gap-2 mb-4">
        {notificationsEnabled ? <BellRing size={16} className="text-success" /> : <Bell size={16} className="text-gray-400" />}
        <h2 className="text-base font-bold text-white">Reminders</h2>
      </div>
      {reminders.length === 0 ? (
        <p className="text-sm text-gray-500">Add a reminder when editing a habit.</p>
      ) : (
        <div className="space-y-2">
          {reminders.map((habit) => (
            <div key={habit._id} className="flex items-center justify-between text-sm">
              <span className="truncate text-gray-300">{habit.name}</span>
              <time className="ml-3 text-cyan-300">{habit.reminderTime}</time>
            </div>
          ))}
        </div>
      )}
      {!notificationsEnabled && reminders.length > 0 && (
        <button onClick={onEnableNotifications} className="mt-4 text-xs font-semibold text-cyan-300 hover:text-white">
          Enable browser notifications
        </button>
      )}
    </section>
  );
}
