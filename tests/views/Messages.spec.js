import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/vue';

vi.mock('@/service/service', () => ({
  warpnetService: {
    getOwnerProfile: vi.fn(),
    getProfile: vi.fn(),
    getImage: vi.fn(),
    getChats: vi.fn(),
    getDirectMessages: vi.fn(),
    createChat: vi.fn(),
    sendDirectMessage: vi.fn(),
    deleteChat: vi.fn(),
    uploadImage: vi.fn(),
  },
}));

import Messages from '@/views/Messages.vue';
import { warpnetService } from '@/service/service';

const scrollDirective = {
  mounted() {},
  updated() {},
  unmounted() {},
};

const renderMessages = ({ chatId } = {}) =>
  render(Messages, {
    global: {
      mocks: {
        $filters: { time: () => '12:00', timeago: () => 'just now' },
        $router: { push: vi.fn() },
        $route: { params: chatId ? { chatId } : {} },
      },
      directives: { scroll: scrollDirective, linkify: () => {} },
      stubs: {
        SideNav: true,
        Loader: true,
        NewMessageOverlay: true,
      },
    },
  });

beforeEach(() => {
  vi.clearAllMocks();
  warpnetService.getOwnerProfile.mockReturnValue({
    user_id: 'alice',
    username: 'alice',
  });
  warpnetService.getProfile.mockResolvedValue({
    id: 'alice',
    username: 'alice',
    avatar_key: '',
  });
  warpnetService.getImage.mockResolvedValue(null);
  warpnetService.getChats.mockResolvedValue([]);
  warpnetService.getDirectMessages.mockResolvedValue([]);
  warpnetService.createChat.mockResolvedValue({ id: 'chat-1' });
  warpnetService.sendDirectMessage.mockResolvedValue({});
  warpnetService.deleteChat.mockResolvedValue({});
  warpnetService.uploadImage.mockResolvedValue('');
});

describe('Messages.vue reactivity', () => {
  it('shows the placeholder when no chat is active (empty state)', async () => {
    renderMessages();

    expect(
      await screen.findByText(/You don’t have a message selected/i)
    ).toBeInTheDocument();
  });

  it('renders messages reactively for the active chat', async () => {
    const chat = {
      id: 'chat-1',
      owner_id: 'alice',
      other_user_id: 'bob',
      updated_at: new Date().toISOString(),
      last_message: 'hi',
    };
    warpnetService.getChats.mockResolvedValue([chat]);
    warpnetService.getProfile
      .mockResolvedValueOnce({ id: 'alice', username: 'alice', avatar_key: '' })
      .mockResolvedValueOnce({ id: 'alice', username: 'alice', avatar_key: '' })
      .mockResolvedValueOnce({ id: 'bob', username: 'bob', avatar_key: '' });
    warpnetService.getDirectMessages.mockResolvedValue([
      {
        id: 'm1',
        text: 'hi there',
        sender_id: 'alice',
        created_at: new Date().toISOString(),
      },
    ]);

    renderMessages({ chatId: 'chat-1' });

    expect(await screen.findByText('hi there')).toBeInTheDocument();
  });

  it('reactively appends a sent message without reload', async () => {
    const chat = {
      id: 'chat-1',
      owner_id: 'alice',
      other_user_id: 'bob',
      updated_at: new Date().toISOString(),
      last_message: '',
    };
    warpnetService.getChats.mockResolvedValue([chat]);
    warpnetService.getProfile
      .mockResolvedValueOnce({ id: 'alice', username: 'alice', avatar_key: '' })
      .mockResolvedValueOnce({ id: 'alice', username: 'alice', avatar_key: '' })
      .mockResolvedValueOnce({ id: 'bob', username: 'bob', avatar_key: '' });
    warpnetService.getDirectMessages.mockResolvedValue([]);

    renderMessages({ chatId: 'chat-1' });

    const input = await screen.findByPlaceholderText('Start a new message');
    await fireEvent.update(input, 'hello bob');

    const sendBtn = screen.getByRole('button', { name: /Send message/i });
    await fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(screen.getByText('hello bob')).toBeInTheDocument();
    });
    // The input clears reactively after send.
    expect(input.value).toBe('');
    expect(warpnetService.sendDirectMessage).toHaveBeenCalled();
  });

  it('reactively removes the active chat after deleting it', async () => {
    const chat = {
      id: 'chat-1',
      owner_id: 'alice',
      other_user_id: 'bob',
      updated_at: new Date().toISOString(),
      last_message: 'bye',
    };
    warpnetService.getChats.mockResolvedValue([chat]);
    warpnetService.getProfile
      .mockResolvedValueOnce({ id: 'alice', username: 'alice', avatar_key: '' })
      .mockResolvedValueOnce({ id: 'alice', username: 'alice', avatar_key: '' })
      .mockResolvedValueOnce({ id: 'bob', username: 'bob', avatar_key: '' });
    warpnetService.getDirectMessages.mockResolvedValue([
      {
        id: 'm1',
        text: 'bye',
        sender_id: 'alice',
        created_at: new Date().toISOString(),
      },
    ]);

    renderMessages({ chatId: 'chat-1' });

    await screen.findByText('bye');

    await fireEvent.click(
      screen.getByRole('button', { name: /Delete chat/i })
    );

    await waitFor(() => {
      expect(
        screen.getByText(/You don’t have a message selected/i)
      ).toBeInTheDocument();
    });
    expect(warpnetService.deleteChat).toHaveBeenCalledWith('chat-1');
  });
});
