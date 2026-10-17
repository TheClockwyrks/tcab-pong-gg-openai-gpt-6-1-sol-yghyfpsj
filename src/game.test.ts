import { createCanvas } from "@napi-rs/canvas";
import { ConstantClock, createEngine } from "@clockwyrks/simple-2d";
import { describe, it, expect } from "vitest";
import { game, BACKGROUND } from "./game";
import * as C from "./constants";

async function setup(step = 8) {
  const canvas = createCanvas(C.FIELD_W, C.FIELD_H);
  const target = new EventTarget();
  const engine = createEngine({
    canvas: canvas as unknown as HTMLCanvasElement,
    width: C.FIELD_W,
    height: C.FIELD_H,
    game,
    background: BACKGROUND,
    layout: C.LAYOUT,
    clock: new ConstantClock(step),
    surface: {
      cssWidth: () => C.FIELD_W,
      cssHeight: () => C.FIELD_H,
      dpr: () => 1,
      events: () => target,
    },
  });
  await engine.initialize();
  const key = async (code: string) => {
    target.dispatchEvent(
      Object.assign(new Event("keydown"), { code, repeat: false }),
    );
    await engine.advance(1);
    target.dispatchEvent(Object.assign(new Event("keyup"), { code }));
  };
  return { engine, key, target };
}
describe("Carom engine integration", () => {
  it("registers diagnostics, starts, serves and pauses without mutating prior state", async () => {
    const { engine: e, key } = await setup();
    const initial = e.state;
    expect(initial.screen).toBe("title");
    expect(e.debug.version).toBe(C.CAROM_DEBUG_VERSION);
    expect(e.diagnostics().length).toBeGreaterThanOrEqual(10);
    await key("Enter");
    expect(e.state.screen).toBe("countdown");
    expect(initial.screen).toBe("title");
    await e.advance(130);
    expect(e.state.screen).toBe("playing");
    await key("Escape");
    expect(e.state.screen).toBe("paused");
    const clock = e.state.obstacleClock;
    const ball = e.state.ball;
    await e.advance(5);
    expect(e.state.ball).toEqual(ball);
    expect(e.state.obstacleClock).toBe(clock);
    await key("Escape");
    expect(e.state.screen).toBe("playing");
    await key("KeyM");
    expect(e.state.muted).toBe(true);
    e.destroy();
  });
  it("navigates menus, remembers selection and restarts", async () => {
    const { engine: e, key } = await setup();
    await key("ArrowUp");
    expect(e.state.menuIndex).toBe(2);
    await key("Enter");
    expect(e.state.screen).toBe("howto");
    await key("Escape");
    expect(e.state.menuIndex).toBe(2);
    await key("ArrowUp");
    await key("Enter");
    expect(e.state.mode).toBe("versus");
    await key("KeyP");
    await key("KeyS");
    await key("Enter");
    expect(e.state.score.p1).toBe(0);
    expect(e.state.screen).toBe("countdown");
    await key("KeyP");
    await key("KeyW");
    await key("Enter");
    expect(e.state.screen).toBe("title");
    expect(e.state.menuIndex).toBe(1);
    e.destroy();
  });
  it("poses driven paddles independently and clamps actual velocity", async () => {
    const { engine: e } = await setup(10),
      d = e.debug;
    e.apply((s) => d.setScreen(s, "playing"));
    e.apply((s) => d.clearWorld(s));
    e.apply((s) => d.setPaddleCy(s, "left", C.PADDLE_MAX_CY - 2));
    e.apply((s) => d.setPaddleVy(s, "left", C.PADDLE_SPEED));
    e.apply((s) => d.setPaddleDriven(s, "left", true));
    await e.advance(1);
    expect(e.state.paddles.left.vy).toBeCloseTo(200);
    await e.advance(1);
    expect(e.state.paddles.left.vy).toBe(0);
    expect(e.state.paddles.left.drivenVy).toBe(C.PADDLE_SPEED);
    expect(() => d.setBallSpin(e.state, 1)).toThrow();
    expect(() => d.spawnObstacle(e.state, 2)).toThrow();
    e.apply((s) => d.spawnObstacle(s, 0));
    e.apply((s) => d.setObstacleClock(s, 0.6));
    expect(e.state.obstacles[0].theta).toBeCloseTo(C.OBSTACLE_SPIN_RATE * 0.6);
    const snap = d.snapshot(e.state);
    expect(d.snapshot(d.reconcile(e.state))).toEqual(snap);
    e.destroy();
  });
  it("reflects, adds paddle spin, preserves wall speed and scores deuce", async () => {
    const { engine: e } = await setup(8),
      d = e.debug;
    const cues: string[] = [];
    e.events.on("cue:played", (v) => cues.push(v.cue));
    e.apply((s) => d.clearWorld(s));
    e.apply((s) => d.spawnBall(s));
    e.apply((s) => d.setScreen(s, "playing"));
    e.apply((s) => d.setMode(s, "versus"));
    e.apply((s) => d.setBallHeld(s, false));
    e.apply((s) => d.setPaddleDriven(s, "left", true));
    e.apply((s) => d.setPaddleVy(s, "left", 100));
    e.apply((s) => d.setBallPosition(s, C.P1_X1 + C.BALL_R + 1, C.FIELD_CY));
    e.apply((s) => d.setBallVelocity(s, -C.SERVE_SPEED, 0));
    await e.advance(1);
    expect(e.state.ball!.vx).toBeGreaterThan(0);
    expect(e.state.ball!.spin).toBeGreaterThan(0);
    expect(cues).toContain(C.CUES.paddleHit);
    e.apply((s) => d.setBallPosition(s, 300, C.BALL_R + 1));
    e.apply((s) => d.setBallVelocity(s, 0, -C.SERVE_SPEED));
    e.apply((s) => d.setBallSpin(s, 0));
    await e.advance(1);
    expect(e.state.ball!.vy).toBeGreaterThan(0);
    expect(cues).toContain(C.CUES.wallBounce);
    e.apply((s) => d.setScore(s, 10, 10));
    for (let i = 0; i < 2; i++) {
      e.apply((s) => d.setScreen(s, "playing"));
      e.apply((s) => d.setBallHeld(s, false));
      e.apply((s) => d.setBallPosition(s, C.FIELD_W + C.BALL_R + 1, 300));
      e.apply((s) => d.setBallVelocity(s, 100, 0));
      await e.advance(1);
    }
    expect(e.state.screen).toBe("matchover");
    expect(e.state.score).toEqual({ p1: 12, p2: 10 });
    expect(e.state.winner).toBe("left");
    e.destroy();
  });
  it("resolves oriented obstacles and decays spin at equal elapsed time", async () => {
    for (const step of [2, 8, 16]) {
      const { engine: e } = await setup(step),
        d = e.debug;
      e.apply((s) => d.clearWorld(s));
      e.apply((s) => d.spawnBall(s));
      e.apply((s) => d.spawnObstacle(s, 0));
      e.apply((s) => d.setObstacleClockRunning(s, false));
      e.apply((s) => d.setScreen(s, "playing"));
      e.apply((s) => d.setBallHeld(s, false));
      e.apply((s) => d.setBallPosition(s, 455, 220));
      e.apply((s) => d.setBallVelocity(s, 520, 0));
      await e.advance(Math.ceil(40 / step));
      expect(e.state.ball!.vx).toBeLessThan(0);
      e.apply((s) => d.clearWorld(s));
      e.apply((s) => d.spawnBall(s));
      e.apply((s) => d.setBallHeld(s, false));
      e.apply((s) => d.setBallVelocity(s, 100, 0));
      e.apply((s) => d.setBallSpin(s, 100));
      await e.advance(800 / step);
      expect(e.state.ball!.spin).toBeCloseTo(50, 5);
      e.destroy();
    }
  });
  it("selects and confirms pointer items including same-frame taps", async () => {
    const { engine: e, target } = await setup();
    const r = e.debug.menuItemRect(e.state, 1)!;
    const event = (type: string, x: number, y: number) =>
      target.dispatchEvent(
        Object.assign(new Event(type), {
          clientX: x,
          clientY: y,
          pointerId: 1,
          pointerType: "mouse",
          isPrimary: true,
          button: 0,
          buttons: type === "pointerup" ? 0 : 1,
        }),
      );
    event("pointerdown", r.x + 10, r.y + 10);
    event("pointerup", r.x + 10, r.y + 10);
    await e.advance(1);
    expect(e.state.mode).toBe("versus");
    expect(e.state.screen).toBe("countdown");
    expect(e.debug.menuItemRect(e.state, 0)).toBeNull();
    e.destroy();
  });
});
