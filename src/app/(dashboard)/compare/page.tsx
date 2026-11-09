"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { RadarCompareChart } from "@/components/charts/radar-compare-chart";
import { useCurrentUser } from "@/hooks/api/use-auth";
import { 
  Swords, Search, Trophy, CalendarDays, MapPin, Calendar, GitBranch, Star, Users, Flame,
  TrendingUp, GitCommitHorizontal, GitPullRequest, CircleDot, CodeXml, Coffee, Plus, Minus,
  Loader2, X, Tent, Crown, AlertCircle, Moon, Sun, Sunset, Code2, Key, RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

// Types
interface DevStats {
  totalCommits: number;
  totalPRs: number;
  totalReviews?: number;
  totalIssues: number;
  totalStars: number;
  followers: number;
  streak: number;
  repos: number;
  peakStreak: number;
  linesAdded: number;
  linesDeleted: number;
}

interface DevData {
  id: string;
  username: string;
  name: string;
  avatar: string;
  bio?: string;
  location?: string;
  joinedAt?: string;
  score: number;
  persona: { title: string; icon?: any; iconName?: string; type: string };
  habit: { title: string; iconName: string };
  globalRank: { title: string; percentile: number; color: string };
  frameworks: Record<string, number>;
  topLanguages: { name: string; count: number }[];
  stats: DevStats;
}

const STORAGE_KEY = "codepulse_recent_comparisons";

const SkeletonShimmer = ({ className }: { className?: string }) => (
  <Skeleton className={className} />
);

function CompareDashboard() {
  const { data: currentUser, isLoading: loadingUser } = useCurrentUser();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [search1, setSearch1] = useState("");
  const [search2, setSearch2] = useState("");
  
  const [dev1, setDev1] = useState<DevData | null>(null);
  const [dev2, setDev2] = useState<DevData | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [recentComparisons, setRecentComparisons] = useState<{u1: string, u2: string}[]>([]);
  const [githubToken, setGithubToken] = useState("");
  const [showTokenInput, setShowTokenInput] = useState(false);
  
  // Load recent comparisons from local storage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && stored.trim() !== "" && stored !== "undefined") {
        setRecentComparisons(JSON.parse(stored));
      }
      const token = localStorage.getItem("codepulse_github_token");
      if (token) setGithubToken(token);
    } catch (e) {
      console.error("Local storage error:", e);
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const saveToken = (token: string) => {
    setGithubToken(token);
    if (token) localStorage.setItem("codepulse_github_token", token);
    else localStorage.removeItem("codepulse_github_token");
  };

  // Sync to local storage
  const saveRecent = (u1: string, u2: string) => {
    setRecentComparisons(prev => {
      const filtered = prev.filter(p => !(p.u1 === u1 && p.u2 === u2));
      const next = [{u1, u2}, ...filtered].slice(0, 5);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const clearRecent = () => {
    setRecentComparisons([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  const removeRecent = (u1: string, u2: string) => {
    setRecentComparisons(prev => {
      const next = prev.filter(p => !(p.u1 === u1 && p.u2 === u2));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  // Check URL params
  useEffect(() => {
    const q1 = searchParams.get('user1') || searchParams.get('dev1') || searchParams.get('u1');
    const q2 = searchParams.get('user2') || searchParams.get('dev2') || searchParams.get('u2');
    
    if (q1 && q2 && !dev1 && !dev2 && !isLoading) {
      setSearch1(q1);
      setSearch2(q2);
      handleCompare(q1, q2);
    }
  }, [searchParams]);

  // Pre-fill user1 if current user is available and empty
  useEffect(() => {
    if (currentUser && !search1 && !dev1 && !searchParams.get('dev1')) {
      setSearch1(currentUser.username);
    }
  }, [currentUser, search1, dev1, searchParams]);

  const fetchDevData = async (username: string, forceRefresh = false): Promise<DevData | null> => {
    if (!username) return null;
    try {
      const fetchUrl = `/api/github/developer?username=${username}${forceRefresh ? '&force=true' : ''}`;
      const headers: Record<string, string> = {};
      if (githubToken) {
        headers['Authorization'] = `Bearer ${githubToken}`;
      }
      const res = await fetch(fetchUrl, { headers });
      if (!res.ok) throw new Error("Not found");
      const data = await res.json();
      return data;
    } catch (e) {
      console.error(e);
      return null;
    }
  };
  const handleCompare = async (u1: string, u2: string, forceRefresh = false) => {
    const q1 = u1.trim();
    const q2 = u2.trim();
    if (!q1 || !q2) return;
    
    setIsLoading(true);
    setError("");
    setSearch1(q1);
    setSearch2(q2);
    
    const [d1, d2] = await Promise.all([
      fetchDevData(q1, forceRefresh),
      fetchDevData(q2, forceRefresh)
    ]);
    
    if (d1 && d2) {
      setDev1(d1);
      setDev2(d2);
      saveRecent(d1.username, d2.username);
      
      // Update URL silently
      const params = new URLSearchParams(searchParams.toString());
      params.set('dev1', q1);
      params.set('dev2', q2);
      router.push(`?${params.toString()}`, { scroll: false });
    } else {
      setError("Could not fetch one or both users. Check if usernames are correct and GitHub API limits.");
    }
    setIsLoading(false);
  };

  const getWinner = () => {
    if (!dev1 || !dev2) return null;
    let s1 = 0; let s2 = 0;
    const keys = ["totalCommits", "totalPRs", "totalIssues", "totalStars", "followers", "repos"] as const;
    keys.forEach(k => {
      if (dev1.stats[k] > dev2.stats[k]) s1++;
      else if (dev2.stats[k] > dev1.stats[k]) s2++;
    });
    if (s1 > s2) return dev1;
    if (s2 > s1) return dev2;
    return null; // Tie
  };

  const winner = getWinner();
  const reviews1 = dev1?.stats.totalReviews ?? 0;
  const reviews2 = dev2?.stats.totalReviews ?? 0;
  const reviewLeader = reviews1 > reviews2 ? dev1 : reviews2 > reviews1 ? dev2 : null;

  const StatBar = ({ val1, val2, icon: Icon, label }: any) => {
    const total = val1 + val2;
    const pct1 = total > 0 ? (val1 / total) * 100 : 50;
    const pct2 = total > 0 ? (val2 / total) * 100 : 50;
    
    const w1 = val1 > val2;
    const w2 = val2 > val1;

    return (
      <div className="p-5 rounded-xl bg-white dark:bg-[#0a0a0a] border border-black/10 dark:border-[rgba(255,255,255,0.08)] hover:border-black/20 dark:hover:border-[rgba(255,255,255,0.14)] transition-all duration-200">
        <div className="flex items-center gap-2 mb-4">
          <Icon className="w-3.5 h-3.5 text-[#A1A1AA]" />
          <span className="text-xs text-[#A1A1AA] uppercase tracking-widest font-medium">{label}</span>
        </div>
        <div className="flex justify-between items-end mb-3">
          <div className="text-left">
            <span className={cn("text-2xl font-bold tracking-tight", w1 ? "text-emerald-600 dark:text-emerald-400" : "text-gray-900 dark:text-white")}>
              {val1.toLocaleString()}
            </span>
            {w1 && <span className="ml-2 text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-1.5 py-0.5 rounded uppercase tracking-wide">★</span>}
          </div>
          <div className="text-right">
            <span className={cn("text-2xl font-bold tracking-tight", w2 ? "text-emerald-600 dark:text-emerald-400" : "text-gray-900 dark:text-white")}>
              {val2.toLocaleString()}
            </span>
            {w2 && <span className="ml-2 text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-1.5 py-0.5 rounded uppercase tracking-wide">★</span>}
          </div>
        </div>
        <div className="w-full h-2 bg-gray-100 dark:bg-[#111] rounded-full overflow-hidden flex border border-black/5 dark:border-[rgba(255,255,255,0.04)]">
          <motion.div 
            initial={{ width: 0 }} 
            animate={{ width: `${pct1}%` }} 
            transition={{ duration: 1, ease: "easeOut" }}
            className={cn("h-full rounded-l-full", w1 ? "bg-emerald-500 dark:bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.4)]" : "bg-zinc-400 dark:bg-zinc-600")} 
          />
          <motion.div 
            initial={{ width: 0 }} 
            animate={{ width: `${pct2}%` }} 
            transition={{ duration: 1, ease: "easeOut" }}
            className={cn("h-full rounded-r-full", w2 ? "bg-emerald-500 dark:bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.4)]" : "bg-zinc-400 dark:bg-zinc-600")} 
          />
        </div>
      </div>
    );
  };

  const ProfileCard = ({ dev, isWinner }: { dev: DevData, isWinner: boolean }) => {
    const iconMap: Record<string, any> = {
      Tent, CalendarDays, Star, Moon, Sun, Sunset, Coffee
    };
    const PersonaIcon = dev.persona.icon || iconMap[dev.persona.iconName as string] || Star;
    return (
      <div className="p-6 rounded-xl bg-white dark:bg-[#0a0a0a] border border-black/10 dark:border-[rgba(255,255,255,0.08)]">
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-4">
            <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-black/10 dark:border-[rgba(255,255,255,0.12)]">
              <img alt={dev.name} className="w-full h-full object-cover" src={dev.avatar} />
            </div>
            {isWinner && (
              <motion.div 
                initial={{ scale: 0, rotate: -45 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", bounce: 0.5 }}
                className="absolute -top-2 -right-2 bg-amber-400 rounded-full p-1 shadow-[0_0_15px_rgba(251,191,36,0.6)] border-2 border-white dark:border-[#0a0a0a]"
              >
                <Crown className="w-4 h-4 text-white" />
              </motion.div>
            )}
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">{dev.name}</h3>
          
          {dev.globalRank && (
            <div className={cn("text-[10px] font-bold uppercase tracking-widest mb-3 px-2 py-0.5 rounded-full border bg-black/40 border-white/10 shadow-[0_0_10px_rgba(255,255,255,0.1)]", dev.globalRank.color)}>
              {dev.globalRank.title}
            </div>
          )}
          
          <div className={cn(
            "relative flex items-center gap-1.5 px-3 py-1 mb-4 rounded-full border bg-white/5 dark:bg-black/20 backdrop-blur-sm",
            dev.persona.type === 'emerald' ? "border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.4)]" :
            dev.persona.type === 'amber' ? "border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.4)]" :
            "border-zinc-500/30 shadow-[0_0_15px_rgba(161,161,170,0.4)]"
          )}>
            <div className={cn(
              "absolute inset-0 rounded-full opacity-20 blur-sm",
              dev.persona.type === 'emerald' ? "bg-gradient-to-r from-emerald-400 to-teal-500" :
              dev.persona.type === 'amber' ? "bg-gradient-to-r from-amber-400 to-orange-500" :
              "bg-gradient-to-r from-zinc-400 to-gray-600"
            )} />
            <PersonaIcon className={cn("w-3 h-3 z-10", 
              dev.persona.type === 'emerald' ? "text-emerald-400" :
              dev.persona.type === 'amber' ? "text-amber-400" :
              "text-zinc-400"
            )} />
            <span className={cn(
              "text-[10px] font-bold uppercase tracking-wider bg-clip-text text-transparent z-10",
              dev.persona.type === 'emerald' ? "bg-gradient-to-r from-emerald-400 to-teal-500" :
              dev.persona.type === 'amber' ? "bg-gradient-to-r from-amber-400 to-orange-500" :
              "bg-gradient-to-r from-zinc-400 to-gray-600"
            )}>
              {dev.persona.title}
            </span>
          </div>

          <p className="text-sm text-[#A1A1AA] mb-3">@{dev.username}</p>
          <p className="text-xs text-[#A1A1AA] leading-relaxed mb-4 max-w-[200px] line-clamp-2">
            {dev.bio}
          </p>

          <div className="flex gap-4 mb-4 text-[#A1A1AA] text-xs">
            <div className="flex items-center gap-1">
              <MapPin className="w-2.5 h-2.5" />
              <span>{dev.location}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="w-2.5 h-2.5" />
              <span>{dev.joinedAt}</span>
            </div>
          </div>

          <div className="w-full border border-black/10 dark:border-[rgba(255,255,255,0.06)] rounded-lg p-3 mb-4 bg-gray-100 dark:bg-[#111]">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[9px] font-medium text-[#A1A1AA] uppercase tracking-widest">Dev Score</span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">{dev.score}</span>
            </div>
            <div className="w-full h-1 bg-gray-300 dark:bg-[rgba(255,255,255,0.07)] rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${dev.score}%` }}
                transition={{ duration: 1.5, delay: 0.2 }}
                className="h-full bg-black dark:bg-white rounded-full" 
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 w-full">
            <div className="flex flex-col items-center py-2 px-1 rounded-lg bg-gray-100 dark:bg-[#111] border border-black/10 dark:border-[rgba(255,255,255,0.06)]">
              <GitBranch className="w-3 h-3 text-[#A1A1AA] mb-1" />
              <span className="text-sm font-semibold text-gray-900 dark:text-white">{dev.stats.repos}</span>
              <span className="text-[8px] text-[#A1A1AA] uppercase tracking-widest">Repos</span>
            </div>
            <div className="flex flex-col items-center py-2 px-1 rounded-lg bg-gray-100 dark:bg-[#111] border border-black/10 dark:border-[rgba(255,255,255,0.06)]">
              <Star className="w-3 h-3 text-[#A1A1AA] mb-1" />
              <span className="text-sm font-semibold text-gray-900 dark:text-white">{dev.stats.totalStars}</span>
              <span className="text-[8px] text-[#A1A1AA] uppercase tracking-widest">Stars</span>
            </div>
            <div className="flex flex-col items-center py-2 px-1 rounded-lg bg-gray-100 dark:bg-[#111] border border-black/10 dark:border-[rgba(255,255,255,0.06)]">
              <Users className="w-3 h-3 text-[#A1A1AA] mb-1" />
              <span className="text-sm font-semibold text-gray-900 dark:text-white">{dev.stats.followers}</span>
              <span className="text-[8px] text-[#A1A1AA] uppercase tracking-widest">Followers</span>
            </div>
            <div className="flex flex-col items-center py-2 px-1 rounded-lg bg-gray-100 dark:bg-[#111] border border-black/10 dark:border-[rgba(255,255,255,0.06)]">
              <Flame className="w-3 h-3 text-[#A1A1AA] mb-1" />
              <span className="text-sm font-semibold text-gray-900 dark:text-white">{dev.stats.streak}</span>
              <span className="text-[8px] text-[#A1A1AA] uppercase tracking-widest">Streak</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="pb-16 min-h-screen">
      <div className="mx-auto max-w-5xl">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-black/10 dark:border-[rgba(255,255,255,0.1)] bg-gray-100 dark:bg-[#111] mb-4">
            <Swords className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-xs font-medium text-[#A1A1AA] uppercase tracking-widest">Developer Showdown</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white tracking-tight mb-3">
            Compare Developers
          </h1>
          <p className="text-sm text-[#A1A1AA] max-w-md mx-auto">
            Put two GitHub profiles head-to-head. Streaks, contributions, languages — who comes out on top?
          </p>
        </div>

        <div className="mb-10">
          <div className="flex flex-col sm:flex-row items-stretch gap-3 max-w-2xl mx-auto">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#A1A1AA]" />
              <input
                placeholder="GitHub username #1"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-black/10 dark:border-[rgba(255,255,255,0.1)] bg-white dark:bg-[#0a0a0a] text-gray-900 dark:text-white text-sm placeholder:text-[#A1A1AA] focus:outline-none focus:border-emerald-500/50 transition-colors"
                type="text"
                value={search1}
                onChange={e => setSearch1(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCompare(search1, search2)}
              />
            </div>
            <div className="flex items-center justify-center">
              <span className="text-xs font-bold text-emerald-500 tracking-widest">VS</span>
            </div>
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#A1A1AA]" />
              <input
                placeholder="GitHub username #2"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-black/10 dark:border-[rgba(255,255,255,0.1)] bg-white dark:bg-[#0a0a0a] text-gray-900 dark:text-white text-sm placeholder:text-[#A1A1AA] focus:outline-none focus:border-emerald-500/50 transition-colors"
                type="text"
                value={search2}
                onChange={e => setSearch2(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCompare(search1, search2)}
              />
            </div>
            <button
              onClick={() => handleCompare(search1, search2, false)}
              disabled={isLoading || !search1 || !search2}
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-black dark:bg-white text-white dark:text-black text-sm font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Swords className="w-4 h-4 group-hover:rotate-12 transition-transform" />
              )}
              Compare
            </button>
            <button
              onClick={() => handleCompare(search1, search2, true)}
              disabled={isLoading || !search1 || !search2}
              title="Force Refresh Data"
              className="flex items-center justify-center px-4 py-3 rounded-xl border border-black/10 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/5 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
            </button>
          </div>
          
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }} 
              animate={{ opacity: 1, y: 0 }} 
              className="flex items-center gap-2 p-3 mt-4 text-sm text-red-600 bg-red-50 dark:bg-red-500/10 dark:text-red-400 rounded-xl border border-red-200 dark:border-red-500/20 max-w-2xl mx-auto"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <p>{error}</p>
              <button onClick={() => setError("")} className="ml-auto hover:opacity-70"><X className="w-4 h-4" /></button>
            </motion.div>
          )}

          <div className="max-w-2xl mx-auto mt-4 flex flex-col items-center">
            <button 
              onClick={() => setShowTokenInput(!showTokenInput)}
              className="text-xs text-[#A1A1AA] hover:text-white flex items-center gap-1.5 transition-colors"
            >
              <Key className="w-3.5 h-3.5" />
              {githubToken ? "GitHub Token Active (Click to change)" : "Rate Limited? Add GitHub Token"}
            </button>
            {showTokenInput && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="w-full max-w-sm mt-3 flex gap-2">
                <input
                  type="password"
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                  value={githubToken}
                  onChange={e => saveToken(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg border border-black/10 dark:border-[rgba(255,255,255,0.1)] bg-white dark:bg-[#0a0a0a] text-sm focus:outline-none focus:border-emerald-500/50"
                />
                <button onClick={() => setShowTokenInput(false)} className="px-4 py-2 rounded-lg bg-emerald-500/10 text-emerald-500 text-sm font-medium hover:bg-emerald-500/20">
                  Save
                </button>
              </motion.div>
            )}
          </div>
        </div>

        {recentComparisons.length > 0 && (
          <div className="max-w-2xl mx-auto mb-8">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-[#A1A1AA] uppercase tracking-wide">Recent Comparisions</span>
              <button onClick={clearRecent} className="text-xs text-red-500 hover:text-red-600 transition-colors">Clear All</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {recentComparisons.map(rc => (
                <div key={`${rc.u1}-${rc.u2}`} className="flex items-center gap-1 px-3 py-1 rounded-full border border-black/10 dark:border-white/10 bg-white dark:bg-[#0a0a0a]">
                  <button onClick={() => { setSearch1(rc.u1); setSearch2(rc.u2); handleCompare(rc.u1, rc.u2); }} className="text-xs text-gray-700 dark:text-gray-300 hover:text-emerald-500 transition-colors">
                    {rc.u1} vs {rc.u2}
                  </button>
                  <button onClick={() => removeRecent(rc.u1, rc.u2)} className="text-xs text-red-400 hover:text-red-600">×</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-8 relative z-10">
            {/* Profile Cards Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
              {[1, 2].map((i) => (
                <div key={i} className="p-6 rounded-xl bg-white dark:bg-[#0a0a0a] border border-black/10 dark:border-[rgba(255,255,255,0.08)]">
                  <div className="flex flex-col items-center text-center">
                    <SkeletonShimmer className="w-20 h-20 rounded-full mb-4" />
                    <SkeletonShimmer className="w-32 h-5 rounded-md mb-2" />
                    <SkeletonShimmer className="w-24 h-6 rounded-full mb-4" />
                    <SkeletonShimmer className="w-20 h-3 rounded-md mb-3" />
                    <SkeletonShimmer className="w-48 h-8 rounded-md mb-4" />
                    
                    <div className="flex gap-4 mb-4">
                      <SkeletonShimmer className="w-16 h-3 rounded-md" />
                      <SkeletonShimmer className="w-16 h-3 rounded-md" />
                    </div>
                    
                    <SkeletonShimmer className="w-full h-10 rounded-lg mb-4" />
                    
                    <div className="grid grid-cols-2 gap-2 w-full">
                       {[1,2,3,4].map(j => <SkeletonShimmer key={j} className="h-16 rounded-lg" />)}
                    </div>
                  </div>
                </div>
              ))}
              <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                <SkeletonShimmer className="w-12 h-12 rounded-full border-2 border-white dark:border-[#0a0a0a]" />
              </div>
            </div>

            {/* Stats Showdown Skeleton */}
            <div>
              <SkeletonShimmer className="h-4 w-32 mb-4 rounded" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1,2,3,4,5,6,7,8].map(i => (
                  <div key={i} className="p-5 rounded-xl bg-white dark:bg-[#0a0a0a] border border-black/10 dark:border-[rgba(255,255,255,0.08)]">
                    <SkeletonShimmer className="w-24 h-3 rounded mb-4" />
                    <div className="flex justify-between items-end mb-3">
                      <SkeletonShimmer className="w-10 h-6 rounded" />
                      <SkeletonShimmer className="w-10 h-6 rounded" />
                    </div>
                    <SkeletonShimmer className="w-full h-2 rounded-full" />
                  </div>
                ))}
              </div>
            </div>
            
            {/* Languages & Habits Skeleton */}
            <div>
              <SkeletonShimmer className="h-4 w-40 mb-4 rounded" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
                {[1,2].map(i => (
                   <div key={i} className="flex flex-col gap-4">
                      <SkeletonShimmer className="h-[140px] rounded-2xl" />
                      <div className="p-5 h-[160px] rounded-2xl bg-white dark:bg-[#0a0a0a] border border-black/10 dark:border-[rgba(255,255,255,0.08)]">
                         <SkeletonShimmer className="w-32 h-3 rounded mx-auto mb-6" />
                         <div className="space-y-4">
                           <SkeletonShimmer className="w-full h-2 rounded-full" />
                           <SkeletonShimmer className="w-3/4 h-2 rounded-full" />
                           <SkeletonShimmer className="w-1/2 h-2 rounded-full" />
                         </div>
                      </div>
                   </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          dev1 && dev2 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 relative">
              <div className="absolute top-0 right-0 opacity-10 pointer-events-none overflow-hidden w-full h-full z-0 flex items-center justify-center">
                <Swords className="w-[400px] h-[400px] text-emerald-500 blur-3xl" />
              </div>
              
              <div className="relative z-10 space-y-8">
                {winner && (
                  <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/10 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Trophy className="w-4.5 h-4.5 text-emerald-500" />
                      <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                        @{winner.username} wins the showdown!
                      </span>
                    </div>
                  </motion.div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
                  <ProfileCard dev={dev1} isWinner={winner?.id === dev1.id} />
                  <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                    <div className="w-12 h-12 rounded-full bg-white dark:bg-[#0a0a0a] border-2 border-emerald-500/30 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                      <span className="text-xs font-bold text-emerald-500 tracking-wider">VS</span>
                    </div>
                  </div>
                  <ProfileCard dev={dev2} isWinner={winner?.id === dev2.id} />
                </div>

                <div>
                  <h2 className="text-xs text-[#A1A1AA] uppercase tracking-widest font-medium mb-4">Stats Showdown</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <StatBar val1={dev1.stats.streak} val2={dev2.stats.streak} label="Current Streak" icon={Flame} />
                    <StatBar val1={dev1.stats.peakStreak} val2={dev2.stats.peakStreak} label="Peak Streak" icon={TrendingUp} />
                    <StatBar val1={dev1.stats.totalCommits} val2={dev2.stats.totalCommits} label="Total Contributions" icon={GitCommitHorizontal} />
                    <StatBar val1={dev1.stats.repos} val2={dev2.stats.repos} label="Repositories" icon={GitBranch} />
                    <StatBar val1={dev1.stats.totalStars} val2={dev2.stats.totalStars} label="Stars" icon={Star} />
                    <StatBar val1={dev1.stats.followers} val2={dev2.stats.followers} label="Followers" icon={Users} />
                    <StatBar val1={dev1.stats.totalPRs} val2={dev2.stats.totalPRs} label="Pull Requests" icon={GitPullRequest} />
                    <StatBar val1={dev1.stats.totalIssues} val2={dev2.stats.totalIssues} label="Issues" icon={CircleDot} />
                  </div>
                </div>

                <div>
                  <h2 className="text-xs text-[#A1A1AA] uppercase tracking-widest font-medium mb-4 flex items-center gap-2"><Code2 className="w-3.5 h-3.5 text-blue-400" />Top Languages & Habits</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
                    
                    {[dev1, dev2].map((dev, idx) => {
                      const IconComp = dev.habit.iconName === 'Moon' ? Moon : dev.habit.iconName === 'Sun' ? Sun : dev.habit.iconName === 'Sunset' ? Sunset : Coffee;
                      return (
                        <div key={idx} className="flex flex-col gap-4 relative z-10">
                          {/* Habit Card */}
                          <div className="relative overflow-hidden p-6 rounded-2xl border bg-gradient-to-br from-teal-900/40 to-emerald-900/40 border-teal-500/30 shadow-[0_0_15px_rgba(20,184,166,0.15)] transition-all duration-300 flex flex-col items-center justify-center text-center h-[140px]">
                            <div className="mb-2 z-10"><IconComp className="w-6 h-6 text-teal-400" /></div>
                            <h4 className="text-[10px] font-bold uppercase tracking-widest text-white/70 mb-1 z-10">@{dev.username}</h4>
                            <h3 className="text-xl font-black tracking-tight text-white z-10">{dev.habit.title}</h3>
                          </div>
                          
                          {/* Languages Card */}
                          <div className="p-5 rounded-2xl bg-white dark:bg-[#0a0a0a] border border-black/10 dark:border-[rgba(255,255,255,0.08)] flex-1">
                            <h4 className="text-xs font-bold uppercase tracking-widest text-[#A1A1AA] mb-4 text-center">Top Languages</h4>
                            {dev.topLanguages.length > 0 ? (
                              <div className="space-y-3">
                                {dev.topLanguages.map((lang, i) => {
                                  const total = dev.topLanguages.reduce((a, b) => a + b.count, 0);
                                  const pct = Math.round((lang.count / total) * 100);
                                  return (
                                    <div key={lang.name}>
                                      <div className="flex justify-between items-center mb-1 text-xs">
                                        <span className="font-semibold text-gray-900 dark:text-white">{lang.name}</span>
                                        <span className="text-[#A1A1AA]">{pct}%</span>
                                      </div>
                                      <div className="w-full h-1.5 bg-gray-100 dark:bg-[#111] rounded-full overflow-hidden">
                                        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} className="h-full bg-blue-500 rounded-full" />
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            ) : (
                              <div className="text-center text-sm text-[#A1A1AA] mt-4">No languages found</div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                    
                    <div className="hidden md:flex absolute left-1/2 top-[70px] -translate-x-1/2 -translate-y-1/2 z-20">
                      <div className="w-8 h-8 rounded-full bg-white dark:bg-[#0a0a0a] border-2 border-black/10 dark:border-[rgba(255,255,255,0.08)] flex items-center justify-center shadow-xl">
                        <span className="text-[10px] font-bold text-[#A1A1AA] tracking-wider">VS</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h2 className="text-xs text-[#A1A1AA] uppercase tracking-widest font-medium mb-4 flex items-center gap-2">
                    <CodeXml className="w-3.5 h-3.5 text-violet-400" />Code Volume
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[dev1, dev2].map((dev, idx) => {
                      const maxAdded = Math.max(dev1.stats.linesAdded, dev2.stats.linesAdded, 1);
                      const maxDeleted = Math.max(dev1.stats.linesDeleted, dev2.stats.linesDeleted, 1);
                      const addedPct = Math.round((dev.stats.linesAdded / maxAdded) * 100);
                      const deletedPct = Math.round((dev.stats.linesDeleted / maxDeleted) * 100);

                      return (
                        <div key={idx} className="relative overflow-hidden p-6 rounded-2xl bg-white dark:bg-[#0a0a0a] border border-black/10 dark:border-[rgba(255,255,255,0.08)] transition-all duration-300">
                          <h4 className="text-xs font-bold uppercase tracking-widest text-[#A1A1AA] mb-5">@{dev.username}</h4>
                          
                          <div className="mb-4">
                            <div className="flex justify-between items-center mb-2">
                              <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-500"><Plus className="w-3 h-3" /> Lines Added</span>
                              <span className="text-sm font-bold text-emerald-500">+{dev.stats.linesAdded.toLocaleString()}</span>
                            </div>
                            <div className="w-full h-3 bg-gray-100 dark:bg-[#111] rounded-full overflow-hidden border border-black/5 dark:border-[rgba(255,255,255,0.04)]">
                              <motion.div initial={{ width: 0 }} animate={{ width: `${addedPct}%` }} transition={{ duration: 1.5, ease: "easeOut" }} className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.3)]" />
                            </div>
                          </div>

                          <div className="mb-5">
                            <div className="flex justify-between items-center mb-2">
                              <span className="flex items-center gap-1.5 text-xs font-medium text-rose-500"><Minus className="w-3 h-3" /> Lines Deleted</span>
                              <span className="text-sm font-bold text-rose-500">-{dev.stats.linesDeleted.toLocaleString()}</span>
                            </div>
                            <div className="w-full h-3 bg-gray-100 dark:bg-[#111] rounded-full overflow-hidden border border-black/5 dark:border-[rgba(255,255,255,0.04)]">
                              <motion.div initial={{ width: 0 }} animate={{ width: `${deletedPct}%` }} transition={{ duration: 1.5, ease: "easeOut" }} className="h-full rounded-full bg-gradient-to-r from-rose-500 to-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.3)]" />
                            </div>
                          </div>

                          <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-[#111] border border-black/5 dark:border-[rgba(255,255,255,0.06)]">
                            <span className="text-[9px] font-medium text-[#A1A1AA] uppercase tracking-widest">Net Impact</span>
                            <span className="text-lg font-black tracking-tight text-emerald-500">+{Math.max(0, dev.stats.linesAdded - dev.stats.linesDeleted).toLocaleString()}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <h2 className="text-xs text-[#A1A1AA] uppercase tracking-widest font-medium mb-4 flex items-center gap-2">
                    <Trophy className="w-3.5 h-3.5 text-amber-400" />Developer Skills Radar
                  </h2>
                  <div className="p-6 rounded-xl bg-white dark:bg-[#0a0a0a] border border-black/10 dark:border-[rgba(255,255,255,0.08)] text-[#A1A1AA] dark:text-white/35">
                    <div className="flex justify-center gap-6 mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#8B5CF6' }} />
                        <span className="text-xs text-[#A1A1AA] font-medium">@{dev1.username}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#06B6D4' }} />
                        <span className="text-xs text-[#A1A1AA] font-medium">@{dev2.username}</span>
                      </div>
                    </div>
                    <div className="h-[380px]">
                      <RadarCompareChart 
                        hideTitle 
                        hideBackground
                        hideLegend
                        developers={[
                          {
                            name: dev1.username,
                            values: [dev1.stats.totalCommits, dev1.stats.totalPRs, dev1.stats.totalIssues, reviews1, dev1.stats.totalStars, dev1.stats.streak],
                            color: { line: '#8b5cf6', area: 'rgba(139, 92, 246, 0.2)' }
                          },
                          {
                            name: dev2.username,
                            values: [dev2.stats.totalCommits, dev2.stats.totalPRs, dev2.stats.totalIssues, reviews2, dev2.stats.totalStars, dev2.stats.streak],
                            color: { line: '#06b6d4', area: 'rgba(6, 182, 212, 0.2)' }
                          }
                        ]}
                      />
                    </div>
                    <p className="text-center text-xs">
                      Code Reviews: @{dev1.username} {reviews1.toLocaleString()} · @{dev2.username} {reviews2.toLocaleString()}
                      <span className="block font-medium text-foreground">
                        {reviewLeader ? `@${reviewLeader.username} leads in code reviews` : "Code reviews tied"}
                      </span>
                    </p>
                  </div>
                </div>

                {/* Tech Stack Radar */}
                {(() => {
                  const allFw = new Set([...Object.keys(dev1.frameworks||{}), ...Object.keys(dev2.frameworks||{})]);
                  const sortedFw = Array.from(allFw).sort((a, b) => 
                    ((dev2.frameworks[b]||0) + (dev1.frameworks[b]||0)) - ((dev2.frameworks[a]||0) + (dev1.frameworks[a]||0))
                  ).slice(0, 6);
                  
                  if (sortedFw.length >= 3) {
                    const maxFwVal = Math.max(...sortedFw.map(fw => Math.max(dev1.frameworks[fw]||0, dev2.frameworks[fw]||0)));
                    const indicators = sortedFw.map(fw => ({ name: fw.toUpperCase(), max: Math.max(2, Math.ceil(maxFwVal * 1.2)) }));
                    
                    return (
                      <div>
                        <h2 className="text-xs text-[#A1A1AA] uppercase tracking-widest font-medium mb-4 flex items-center gap-2">
                          <Code2 className="w-3.5 h-3.5 text-blue-400" />Tech Stack Radar
                        </h2>
                        <div className="p-6 rounded-xl bg-white dark:bg-[#0a0a0a] border border-black/10 dark:border-[rgba(255,255,255,0.08)] text-[#A1A1AA] dark:text-white/35">
                          <div className="flex justify-center gap-6 mb-4">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#8B5CF6' }} />
                              <span className="text-xs text-[#A1A1AA] font-medium">@{dev1.username}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#06B6D4' }} />
                              <span className="text-xs text-[#A1A1AA] font-medium">@{dev2.username}</span>
                            </div>
                          </div>
                          <div className="h-[380px]">
                            <RadarCompareChart 
                              hideTitle 
                              hideBackground
                              hideLegend
                              indicators={indicators}
                              developers={[
                                {
                                  name: dev1.username,
                                  values: sortedFw.map(fw => dev1.frameworks[fw] || 0),
                                  color: { line: '#8b5cf6', area: 'rgba(139, 92, 246, 0.2)' }
                                },
                                {
                                  name: dev2.username,
                                  values: sortedFw.map(fw => dev2.frameworks[fw] || 0),
                                  color: { line: '#06b6d4', area: 'rgba(6, 182, 212, 0.2)' }
                                }
                              ]}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}

              </div>
            </motion.div>
          )
        )}
      </div>
    </div>
  );
}

export default function ComparePage() {
  return (
    <Suspense fallback={
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    }>
      <CompareDashboard />
    </Suspense>
  );
}
