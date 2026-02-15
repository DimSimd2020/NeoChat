import { render, screen, fireEvent } from '@testing-library/react';
import { ChatItem } from './ChatItem';
import { describe, it, expect, vi } from 'vitest';

const mockChat = {
    id: '1',
    name: 'Bob',
    chat_type: 'Private' as any,
    participants: [],
    unread_count: 2,
    last_message: {
        text: 'Last msg',
        timestamp: 1700000000,
        sender_id: 'bob'
    }
};

describe('ChatItem', () => {
    const onClick = vi.fn();
    const formatTime = (ts: number) => "12:00";

    it('renders chat name and last message', () => {
        render(<ChatItem chat={mockChat} isActive={false} onClick={onClick} formatTime={formatTime} />);
        expect(screen.getByText('Bob')).toBeDefined();
        expect(screen.getByText('Last msg')).toBeDefined();
        expect(screen.getByText('12:00')).toBeDefined();
    });

    it('shows unread badge when count > 0', () => {
        render(<ChatItem chat={mockChat} isActive={false} onClick={onClick} formatTime={formatTime} />);
        expect(screen.getByText('2')).toBeDefined();
    });

    it('calls onClick when clicked', () => {
        render(<ChatItem chat={mockChat} isActive={false} onClick={onClick} formatTime={formatTime} />);
        fireEvent.click(screen.getByText('Bob'));
        expect(onClick).toHaveBeenCalled();
    });

    it('applies active class', () => {
        const { container } = render(<ChatItem chat={mockChat} isActive={true} onClick={onClick} formatTime={formatTime} />);
        expect(container.firstChild).toHaveClass('active');
    });

    it('handles empty last message', () => {
        const emptyChat = { ...mockChat, last_message: undefined };
        render(<ChatItem chat={emptyChat} isActive={false} onClick={onClick} formatTime={formatTime} />);
        expect(screen.getByText('No messages yet')).toBeDefined();
    });
});
