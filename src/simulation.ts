import type { UpdateApi } from "@clockwyrks/simple-2d";
import type { DeepReadonly } from "ts-essentials";
import type { CaromState, PaddleState, Side } from "./game";
import * as C from "./constants";
import { readInput } from "./menus";
import { clamp, obstacle, parkedBall } from "./world";
import { flight, type Hits } from "./physics";
function move(p: PaddleState, vy: number, dt: number): PaddleState {
  const raw = p.cy + vy * dt,
    cy = clamp(raw, C.PADDLE_MIN_CY, C.PADDLE_MAX_CY);
  return { ...p, cy, vy: cy !== raw && dt > 0 ? (cy - p.cy) / dt : vy };
}
export function update(
  state: DeepReadonly<CaromState>,
  api: UpdateApi,
  dt: number,
): CaromState {
  let s = readInput(state, api);
  s = { ...s, simTime: state.simTime + dt };
  if (s.screen !== "playing" && s.screen !== "countdown") return s;
  const held = Object.fromEntries(
    C.ACTIONS.map((n) => [n, api.input.value(n) > 0]),
  );
  const velocity = (side: Side) => {
    const p = s.paddles[side];
    if (p.driven) return p.drivenVy;
    if (side === "right" && s.mode === "solo") {
      if (!s.ai.movement) return 0;
      const defend =
        s.ai.tracking && s.screen === "playing" && s.ball && s.ball.vx > 0;
      const target =
        defend && s.ball ? s.ball.y - s.ball.vy * C.AI_REACT : C.AI_HOME_Y;
      const diff = target - p.cy;
      return Math.abs(diff) <= (defend ? C.AI_DEADZONE : C.AI_HOME_DEADZONE)
        ? 0
        : Math.sign(diff) *
            Math.min(C.AI_SPEED, dt > 0 ? Math.abs(diff) / dt : 0);
    }
    const solo = s.mode === "solo",
      one = side === "left";
    const up = held[one ? "p1-up" : "p2-up"] || (solo && held["p2-up"]);
    const down = held[one ? "p1-down" : "p2-down"] || (solo && held["p2-down"]);
    return (Number(down) - Number(up)) * C.PADDLE_SPEED;
  };
  const paddles = {
    left: move(s.paddles.left, velocity("left"), dt),
    right: move(s.paddles.right, velocity("right"), dt),
  };
  const hits: Hits = new Set();
  let ball = s.ball,
    screen = s.screen;
  if (ball) {
    if (screen === "countdown") {
      const holdTimer = Math.max(0, ball.holdTimer - dt);
      ball = { ...ball, holdTimer };
      if (holdTimer <= 0) {
        ball = {
          ...ball,
          held: false,
          trail: [],
          vx:
            (s.receiver === "left" ? -1 : 1) *
            C.SERVE_SPEED *
            Math.cos(C.SERVE_ANGLE),
          vy: ball.serveSign * C.SERVE_SPEED * Math.sin(C.SERVE_ANGLE),
        };
        screen = "playing";
      }
    } else if (!ball.held) ball = flight(ball, paddles, s.obstacles, dt, hits);
    ball = {
      ...ball,
      trail: [...ball.trail, { x: ball.x, y: ball.y, t: s.simTime }].filter(
        (p) => p.t >= s.simTime - C.TRAIL_TIME,
      ),
    };
  }
  // All substeps collide with the opening pose; publish the new pose only now.
  const obstacleClock = s.obstacleClock + (s.obstacleClockRunning ? dt : 0);
  s = {
    ...s,
    paddles,
    ball,
    screen,
    obstacleClock,
    obstacles: s.obstacles.map((o) => obstacle(o.index, obstacleClock)),
  };
  if (
    s.screen === "playing" &&
    !ball?.held &&
    ball &&
    (ball.x - C.BALL_R > C.FIELD_W || ball.x + C.BALL_R < 0)
  ) {
    const left = ball.x > C.FIELD_W,
      score = { p1: s.score.p1 + Number(left), p2: s.score.p2 + Number(!left) };
    const won = left
      ? score.p1 >= C.WIN_SCORE && score.p1 - score.p2 >= C.WIN_LEAD
      : score.p2 >= C.WIN_SCORE && score.p2 - score.p1 >= C.WIN_LEAD;
    s = won
      ? {
          ...s,
          score,
          winner: left ? "left" : "right",
          screen: "matchover",
          menuIndex: 0,
        }
      : {
          ...s,
          score,
          receiver: left ? "right" : "left",
          ball: parkedBall(),
          screen: "countdown",
        };
    hits.add(C.CUES.score);
  }
  for (const cue of hits) api.audio.play(cue);
  return s;
}
