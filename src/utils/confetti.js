/**
 * Neo-Brutalist Confetti Particle System
 * Zero-dependency, canvas-driven angular confetti shards (rectangles, diamonds, squares with black borders)
 * Honors prefers-reduced-motion
 */

export function triggerNeoConfetti(durationMs = 2400) {
  if (typeof window === 'undefined') return;

  // Check prefers-reduced-motion
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }

  const canvas = document.createElement('canvas');
  canvas.id = 'neo-confetti-canvas';
  canvas.style.position = 'fixed';
  canvas.style.inset = '0';
  canvas.style.width = '100vw';
  canvas.style.height = '100vh';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '99999';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  const colors = ['#FF7A00', '#FFA64D', '#FFB800', '#FFFFFF', '#34D399', '#CC5200'];
  const particleCount = 80;
  const particles = [];

  for (let i = 0; i < particleCount; i++) {
    particles.push({
      x: width / 2 + (Math.random() - 0.5) * 200,
      y: height * 0.45,
      w: 8 + Math.random() * 8,
      h: 5 + Math.random() * 10,
      color: colors[Math.floor(Math.random() * colors.length)],
      vx: (Math.random() - 0.5) * 18,
      vy: -10 - Math.random() * 12,
      gravity: 0.45,
      rotation: Math.random() * 360,
      vr: (Math.random() - 0.5) * 14,
      alpha: 1,
    });
  }

  const startTime = Date.now();

  function render() {
    const elapsed = Date.now() - startTime;
    if (elapsed > durationMs) {
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
      return;
    }

    ctx.clearRect(0, 0, width, height);

    particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.rotation += p.vr;
      p.alpha = Math.max(0, 1 - elapsed / durationMs);

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.globalAlpha = p.alpha;

      // Draw drop shadow
      ctx.fillStyle = '#000000';
      ctx.fillRect(-p.w / 2 + 1.5, -p.h / 2 + 1.5, p.w, p.h);

      // Draw main shard
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);

      // Black neo-brutalist border
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(-p.w / 2, -p.h / 2, p.w, p.h);

      ctx.restore();
    });

    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
}
