const KEY = 'pangat_active_order';
export const saveActiveOrder = ({ orderId, qrId, homePath }) => {
    if (!orderId || !qrId) return;
    try {
        localStorage.setItem(
            KEY,
            JSON.stringify({ orderId, qrId, homePath: homePath || null, savedAt: Date.now() })
        );
    } catch (e) {
        // localStorage unavailable (private mode etc.) — fail silently
    }
};

export const getActiveOrder = () => {
    try {
        const raw = localStorage.getItem(KEY);
        return raw ? JSON.parse(raw) : null;
    } catch (e) {
        return null;
    }
};

export const clearActiveOrder = (orderId) => {
    try {
        // Only clear if it's the same order (avoid wiping a newer active order)
        const current = getActiveOrder();
        if (!orderId || !current || current.orderId === orderId) {
            localStorage.removeItem(KEY);
        }
    } catch (e) {
        // ignore
    }
};