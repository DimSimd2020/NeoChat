import { render, screen } from '@testing-library/react';
import { MessageBubble } from './MessageBubble';
import { describe, it, expect } from 'vitest';
import { MessageStatus } from '../types';

const currentUser = { id: 'me', username: 'Alice', is_registered: true, avatar_url: null, status: 'Online' as any, last_seen: 0 };
const otherUser = { id: 'them', username: 'Bob', is_registered: true, avatar_url: null, status: 'Online' as any, last_seen: 0 };

describe('MessageBubble', () => {
    it('renders "me" style when I am the sender', () => {
        const msg = { id: '1', chat_id: 'c1', sender_id: 'me', text: 'Hello', timestamp: 1700000000, status: 'sent' as any };
        const { container } = render(<MessageBubble message={msg} currentUser={currentUser} />);
        expect(container.firstChild).toHaveClass('me');
        expect(screen.getByText('Hello')).toBeDefined();
    });

    it('renders "them" style when other is the sender', () => {
        const msg = { id: '1', chat_id: 'c1', sender_id: 'them', text: 'Hi', timestamp: 1700000000, status: 'read' as any };
        const { container } = render(<MessageBubble message={msg} currentUser={currentUser} />);
        expect(container.firstChild).toHaveClass('them');
        expect(screen.getByText('Hi')).toBeDefined();
    });

    it('shows read ticks for me', () => {
        const msg = { id: '1', chat_id: 'c1', sender_id: 'me', text: 'Seen', timestamp: 1700000000, status: 'read' as any };
        render(<MessageBubble message={msg} currentUser={currentUser} />);
        expect(screen.getByText('✓✓')).toBeDefined();
    });

    it('does not show ticks for them', () => {
        const msg = { id: '1', chat_id: 'c1', sender_id: 'them', text: 'Hi', timestamp: 1700000000, status: 'read' as any };
        render(<MessageBubble message={msg} currentUser={currentUser} />);
        expect(screen.queryByText('✓✓')).toBeNull();
    });
});
