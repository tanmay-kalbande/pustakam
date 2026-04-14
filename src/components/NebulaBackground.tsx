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
  shapePoints: number[];
}

const QUALITY_MULTIPLIER: Record<NonNullable<NebulaBackgroundProps['quality']>, number> = {
  low: 0.42,
  medium: 0.68,
  high: 1,
};

export const NebulaBackground: React.FC<NebulaBackgroundProps> = ({
  opacity = 1,
  className = '',
  theme = 'dark',
  quality = 'medium',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [isDocumentVisible, setIsDocumentVisible] = useState(() => document.visibilityState === 'visible');

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleMotionChange = (event: MediaQueryListEvent) => setPrefersReducedMotion(event.matches);

    setPrefersReducedMotion(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleMotionChange);

    return () => mediaQuery.removeEventListener('change', handleMotionChange);
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => setIsDocumentVisible(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  useEffect(() => {
    if (theme !== 'dark') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    let animationFrameId = 0;
    let resizeFrameId = 0;
    let time = 0;
    let lastFrameTime = 0;
    let renderWidth = 0;
    let renderHeight = 0;
    let centerX = 0;
    let centerY = 0;
    let stars: Star[] = [];
    let orbiters: Orbiter[] = [];

    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    const lowPowerDevice = (navigator.hardwareConcurrency ?? 8) <= 4;
    const densityMultiplier =
      QUALITY_MULTIPLIER[quality]
      * (isMobile ? 0.72 : 1)
      * (lowPowerDevice ? 0.78 : 1)
      * (prefersReducedMotion ? 0.6 : 1);
    const targetFps = prefersReducedMotion ? 20 : isMobile || lowPowerDevice ? 30 : 42;
    const frameInterval = 1000 / targetFps;

    const initStars = (width: number, height: number) => {
      const starCount = Math.max(28, Math.floor((width * height) / 18000 * densityMultiplier));
      stars = Array.from({ length: starCount }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 1.4 + 0.25,
        brightness: Math.random() * 0.5 + 0.25,
        twinkleSpeed: Math.random() * 0.018 + 0.004,
        twinklePhase: Math.random() * Math.PI * 2,
      }));
    };

    const createOrbiter = (type?: OrbiterType): Orbiter => {
      const random = Math.random();
      const orbiterType = type ?? (random > 0.88 ? 'planet' : random > 0.7 ? 'comet' : 'asteroid');

      let size = 1.1 + Math.random() * 1.5;
      let color = 'rgba(180, 180, 180,';
      let radius = 120 + Math.random() * 420;
      let baseSpeed = 0.00045 + Math.random() * 0.0008;

      if (orbiterType === 'planet') {
        size = 2.8 + Math.random() * 3.8;
        color = Math.random() > 0.45 ? 'rgba(255, 204, 120,' : 'rgba(170, 130, 76,';
        radius = 220 + Math.random() * 340;
      } else if (orbiterType === 'comet') {
        size = 0.9 + Math.random() * 1.2;
        color = 'rgba(255, 235, 180,';
        radius = 160 + Math.random() * 380;
        baseSpeed *= 1.35;
      }

      return {
        type: orbiterType,
        angle: Math.random() * Math.PI * 2,
        radius,
        baseSpeed,
        pullSpeed: 0.028 + Math.random() * 0.05,
        size,
        alpha: 0.3 + Math.random() * 0.35,
        color,
        trail: [],
        inclination: 0.38 + Math.random() * 0.18,
        direction: 1,
        shapePoints: Array.from({ length: 6 }, () => 0.78 + Math.random() * 0.36),
      };
    };

    const init = () => {
      renderWidth = window.innerWidth;
      renderHeight = Math.max(window.innerHeight, document.documentElement.clientHeight);
      centerX = renderWidth * 0.5;
      centerY = renderHeight * 0.5;

      const devicePixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = renderWidth * devicePixelRatio;
      canvas.height = renderHeight * devicePixelRatio;
      canvas.style.width = `${renderWidth}px`;
      canvas.style.height = `${renderHeight}px`;
      context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);

      initStars(renderWidth, renderHeight);

      const orbiterCount = Math.max(12, Math.floor(58 * densityMultiplier));
      orbiters = Array.from({ length: orbiterCount }, () => createOrbiter());

      context.fillStyle = 'rgb(0, 0, 0)';
      context.fillRect(0, 0, renderWidth, renderHeight);
    };

    const drawStars = (currentTime: number) => {
      for (const star of stars) {
        const twinkle = Math.sin(currentTime * star.twinkleSpeed + star.twinklePhase);
        const brightness = star.brightness * (0.68 + twinkle * 0.32);
        context.beginPath();
        context.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        context.fillStyle = `rgba(255, 255, 255, ${brightness})`;
        context.fill();
      }
    };

    const drawBackdrop = (currentTime: number) => {
      const halo = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, 360);
      halo.addColorStop(0, 'rgba(205, 160, 92, 0.08)');
      halo.addColorStop(0.18, 'rgba(165, 120, 54, 0.05)');
      halo.addColorStop(0.42, 'rgba(96, 62, 20, 0.02)');
      halo.addColorStop(1, 'rgba(0, 0, 0, 0)');
      context.fillStyle = halo;
      context.fillRect(0, 0, renderWidth, renderHeight);

      for (let index = 0; index < 2; index += 1) {
        const phase = currentTime * (0.08 + index * 0.03);
        const radius = 220 + index * 110;
        const x = centerX + Math.cos(phase) * (18 + index * 4);
        const y = centerY + Math.sin(phase * 0.8) * (10 + index * 3);
        const cloud = context.createRadialGradient(x, y, 28, x, y, radius);
        cloud.addColorStop(0, 'rgba(0, 0, 0, 0)');
        cloud.addColorStop(0.4, `rgba(52, 37, 14, ${0.02 + index * 0.004})`);
        cloud.addColorStop(0.72, 'rgba(0, 0, 0, 0.018)');
        cloud.addColorStop(1, 'rgba(0, 0, 0, 0)');
        context.fillStyle = cloud;
        context.fillRect(0, 0, renderWidth, renderHeight);
      }
    };

    const drawOrbiter = (orbiter: Orbiter, nextX: number, nextY: number, finalSize: number, finalAlpha: number) => {
      if (orbiter.type === 'comet') {
        context.beginPath();
        context.moveTo(nextX, nextY);
        orbiter.trail.forEach((position, index) => {
          const ratio = 1 - index / Math.max(orbiter.trail.length, 1);
          context.strokeStyle = `${orbiter.color}${finalAlpha * ratio * 0.45})`;
          context.lineWidth = Math.max(0.5, finalSize * ratio);
          context.lineTo(position.x, position.y);
        });
        context.stroke();

        context.beginPath();
        context.arc(nextX, nextY, finalSize * 1.3, 0, Math.PI * 2);
        context.fillStyle = `${orbiter.color}${finalAlpha})`;
        context.fill();
        return;
      }

      if (orbiter.type === 'planet') {
        const planetGradient = context.createRadialGradient(
          nextX - finalSize / 3,
          nextY - finalSize / 3,
          1,
          nextX,
          nextY,
          finalSize
        );
        planetGradient.addColorStop(0, `${orbiter.color}${finalAlpha})`);
        planetGradient.addColorStop(1, 'rgba(0, 0, 0, 0.82)');
        context.beginPath();
        context.arc(nextX, nextY, finalSize, 0, Math.PI * 2);
        context.fillStyle = planetGradient;
        context.fill();
        return;
      }

      context.beginPath();
      orbiter.shapePoints.forEach((shapePoint, index) => {
        const angle = (index * Math.PI * 2) / orbiter.shapePoints.length;
        const radius = finalSize * shapePoint;
        const x = nextX + Math.cos(angle) * radius;
        const y = nextY + Math.sin(angle) * radius;

        if (index === 0) {
          context.moveTo(x, y);
        } else {
          context.lineTo(x, y);
        }
      });
      context.closePath();
      context.fillStyle = `${orbiter.color}${finalAlpha})`;
      context.fill();
    };

    const animate = (currentFrameTime: number) => {
      if (!isDocumentVisible) {
        animationFrameId = window.requestAnimationFrame(animate);
        return;
      }

      const deltaTime = currentFrameTime - lastFrameTime;
      if (deltaTime < frameInterval) {
        animationFrameId = window.requestAnimationFrame(animate);
        return;
      }

      lastFrameTime = currentFrameTime - (deltaTime % frameInterval);
      time += deltaTime / 1000;

      context.fillStyle = 'rgba(0, 0, 0, 0.18)';
      context.fillRect(0, 0, renderWidth, renderHeight);

      drawStars(time);
      drawBackdrop(time);

      orbiters.forEach((orbiter, index) => {
        orbiter.angle += orbiter.baseSpeed * (280 / Math.max(orbiter.radius, 26)) * orbiter.direction * deltaTime;
        orbiter.radius -= orbiter.pullSpeed * (180 / Math.max(orbiter.radius, 28)) * (deltaTime / 16.67);

        const nextX = centerX + Math.cos(orbiter.angle) * orbiter.radius;
        const nextY = centerY + Math.sin(orbiter.angle) * orbiter.radius * orbiter.inclination;

        if (orbiter.type === 'comet') {
          orbiter.trail.unshift({ x: nextX, y: nextY });
          if (orbiter.trail.length > 16) orbiter.trail.pop();
        }

        const expansion = Math.max(1, 110 / Math.max(orbiter.radius, 14));
        const collapse = Math.min(1, Math.max(0, (orbiter.radius - 24) / 28));
        const finalAlpha = Math.min(1, orbiter.alpha * expansion * (0.55 + collapse * 0.45));
        const finalSize = orbiter.size * expansion * collapse;

        if (finalSize > 0.1 && finalAlpha > 0.01) {
          drawOrbiter(orbiter, nextX, nextY, finalSize, finalAlpha);
        }

        if (orbiter.radius < 24) {
          orbiters[index] = createOrbiter(orbiter.type);
        }
      });

      const ringIntensity = 0.26 + Math.sin(time * 1.35) * 0.08;
      const ringRadius = 40;
      const photonRing = context.createRadialGradient(centerX, centerY, ringRadius - 6, centerX, centerY, ringRadius + 12);
      photonRing.addColorStop(0, 'rgba(0, 0, 0, 0)');
      photonRing.addColorStop(0.38, `rgba(255, 230, 190, ${ringIntensity * 0.42})`);
      photonRing.addColorStop(0.58, `rgba(255, 255, 255, ${ringIntensity * 0.62})`);
      photonRing.addColorStop(0.8, `rgba(192, 154, 108, ${ringIntensity * 0.24})`);
      photonRing.addColorStop(1, 'rgba(0, 0, 0, 0)');
      context.fillStyle = photonRing;
      context.beginPath();
      context.arc(centerX, centerY, ringRadius + 14, 0, Math.PI * 2);
      context.fill();

      const singularity = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, 58);
      singularity.addColorStop(0, 'rgba(0, 0, 0, 0.96)');
      singularity.addColorStop(0.55, 'rgba(0, 0, 0, 0.52)');
      singularity.addColorStop(1, 'rgba(0, 0, 0, 0)');
      context.fillStyle = singularity;
      context.beginPath();
      context.arc(centerX, centerY, 58, 0, Math.PI * 2);
      context.fill();

      animationFrameId = window.requestAnimationFrame(animate);
    };

    const handleResize = () => {
      window.cancelAnimationFrame(resizeFrameId);
      resizeFrameId = window.requestAnimationFrame(init);
    };

    init();
    animationFrameId = window.requestAnimationFrame(animate);
    window.addEventListener('resize', handleResize, { passive: true });

    return () => {
      window.removeEventListener('resize', handleResize);
      window.cancelAnimationFrame(animationFrameId);
      window.cancelAnimationFrame(resizeFrameId);
    };
  }, [isDocumentVisible, prefersReducedMotion, quality, theme]);

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
