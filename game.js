/**
 * Timeline Family Game (Parents vs. Kids) • Game Engine
 * 37th Wedding Anniversary Interactive Experience
 */

(function () {
  'use strict';

  // State
  let masterDeck = [];
  let drawDeck = [];
  let timelineCards = [];
  let currentCard = null;
  let isChecking = false;
  let isCardActivated = false;
  let isAudioPlaying = false;
  
  // Game Configuration
  let gameConfig = {
    mode: 'parents_vs_kids', // 'parents_vs_kids' | 'couples' | 'solo'
    targetCards: 37,
    team1Name: 'ההורים (חיים וזהבית)',
    team2Name: 'הילדים',
    currentTeam: 1, // 1 or 2
    scores: { 1: 0, 2: 0 }
  };

  // DOM Elements
  const elements = {
    // Setup Modal
    setupModal: document.getElementById('setupModal'),
    startBtn: document.getElementById('startBtn'),
    modeOptions: document.querySelectorAll('.mode-option'),
    targetOptions: document.querySelectorAll('.target-option'),
    
    // Status Bar
    progressBar: document.getElementById('progressBar'),
    progressCount: document.getElementById('progressCount'),
    targetDisplay: document.getElementById('targetDisplay'),
    team1Pill: document.getElementById('team1Pill'),
    team2Pill: document.getElementById('team2Pill'),
    team1Name: document.getElementById('team1Name'),
    team2Name: document.getElementById('team2Name'),
    team1Score: document.getElementById('team1Score'),
    team2Score: document.getElementById('team2Score'),
    
    // Turn Banner
    turnBanner: document.getElementById('turnBanner'),
    turnText: document.getElementById('turnText'),
    
    // Mystery Cinema Stage
    stageCardItem: document.getElementById('stageCardItem'),
    stageCategory: document.getElementById('stageCategory'),
    stagePrompt: document.getElementById('stagePrompt'),
    stageInstructions: document.getElementById('stageInstructions'),
    activateCardBtn: document.getElementById('activateCardBtn'),
    activateBtnText: document.getElementById('activateBtnText'),
    skipCardBtn: document.getElementById('skipCardBtn'),
    coupleTag: document.getElementById('coupleTag'),
    playToggleBtn: document.getElementById('playToggleBtn'),
    nextCardBtn: document.getElementById('nextCardBtn'),
    dragHintPill: document.getElementById('dragHintPill'),
    audioElement: document.getElementById('gameAudio'),
    
    // Timeline
    timelineTrack: document.getElementById('timelineTrack'),
    timelineCountBadge: document.getElementById('timelineCountBadge'),
    
    // Victory Modal
    victoryModal: document.getElementById('victoryModal'),
    victoryTitle: document.getElementById('victoryTitle'),
    victorySubtitle: document.getElementById('victorySubtitle'),
    victoryScore1: document.getElementById('victoryScore1'),
    victoryScore2: document.getElementById('victoryScore2'),
    victoryScoreboard: document.getElementById('victoryScoreboard'),
    exploreAlbumBtn: document.getElementById('exploreAlbumBtn'),
    playAgainBtn: document.getElementById('playAgainBtn'),
    
    // Toast Feedback
    toastVerdict: document.getElementById('toastVerdict'),
    toastMessage: document.getElementById('toastMessage')
  };

  // ==========================================================================
  // Web Audio Synthesizer (Zero-latency sound effects)
  // ==========================================================================
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

  function playTone(freq, type = 'sine', duration = 0.15, gainVal = 0.1) {
    try {
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gain.gain.setValueAtTime(gainVal, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {
      // AudioContext fallback
    }
  }

  function playSuccessChime() {
    playTone(523.25, 'triangle', 0.2, 0.15); // C5
    setTimeout(() => playTone(659.25, 'triangle', 0.25, 0.15), 100); // E5
    setTimeout(() => playTone(783.99, 'triangle', 0.35, 0.2), 200); // G5
    setTimeout(() => playTone(1046.50, 'triangle', 0.5, 0.25), 320); // C6
  }

  function playErrorBuzz() {
    playTone(220, 'sawtooth', 0.25, 0.12);
    setTimeout(() => playTone(180, 'sawtooth', 0.35, 0.15), 150);
  }

  function playCardFlipSound() {
    playTone(400, 'sine', 0.08, 0.08);
  }

  function playSkipSound() {
    playTone(320, 'sine', 0.1, 0.1);
    setTimeout(() => playTone(480, 'sine', 0.15, 0.12), 90);
  }

  // ==========================================================================
  // Couple-Only Cards Detection (Exact list of 14 cards chosen by Zehavit)
  // Cards: 7, 8, 10, 13, 14, 19, 26, 31, 37, 40, 41, 50, 53, 54
  // ==========================================================================
  const COUPLE_CARD_NUMBERS = new Set([
    7, 8, 10, 13, 14, 19, 26, 31, 37, 40, 41, 50, 53, 54
  ]);

  function isCoupleCard(card) {
    if (!card) return false;
    if (COUPLE_CARD_NUMBERS.has(card.number)) return true;
    if (card.is_couple === true) return true;
    return false;
  }

  // ==========================================================================
  // Clean Title Formatting (Eliminate duplicate years & duplicate Jokers)
  // ==========================================================================
  function formatRevealedTitle(card) {
    if (card.year === 'JOKER') {
      return "🃏 קלף ג'וקר על-זמני!";
    }
    const yearStr = String(card.year);
    let title = (card.title || '').trim();
    
    // If title already has the year in parentheses like "(2016)" or ends with " 2016" or contains it
    if (title.includes(`(${yearStr})`) || title.endsWith(` ${yearStr}`) || title.includes(yearStr)) {
      return title;
    }
    return `${title} (${yearStr})`;
  }

  // ==========================================================================
  // Initialization & Deck Fetch
  // ==========================================================================
  async function initGame() {
    setupEventListeners();
    if (window.DECK_DATA && Array.isArray(window.DECK_DATA) && window.DECK_DATA.length > 0) {
      masterDeck = window.DECK_DATA;
    } else {
      try {
        const response = await fetch('deck.json');
        if (!response.ok) throw new Error('Failed to load deck.json');
        masterDeck = await response.json();
      } catch (err) {
        console.warn('Local deck fetch blocked, trying live CDN:', err);
        try {
          const res2 = await fetch('https://37-4xb.pages.dev/deck.json');
          if (res2.ok) masterDeck = await res2.json();
        } catch (err2) {
          console.error('Error loading cards from all sources:', err2);
        }
      }
    }
  }

  function setupEventListeners() {
    // Mode Selection in Setup
    elements.modeOptions.forEach(btn => {
      btn.addEventListener('click', () => {
        elements.modeOptions.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        gameConfig.mode = btn.dataset.mode;
        updateSetupNames();
      });
    });

    // Target Selection in Setup
    elements.targetOptions.forEach(btn => {
      btn.addEventListener('click', () => {
        elements.targetOptions.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        gameConfig.targetCards = parseInt(btn.dataset.target, 10);
      });
    });

    // Start Game Button
    elements.startBtn.addEventListener('click', startNewGame);

    // Card Activation Button & Card Item Click
    elements.activateCardBtn.addEventListener('click', activateCurrentCard);
    elements.stageCardItem.addEventListener('click', () => {
      if (!isCardActivated && currentCard && !isChecking) {
        activateCurrentCard();
      }
    });

    // Move to Next Card Button
    elements.nextCardBtn.addEventListener('click', proceedToNextCard);

    // Skip Card Button for Kids
    if (elements.skipCardBtn) {
      elements.skipCardBtn.addEventListener('click', skipCurrentCardForKids);
    }

    // Audio Play / Pause
    elements.playToggleBtn.addEventListener('click', toggleAudio);
    elements.audioElement.addEventListener('ended', () => {
      isAudioPlaying = false;
      updatePlayBtnUI();
    });

    // Victory Screen Actions
    elements.playAgainBtn.addEventListener('click', () => {
      elements.victoryModal.classList.add('hidden');
      elements.setupModal.classList.remove('hidden');
    });

    elements.exploreAlbumBtn.addEventListener('click', () => {
      elements.victoryModal.classList.add('hidden');
      showToast('מצב אלבום משפחתי פעיל! לחצו על כל קלף כדי לצפות ולהאזין לזיכרון ✨', 'toast-correct', 4000);
    });

    // Enable HTML5 Drag & Drop on mystery card
    elements.stageCardItem.setAttribute('draggable', 'true');
    elements.stageCardItem.addEventListener('dragstart', handleDragStart);
    elements.stageCardItem.addEventListener('dragend', handleDragEnd);
  }

  function updateSetupNames() {
    if (gameConfig.mode === 'parents_vs_kids') {
      gameConfig.team1Name = 'ההורים (חיים וזהבית)';
      gameConfig.team2Name = 'הילדים';
    } else if (gameConfig.mode === 'couples') {
      gameConfig.team1Name = 'חיים';
      gameConfig.team2Name = 'זהבית';
    } else {
      gameConfig.team1Name = 'שחקן סולו';
      gameConfig.team2Name = '';
    }
  }

  // ==========================================================================
  // Start New Game Session
  // ==========================================================================
  function startNewGame() {
    elements.setupModal.classList.add('hidden');
    elements.victoryModal.classList.add('hidden');
    
    // Reset scores & state
    gameConfig.scores[1] = 0;
    gameConfig.scores[2] = 0;
    gameConfig.currentTeam = 1;
    timelineCards = [];
    isChecking = false;
    isCardActivated = false;
    stopAudio();

    // Update UI headers
    elements.team1Name.textContent = gameConfig.team1Name;
    elements.team2Name.textContent = gameConfig.team2Name || 'סולו';
    elements.team1Score.textContent = '0';
    elements.team2Score.textContent = '0';
    elements.targetDisplay.textContent = gameConfig.targetCards;
    
    if (gameConfig.mode === 'solo') {
      elements.team2Pill.style.display = 'none';
    } else {
      elements.team2Pill.style.display = 'flex';
    }

    // Shuffle Deck & Seed First Anchor Card
    prepareDeckAndAnchor();
    updateUI();
    drawNextMysteryCard();
  }

  function shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function prepareDeckAndAnchor() {
    const datedCards = masterDeck.filter(c => typeof c.year === 'number');
    const jokers = masterDeck.filter(c => c.year === 'JOKER');
    
    // Select 1989 Wedding year or first memory as the initial anchor
    const anchorCard = datedCards.find(c => c.year === 1989) || datedCards[0];
    const remainingDated = datedCards.filter(c => c !== anchorCard);
    
    // Pool all other cards and shuffle
    drawDeck = shuffle([...remainingDated, ...jokers]);
    
    // Place anchor on timeline
    anchorCard.isAnchor = true;
    anchorCard.ownerTeam = 0; // neutral
    timelineCards = [anchorCard];
  }

  // ==========================================================================
  // Drawing & Rendering the Mystery Card (Initial Covered State)
  // ==========================================================================
  function drawNextMysteryCard() {
    if (drawDeck.length === 0) {
      drawDeck = shuffle([...masterDeck.filter(c => !timelineCards.includes(c))]);
    }
    
    currentCard = drawDeck.shift();
    isChecking = false;
    isCardActivated = false;
    stopAudio();

    renderMysteryStageCovered(currentCard);
    renderTimeline();
    updateTurnIndicator();
  }

  function renderMysteryStageCovered(card) {
    elements.nextCardBtn.style.display = 'none';
    elements.playToggleBtn.style.display = 'none';
    elements.dragHintPill.style.display = 'none';
    if (elements.skipCardBtn) elements.skipCardBtn.style.display = 'none';
    if (elements.coupleTag) elements.coupleTag.style.display = 'none';
    elements.activateCardBtn.style.display = 'inline-flex';

    // Completely disguise Joker cards so players don't know they are Jokers!
    const catName = card.year === 'JOKER' ? 'תמונה משפחתית 🖼️' : (card.category_name || 'זיכרון מרגש');
    elements.stageCategory.textContent = catName;

    // Set stage item as covered card
    elements.stageCardItem.className = 'stage-card-item is-covered';
    elements.stageCardItem.innerHTML = `
      <div class="covered-emblem">37</div>
      <div class="covered-hint">לחצו להפעלת הזיכרון 🎴</div>
    `;

    elements.stagePrompt.textContent = 'קלף זיכרון חדש נשלף 🎴';
    elements.stageInstructions.textContent = 'לחצו על המסך או על הכפתור כדי להפעיל את הזיכרון (השמעת שיר / צפייה בווידאו / חשיפת תמונה).';

    if (card.media_type === 'audio') {
      elements.activateBtnText.textContent = 'הפעל והאזן לשיר';
    } else if (card.media_type === 'video') {
      elements.activateBtnText.textContent = 'הפעל וצפה בווידאו';
    } else {
      elements.activateBtnText.textContent = 'חשוף את התמונה';
    }
  }

  // ==========================================================================
  // Manual Card Activation (User clicks to open/play)
  // ==========================================================================
  function activateCurrentCard() {
    if (!currentCard || isCardActivated) return;
    isCardActivated = true;
    playCardFlipSound();

    elements.activateCardBtn.style.display = 'none';
    elements.dragHintPill.style.display = 'inline-flex';
    elements.stageCardItem.className = 'stage-card-item';

    const card = currentCard;

    // Audio Song
    if (card.media_type === 'audio') {
      elements.playToggleBtn.style.display = 'inline-flex';
      elements.audioElement.src = card.media_file;

      const vinylHTML = `
        <div class="stage-audio-wrapper">
          <div class="vinyl-disc" id="vinylDiscVisual">
            <div class="vinyl-center">37</div>
          </div>
          <div class="vinyl-waves">
            <div class="vinyl-wave-bar"></div>
            <div class="vinyl-wave-bar"></div>
            <div class="vinyl-wave-bar"></div>
            <div class="vinyl-wave-bar"></div>
            <div class="vinyl-wave-bar"></div>
          </div>
        </div>
      `;
      elements.stageCardItem.innerHTML = vinylHTML;
      elements.stagePrompt.textContent = 'שיר אהבה מסתורי 🎵';
      elements.stageInstructions.textContent = 'האזינו לשיר... באיזו שנה הוא יצא? גררו את הקלף לציר הזמן למטה או לחצו על החריץ הרצוי (+).';
      
      playAudio();

    // Video (Zero cropping, natural aspect ratio, full controls)
    } else if (card.media_type === 'video') {
      elements.playToggleBtn.style.display = 'none';
      const videoHTML = `
        <video src="${card.media_file}" controls autoplay playsinline loop style="max-width:100%; max-height:100%; width:auto; height:auto; object-fit:contain; border-radius:inherit;"></video>
      `;
      elements.stageCardItem.innerHTML = videoHTML;
      elements.stagePrompt.textContent = card.category === 'sports_video' ? 'רגע ספורט היסטורי ⚽🚴' : 'רגע וידאו משפחתי מרגש 🎬';
      elements.stageInstructions.textContent = 'צפו בקטע הווידאו... באיזו שנה זה קרה? גררו לציר הזמן או לחצו על החריץ הרצוי (+).';

    // Picture (Zero cropping, natural aspect ratio, full resolution)
    } else {
      elements.playToggleBtn.style.display = 'none';
      const imgHTML = `
        <img src="${card.media_file}" alt="Mystery Memory" style="max-width:100%; max-height:100%; width:auto; height:auto; object-fit:contain; border-radius:inherit;">
      `;
      elements.stageCardItem.innerHTML = imgHTML;
      elements.stagePrompt.textContent = 'תמונה משפחתית מתוך האלבום 🖼️';
      elements.stageInstructions.textContent = 'התבוננו היטב בתמונה... מאיזו שנה היא? שריינו לה מקום בציר הזמן למטה!';
    }

    // Couple-only card check: Show special badge and allow Kids to Skip
    const isCouple = isCoupleCard(card);
    const isKidsTurn = gameConfig.mode === 'parents_vs_kids' && gameConfig.currentTeam === 2;

    if (isCouple) {
      if (elements.coupleTag) elements.coupleTag.style.display = 'inline-flex';
      if (isKidsTurn) {
        if (elements.skipCardBtn) elements.skipCardBtn.style.display = 'inline-flex';
        elements.stageInstructions.textContent = 'זוהי חוויה של ההורים בלבד! באפשרותכם לנסות לשבץ בציר הזמן, או ללחוץ על "דלג" כדי להחזיר את הקלף להורים ולשלוף קלף חדש ✨';
      } else {
        if (elements.skipCardBtn) elements.skipCardBtn.style.display = 'none';
      }
    } else {
      if (elements.coupleTag) elements.coupleTag.style.display = 'none';
      if (elements.skipCardBtn) elements.skipCardBtn.style.display = 'none';
    }
  }

  // ==========================================================================
  // Audio Controls
  // ==========================================================================
  function playAudio() {
    elements.audioElement.play().then(() => {
      isAudioPlaying = true;
      updatePlayBtnUI();
    }).catch(() => {
      isAudioPlaying = false;
      updatePlayBtnUI();
    });
  }

  function stopAudio() {
    elements.audioElement.pause();
    elements.audioElement.currentTime = 0;
    isAudioPlaying = false;
    updatePlayBtnUI();
  }

  function toggleAudio() {
    if (elements.audioElement.paused) {
      playAudio();
    } else {
      elements.audioElement.pause();
      isAudioPlaying = false;
      updatePlayBtnUI();
    }
  }

  function updatePlayBtnUI() {
    const disc = document.getElementById('vinylDiscVisual');
    if (isAudioPlaying) {
      elements.playToggleBtn.innerHTML = '<span>⏸️</span><span>השהה שיר</span>';
      elements.playToggleBtn.classList.add('btn-playing');
      if (disc) disc.classList.add('playing');
    } else {
      elements.playToggleBtn.innerHTML = '<span>▶️</span><span>השמע שיר</span>';
      elements.playToggleBtn.classList.remove('btn-playing');
      if (disc) disc.classList.remove('playing');
    }
  }

  // ==========================================================================
  // Timeline Rendering & Drop Slots
  // ==========================================================================
  function renderTimeline() {
    elements.timelineTrack.innerHTML = '';
    
    // There are (timelineCards.length + 1) slots
    for (let slotIndex = 0; slotIndex <= timelineCards.length; slotIndex++) {
      // 1. Render Drop Slot
      const slotEl = createSlotElement(slotIndex);
      elements.timelineTrack.appendChild(slotEl);

      // 2. Render Card (if exists at slotIndex)
      if (slotIndex < timelineCards.length) {
        const cardEl = createPlacedCardElement(timelineCards[slotIndex]);
        elements.timelineTrack.appendChild(cardEl);
      }
    }

    elements.timelineCountBadge.textContent = `${timelineCards.length} קלפים בציר`;
  }

  function createSlotElement(index) {
    const slot = document.createElement('div');
    slot.className = 'timeline-slot';
    slot.dataset.slotIndex = index;
    
    let tooltipText = '';
    if (index === 0) {
      const firstYear = getEffectiveYear(timelineCards[0]);
      tooltipText = `לפני ${firstYear}`;
    } else if (index === timelineCards.length) {
      const lastYear = getEffectiveYear(timelineCards[timelineCards.length - 1]);
      tooltipText = `אחרי ${lastYear}`;
    } else {
      const prevYear = getEffectiveYear(timelineCards[index - 1]);
      const nextYear = getEffectiveYear(timelineCards[index]);
      tooltipText = `בין ${prevYear} ל-${nextYear}`;
    }
    
    slot.innerHTML = `<span class="slot-tooltip">${tooltipText}</span>`;

    // Click-to-place event
    slot.addEventListener('click', () => handleSlotChosen(index));

    // Drag-over events
    slot.addEventListener('dragover', (e) => {
      e.preventDefault();
      slot.classList.add('drag-over');
    });

    slot.addEventListener('dragleave', () => {
      slot.classList.remove('drag-over');
    });

    slot.addEventListener('drop', (e) => {
      e.preventDefault();
      slot.classList.remove('drag-over');
      handleSlotChosen(index);
    });

    return slot;
  }

  function getEffectiveYear(card) {
    if (!card) return '';
    if (card.year === 'JOKER') return "ג'וקר";
    return card.year;
  }

  function createPlacedCardElement(card) {
    const cardEl = document.createElement('div');
    cardEl.className = 'timeline-card';
    
    if (card.isAnchor) {
      cardEl.classList.add('card-anchor');
    } else if (card.ownerTeam === 1) {
      cardEl.classList.add('team-parents');
    } else if (card.ownerTeam === 2) {
      cardEl.classList.add('team-kids');
    }

    const yearDisplay = card.year === 'JOKER' ? "🃏 ג'וקר" : card.year;
    const mediaThumb = card.card_image || card.media_file;

    let ownerBadge = '';
    if (card.isAnchor) {
      ownerBadge = '✨ עוגן פתיחה';
    } else if (card.ownerTeam === 1) {
      ownerBadge = `👑 ${gameConfig.team1Name}`;
    } else if (card.ownerTeam === 2) {
      ownerBadge = `🚀 ${gameConfig.team2Name}`;
    }

    let cardTitle = card.title;
    if (card.year === 'JOKER') {
      cardTitle = "קלף על-זמני מיוחד 🃏";
    }

    cardEl.innerHTML = `
      <div class="timeline-card-media">
        <img src="${mediaThumb}" alt="${cardTitle}" style="object-fit:cover; width:100%; height:100%;">
        <span class="timeline-card-badge">${card.category_name || ''}</span>
      </div>
      <div class="timeline-card-details">
        <div class="timeline-card-year">${yearDisplay}</div>
        <div class="timeline-card-title">${cardTitle}</div>
        <div class="timeline-card-owner">${ownerBadge}</div>
      </div>
    `;

    cardEl.addEventListener('click', () => {
      playCardFlipSound();
      showCardDetailModal(card);
    });

    return cardEl;
  }

  // ==========================================================================
  // Card Placement & Rule Validation
  // ==========================================================================
  function handleSlotChosen(slotIndex) {
    if (isChecking || !currentCard) return;
    
    // Require card to be activated first before placing
    if (!isCardActivated) {
      showToast('לחצו קודם להפעלת הזיכרון לפני השיבוץ בציר! 🎴', 'toast-wrong', 2200);
      activateCurrentCard();
      return;
    }

    isChecking = true;
    playCardFlipSound();

    const placedCard = currentCard;
    const isCorrect = validatePlacement(placedCard, slotIndex);

    if (isCorrect) {
      handleCorrectPlacement(placedCard, slotIndex);
    } else {
      handleIncorrectPlacement(placedCard, slotIndex);
    }
  }

  function validatePlacement(card, slotIndex) {
    // Jokers accept ANY slot on the timeline
    if (card.year === 'JOKER') return true;

    const cardYear = parseInt(card.year, 10);
    
    // Find closest dated card before this slot
    let prevYear = -Infinity;
    for (let i = slotIndex - 1; i >= 0; i--) {
      if (typeof timelineCards[i].year === 'number') {
        prevYear = timelineCards[i].year;
        break;
      }
    }

    // Find closest dated card after this slot
    let nextYear = Infinity;
    for (let i = slotIndex; i < timelineCards.length; i++) {
      if (typeof timelineCards[i].year === 'number') {
        nextYear = timelineCards[i].year;
        break;
      }
    }

    return cardYear >= prevYear && cardYear <= nextYear;
  }

  function handleCorrectPlacement(card, slotIndex) {
    playSuccessChime();
    
    // Assign team ownership
    card.ownerTeam = gameConfig.currentTeam;
    timelineCards.splice(slotIndex, 0, card);
    
    // Score point
    gameConfig.scores[gameConfig.currentTeam]++;
    
    const teamName = gameConfig.currentTeam === 1 ? gameConfig.team1Name : gameConfig.team2Name;
    const nextTeamName = gameConfig.currentTeam === 1 ? gameConfig.team2Name : gameConfig.team1Name;
    const revealedTitle = formatRevealedTitle(card);
    
    if (card.year === 'JOKER') {
      showToast(`✨ הפתעה! זהו קלף ג'וקר על-זמני - נקודה בטוחה ל${teamName}!`, 'toast-correct', 2800);
    } else {
      showToast(`✨ בול! ${card.year} - נקודה ל${teamName}!`, 'toast-correct', 2200);
    }

    updateUI();
    renderTimeline();

    // Check Victory Condition
    if (timelineCards.length >= gameConfig.targetCards) {
      setTimeout(showVictoryScreen, 1200);
    } else {
      // DO NOT STOP AUDIO OR VIDEO! Let it play to the end!
      elements.dragHintPill.style.display = 'none';
      elements.activateCardBtn.style.display = 'none';
      if (elements.skipCardBtn) elements.skipCardBtn.style.display = 'none';
      
      elements.stagePrompt.textContent = `${revealedTitle} ✅`;
      
      if (isAudioPlaying || card.media_type === 'video') {
        elements.stageInstructions.textContent = 'כל הכבוד! הקלף שובץ בהצלחה. המדיה ממשיכה לפעול כדי שתוכלו ליהנות ממנה עד הסוף 🎶. מתי שתרצו, לחצו על הכפתור כדי להמשיך לקלף הבא!';
      } else {
        elements.stageInstructions.textContent = 'כל הכבוד! הקלף שובץ בהצלחה בציר הזמן. לחצו מתי שתרצו כדי לעבור לתור הבא!';
      }

      elements.nextCardBtn.innerHTML = `<span>עברו לקלף הבא (תור ${nextTeamName})</span> <span>⬅️</span>`;
      elements.nextCardBtn.style.display = 'inline-flex';
    }
  }

  function handleIncorrectPlacement(card, slotIndex) {
    playErrorBuzz();
    
    // CRITICAL: DO NOT STOP AUDIO OR VIDEO! Even on incorrect placement, let them finish playing!
    const correctSlot = findCorrectSlotIndex(card);
    const correctSlotLabel = getSlotDescription(correctSlot);
    
    showToast(`❌ לא מדויק! השנה היא ${card.year} (מתאים ${correctSlotLabel}). הקלף חוזר לתחתית החפיסה 🔄`, 'toast-wrong', 3400);

    // Recycle card to the bottom of the draw deck
    drawDeck.push(card);

    const nextTeamName = gameConfig.currentTeam === 1 ? gameConfig.team2Name : gameConfig.team1Name;

    elements.dragHintPill.style.display = 'none';
    elements.activateCardBtn.style.display = 'none';
    if (elements.skipCardBtn) elements.skipCardBtn.style.display = 'none';
    
    // If audio was playing, keep the toggle button available
    if (isAudioPlaying) {
      elements.playToggleBtn.style.display = 'inline-flex';
    }

    const revealedTitle = formatRevealedTitle(card);
    elements.stagePrompt.textContent = `${revealedTitle} 🔄`;
    
    if (isAudioPlaying || card.media_type === 'video') {
      elements.stageInstructions.textContent = `לא מדויק הפעם! השנה היא ${card.year}. המדיה ממשיכה להתנגן כדי שתוכלו ליהנות ממנה 🎶. הקלף ירד לתחתית החפיסה ותהיה הזדמנות שנייה. מתי שתרצו, לחצו על הכפתור כדי לעבור לתור של ${nextTeamName}.`;
    } else {
      elements.stageInstructions.textContent = `לא מדויק הפעם! השנה היא ${card.year}. הקלף ירד לתחתית החפיסה ותהיה הזדמנות שנייה. לחצו למטה כדי לעבור לתור של ${nextTeamName}.`;
    }

    elements.nextCardBtn.innerHTML = `<span>עברו לתור הבא (תור ${nextTeamName})</span> <span>⬅️</span>`;
    elements.nextCardBtn.style.display = 'inline-flex';
  }

  function proceedToNextCard() {
    stopAudio();
    if (elements.skipCardBtn) elements.skipCardBtn.style.display = 'none';
    if (elements.coupleTag) elements.coupleTag.style.display = 'none';
    // Also pause any video element if playing
    const vid = elements.stageCardItem.querySelector('video');
    if (vid) {
      try { vid.pause(); } catch(e) {}
    }
    toggleTeamTurn();
    drawNextMysteryCard();
  }

  // ==========================================================================
  // Skip Card Action (Kids skip couple-only experiences)
  // ==========================================================================
  function skipCurrentCardForKids() {
    if (!currentCard || isChecking) return;
    if (gameConfig.mode !== 'parents_vs_kids' || gameConfig.currentTeam !== 2) return;

    playSkipSound();
    stopAudio();

    const vid = elements.stageCardItem.querySelector('video');
    if (vid) {
      try { vid.pause(); } catch (e) {}
    }

    const skipped = currentCard;
    // Push skipped card to the bottom of the draw deck so the parents get to experience it later!
    drawDeck.push(skipped);

    showToast('💑 הקלף הוחזר לחפיסה עבור ההורים! נשלף קלף חדש לילדים ✨', 'toast-correct', 3000);

    if (elements.skipCardBtn) elements.skipCardBtn.style.display = 'none';
    if (elements.coupleTag) elements.coupleTag.style.display = 'none';

    // Draw the next mystery card for the kids (do NOT toggle turn)
    drawNextMysteryCard();
  }

  function findCorrectSlotIndex(card) {
    if (card.year === 'JOKER') return 0;
    const y = parseInt(card.year, 10);
    for (let i = 0; i < timelineCards.length; i++) {
      if (typeof timelineCards[i].year === 'number' && y < timelineCards[i].year) {
        return i;
      }
    }
    return timelineCards.length;
  }

  function getSlotDescription(index) {
    if (index === 0) return `לפני ${getEffectiveYear(timelineCards[0])}`;
    if (index === timelineCards.length) return `אחרי ${getEffectiveYear(timelineCards[timelineCards.length - 1])}`;
    return `בין ${getEffectiveYear(timelineCards[index - 1])} ל-${getEffectiveYear(timelineCards[index])}`;
  }

  function toggleTeamTurn() {
    if (gameConfig.mode !== 'solo') {
      gameConfig.currentTeam = gameConfig.currentTeam === 1 ? 2 : 1;
    }
    updateTurnIndicator();
  }

  function updateTurnIndicator() {
    elements.team1Score.textContent = gameConfig.scores[1];
    elements.team2Score.textContent = gameConfig.scores[2];

    const isTeam1 = gameConfig.currentTeam === 1;
    elements.team1Pill.classList.toggle('active-turn', isTeam1);
    elements.team2Pill.classList.toggle('active-turn', !isTeam1);

    elements.turnBanner.classList.remove('turn-parents', 'turn-kids');
    elements.turnBanner.classList.add(isTeam1 ? 'turn-parents' : 'turn-kids');

    const activeName = isTeam1 ? gameConfig.team1Name : gameConfig.team2Name;
    const icon = isTeam1 ? '👑' : '🚀';
    elements.turnText.textContent = `תור קבוצת ${activeName} ${icon}`;
  }

  function updateUI() {
    const totalCount = timelineCards.length;
    elements.progressCount.textContent = totalCount;
    elements.targetDisplay.textContent = gameConfig.targetCards;
    
    const pct = Math.min(100, Math.round((totalCount / gameConfig.targetCards) * 100));
    elements.progressBar.style.width = `${pct}%`;
  }

  // ==========================================================================
  // Victory Screen & End Celebration
  // ==========================================================================
  function showVictoryScreen() {
    stopAudio();
    playSuccessChime();

    // Trigger celebration song if available (track 9 - Sweetest Thing, wedding 1989)
    try {
      elements.audioElement.src = 'assets/audio/track_9.mp3';
      elements.audioElement.play().catch(() => {});
    } catch(e) {}

    const s1 = gameConfig.scores[1];
    const s2 = gameConfig.scores[2];

    elements.victoryScore1.textContent = s1;
    elements.victoryScore2.textContent = s2;

    if (gameConfig.mode === 'solo') {
      elements.victoryTitle.textContent = '🎉 מזל טוב! השלמת את ציר הזמן!';
      elements.victorySubtitle.textContent = `בנית בהצלחה רצף מפואר של ${timelineCards.length} קלפים וזיכרונות לכבוד יום הנישואין ה-37!`;
      elements.victoryScoreboard.style.display = 'none';
    } else if (s1 > s2) {
      elements.victoryTitle.textContent = `🏆 קבוצת ${gameConfig.team1Name} ניצחה בקרב על ה-37!`;
      elements.victorySubtitle.textContent = `הניסיון והזיכרון של ההורים הוכיחו את עצמם! (${s1} מול ${s2})`;
    } else if (s2 > s1) {
      elements.victoryTitle.textContent = `🏆 קבוצת ${gameConfig.team2Name} ניצחה בקרב על ה-37!`;
      elements.victorySubtitle.textContent = `מהפך היסטורי! הילדים מכירים את ההיסטוריה המשפחתית בעל-פה! (${s2} מול ${s1})`;
    } else {
      elements.victoryTitle.textContent = '❤️ תיקו משפחתי מושלם של אהבה!';
      elements.victorySubtitle.textContent = `שתי הקבוצות הגיעו לתוצאה זהה של ${s1} קלפים כל אחת!`;
    }

    elements.victoryModal.classList.remove('hidden');
  }

  // ==========================================================================
  // Card Detail Modal (Album Mode)
  // ==========================================================================
  function showCardDetailModal(card) {
    const revealedTitle = formatRevealedTitle(card);
    const desc = card.description || 'זיכרון יקר מתוך 37 שנות הנישואין המאושרות.';
    alert(`🎴 ${revealedTitle}\n\n${desc}`);
  }

  // ==========================================================================
  // Toast Notification Helper
  // ==========================================================================
  let toastTimer = null;
  function showToast(message, type = 'toast-correct', duration = 2400) {
    clearTimeout(toastTimer);
    elements.toastMessage.textContent = message;
    elements.toastVerdict.className = `toast-verdict show ${type}`;
    
    toastTimer = setTimeout(() => {
      elements.toastVerdict.classList.remove('show');
    }, duration);
  }

  // ==========================================================================
  // Drag & Drop Handlers
  // ==========================================================================
  function handleDragStart(e) {
    if (isChecking || !currentCard || !isCardActivated) {
      e.preventDefault();
      if (!isCardActivated && currentCard) {
        showToast('לחצו קודם להפעלת הזיכרון לפני הגרירה! 🎴', 'toast-wrong', 2200);
        activateCurrentCard();
      }
      return;
    }
    e.dataTransfer.setData('text/plain', 'mystery-card');
    elements.stageCardItem.style.opacity = '0.5';
  }

  function handleDragEnd() {
    elements.stageCardItem.style.opacity = '1';
    document.querySelectorAll('.timeline-slot').forEach(s => s.classList.remove('drag-over'));
  }

  // Launch on DOM ready
  document.addEventListener('DOMContentLoaded', initGame);

})();
