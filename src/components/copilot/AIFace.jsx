import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AIFace({ isListening, isProcessing, isIdle }) {
  const canvasRef = useRef(null);
  const [eyePosition, setEyePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    let animationFrame;
    let time = 0;

    const drawFace = () => {
      ctx.clearRect(0, 0, width, height);

      // Background glow
      if (isListening || isProcessing) {
        const gradient = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, width / 2);
        gradient.addColorStop(0, isListening ? 'rgba(59, 130, 246, 0.2)' : 'rgba(37, 99, 235, 0.15)');
        gradient.addColorStop(1, 'rgba(59, 130, 246, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
      }

      // Face circle
      ctx.beginPath();
      ctx.arc(width / 2, height / 2, 80, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(241, 245, 249, 0.95)';
      ctx.fill();
      ctx.strokeStyle = isListening ? '#3B82F6' : isProcessing ? '#2563EB' : '#CBD5E1';
      ctx.lineWidth = isListening || isProcessing ? 4 : 2;
      ctx.stroke();

      // Eyes
      const leftEyeX = width / 2 - 25;
      const rightEyeX = width / 2 + 25;
      const eyeY = height / 2 - 15;
      const blinkPhase = Math.sin(time * 2);
      const eyeHeight = isListening || isProcessing ? 12 : (blinkPhase < -0.95 ? 2 : 12);

      // Left eye
      ctx.beginPath();
      ctx.ellipse(leftEyeX + eyePosition.x * 3, eyeY + eyePosition.y * 3, 8, eyeHeight, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#1E293B';
      ctx.fill();

      // Right eye
      ctx.beginPath();
      ctx.ellipse(rightEyeX + eyePosition.x * 3, eyeY + eyePosition.y * 3, 8, eyeHeight, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#1E293B';
      ctx.fill();

      // Mouth
      ctx.beginPath();
      const mouthY = height / 2 + 25;
      
      if (isListening) {
        // Open mouth when listening
        const mouthOpen = 5 + Math.sin(time * 8) * 3;
        ctx.ellipse(width / 2, mouthY, 25, mouthOpen, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#475569';
        ctx.fill();
      } else if (isProcessing) {
        // Thinking expression
        ctx.arc(width / 2, mouthY, 20, 0.2, Math.PI - 0.2);
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 3;
        ctx.stroke();
      } else {
        // Gentle smile
        ctx.arc(width / 2, mouthY, 20, 0.1, Math.PI - 0.1);
        ctx.strokeStyle = '#64748B';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Eyebrows
      ctx.beginPath();
      const browY = height / 2 - 35;
      ctx.moveTo(leftEyeX - 12, browY + (isProcessing ? -2 : 0));
      ctx.lineTo(leftEyeX + 12, browY + (isProcessing ? 2 : 0));
      ctx.moveTo(rightEyeX - 12, browY + (isProcessing ? 2 : 0));
      ctx.lineTo(rightEyeX + 12, browY + (isProcessing ? -2 : 0));
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Audio waves when listening
      if (isListening) {
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          const waveRadius = 90 + i * 20;
          const opacity = 0.3 - i * 0.1;
          const wavePhase = (time * 3 + i * 0.5) % (Math.PI * 2);
          ctx.arc(width / 2, height / 2, waveRadius + Math.sin(wavePhase) * 5, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(59, 130, 246, ${opacity})`;
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }

      // Processing particles
      if (isProcessing) {
        for (let i = 0; i < 8; i++) {
          const angle = (time * 2 + i * Math.PI / 4) % (Math.PI * 2);
          const radius = 100;
          const x = width / 2 + Math.cos(angle) * radius;
          const y = height / 2 + Math.sin(angle) * radius;
          
          ctx.beginPath();
          ctx.arc(x, y, 3, 0, Math.PI * 2);
          ctx.fillStyle = '#3B82F6';
          ctx.fill();
        }
      }

      time += 0.05;
      animationFrame = requestAnimationFrame(drawFace);
    };

    drawFace();

    return () => {
      if (animationFrame) cancelAnimationFrame(animationFrame);
    };
  }, [isListening, isProcessing, eyePosition]);

  // Eye tracking mouse movement
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      const deltaX = (e.clientX - centerX) / rect.width;
      const deltaY = (e.clientY - centerY) / rect.height;
      
      setEyePosition({
        x: Math.max(-1, Math.min(1, deltaX)),
        y: Math.max(-1, Math.min(1, deltaY))
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="relative">
      <motion.div
        animate={{
          scale: isListening ? [1, 1.05, 1] : isProcessing ? [1, 1.02, 1] : 1,
        }}
        transition={{
          duration: isListening ? 0.5 : 1.5,
          repeat: (isListening || isProcessing) ? Infinity : 0,
          ease: "easeInOut"
        }}
        className="relative"
      >
        <canvas
          ref={canvasRef}
          width={240}
          height={240}
          className="mx-auto"
        />
      </motion.div>

      {/* Status indicator */}
      <AnimatePresence>
        {isListening && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-medium"
          >
            Listening...
          </motion.div>
        )}
        {isProcessing && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-slate-700 text-white px-3 py-1 rounded-full text-xs font-medium"
          >
            Thinking...
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}