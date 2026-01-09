import { useState, useEffect, useRef } from 'react';

export type AutoSaveStatus = 'idle' | 'modified' | 'saving' | 'saved' | 'error';

export function useAutoSave(initialValue: string, onSave: (value: string) => Promise<void>, delay: number = 1000) {
    const [value, setValue] = useState(initialValue);
    const [status, setStatus] = useState<AutoSaveStatus>('idle');
    const firstRender = useRef(true);

    useEffect(() => {
        if (firstRender.current) {
            firstRender.current = false;
            return;
        }

        setStatus('modified');
        const handler = setTimeout(async () => {
            try {
                setStatus('saving');
                await onSave(value);
                setStatus('saved');
            } catch (error) {
                console.error("AutoSave failed:", error);
                setStatus('error');
            }
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]); // Note: onSave should be stable or ref-wrapped if it changes often, but for now simple dependency is fine.

    return { value, setValue, status };
}
