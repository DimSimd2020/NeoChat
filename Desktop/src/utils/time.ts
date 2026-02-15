export const formatTime = (ts: number): string => {
    if (!ts) return "";
    const date = new Date(ts * 1000);
    const now = new Date();

    if (date.toDateString() === now.toDateString()) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    if (date.getFullYear() === now.getFullYear()) {
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }

    return date.toLocaleDateString([], { year: '2-digit', month: 'numeric', day: 'numeric' });
};
