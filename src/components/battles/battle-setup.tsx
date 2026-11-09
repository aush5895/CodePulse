"use client";

import { useState, useEffect, useId } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Search, ChevronDown, Wand2, Swords, Sparkles, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface BattleSetupProps {
  onStart: (p1: string, p2: string, battleType: string) => void;
  initialPlayer1?: string;
  initialPlayer2?: string;
}

const BATTLE_TYPES = [
  { id: "Overall Battle", icon: Swords, color: "text-blue-500" },
  { id: "Repository Battle", icon: Zap, color: "text-yellow-500" },
  { id: "Activity Battle", icon: Sparkles, color: "text-green-500" },
  { id: "Language Battle", icon: Wand2, color: "text-purple-500" },
  { id: "Open Source Impact", icon: Zap, color: "text-pink-500" },
  { id: "AI Battle", icon: Sparkles, color: "text-cyan-500" },
];

const GITHUB_USERNAME = /^(?=.{1,39}$)[a-z0-9]+(?:-[a-z0-9]+)*$/i;

export function BattleSetup({
  onStart,
  initialPlayer1 = "",
  initialPlayer2 = "",
}: BattleSetupProps) {
  const [player1, setPlayer1] = useState(initialPlayer1);
  const [player2, setPlayer2] = useState(initialPlayer2);
  const [battleType, setBattleType] = useState(BATTLE_TYPES[0]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  // Update state when initial props change
  useEffect(() => {
    if (initialPlayer1) setPlayer1(initialPlayer1);
  }, [initialPlayer1]);

  useEffect(() => {
    if (initialPlayer2) setPlayer2(initialPlayer2);
  }, [initialPlayer2]);
  
  // focused states for some extra glow
  const [focusedInput, setFocusedInput] = useState<1 | 2 | null>(null);

  const challengerId = useId();
  const opponentId = useId();
  const validPlayer1 = GITHUB_USERNAME.test(player1.trim());
  const validPlayer2 = GITHUB_USERNAME.test(player2.trim());
  const canStart = validPlayer1 && validPlayer2;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (canStart) {
      onStart(player1.trim(), player2.trim(), battleType.id);
    }
  };

  const handleRandom = () => {
    const randomDevs = ["torvalds", "gaearon", "yyx990803", "sindresorhus", "tj", "getify"];
    const p1 = randomDevs[Math.floor(Math.random() * randomDevs.length)];
    let p2 = randomDevs[Math.floor(Math.random() * randomDevs.length)];
    while (p2 === p1) {
      p2 = randomDevs[Math.floor(Math.random() * randomDevs.length)];
    }
    setPlayer1(p1);
    setPlayer2(p2);
  };

  return (
    <div className="w-full max-w-5xl mx-auto mt-12 relative z-10">
      {/* Background Decorative elements */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-primary/20 blur-[120px] rounded-full pointer-events-none -z-10 opacity-50 dark:opacity-30 mix-blend-screen" />
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-purple-500/20 blur-[100px] rounded-full pointer-events-none -z-10 opacity-50 dark:opacity-30 mix-blend-screen" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-pink-500/20 blur-[100px] rounded-full pointer-events-none -z-10 opacity-50 dark:opacity-30 mix-blend-screen" />

      <div className="text-center mb-16 relative">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary mb-6 border border-primary/20"
        >
          <Sparkles className="w-4 h-4" />
          <span className="text-sm font-semibold tracking-wide uppercase">The Ultimate Face-Off</span>
        </motion.div>
        
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
          className="text-5xl md:text-7xl font-black tracking-tighter mb-4"
        >
          Developer <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500">Battles</span>
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
          className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto"
        >
          Challenge any developer on GitHub to a data-driven battle. Compare stats, contributions, and open-source impact.
        </motion.p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.3, type: "spring", bounce: 0.4 }}
        className="relative group/card"
      >
        {/* Glow behind card */}
        <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-[2rem] blur-md opacity-25 group-hover/card:opacity-40 transition duration-1000 group-hover/card:duration-200" />
        
        <div className="relative bg-background/80 dark:bg-zinc-950/80 backdrop-blur-2xl border border-white/10 dark:border-white/5 rounded-[2rem] p-8 md:p-12 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-12">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-8 items-center relative z-20">
              
              {/* Player 1 Input */}
              <div className="space-y-3">
                <label htmlFor={challengerId} className="flex items-center gap-2 text-sm font-bold text-blue-500 uppercase tracking-widest ml-1">
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  Challenger
                </label>
                <div className="relative group">
                  <div className={cn(
                    "absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl blur opacity-0 transition duration-500",
                    focusedInput === 1 && "opacity-30"
                  )} />
                  <div className="relative flex items-center bg-background/90 dark:bg-zinc-900/90 border-2 border-border/50 rounded-2xl overflow-hidden focus-within:border-blue-500/50 transition-colors">
                    <div className="pl-5 pr-2 flex items-center justify-center">
                      <Search className={cn("w-5 h-5 text-muted-foreground transition-colors", focusedInput === 1 && "text-blue-500")} />
                    </div>
                    <input
                      type="text"
                      id={challengerId}
                      value={player1}
                      onFocus={() => setFocusedInput(1)}
                      onBlur={() => setFocusedInput(null)}
                      onChange={(e) => setPlayer1(e.target.value)}
                      placeholder="GitHub Username"
                      className="w-full py-5 pl-2 pr-5 text-lg md:text-xl font-medium bg-transparent focus:outline-none transition-all placeholder:text-muted-foreground/40"
                      required
                    />
                    {validPlayer1 && (
                      <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        <img 
                          src={`https://github.com/${player1.trim()}.png?size=60`}
                          alt={player1}
                          className="w-8 h-8 rounded-full border-2 border-blue-500/50 shadow-lg object-cover bg-muted"
                          onError={(e) => (e.currentTarget.style.display = 'none')}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* VS Badge */}
              <div className="hidden md:flex flex-col items-center justify-center relative mt-8">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-500 blur-xl opacity-30 rounded-full animate-pulse" />
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-background to-muted border border-white/10 flex items-center justify-center relative shadow-[0_0_30px_-5px_rgba(168,85,247,0.4)] z-10">
                  <span className="font-black text-xl bg-clip-text text-transparent bg-gradient-to-br from-purple-400 to-pink-600 italic">
                    VS
                  </span>
                </div>
              </div>

              {/* Player 2 Input */}
              <div className="space-y-3">
                <label htmlFor={opponentId} className="flex items-center justify-end gap-2 text-sm font-bold text-pink-500 uppercase tracking-widest mr-1">
                  Opponent
                  <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse" />
                </label>
                <div className="relative group">
                  <div className={cn(
                    "absolute -inset-0.5 bg-gradient-to-r from-pink-500 to-rose-500 rounded-2xl blur opacity-0 transition duration-500",
                    focusedInput === 2 && "opacity-30"
                  )} />
                  <div className="relative flex items-center bg-background/90 dark:bg-zinc-900/90 border-2 border-border/50 rounded-2xl overflow-hidden focus-within:border-pink-500/50 transition-colors">
                    <div className="pl-5 pr-2 flex items-center justify-center">
                      <Search className={cn("w-5 h-5 text-muted-foreground transition-colors", focusedInput === 2 && "text-pink-500")} />
                    </div>
                    <input
                      type="text"
                      id={opponentId}
                      value={player2}
                      onFocus={() => setFocusedInput(2)}
                      onBlur={() => setFocusedInput(null)}
                      onChange={(e) => setPlayer2(e.target.value)}
                      placeholder="GitHub Username"
                      className="w-full py-5 pl-2 pr-5 text-lg md:text-xl font-medium bg-transparent focus:outline-none transition-all placeholder:text-muted-foreground/40 text-left"
                      required
                    />
                    {validPlayer2 && (
                      <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        <img 
                          src={`https://github.com/${player2.trim()}.png?size=60`}
                          alt={player2}
                          className="w-8 h-8 rounded-full border-2 border-pink-500/50 shadow-lg object-cover bg-muted"
                          onError={(e) => (e.currentTarget.style.display = 'none')}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 pt-8 border-t border-white/10 relative z-20">
              
              {/* Battle Type Dropdown */}
              <div className="relative w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="w-full sm:w-72 flex items-center justify-between bg-background/50 dark:bg-zinc-900/50 border border-border/50 hover:border-border rounded-xl px-5 py-4 text-base font-medium transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <battleType.icon className={cn("w-5 h-5", battleType.color)} />
                    <span>{battleType.id}</span>
                  </div>
                  <ChevronDown className={cn("w-4 h-4 opacity-50 transition-transform duration-300", isDropdownOpen && "rotate-180")} />
                </button>
                
                <AnimatePresence>
                  {isDropdownOpen && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="absolute top-full left-0 w-full mt-2 bg-popover/95 backdrop-blur-xl border border-border/50 rounded-xl shadow-2xl overflow-hidden z-50"
                    >
                      {BATTLE_TYPES.map((type) => (
                        <button
                          key={type.id}
                          type="button"
                          onClick={() => {
                            setBattleType(type);
                            setIsDropdownOpen(false);
                          }}
                          className={cn(
                            "w-full flex items-center gap-3 px-5 py-4 text-left text-sm hover:bg-accent/50 transition-colors",
                            battleType.id === type.id && "bg-accent/30"
                          )}
                        >
                          <type.icon className={cn("w-4 h-4", type.color)} />
                          {type.id}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex-1" />

              <div className="flex w-full sm:w-auto gap-4">
                <button
                  type="button"
                  onClick={handleRandom}
                  aria-label="Pick random developers"
                  className="flex-1 sm:flex-none px-6 py-4 rounded-xl font-semibold text-sm border border-border/50 bg-background/50 hover:bg-accent/50 hover:border-border transition-all flex items-center justify-center gap-2 group focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                >
                  <Wand2 className="w-4 h-4 text-purple-500 group-hover:rotate-12 transition-transform" aria-hidden="true" />
                  Random
                </button>

                <button
                  type="submit"
                  disabled={!canStart}
                  aria-label="Start battle between developers"
                  className={cn(
                    "flex-[2] sm:flex-none relative group overflow-hidden px-8 py-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-primary/50",
                    !canStart
                      ? "bg-muted text-muted-foreground cursor-not-allowed"
                      : "text-white shadow-xl hover:shadow-primary/25 active:scale-[0.98]"
                  )}
                >
                  {canStart && (
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 group-hover:scale-105 transition-transform duration-500" />
                  )}
                  {!canStart ? (
                    <div className="absolute inset-0 bg-muted" />
                  ) : null}
                  <span className="relative z-10 flex items-center gap-2">
                    <Swords className={cn("w-4 h-4", canStart && "animate-bounce")} aria-hidden="true" />
                    Start Battle
                  </span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
