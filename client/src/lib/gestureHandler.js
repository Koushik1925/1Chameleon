export class GestureHandler {
  constructor(element, options = {}) {
    this.element = element;
    this.callbacks = {
      onSwipeUp: options.onSwipeUp || (() => {}),
      onSwipeDown: options.onSwipeDown || (() => {}),
      onSwipeLeft: options.onSwipeLeft || (() => {}),
      onSwipeRight: options.onSwipeRight || (() => {}),
      onDoubleTap: options.onDoubleTap || (() => {}),
      onLongPress: options.onLongPress || (() => {}),
      onPinch: options.onPinch || (() => {})
    };

    // Thresholds
    this.SWIPE_THRESHOLD = 30;
    this.SWIPE_TIME_THRESHOLD = 200;
    this.DOUBLE_TAP_TIMEOUT = 300;
    this.LONG_PRESS_TIMEOUT = 600;
    this.PINCH_THRESHOLD = 10;
    this.MOVEMENT_THRESHOLD = 10; // Max movement allowed for a tap/long-press

    // State
    this.touchStartX = 0;
    this.touchStartY = 0;
    this.touchStartTime = 0;
    this.lastTapTime = 0;
    this.lastTapX = 0;
    this.lastTapY = 0;
    this.longPressTimer = null;
    this.isLongPressTriggered = false;
    
    // Pinch state
    this.initialPinchDistance = null;
    this.lastPinchScale = 1;
    this.isPinching = false;

    // Bind methods
    this.handleTouchStart = this.handleTouchStart.bind(this);
    this.handleTouchMove = this.handleTouchMove.bind(this);
    this.handleTouchEnd = this.handleTouchEnd.bind(this);
    this.handleTouchCancel = this.handleTouchCancel.bind(this);

    this.init();
  }

  init() {
    this.element.addEventListener('touchstart', this.handleTouchStart, { passive: false });
    this.element.addEventListener('touchmove', this.handleTouchMove, { passive: false });
    this.element.addEventListener('touchend', this.handleTouchEnd, { passive: false });
    this.element.addEventListener('touchcancel', this.handleTouchCancel, { passive: false });
  }

  destroy() {
    this.element.removeEventListener('touchstart', this.handleTouchStart);
    this.element.removeEventListener('touchmove', this.handleTouchMove);
    this.element.removeEventListener('touchend', this.handleTouchEnd);
    this.element.removeEventListener('touchcancel', this.handleTouchCancel);
    this.clearLongPressTimer();
  }

  vibrate(pattern = [50]) {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  }

  clearLongPressTimer() {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }

  getDistance(p1, p2) {
    const dx = p1.clientX - p2.clientX;
    const dy = p1.clientY - p2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  handleTouchStart(e) {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      this.touchStartX = touch.clientX;
      this.touchStartY = touch.clientY;
      this.touchStartTime = Date.now();
      this.isLongPressTriggered = false;
      this.isPinching = false;

      // Start long press timer
      this.clearLongPressTimer();
      this.longPressTimer = setTimeout(() => {
        this.isLongPressTriggered = true;
        this.vibrate([50]);
        this.callbacks.onLongPress({
          x: this.touchStartX,
          y: this.touchStartY,
          duration: Date.now() - this.touchStartTime
        });
      }, this.LONG_PRESS_TIMEOUT);
    } else if (e.touches.length === 2) {
      // Setup pinch
      this.clearLongPressTimer();
      this.isPinching = true;
      this.initialPinchDistance = this.getDistance(e.touches[0], e.touches[1]);
      this.lastPinchScale = 1;
    }
  }

  handleTouchMove(e) {
    if (this.isPinching && e.touches.length === 2) {
      // Handle Pinch
      const currentDistance = this.getDistance(e.touches[0], e.touches[1]);
      const scale = currentDistance / this.initialPinchDistance;
      
      if (Math.abs(currentDistance - this.initialPinchDistance) > this.PINCH_THRESHOLD) {
        this.callbacks.onPinch({ scale: scale, distance: currentDistance });
      }
      return;
    }

    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const moveX = touch.clientX - this.touchStartX;
      const moveY = touch.clientY - this.touchStartY;
      
      // If moved beyond threshold, cancel long press
      if (Math.abs(moveX) > this.MOVEMENT_THRESHOLD || Math.abs(moveY) > this.MOVEMENT_THRESHOLD) {
        this.clearLongPressTimer();
      }
    }
  }

  handleTouchEnd(e) {
    this.clearLongPressTimer();
    
    if (this.isPinching) {
      this.isPinching = false;
      return;
    }

    if (this.isLongPressTriggered) {
      return; // Already handled
    }

    // Only process if it was a single touch that ended (changedTouches contains the lifted finger)
    if (e.changedTouches.length === 1) {
      const touch = e.changedTouches[0];
      const touchEndX = touch.clientX;
      const touchEndY = touch.clientY;
      const touchDuration = Date.now() - this.touchStartTime;

      const deltaX = touchEndX - this.touchStartX;
      const deltaY = touchEndY - this.touchStartY;
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);

      // Check for swipe
      if (touchDuration < this.SWIPE_TIME_THRESHOLD && (absX > this.SWIPE_THRESHOLD || absY > this.SWIPE_THRESHOLD)) {
        const velocity = Math.sqrt(absX * absX + absY * absY) / touchDuration;
        
        if (absX > absY) {
          // Horizontal swipe
          if (deltaX > 0) {
            this.callbacks.onSwipeRight({ distance: absX, velocity });
          } else {
            this.callbacks.onSwipeLeft({ distance: absX, velocity });
          }
        } else {
          // Vertical swipe
          if (deltaY > 0) {
            this.callbacks.onSwipeDown({ distance: absY, velocity });
          } else {
            this.callbacks.onSwipeUp({ distance: absY, velocity });
          }
        }
      } 
      // Check for double tap
      else if (absX <= this.MOVEMENT_THRESHOLD && absY <= this.MOVEMENT_THRESHOLD) {
        const now = Date.now();
        const timeSinceLastTap = now - this.lastTapTime;
        
        // Ensure the second tap is roughly in the same spot
        const distFromLastTap = Math.sqrt(
          Math.pow(touchEndX - this.lastTapX, 2) + 
          Math.pow(touchEndY - this.lastTapY, 2)
        );

        if (timeSinceLastTap < this.DOUBLE_TAP_TIMEOUT && timeSinceLastTap > 0 && distFromLastTap < this.SWIPE_THRESHOLD) {
          this.callbacks.onDoubleTap({ x: touchEndX, y: touchEndY });
          this.lastTapTime = 0; // Reset
        } else {
          this.lastTapTime = now;
          this.lastTapX = touchEndX;
          this.lastTapY = touchEndY;
        }
      }
    }
  }

  handleTouchCancel() {
    this.clearLongPressTimer();
    this.isPinching = false;
  }
}
