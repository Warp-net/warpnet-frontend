import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/vue';

vi.mock('@/service/service', () => ({
  warpnetService: {
    getOwnerProfile: vi.fn(),
    getProfile: vi.fn(),
    getImage: vi.fn(),
    getUsers: vi.fn(),
    getTweets: vi.fn(),
    getFollowers: vi.fn(),
    getFollowings: vi.fn(),
    isFollowing: vi.fn(),
    isFollower: vi.fn(),
    followUser: vi.fn(),
    unfollowUser: vi.fn(),
  },
}));

import Profile from '@/views/Profile.vue';
import { warpnetService } from '@/service/service';

const scrollDirective = {
  mounted() {},
  updated() {},
  unmounted() {},
};

const renderProfile = ({ routeId = 'bob' } = {}) =>
  render(Profile, {
    global: {
      mocks: {
        $filters: { timeago: () => 'just now' },
        $router: { push: vi.fn() },
        $route: { params: { id: routeId } },
      },
      directives: { scroll: scrollDirective, linkify: () => {} },
      stubs: {
        SideNav: true,
        DefaultRightBar: true,
        SearchBar: true,
        Loader: true,
        EditProfileOverlay: true,
        SetUpProfileOverlay: true,
        Tweets: true,
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
    id: 'bob',
    username: 'bob',
    avatar_key: '',
    background_image_key: '',
  });
  warpnetService.getImage.mockResolvedValue(null);
  warpnetService.getUsers.mockResolvedValue([{ id: 'bob' }]);
  warpnetService.getTweets.mockResolvedValue([]);
  warpnetService.getFollowers.mockResolvedValue([]);
  warpnetService.getFollowings.mockResolvedValue([]);
  warpnetService.isFollowing.mockResolvedValue(false);
  warpnetService.isFollower.mockResolvedValue(false);
  warpnetService.followUser.mockResolvedValue(undefined);
  warpnetService.unfollowUser.mockResolvedValue(undefined);
});

describe('Profile.vue reactivity', () => {
  it('renders the profile username reactively from loaded data', async () => {
    renderProfile();

    expect(await screen.findAllByText(/bob/)).not.toHaveLength(0);
  });

  it('flips Follow -> Following reactively after clicking Follow', async () => {
    renderProfile();

    const followBtn = await screen.findByRole('button', { name: /^Follow$/ });
    await fireEvent.click(followBtn);

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Following/ })
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: /^Follow$/ })
      ).not.toBeInTheDocument();
    });
    expect(warpnetService.followUser).toHaveBeenCalledWith('bob');
  });

  it('flips Following -> Follow reactively after clicking Unfollow', async () => {
    warpnetService.isFollowing.mockResolvedValue(true);

    renderProfile();

    const followingBtn = await screen.findByRole('button', { name: /Following/ });
    await fireEvent.click(followingBtn);

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /^Follow$/ })
      ).toBeInTheDocument();
    });
    expect(warpnetService.unfollowUser).toHaveBeenCalledWith('bob');
  });

  it('keeps the Follow button as Follow when the follow request fails (error state)', async () => {
    warpnetService.followUser.mockRejectedValueOnce(new Error('boom'));
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    renderProfile();

    const followBtn = await screen.findByRole('button', { name: /^Follow$/ });
    await fireEvent.click(followBtn);

    await waitFor(() => {
      expect(warpnetService.followUser).toHaveBeenCalled();
    });
    expect(screen.getByRole('button', { name: /^Follow$/ })).toBeInTheDocument();

    errorSpy.mockRestore();
  });
});
