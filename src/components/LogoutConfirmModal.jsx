import React from 'react';
import { IconLogout } from '@tabler/icons-react';
import './SessionModals.css';

const LogoutConfirmModal = ({ onConfirm, onCancel }) => {
  return (
    <div className="session-modal-overlay" onClick={onCancel}>
      <div className="session-modal" onClick={(e) => e.stopPropagation()}>
        <div className="session-modal-icon">
          <IconLogout size={26} />
        </div>

        <h2>Do you want to log out?</h2>
        <p>You will now be logged out of your admin account.</p>

        <div className="session-modal-actions">
          <button className="session-modal-btn secondary" onClick={onCancel}>
            Cancel
          </button>
          <button className="session-modal-btn danger" onClick={onConfirm}>
            Yes, Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export default LogoutConfirmModal;