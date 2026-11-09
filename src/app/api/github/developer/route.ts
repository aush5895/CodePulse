import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get('username');
  const force = searchParams.get('force') === 'true';

  if (!username) {
    return NextResponse.json({ error: 'Username is required' }, { status: 400 });
  }

  if (force) {
    // @ts-expect-error: Next.js canary typings expect 2 arguments
    revalidateTag(`github-${username}`);
  }

  // Support Client-Side Token (from frontend) OR Fallback to Server-Side Token
  const authHeader = request.headers.get('Authorization');
  let githubToken = process.env.GITHUB_TOKEN || '';
  if (authHeader && authHeader.startsWith('Bearer ')) {
    githubToken = authHeader.split(' ')[1];
  }

  // Attempt to delegate to NestJS backend proxy if available
  const backendBase = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL;
  if (backendBase) {
    try {
      const backendUrl = `${backendBase.replace(/\/$/, '')}/github/developer?username=${encodeURIComponent(username)}${force ? '&force=true' : ''}`;
      const backendRes = await fetch(backendUrl, {
        headers: authHeader ? { Authorization: authHeader } : {},
        signal: AbortSignal.timeout(6000),
      });

      if (backendRes.status === 429) {
        return NextResponse.json(
          { error: 'Rate limit exceeded. Please wait a moment before trying again.' },
          { status: 429 },
        );
      }

      if (backendRes.ok) {
        const payload = await backendRes.json();
        const data = payload && payload.data ? payload.data : payload;
        return NextResponse.json(data);
      }
    } catch {
      // Fallback to local fetching below
    }
  }

  // Caching strategy: 1 hour (3600s) default, tied to a unique tag for this user
  const fetchOptions: RequestInit = {
    headers: githubToken ? { Authorization: `Bearer ${githubToken}` } : {},
    next: { revalidate: 3600, tags: [`github-${username}`] }
  };

  try {
    const userRes = await fetch(`https://api.github.com/users/${username}`, fetchOptions);
    if (!userRes.ok) {
      return NextResponse.json({ error: "Not found" }, { status: userRes.status });
    }
    const data = await userRes.json();
    
    const KNOWN_FRAMEWORKS = ['react', 'nextjs', 'vue', 'angular', 'svelte', 'nodejs', 'express', 'django', 'flask', 'spring', 'laravel', 'tailwindcss', 'docker', 'kubernetes', 'tensorflow', 'pytorch', 'graphql', 'mongodb', 'postgresql', 'redis', 'firebase', 'supabase', 'aws', 'gcp', 'azure'];
    
    let totalStars = 0;
    let totalRepos = data.public_repos || 0;
    let languagesMap: Record<string, number> = {};
    let frameworksMap: Record<string, number> = {};
    
    try {
      const reposRes = await fetch(`https://api.github.com/users/${username}/repos?per_page=100`, fetchOptions);
      if (reposRes.ok) {
        const repos = await reposRes.json();
        totalStars = repos.reduce((acc: number, r: any) => acc + (r.stargazers_count || 0), 0);
        repos.forEach((r: any) => {
           if (r.language && !r.fork) {
              languagesMap[r.language] = (languagesMap[r.language] || 0) + 1;
           }
           
           const desc = (r.description || "").toLowerCase();
           KNOWN_FRAMEWORKS.forEach(fw => {
             if ((r.topics && r.topics.includes(fw)) || desc.includes(fw)) {
               frameworksMap[fw] = (frameworksMap[fw] || 0) + 1;
             }
           });
        });
      }
    } catch (e) {}
    
    const topLanguages = Object.entries(languagesMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(e => ({ name: e[0], count: e[1] }));

    let totalPRs = 0;
    try {
      const prsRes = await fetch(`https://api.github.com/search/issues?q=type:pr+author:${username}`, fetchOptions);
      if (prsRes.ok) totalPRs = (await prsRes.json()).total_count || 0;
    } catch (e) {}

    let totalReviews = 0;
    try {
      const query = encodeURIComponent(`type:pr reviewed-by:${data.login}`);
      const reviewsRes = await fetch(`https://api.github.com/search/issues?q=${query}&per_page=1`, fetchOptions);
      if (reviewsRes.ok) totalReviews = (await reviewsRes.json()).total_count ?? 0;
    } catch {
      // Leave reviews at zero when GitHub search is unavailable.
    }

    let totalIssues = 0;
    try {
      const issuesRes = await fetch(`https://api.github.com/search/issues?q=type:issue+author:${username}`, fetchOptions);
      if (issuesRes.ok) totalIssues = (await issuesRes.json()).total_count || 0;
    } catch (e) {}

    let totalCommits = 0;
    try {
      const commitsRes = await fetch(`https://api.github.com/search/commits?q=author:${username}`, {
        ...fetchOptions,
        headers: { 
          Accept: "application/vnd.github.cloak-preview",
          ...(githubToken ? { Authorization: `Bearer ${githubToken}` } : {})
        }
      });
      if (commitsRes.ok) totalCommits = (await commitsRes.json()).total_count || 0;
    } catch (e) {}
    
    let avgAdditionsPerCommit = 42;
    let avgDeletionsPerCommit = 25;
    let hasAccurateSample = false;

    try {
      const reposRes = await fetch(`https://api.github.com/users/${username}/repos?per_page=3&sort=updated`, fetchOptions);
      if (reposRes.ok) {
        const recentRepos = await reposRes.json();
        let sampleCommits = 0;
        let sampleAdditions = 0;
        let sampleDeletions = 0;

        for (const repo of recentRepos) {
          if (repo.fork) continue;
          const statsRes = await fetch(`https://api.github.com/repos/${username}/${repo.name}/stats/contributors`, fetchOptions);
          if (statsRes.ok && statsRes.status === 200) {
            const contributors = await statsRes.json();
            if (Array.isArray(contributors)) {
              const userStats = contributors.find((c: any) => c.author?.login.toLowerCase() === username.toLowerCase());
              if (userStats && userStats.weeks) {
                userStats.weeks.forEach((w: any) => {
                  sampleAdditions += w.a;
                  sampleDeletions += w.d;
                  sampleCommits += w.c;
                });
              }
            }
          }
        }

        if (sampleCommits > 0) {
          avgAdditionsPerCommit = Math.min(Math.round(sampleAdditions / sampleCommits), 500);
          avgDeletionsPerCommit = Math.min(Math.round(sampleDeletions / sampleCommits), 500);
          hasAccurateSample = true;
        }
      }
    } catch (e) {
      console.error("Failed to fetch accurate stats sample", e);
    }

    let habit = { title: "Consistent Coder", iconName: "Coffee" };
    try {
      const eventsRes = await fetch(`https://api.github.com/users/${username}/events/public?per_page=50`, fetchOptions);
      if (eventsRes.ok) {
        const events = await eventsRes.json();
        let morning = 0, afternoon = 0, evening = 0, night = 0;
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
        if (max === night && night > 0) habit = { title: "Night Owl", iconName: "Moon" };
        else if (max === morning && morning > 0) habit = { title: "Early Bird", iconName: "Sun" };
        else if (max === evening && evening > 0) habit = { title: "Evening Coder", iconName: "Sunset" };
        else if (max === afternoon && afternoon > 0) habit = { title: "Afternoon Coder", iconName: "Coffee" };
      }
    } catch(e) {}

    let currentStreak = 0;
    let peakStreak = 0;
    try {
      const streakRes = await fetch(`https://github-contributions-api.deno.dev/${username}.json`, fetchOptions);
      if (streakRes.ok) {
        const streakData = await streakRes.json();
        const days = streakData.contributions.flat();
        
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
    } catch (e) {
      console.error("Streak fetch error", e);
    }

    const joinedAt = data.created_at ? new Date(data.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Unknown';
    
    const score = Math.min(100, Math.round((totalCommits * 0.01) + (totalPRs * 0.5) + (totalStars * 1) + (data.followers * 0.5)));
    
    let persona = { title: "Weekend Warrior", iconName: "Tent", type: "zinc" };
    if (score > 50) persona = { title: "Consistent Coder", iconName: "CalendarDays", type: "emerald" };
    if (score > 80) persona = { title: "Open Source Hero", iconName: "Star", type: "amber" };
    
    let globalRank = { title: "Top 50% Worldwide", percentile: 50, color: "text-gray-400" };
    if (score > 90) globalRank = { title: "Top 0.1% Worldwide", percentile: 0.1, color: "text-amber-400" };
    else if (score > 75) globalRank = { title: "Top 1% Worldwide", percentile: 1, color: "text-purple-400" };
    else if (score > 60) globalRank = { title: "Top 5% Worldwide", percentile: 5, color: "text-blue-400" };
    else if (score > 40) globalRank = { title: "Top 15% Worldwide", percentile: 15, color: "text-emerald-400" };
    else if (score > 25) globalRank = { title: "Top 30% Worldwide", percentile: 30, color: "text-teal-400" };

    const linesAdded = hasAccurateSample ? totalCommits * avgAdditionsPerCommit : totalCommits * 42 + (data.followers || 0) * 15;
    const linesDeleted = hasAccurateSample ? totalCommits * avgDeletionsPerCommit : Math.floor((totalCommits * 42 + (data.followers || 0) * 15) * 0.6);

    const devData = {
      id: data.id.toString(),
      username: data.login,
      name: data.name || data.login,
      avatar: data.avatar_url,
      bio: data.bio || "No bio available",
      location: data.location || "Earth",
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
        followers: data.followers || 0,
        streak: currentStreak,
        peakStreak: peakStreak,
        repos: totalRepos,
        linesAdded,
        linesDeleted,
      }
    };
    
    return NextResponse.json(devData);
  } catch (e: any) {
    console.error("API Route Error:", e);
    return NextResponse.json({ error: e.message || "Failed to fetch data" }, { status: 500 });
  }
}
