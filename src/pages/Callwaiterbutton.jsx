import React, { useState } from "react";
import { IconBell, IconX } from "@tabler/icons-react";
import toast from "react-hot-toast";
import { customerAPI } from "../utils/api";
import "./CallWaiterbutton.css";

const REASONS = ["Water", "Extra Plates", "Bill Please", "Something Else"];

const CallWaiterButton = ({ orderId, qrId, alreadyCalled }) => {
    const [showPicker, setShowPicker] = useState(false);
    const [called, setCalled] = useState(alreadyCalled || false);
    const [sending, setSending] = useState(false);

    const handleCall = async (reason) => {
        setSending(true);
        try {
            await customerAPI.callWaiter(orderId, qrId, reason);
            toast.success("Waiter has been notified!");
            setCalled(true);
            setShowPicker(false);
        } catch (error) {
            toast.error(error.response?.data?.message || "Could not reach waiter, try again");
        } finally {
            setSending(false);
        }
    };

    if (called) {
        return (
            <div className="call-waiter-status">
                <IconBell size={18} /> Waiter is on the way
            </div>
        );
    }

    return (
        <div className="call-waiter-wrapper">
            {!showPicker ? (
                <button className="call-waiter-btn" onClick={() => setShowPicker(true)}>
                    <IconBell size={18} /> Call Waiter
                </button>
            ) : (
                <div className="call-waiter-picker">
                    <div className="picker-header">
                        <span>What do you need?</span>
                        <IconX size={18} onClick={() => setShowPicker(false)} />
                    </div>
                    <div className="picker-options">
                        {REASONS.map((reason) => (
                            <button
                                key={reason}
                                disabled={sending}
                                onClick={() => handleCall(reason)}
                            >
                                {reason}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default CallWaiterButton;