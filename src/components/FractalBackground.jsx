import { useEffect, useRef } from 'react';

function drawFractalTree(ctx, x, y, angle, depth, length) {
  if (depth === 0) return;
  const x2 = x + Math.cos(angle) * length;
  const y2 = y + Math.sin(angle) * length;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x2, y2);
  ctx.lineWidth = depth * 0.4;
  ctx.stroke();
  drawFractalTree(ctx, x2, y2, angle - 0.45, depth - 1, length * 0.72);
  drawFractalTree(ctx, x2, y2, angle + 0.45, depth - 1, length * 0.72);
}

export function FractalBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      render();
    };

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const trees = [
        { x: canvas.width * 0.12, y: canvas.height * 0.95, angle: -Math.PI / 2, depth: 9, length: 80 },
        { x: canvas.width * 0.88, y: canvas.height * 0.85, angle: -Math.PI / 2 + 0.3, depth: 8, length: 65 },
        { x: canvas.width * 0.5,  y: canvas.height * 1.02, angle: -Math.PI / 2, depth: 7, length: 55 },
        { x: canvas.width * 0.25, y: canvas.height * 0.3,  angle: Math.PI / 4,  depth: 7, length: 40 },
        { x: canvas.width * 0.78, y: canvas.height * 0.15, angle: Math.PI / 2 + 0.5, depth: 6, length: 35 },
      ];

      ctx.strokeStyle = '#7c3aed';
      ctx.globalAlpha = 0.25;

      trees.forEach(t => {
        drawFractalTree(ctx, t.x, t.y, t.angle, t.depth, t.length);
      });
    };

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 1 }}
    />
  );
}
