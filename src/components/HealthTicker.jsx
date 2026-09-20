import { HeartPulse } from 'lucide-react';

const HEALTH_TIPS = [
  'Drink water regularly throughout the day',
  'Take a short movement break every hour',
  'Keep a consistent sleep schedule',
  'Spend a few minutes outside today',
  'Take slow breaths when stress rises',
  'Celebrate progress instead of chasing perfection',
];

export default function HealthTicker() {
  const tips = [...HEALTH_TIPS, ...HEALTH_TIPS];

  return (
    <section className="health-ticker" aria-label="Health tips">
      <div className="health-ticker__label">
        <HeartPulse size={16} aria-hidden="true" />
        <span>Health Tips</span>
      </div>
      <div className="health-ticker__viewport">
        <div className="health-ticker__track">
          {tips.map((tip, index) => (
            <span className="health-ticker__tip" key={`${tip}-${index}`}>
              <span className="health-ticker__dot" aria-hidden="true" />
              {tip}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
