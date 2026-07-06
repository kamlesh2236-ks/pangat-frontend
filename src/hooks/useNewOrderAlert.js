import { useContext, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { NotificationContext } from '../context/NotificationContext';
import { playNewOrderSound, unlockAudio } from '../utils/notificationSound';

const useNewOrderAlert = () => {
  const context = useContext(NotificationContext);
  const alertedIdsRef = useRef(new Set());
  const isInitializedRef = useRef(false);

  // Browser autoplay restriction hatane ke liye — pehla click hote hi audio unlock
  useEffect(() => {
    const unlock = () => {
      unlockAudio();
      document.removeEventListener('click', unlock);
    };
    document.addEventListener('click', unlock);
    return () => document.removeEventListener('click', unlock);
  }, []);

  useEffect(() => {
    if (!context) return;

    const newOrderNotifs = context.notifications.filter(
      (n) => n.type === 'new-order'
    );


    if (!isInitializedRef.current) {
      newOrderNotifs.forEach((n) => alertedIdsRef.current.add(n.id));
      isInitializedRef.current = true;
      return;
    }

    const freshOnes = newOrderNotifs.filter(
      (n) => !alertedIdsRef.current.has(n.id)
    );

    if (freshOnes.length === 0) return;

    freshOnes.forEach((n) => {
      alertedIdsRef.current.add(n.id);
      toast.success(`🔔 ${n.message}`, { duration: 6000 });
    });

    playNewOrderSound();
  }, [context?.notifications]);
};

export default useNewOrderAlert;