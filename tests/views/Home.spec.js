import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/vue';

vi.mock('@/service/service', () => ({
  warpnetService: {
    getOwnerProfile: vi.fn(),
    getProfile: vi.fn(),
    getImage: vi.fn(),
    getMyTimeline: vi.fn(),
    createTweet: vi.fn(),
    uploadImages: vi.fn(),
    getNodeInfo: vi.fn(),
    subscribeNotifications: vi.fn(() => () => {}),
    getNotifications: vi.fn(),
  },
}));

import Home from '@/views/Home.vue';
import { warpnetService } from '@/service/service';

const scrollDirective = {
  mounted() {},
  updated() {},
  unmounted() {},
};

const renderHome = () =>
  render(Home, {
    global: {
      mocks: {
        $filters: { timeago: () => 'just now' },
        $router: { push: vi.fn() },
        $route: { query: {}, params: {} },
      },
      directives: { scroll: scrollDirective, linkify: () => {} },
      stubs: {
        SideNav: true,
        DefaultRightBar: true,
        Tweets: {
          props: ['tweets'],
          template:
            '<ul data-testid="timeline"><li v-for="t in tweets" :key="t.id">{{ t.text }}</li></ul>',
        },
        Loader: true,
        InfoOverlay: true,
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
    user_id: 'alice',
    avatar_key: '',
    background_image_key: '',
  });
  warpnetService.getImage.mockResolvedValue(null);
  warpnetService.uploadImages.mockResolvedValue([]);
  warpnetService.createTweet.mockResolvedValue({});
  warpnetService.getNotifications.mockResolvedValue({
    unread_count: 0,
    notifications: [],
  });
});

describe('Home.vue reactivity', () => {
  it('renders the timeline reactively from data loaded in created()', async () => {
    warpnetService.getMyTimeline.mockResolvedValueOnce([
      { id: 'a', text: 'first tweet' },
      { id: 'b', text: 'second tweet' },
    ]);

    renderHome();

    expect(await screen.findByText('first tweet')).toBeInTheDocument();
    expect(screen.getByText('second tweet')).toBeInTheDocument();
  });

  it('shows the welcome empty state when the timeline is empty (edge case)', async () => {
    warpnetService.getMyTimeline.mockResolvedValueOnce([]);

    renderHome();

    expect(await screen.findByText(/Welcome to Warpnet/i)).toBeInTheDocument();
  });

  it('reactively refreshes the timeline after posting a tweet (no reload)', async () => {
    warpnetService.getMyTimeline
      .mockResolvedValueOnce([{ id: 'a', text: 'existing' }])
      .mockResolvedValueOnce([
        { id: 'b', text: 'brand new tweet' },
        { id: 'a', text: 'existing' },
      ]);

    renderHome();

    expect(await screen.findByText('existing')).toBeInTheDocument();

    const textarea = screen.getByPlaceholderText("What's happening?");
    await fireEvent.update(textarea, 'brand new tweet');

    const tweetButton = screen.getByRole('button', { name: /^Tweet$/ });
    expect(tweetButton).not.toBeDisabled();

    await fireEvent.click(tweetButton);

    await waitFor(() => {
      expect(screen.getByText('brand new tweet')).toBeInTheDocument();
    });

    expect(warpnetService.createTweet).toHaveBeenCalledWith({
      text: 'brand new tweet',
      imageKeys: [],
    });
    // After submit the composer clears reactively.
    expect(textarea.value).toBe('');
  });

  it('disables the Tweet button when the composer is empty (reactive disabled state)', async () => {
    warpnetService.getMyTimeline.mockResolvedValueOnce([]);

    renderHome();

    const tweetButton = await screen.findByRole('button', { name: /^Tweet$/ });
    expect(tweetButton).toBeDisabled();

    const textarea = screen.getByPlaceholderText("What's happening?");
    await fireEvent.update(textarea, 'something');
    expect(tweetButton).not.toBeDisabled();

    await fireEvent.update(textarea, '');
    expect(tweetButton).toBeDisabled();
  });
});
