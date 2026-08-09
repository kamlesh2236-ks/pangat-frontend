import { useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { NotificationContext } from '../context/NotificationContext';
import { playNewOrderSound, unlockAudio } from '../utils/notificationSound';

const REPEAT_ALERT_MS = 6000;
const TOAST_ID = 'pending-order-alert';
const ORDERS_PAGE_PATH = '/orders';

const useNewOrderAlert = () => {
  const context = useContext(NotificationContext);
  const navigate = useNavigate();

  // Browser autoplay restriction hatane ke liye — pehla click hote hi audio unlock
  useEffect(() => {
    const unlock = () => {
      unlockAudio();
      document.removeEventListener('click', unlock);
    };
    document.addEventListener('click', unlock);
    return () => document.removeEventListener('click', unlock);
  }, []);

  const pendingCount = context?.pendingCount || 0;
  const alertsEnabled = context?.alertsEnabled;

  // Sound tab tak repeat hoga jab tak koi order "Placed" me pada hai aur alerts on hain
  useEffect(() => {
    if (pendingCount > 0 && alertsEnabled) {
      playNewOrderSound();
      const id = setInterval(playNewOrderSound, REPEAT_ALERT_MS);
      return () => clearInterval(id);
    }
  }, [pendingCount, alertsEnabled]);

  // Chhota persistent popup — kisi bhi page se dikhega, click karne par Orders page khulega
  useEffect(() => {
    if (pendingCount > 0 && alertsEnabled) {
      toast.custom(
        () => (
          <div
            className="pending-order-toast"
            onClick={() => {
              navigate(ORDERS_PAGE_PATH);
              toast.dismiss(TOAST_ID);
            }}
          >
            <span className="pending-order-toast-dot" />
            {pendingCount} new order{pendingCount > 1 ? 's' : ''} waiting — tap to review
          </div>
        ),
        { id: TOAST_ID, duration: Infinity, position: 'top-right' }
      );
    } else {
      toast.dismiss(TOAST_ID);
    }
  }, [pendingCount, alertsEnabled, navigate]);
};

export default useNewOrderAlert;