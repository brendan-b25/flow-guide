import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AIFace({ isListening, isProcessing, isIdle, customization = {} }) {
  const {
    skinTone = '#FFE4D6',
    hairColor = '#4B5768',
    eyeColor = '#3B82F6',
    lipColor = '#DC7B7B'
  } = customization;
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

      // Helper function for color adjustment
      const adjustBrightness = (color, percent) => {
        const num = parseInt(color.replace("#",""), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) + amt;
        const G = (num >> 8 & 0x00FF) + amt;
        const B = (num & 0x0000FF) + amt;
        return "#" + (0x1000000 + (R<255?R<1?0:R:255)*0x10000 + (G<255?G<1?0:G:255)*0x100 + (B<255?B<1?0:B:255)).toString(16).slice(1);
      };

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

      // Hair with realistic strands
      ctx.beginPath();
      ctx.ellipse(centerX, centerY - 15, 88, 98, 0, 0, Math.PI * 2);
      const hairGradient = ctx.createRadialGradient(centerX - 20, centerY - 60, 20, centerX, centerY - 20, 100);
      hairGradient.addColorStop(0, adjustBrightness(hairColor, 5));
      hairGradient.addColorStop(0.4, hairColor);
      hairGradient.addColorStop(0.7, adjustBrightness(hairColor, -5));
      hairGradient.addColorStop(1, adjustBrightness(hairColor, -15));
      ctx.fillStyle = hairGradient;
      ctx.fill();

      // Hair texture strands
      ctx.strokeStyle = `${hairColor}50`;
      ctx.lineWidth = 1.5;
      for (let i = -3; i <= 3; i++) {
        ctx.beginPath();
        ctx.moveTo(centerX + i * 15, centerY - 90);
        ctx.quadraticCurveTo(centerX + i * 12, centerY - 60, centerX + i * 18, centerY - 30);
        ctx.stroke();
      }

      // Forehead highlight
      ctx.beginPath();
      ctx.ellipse(centerX, centerY - 35, 35, 20, 0, 0, Math.PI);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.fill();

      // Face structure with realistic contours
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(centerX, centerY + 8, 72, 82, 0, 0, Math.PI * 2);
      ctx.clip();
      
      // Base skin tone
      const faceGradient = ctx.createRadialGradient(centerX, centerY - 30, 20, centerX, centerY + 30, 100);
      faceGradient.addColorStop(0, adjustBrightness(skinTone, 5));
      faceGradient.addColorStop(0.3, skinTone);
      faceGradient.addColorStop(0.6, adjustBrightness(skinTone, -3));
      faceGradient.addColorStop(1, adjustBrightness(skinTone, -8));
      ctx.fillStyle = faceGradient;
      ctx.fillRect(centerX - 80, centerY - 90, 160, 180);
      
      // Facial shadows for depth
      ctx.fillStyle = 'rgba(180, 140, 120, 0.15)';
      ctx.beginPath();
      ctx.ellipse(centerX - 50, centerY, 20, 60, -0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(centerX + 50, centerY, 20, 60, 0.2, 0, Math.PI * 2);
      ctx.fill();
      
      // Cheekbone highlights
      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.beginPath();
      ctx.ellipse(centerX - 35, centerY - 5, 25, 15, -0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(centerX + 35, centerY - 5, 25, 15, 0.3, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.restore();

      // Jawline shadow
      ctx.beginPath();
      ctx.ellipse(centerX, centerY + 70, 50, 20, 0, 0, Math.PI);
      ctx.fillStyle = 'rgba(180, 140, 120, 0.2)';
      ctx.fill();

      // Neck
      ctx.beginPath();
      ctx.rect(centerX - 25, centerY + 75, 50, 30);
      const neckGradient = ctx.createLinearGradient(centerX - 25, centerY + 75, centerX + 25, centerY + 75);
      neckGradient.addColorStop(0, 'rgba(230, 200, 180, 0.8)');
      neckGradient.addColorStop(0.5, 'rgba(240, 215, 195, 1)');
      neckGradient.addColorStop(1, 'rgba(230, 200, 180, 0.8)');
      ctx.fillStyle = neckGradient;
      ctx.fill();

      // Nose bridge and tip
      ctx.strokeStyle = 'rgba(180, 140, 120, 0.25)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY - 25);
      ctx.lineTo(centerX, centerY + 8);
      ctx.stroke();
      
      // Nose sides
      ctx.strokeStyle = 'rgba(180, 140, 120, 0.2)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(centerX - 8, centerY + 8);
      ctx.quadraticCurveTo(centerX - 5, centerY + 12, centerX - 10, centerY + 15);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(centerX + 8, centerY + 8);
      ctx.quadraticCurveTo(centerX + 5, centerY + 12, centerX + 10, centerY + 15);
      ctx.stroke();
      
      // Nose highlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.beginPath();
      ctx.ellipse(centerX - 2, centerY + 2, 3, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      // Realistic eyebrows with individual hair strokes
      const browY = centerY - 32;
      const leftBrowX = centerX - 32;
      const rightBrowX = centerX + 32;

      ctx.strokeStyle = '#3F4B5B';
      ctx.lineWidth = 1.2;
      ctx.lineCap = 'round';
      
      // Left eyebrow with hair strokes
      for (let i = 0; i < 12; i++) {
        const progress = i / 11;
        const startX = leftBrowX - 16 + i * 2.8;
        const startY = browY - Math.sin(progress * Math.PI) * 3 + (isProcessing ? -2 : 0);
        const angle = -1.3 + progress * 0.5;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(startX + Math.cos(angle) * 6, startY + Math.sin(angle) * 6);
        ctx.stroke();
      }
      
      // Right eyebrow with hair strokes
      for (let i = 0; i < 12; i++) {
        const progress = i / 11;
        const startX = rightBrowX - 16 + i * 2.8;
        const startY = browY - Math.sin(progress * Math.PI) * 3 + (isProcessing ? -2 : 0);
        const angle = Math.PI + 1.3 - progress * 0.5;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(startX + Math.cos(angle) * 6, startY + Math.sin(angle) * 6);
        ctx.stroke();
      }

      // Realistic eyes
      const leftEyeX = centerX - 32;
      const rightEyeX = centerX + 32;
      const eyeY = centerY - 18;
      const blinkPhase = Math.sin(time * 2);
      const eyeHeight = isListening || isProcessing ? 11 : (blinkPhase < -0.95 ? 2 : 11);

      // Eye socket shadows
      ctx.fillStyle = 'rgba(180, 140, 120, 0.2)';
      ctx.beginPath();
      ctx.ellipse(leftEyeX, eyeY, 16, 18, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(rightEyeX, eyeY, 16, 18, 0, 0, Math.PI * 2);
      ctx.fill();

      // Eye whites with veins
      ctx.fillStyle = '#F8F9FA';
      ctx.beginPath();
      ctx.ellipse(leftEyeX + eyePosition.x * 3, eyeY + eyePosition.y * 3, 11, eyeHeight, 0, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.beginPath();
      ctx.ellipse(rightEyeX + eyePosition.x * 3, eyeY + eyePosition.y * 3, 11, eyeHeight, 0, 0, Math.PI * 2);
      ctx.fill();

      if (eyeHeight > 5) {
        // Detailed iris with realistic texture
        const drawIris = (x, y) => {
          // Outer iris ring
          ctx.beginPath();
          ctx.arc(x, y, 6.5, 0, Math.PI * 2);
          const outerGradient = ctx.createRadialGradient(x, y, 0, x, y, 6.5);
          outerGradient.addColorStop(0, adjustBrightness(eyeColor, 15));
          outerGradient.addColorStop(0.3, adjustBrightness(eyeColor, 8));
          outerGradient.addColorStop(0.6, eyeColor);
          outerGradient.addColorStop(1, adjustBrightness(eyeColor, -20));
          ctx.fillStyle = outerGradient;
          ctx.fill();

          // Iris pattern lines
          ctx.strokeStyle = 'rgba(30, 64, 128, 0.3)';
          ctx.lineWidth = 0.5;
          for (let i = 0; i < 12; i++) {
            const angle = (Math.PI * 2 * i) / 12;
            ctx.beginPath();
            ctx.moveTo(x + Math.cos(angle) * 2, y + Math.sin(angle) * 2);
            ctx.lineTo(x + Math.cos(angle) * 6, y + Math.sin(angle) * 6);
            ctx.stroke();
          }

          // Inner iris detail
          ctx.beginPath();
          ctx.arc(x, y, 3.5, 0, Math.PI * 2);
          const innerGradient = ctx.createRadialGradient(x - 1, y - 1, 0, x, y, 3.5);
          innerGradient.addColorStop(0, adjustBrightness(eyeColor, 20));
          innerGradient.addColorStop(1, adjustBrightness(eyeColor, 5));
          ctx.fillStyle = innerGradient;
          ctx.fill();

          // Pupil with realistic depth
          ctx.beginPath();
          ctx.arc(x, y, 2.5, 0, Math.PI * 2);
          const pupilGradient = ctx.createRadialGradient(x - 0.5, y - 0.5, 0, x, y, 2.5);
          pupilGradient.addColorStop(0, '#000000');
          pupilGradient.addColorStop(1, '#1a1a1a');
          ctx.fillStyle = pupilGradient;
          ctx.fill();

          // Multiple highlights for realism
          ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
          ctx.beginPath();
          ctx.arc(x - 1.5, y - 1.5, 1.5, 0, Math.PI * 2);
          ctx.fill();
          
          ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
          ctx.beginPath();
          ctx.arc(x + 1.5, y + 1.5, 0.8, 0, Math.PI * 2);
          ctx.fill();
        };

        drawIris(leftEyeX + eyePosition.x * 3, eyeY + eyePosition.y * 3);
        drawIris(rightEyeX + eyePosition.x * 3, eyeY + eyePosition.y * 3);
      }

      // Realistic eyelashes - upper
      if (eyeHeight > 5) {
        ctx.strokeStyle = '#2D3748';
        ctx.lineCap = 'round';
        for (let i = 0; i < 9; i++) {
          const angle = -0.7 + i * 0.18;
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(leftEyeX + Math.cos(angle) * 11, eyeY - eyeHeight + Math.sin(angle) * 11);
          ctx.lineTo(leftEyeX + Math.cos(angle) * 17, eyeY - eyeHeight + Math.sin(angle) * 17);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(rightEyeX + Math.cos(angle) * 11, eyeY - eyeHeight + Math.sin(angle) * 11);
          ctx.lineTo(rightEyeX + Math.cos(angle) * 17, eyeY - eyeHeight + Math.sin(angle) * 17);
          ctx.stroke();
        }
        
        // Lower eyelashes
        ctx.lineWidth = 0.6;
        for (let i = 0; i < 5; i++) {
          const angle = 0.2 + i * 0.15;
          ctx.beginPath();
          ctx.moveTo(leftEyeX + Math.cos(angle) * 11, eyeY + eyeHeight + Math.sin(angle) * 11);
          ctx.lineTo(leftEyeX + Math.cos(angle) * 14, eyeY + eyeHeight + Math.sin(angle) * 14);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(rightEyeX + Math.cos(angle) * 11, eyeY + eyeHeight + Math.sin(angle) * 11);
          ctx.lineTo(rightEyeX + Math.cos(angle) * 14, eyeY + eyeHeight + Math.sin(angle) * 14);
          ctx.stroke();
        }
      }

      // Eye crease/fold
      ctx.strokeStyle = 'rgba(180, 140, 120, 0.25)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(leftEyeX, eyeY - 16, 14, 0.3, Math.PI - 0.3);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(rightEyeX, eyeY - 16, 14, 0.3, Math.PI - 0.3);
      ctx.stroke();

      // Realistic mouth and lips
      const mouthY = centerY + 32;
      
      if (isListening) {
        // Open mouth animation
        const mouthOpen = 10 + Math.sin(time * 8) * 5;
        
        // Mouth interior shadow
        ctx.beginPath();
        ctx.ellipse(centerX, mouthY, 20, mouthOpen, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#5C3A3A';
        ctx.fill();
        
        // Upper lip with cupid's bow
        ctx.beginPath();
        ctx.moveTo(centerX - 22, mouthY - mouthOpen / 2);
        ctx.quadraticCurveTo(centerX - 10, mouthY - mouthOpen / 2 - 2, centerX - 3, mouthY - mouthOpen / 2);
        ctx.quadraticCurveTo(centerX, mouthY - mouthOpen / 2 - 3, centerX + 3, mouthY - mouthOpen / 2);
        ctx.quadraticCurveTo(centerX + 10, mouthY - mouthOpen / 2 - 2, centerX + 22, mouthY - mouthOpen / 2);
        const upperLipGrad = ctx.createLinearGradient(centerX, mouthY - mouthOpen / 2 - 5, centerX, mouthY - mouthOpen / 2 + 2);
        upperLipGrad.addColorStop(0, adjustBrightness(lipColor, -5));
        upperLipGrad.addColorStop(1, adjustBrightness(lipColor, -10));
        ctx.fillStyle = upperLipGrad;
        ctx.fill();
        
        // Lower lip with volume
        ctx.beginPath();
        ctx.arc(centerX, mouthY + mouthOpen / 2 + 2, 24, 0, Math.PI);
        const lowerLipGrad = ctx.createLinearGradient(centerX, mouthY + mouthOpen / 2, centerX, mouthY + mouthOpen / 2 + 8);
        lowerLipGrad.addColorStop(0, adjustBrightness(lipColor, 10));
        lowerLipGrad.addColorStop(0.5, lipColor);
        lowerLipGrad.addColorStop(1, adjustBrightness(lipColor, -5));
        ctx.fillStyle = lowerLipGrad;
        ctx.fill();
        
        // Lip highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.beginPath();
        ctx.ellipse(centerX, mouthY + mouthOpen / 2 + 2, 15, 3, 0, 0, Math.PI);
        ctx.fill();
        
      } else if (isProcessing) {
        // Slight smile - thinking
        ctx.beginPath();
        ctx.arc(centerX, mouthY, 24, 0.12, Math.PI - 0.12);
        const lipGrad = ctx.createLinearGradient(centerX, mouthY - 5, centerX, mouthY + 5);
        lipGrad.addColorStop(0, '#D17272');
        lipGrad.addColorStop(1, '#E88B8B');
        ctx.strokeStyle = lipGrad;
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.stroke();
        
        // Lip shine
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(centerX, mouthY, 24, 0.12, Math.PI - 0.12);
        ctx.stroke();
        
      } else {
        // Natural resting smile
        ctx.beginPath();
        ctx.moveTo(centerX - 22, mouthY);
        ctx.quadraticCurveTo(centerX - 10, mouthY - 1, centerX - 3, mouthY - 1);
        ctx.quadraticCurveTo(centerX, mouthY - 2, centerX + 3, mouthY - 1);
        ctx.quadraticCurveTo(centerX + 10, mouthY - 1, centerX + 22, mouthY);
        const upperGrad = ctx.createLinearGradient(centerX, mouthY - 3, centerX, mouthY + 1);
        upperGrad.addColorStop(0, '#D17272');
        upperGrad.addColorStop(1, '#C66565');
        ctx.strokeStyle = upperGrad;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.stroke();
        
        // Lower lip
        ctx.beginPath();
        ctx.arc(centerX, mouthY + 3, 20, 0.05, Math.PI - 0.05);
        const lowerGrad = ctx.createLinearGradient(centerX, mouthY + 1, centerX, mouthY + 7);
        lowerGrad.addColorStop(0, '#E88B8B');
        lowerGrad.addColorStop(1, '#DC7B7B');
        ctx.strokeStyle = lowerGrad;
        ctx.lineWidth = 4;
        ctx.stroke();
        
        // Lower lip highlight
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(centerX, mouthY + 3, 20, 0.1, Math.PI - 0.1);
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
  }, [isListening, isProcessing, eyePosition, skinTone, hairColor, eyeColor, lipColor]);

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