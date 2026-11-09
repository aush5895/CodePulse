import type { ComponentProps } from "react";
import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BattleRounds } from "./battle-rounds";

vi.mock("@/components/animations/animated-counter", () => ({
  AnimatedCounter: ({ value }: { value: number }) => <>{value}</>,
}));

type Player = ComponentProps<typeof BattleRounds>["player1"];

const alice: Player = {
  username: "alice",
  name: "Alice",
  avatar: "",
  joinedAt: "Jan 2020",
  score: 0,
  frameworks: {},
  topLanguages: [],
  stats: { totalCommits: 30, totalPRs: 2, totalIssues: 1, totalStars: 40, followers: 0, streak: 1, repos: 2 },
};
const bob: Player = {
  ...alice,
  username: "bob",
  name: "Bob",
  stats: { ...alice.stats, totalCommits: 10, totalPRs: 3, totalIssues: 1, streak: 2 },
};

afterEach(() => vi.useRealTimers());

describe("BattleRounds", () => {
  it("awards the activity round to the player who wins more metrics", () => {
    render(<BattleRounds player1={alice} player2={bob} battleType="Activity Battle" onComplete={vi.fn()} />);
    expect(screen.getByText("30")).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText("Bob wins round!")).toBeInTheDocument();
  });

  it("shows a draw for equal metrics and initials for missing avatars", () => {
    render(<BattleRounds player1={alice} player2={bob} battleType="Repository Battle" onComplete={vi.fn()} />);
    expect(screen.getByText("Round Tied!")).toBeInTheDocument();
    expect(screen.getByText("AL")).toBeInTheDocument();
    expect(screen.getByText("BO")).toBeInTheDocument();
  });

  it("calls onComplete once, after both repository rounds and the completion pause", () => {
    vi.useFakeTimers();
    const onComplete = vi.fn();
    render(<BattleRounds player1={alice} player2={bob} battleType="Repository Battle" onComplete={onComplete} />);

    act(() => vi.advanceTimersByTime(4000));
    expect(onComplete).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(4000));
    expect(onComplete).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1000));
    expect(onComplete).toHaveBeenCalledTimes(1);
    act(() => vi.advanceTimersByTime(10000));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});
