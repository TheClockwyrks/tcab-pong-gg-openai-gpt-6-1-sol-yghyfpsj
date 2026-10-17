import { describe, it, expect } from "vitest";
import { createCanvas } from "@napi-rs/canvas";
import { createEngine, ConstantClock } from "@clockwyrks/simple-2d";
import { game } from "./game";
import * as C from "./constants";
async function world() {
  const target = new EventTarget();
  const e = createEngine({
    canvas: createCanvas(C.FIELD_W, C.FIELD_H) as unknown as HTMLCanvasElement,
    width: C.FIELD_W,
    height: C.FIELD_H,
    game,
    clock: new ConstantClock(10),
    surface: {
      cssWidth: () => C.FIELD_W,
      cssHeight: () => C.FIELD_H,
      dpr: () => 1,
      events: () => target,
    },
  });
  await e.initialize();
  return e;
}
describe("debug poses and AI", () => {
  it("round-trips every independent control and resets the whole declared state", async () => {
    const e = await world(),
      d = e.debug;
    e.apply((s) => d.setMode(s, "versus"));
    e.apply((s) => d.setMenuIndex(s, 2));
    e.apply((s) => d.setTitleIndex(s, 1));
    e.apply((s) => d.setResumeScreen(s, "countdown"));
    e.apply((s) => d.setWinner(s, "right"));
    e.apply((s) => d.setReceiver(s, "right"));
    e.apply((s) => d.setMuted(s, true));
    e.apply((s) => d.setAiTracking(s, false));
    e.apply((s) => d.setAiMovement(s, false));
    e.apply((s) => d.setBallHoldTimer(s, 0.2));
    e.apply((s) => d.setBallServeSign(s, -1));
    e.apply((s) => d.drawBallServeSign(s));
    const sign = e.state.ball!.serveSign;
    expect([-1, 1]).toContain(sign);
    const snap = d.snapshot(e.state);
    expect(snap.mode).toBe("versus");
    expect(snap.resumeScreen).toBe("countdown");
    expect(snap.ai).toEqual({ tracking: false, movement: false });
    expect(snap.ball!.holdTimer).toBe(0.2);
    const before = structuredClone(e.state);
    d.setScore(e.state, 7, 8);
    expect(e.state).toEqual(before);
    e.apply((s) => d.reset(s));
    expect(e.state.screen).toBe("title");
    expect(e.state.muted).toBe(true);
    expect(e.state.simTime).toBe(0);
    expect(e.state.obstacles).toHaveLength(2);
    expect(e.state.ai.tracking).toBe(true);
    e.destroy();
  });
  it("gates AI tracking and movement independently", async () => {
    const e = await world(),
      d = e.debug;
    e.apply((s) => d.setScreen(s, "playing"));
    e.apply((s) => d.setBallHeld(s, false));
    e.apply((s) => d.setBallPosition(s, 900, 200));
    e.apply((s) => d.setBallVelocity(s, 520, 40));
    await e.advance(1);
    expect(e.state.paddles.right.vy).toBe(-C.AI_SPEED);
    e.apply((s) => d.setAiMovement(s, false));
    await e.advance(1);
    expect(e.state.paddles.right.vy).toBe(0);
    e.apply((s) => d.setAiMovement(s, true));
    e.apply((s) => d.setAiTracking(s, false));
    e.apply((s) => d.setPaddleCy(s, "right", 200));
    await e.advance(1);
    expect(e.state.paddles.right.vy).toBe(C.AI_SPEED);
    e.apply((s) => d.setPaddleCy(s, "right", C.AI_HOME_Y));
    await e.advance(1);
    expect(e.state.paddles.right.vy).toBe(0);
    e.destroy();
  });
  it("counts down with a posed receiver/sign and never advances the serve frame", async () => {
    const e = await world(),
      d = e.debug;
    e.apply((s) => d.setScreen(s, "countdown"));
    e.apply((s) => d.setReceiver(s, "right"));
    e.apply((s) => d.setBallServeSign(s, -1));
    e.apply((s) => d.setBallHoldTimer(s, 0));
    await e.advance(1);
    expect(e.state.ball!.x).toBe(C.FIELD_CX);
    expect(e.state.ball!.y).toBe(C.FIELD_CY);
    expect(e.state.ball!.vx).toBeCloseTo(
      C.SERVE_SPEED * Math.cos(C.SERVE_ANGLE),
    );
    expect(e.state.ball!.vy).toBeLessThan(0);
    expect(e.state.screen).toBe("playing");
    e.destroy();
  });
});
