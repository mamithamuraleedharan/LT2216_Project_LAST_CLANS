import { assign, createActor, setup } from "xstate";
import type { Settings } from "speechstate";
import { speechstate } from "speechstate";
import { createBrowserInspector } from "@statelyai/inspect";
import { KEY, NLU_KEY } from "./azure";
import type { DMContext, DMEvents } from "./types";
import * as sdk from "microsoft-cognitiveservices-speech-sdk";

const inspector = createBrowserInspector();
const speechConfig = sdk.SpeechConfig.fromSubscription(KEY, "switzerlandnorth");
const azureCredentials = {
  endpoint:
    "https://switzerlandnorth.api.cognitive.microsoft.com/sts/v1.0/issuetoken",
  key: KEY,
};

const azureLanguageCredentials = {
  endpoint: "https://languageresourceswitz1318.cognitiveservices.azure.com/language/:analyze-conversations?api-version=2024-11-15-preview",
  key: NLU_KEY ,
  deploymentName: "project" ,
  projectName: "Project",
};

const settings: Settings = {
  azureLanguageCredentials: azureLanguageCredentials,  
  azureCredentials: azureCredentials,
  azureRegion: "switzerlandnorth",
  asrDefaultCompleteTimeout: 0,
  asrDefaultNoInputTimeout: 5000, 
  locale: "en-US",
  ttsDefaultVoice: "en-GB-SoniaNeural",
};

interface GrammarEntry {
  playerSkill?: string;
  playerEquipment?: string;
  direction?: string;
  valleyAction?: string;
}

const grammar: { [index: string]: GrammarEntry } = {
  //grammar for player's skills
  diplomat:{playerSkill:"DIPLOMAT"},
  fighter:{playerSkill:"FIGHTER"},
  // grammar for player's equipment
  bow:{playerEquipment:"BOW AND ARROW"},
  arrow:{playerEquipment:"BOW AND ARROW"},
  bowandarrow:{playerEquipment:"BOW AND ARROW"},
  gas:{playerEquipment:"GAS MASK"},
  mask:{playerEquipment:"GAS MASK"},
  gasmask:{playerEquipment:"GAS MASK"},
  //grammar for directions
  north:{direction:"NORTH"},
  south:{direction:"SOUTH"},
  east:{direction:"EAST"},
  west:{direction:"WEST"},
  // grammar for options at valley
  negotiate: {valleyAction : "NEGOTIATE"},
  talk :{valleyAction : "NEGOTIATE"},
  back :{valleyAction : "BACK"},
  turn :{valleyAction : "BACK"},
  turnback : {valleyAction : "BACK"},
  fight :{valleyAction : "FIGHT"},
  
  
};
//function looks for the keyword in dictionary
function getSkills(utterance: string) {
  return (grammar[utterance.toLowerCase()] || {}).playerSkill;
}
//this function looks for known keyword in sentence(utterance of user) when it sees it calles above function
function getSkillsFromSentence(utterance: string) {
  for (const skill of ["diplomat", "fighter"]) {
    if (utterance.toLowerCase().includes(skill)) 
      return getSkills(skill);
  }
  return undefined;
}
//function looks for the keyword in dictionary
function getEquipments(utterance: string) {
  return (grammar[utterance.toLowerCase()] || {}).playerEquipment;
}
//this function looks for known keyword in sentence(utterance of user) when it sees it calles above function
function getEquipmentsFromSentence(utterance: string) {
  for (const e of ["bow","arrow","bowandarrow","gas","mask","gasmask"]) {
    if (utterance.toLowerCase().includes(e)) 
      return getEquipments(e);
  }
  return undefined;
}
//function looks for the keyword in dictionary
function getDirection(utterance: string) {
  return (grammar[utterance.toLowerCase()] || {}).direction;
}
//this function looks for known keyword in sentence(utterance of user) when it sees it calles above function
function getDirectionFromSentence(utterance: string) {
  for (const direction of ["north","south","east","west"]) {
    if (utterance.toLowerCase().includes(direction)) 
      return getDirection(direction);
  }
  return undefined;
}
//function looks for the keyword in dictionary
function getValleyAction(utterance: string) {
  return (grammar[utterance.toLowerCase()] || {}).valleyAction;
}
//this function looks for known keyword in sentence(utterance of user) when it sees it calles above function
function getValleyActionFromSentence(utterance: string) {
  for (const act of ["negotiate", "talk", "fight", "back", "turnback","turn"]) {
    if (utterance.toLowerCase().includes(act)) 
      return getValleyAction(act);
  }
  return undefined;
}
let introTimersStarted = false; 
let currentTimers: number[] = []; 

let currentAudio: HTMLAudioElement | null = null; // stores which audio is currently being played.
//function for adding background music for the game
function playLocationAudio(file: string) {//exit if current audio is playing and not paused
  if (currentAudio && currentAudio.src.includes(file) && !currentAudio.paused) 
    return;

  if (currentAudio){
    currentAudio.pause(); // stop the audio tats being played
    currentAudio = null; //clear 
  }
  const audio = new Audio(`/${file}`); //load audio file
  audio.volume = 0.4;
  audio.loop = true;
  audio.play().catch((err) => console.log("Audio failed:", err));
  currentAudio = audio;
}
// function to stop audio if something is being played
function stopLocationAudio() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
}
// main audio
function playBackgroundAudio() {
  playLocationAudio("audio1.mp3");
}

//function for different outcomes based on each variables
function getOutcome(
  //inputs
  location:string,
  skill:string,
  equipment:string,
  villageType:string,
  valleyChoice?: string
): 
{ //outputs
  hp:number; 
  spoken:string; 
  display:string; 
  win?:boolean } 
  {

  //winning case - if you reach bunker 0
  if (location === "bunker0") {
    return {
      hp: 0,
      spoken: "You reached Bunker Zero. You contact Exodus. Humanity is saved.",
      display: "You reached Bunker Zero.\n\nYou contact Exodus.\n\nHumanity is saved.",
      win: true,
    };
  }
  //start location
  if (location === "landing_module") {
    return {
      hp: 0,
      spoken: "Back at the crash site. Four paths before you. Choose wisely.",
      display: "Back at the crash site.\n\nFour paths before you.\n\nChoose wisely.",
    };
  }
  
  if (location === "radiation") {
    if (equipment === "GAS MASK") {
      return {
        hp: 0,
        spoken: "The radiation zone. Your mask filters the toxic air. You cross safely. No damage.",
        display: "☢️ The Radiation Zone.\n\nYour mask filters the toxic air.\n\nYou cross safely.\n\nNo damage.",
      };
    } else {
      return {
        hp: -3,
        spoken: "The radiation zone. Toxic air with no protection. You struggle to breathe and push through. You feel weakened.",
        display: "☢️ The Radiation Zone.\n\nToxic air. No protection.\n\nYou struggle to breathe.\n\nYou feel weakened. 💔",
      };
    }
  }
  
  if (location === "village1" || location === "village2") {
    if (villageType === "grounder") {
      if (skill === "DIPLOMAT") {
        return {
          hp: 3,
          spoken: "A grounder village. You are a diplomat. You raise your hands in peace. They lower their weapons and offer food and shelter. You feel stronger.",
          display: "🏘️ A Grounder Village.\n\nYou raise your hands in peace.\n\nThey lower their weapons.\n\nFood and shelter are offered.\n\nYou feel stronger. ❤️",
        };
      } else {
        return {
          hp: 0,
          spoken: "A grounder village. Peaceful, but you are a fighter. They eye you warily but let you rest. No change.",
          display: "🏘️ A Grounder Village.\n\nPeaceful, but you are a fighter.\n\nThey eye you warily and let you rest.\n\nNo change.",
        };
      }
    } else {
      if (skill === "DIPLOMAT") {
        return {
          hp: -4,
          spoken: "A reaper village. You are a diplomat. They do not negotiate. You try to speak but they drive you away. You barely escape. You feel weakened.",
          display: "💀 A Reaper Village.\n\nYou are a diplomat.\n\nThey do not negotiate.\n\nYou try to speak. They drive you away.\n\nYou barely escape. 💔💔",
        };
      } else {
        return {
          hp: -2,
          spoken: "A reaper village. You are a fighter. You stand your ground. They back off, but not before leaving their mark. You feel weakened.",
          display: "💀 A Reaper Village.\n\nYou stand your ground.\n\nThey back off , but leave their mark.\n\nYou feel weakened. 💔",
        };
      }
    }
  }
  
  if (location === "forest") {
    return {
      hp: 2,
      spoken: "You reach the forest. Wild berries grow along the path. You eat well. You feel your strength returning.",
      display: "🌿 The Forest.\n\nWild berries grow along the path.\n\nYou eat well.\n\nYou feel your strength returning. ❤️",
    };
  }
  
  if (location === "crocodile") {
    if (skill === "FIGHTER" && equipment === "BOW AND ARROW") {
      return {
        hp: 0,
        spoken: "A pond with a crocodile. You keep your distance and hold your ground. It retreats. No damage.",
        display: "🐊 The Crocodile Pond.\n\nYou keep your distance and hold your ground.\n\nIt retreats.\n\nNo damage.",
      };
    }
    if ((skill === "DIPLOMAT" && equipment === "BOW AND ARROW") || (skill === "FIGHTER" && equipment === "GAS MASK")) {
      return {
        hp: -2,
        spoken: "A pond with a crocodile. You struggle to hold your ground. It gets too close before retreating. You feel weakened.",
        display: "🐊 The Crocodile Pond.\n\nYou struggle to hold your ground.\n\nIt gets too close before retreating.\n\nYou feel weakened. 💔",
      };
    }
    if (skill === "DIPLOMAT" && equipment === "GAS MASK") {
      return {
        hp: -5,
        spoken: "A pond with a crocodile. You have no way to defend yourself. It charges and you barely get away. You feel severely weakened.",
        display: "🐊 The Crocodile Pond.\n\nYou have no way to defend yourself.\n\nIt charges. You barely get away.\n\nYou feel severely weakened. 💔💔💔",
      };
    }
  }

  if (location === "pond") {
    return {
      hp: 1,
      spoken: "A clear pond. You drink the cool water carefully. Energy restored.",
      display: "💧 A Clear Pond.\n\nYou drink the cool water carefully.\n\nEnergy restored. ❤️",
    };
  } 
    // valley with different options
    if (location === "valley") {
      const choice = valleyChoice;
      
      if (choice === "NEGOTIATE") {
        if (skill === "DIPLOMAT") {
          return {
            hp: 1,
            spoken: "You negotiate skillfully. The stranger shares food and lets you pass. You feel a little stronger.",
            display: "You negotiate skillfully.\n\nThe stranger shares food and lets you pass.\n\nYou feel a little stronger. ❤️",
          };
        } else {
          return {
            hp: 0,
            spoken: "You have nothing to offer. The stranger steps aside warily. No change.",
            display: "You have nothing to offer.\n\nThe stranger steps aside warily.\n\nNo change.",
          };
        }
      }
      
      if (choice === "FIGHT") {
        if (skill === "FIGHTER") {
          return {
            hp: -2,
            spoken: "You confront the stranger. You overpower them  but not without cost. You feel weakened.",
            display: "You confront the stranger.\n\nYou overpower them  but not without cost.\n\nYou feel weakened. 💔",
          };
        } else {
          return {
            hp: -5,
            spoken: "You are no fighter. The confrontation goes badly. You barely make it across. You feel severely weakened.",
            display: "You are no fighter.\n\nThe confrontation goes badly.\n\nYou barely make it across.\n\nYou feel severely weakened. 💔💔💔",
          };
        }
      }
      
      if (choice === "BACK") {
        return {
          hp: 0,
          spoken: "You wisely retreat. Sometimes walking away is the right choice. No damage.",
          display: "You wisely retreat.\n\nSometimes walking away is the right choice.\n\nNo damage.",
        };
      }
    }
  
return {
  hp: 0,
  spoken: "Nothing happens.",
  display: "Nothing happens.",
};
}
//route map of all possible directions user can go from current location
const Map: Record<string, Partial<Record<string, string>>> = {
  landing_module:{NORTH:"radiation", EAST: "village2", WEST: "village1", SOUTH: "forest" },
  radiation: {SOUTH:"landing_module" ,EAST : "valley"},
  village1:{EAST:"landing_module" },
  forest:{NORTH: "landing_module", EAST : "crocodile" },
  village2: {WEST:"landing_module", EAST: "pond",SOUTH : "crocodile", NORTH : "valley"},
  pond: {WEST: "village2", SOUTH: "bunker0"},
  crocodile : {NORTH : "village2", EAST : "bunker0", WEST : "forest"},
  valley : {},
  bunker0:{},
};
// function looks inside Map to decide next location
function getNextLocation(location:string, direction: string | undefined): string | undefined {
  if (!direction) // if direction not in Map, undefined -blocked
    return undefined;
  return (Map[location] || {})[direction];
}
//if UNDEFINED, gives aleert message to try different direction.
function blockedLocation(location: string): string {
  if (location === "radiation") 
    return "The radiation won't let you through. Find another path.";
  if (location === "village1") 
     return "That path doesn't exist. Look again.";
  if (location === "forest")    
    return "That path leads deeper into danger.";  
  if (location === "village2") 
    return "Dead end. Try another way.";
  if (location === "crocodile") 
    return "You can't go that way.";
  if (location === "pond") 
    return "Try another way";
  if (location === "valley")
    return "You must deal with the stranger first.";
  
  return "That direction is blocked. Try another way.";
}

//XSTATE MACHINE

const dmMachine = setup({
  types: {
    context: {} as DMContext,
    events:  {} as DMEvents,
  },
  actions: {
    "spst.speak": ({ context }, params: { utterance: string }) =>
      context.spstRef.send({ type: "SPEAK", value: { utterance: params.utterance } }),
    "spst.listen": ({ context }) =>
      context.spstRef.send({ type: "LISTEN" }),
    "azure.speakSSML": ({ self }, params: { ssml: string }) => {
      const synthesizer = new sdk.SpeechSynthesizer(speechConfig);
      synthesizer.speakSsmlAsync(params.ssml, (result) => {
        if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
          console.log("SSML ok");
          self.send({ type: "SPEAK_COMPLETE" });
        } else {
          console.error("SSML failed:", result.errorDetails);
        }
        synthesizer.close();
      });
    },
  },
}).createMachine({
  context: ({ spawn }) => ({
    spstRef: spawn(speechstate, { input: settings }),
    interpretation: null,
    lastResult: null,
    playerName: undefined,
    playerSkill: undefined,
    playerEquipment: undefined,
    currentLocation: "landing_module",
    village1Type: "grounder" as "grounder" | "reaper",
    village2Type: "grounder" as "grounder" | "reaper",
    playerHealth: 10,
    lastValleyChoice: undefined,
  }),
  id: "DM",
  initial: "Prepare",
  states: {

    Prepare: {
      entry: ({ context }) => context.spstRef.send({ type: "PREPARE" }),
      on: { ASRTTS_READY: "WaitToStart" },
    },
    WaitToStart: {
      on: { CLICK: "askName" },
    },
  
//state to ask player name
askName: {
  initial: "Prompt",
  on: {
    LISTEN_COMPLETE: [
      { target: "confirmName", 
        guard: ({ context }) => !!context.playerName },
      { target: ".NoInput" },
    ],
  },
  states: {
    Prompt: {
      entry: { 
        type: "spst.speak", 
        params: { utterance: "Welcome to Last Clans. I am Hope. Your navigator. What can I call you? " } 
      },
      on: { SPEAK_COMPLETE: "Ask" },
    },
    NoInput: {
      entry: { 
        type: "spst.speak", 
        params: { utterance: "Sorry, I can't hear you! Please say your name." } 
      },
      on: { SPEAK_COMPLETE: "Ask" },
    },
    Ask: {
      entry: ({ context }) => context.spstRef.send({
        type: "LISTEN",
        value: { nlu: true }  
      }),
      on: {
        RECOGNISED: {
          actions: assign(({ event }) => {
            const rawUtterance = event.value[0].utterance;

            const nameEntity = (event.nluValue?.entities || []).find(
              (e: any) => e.category === "playerName"
            );

            const playerName = nameEntity?.text || rawUtterance;

            console.log("Raw utterance:", rawUtterance);
            console.log("Extracted name:", playerName);

            return { playerName: playerName };
          }),
        },
        ASR_NOINPUT: { 
          actions: assign({ lastResult: null }) 
        },
      },
    },
  },
},
    //state to confirm name
    confirmName: {
      entry: {
        type: "spst.speak",
        params: ({ context }) => 
          ({ utterance: `${context.playerName}. I'll remember that. Let's get started.` }),
      },
      on: { SPEAK_COMPLETE: "Introduction" },
    },
    //introduction state to explain the story
    Introduction: {
      entry: [
        () => playBackgroundAudio(),
        {
          type: "azure.speakSSML",
          params: {
            ssml: `<!--ID=B7267351-473F-409D-9765-754A8EBCDE05;Version=1|{"VoiceNameToIdMapItems":[{"Id":"f1b99834-fbfc-4d32-846d-c4dbd3050c19","Name":"Microsoft Server Speech Text to Speech Voice (en-GB, OllieMultilingualNeural)","ShortName":"en-GB-OllieMultilingualNeural","Locale":"en-GB","VoiceType":"StandardVoice"}]}-->
            <!--ID=5B95B1CC-2C7B-494F-B746-CF22A0E779B7;Version=1|{"Locales":{"de-DE":{"AutoApplyCustomLexiconFiles":[{}]},"en-GB":{"AutoApplyCustomLexiconFiles":[{}]},"en-US":{"AutoApplyCustomLexiconFiles":[{}]}}}-->
            <speak xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="http://www.w3.org/2001/mstts" xmlns:emo="http://www.w3.org/2009/10/emotionml" version="1.0" xml:lang="en-GB"><voice name="en-GB-OllieMultilingualNeural"> <lang xml:lang="en-GB"><prosody pitch="-5.00%">      100 years after a nuclear apocalypse, humanity survives in space<break time="800ms" />aboard Exodus, a failing space station.<break time="1000ms" /></prosody>
            </lang><mstts:express-as style="narration-professional">You are sent from Exodus to explore the surface.<break time="800ms" /></mstts:express-as>
            <mstts:express-as style="terrified"><emphasis level="strong"><prosody volume="loud" pitch="+5.00%">But your ship crashes!</prosody><break time="500ms" />Your radio is broken.<break time="1000ms" /></emphasis></mstts:express-as><mstts:express-as style="narration-professional"><prosody pitch="-3.00%">You must reach Bunker Zero to contact Exodus.</prosody></mstts:express-as>
            <prosody pitch="-3.00%"></prosody><mstts:express-as style="narration-professional"><prosody pitch="-5.00%"> But Earth is not empty.<break time="600ms" /> Clans have survived the apocalypse.<break time="800ms" />Some may help.<break time="400ms" />Others may not.<break time="1000ms" /></prosody></mstts:express-as><mstts:express-as style="hopeful"><prosody pitch="+2.00%">You have one mission:<break time="500ms" /><emphasis level="strong">Survive. Find help. Reach Bunker Zero.</emphasis><break time="1000ms" /></prosody></mstts:express-as>      <mstts:express-as style="narration-professional">Your journey begins now.</mstts:express-as></voice></speak>`,
          },
        },
      ],
      on: { SPEAK_COMPLETE: "WaitingForContinue" },
    },
    //state to move to next state when clicked on continue button
    WaitingForContinue: {
      on: { CLICK: "playerSkillSelection" },
    },
    //state to select skill from 2 option
    playerSkillSelection: {
      initial: "Prompt",
      on: {
        LISTEN_COMPLETE: [
          { target: "CheckGrammarForSkills",
             guard: ({ context }) => !!context.lastResult },
          { target: ".NoInput" },
        ],
      },
      states: {
        Prompt: {
          entry: { type: "spst.speak",
          params: { utterance: "Before I guide you out there, I need to know who you are and your strengths. Are you a Diplomat or a Fighter?" } },
          on: { SPEAK_COMPLETE: "Ask" },
        },
        NoInput: {
          entry: { type: "spst.speak", 
          params: { utterance: "Sorry, I can't hear you!" } },
          on: { SPEAK_COMPLETE: "Ask" },
        },
        Ask: {
          entry: { type: "spst.listen" },
          on: {
            RECOGNISED: {
              actions: assign(({ event }) => {
                const utterance = event.value[0].utterance;
                return { 
                  lastResult: event.value, 
                  playerSkill: getSkillsFromSentence(utterance) };
              }),
            },
            ASR_NOINPUT: { 
              actions: assign({ lastResult: null }) },
          },
        },
      },
    },
    // state to check grammar
    CheckGrammarForSkills: {
      entry: {
        type: "spst.speak",
        params: ({ context }) => ({
          utterance: context.playerSkill
            ? `You chose ${context.playerSkill}! Great choice!`
            : "Sorry, I didn't recognise that. Please say Diplomat or Fighter.",
        }),
      },
      on: {
        SPEAK_COMPLETE: [
          { target: "playerEquipmentSelection",
             guard: ({ context }) => !!getSkillsFromSentence(context.lastResult![0].utterance) },
          { target: "playerSkillSelection.Prompt" },
        ],
      },
    },
    // state to select equipments
    playerEquipmentSelection: {
      initial: "Prompt",
      on: {
        LISTEN_COMPLETE: [
          { target: "CheckGrammarForEquipment", 
            guard: ({ context }) => !!context.lastResult },
          { target: ".NoInput" },
        ],
      },
      states: {
        Prompt: {
          entry: { type: "spst.speak", 
          params: { utterance: "Your equipment could save you out there. Bow and Arrow or Gas Mask. Whats your pick?" } },
          on: { SPEAK_COMPLETE: "Ask" },
        },
        NoInput: {
          entry: { type: "spst.speak", 
          params: { utterance: "Sorry, I can't hear you! Say Bow and Arrow or Gas Mask." } },
          on: { SPEAK_COMPLETE: "Ask" },
        },
        Ask: {
          entry: { type: "spst.listen" },
          on: {
            RECOGNISED: {
              actions: assign(({ event }) => {
                const utterance = event.value[0].utterance;
                return { 
                  lastResult: event.value, 
                  playerEquipment: getEquipmentsFromSentence(utterance) };
              }),
            },
            ASR_NOINPUT: { 
              actions: assign({ lastResult: null }) },
          },
        },
      },
    },
// check grammar for equipments
CheckGrammarForEquipment: {
  entry: {
    type: "spst.speak",
    params: ({ context }) => ({
      utterance: context.playerEquipment
        ? `${context.playerEquipment}. Out there, that choice could mean everything. Let's find out.`
        : "Sorry, I didn't recognise that.",
    }),
  },
  on: {
    SPEAK_COMPLETE: [
      { target: "startLocation", 
        guard: ({ context }) => !!getEquipmentsFromSentence(context.lastResult![0].utterance) },
      { target: "playerEquipmentSelection.Prompt" },
    ],
  },
},

//state for starting location - landing module. 
startLocation: {
  entry: [
    () => console.log("SSML playing"),
    {
      type: "azure.speakSSML",
      params: {
        ssml: `<!--ID=B7267351-473F-409D-9765-754A8EBCDE05;Version=1|{"VoiceNameToIdMapItems":[{"Id":"4b1dc409-f234-45cf-bda5-852fa95d0e5f","Name":"Microsoft Server Speech Text to Speech Voice (en-GB, SoniaNeural)","ShortName":"en-GB-SoniaNeural","Locale":"en-GB","VoiceType":"StandardVoice"}]}-->
        <!--ID=FCB40C2B-1F9F-4C26-B1A1-CF8E67BE07D1;Version=1|{"Files":{}}-->
        <!--ID=5B95B1CC-2C7B-494F-B746-CF22A0E779B7;Version=1|{"Locales":{"en-GB":{"AutoApplyCustomLexiconFiles":[{}]}}}-->
        <speak xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="http://www.w3.org/2001/mstts" xmlns:emo="http://www.w3.org/2009/10/emotionml" version="1.0" xml:lang="en-GB"><voice name="en-GB-SoniaNeural">  You are at the crash site<emphasis level="strong">. <break time="1000ms" />
        </emphasis>To the <emphasis level="moderate">North</emphasis>, you see a glowing red haze.<break time="400ms" />   <break time="800ms" />To the <emphasis level="moderate">East</emphasis>, you spot wooden watchtowers in the distance.<break time="400ms" /> To the <emphasis level="moderate">West</emphasis>, you hear sounds.
         <break time="400ms" /> Could be survivors.<break time="400ms" />Or threats. <break time="800ms" />
         To the <emphasis level="moderate">South</emphasis>, you see dense forest.<break time="400ms" />
          <prosody pitch="+1.00%">     Where do you want to go first?<break time="600ms" /> </prosody></voice></speak>`,
      },
    },
  ],
  on: { SPEAK_COMPLETE: "WaitingForDirection" },
},

//continue button
WaitingForDirection: {
  on: { CLICK: "askDirection" },
},

//state for asking direction 
askDirection: {
  initial: "Prompt",
  on: {
    LISTEN_COMPLETE: [
      { target: "gameMovement", 
        guard: ({ context }) => !!context.lastResult },
      { target: ".NoInput" },
    ],
  },
  states: {
    Prompt: {
      entry: {
        type: "spst.speak",
        params: ({ context }) => ({
          utterance:
        context.currentLocation === "landing_module"
        ? "Choose a direction."   
        :context.currentLocation === "radiation"
        ? "The radiation burns. You need to move quickly. Which direction do you go?"      
        : context.currentLocation === "village1"
        ? "You are at the edge of the village. Which way?"   
        : context.currentLocation === "village2"
        ? "You've made it this far. Don't get comfortable. Which direction?"      
        : context.currentLocation === "forest"
        ? "The forest surrounds you. You hear sounds nearby. Which direction do you take?"     
        : context.currentLocation === "crocodile"
        ? "You survived the pond. Barely. Which way do you go?"     
        : context.currentLocation === "pond"
        ? "Still water. Fresh air. But you can't stay. Which way? "     
        : "Which direction do you go?"
        }),
      },
      on: { SPEAK_COMPLETE: "Ask" },
    },
    NoInput: {
      entry: { type: "spst.speak", 
        params: { utterance: "Sorry, I can't hear you! Please say a direction." } },
      on: { SPEAK_COMPLETE: "Ask" },
    },
    Ask: {
      entry: [
        () => console.log("Testing"),
        { type: "spst.listen" },
      ],
      on: {
        RECOGNISED: {
          actions: assign(({ event }) => {
            console.log("Uttered:", event.value[0].utterance);
            return { lastResult: event.value };
          }),
        },
        ASR_NOINPUT: { actions: assign({ lastResult: null }) },
      },
    },
  },
},
//state for movement
gameMovement: {
  entry: assign(({ context }) => {
    const utterance = context.lastResult![0].utterance;
    const direction = getDirectionFromSentence(utterance);//gets direction from utternce
    const newLocation = getNextLocation(context.currentLocation,direction); //calling function to look inside Map for next location

    const newVillage1Type = newLocation === "village1"
    ? (Math.random() > 0.5 ? "grounder" : "reaper")
    : context.village1Type;
  
  const newVillage2Type = newLocation === "village2"
    ? (Math.random() > 0.5 ? "grounder" : "reaper")
    : context.village2Type;
  
  return {
    currentLocation: newLocation ?? context.currentLocation,
    lastDirection: direction,
    blockedMove: newLocation === undefined,
    village1Type: newVillage1Type, //random
    village2Type: newVillage2Type,//random
  };
   
  }),
  always: [
    { target: "InvalidDirection", 
      guard: ({ context }) => !getDirectionFromSentence(context.lastResult![0].utterance) },
    { target: "BlockedDirection", 
      guard: ({ context }) => (context as any).blockedMove === true },
      { target: "askValleyChoice", 
        guard: ({ context }) => context.currentLocation === "valley" },
    { target: "LocationOutcome" },
  ],
},
//special state for valley : only proceed if we decide to fight,negotiate or turn back
askValleyChoice: {
  initial: "Prompt",
  on: {
    LISTEN_COMPLETE: [
      { target: "ProcessValleyChoice",
         guard: ({ context }) => !!context.lastResult },
      { target: ".NoInput" },
    ],
  },
  states: {
    Prompt: {
      entry: {
        type: "spst.speak",
        params: { 
          utterance: "A stranger stands in the middle of the bridge. They're armed and blocking your path. This is my bridge, he growls. Pay the toll or turn back. Do you NEGOTIATE, FIGHT, or TURN BACK? Say Negotiate, Fight, or Back." 
        },
      },
      on: { SPEAK_COMPLETE: "Ask" },
    },
    NoInput: {
      entry: {
        type: "spst.speak",
        params: { utterance: "I didn't hear you. Say Negotiate, Fight, or Back." },
      },
      on: { SPEAK_COMPLETE: "Ask" },
    },
    Ask: {
      entry: [
        () => console.log("valley choice"),
        { type: "spst.listen" },
      ],
      on: {
        RECOGNISED: {
          actions: assign(({ event }) => {
            console.log("Uttered checking:", event.value[0].utterance);
            return { lastResult: event.value };
          }),
        },
        ASR_NOINPUT: {
          actions: assign({ lastResult: null }),
        },
      },
    },
  },
},
// gets the choice nd calls the function to check grammar
ProcessValleyChoice: {
  entry: assign(({ context }) => {
    const utterance = context.lastResult![0].utterance;
    const choice = getValleyActionFromSentence(utterance);
 
    return {
      lastValleyChoice: choice,
    };
  }),
  always: [
    { 
      target: "InvalidValleyChoice", 
      guard: ({ context }) => !getValleyActionFromSentence(context.lastResult![0].utterance) 
    },
    { target: "LocationOutcome" },
  ],
},
// invalid choice for valley
InvalidValleyChoice: {
  entry: { 
    type: "spst.speak", 
    params: { utterance: "I didn't understand that. Please say Negotiate, Fight, or Back." } 
  },
  on: { SPEAK_COMPLETE: "askValleyChoice" },
},
//if not able to understand the direction
InvalidDirection: {
  entry: { type: "spst.speak", params: { utterance: "I didn't catch a direction. Please repeat" } },
  on: { SPEAK_COMPLETE: "askDirection" },
},
// if its blocked direction
BlockedDirection: {
  entry: {
    type: "spst.speak",
    params: ({ context }) => ({ utterance: blockedLocation(context.currentLocation) }),
  },
  on: { SPEAK_COMPLETE: "askDirection" },
},
//state for consequences of location 
LocationOutcome: {
  entry: [
    assign(({ context }) => {
      const villageType = context.currentLocation === "village2"
        ? context.village2Type
        : context.village1Type;
//calls getOutcome function and sending all inputs
      const outcome = getOutcome(
        context.currentLocation,
        context.playerSkill!,
        context.playerEquipment!,
        villageType,
        (context as any).lastValleyChoice
      );
// calculates context.playerHealth + outcome.hp. Min and max used to set between 0 and 10. 
      const newHealth = Math.min(10, Math.max(0, context.playerHealth + outcome.hp));
   
      const valleyChoice = (context as any).lastValleyChoice;
      const newLocation = context.currentLocation === "valley"
        ? (valleyChoice === "BACK" ? "radiation" : "pond")
        : context.currentLocation;

      return {
        currentLocation: newLocation,
        playerHealth:    newHealth,
        lastNarrative:   outcome.spoken,
        lastDisplay:     outcome.display,
        gameWon:         outcome.win || false,
      };
    }),
    {
      type: "spst.speak",
      params: ({ context }) => ({ utterance: (context as any).lastNarrative }),
    },
  ],
  on: {
    SPEAK_COMPLETE: [
      { target: "GameWon",
        guard: ({ context }) => (context as any).gameWon === true },
      { target: "GameOver",
        guard: ({ context }) => context.playerHealth <= 0 },
      { target: "AnnounceHealth" },
    ],
  },
},
// state to say health points after each outcome
AnnounceHealth: {
  entry: {
    type: "spst.speak",
    params: ({ context }) => ({
      utterance: `You now have ${context.playerHealth} health points. Press continue to choose your next direction.`,
    }),
  },
  on: { SPEAK_COMPLETE: "WaitingForNextMove" },
},

WaitingForNextMove: {
  on: { CLICK: "askDirection" },
},
// winning state
GameWon: {
  entry: { type: "spst.speak", 
  params: { utterance: "Congratulations! You saved humanity! Press the button to play again." } },
  on: { SPEAK_COMPLETE: "Done" },
},
// game over if HP < 0
GameOver: {
  entry: {
    type: "spst.speak",
    params: ({ context }) => ({
      utterance: `You have died. Game over. Press the button to play again.`,
    }),
  },
  on: { SPEAK_COMPLETE: "Done" },
},

Done: {
  on: { CLICK: "Restart" },
},
// restarting to play again, re-initializing all variables again.
Restart: {
  entry: assign(() => ({
    lastResult:    null,
    playerName:    undefined,
    playerSkill:   undefined,
    playerEquipment: undefined,
    currentLocation: "landing_module",
    village1Type:  "grounder" as "grounder" | "reaper",
    village2Type:  "grounder" as "grounder" | "reaper",  
    playerHealth:  10,
    lastNarrative: undefined,
    lastDisplay:   undefined,
    gameWon:       false,
    blockedMove:   false,
    interpretation: null,
    lastValleyChoice: undefined,
  })),
  always: { target: "askName" },
},
},
});
///////////////////////////////////////////////////
const dmActor = createActor(dmMachine, { inspect: inspector.inspect }).start();

dmActor.subscribe((state) => {
  console.group("State update");
  console.log("State value:", state.value);
  console.log("State context:", state.context);
  console.groupEnd();
});
//list of all background images used in the game
const allBackgrounds = ["story-bg","skill-bg", "equipment-bg","gp1_start_location-bg","village1_grounder-bg","village1_encounter-bg",
  "village2_reaper-bg",   "village2_encounter-bg", "village1_reaper-bg","gp4_final_location-bg", "forest-bg", "radiation-bg","crocodile-bg","pond-bg","valley-bg"];
//function to remove all backgrounds and add just 1
function setLocationBg(container: Element | null, cls: string) {
  allBackgrounds.forEach((c) => container?.classList.remove(c));
  if (cls) 
    container?.classList.add(cls);
}
//function to display text when audio is playing
function showStoryLines(lines: string[], storyLine: HTMLElement | null) {
  if (!storyLine) return;
  
  currentTimers.forEach(id => clearTimeout(id));
  currentTimers = [];
  
  storyLine.classList.remove("visible");

  let delay = 0;
  lines.forEach((line, i) => {
    const timerId = window.setTimeout(() => { 
      storyLine.classList.remove("visible");
      setTimeout(() => {
        storyLine.textContent = line;
        storyLine.classList.add("visible");
      }, i === 0 ? 0 : 600);
    }, delay);
    
    currentTimers.push(timerId); 
    delay += line.length * 55 + 1200; 
  });
}

export function setupButton(element: HTMLButtonElement) {
  element.addEventListener("click", () => dmActor.send({ type: "CLICK" }));

  const continueBtn = document.querySelector<HTMLButtonElement>("#continue-btn");
  if (continueBtn) {
    continueBtn.addEventListener("click", () => {
      console.log("Continue clicked");
      dmActor.send({ type: "CLICK" });
    });
  }
  dmActor.subscribe((snapshot) => {
    const container = document.querySelector<HTMLDivElement>(".game-container");
    const title = document.querySelector<HTMLElement>(".game-title");
    const subtitle  = document.querySelector<HTMLElement>(".game-subtitle");
    const intro = document.querySelector<HTMLElement>(".intro_story");
    const conBtn = document.querySelector<HTMLElement>("#continue-btn");
    const card = document.querySelector<HTMLElement>(".card");
    const skillsPage = document.querySelector<HTMLElement>(".player_skills_page");
    const equipmentPage = document.querySelector<HTMLElement>(".player_equipment_page");
    const storyLine = document.getElementById("story-line");

    const nameEl   = document.getElementById("stat-name");
    const healthEl = document.getElementById("stat-health");
    const skillEl  = document.getElementById("stat-skill");
    const equipEl  = document.getElementById("stat-equipment");
    // Stats bar update with health points etc

    if (nameEl)   
      nameEl.textContent   = snapshot.context.playerName || "NA";
    if (healthEl) 
      healthEl.textContent = snapshot.context.playerHealth.toString();
    if (skillEl)  
      skillEl.textContent  = snapshot.context.playerSkill || "NA";
    if (equipEl)  
      equipEl.textContent  = snapshot.context.playerEquipment || "NA";
    
    if (snapshot.matches("Introduction")) {
      setLocationBg(container, "story-bg");
      title?.classList.add("hiding-title");
      subtitle?.classList.add("hiding-title");
      intro?.classList.add("visible");
      card?.classList.add("hidden");
      conBtn?.classList.add("visible");

    if (!introTimersStarted) {
        introTimersStarted = true;
        const lines = [
          "100 years after a nuclear apocalypse, humanity survives in space aboard Exodus, a failing space station.",
          "You are sent from Exodus to explore the surface.",
          "But your ship crashes! Your radio is broken.",
          "You must reach Bunker Zero to contact Exodus.",
          "But Earth is not empty.",
          "Clans have survived the apocalypse.",
          "Some may help. Others may not.",
          "You have one mission: Survive. Find help. Reach Bunker Zero.",
          "Your journey begins now.",
        ];
        
        const delays = [0, 9000, 13500, 21000, 23000, 26500, 32000, 36000, 43000];
        lines.forEach((line, i) => {
          setTimeout(() => {
            if (storyLine) {
              storyLine.classList.remove("visible");
              setTimeout(() => {
                storyLine.textContent = line;
                storyLine.classList.add("visible");
              }, 800);
            }
          }, delays[i]);
        });
      }
    }
    if (snapshot.matches("WaitingForContinue")) conBtn?.classList.add("visible");

    if (snapshot.matches("playerSkillSelection")) {
      setLocationBg(container, "skill-bg");
      intro?.classList.remove("visible");
      conBtn?.classList.remove("visible");
      card?.classList.remove("hidden");
      skillsPage?.classList.add("visible");
    }

    if (snapshot.matches("playerEquipmentSelection")) {
      setLocationBg(container, "equipment-bg");
      skillsPage?.classList.remove("visible");
      equipmentPage?.classList.add("visible");
    }

  if (snapshot.matches("startLocation")) {
  setLocationBg(container, "gp1_start_location-bg");
  equipmentPage?.classList.remove("visible");
  document.getElementById("stats-panel")?.classList.add("visible");
  conBtn?.classList.add("visible");
  
  intro?.classList.add("visible");
  card?.classList.add("hidden");
  
  if (storyLine) {
    storyLine.classList.remove("visible");
    storyLine.textContent = "";
    
    const landingLines = [
      "You are at the crash site.",
      "To the North, you see a glowing red haze.",
      "To the East, you spot wooden watchtowers in the distance.",
      "To the West, you hear sounds. Could be survivors. Or threats.",
      "To the South, you see dense forest.",
      "Where do you want to go first?"
    ];
    
    const delays = [500, 3000, 6500, 12000, 16000, 20000];    
    landingLines.forEach((line, i) => {
      setTimeout(() => {
        if (storyLine) {
          storyLine.classList.remove("visible");
          setTimeout(() => {
            storyLine.textContent = line;
            storyLine.classList.add("visible");
          }, 800); 
        }
      }, delays[i]);
    });
  }
}

    if (snapshot.matches("WaitingForDirection")) conBtn?.classList.add("visible");
    if (snapshot.matches("askDirection"))        conBtn?.classList.remove("visible");

    if (snapshot.matches("LocationOutcome")) {
      currentTimers.forEach(id => clearTimeout(id));
      currentTimers = [];
    
      if (storyLine) {
        storyLine.classList.remove("visible");
        storyLine.textContent = "";
      }
    
      const display: string = (snapshot.context as any).lastDisplay || "";
    
      intro?.classList.add("visible");
      card?.classList.add("hidden");
    
      if (display) {
        const paragraphs = display.split("\n\n").filter(Boolean);
    
        if (storyLine && paragraphs.length > 0) {
          let delay = 200;
          paragraphs.forEach((para, i) => {
            const id = window.setTimeout(() => {
              if (storyLine) {
                if (i > 0) storyLine.classList.remove("visible");
                setTimeout(() => {
                  storyLine.textContent = para;
                  storyLine.classList.add("visible");
                }, i === 0 ? 0 : 500);
              }
            }, delay);
            currentTimers.push(id);
            delay += para.length * 50 + 1500;
          });
        }
      }
    }

    if (snapshot.matches("AnnounceHealth") || snapshot.matches("WaitingForNextMove")) {
      conBtn?.classList.add("visible");
    }

    if (snapshot.matches("askDirection")) {
      intro?.classList.remove("visible");
      card?.classList.remove("hidden");
    }

    const location = snapshot.context.currentLocation;
    const isGrounder  = snapshot.context.village1Type === "grounder";
    const isGrounder2 = snapshot.context.village2Type === "grounder";
    
    if (location === "village1") {
      if (snapshot.matches("LocationOutcome")) {
        setLocationBg(container, isGrounder ? "village1_grounder-bg" : "village2_reaper-bg");
      } else if (
        snapshot.matches("AnnounceHealth")     ||
        snapshot.matches("WaitingForNextMove") ||
        snapshot.matches("askDirection")       ||
        snapshot.matches("BlockedDirection")   ||
        snapshot.matches("InvalidDirection")
      ) {
        setLocationBg(container, isGrounder ? "village1_encounter-bg" : "village2_encounter-bg");
        stopLocationAudio();
        playLocationAudio(isGrounder ? "audio_grounders.mp3" : "audio_reapers.mp3"); 

      }
    
    } else if (location === "village2") {
      if (snapshot.matches("LocationOutcome")) {
        setLocationBg(container, isGrounder2 ? "village1_grounder-bg" : "village2_reaper-bg");
        stopLocationAudio();
        playLocationAudio(isGrounder2 ? "audio_grounders.mp3" : "audio_reapers.mp3"); 

      } else if (
        snapshot.matches("AnnounceHealth")     ||
        snapshot.matches("WaitingForNextMove") ||
        snapshot.matches("askDirection")       ||
        snapshot.matches("BlockedDirection")   ||
        snapshot.matches("InvalidDirection")
      ) {
        setLocationBg(container, isGrounder2 ? "village1_encounter-bg" : "village2_encounter-bg");
      }
    
    } else if (
      snapshot.matches("LocationOutcome")    ||
      snapshot.matches("WaitingForNextMove") ||
      snapshot.matches("AnnounceHealth")     ||
      snapshot.matches("askDirection")       ||
      snapshot.matches("BlockedDirection")   ||
      snapshot.matches("InvalidDirection")
    ) {
      if (location === "bunker0") {  
        stopLocationAudio();  
        setLocationBg(container, "gp4_final_location-bg");
        playLocationAudio("audio_bunker.mp3");

      }
      
      else if (location === "forest") {        
        setLocationBg(container, "forest-bg");
        stopLocationAudio();
        playLocationAudio("audio_forest.mp3");
      }
      
      else if (location === "radiation") {
        if (snapshot.matches("LocationOutcome") && (snapshot.context as any).lastValleyChoice) {
          setLocationBg(container, "valley-bg");
          playLocationAudio("audio_valley.mp3");
        } else {
          setLocationBg(container, "radiation-bg");
          stopLocationAudio();
          playLocationAudio("audio_radiation.mp3");
        }
      }
      
      else if (location === "landing_module") {
        setLocationBg(container, "gp1_start_location-bg");
        stopLocationAudio();
        playLocationAudio("audio_radiation.mp3");

      }
      else if (location === "valley") {
        setLocationBg(container, "valley-bg");
        stopLocationAudio();
        playLocationAudio("audio_valley.mp3");}
      
      else if (location === "crocodile") {     
        setLocationBg(container, "crocodile-bg");
        stopLocationAudio();
        playLocationAudio("audio_crocodile.mp3");}
        
        else if (location === "pond") {
          if (snapshot.matches("LocationOutcome") && (snapshot.context as any).lastValleyChoice) {
            setLocationBg(container, "valley-bg");
            playLocationAudio("audio_valley.mp3");
          } else {
            setLocationBg(container, "pond-bg");
            stopLocationAudio();
            playLocationAudio("audio_pond.mp3");
          }
        }
      }

    if (snapshot.matches("Done")) {
      const isWin = (snapshot.context as any).gameWon === true;
      if (storyLine) {
        storyLine.classList.remove("visible");
        setTimeout(() => {
          storyLine.textContent = isWin
            ? "🏆 YOU WON\n\nHumanity lives on because of you.\n\nPress Play Again to start a new journey."
            : "💀 GAME OVER\n\nYou fought bravely. But the world was not ready.\n\nPress Play Again to try again.";
          storyLine.classList.add("visible");
        }, 400);
      }
      intro?.classList.add("visible");
      conBtn?.classList.add("visible");
      if (conBtn) conBtn.textContent = "Play Again";
    }

    if (snapshot.matches("askName")) {
      introTimersStarted = false;
      if (conBtn) conBtn.textContent = "Continue";
      document.getElementById("stats-panel")?.classList.remove("visible");
      skillsPage?.classList.remove("visible");
      equipmentPage?.classList.remove("visible");
      intro?.classList.remove("visible");
      title?.classList.remove("hiding-title");
      subtitle?.classList.remove("hiding-title");
      if (storyLine) { storyLine.textContent = ""; storyLine.classList.remove("visible"); }
      setLocationBg(container, "");
    }
    if (snapshot.matches("askValleyChoice")) {
      intro?.classList.add("visible");
      card?.classList.remove("hidden"); 
      conBtn?.classList.remove("visible");
      setLocationBg(container, "valley-bg");
      stopLocationAudio();
      playLocationAudio("audio_valley.mp3");

      if (storyLine) {
        const valleyLines = [
          "A stranger stands in the middle of the bridge.",
          "They're armed and blocking your path.",
          "'This is MY bridge,' they growl.",
          "'Pay the toll or turn back.'",
          "Do you NEGOTIATE, FIGHT, or TURN BACK?"
        ];
        
        showStoryLines(valleyLines, storyLine);
      }
    }
    const meta: { view?: string } = Object.values(
      snapshot.context.spstRef.getSnapshot().getMeta()
    )[0] || { view: undefined };
    element.innerHTML = `${meta.view}`;
  });
}
