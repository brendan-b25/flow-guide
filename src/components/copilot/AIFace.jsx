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

      const centerX = width / 2;
      const centerY = height / 2;

      // Head/Hair silhouette
      ctx.beginPath();
      ctx.ellipse(centerX, centerY - 10, 85, 95, 0, 0, Math.PI * 2);
      const hairGradient = ctx.createLinearGradient(centerX, centerY - 100, centerX, centerY);
      hairGradient.addColorStop(0, '#475569');
      hairGradient.addColorStop(1, '#64748B');
      ctx.fillStyle = hairGradient;
      ctx.fill();

      // Face shape (skin tone)
      ctx.beginPath();
      ctx.ellipse(centerX, centerY + 5, 75, 85, 0, 0.2, Math.PI - 0.2);
      const skinGradient = ctx.createRadialGradient(centerX, centerY - 20, 10, centerX, centerY + 20, 90);
      skinGradient.addColorStop(0, '#FFF5F0');
      skinGradient.addColorStop(0.5, '#FFE8DC');
      skinGradient.addColorStop(1, '#F5DDD0');
      ctx.fillStyle = skinGradient;
      ctx.fill();

      // Neck shadow
      ctx.beginPath();
      ctx.ellipse(centerX, centerY + 80, 30, 15, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(203, 213, 225, 0.3)';
      ctx.fill();

      // Cheek blush
      ctx.beginPath();
      ctx.ellipse(centerX - 40, centerY + 15, 15, 10, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(251, 207, 232, 0.4)';
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(centerX + 40, centerY + 15, 15, 10, 0, 0, Math.PI * 2);
      ctx.fill();

      // Nose
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.quadraticCurveTo(centerX + 5, centerY + 15, centerX + 8, centerY + 18);
      ctx.strokeStyle = 'rgba(100, 116, 139, 0.3)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Eyebrows with gradient
      const browY = centerY - 30;
      const leftBrowX = centerX - 30;
      const rightBrowX = centerX + 30;

      ctx.beginPath();
      ctx.moveTo(leftBrowX - 15, browY + (isProcessing ? -2 : 0));
      ctx.quadraticCurveTo(leftBrowX, browY - 3 + (isProcessing ? -2 : 0), leftBrowX + 15, browY + (isProcessing ? 2 : 0));
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(rightBrowX - 15, browY + (isProcessing ? 2 : 0));
      ctx.quadraticCurveTo(rightBrowX, browY - 3 + (isProcessing ? -2 : 0), rightBrowX + 15, browY + (isProcessing ? -2 : 0));
      ctx.stroke();

      // Eyes
      const leftEyeX = centerX - 30;
      const rightEyeX = centerX + 30;
      const eyeY = centerY - 15;
      const blinkPhase = Math.sin(time * 2);
      const eyeHeight = isListening || isProcessing ? 14 : (blinkPhase < -0.95 ? 2 : 14);

      // Eye whites
      ctx.beginPath();
      ctx.ellipse(leftEyeX + eyePosition.x * 4, eyeY + eyePosition.y * 4, 12, eyeHeight, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
      ctx.strokeStyle = 'rgba(100, 116, 139, 0.2)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(rightEyeX + eyePosition.x * 4, eyeY + eyePosition.y * 4, 12, eyeHeight, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
      ctx.stroke();

      if (eyeHeight > 5) {
        // Iris (blue)
        ctx.beginPath();
        ctx.arc(leftEyeX + eyePosition.x * 4, eyeY + eyePosition.y * 4, 7, 0, Math.PI * 2);
        const irisGradient = ctx.createRadialGradient(
          leftEyeX + eyePosition.x * 4 - 2, eyeY + eyePosition.y * 4 - 2, 0,
          leftEyeX + eyePosition.x * 4, eyeY + eyePosition.y * 4, 7
        );
        irisGradient.addColorStop(0, '#60A5FA');
        irisGradient.addColorStop(0.5, '#3B82F6');
        irisGradient.addColorStop(1, '#2563EB');
        ctx.fillStyle = irisGradient;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(rightEyeX + eyePosition.x * 4, eyeY + eyePosition.y * 4, 7, 0, Math.PI * 2);
        const irisGradient2 = ctx.createRadialGradient(
          rightEyeX + eyePosition.x * 4 - 2, eyeY + eyePosition.y * 4 - 2, 0,
          rightEyeX + eyePosition.x * 4, eyeY + eyePosition.y * 4, 7
        );
        irisGradient2.addColorStop(0, '#60A5FA');
        irisGradient2.addColorStop(0.5, '#3B82F6');
        irisGradient2.addColorStop(1, '#2563EB');
        ctx.fillStyle = irisGradient2;
        ctx.fill();

        // Pupils
        ctx.beginPath();
        ctx.arc(leftEyeX + eyePosition.x * 4, eyeY + eyePosition.y * 4, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#1E293B';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(rightEyeX + eyePosition.x * 4, eyeY + eyePosition.y * 4, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#1E293B';
        ctx.fill();

        // Eye highlights
        ctx.beginPath();
        ctx.arc(leftEyeX + eyePosition.x * 4 - 2, eyeY + eyePosition.y * 4 - 2, 2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(rightEyeX + eyePosition.x * 4 - 2, eyeY + eyePosition.y * 4 - 2, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Eyelashes
      if (eyeHeight > 5) {
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1;
        for (let i = 0; i < 5; i++) {
          const angle = -0.5 + i * 0.25;
          ctx.beginPath();
          ctx.moveTo(leftEyeX + Math.cos(angle) * 12, eyeY - eyeHeight + Math.sin(angle) * 12);
          ctx.lineTo(leftEyeX + Math.cos(angle) * 16, eyeY - eyeHeight + Math.sin(angle) * 16);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(rightEyeX + Math.cos(angle) * 12, eyeY - eyeHeight + Math.sin(angle) * 12);
          ctx.lineTo(rightEyeX + Math.cos(angle) * 16, eyeY - eyeHeight + Math.sin(angle) * 16);
          ctx.stroke();
        }
      }

      // Mouth with lips
      const mouthY = centerY + 30;
      
      if (isListening) {
        // Open mouth with lips
        const mouthOpen = 8 + Math.sin(time * 8) * 4;
        
        // Upper lip
        ctx.beginPath();
        ctx.ellipse(centerX, mouthY - mouthOpen / 2, 22, 4, 0, 0, Math.PI);
        ctx.fillStyle = '#E57373';
        ctx.fill();
        
        // Lower lip
        ctx.beginPath();
        ctx.ellipse(centerX, mouthY + mouthOpen / 2, 22, 5, 0, 0, Math.PI);
        ctx.fillStyle = '#EF5350';
        ctx.fill();
        
        // Mouth interior
        ctx.beginPath();
        ctx.ellipse(centerX, mouthY, 18, mouthOpen, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#7C4A4A';
        ctx.fill();
      } else if (isProcessing) {
        // Thinking expression (slight smile)
        ctx.beginPath();
        ctx.arc(centerX, mouthY, 22, 0.15, Math.PI - 0.15);
        ctx.strokeStyle = '#B0756F';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.stroke();
      } else {
        // Gentle smile with lips
        ctx.beginPath();
        ctx.arc(centerX, mouthY - 2, 20, 0.1, Math.PI - 0.1);
        ctx.strokeStyle = '#E57373';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.stroke();
        
        // Lip highlight
        ctx.beginPath();
        ctx.arc(centerX, mouthY - 2, 20, 0.1, Math.PI - 0.1);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

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