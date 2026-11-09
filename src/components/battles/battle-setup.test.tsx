import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BattleSetup } from "./battle-setup";

afterEach(() => vi.restoreAllMocks());

describe("BattleSetup", () => {
  it("disables Start Battle until both usernames are valid", () => {
    const onStart = vi.fn();
    render(<BattleSetup onStart={onStart} />);
    const challenger = screen.getByRole("textbox", { name: "Challenger" });
    const opponent = screen.getByRole("textbox", { name: "Opponent" });
    const start = screen.getByRole("button", { name: /start battle/i });

    expect(start).toBeDisabled();
    fireEvent.change(challenger, { target: { value: " octo-cat " } });
    for (const value of ["   ", "not a username", "-octocat", "octo--cat", "a".repeat(40)]) {
      fireEvent.change(opponent, { target: { value } });
      expect(start).toBeDisabled();
    }
    expect(onStart).not.toHaveBeenCalled();

    fireEvent.change(opponent, { target: { value: " hubot " } });
    fireEvent.click(start);
    expect(onStart).toHaveBeenCalledWith("octo-cat", "hubot", "Overall Battle");
  });

  it("starts with the selected battle type", () => {
    const onStart = vi.fn();
    render(<BattleSetup onStart={onStart} initialPlayer1="octocat" initialPlayer2="hubot" />);
    fireEvent.click(screen.getByRole("button", { name: "Overall Battle" }));
    fireEvent.click(screen.getByRole("button", { name: "Repository Battle" }));
    fireEvent.click(screen.getByRole("button", { name: /start battle/i }));

    expect(onStart).toHaveBeenCalledWith("octocat", "hubot", "Repository Battle");
  });

  it("picks two distinct developers even if the first draws match", () => {
    render(<BattleSetup onStart={vi.fn()} />);
    vi.spyOn(Math, "random").mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValue(0.25);
    fireEvent.click(screen.getByRole("button", { name: /pick random developers/i }));

    expect(screen.getByRole("textbox", { name: "Challenger" })).toHaveValue("torvalds");
    expect(screen.getByRole("textbox", { name: "Opponent" })).toHaveValue("gaearon");
    expect(screen.getByRole("button", { name: /start battle/i })).toBeEnabled();
  });
});
