import * as React from "react";

type LightningProps = {
  hue?: number;
  xOffset?: number;
  speed?: number;
  intensity?: number;
  size?: number;
  className?: string;
};

export default function Lightning({
  hue = 220,
  xOffset = 0,
  speed = 1,
  intensity = 1,
  size = 1,
  className,
}: LightningProps) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let t = 0;

    const resize = () => {
      const { devicePixelRatio = 1 } = window;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      canvas.width = Math.floor(width * devicePixelRatio);
      canvas.height = Math.floor(height * devicePixelRatio);
      ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    };

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      t += 0.005 * speed;
      ctx.clearRect(0, 0, w, h);
      const grad = ctx.createLinearGradient(0, 0, w, h);
      const baseHue = (hue + xOffset) % 360;
      const shift = Math.sin(t) * 30 * intensity;
      grad.addColorStop(0, `hsl(${baseHue + shift}, 80%, ${30 + 10 * intensity}%)`);
      grad.addColorStop(1, `hsl(${baseHue - shift}, 80%, ${10 + 10 * intensity}%)`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      const lines = Math.max(3, Math.floor(8 * size));
      for (let i = 0; i < lines; i++) {
        const y = ((i + 1) / (lines + 1)) * h;
        const amp = (h / 20) * intensity;
        ctx.beginPath();
        ctx.moveTo(0, y);
        for (let x = 0; x <= w; x += 20) {
          const noise = Math.sin(x / 60 + t * 6 + i) * amp * Math.sin(t * 2 + i);
          ctx.lineTo(x, y + noise);
        }
        ctx.strokeStyle = `hsla(${baseHue + 20}, 100%, 85%, ${0.05 + 0.05 * intensity})`;
        ctx.lineWidth = 1 + intensity;
        ctx.stroke();
      }

      raf = requestAnimationFrame(draw);
    };

    resize();
    draw();
    window.addEventListener("resize", resize);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [hue, xOffset, speed, intensity, size]);

  return (
    <div className={className} style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />
    </div>
  );
}
