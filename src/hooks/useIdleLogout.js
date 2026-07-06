import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

// ===== CONFIG =====
const INACTIVITY_LIMIT_MS = 30 * 60 * 1000; // 30 minutes total inactivity
const WARNING_DURATION_SEC = 60; // warning modal 60 second countdown dikhayega

// Activity events jinhe "user active hai" maana jaayega
const ACTIVITY_EVENTS = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];


export const useIdleLogout = () => {
  const navigate = useNavigate();

  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(WARNING_DURATION_SEC);

  const idleTimerRef = useRef(null);
  const countdownIntervalRef = useRef(null);
  const warningActiveRef = useRef(false);

  const clearAllTimers = () => {
    clearTimeout(idleTimerRef.current);
    clearInterval(countdownIntervalRef.current);
  };

  const doLogout = useCallback(
    (message) => {
      clearAllTimers();
      warningActiveRef.current = false;
      setShowWarning(false);

      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminUser');

      toast.error(message, { duration: 5000 });
      navigate('/login');
    },
    [navigate]
  );

  const startWarningCountdown = useCallback(() => {
    warningActiveRef.current = true;
    setShowWarning(true);
    setCountdown(WARNING_DURATION_SEC);

    countdownIntervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          doLogout('Inactivity ki wajah se aap logout ho gaye hain — dobara login karo');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [doLogout]);

  const resetIdleTimer = useCallback(() => {
    // Warning dikh rahi ho to passive activity ignore karo — sirf
    // "Stay Logged In" button hi session extend kar sakta hai
    if (warningActiveRef.current) return;

    clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      startWarningCountdown();
    }, INACTIVITY_LIMIT_MS - WARNING_DURATION_SEC * 1000);
  }, [startWarningCountdown]);

  // "Stay Logged In" button ka handler
  const stayLoggedIn = useCallback(() => {
    clearInterval(countdownIntervalRef.current);
    warningActiveRef.current = false;
    setShowWarning(false);
    resetIdleTimer();
    toast.success('Session extended');
  }, [resetIdleTimer]);

  useEffect(() => {
    ACTIVITY_EVENTS.forEach((evt) => window.addEventListener(evt, resetIdleTimer));
    resetIdleTimer();

    return () => {
      ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, resetIdleTimer));
      clearAllTimers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetIdleTimer]);

  return { showWarning, countdown, stayLoggedIn };
};