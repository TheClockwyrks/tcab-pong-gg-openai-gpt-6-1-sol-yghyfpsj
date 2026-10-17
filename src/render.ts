import type { RenderApi } from "@clockwyrks/simple-2d";
import type { DeepReadonly } from "ts-essentials";
import type { CaromState } from "./game";
import * as C from "./constants";
import { menuItems, menuItemRect } from "./menus";
const ink = "#e8f0e9",
  soft = "#7e969d",
  mint = "#b6f57a",
  orange = "#ff9169",
  violet = "#b4a0ff";
function text(
  ctx: CanvasRenderingContext2D,
  copy: string,
  x: number,
  y: number,
  size = 14,
  color = ink,
  weight = 500,
  align: CanvasTextAlign = "left",
) {
  ctx.fillStyle = color;
  ctx.font =
    weight +
    " " +
    size +
    "px " +
    (size < 17 ? "monospace" : "Arial, sans-serif");
  ctx.textAlign = align;
  ctx.fillText(copy, x, y);
}
function line(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  x2: number,
  y2: number,
  color: string,
  width = 1,
) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}
function rounded(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  color: string,
) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
}
function dot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  color: string,
) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}
function furniture(s: DeepReadonly<CaromState>, ctx: CanvasRenderingContext2D) {
  ctx.save();
  ctx.strokeStyle = "#23353b";
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 13]);
  ctx.beginPath();
  ctx.moveTo(C.NET_X, 30);
  ctx.lineTo(C.NET_X, C.FIELD_H - 30);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.strokeStyle = "#1d3036";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(C.FIELD_CX, C.FIELD_CY, 102, 0, Math.PI * 2);
  ctx.stroke();
  line(ctx, 24, 2, C.FIELD_W - 24, 2, "#365049", 3);
  line(ctx, 24, C.FIELD_H - 2, C.FIELD_W - 24, C.FIELD_H - 2, "#365049", 3);
  for (const side of ["left", "right"] as const) {
    const x = side === "left" ? C.P1_X0 : C.P2_X0,
      color = side === "left" ? mint : orange,
      p = s.paddles[side];
    rounded(
      ctx,
      x - 6,
      p.cy - C.PADDLE_HALF - 6,
      C.PADDLE_W + 12,
      C.PADDLE_H + 12,
      12,
      color + "10",
    );
    ctx.shadowColor = color;
    ctx.shadowBlur = 14;
    rounded(ctx, x, p.cy - C.PADDLE_HALF, C.PADDLE_W, C.PADDLE_H, 8, color);
    ctx.shadowBlur = 0;
    line(
      ctx,
      x + C.PADDLE_W / 2,
      p.cy - 14,
      x + C.PADDLE_W / 2,
      p.cy + 14,
      "#0b141b55",
      2,
    );
  }
  for (const o of s.obstacles) {
    ctx.save();
    ctx.translate(o.cx, o.cy);
    ctx.rotate(o.theta);
    rounded(
      ctx,
      -C.OBSTACLE_W / 2 - 5,
      -C.OBSTACLE_H / 2 - 5,
      C.OBSTACLE_W + 10,
      C.OBSTACLE_H + 10,
      10,
      violet + "12",
    );
    rounded(
      ctx,
      -C.OBSTACLE_W / 2,
      -C.OBSTACLE_H / 2,
      C.OBSTACLE_W,
      C.OBSTACLE_H,
      5,
      violet,
    );
    dot(ctx, 0, 0, 3, "#43376b");
    ctx.restore();
  }
  if (s.ball) {
    const b = s.ball;
    for (let i = 1; i < b.trail.length; i++) {
      const a = b.trail[i - 1],
        p = b.trail[i];
      line(
        ctx,
        a.x,
        a.y,
        p.x,
        p.y,
        "rgba(232,240,233," + (i / b.trail.length) * 0.38 + ")",
        2 + (C.BALL_R * i) / b.trail.length,
      );
    }
    ctx.shadowColor = ink;
    ctx.shadowBlur = 18;
    dot(ctx, b.x, b.y, C.BALL_R, ink);
    ctx.shadowBlur = 0;
  }
  ctx.restore();
}
function menu(s: DeepReadonly<CaromState>, ctx: CanvasRenderingContext2D) {
  const items = menuItems(s);
  items.forEach((item, i) => {
    const r = menuItemRect(s, i);
    if (!r) return;
    const active = s.menuIndex === i;
    rounded(ctx, r.x, r.y, r.w, r.h, 4, active ? mint : "#152329");
    text(ctx, "0" + (i + 1), r.x + 18, r.y + 33, 12, active ? "#41602b" : soft);
    text(ctx, item, r.x + 58, r.y + 35, 19, active ? "#152215" : ink, 700);
    text(
      ctx,
      active ? "↗" : "—",
      r.x + r.w - 24,
      r.y + 35,
      21,
      active ? "#152215" : "#496168",
      500,
      "right",
    );
  });
}
function titleScreen(
  s: DeepReadonly<CaromState>,
  ctx: CanvasRenderingContext2D,
) {
  text(ctx, "C / 01", 112, 81, 14, mint);
  text(ctx, "A GAME OF ANGLES", 238, 81, 12, soft);
  text(ctx, C.TITLE_TEXT, 103, 247, 114, ink, 900);
  text(ctx, "A paddle duel. With a twist.", 112, 296, 25, ink, 400);
  text(ctx, "BEND THE BALL.  FIND YOUR ANGLE.", 112, 328, 12, soft);
  menu(s, ctx);
  text(ctx, "W S / ↑ ↓  SELECT", 112, 615, 12, soft);
  text(ctx, "ENTER  PLAY", 338, 615, 12, soft);
  // A miniature court, drawn as a diagram rather than a second simulation.
  ctx.save();
  ctx.translate(720, 186);
  ctx.rotate(-0.075);
  rounded(ctx, -10, -10, 440, 350, 18, "#121f26");
  ctx.strokeStyle = "#344a50";
  ctx.lineWidth = 1;
  ctx.strokeRect(10, 10, 400, 310);
  ctx.setLineDash([4, 10]);
  line(ctx, 210, 10, 210, 320, "#3b4f53");
  ctx.setLineDash([]);
  ctx.strokeStyle = "#273d40";
  ctx.beginPath();
  ctx.arc(210, 165, 57, 0, Math.PI * 2);
  ctx.stroke();
  rounded(ctx, 26, 170, 9, 64, 4, mint);
  rounded(ctx, 386, 79, 9, 64, 4, orange);
  ctx.save();
  ctx.translate(155, 94);
  ctx.rotate(-0.42);
  rounded(ctx, -6, -40, 12, 80, 3, violet);
  ctx.restore();
  ctx.save();
  ctx.translate(265, 236);
  ctx.rotate(-0.42);
  rounded(ctx, -6, -40, 12, 80, 3, violet);
  ctx.restore();
  ctx.strokeStyle = "#b6f57a";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(44, 203);
  ctx.bezierCurveTo(160, 216, 180, 98, 252, 133);
  ctx.stroke();
  ctx.strokeStyle = "#e8f0e94d";
  ctx.setLineDash([4, 6]);
  ctx.beginPath();
  ctx.moveTo(252, 133);
  ctx.bezierCurveTo(310, 161, 345, 124, 379, 112);
  ctx.stroke();
  ctx.setLineDash([]);
  dot(ctx, 252, 133, 8, ink);
  text(ctx, "+ SPIN", 99, 251, 11, mint);
  text(ctx, "BANK / RETURN", 220, 51, 10, violet);
  ctx.restore();
  text(ctx, "01", 727, 591, 12, mint);
  text(ctx, "MOTION MAKES THE DIFFERENCE", 766, 591, 12, soft);
  line(ctx, 112, 662, 1168, 662, "#26383e");
  text(ctx, "LOCAL PLAY / NO TWO RALLIES ALIKE", 112, 688, 11, soft);
  text(
    ctx,
    "FIRST TO " + C.WIN_SCORE + "  ·  WIN BY " + C.WIN_LEAD,
    1168,
    688,
    11,
    soft,
    500,
    "right",
  );
}
function howto(s: DeepReadonly<CaromState>, ctx: CanvasRenderingContext2D) {
  text(ctx, "THE PLAYBOOK", 112, 87, 12, mint);
  text(ctx, "Find your angle.", 108, 162, 58, ink, 800);
  const columns = [
    {
      x: 112,
      n: "01",
      title: "MEET THE BALL",
      body: [
        "W / S moves the left paddle.",
        "↑ / ↓ moves the right in Versus.",
        "In Solo, either pair is yours.",
      ],
    },
    {
      x: 486,
      n: "02",
      title: "PUT A CURVE ON IT",
      body: [
        "Strike while moving to add spin.",
        "Up bends up. Down bends down.",
        "The curve fades as the ball flies.",
      ],
    },
    {
      x: 860,
      n: "03",
      title: "PLAY THE BANK",
      body: [
        "The violet bars sway and rotate.",
        "Use their faces to find a new line.",
        "Clear the far edge to score.",
      ],
    },
  ];
  for (const col of columns) {
    text(ctx, col.n, col.x, 235, 14, mint);
    line(ctx, col.x, 258, col.x + 300, 258, "#34484e");
    text(ctx, col.title, col.x, 302, 19, ink, 700);
    col.body.forEach((copy, i) =>
      text(ctx, copy, col.x, 342 + i * 27, 13, soft),
    );
  }
  text(
    ctx,
    "FIRST TO " + C.WIN_SCORE + ". WIN BY " + C.WIN_LEAD + ".",
    C.FIELD_CX,
    469,
    22,
    ink,
    700,
    "center",
  );
  text(
    ctx,
    "P / ESC  PAUSE     ·     M  MUTE     ·     TOUCH  USE THE SIDE SLIDERS",
    C.FIELD_CX,
    509,
    12,
    soft,
    500,
    "center",
  );
  menu(s, ctx);
}
export function render(s: DeepReadonly<CaromState>, api: RenderApi): void {
  const ctx = api.ctx;
  ctx.save();
  const gradient = ctx.createRadialGradient(720, 280, 50, 640, 360, 800);
  gradient.addColorStop(0, "#12242a");
  gradient.addColorStop(1, "#0b141b");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, C.FIELD_W, C.FIELD_H);
  // Fine, quiet plotting grid.
  ctx.fillStyle = "#26383b";
  for (let x = 32; x < C.FIELD_W; x += 32)
    for (let y = 32; y < C.FIELD_H; y += 32) ctx.fillRect(x, y, 1, 1);
  if (s.screen === "title") titleScreen(s, ctx);
  else if (s.screen === "howto") howto(s, ctx);
  else {
    furniture(s, ctx);
    text(
      ctx,
      s.mode === "solo" ? "SOLO / HUMAN vs MACHINE" : "VERSUS / LOCAL DUEL",
      C.FIELD_CX,
      35,
      11,
      soft,
      500,
      "center",
    );
    text(
      ctx,
      String(s.score.p1),
      C.FIELD_CX - 110,
      107,
      64,
      mint,
      800,
      "center",
    );
    text(
      ctx,
      String(s.score.p2),
      C.FIELD_CX + 110,
      107,
      64,
      orange,
      800,
      "center",
    );
    text(ctx, "PLAYER 01", 112, 42, 11, mint);
    text(
      ctx,
      s.mode === "solo" ? "MACHINE" : "PLAYER 02",
      1168,
      42,
      11,
      orange,
      500,
      "right",
    );
    text(ctx, "W / S", 112, 688, 11, soft);
    text(
      ctx,
      s.mode === "solo" ? "P / ESC  PAUSE" : "↑ / ↓",
      1168,
      688,
      11,
      soft,
      500,
      "right",
    );
    text(
      ctx,
      "FIRST TO " + C.WIN_SCORE + " · WIN BY " + C.WIN_LEAD,
      C.FIELD_CX,
      688,
      11,
      soft,
      500,
      "center",
    );
    if (s.screen === "countdown" && s.ball) {
      text(ctx, "READY", C.FIELD_CX, 267, 12, mint, 500, "center");
      text(
        ctx,
        s.receiver === "left" ? "← YOUR RETURN" : "THEIR RETURN →",
        C.FIELD_CX,
        301,
        22,
        ink,
        700,
        "center",
      );
      rounded(ctx, C.FIELD_CX - 60, 411, 120, 3, 2, "#2d4346");
      rounded(
        ctx,
        C.FIELD_CX - 60,
        411,
        120 * Math.min(1, Math.max(0, s.ball.holdTimer / C.HOLD_TIME)),
        3,
        2,
        mint,
      );
    }
    if (s.screen === "paused" || s.screen === "matchover") {
      ctx.fillStyle = "#0b141be8";
      ctx.fillRect(0, 0, C.FIELD_W, C.FIELD_H);
      text(
        ctx,
        s.screen === "paused" ? "TAKE A BREATHER" : "MATCH COMPLETE",
        C.FIELD_CX,
        208,
        12,
        mint,
        500,
        "center",
      );
      text(
        ctx,
        s.screen === "paused"
          ? "Paused."
          : s.winner === "left"
            ? "Player 01 wins."
            : s.mode === "solo"
              ? "Machine wins."
              : "Player 02 wins.",
        C.FIELD_CX,
        286,
        58,
        ink,
        800,
        "center",
      );
      text(
        ctx,
        s.screen === "paused"
          ? "Your next angle can wait."
          : s.score.p1 + "  —  " + s.score.p2,
        C.FIELD_CX,
        328,
        19,
        soft,
        400,
        "center",
      );
      menu(s, ctx);
      text(
        ctx,
        "W S / ↑ ↓  SELECT     ENTER  CONFIRM",
        C.FIELD_CX,
        625,
        12,
        soft,
        500,
        "center",
      );
    }
  }
  text(
    ctx,
    s.muted ? "M / SOUND OFF" : "M / SOUND ON",
    1168,
    81,
    10,
    soft,
    500,
    "right",
  );
  ctx.restore();
}
