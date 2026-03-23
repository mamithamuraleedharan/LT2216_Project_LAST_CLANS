import type { Hypothesis, SpeechStateExternalEvent } from "speechstate";
import type { ActorRef } from "xstate";
export interface Entity {
  category: string;
  text: string;
  confidenceScore: number;
  offset: number;
  length: number;
}

export interface Intent {
  category: string;
  confidenceScore: number;
}

export interface NLUObject {
  entities: Entity[];
  intents: Intent[];
  projectKind: string;
  topIntent: string;
}
export interface DMContext {
  spstRef: ActorRef<any, any>;
  lastResult: Hypothesis[] | null;//last utterance
  interpretation: NLUObject | null; //NLU
  playerName: string | undefined; //username
  playerSkill: string | undefined; // player skills : Fighter or deplomat
  playerEquipment: string | undefined; // player equipment : Gas Mask or Bow and Arrow
  currentLocation: string; // current location
  village1Type: "grounder" | "reaper"; // randomly assigning village type as grounder or reaper
  village2Type: "grounder" | "reaper"; // randomly assigning village type as grounder or reaper
  playerHealth: number; // current health points. initially 10
  lastNarrative?: string; // naration of consequences of the game  
  lastDisplay?: string;  // display of consequences of the game when narration is happening 
  gameWon?: boolean; // game won if true
  lastDirection?: string; // recent movement(N,S,E,W)
  blockedMove?: boolean; // If last movement was blocked (some directions not possible)
  lastValleyChoice?: string; // options on valley : negotiate,fight,turn back
}

export type DMEvents = SpeechStateExternalEvent | { type: "CLICK" } | { type: "DONE" };