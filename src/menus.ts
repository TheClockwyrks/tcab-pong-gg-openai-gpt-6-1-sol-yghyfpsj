import type { DeepReadonly } from "ts-essentials";
import type { UpdateApi } from "@clockwyrks/simple-2d";
import type { CaromState } from "./game";
import {
  ACTIONS,
  TITLE_ITEMS,
  PAUSE_ITEMS,
  MATCHOVER_ITEMS,
} from "./constants";
import { startMatch, title } from "./world";
export function menuItems(s: DeepReadonly<CaromState>): readonly string[] {
  switch (s.screen) {
    case "title":
      return TITLE_ITEMS;
    case "paused":
      return PAUSE_ITEMS;
    case "matchover":
      return MATCHOVER_ITEMS;
    case "howto":
      return ["BACK TO MENU"];
    default:
      return [];
  }
}
export function menuItemRect(s: DeepReadonly<CaromState>, index: number) {
  if (index < 0 || index >= menuItems(s).length || !Number.isInteger(index))
    return null;
  return {
    x: s.screen === "title" ? 112 : 440,
    y:
      (s.screen === "title" ? 365 : s.screen === "howto" ? 590 : 370) +
      index * 66,
    w: 400,
    h: 54,
  };
}
function confirm(s: CaromState): CaromState {
  switch (s.screen) {
    case "title": {
      const next = { ...s, titleIndex: s.menuIndex };
      return s.menuIndex === 2
        ? { ...next, screen: "howto", menuIndex: 0 }
        : startMatch(next, s.menuIndex === 1 ? "versus" : "solo");
    }
    case "howto":
      return title(s);
    case "paused":
      return s.menuIndex === 0
        ? { ...s, screen: s.resumeScreen }
        : s.menuIndex === 1
          ? startMatch(s, s.mode)
          : title(s);
    case "matchover":
      return s.menuIndex === 0 ? startMatch(s, s.mode) : title(s);
    default:
      return s;
  }
}
export function readInput(
  state: DeepReadonly<CaromState>,
  api: UpdateApi,
): CaromState {
  const edges = Object.fromEntries(
    ACTIONS.map((n) => [n, api.input.pressed(n)]),
  );
  const samples = api.input.pointerSamples();
  api.input.pointer();
  api.input.pointerContacts();
  let s: CaromState = {
    ...state,
    muted: edges.mute ? !state.muted : state.muted,
  };
  api.audio.setMuted(s.muted);
  if (s.screen === "playing" || s.screen === "countdown")
    return edges.pause
      ? {
          ...s,
          resumeScreen: s.screen,
          screen: "paused",
          menuIndex: 0,
          menuPresses: {},
        }
      : s;
  if (s.screen === "paused" && (edges.pause || edges.back))
    return { ...s, screen: s.resumeScreen, menuPresses: {} };
  if ((s.screen === "howto" || s.screen === "matchover") && edges.back)
    return title(s);
  const items = menuItems(s);
  const up = edges["p1-up"] || edges["p2-up"],
    down = edges["p1-down"] || edges["p2-down"];
  if (up)
    s = { ...s, menuIndex: (s.menuIndex + items.length - 1) % items.length };
  else if (down) s = { ...s, menuIndex: (s.menuIndex + 1) % items.length };
  const keyboardConfirm = edges.confirm && !up && !down;
  if (keyboardConfirm) return { ...confirm(s), menuPresses: {} };
  const presses = { ...s.menuPresses };
  let clicked = false;
  for (const sample of samples) {
    const index = items.findIndex((_, i) => {
      const r = menuItemRect(state, i);
      return (
        r &&
        sample.x >= r.x &&
        sample.x <= r.x + r.w &&
        sample.y >= r.y &&
        sample.y <= r.y + r.h
      );
    });
    if (index >= 0) s = { ...s, menuIndex: index };
    if (sample.type === "down") presses[sample.id] = index;
    if (sample.type === "up") {
      if (index >= 0 && presses[sample.id] === index && !clicked) {
        s = confirm(s);
        clicked = true;
        break;
      }
      delete presses[sample.id];
    }
  }
  return { ...s, menuPresses: clicked ? {} : presses };
}
