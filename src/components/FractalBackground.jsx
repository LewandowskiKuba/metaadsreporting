import { useEffect, useRef } from 'react';

export function FractalBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const ripples = [];

    const spawnRipple = () => {
      ripples.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: 0,
        maxR: 80 + Math.random() * 120,
        speed: 0.5 + Math.random() * 0.8,
        alpha: 0.25,
      });
    };

    // spawn initial ripples spread out in time
    for (let i = 0; i < 6; i++) {
      setTimeout(spawnRipple, i * 800);
    }
    const spawnInterval = setInterval(spawnRipple, 1200);

    let raf;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = ripples.length - 1; i >= 0; i--) {
        const rp = ripples[i];
        rp.r += rp.speed;
        rp.alpha = 0.25 * (1 - rp.r / rp.maxR);

        ctx.beginPath();
        ctx.arc(rp.x, rp.y, rp.r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(174, 34, 138, ${rp.alpha})`;
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // second inner ring slightly behind
        if (rp.r > 18) {
          const r2 = rp.r - 18;
          const a2 = 0.18 * (1 - r2 / rp.maxR);
          ctx.beginPath();
          ctx.arc(rp.x, rp.y, r2, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(174, 34, 138, ${a2})`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }

        if (rp.r >= rp.maxR) ripples.splice(i, 1);
      }

      raf = requestAnimationFrame(draw);
    };

    draw();

    const onResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(raf);
      clearInterval(spawnInterval);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 1 }}
    />
  );
}
