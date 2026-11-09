"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { AnimatedCounter } from "@/components/animations/animated-counter";
import { CheckCircle2, User, BookOpen, Activity, Code, Award } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface DevData {
  username: string;
  name: string;
  avatar: string;
  score: number;
  joinedAt: string;
  topLanguages: { name: string; count: number }[];
  frameworks: Record<string, number>;
  stats: {
    totalCommits: number;
    totalPRs: number;
    totalIssues: number;
    totalStars: number;
    followers: number;
    streak: number;
    repos: number;
  };
}

interface BattleRoundsProps {
  player1: DevData;
  player2: DevData;
  battleType: string;
  onComplete: () => void;
}

const ALL_ROUNDS = [
  { id: "profile", title: "Profile Battle", icon: User },
  { id: "repository", title: "Repository Battle", icon: BookOpen },
  { id: "activity", title: "Activity Battle", icon: Activity },
  { id: "language", title: "Language Battle", icon: Code },
  { id: "quality", title: "Repository Quality", icon: Award },
];

export function BattleRounds({ player1, player2, battleType, onComplete }: BattleRoundsProps) {
  const [currentRoundIndex, setCurrentRoundIndex] = useState(0);

  // Filter rounds based on battleType
  const ROUNDS = (() => {
    if (battleType === "Repository Battle") return ALL_ROUNDS.filter(r => r.id === "repository" || r.id === "quality");
    if (battleType === "Activity Battle") return ALL_ROUNDS.filter(r => r.id === "activity");
    if (battleType === "Language Battle") return ALL_ROUNDS.filter(r => r.id === "language");
    if (battleType === "Open Source Impact") return ALL_ROUNDS.filter(r => r.id === "repository" || r.id === "activity");
    return ALL_ROUNDS; // "Overall Battle" and "AI Battle" return all rounds
  })();

  useEffect(() => {
    if (currentRoundIndex < ROUNDS.length) {
      const timer = setTimeout(() => {
        setCurrentRoundIndex(currentRoundIndex + 1);
      }, 4000); // Each round displays for 4 seconds
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => {
        onComplete();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [currentRoundIndex, onComplete]);

  const activeRound = ROUNDS[currentRoundIndex];

  return (
    <div className="w-full max-w-5xl mx-auto mt-8 flex flex-col md:flex-row gap-8">
      {/* Sidebar Timeline */}
      <div className="w-full md:w-64 shrink-0 bg-card/50 backdrop-blur-xl border border-border rounded-2xl p-6 h-fit">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-6">Live Progress</h3>
        <div className="space-y-6">
          {ROUNDS.map((round, index) => {
            const isCompleted = index < currentRoundIndex;
            const isActive = index === currentRoundIndex;
            const Icon = round.icon;
            
            return (
              <div key={round.id} className="flex items-center gap-4 relative">
                {index !== ROUNDS.length - 1 && (
                  <div className={cn(
                    "absolute left-4 top-10 bottom-[-24px] w-0.5",
                    isCompleted ? "bg-primary" : "bg-border"
                  )} />
                )}
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 transition-colors z-10",
                  isCompleted ? "bg-primary border-primary text-primary-foreground" :
                  isActive ? "bg-background border-primary text-primary animate-pulse" :
                  "bg-background border-border text-muted-foreground"
                )}>
                  {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-4 h-4" />}
                </div>
                <div className={cn(
                  "font-medium transition-colors",
                  isCompleted || isActive ? "text-foreground" : "text-muted-foreground"
                )}>
                  {round.title}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Arena */}
      <div className="flex-1 bg-card/50 backdrop-blur-xl border border-border rounded-2xl overflow-hidden relative min-h-[500px] flex items-center justify-center p-8">
        <AnimatePresence mode="wait">
          {activeRound ? (
            <RoundDisplay 
              key={activeRound.id} 
              round={activeRound} 
              p1={player1} 
              p2={player2} 
            />
          ) : (
            <motion.div
              key="complete"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-3xl font-bold">Battle Completed</h2>
              <p className="text-muted-foreground mt-2">Generating AI Analysis & Results...</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function RoundDisplay({ round, p1, p2 }: { round: any, p1: DevData, p2: DevData }) {
  // Deterministic mocking for missing fields based on actual stats
  const getMetrics = () => {
    switch (round.id) {
      case "profile":
        return [
          { label: "Followers", v1: p1.stats.followers, v2: p2.stats.followers },
          { label: "Public Repos", v1: p1.stats.repos, v2: p2.stats.repos },
          { label: "Account Age (yr)", v1: 2026 - parseInt(p1.joinedAt.slice(-4)), v2: 2026 - parseInt(p2.joinedAt.slice(-4)) },
        ];
      case "repository":
        return [
          { label: "Total Stars", v1: p1.stats.totalStars, v2: p2.stats.totalStars },
        ];
      case "activity":
        return [
          { label: "Total Commits", v1: p1.stats.totalCommits, v2: p2.stats.totalCommits },
          { label: "Current Streak", v1: p1.stats.streak, v2: p2.stats.streak },
          { label: "Pull Requests", v1: p1.stats.totalPRs, v2: p2.stats.totalPRs },
          { label: "Issues", v1: p1.stats.totalIssues, v2: p2.stats.totalIssues },
        ];
      case "language":
        return [
          { label: "Unique Languages", v1: p1.topLanguages.length, v2: p2.topLanguages.length },
          { label: "Top Language Repos", v1: p1.topLanguages[0]?.count || 0, v2: p2.topLanguages[0]?.count || 0 },
          { label: "Frameworks Used", v1: Object.keys(p1.frameworks || {}).length, v2: Object.keys(p2.frameworks || {}).length },
        ];
      case "quality":
        return [
          { label: "Stars Per Repo", v1: p1.stats.repos ? parseFloat((p1.stats.totalStars / p1.stats.repos).toFixed(1)) : 0, v2: p2.stats.repos ? parseFloat((p2.stats.totalStars / p2.stats.repos).toFixed(1)) : 0 },
          { label: "Commits Per PR", v1: p1.stats.totalPRs ? parseFloat((p1.stats.totalCommits / p1.stats.totalPRs).toFixed(1)) : 0, v2: p2.stats.totalPRs ? parseFloat((p2.stats.totalCommits / p2.stats.totalPRs).toFixed(1)) : 0 },
        ];
      default:
        return [];
    }
  };

  const metrics = getMetrics();
  
  // Calculate round winner
  let p1RoundScore = 0;
  let p2RoundScore = 0;
  metrics.forEach(m => {
    if (m.v1 > m.v2) p1RoundScore++;
    else if (m.v2 > m.v1) p2RoundScore++;
  });
  
  const winner = p1RoundScore > p2RoundScore ? p1.name : p2RoundScore > p1RoundScore ? p2.name : "Tie";

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="w-full"
    >
      <div className="text-center mb-8">
        <round.icon className="w-8 h-8 text-primary mx-auto mb-3" />
        <h2 className="text-2xl font-bold">{round.title}</h2>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] gap-4 mb-8 text-center items-end">
        <div>
          <Avatar className="mx-auto mb-2 size-12 border-2 border-border" aria-hidden="true">
            {p1.avatar && <AvatarImage src={p1.avatar} alt="" />}
            <AvatarFallback>{p1.username.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="font-semibold">{p1.name}</div>
        </div>
        <div className="text-xl font-black text-muted-foreground pb-4">VS</div>
        <div>
          <Avatar className="mx-auto mb-2 size-12 border-2 border-border" aria-hidden="true">
            {p2.avatar && <AvatarImage src={p2.avatar} alt="" />}
            <AvatarFallback>{p2.username.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="font-semibold">{p2.name}</div>
        </div>
      </div>

      <div className="space-y-4">
        {metrics.map((m, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.3 }}
            className="flex items-center justify-between bg-background/50 rounded-lg p-4"
          >
            <div className={cn("text-lg font-bold w-24 text-right", m.v1 >= m.v2 ? "text-primary" : "text-muted-foreground")}>
              <AnimatedCounter value={m.v1} />
            </div>
            <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{m.label}</div>
            <div className={cn("text-lg font-bold w-24 text-left", m.v2 >= m.v1 ? "text-primary" : "text-muted-foreground")}>
              <AnimatedCounter value={m.v2} />
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: metrics.length * 0.3 + 0.5 }}
        className="mt-8 text-center"
      >
        <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-bold">
          {winner === "Tie" ? "Round Tied!" : `${winner} wins round!`}
        </span>
      </motion.div>
    </motion.div>
  );
}
