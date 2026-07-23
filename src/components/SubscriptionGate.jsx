import React, { useEffect, useState, useCallback } from 'react';
import { IconCrown, IconClock, IconCheck } from '@tabler/icons-react';
import { subscriptionAPI } from '../utils/api';
import { useSubscriptionPayment } from '../hooks/useSubscriptionPayment';
import './SubscriptionGate.css';

const PLAN_ORDER = ['weekly', 'monthly', 'yearly'];

const SubscriptionGate = () => {
    const [subscription, setSubscription] = useState(null);
    const [plans, setPlans] = useState(null);
    const [trialPopupDismissed, setTrialPopupDismissed] = useState(
        sessionStorage.getItem('trialPopupSeen') === 'true'
    );

    const fetchStatus = useCallback(async () => {
        try {
            const res = await subscriptionAPI.getMySubscription();
            if (res.data.success) setSubscription(res.data.data);
        } catch (error) {
            console.error('Subscription status fetch error:', error);
        }
    }, []);

    const fetchPlans = useCallback(async () => {
        try {
            const res = await subscriptionAPI.getPlans();
            if (res.data.success) setPlans(res.data.data);
        } catch (error) {
            console.error('Plans fetch error:', error);
        }
    }, []);

    const { pay, payingPlan } = useSubscriptionPayment(() => fetchStatus());

    useEffect(() => {
        fetchStatus();
        fetchPlans();

        // Kisi bhi API call ke beech me 403 SUBSCRIPTION_EXPIRED aaye to turant refresh karo
        const onExpired = () => fetchStatus();
        window.addEventListener('subscription-expired', onExpired);
        return () => window.removeEventListener('subscription-expired', onExpired);
    }, [fetchStatus, fetchPlans]);

    const dismissTrialPopup = () => {
        sessionStorage.setItem('trialPopupSeen', 'true');
        setTrialPopupDismissed(true);
    };

    if (!subscription) return null;

    const isExpired = subscription.status === 'expired';
    const isTrial = subscription.status === 'trial';

    // ===== Blocking overlay: expired — koi close button nahi ===== 
    if (isExpired) {
        return (
            <div className="subscription-overlay">
                <div className="subscription-modal blocking">
                    <IconClock size={28} className="sub-icon" />
                    <h2>Aapka demo ya subscription khatam ho gya hai</h2>
                    <p>Dashboard access continue karne ke liye ek plan select karke payment karein</p>

                    <div className="plan-cards">
                        {plans &&
                            PLAN_ORDER.map((key) => (
                                <div key={key} className="plan-card">
                                    <h3>{plans[key].label}</h3>
                                    <p className="plan-price">₹{plans[key].amount}</p>
                                    <button
                                        onClick={() => pay(key, plans[key].label)}
                                        disabled={payingPlan === key}
                                    >
                                        {payingPlan === key ? 'Processing...' : 'Choose Plan'}
                                    </button>
                                </div>
                            ))}
                    </div>
                </div>
            </div>
        );
    }

    // ===== Dismissible popup: trial active =====
    if (isTrial && !trialPopupDismissed) {
        return (
            <div className="subscription-overlay">
                <div className="subscription-modal">
                    <IconCrown size={28} className="sub-icon" />
                    <h2>Demo mode active hai</h2>
                    <p>
                        Aapke paas <strong>{subscription.daysLeft} din</strong> bache hain free demo ke.
                        Uske baad continue karne ke liye subscription lena hoga.
                    </p>
                    <button className="sub-primary-btn" onClick={dismissTrialPopup}>
                        <IconCheck size={16} />Continue
                    </button>
                </div>
            </div>
        );
    }

    return null;
};

export default SubscriptionGate;