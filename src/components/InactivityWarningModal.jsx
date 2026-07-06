import React from 'react';
import { IconClockExclamation } from '@tabler/icons-react';
import './SessionModals.css';

const InactivityWarningModal = ({ countdown, onStay }) => {
  return (
    <div className="session-modal-overlay">
      <div className="session-modal warning">
        <div className="session-modal-icon warning-icon">
          <IconClockExclamation size={28} />
        </div>

        <h2>Aap wahaan ho kya?</h2>
        <p>
          Kaafi der se koi activity nahi hui — security ke liye
          <strong> {countdown} second </strong> me automatically logout ho jaayega.
        </p>

        <div className="session-countdown-bar">
          <div
            className="session-countdown-fill"
            style={{ width: `${(countdown / 60) * 100}%` }}
          />
        </div>

        <button className="session-modal-btn primary" onClick={onStay}>
          Stay Logged In
        </button>
      </div>
    </div>
  );
};

export default InactivityWarningModal;