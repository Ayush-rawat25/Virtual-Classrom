// Polyfills for Node.js globals needed by simple-peer
if (typeof window !== 'undefined') {
  // Polyfill for process
  if (typeof window.process === 'undefined') {
    window.process = require('process');
  }
  
  // Polyfill for Buffer
  if (typeof window.Buffer === 'undefined') {
    window.Buffer = require('buffer').Buffer;
  }
  
  // Polyfill for global
  if (typeof window.global === 'undefined') {
    window.global = window;
  }
} 