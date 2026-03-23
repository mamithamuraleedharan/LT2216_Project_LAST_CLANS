import "./style.css";
import { setupButton } from "./dm.ts";

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `


<div class="game-container">
    <h1 class="game-title">LAST CLANS</h1>
    <p class="game-subtitle">A broken world. A chance to rebuild.</p>
 
    <aside id="stats-panel" class="stats-panel">
      <div class="stat-block">
        <span class="stat-label">👤 PLAYER NAME</span>
        <span class="stat-value" id="stat-name">-</span>
      </div>
      <div class="stat-block">
        <span class="stat-label">❤️ HEALTH POINTS</span>
        <span class="stat-value" id="stat-health">10</span>
      </div>
      <div class="stat-block">
        <span class="stat-label">💪 SKILL</span>
        <span class="stat-value" id="stat-skill">-</span>
      </div>
      <div class="stat-block">
        <span class="stat-label">⚔️ EQUIPMENT</span>
        <span class="stat-value" id="stat-equipment">-</span>
      </div>
    </aside>

    <div class="intro_story">
    <div class="story-box">
      <p id="story-line"></p>
    </div>
    <button id="continue-btn" class="continue-button">Continue</button>
  </div>



<div class="player_skills_page">
    <h1 class="skills_title">CHOOSE YOUR SKILL</h1>
    <div class="skills_grid">    
        <div class="skill_box">
            <div class="skill_icon">🕊️</div>
            <h2>DIPLOMAT</h2>
            <p>Master of negotiation and persuasion.</p>
            <p class="skill_drawback">Relies on cooperation from others.</p>
        </div>       
        <div class="skill_box">
            <div class="skill_icon">⚔️</div>
            <h2>FIGHTER</h2>
            <p>Weapon mastery and hand-to-hand combat.</p>
            <p class="skill_drawback">Fighting may escalate conflicts.</p>
        </div>       
    </div>
</div>

<div class="player_equipment_page">
    <h1 class="equipment_title">CHOOSE YOUR EQUIPMENT</h1>
    <div class="skills_grid"> 
        <div class="skill_box"> 
          <div class="skill_icon">🏹</div>
            <h2>BOW AND ARROW</h2>           
        </div>
        <div class="skill_box"> 
            <div class="skill_icon">😷</div>
                <h2>GAS MASK</h2>
        </div>
              
    </div>
</div>
    
<div class="card">
      <button id="counter" type="button"></button>
</div>

</div>

`;

setupButton(document.querySelector<HTMLButtonElement>("#counter")!);