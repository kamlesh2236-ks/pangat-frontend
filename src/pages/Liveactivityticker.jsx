import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    IconActivity,
    IconCalendarEvent,
    IconChefHat,
    IconCircleCheck,
    IconCurrencyRupee,
    IconTable,
} from '@tabler/icons-react';
import { activityAPI } from '../utils/api';
import './Liveactivityticker.css';

const ICONS = {
    reservation: IconCalendarEvent,
    kitchen: IconChefHat,
    order: IconCircleCheck,
    payment: IconCurrencyRupee,
    table: IconTable,
};

const POLL_INTERVAL_MS = 15000;

const LiveActivityTicker = ({ pollInterval = POLL_INTERVAL_MS }) => {
    const [feed, setFeed] = useState([]);
    const [connected, setConnected] = useState(true);
    const timerRef = useRef(null);

    const fetchFeed = useCallback(async () => {
        try {
            const res = await activityAPI.getLive(15);
            if (res.data.success) {
                setFeed(res.data.data);
                setConnected(true);
            }
        } catch (err) {
            console.error('Failed to fetch live activity:', err);
            setConnected(false);
        }
    }, []);

    useEffect(() => {
        fetchFeed();
        timerRef.current = setInterval(fetchFeed, pollInterval);
        return () => clearInterval(timerRef.current);
    }, [fetchFeed, pollInterval]);

    if (feed.length === 0) {
        return (
            <div className="live-ticker">
                <div className="live-ticker-badge">
                    <IconActivity size={16} stroke={2.5} className="live-ticker-pulse" />
                    <span>LIVE</span>
                </div>
                <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, padding: '0 12px' }}>
                    Waiting for activity — check console for [LiveActivityTicker] logs
                </span>
            </div>
        );
    }

    // duplicate the list once so the CSS marquee loops seamlessly
    const marqueeItems = [...feed, ...feed];

    return (
        <div className="live-ticker">
            <div className="live-ticker-badge">
                <IconActivity size={16} stroke={2.5} className="live-ticker-pulse" />
                <span>LIVE</span>
            </div>

            <div className="live-ticker-track-wrap">
                <div className={`live-ticker-track ${connected ? '' : 'paused'}`}>
                    {marqueeItems.map((item, i) => {
                        const Icon = ICONS[item.type] || IconActivity;
                        return (
                            <span className="live-ticker-item" key={`${item.id}-${i}`}>
                                <Icon size={14} stroke={2} className={`live-ticker-icon icon-${item.type}`} />
                                {item.message}
                                <span className="live-ticker-dot">•</span>
                            </span>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default LiveActivityTicker;