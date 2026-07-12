// Beautiful, smooth, customized synthesized sounds using Web Audio API
// No file downloads or network dependencies, fully offline-safe and lightweight.

export const playNotificationSound = (type: 'message' | 'notification' = 'message') => {
  try {
    if (localStorage.getItem('mute_sounds') === 'true') {
      return;
    }
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    
    const ctx = new AudioContextClass();
    
    // Resume audio context if suspended (browser security policies)
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    
    if (type === 'message') {
      // Warm, gentle organic bubble pop/chime (for chat messages)
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc.type = 'sine';
      // Low warm frequency transitioning to a perfect fifth
      osc.frequency.setValueAtTime(392, ctx.currentTime); // G4
      osc.frequency.exponentialRampToValueAtTime(587.33, ctx.currentTime + 0.12); // D5 (Perfect 5th transition)
      
      gainNode.gain.setValueAtTime(0.0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.03);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
      
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } else {
      // Sophisticated, premium double-note organic chime (for notification toasts and requests)
      const osc1 = ctx.createOscillator();
      const gainNode1 = ctx.createGain();
      
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, ctx.currentTime); // C5 fundamental
      osc1.frequency.exponentialRampToValueAtTime(659.25, ctx.currentTime + 0.15); // E5 major third transition
      
      gainNode1.gain.setValueAtTime(0.0, ctx.currentTime);
      gainNode1.gain.linearRampToValueAtTime(0.10, ctx.currentTime + 0.05);
      gainNode1.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.40);
      
      osc1.connect(gainNode1);
      gainNode1.connect(ctx.destination);
      
      osc1.start();
      osc1.stop(ctx.currentTime + 0.40);

      // Harmonious delayed higher note to create a beautiful chime effect
      const delayMs = 90;
      setTimeout(() => {
        try {
          if (ctx.state === 'closed') return;
          const osc2 = ctx.createOscillator();
          const gainNode2 = ctx.createGain();
          
          osc2.type = 'sine';
          osc2.frequency.setValueAtTime(783.99, ctx.currentTime); // G5 (perfect fifth above C)
          
          gainNode2.gain.setValueAtTime(0.0, ctx.currentTime);
          gainNode2.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 0.04);
          gainNode2.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.30);
          
          osc2.connect(gainNode2);
          gainNode2.connect(ctx.destination);
          
          osc2.start();
          osc2.stop(ctx.currentTime + 0.30);
        } catch {
          // Silent catch
        }
      }, delayMs);
    }
  } catch (err) {
    console.warn('Web Audio API play error:', err);
  }
};
