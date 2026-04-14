import React, { useEffect, useRef, useState } from 'react';

interface NebulaBackgroundProps {
  opacity?: number;
  className?: string;
  theme?: 'light' | 'dark';
  quality?: 'low' | 'medium' | 'high';
}

interface Star {
  x: number;
  y: number;
  size: number;
  brightness: number;
  twinkleSpeed: number;
  twinklePhase: number;
}

type OrbiterType = 'comet' | 'planet' | 'asteroid';

interface Orbiter {
  type: OrbiterType;
  angle: number;
  radius: number;
  baseSpeed: number;
  pullSpeed: number;
  size: number;
  alpha: number;
  color: string;
  trail: Array<{ x: number; y: number }>;
  inclination: number;
  direction: 1 | -1;
}

export const NebulaBackground: React.FC<NebulaBackgroundProps> = ({
  opacity = 1,
  className = '',
  theme = 'dark',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => setPrefersReducedMotion(event.matches);
    mediaQuery.addEventListener('change', handleChange);

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    if (theme !== 'dark') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId = 0;
    let time = 0;
    let lastFrameTime = 0;
    const targetFps = prefersReducedMotion ? 30 : 60;
    const frameInterval = 1000 / targetFps;

    let orbiters: Orbiter[] = [];
    let stars: Star[] = [];
    let centerX = 0;
    let centerY = 0;
    let viewportWidth = 0;
    let viewportHeight = 0;
    let lastWidth = window.innerWidth;

    const initStars = (width: number, height: number) => {
      const starCount = Math.min(300, Math.floor((width * height) / 7000));
      stars = [];

      for (let index = 0; index < starCount; index += 1) {
        stars.push({
          x: Math.random() * width,
          y: Math.random() * height,
          size: Math.random() * 1.8 + 0.3,
          brightness: Math.random() * 0.6 + 0.3,
          twinkleSpeed: Math.random() * 0.02 + 0.005,
          twinklePhase: Math.random() * Math.PI * 2,
        });
      }
    };

    const createOrbiter = (type?: OrbiterType): Orbiter => {
      const random = Math.random();
      const orbiterType = type ?? (random > 0.9 ? 'planet' : random > 0.7 ? 'comet' : 'asteroid');

      let size = 1.2 + Math.random() * 1.5;
      let color = 'rgba(180, 180, 180,';
      let radius = 80 + Math.random() * 520;
      let baseSpeed = 0.0004 + Math.random() * 0.001;

      if (orbiterType === 'planet') {
        size = 3 + Math.random() * 4;
        color = Math.random() > 0.5 ? 'rgba(255, 200, 100,' : 'rgba(180, 140, 80,';
        radius = 250 + Math.random() * 400;
      } else if (orbiterType === 'comet') {
        size = 1 + Math.random();
        color = 'rgba(255, 240, 180,';
        radius = 150 + Math.random() * 450;
        baseSpeed *= 1.5;
      } else {
        size = 1 + Math.random() * 2;
        color = 'rgba(180, 180, 180,';
        radius = 200 + Math.random() * 300;
      }

      return {
        type: orbiterType,
        angle: Math.random() * Math.PI * 2,
        radius,
        baseSpeed,
        pullSpeed: 0.03 + Math.random() * 0.08,
        size,
        alpha: 0.4 + Math.random() * 0.4,
        color,
        trail: [],
        inclination: 0.3 + Math.random() * 0.2,
        direction: 1,
      };
    };

    const init = () => {
      const currentWidth = window.innerWidth;
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

      if (isMobile && currentWidth === lastWidth && orbiters.length > 0) {
        return;
      }

      const targetHeight = isMobile ? window.screen.height : window.innerHeight;

      lastWidth = currentWidth;
      viewportWidth = currentWidth;
      viewportHeight = targetHeight;

      const dpr = window.devicePixelRatio || 1;
      canvas.width = viewportWidth * dpr;
      canvas.height = viewportHeight * dpr;
      canvas.style.width = `${viewportWidth}px`;
      canvas.style.height = `${viewportHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      centerX = viewportWidth * 0.5;
      centerY = viewportHeight * 0.5;

      initStars(viewportWidth, viewportHeight);

      orbiters = [];
      const orbiterCount = prefersReducedMotion ? 40 : 120;
      for (let index = 0; index < orbiterCount; index += 1) {
        orbiters.push(createOrbiter());
      }

      ctx.fillStyle = 'rgb(0, 0, 0)';
      ctx.fillRect(0, 0, viewportWidth, viewportHeight);
    };

    const drawStars = (currentTime: number) => {
      stars.forEach(star => {
        const twinkle = Math.sin(currentTime * star.twinkleSpeed + star.twinklePhase);
        const currentBrightness = star.brightness * (0.6 + twinkle * 0.4);

        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${currentBrightness})`;
        ctx.fill();
      });
    };

    const drawLiquidGas = (currentTime: number) => {
      for (let index = 0; index < 3; index += 1) {
        const shift = currentTime * (0.1 + index * 0.05);
        const gasRadius = 250 + index * 100;
        const gasX = centerX + Math.cos(shift) * 20;
        const gasY = centerY + Math.sin(shift) * 10;

        const gas = ctx.createRadialGradient(gasX, gasY, 50, gasX, gasY, gasRadius);
        gas.addColorStop(0, 'rgba(0, 0, 0, 0)');
        gas.addColorStop(0.4, `rgba(40, 30, 10, ${0.01 + index * 0.005})`);
        gas.addColorStop(0.7, 'rgba(0, 0, 0, 0.02)');
        gas.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = gas;
        ctx.fillRect(0, 0, viewportWidth, viewportHeight);
      }
    };

    const animate = (currentFrameTime: number) => {
      const deltaTime = currentFrameTime - lastFrameTime;
      if (deltaTime < frameInterval) {
        animationFrameId = requestAnimationFrame(animate);
        return;
      }

      lastFrameTime = currentFrameTime - (deltaTime % frameInterval);
      time += 0.016;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
      ctx.fillRect(0, 0, viewportWidth, viewportHeight);

      drawStars(time);

      const glowGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 400);
      glowGradient.addColorStop(0, 'rgba(200, 160, 100, 0.08)');
      glowGradient.addColorStop(0.1, 'rgba(180, 140, 80, 0.05)');
      glowGradient.addColorStop(0.2, 'rgba(160, 120, 60, 0.03)');
      glowGradient.addColorStop(0.4, 'rgba(140, 100, 40, 0.015)');
      glowGradient.addColorStop(0.6, 'rgba(120, 80, 20, 0.008)');
      glowGradient.addColorStop(0.8, 'rgba(100, 60, 10, 0.003)');
      glowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = glowGradient;
      ctx.fillRect(0, 0, viewportWidth, viewportHeight);

      drawLiquidGas(time);

      orbiters.forEach((orbiter, index) => {
        orbiter.angle += orbiter.baseSpeed * (300 / Math.max(orbiter.radius, 20)) * orbiter.direction;
        orbiter.radius -= orbiter.pullSpeed * (200 / Math.max(orbiter.radius, 20));

        const x = centerX + Math.cos(orbiter.angle) * orbiter.radius;
        const y = centerY + Math.sin(orbiter.angle) * orbiter.radius * orbiter.inclination;

        if (orbiter.type === 'comet') {
          orbiter.trail.unshift({ x, y });
          if (orbiter.trail.length > 30) {
            orbiter.trail.pop();
          }
        }

        const expansion = Math.max(1, 120 / Math.max(orbiter.radius, 10));
        const collapse = Math.min(1, Math.max(0, (orbiter.radius - 22) / 30));
        const finalAlpha = Math.min(1, orbiter.alpha * expansion * (0.5 + collapse * 0.5));
        const finalSize = orbiter.size * expansion * collapse;

        if (finalSize > 0.1 && finalAlpha > 0.01) {
          if (orbiter.type === 'comet') {
            ctx.beginPath();
            ctx.moveTo(x, y);
            orbiter.trail.forEach((position, trailIndex) => {
              const tailAlpha = finalAlpha * (1 - trailIndex / orbiter.trail.length) * 0.5;
              ctx.strokeStyle = `${orbiter.color}${tailAlpha})`;
              ctx.lineWidth = finalSize * (1 - trailIndex / orbiter.trail.length);
              ctx.lineTo(position.x, position.y);
            });
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(x, y, finalSize * 1.5, 0, Math.PI * 2);
            ctx.fillStyle = `${orbiter.color}${finalAlpha})`;
            ctx.fill();
          } else if (orbiter.type === 'planet') {
            const gradient = ctx.createRadialGradient(x - finalSize / 3, y - finalSize / 3, 1, x, y, finalSize);
            gradient.addColorStop(0, `${orbiter.color}${finalAlpha})`);
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0.8)');

            ctx.beginPath();
            ctx.arc(x, y, finalSize, 0, Math.PI * 2);
            ctx.fillStyle = gradient;
            ctx.fill();
          } else {
            ctx.beginPath();
            ctx.moveTo(x + finalSize, y);
            for (let shapeIndex = 1; shapeIndex < 6; shapeIndex += 1) {
              const angle = (shapeIndex * Math.PI * 2) / 6;
              const radius = finalSize * (0.8 + Math.random() * 0.4);
              ctx.lineTo(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius);
            }
            ctx.closePath();
            ctx.fillStyle = `${orbiter.color}${finalAlpha})`;
            ctx.fill();
          }
        }

        if (orbiter.radius < 22) {
          orbiters[index] = createOrbiter(orbiter.type);
        }
      });

      const ringIntensity = 0.3 + Math.sin(time * 1.5) * 0.1;
      const ringRadius = 42;
      const photonRing = ctx.createRadialGradient(centerX, centerY, ringRadius - 5, centerX, centerY, ringRadius + 10);
      photonRing.addColorStop(0, 'rgba(0, 0, 0, 0)');
      photonRing.addColorStop(0.4, `rgba(255, 230, 200, ${ringIntensity * 0.4})`);
      photonRing.addColorStop(0.6, `rgba(255, 255, 255, ${ringIntensity * 0.6})`);
      photonRing.addColorStop(0.8, `rgba(200, 170, 140, ${ringIntensity * 0.3})`);
      photonRing.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = photonRing;
      ctx.beginPath();
      ctx.arc(centerX, centerY, ringRadius + 15, 0, Math.PI * 2);
      ctx.fill();

      const singularity = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 60);
      singularity.addColorStop(0, 'rgba(0, 0, 0, 0.95)');
      singularity.addColorStop(0.5, 'rgba(0, 0, 0, 0.5)');
      singularity.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = singularity;
      ctx.beginPath();
      ctx.arc(centerX, centerY, 60, 0, Math.PI * 2);
      ctx.fill();

      animationFrameId = requestAnimationFrame(animate);
    };

    window.addEventListener('resize', init, { passive: true });
    init();
    animationFrameId = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', init);
      cancelAnimationFrame(animationFrameId);
    };
  }, [prefersReducedMotion, theme]);

  if (theme !== 'dark') return null;

  return (
    <canvas
      ref={canvasRef}
      className={`fixed inset-0 pointer-events-none z-0 ${className}`}
      style={{ opacity }}
    />
  );
};

export default NebulaBackground;
