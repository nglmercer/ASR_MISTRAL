/**
 * Keyboard handler module
 * Manages keyboard shortcuts for recording control
 */

import { startListener, KeyCode } from "rdev-node";

export interface KeyboardConfig {
  recordKey: KeyCode;
  exitKey: KeyCode;
}

export interface KeyboardCallbacks {
  onStartRecording: () => void;
  onStopRecording: () => void;
  onExit: () => void;
}

const DEFAULT_CONFIG: KeyboardConfig = {
  recordKey: KeyCode.Space,
  exitKey: KeyCode.Escape,
};

/**
 * Keyboard handler class for managing shortcuts
 */
export class KeyboardHandler {
  private config: KeyboardConfig;
  private callbacks: KeyboardCallbacks;
  private isActive: boolean = false;

  constructor(callbacks: KeyboardCallbacks, config: Partial<KeyboardConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.callbacks = callbacks;
  }

  /**
   * Start listening for keyboard events
   */
  start(): void {
    if (this.isActive) return;

    startListener((event) => {
      const { keyPress } = event;
      
      if (keyPress) {
        if (keyPress.key === this.config.recordKey) {
          this.callbacks.onStartRecording();
        }
        
        if (keyPress.key === this.config.exitKey) {
          this.callbacks.onExit();
        }
      }
      
      return event;
    });

    this.isActive = true;
  }

  /**
   * Stop listening for keyboard events
   * Note: rdev-node doesn't support stopping the listener
   */
  stop(): void {
    this.isActive = false;
  }

  /**
   * Check if handler is active
   */
  get isListening(): boolean {
    return this.isActive;
  }
}

/**
 * Simple keyboard listener setup
 */
export function setupKeyboard(
  callbacks: KeyboardCallbacks,
  config: Partial<KeyboardConfig> = {}
): KeyboardHandler {
  const handler = new KeyboardHandler(callbacks, config);
  handler.start();
  return handler;
}
