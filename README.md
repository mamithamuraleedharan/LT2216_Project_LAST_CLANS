# LAST CLANS
LAST CLANS is a voice-controlled post-apocalyptic survival adventure game inspired from a series named The 100. 

## Story
100 years after a nuclear apocalypse, humanity survives in a failing space station. The player is sent to explore Earth's surface, but your space ship crashes. With your radio broken, you must reach Bunker Zero (A bunker where there might be survivors) to contact Exodus
But, Earth is not empty.There are different clans of people who survived the apocalypse. Some may help. Others will attack.

Your mission : Survive. Reach Bunker Zero.

## Play the pre-deployed game
Link : [Game](https://dev.clasp.gu.se/mltgpuweb/gusmamitmu/)

## Demo Recording
Link : [Recording](https://github.com/mamithamuraleedharan/LT2216_Project_LAST_CLANS/tree/main/Demo%20Recording)

## Presentation 
Link : [Presentation](https://github.com/mamithamuraleedharan/LT2216_Project_LAST_CLANS/blob/main/Presentation.pdf)

## Setup to run locally

1. Install all dependencies:
   ```bash
   npm install
   npm install xstate
   npm install speechstate@latest
   npm install @statelyai/inspect
    ```
3. Create a file called azure.ts in src/ folder:

4. Add the following content inside:
   ```typescript
   export const KEY = "YOUR_AZURE_SPEECH_KEY";
   export const NLU_KEY = "YOUR_NLU_KEY";
    ```
5. Run the development local server in Code directory
   ```bash
   npm run dev
   ```
6. Open in browser
   
7. Allow access to your microphone.
   
## How to play

1. Click **IDLE** button to start the game.
2. Say your name when asked.
3. Listen to the intro story.
4. Choose your **skill** : Say "Diplomat" or "Fighter"
5. Choose your **equipment** : Say "Bow and Arrow" or "Gas Mask"
6. Navigate using voice by saying the directions eg:  "Go East", "I would like to go North" etc
7. Watch your health points. If you reach 0 HP, you lose.
8. Find Bunker Zero to win.

## Technologies Used

1. HTML + CSS
2. TypeScript
3. SpeechState
4. XState
5. SSML
6. Azure NLU
