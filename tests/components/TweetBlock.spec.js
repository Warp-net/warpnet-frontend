import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/vue';

vi.mock('@/service/service', () => ({
  warpnetService: {
    getProfile: vi.fn(),
    getImage: vi.fn(),
    getOwnerProfile: vi.fn(),
    hasLiker: vi.fn(),
    hasRetweeter: vi.fn(),
    getTweetStats: vi.fn(),
    likeTweet: vi.fn(),
    unlikeTweet: vi.fn(),
    setLiker: vi.fn(),
    deleteLiker: vi.fn(),
    retweetTweet: vi.fn(),
    unretweetTweet: vi.fn(),
    setRetweeter: vi.fn(),
    deleteRetweeter: vi.fn(),
    deleteTweet: vi.fn(),
    deleteReply: vi.fn(),
  },
}));

import TweetBlock from '@/components/TweetBlock.vue';
import { warpnetService } from '@/service/service';

const baseTweet = () => ({
  id: 't1',
  user_id: 'alice',
  username: 'alice',
  text: 'hello world',
  created_at: new Date().toISOString(),
  image_keys: [],
  retweeted_by: '',
  parent_id: '',
  root_id: '',
});

const renderTweet = (tweet) =>
  render(TweetBlock, {
    props: { tweet: tweet || baseTweet() },
    global: {
      mocks: {
        $filters: { timeago: () => 'just now' },
        $router: { push: vi.fn() },
      },
      stubs: { ReplyOverlay: true },
    },
  });

beforeEach(() => {
  vi.clearAllMocks();
  warpnetService.getProfile.mockResolvedValue({
    id: 'alice',
    username: 'alice',
    avatar_key: '',
  });
  warpnetService.getImage.mockResolvedValue(null);
  warpnetService.getOwnerProfile.mockReturnValue({
    user_id: 'alice',
    username: 'alice',
  });
  warpnetService.hasLiker.mockResolvedValue(false);
  warpnetService.hasRetweeter.mockResolvedValue(false);
  warpnetService.getTweetStats.mockResolvedValue({
    tweet_id: 't1',
    likes_count: 3,
    retweets_count: 1,
    replies_count: 0,
  });
  warpnetService.likeTweet.mockResolvedValue(4);
  warpnetService.unlikeTweet.mockResolvedValue(2);
  warpnetService.setLiker.mockResolvedValue(undefined);
  warpnetService.deleteLiker.mockResolvedValue(undefined);
  warpnetService.retweetTweet.mockResolvedValue({});
  warpnetService.unretweetTweet.mockResolvedValue({});
  warpnetService.setRetweeter.mockResolvedValue(undefined);
  warpnetService.deleteRetweeter.mockResolvedValue(undefined);
  warpnetService.deleteTweet.mockResolvedValue(undefined);
  warpnetService.deleteReply.mockResolvedValue(undefined);
});

describe('TweetBlock reactivity', () => {
  it('renders reactive content from props', async () => {
    renderTweet();

    expect(await screen.findByText('hello world')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('3')).toBeInTheDocument();
    });
  });

  it('updates the like count reactively after clicking Like', async () => {
    renderTweet();

    await screen.findByText('hello world');
    await waitFor(() => expect(screen.getByText('3')).toBeInTheDocument());

    await fireEvent.click(screen.getByRole('button', { name: /^Like$/ }));

    await waitFor(() => {
      expect(screen.getByText('4')).toBeInTheDocument();
      expect(screen.queryByText('3')).not.toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /^Unlike$/ })).toBeInTheDocument();
  });

  it('toggles like state back to unliked reactively', async () => {
    warpnetService.hasLiker.mockResolvedValue(true);
    warpnetService.getTweetStats.mockResolvedValue({
      tweet_id: 't1',
      likes_count: 5,
      retweets_count: 0,
      replies_count: 0,
    });
    renderTweet();

    const unlike = await screen.findByRole('button', { name: /^Unlike$/ });
    await waitFor(() => expect(screen.getByText('5')).toBeInTheDocument());

    await fireEvent.click(unlike);

    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /^Like$/ })
      ).toBeInTheDocument();
    });
  });

  it('updates retweet state and count reactively after clicking Retweet', async () => {
    warpnetService.getTweetStats
      .mockResolvedValueOnce({
        tweet_id: 't1',
        likes_count: 0,
        retweets_count: 0,
        replies_count: 0,
      })
      .mockResolvedValueOnce({
        tweet_id: 't1',
        likes_count: 0,
        retweets_count: 1,
        replies_count: 0,
      });

    renderTweet();
    const retweetBtn = await screen.findByRole('button', { name: /^Retweet$/ });

    await fireEvent.click(retweetBtn);

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Undo retweet/i })
      ).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
    });
  });

  it('removes the tweet from the DOM when deleted (no reload required)', async () => {
    renderTweet();

    await screen.findByText('hello world');

    // Owner is the tweet's author, dropdown menu is available.
    await fireEvent.click(
      screen.getByRole('button', { name: /Tweet options/i })
    );
    await fireEvent.click(
      screen.getByRole('button', { name: /Delete tweet/i })
    );

    await waitFor(() => {
      expect(screen.queryByText('hello world')).not.toBeInTheDocument();
    });
  });

  it('keeps liked/retweeted false when no owner profile is available (edge case)', async () => {
    warpnetService.getOwnerProfile.mockReturnValue(undefined);
    warpnetService.getTweetStats.mockResolvedValue({
      tweet_id: 't1',
      likes_count: 0,
      retweets_count: 0,
      replies_count: 0,
    });

    renderTweet();

    expect(await screen.findByRole('button', { name: /^Like$/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Retweet$/ })).toBeInTheDocument();
  });

  it('shows the retweet header reactively when retweeted_by is set', async () => {
    warpnetService.getProfile
      .mockResolvedValueOnce({ id: 'alice', username: 'alice', avatar_key: '' })
      .mockResolvedValueOnce({ id: 'bob', username: 'bob', avatar_key: '' });

    const retweeted = { ...baseTweet(), retweeted_by: 'bob' };
    renderTweet(retweeted);

    await waitFor(() => {
      expect(screen.getByText(/Retweeted/)).toBeInTheDocument();
    });
  });
});
