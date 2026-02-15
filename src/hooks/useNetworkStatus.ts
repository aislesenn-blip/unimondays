import { useState, useEffect } from 'react';

type ConnectionType = 'wifi' | 'cellular' | 'unknown';

export const useNetworkStatus = () => {
  const [connectionType, setConnectionType] = useState<ConnectionType>('wifi'); // Default to wifi for dev, but we can simulate checks

  useEffect(() => {
    // Basic simulation since navigator.connection is experimental/not fully supported in all browsers/sandbox
    // In a real PWA, we would use navigator.connection.type

    const checkConnection = () => {
        // Mock logic: randomly switch or just stick to wifi for now.
        // For the purpose of the "Smart Data Guard" demo, we want to allow the UI to react.
        // Let's expose a way to toggle it via window for testing if needed, or just default to 'wifi'
        // so the model downloads automatically as per prompt logic for "Apple-Style" smooth UX.

        // However, the prompt says: "If Cellular: STOP. Trigger a Modal."
        // To verify the modal, we might want to simulate 'cellular'.
        // Let's default to 'wifi' to be "Apple-Style" (it just works),
        // but let's add a debug toggle.

        if (window.navigator.onLine) {
            // Check if API exists
            const nav = navigator as any;
            if (nav.connection) {
                if (nav.connection.type === 'cellular' || nav.connection.effectiveType === '4g') {
                   setConnectionType('cellular');
                } else {
                   setConnectionType('wifi');
                }
            } else {
                setConnectionType('wifi'); // Fallback
            }
        } else {
            setConnectionType('unknown');
        }
    };

    window.addEventListener('online', checkConnection);
    window.addEventListener('offline', checkConnection);

    // Initial check
    checkConnection();

    return () => {
        window.removeEventListener('online', checkConnection);
        window.removeEventListener('offline', checkConnection);
    };
  }, []);

  return { connectionType };
};
