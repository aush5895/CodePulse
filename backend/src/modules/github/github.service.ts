import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import {
  GITHUB_CACHE_KEYS,
  GITHUB_CACHE_TTL,
} from './constants/cache.constants';

const KNOWN_FRAMEWORKS = [
  'react',
  'nextjs',
  'vue',
  'angular',
  'svelte',
  'nodejs',
  'express',
  'django',
  'flask',
  'spring',
  'laravel',
  'tailwindcss',
  'docker',
  'kubernetes',
  'tensorflow',
  'pytorch',
  'graphql',
  'mongodb',
  'postgresql',
  'redis',
  'firebase',
  'supabase',
  'aws',
  'gcp',
  'azure',
];

@Injectable()
export class GithubService {
  private readonly logger = new Logger(GithubService.name);

  constructor(
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  /**
   * Helper to build common headers for GitHub API requests.
   */
  private getHeaders(token?: string, extraHeaders: Record<string, string> = {}) {
    const actualToken = token || this.configService.get<string>('GITHUB_TOKEN');
    const headers: Record<string, string> = {
      'User-Agent': 'CodePulse-Developer-Platform',
      Accept: 'application/vnd.github.v3+json',
      ...extraHeaders,
    };
    if (actualToken) {
      headers['Authorization'] = `Bearer ${actualToken}`;
    }
    return headers;
  }

  /**
   * Translates Axios errors into appropriate NestJS HTTP exceptions.
   */
  private handleAxiosError(error: any, context: string, username?: string): never {
    const status = error.response?.status;
    const message = error.response?.data?.message || error.message;

    this.logger.error(`[${context}] Error fetching GitHub data for ${username || 'unknown'}: ${message}`);

    if (status === 404) {
      throw new NotFoundException(`GitHub user "${username}" was not found`);
    }
    if (status === 403 || status === 429) {
      throw new HttpException(
        'GitHub API rate limit exceeded. Please try again later or provide a personal access token.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    throw new HttpException(
      `Failed to proxy GitHub data: ${message}`,
      status || HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  /**
   * Fetches full user data via GitHub GraphQL API.
   * Preserved for backward-compatibility with SyncService.
   */
  async fetchUserData(username: string, accessToken?: string) {
    try {
      const query = `
        query($username: String!) {
          user(login: $username) {
            contributionsCollection {
              commitContributionsByRepository(maxRepositories: 5) {
                repository {
                  name
                }
                contributions(first: 1) {
                  totalCount
                }
              }
              contributionCalendar {
                totalContributions
                weeks {
                  contributionDays {
                    contributionCount
                    date
                  }
                }
              }
              totalCommitContributions
              totalPullRequestContributions
              totalIssueContributions
              totalRepositoryContributions
            }
            repositories(first: 100, ownerAffiliations: [OWNER, COLLABORATOR, ORGANIZATION_MEMBER], orderBy: {field: CREATED_AT, direction: DESC}) {
              pageInfo { hasNextPage }
              nodes {
                id
                name
                nameWithOwner
                description
                url
                updatedAt
                repositoryTopics(first: 5) {
                  nodes {
                    topic {
                      name
                    }
                  }
                }
                primaryLanguage {
                  name
                  color
                }
                stargazerCount
                forkCount
                createdAt
                issues(states: OPEN) {
                  totalCount
                }
                pullRequests(states: OPEN) {
                  totalCount
                }
                defaultBranchRef {
                  target {
                    ... on Commit {
                      history {
                        totalCount
                      }
                    }
                  }
                }
              }
            }
            followers {
              totalCount
            }
            following {
              totalCount
            }
            pullRequests(first: 10, orderBy: {field: CREATED_AT, direction: DESC}) {
              nodes {
                title
                createdAt
                repository {
                  name
                }
              }
            }
            issues(first: 10, orderBy: {field: CREATED_AT, direction: DESC}) {
              nodes {
                title
                createdAt
                repository {
                  name
                }
              }
            }
            starredRepositories(first: 10, orderBy: {field: STARRED_AT, direction: DESC}) {
              edges {
                starredAt
                node {
                  name
                }
              }
            }
            socialAccounts(first: 5) {
              nodes {
                provider
                url
              }
            }
          }
        }
      `;

      const response = await axios.post(
        'https://api.github.com/graphql',
        { query, variables: { username } },
        { headers: this.getHeaders(accessToken) },
      );

      if (response.data.errors) {
        this.logger.error('GraphQL errors:', response.data.errors);
        throw new Error('Failed to fetch GitHub data');
      }

      return response.data.data.user;
    } catch (error: any) {
      this.logger.error(`Error fetching GitHub data for ${username}:`, error.message);
      return null;
    }
  }

  /**
   * Fetches public user activity events from GitHub REST API.
   */
  async fetchUserEvents(username: string, accessToken?: string, limit: number = 30, strict: boolean = false) {
    try {
      const response = await axios.get(
        `https://api.github.com/users/${username}/events/public`,
        {
          headers: this.getHeaders(accessToken),
          params: { per_page: limit },
        },
      );
      return response.data;
    } catch (error: any) {
      this.logger.error(`Error fetching GitHub events for ${username}:`, error.message);
      if (strict) throw error;
      return [];
    }
  }

  /**
   * Fetches public GitHub user profile details.
   */
  async fetchUserProfile(username: string, token?: string) {
    try {
      const response = await axios.get(`https://api.github.com/users/${username}`, {
        headers: this.getHeaders(token),
      });
      const data = response.data;

      return {
        id: data.id?.toString(),
        username: data.login,
        name: data.name || data.login,
        avatarUrl: data.avatar_url,
        htmlUrl: data.html_url,
        bio: data.bio || '',
        company: data.company || null,
        location: data.location || null,
        blog: data.blog || null,
        twitterUsername: data.twitter_username || null,
        publicRepos: data.public_repos || 0,
        publicGists: data.public_gists || 0,
        followers: data.followers || 0,
        following: data.following || 0,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch (error: any) {
      return this.handleAxiosError(error, 'fetchUserProfile', username);
    }
  }

  /**
   * Fetches public repositories metadata for a given user.
   */
  async fetchUserRepos(username: string, token?: string, limit: number = 30) {
    try {
      const response = await axios.get(
        `https://api.github.com/users/${username}/repos`,
        {
          headers: this.getHeaders(token),
          params: {
            per_page: Math.min(limit, 100),
            sort: 'updated',
          },
        },
      );

      const repos = response.data;
      return repos.map((r: any) => ({
        id: r.id,
        name: r.name,
        fullName: r.full_name,
        description: r.description,
        htmlUrl: r.html_url,
        language: r.language,
        stargazersCount: r.stargazers_count || 0,
        forksCount: r.forks_count || 0,
        openIssuesCount: r.open_issues_count || 0,
        topics: r.topics || [],
        updatedAt: r.updated_at,
        isFork: r.fork || false,
      }));
    } catch (error: any) {
      return this.handleAxiosError(error, 'fetchUserRepos', username);
    }
  }

  /**
   * Fetches and compiles comprehensive developer analytics (score, persona, stats, habit).
   */
  async fetchDeveloperAnalytics(username: string, token?: string) {
    const headers = this.getHeaders(token);

    // 1. Fetch user base profile
    let userData: any;
    try {
      const userRes = await axios.get(`https://api.github.com/users/${username}`, { headers });
      userData = userRes.data;
    } catch (error: any) {
      return this.handleAxiosError(error, 'fetchDeveloperAnalytics.user', username);
    }

    let totalStars = 0;
    const totalRepos = userData.public_repos || 0;
    const languagesMap: Record<string, number> = {};
    const frameworksMap: Record<string, number> = {};

    // 2. Fetch Repositories
    let repos: any[] = [];
    try {
      const reposRes = await axios.get(`https://api.github.com/users/${username}/repos`, {
        headers,
        params: { per_page: 100, sort: 'updated' },
      });
      repos = reposRes.data || [];
      totalStars = repos.reduce((acc: number, r: any) => acc + (r.stargazers_count || 0), 0);

      repos.forEach((r: any) => {
        if (r.language && !r.fork) {
          languagesMap[r.language] = (languagesMap[r.language] || 0) + 1;
        }
        const desc = (r.description || '').toLowerCase();
        KNOWN_FRAMEWORKS.forEach((fw) => {
          if ((r.topics && r.topics.includes(fw)) || desc.includes(fw)) {
            frameworksMap[fw] = (frameworksMap[fw] || 0) + 1;
          }
        });
      });
    } catch (e: any) {
      this.logger.warn(`Failed to fetch repos for analytics (${username}): ${e.message}`);
    }

    const topLanguages = Object.entries(languagesMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, count]) => ({ name, count }));

    // 3. PRs, Issues, Commits count (via Search API)
    let totalPRs = 0;
    try {
      const prsRes = await axios.get('https://api.github.com/search/issues', {
        headers,
        params: { q: `type:pr author:${username}` },
      });
      totalPRs = prsRes.data?.total_count || 0;
    } catch (e: any) {
      this.logger.warn(`Failed to fetch PR count for ${username}: ${e.message}`);
    }

    let totalReviews = 0;
    try {
      const reviewsRes = await axios.get('https://api.github.com/search/issues', {
        headers,
        params: { q: `type:pr reviewed-by:${userData.login}`, per_page: 1 },
      });
      totalReviews = reviewsRes.data?.total_count ?? 0;
    } catch (error) {
      this.logger.warn(`Failed to fetch review count for ${username}: ${error instanceof Error ? error.message : String(error)}`);
    }

    let totalIssues = 0;
    try {
      const issuesRes = await axios.get('https://api.github.com/search/issues', {
        headers,
        params: { q: `type:issue author:${username}` },
      });
      totalIssues = issuesRes.data?.total_count || 0;
    } catch (e: any) {
      this.logger.warn(`Failed to fetch issue count for ${username}: ${e.message}`);
    }

    let totalCommits = 0;
    try {
      const commitsRes = await axios.get('https://api.github.com/search/commits', {
        headers: this.getHeaders(token, { Accept: 'application/vnd.github.cloak-preview' }),
        params: { q: `author:${username}` },
      });
      totalCommits = commitsRes.data?.total_count || 0;
    } catch (e: any) {
      this.logger.warn(`Failed to fetch commits count for ${username}: ${e.message}`);
    }

    // 4. Lines of Code estimation via contributor statistics
    let avgAdditionsPerCommit = 42;
    let avgDeletionsPerCommit = 25;
    let hasAccurateSample = false;

    try {
      const sampleRepos = repos.filter((r) => !r.fork).slice(0, 3);
      let sampleCommits = 0;
      let sampleAdditions = 0;
      let sampleDeletions = 0;

      for (const repo of sampleRepos) {
        try {
          const statsRes = await axios.get(
            `https://api.github.com/repos/${username}/${repo.name}/stats/contributors`,
            { headers, timeout: 5000 },
          );
          if (statsRes.status === 200 && Array.isArray(statsRes.data)) {
            const userStats = statsRes.data.find(
              (c: any) => c.author?.login?.toLowerCase() === username.toLowerCase(),
            );
            if (userStats?.weeks) {
              userStats.weeks.forEach((w: any) => {
                sampleAdditions += w.a || 0;
                sampleDeletions += w.d || 0;
                sampleCommits += w.c || 0;
              });
            }
          }
        } catch {
          // stats endpoint might return 202 or rate limit, continue
        }
      }

      if (sampleCommits > 0) {
        avgAdditionsPerCommit = Math.min(Math.round(sampleAdditions / sampleCommits), 500);
        avgDeletionsPerCommit = Math.min(Math.round(sampleDeletions / sampleCommits), 500);
        hasAccurateSample = true;
      }
    } catch (e: any) {
      this.logger.warn(`Failed to sample contributor stats for ${username}: ${e.message}`);
    }

    // 5. Habit detection from events
    let habit = { title: 'Consistent Coder', iconName: 'Coffee' };
    try {
      const events = await this.fetchUserEvents(username, token, 50);
      let morning = 0;
      let afternoon = 0;
      let evening = 0;
      let night = 0;

      for (const ev of events) {
        if (ev.type === 'PushEvent' || ev.type === 'CreateEvent') {
          const hour = new Date(ev.created_at).getHours();
          if (hour >= 5 && hour < 12) morning++;
          else if (hour >= 12 && hour < 18) afternoon++;
          else if (hour >= 18 && hour < 23) evening++;
          else night++;
        }
      }

      const max = Math.max(morning, afternoon, evening, night);
      if (max === night && night > 0) habit = { title: 'Night Owl', iconName: 'Moon' };
      else if (max === morning && morning > 0) habit = { title: 'Early Bird', iconName: 'Sun' };
      else if (max === evening && evening > 0) habit = { title: 'Evening Coder', iconName: 'Sunset' };
      else if (max === afternoon && afternoon > 0) habit = { title: 'Afternoon Coder', iconName: 'Coffee' };
    } catch {
      // Keep default habit
    }

    // 6. Streak calculation
    let currentStreak = 0;
    let peakStreak = 0;
    try {
      const streakRes = await axios.get(`https://github-contributions-api.deno.dev/${username}.json`, {
        timeout: 4000,
      });
      if (streakRes.status === 200 && streakRes.data?.contributions) {
        const days = streakRes.data.contributions.flat();
        let tempStreak = 0;
        for (const day of days) {
          if (day.contributionCount > 0) {
            tempStreak++;
            peakStreak = Math.max(peakStreak, tempStreak);
          } else {
            tempStreak = 0;
          }
        }

        let activeStreak = 0;
        const today = new Date().toISOString().split('T')[0];
        let todayIdx = days.findIndex((d: any) => d.date === today);
        if (todayIdx === -1) todayIdx = days.length - 1;

        if (todayIdx >= 0 && days[todayIdx].contributionCount === 0) {
          todayIdx--;
        }

        if (todayIdx >= 0 && days[todayIdx].contributionCount > 0) {
          for (let i = todayIdx; i >= 0; i--) {
            if (days[i].contributionCount > 0) {
              activeStreak++;
            } else {
              break;
            }
          }
        }
        currentStreak = activeStreak;
      }
    } catch {
      // Keep default streak
    }

    const joinedAt = userData.created_at
      ? new Date(userData.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      : 'Unknown';

    // 7. Score calculation
    const score = Math.min(
      100,
      Math.round(
        totalCommits * 0.01 +
          totalPRs * 0.5 +
          totalStars * 1 +
          (userData.followers || 0) * 0.5,
      ),
    );

    // 8. Persona assignment
    let persona = { title: 'Weekend Warrior', iconName: 'Tent', type: 'zinc' };
    if (score > 80) persona = { title: 'Open Source Hero', iconName: 'Star', type: 'amber' };
    else if (score > 50) persona = { title: 'Consistent Coder', iconName: 'CalendarDays', type: 'emerald' };

    // 9. Global Rank percentile
    let globalRank = { title: 'Top 50% Worldwide', percentile: 50, color: 'text-gray-400' };
    if (score > 90) globalRank = { title: 'Top 0.1% Worldwide', percentile: 0.1, color: 'text-amber-400' };
    else if (score > 75) globalRank = { title: 'Top 1% Worldwide', percentile: 1, color: 'text-purple-400' };
    else if (score > 60) globalRank = { title: 'Top 5% Worldwide', percentile: 5, color: 'text-blue-400' };
    else if (score > 40) globalRank = { title: 'Top 15% Worldwide', percentile: 15, color: 'text-emerald-400' };
    else if (score > 25) globalRank = { title: 'Top 30% Worldwide', percentile: 30, color: 'text-teal-400' };

    const linesAdded = hasAccurateSample
      ? totalCommits * avgAdditionsPerCommit
      : totalCommits * 42 + (userData.followers || 0) * 15;
    const linesDeleted = hasAccurateSample
      ? totalCommits * avgDeletionsPerCommit
      : Math.floor((totalCommits * 42 + (userData.followers || 0) * 15) * 0.6);

    return {
      id: userData.id?.toString(),
      username: userData.login,
      name: userData.name || userData.login,
      avatar: userData.avatar_url,
      bio: userData.bio || 'No bio available',
      location: userData.location || 'Earth',
      joinedAt,
      score,
      persona,
      habit,
      globalRank,
      frameworks: frameworksMap,
      topLanguages,
      stats: {
        totalCommits,
        totalPRs,
        totalReviews,
        totalIssues,
        totalStars,
        followers: userData.followers || 0,
        streak: currentStreak,
        peakStreak: peakStreak,
        repos: totalRepos,
        linesAdded,
        linesDeleted,
      },
    };
  }

  // =========================================================================
  // CACHED ACCESS METHODS (Implementing 5-10 min caching strategy)
  // =========================================================================

  /**
   * Retrieves developer analytics with smart caching (TTL: 5 minutes).
   * If forceRefresh is true, invalidates existing cache and queries GitHub fresh.
   */
  async getDeveloperAnalyticsCached(
    username: string,
    token?: string,
    forceRefresh: boolean = false,
  ) {
    const cacheKey = GITHUB_CACHE_KEYS.DEVELOPER(username);

    if (forceRefresh) {
      this.logger.log(`Force refresh: evicting cache key "${cacheKey}"`);
      await this.cacheManager.del(cacheKey);
    } else {
      const cached = await this.cacheManager.get(cacheKey);
      if (cached) {
        this.logger.log(`Cache HIT for developer analytics: ${username}`);
        return { ...(cached as Record<string, any>), cached: true };
      }
    }

    this.logger.log(`Cache MISS for developer analytics: ${username}. Fetching from GitHub...`);
    const data = await this.fetchDeveloperAnalytics(username, token);
    await this.cacheManager.set(cacheKey, data, GITHUB_CACHE_TTL.DEVELOPER);

    return { ...data, cached: false };
  }

  /**
   * Retrieves user profile with smart caching (TTL: 10 minutes).
   */
  async getUserProfileCached(
    username: string,
    token?: string,
    forceRefresh: boolean = false,
  ) {
    const cacheKey = GITHUB_CACHE_KEYS.PROFILE(username);

    if (forceRefresh) {
      this.logger.log(`Force refresh: evicting cache key "${cacheKey}"`);
      await this.cacheManager.del(cacheKey);
    } else {
      const cached = await this.cacheManager.get(cacheKey);
      if (cached) {
        this.logger.log(`Cache HIT for user profile: ${username}`);
        return { ...(cached as Record<string, any>), cached: true };
      }
    }

    this.logger.log(`Cache MISS for user profile: ${username}. Fetching from GitHub...`);
    const data = await this.fetchUserProfile(username, token);
    await this.cacheManager.set(cacheKey, data, GITHUB_CACHE_TTL.PROFILE);

    return { ...data, cached: false };
  }

  /**
   * Retrieves user repository metadata with smart caching (TTL: 5 minutes).
   */
  async getUserReposCached(
    username: string,
    token?: string,
    forceRefresh: boolean = false,
    limit: number = 30,
  ) {
    const cacheKey = `${GITHUB_CACHE_KEYS.REPOS(username)}:${limit}`;

    if (forceRefresh) {
      this.logger.log(`Force refresh: evicting cache key "${cacheKey}"`);
      await this.cacheManager.del(cacheKey);
    } else {
      const cached = await this.cacheManager.get(cacheKey);
      if (cached) {
        this.logger.log(`Cache HIT for user repos: ${username}`);
        return { repos: cached, cached: true };
      }
    }

    this.logger.log(`Cache MISS for user repos: ${username}. Fetching from GitHub...`);
    const data = await this.fetchUserRepos(username, token, limit);
    await this.cacheManager.set(cacheKey, data, GITHUB_CACHE_TTL.REPOS);

    return { repos: data, cached: false };
  }

  /**
   * Retrieves user public events with smart caching (TTL: 3 minutes).
   */
  async getUserEventsCached(
    username: string,
    token?: string,
    forceRefresh: boolean = false,
    limit: number = 30,
  ) {
    const cacheKey = `${GITHUB_CACHE_KEYS.EVENTS(username)}:${limit}`;

    if (forceRefresh) {
      this.logger.log(`Force refresh: evicting cache key "${cacheKey}"`);
      await this.cacheManager.del(cacheKey);
    } else {
      const cached = await this.cacheManager.get(cacheKey);
      if (cached) {
        this.logger.log(`Cache HIT for user events: ${username}`);
        return { events: cached, cached: true };
      }
    }

    this.logger.log(`Cache MISS for user events: ${username}. Fetching from GitHub...`);
    const data = await this.fetchUserEvents(username, token, limit);
    await this.cacheManager.set(cacheKey, data, GITHUB_CACHE_TTL.EVENTS);

    return { events: data, cached: false };
  }

  /**
   * Clears and invalidates all cached keys associated with a GitHub username.
   */
  async invalidateUserCache(username: string) {
    const normalized = username.toLowerCase();
    const developerKey = GITHUB_CACHE_KEYS.DEVELOPER(normalized);
    const profileKey = GITHUB_CACHE_KEYS.PROFILE(normalized);
    const reposKey = `${GITHUB_CACHE_KEYS.REPOS(normalized)}:30`;
    const eventsKey = `${GITHUB_CACHE_KEYS.EVENTS(normalized)}:30`;

    await Promise.all([
      this.cacheManager.del(developerKey),
      this.cacheManager.del(profileKey),
      this.cacheManager.del(reposKey),
      this.cacheManager.del(eventsKey),
    ]);

    this.logger.log(`Successfully invalidated all caches for user: ${username}`);

    return {
      invalidated: true,
      username,
      clearedKeys: [developerKey, profileKey, reposKey, eventsKey],
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Synchronizes user data fresh from GitHub and updates the cache.
   */
  async syncUser(username: string, token?: string) {
    await this.invalidateUserCache(username);
    const freshData = await this.getDeveloperAnalyticsCached(username, token, true);

    return {
      synced: true,
      username,
      data: freshData,
      timestamp: new Date().toISOString(),
    };
  }
}
