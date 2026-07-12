import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { subscriptionAPI } from '../utils/api';

const loadRazorpayScript = () =>
    new Promise((resolve) => {
        if (window.Razorpay) return resolve(true);
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });

export const useSubscriptionPayment = (onSuccess) => {
    const [payingPlan, setPayingPlan] = useState(null);

    const pay = useCallback(
        async (plan, planLabel) => {
            const scriptLoaded = await loadRazorpayScript();
            if (!scriptLoaded) {
                toast.error('Payment gateway failed to load., Check Internet');
                return;
            }

            try {
                setPayingPlan(plan);
                const orderRes = await subscriptionAPI.createOrder(plan);

                if (!orderRes.data.success) {
                    toast.error('Order Didnt created');
                    setPayingPlan(null);
                    return;
                }

                const { orderId, amount, currency, keyId } = orderRes.data.data;
                const user = JSON.parse(localStorage.getItem('adminUser') || '{}');

                const options = {
                    key: keyId,
                    amount,
                    currency,
                    name: 'Restaurant SaaS',
                    description: `${planLabel} Subscription`,
                    order_id: orderId,
                    prefill: { name: user?.name || '', email: user?.email || '' },
                    theme: { color: '#ff6b35' },
                    handler: async (response) => {
                        document.body.style.overflow = '';
                        document.body.style.position = '';

                        try {
                            const verifyRes = await subscriptionAPI.verifyPayment({
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature,
                                plan,
                            });

                            if (verifyRes.data.success) {
                                toast.success('Payment successful! Subscription activated');
                                onSuccess && onSuccess(verifyRes.data.data);
                            } else {
                                toast.error('Payment Didnt Verified, Contact Support');
                            }
                        } catch {
                            toast.error('Payment verification failed');
                        } finally {
                            setPayingPlan(null);
                        }
                    },
                    modal: {
                        ondismiss: () => {
                            document.body.style.overflow = '';
                            document.body.style.position = '';
                            setPayingPlan(null);
                        },
                    },
                };

                const rzp = new window.Razorpay(options);
                rzp.on('payment.failed', () => {
                    document.body.style.overflow = '';
                    document.body.style.position = '';
                    toast.error('Payment failed, Please Retry');
                    setPayingPlan(null);
                });
                rzp.open();
            } catch {
                toast.error('Something went wrong, Please Retry');
                setPayingPlan(null);
            }
        },
        [onSuccess]
    );

    return { pay, payingPlan };
};