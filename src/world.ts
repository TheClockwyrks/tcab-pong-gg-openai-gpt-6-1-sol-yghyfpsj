import type { DeepReadonly } from "ts-essentials";
import type { BallState, CaromState, Mode, ObstacleState } from "./game";
import * as C from "./constants";
export const clamp = (v: number, a: number, b: number) =>
  Math.max(a, Math.min(b, v));
export const serveSign = (): 1 | -1 => (Math.random() < 0.5 ? -1 : 1);
export function parkedBall(): BallState {
  return {
    x: C.FIELD_CX,
    y: C.FIELD_CY,
    vx: 0,
    vy: 0,
    spin: 0,
    held: true,
    holdTimer: C.HOLD_TIME,
    serveSign: serveSign(),
    trail: [],
  };
}
export function obstacle(index: number, t: number): ObstacleState {
  const base = C.OBSTACLE_CENTERS[index];
  if (!base) throw new Error("Unknown obstacle: " + index);
  return {
    index,
    cx: base.x,
    cy:
      base.y +
      (index === 0 ? 1 : -1) *
        C.OBSTACLE_SWAY_AMP *
        Math.sin((2 * Math.PI * t) / C.OBSTACLE_SWAY_PERIOD),
    theta: C.OBSTACLE_SPIN_RATE * t,
  };
}
export function initialState(muted: boolean): CaromState {
  const paddle = () => ({ cy: C.FIELD_CY, vy: 0, driven: false, drivenVy: 0 });
  return {
    screen: "title",
    mode: "solo",
    menuIndex: 0,
    titleIndex: 0,
    resumeScreen: "playing",
    score: { p1: 0, p2: 0 },
    winner: null,
    paddles: { left: paddle(), right: paddle() },
    ai: { tracking: true, movement: true },
    receiver: "left",
    ball: parkedBall(),
    obstacles: C.OBSTACLE_CENTERS.map((_, i) => obstacle(i, 0)),
    obstacleClock: 0,
    obstacleClockRunning: true,
    simTime: 0,
    muted,
  };
}
/** A new match resets the court, but debug driver ownership survives. */
export function startMatch(
  s: DeepReadonly<CaromState>,
  mode: Mode,
): CaromState {
  return {
    ...initialState(s.muted),
    screen: "countdown",
    mode,
    titleIndex: s.titleIndex,
    simTime: s.simTime,
    paddles: {
      left: { ...s.paddles.left, cy: C.FIELD_CY, vy: 0 },
      right: { ...s.paddles.right, cy: C.FIELD_CY, vy: 0 },
    },
  };
}
export function title(s: DeepReadonly<CaromState>): CaromState {
  return {
    ...initialState(s.muted),
    titleIndex: s.titleIndex,
    menuIndex: s.titleIndex,
    simTime: s.simTime,
  };
}
