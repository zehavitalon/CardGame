/**
 * Timeline Memory Game • Multi-Player Engine (1 to 4 Players)
 * Universal Interactive Experience for any Custom Deck
 */

(function () {
  'use strict';

  // Player Configurations & Color Themes
  const PLAYER_CONFIGS = [
    { id: 1, defaultName: 'שחקן 1', icon: '👑', color: '#f5d061', cssClass: 'p-theme-1', bannerClass: 'p-banner-1', cardClass: 'card-p-theme-1' },
    { id: 2, defaultName: 'שחקן 2', icon: '🚀', color: '#38bdf8', cssClass: 'p-theme-2', bannerClass: 'p-banner-2', cardClass: 'card-p-theme-2' },
    { id: 3, defaultName: 'שחקן 3', icon: '🌟', color: '#2ed573', cssClass: 'p-theme-3', bannerClass: 'p-banner-3', cardClass: 'card-p-theme-3' },
    { id: 4, defaultName: 'שחקן 4', icon: '💜', color: '#e056fd', cssClass: 'p-theme-4', bannerClass: 'p-banner-4', cardClass: 'card-p-theme-4' },
    { id: 5, defaultName: 'שחקן 5', icon: '🔥', color: '#ff7675', cssClass: 'p-theme-5', bannerClass: 'p-banner-5', cardClass: 'card-p-theme-5' },
    { id: 6, defaultName: 'שחקן 6', icon: '⚡', color: '#00cec9', cssClass: 'p-theme-6', bannerClass: 'p-banner-6', cardClass: 'card-p-theme-6' },
    { id: 7, defaultName: 'שחקן 7', icon: '🦄', color: '#fd79a8', cssClass: 'p-theme-7', bannerClass: 'p-banner-7', cardClass: 'card-p-theme-7' },
    { id: 8, defaultName: 'שחקן 8', icon: '🎯', color: '#a29bfe', cssClass: 'p-theme-8', bannerClass: 'p-banner-8', cardClass: 'card-p-theme-8' }
  ];

  // Game State
  let masterDeck = [];
  let drawDeck = [];
  let discardedCards = [];
  let timelineCards = [];
  let currentCard = null;
  let isChecking = false;
  let isCardActivated = false;
  let isDrawingCard = false;
  let isAudioPlaying = false;
  let toastTimer = null;

  let activePlayerCount = 1;
  let activePlayers = [];
  let currentTurnIndex = 0;
  let activeCode = 'ZIV-59';

  let gameConfig = {
    targetCards: 15
  };

  // DOM Elements Cache
  const elements = {};

  function cacheElements() {
    elements.setupModal = document.getElementById('setupModal');
    elements.startBtn = document.getElementById('startBtn');
    elements.playersScoreboard = document.getElementById('playersScoreboard');
    elements.playerInputsList = document.getElementById('playerInputsList');
    elements.deckCardsCountText = document.getElementById('deckCardsCountText');

    elements.progressBar = document.getElementById('progressBar');
    elements.progressCount = document.getElementById('progressCount');
    elements.targetDisplay = document.getElementById('targetDisplay');

    elements.turnBanner = document.getElementById('turnBanner');
    elements.turnText = document.getElementById('turnText');

    elements.stageCardItem = document.getElementById('stageCardItem');
    elements.stageVerdict = document.getElementById('stageVerdict');
    elements.verdictIcon = document.getElementById('verdictIcon');
    elements.verdictText = document.getElementById('verdictText');
    elements.stageCategory = document.getElementById('stageCategory');
    elements.stagePrompt = document.getElementById('stagePrompt');
    elements.stageInstructions = document.getElementById('stageInstructions');
    elements.activateCardBtn = document.getElementById('activateCardBtn');
    elements.activateBtnText = document.getElementById('activateBtnText');
    elements.playToggleBtn = document.getElementById('playToggleBtn');
    elements.nextCardBtn = document.getElementById('nextCardBtn');
    elements.dragHintPill = document.getElementById('dragHintPill');
    elements.audioElement = document.getElementById('gameAudio');

    elements.mediaCinemaModal = document.getElementById('mediaCinemaModal');
    elements.mediaCinemaContent = document.getElementById('mediaCinemaContent');
    elements.mediaFullscreenBtn = document.getElementById('mediaFullscreenBtn');
    elements.fullScreenIcon = document.getElementById('fullScreenIcon');
    elements.fullScreenLabel = document.getElementById('fullScreenLabel');

    elements.timelineTrack = document.getElementById('timelineTrack');
    elements.timelineViewport = document.getElementById('timelineViewport');
    elements.toastVerdict = document.getElementById('toastVerdict');
    elements.toastMessage = document.getElementById('toastMessage');

    elements.cardDetailModal = document.getElementById('cardDetailModal');
    elements.cardDetailYear = document.getElementById('cardDetailYear');
    elements.cardDetailTitle = document.getElementById('cardDetailTitle');
    elements.cardDetailDescription = document.getElementById('cardDetailDescription');
    elements.cardDetailMedia = document.getElementById('cardDetailMedia');
    elements.cardDetailCloseBtn = document.getElementById('cardDetailCloseBtn');

    elements.victoryModal = document.getElementById('victoryModal');
    elements.victoryTitle = document.getElementById('victoryTitle');
    elements.victorySubtitle = document.getElementById('victorySubtitle');
    elements.victoryLeaderboard = document.getElementById('victoryLeaderboard');
    elements.playAgainBtn = document.getElementById('playAgainBtn');
  }

  // --- IndexedDB Access for Decks ---
  function getDeckFromIDB(key) {
    return new Promise((resolve) => {
      try {
        const req = indexedDB.open('CardGameMemoriesDB', 1);
        req.onerror = () => resolve(null);
        req.onsuccess = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains('decks')) {
            resolve(null);
            return;
          }
          const tx = db.transaction('decks', 'readonly');
          const store = tx.objectStore('decks');
          const getReq = store.get(key);
          getReq.onsuccess = () => resolve(getReq.result || null);
          getReq.onerror = () => resolve(null);
        };
      } catch (err) {
        resolve(null);
      }
    });
  }

  // --- Multi-Player Dynamic UI Logic ---
  window.setPlayerCount = function (count) {
    activePlayerCount = Math.min(PLAYER_CONFIGS.length, Math.max(1, count));
    renderPlayerInputs();
  };

  window.addPlayer = function () {
    if (activePlayerCount >= PLAYER_CONFIGS.length) return;

    // Preserve existing input values
    const currentValues = [];
    for (let i = 0; i < activePlayerCount; i++) {
      const inp = document.getElementById(`playerNameInput_${i}`);
      currentValues.push(inp ? inp.value : '');
    }

    activePlayerCount++;
    renderPlayerInputs(currentValues);

    const newInp = document.getElementById(`playerNameInput_${activePlayerCount - 1}`);
    if (newInp) {
      newInp.focus();
      newInp.select();
    }
  };

  window.removePlayer = function (index) {
    if (activePlayerCount <= 1) return;

    const currentValues = [];
    for (let i = 0; i < activePlayerCount; i++) {
      const inp = document.getElementById(`playerNameInput_${i}`);
      currentValues.push(inp ? inp.value : '');
    }

    currentValues.splice(index, 1);
    activePlayerCount--;
    renderPlayerInputs(currentValues);
  };

  function renderPlayerInputs(savedValues) {
    const list = elements.playerInputsList;
    if (!list) return;

    // Use savedValues or read current values from DOM
    const currentValues = savedValues || [];
    if (!savedValues) {
      for (let i = 0; i < activePlayerCount; i++) {
        const inp = document.getElementById(`playerNameInput_${i}`);
        if (inp) currentValues[i] = inp.value;
      }
    }

    let html = '';
    for (let i = 0; i < activePlayerCount; i++) {
      const cfg = PLAYER_CONFIGS[i] || {
        id: i + 1,
        defaultName: `שחקן ${i + 1}`,
        icon: '👤',
        color: '#38bdf8',
        cssClass: 'p-theme-2',
        bannerClass: 'p-banner-2',
        cardClass: 'card-p-theme-2'
      };

      let val = currentValues[i];
      if (val === undefined || val === null) {
        val = (i === 0) ? 'שחקן 1' : '';
      }

      html += `
        <div style="display:flex; align-items:center; gap:10px; background:rgba(255,255,255,0.04); padding:8px 12px; border-radius:10px; border:1px solid ${cfg.color}40; transition:all 0.2s ease;">
          <span style="font-size:1.3rem;">${cfg.icon}</span>
          <span style="font-weight:700; color:${cfg.color}; font-size:0.9rem; min-width:70px;">שחקן ${i + 1}:</span>
          <input type="text" id="playerNameInput_${i}" class="form-input" style="flex:1; padding:8px 12px; border-radius:8px; background:rgba(0,0,0,0.3); border:1px solid ${cfg.color}60; color:#fff; font-family:Rubik,sans-serif; font-size:0.95rem;" value="${val}" placeholder="${cfg.defaultName}" oninput="this.style.borderColor='${cfg.color}60'">
          ${activePlayerCount > 1 ? `
            <button type="button" class="btn-remove-player" onclick="window.removePlayer(${i})" title="הסר שחקן ${i + 1}">✕</button>
          ` : ''}
        </div>
      `;
    }
    list.innerHTML = html;

    const addBtn = document.getElementById('addPlayerBtn');
    if (addBtn) {
      if (activePlayerCount >= PLAYER_CONFIGS.length) {
        addBtn.disabled = true;
        addBtn.title = `הגעת למספר השחקנים המרבי (${PLAYER_CONFIGS.length})`;
      } else {
        addBtn.disabled = false;
        addBtn.title = 'הוסף שחקן למשחק';
      }
    }
  }

  function renderScoreboardPills() {
    const board = elements.playersScoreboard;
    if (!board) return;
    board.innerHTML = activePlayers.map((p, idx) => `
      <div class="player-pill ${p.cssClass} ${idx === currentTurnIndex ? 'active-turn' : ''}" id="playerPill_${idx}">
        <span>${p.icon}</span>
        <span>${activePlayers.length > 1 ? p.name : 'נקודות:'}</span>
        <span style="font-weight:800; font-family:Outfit,sans-serif; font-size:1.1rem; margin-right:4px;" id="playerScore_${idx}">${p.score}</span>
      </div>
    `).join('');
  }

  function updateTurnIndicator() {
    if (!activePlayers.length) return;
    const curr = activePlayers[currentTurnIndex];
    activePlayers.forEach((p, idx) => {
      const pill = document.getElementById(`playerPill_${idx}`);
      if (pill) pill.classList.toggle('active-turn', idx === currentTurnIndex);
    });

    const banner = elements.turnBanner;
    if (banner) {
      if (activePlayers.length > 1) {
        banner.style.display = 'flex';
        banner.className = `turn-banner ${curr.bannerClass}`;
        elements.turnText.textContent = `תור של ${curr.name} ${curr.icon}`;
      } else {
        banner.style.display = 'none';
      }
    }
  }

  function toggleTeamTurn() {
    if (activePlayers.length > 1) {
      currentTurnIndex = (currentTurnIndex + 1) % activePlayers.length;
    }
    updateTurnIndicator();
  }

  // ==========================================================================
  // Initialization
  // ==========================================================================
  async function initGame() {
    cacheElements();
    setupEventListeners();
    renderPlayerInputs();

    // 1. Determine active deck code strictly from URL (?game=CODE or ?deck=CODE) or default
    const urlParams = new URLSearchParams(window.location.search);
    activeCode = (urlParams.get('game') || urlParams.get('deck') || 'ZIV-59').toUpperCase().trim();
    console.log('🎮 Active Game Deck Code:', activeCode);

    // Update Header based on Catalog or Custom Code
    let catalogKey = activeCode;
    if (window.GAME_CATALOG_ALIASES && window.GAME_CATALOG_ALIASES[catalogKey]) {
      catalogKey = window.GAME_CATALOG_ALIASES[catalogKey];
    }
    const catEntry = window.GAME_CATALOG && window.GAME_CATALOG[catalogKey];

    const titleHeader = document.getElementById('gameTitleHeader');
    const badgeHeader = document.getElementById('modalBadge');
    if (catEntry) {
      if (titleHeader) titleHeader.textContent = `${catEntry.title} • משחק המחשב`;
      if (badgeHeader) badgeHeader.textContent = `${catEntry.icon} ${catEntry.title} • ציר הזמן`;
      document.title = `${catEntry.title} • משחק ציר הזמן`;
    } else if (activeCode.includes('ZIV')) {
      if (titleHeader) titleHeader.textContent = 'ציר הזמן של זיו • משחק המחשב';
      if (badgeHeader) badgeHeader.textContent = '🎂 יום הולדת לזיו • ציר הזמן';
      document.title = 'יום הולדת לזיו • משחק ציר הזמן';
    } else {
      if (titleHeader) titleHeader.textContent = `ציר הזמן • חפיסת ${activeCode}`;
      if (badgeHeader) badgeHeader.textContent = `✨ חפיסת ${activeCode} • משחק המחשב`;
      document.title = `משחק ציר הזמן • ${activeCode}`;
    }

    // 2. Load deck data: IndexedDB -> LocalStorage -> GAME_CATALOG -> window.DECK_DATA -> fetch
    let loadedCards = null;
    try {
      loadedCards = await getDeckFromIDB('MEMORIES_DECK_' + activeCode);
    } catch (e) { }

    if (!loadedCards || !loadedCards.length) {
      try {
        const raw = localStorage.getItem('MEMORIES_DECK_' + activeCode);
        if (raw) loadedCards = JSON.parse(raw);
      } catch (e) { }
    }

    if (loadedCards && Array.isArray(loadedCards) && loadedCards.length >= 2) {
      masterDeck = loadedCards;
      console.log(`Loaded ${masterDeck.length} cards from custom storage for code ${activeCode}`);
    } else if (catEntry && Array.isArray(catEntry.deck) && catEntry.deck.length > 0) {
      masterDeck = JSON.parse(JSON.stringify(catEntry.deck));
      console.log(`Loaded ${masterDeck.length} cards from GAME_CATALOG for ${catalogKey}`);
    } else if (window.DECK_DATA && Array.isArray(window.DECK_DATA) && window.DECK_DATA.length > 0) {
      masterDeck = window.DECK_DATA;
    } else {
      try {
        const response = await fetch('deck.json');
        if (response.ok) masterDeck = await response.json();
      } catch (err) {
        try {
          const resUni = await fetch('universal_deck.json');
          if (resUni.ok) masterDeck = await resUni.json();
        } catch (err2) { }
      }
    }

    // 3. Filter active cards (with valid year)
    const customizedCards = masterDeck.filter(c => c && (c.isCustomized || c.media_file || (c.year && c.year !== 0) || (c.title && c.title !== 'זיכרון אישי' && c.title !== 'טרם הוגדר')));
    if (customizedCards.length >= 2) {
      masterDeck = customizedCards;
      console.log(`Filtered to ${masterDeck.length} active custom cards`);
    }

    // 4. Update Deck Info & Length
    gameConfig.targetCards = masterDeck.length;
    if (elements.deckCardsCountText) {
      elements.deckCardsCountText.textContent = `${masterDeck.length} קלפים`;
    }
    if (elements.targetDisplay) {
      elements.targetDisplay.textContent = masterDeck.length;
    }

    // 5. Setup Event Listeners & UI
    setupEventListeners();
    renderPlayerInputs();
  }

  function setupEventListeners() {
    if (elements.startBtn) {
      elements.startBtn.addEventListener('click', startNewGame);
    }

    if (elements.activateCardBtn) {
      elements.activateCardBtn.addEventListener('click', activateCurrentCard);
    }
    if (elements.stageCardItem) {
      elements.stageCardItem.addEventListener('click', () => {
        if (!isCardActivated && currentCard && !isChecking) {
          activateCurrentCard();
        }
      });
    }

    if (elements.nextCardBtn) {
      elements.nextCardBtn.addEventListener('click', proceedToNextCard);
    }

    window.scrollTimelineLeft = function () {
      const vp = elements.timelineViewport || document.getElementById('timelineViewport');
      if (vp) vp.scrollBy({ left: -320, behavior: 'smooth' });
    };

    window.scrollTimelineRight = function () {
      const vp = elements.timelineViewport || document.getElementById('timelineViewport');
      if (vp) vp.scrollBy({ left: 320, behavior: 'smooth' });
    };

    const vp = elements.timelineViewport || document.getElementById('timelineViewport');
    if (vp) {
      vp.addEventListener('wheel', (e) => {
        if (e.deltaY !== 0) {
          e.preventDefault();
          vp.scrollLeft += e.deltaY;
        }
      }, { passive: false });
    }

    if (elements.toastVerdict) {
      elements.toastVerdict.addEventListener('click', () => {
        clearTimeout(toastTimer);
        elements.toastVerdict.classList.remove('show');
      });
    }

    if (elements.cardDetailCloseBtn) {
      elements.cardDetailCloseBtn.addEventListener('click', closeCardDetailModal);
    }
    if (elements.cardDetailModal) {
      elements.cardDetailModal.addEventListener('click', (e) => {
        if (e.target === elements.cardDetailModal) closeCardDetailModal();
      });
    }

    if (elements.playAgainBtn) {
      elements.playAgainBtn.addEventListener('click', () => {
        elements.victoryModal.classList.add('hidden');
        elements.setupModal.classList.remove('hidden');
      });
    }

    document.addEventListener('keydown', handleKeyNavigation);
  }

  // ==========================================================================
  // Start New Game Session
  // ==========================================================================
  function startNewGame() {
    if (masterDeck.length < 2) {
      alert(`בחפיסה "${activeCode}" לא נמצאו מספיק קלפים פעילים למשחק.`);
      return;
    }

    // Default player names if left empty
    for (let i = 0; i < activePlayerCount; i++) {
      const inp = document.getElementById(`playerNameInput_${i}`);
      let val = inp ? inp.value.trim() : '';
      if (!val) {
        val = PLAYER_CONFIGS[i]?.defaultName || `שחקן ${i + 1}`;
        if (inp) inp.value = val;
      }
    }

    elements.setupModal.classList.add('hidden');
    elements.victoryModal.classList.add('hidden');

    // Initialize players from inputs
    activePlayers = [];
    for (let i = 0; i < activePlayerCount; i++) {
      const inp = document.getElementById(`playerNameInput_${i}`);
      const cfg = PLAYER_CONFIGS[i] || {
        id: i + 1,
        defaultName: `שחקן ${i + 1}`,
        icon: '👤',
        color: '#38bdf8',
        cssClass: 'p-theme-2',
        bannerClass: 'p-banner-2',
        cardClass: 'card-p-theme-2'
      };
      const name = (inp && inp.value.trim()) ? inp.value.trim() : (cfg.defaultName || (`שחקן ${i + 1}`));
      activePlayers.push({
        ...cfg,
        name: name,
        score: 0
      });
    }

    gameConfig.targetCards = masterDeck.length;
    currentTurnIndex = 0;
    timelineCards = [];
    discardedCards = [];
    isChecking = false;
    isCardActivated = false;
    currentCard = null;
    stopAudio();

    prepareDeck();
    renderScoreboardPills();
    updateTurnIndicator();
    updateUI();
    renderTimeline();
    renderMysteryStageInstructions();
  }

  function shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function isAudioCard(card) {
    if (!card) return false;
    const mType = card.media_type;
    const mFile = (card.media_file || '').toLowerCase();
    const cImg = (card.card_image || '').toLowerCase();
    return mType === 'audio' || mFile.endsWith('.mp3') || cImg.endsWith('.mp3');
  }

  function smartInterleaveDeck(cards) {
    if (!cards || cards.length <= 2) return shuffle(cards);

    const audios = shuffle(cards.filter(c => isAudioCard(c)));
    const others = shuffle(cards.filter(c => !isAudioCard(c)));

    // If there are no audio songs or only audio songs, fallback to regular shuffle
    if (audios.length === 0 || others.length === 0) {
      return shuffle(cards);
    }

    const result = [];
    // Spacing between songs (at least 2 non-songs if possible)
    const spacing = Math.max(2, Math.floor(others.length / audios.length));

    let otherIdx = 0;
    let audioIdx = 0;

    // Distribute evenly
    while (otherIdx < others.length || audioIdx < audios.length) {
      for (let s = 0; s < spacing && otherIdx < others.length; s++) {
        result.push(others[otherIdx++]);
      }
      if (audioIdx < audios.length) {
        result.push(audios[audioIdx++]);
      }
    }

    // Safety pass: strictly enforce zero adjacent audio cards
    for (let i = 0; i < result.length - 1; i++) {
      if (isAudioCard(result[i]) && isAudioCard(result[i + 1])) {
        let swapIdx = -1;
        for (let j = i + 2; j < result.length; j++) {
          if (!isAudioCard(result[j])) {
            swapIdx = j;
            break;
          }
        }
        if (swapIdx !== -1) {
          [result[i + 1], result[swapIdx]] = [result[swapIdx], result[i + 1]];
        }
      }
    }

    return result;
  }

  function prepareDeck() {
    discardedCards = [];
    timelineCards = [];
    drawDeck = smartInterleaveDeck([...masterDeck]);
    gameConfig.targetCards = masterDeck.length;
    console.log(`Deck prepared: ${drawDeck.length} cards with smart audio spacing (no consecutive songs).`);
  }

  function mediaThumb(card) {
    return card ? (card.card_image || card.media_file || '') : '';
  }

  // --- Fullscreen Cinema Modal Logic ---
  window.toggleFullScreen = function () {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        if (elements.fullScreenLabel) elements.fullScreenLabel.textContent = 'צא ממסך מלא';
        if (elements.fullScreenIcon) elements.fullScreenIcon.textContent = '✖';
      }).catch(() => { });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().then(() => {
          if (elements.fullScreenLabel) elements.fullScreenLabel.textContent = 'מסך מלא';
          if (elements.fullScreenIcon) elements.fullScreenIcon.textContent = '⛶';
        }).catch(() => { });
      }
    }
  };

  window.openMediaCinemaModal = function (card, titleOverride) {
    const modal = elements.mediaCinemaModal || document.getElementById('mediaCinemaModal');
    const content = elements.mediaCinemaContent || document.getElementById('mediaCinemaContent');
    if (!modal || !content || !card) return;

    const mediaType = card.media_type;
    const thumb = mediaThumb(card);
    const titleBadge = titleOverride ? `<div class="cinema-title-badge">${titleOverride}</div>` : '';

    stopAudio();

    // Capture playback position from background stage video before pausing
    let stageVideoTime = 0;
    if (elements.stageCardItem) {
      const bgVid = elements.stageCardItem.querySelector('video');
      if (bgVid) {
        try {
          stageVideoTime = bgVid.currentTime || 0;
          bgVid.pause();
        } catch (e) { }
      }
    }

    const isVideo = (mediaType === 'video') ||
      (card.media_file && (card.media_file.endsWith('.mp4') || card.media_file.includes('video') || card.media_file.startsWith('data:video'))) ||
      (thumb && (thumb.endsWith('.mp4') || thumb.includes('.mp4')));
    const videoSrc = (isVideo && card.media_file) ? card.media_file : thumb;

    if (isVideo && videoSrc) {
      content.innerHTML = `
        <div style="display:flex; flex-direction:column; align-items:center; max-height:82vh; max-width:95vw; width:100%;">
          ${titleBadge}
          <video src="${videoSrc}" controls autoplay playsinline loop class="cinema-view-video"></video>
        </div>
      `;
      // Seamless continuation: sync currentTime from stage video
      const cinVid = content.querySelector('video');
      if (cinVid && stageVideoTime > 0) {
        try {
          cinVid.currentTime = stageVideoTime;
        } catch (e) { }
      }
    } else if (mediaType === 'audio' || (thumb && thumb.endsWith('.mp3')) || (card.media_file && card.media_file.endsWith('.mp3'))) {
      const audioSrc = card.media_file || thumb;
      content.innerHTML = `
        <div style="text-align:center; color:#fff; padding:20px; display:flex; flex-direction:column; align-items:center;">
          ${titleBadge}
          <div class="vinyl-wrapper" style="margin:16px auto; width:160px; height:160px; position:relative;">
            <div class="vinyl-disc spinning" id="cinemaVinylDisc" style="width:100%; height:100%; border-radius:50%; background:radial-gradient(circle at 50% 50%, #202020 0%, #0d0d0d 100%); border:4px solid #333; position:relative; box-shadow:0 8px 30px rgba(0,0,0,0.85); display:flex; align-items:center; justify-content:center;">
              <div style="position:absolute; inset:18%; border-radius:50%; border:1px solid rgba(255,255,255,0.06);"></div>
              <div style="position:absolute; inset:32%; border-radius:50%; border:1px solid rgba(255,255,255,0.06);"></div>
              <div style="width:55px; height:55px; border-radius:50%; background:radial-gradient(circle, #f5d061 0%, #d4af37 100%); display:flex; align-items:center; justify-content:center; color:#111; font-weight:900; font-size:1.5rem; box-shadow:0 0 10px rgba(0,0,0,0.5);">🎵</div>
            </div>
          </div>
          <h2 style="font-size:1.7rem; color:#f5d061; margin-bottom:12px; font-weight:800;">האזינו לשיר ונחשו את השנה!</h2>
          ${audioSrc ? `<audio id="cinemaAudioPlayer" src="${audioSrc}" controls autoplay style="margin-top:8px; width:340px; max-width:90vw;"></audio>` : ''}
        </div>
      `;
      // Single audio source truth: sync vinyl disc spin with audio playback
      setTimeout(() => {
        const aud = content.querySelector('#cinemaAudioPlayer');
        const disc = content.querySelector('#cinemaVinylDisc');
        if (aud && disc) {
          aud.onplay = () => disc.classList.add('spinning');
          aud.onpause = () => disc.classList.remove('spinning');
          aud.onended = () => disc.classList.remove('spinning');
        }
      }, 50);
    } else if (thumb) {
      content.innerHTML = `
        <div style="display:flex; flex-direction:column; align-items:center; max-height:82vh; max-width:95vw;">
          ${titleBadge}
          <img src="${thumb}" alt="תמונת זיכרון" class="cinema-view-img">
        </div>
      `;
    } else {
      content.innerHTML = `
        <div style="text-align:center; color:#fff; padding:30px; display:flex; flex-direction:column; align-items:center;">
          ${titleBadge}
          <div style="font-size:5rem; margin:16px 0;">📷</div>
          <h2 style="font-size:1.6rem; color:#fff; margin-bottom:8px;">נחשו מה קרה ומתי!</h2>
        </div>
      `;
    }

    modal.classList.add('active');
  };

  window.closeMediaModal = function (e) {
    if (e) e.stopPropagation();
    const modal = elements.mediaCinemaModal || document.getElementById('mediaCinemaModal');
    if (!modal) return;
    const content = elements.mediaCinemaContent || document.getElementById('mediaCinemaContent');
    let modalVideoTime = 0;
    if (content) {
      const vid = content.querySelector('video');
      if (vid) {
        try {
          modalVideoTime = vid.currentTime || 0;
          vid.pause();
        } catch (err) { }
      }
      const aud = content.querySelector('audio');
      if (aud) {
        try { aud.pause(); } catch (err) { }
      }
    }
    stopAudio();
    modal.classList.remove('active');

    // Seamless continuation: resume playback on stage from the exact second modal closed
    if (elements.stageCardItem) {
      const stageVid = elements.stageCardItem.querySelector('video');
      if (stageVid) {
        try {
          if (modalVideoTime > 0) {
            stageVid.currentTime = modalVideoTime;
          }
          stageVid.play().catch(() => { });
        } catch (err) { }
      }
    }
  };

  window.toggleMediaModalFullscreen = function () {
    if (currentCard) {
      openMediaCinemaModal(currentCard);
    }
  };

  function drawNextMysteryCard() {
    if (drawDeck.length === 0) {
      showVictoryScreen();
      return;
    }

    currentCard = drawDeck.shift();
    isChecking = false;
    isCardActivated = true;
    stopAudio();

    // 1. Immediately open cinema modal so viewport is instantly covered (zero flicker underneath)
    openMediaCinemaModal(currentCard);

    // 2. Render background stage & timeline
    renderMysteryStageRevealed(currentCard);
    renderTimeline();
    updateTurnIndicator();

    if (elements.mediaFullscreenBtn) elements.mediaFullscreenBtn.style.display = 'inline-flex';
    if (elements.nextCardBtn) elements.nextCardBtn.style.display = 'none';
    if (elements.stageVerdict) elements.stageVerdict.style.display = 'none';
  }

  function renderMysteryStageInstructions() {
    currentCard = null;
    isChecking = false;
    isCardActivated = false;
    stopAudio();

    if (elements.stageVerdict) elements.stageVerdict.style.display = 'none';
    if (elements.mediaFullscreenBtn) elements.mediaFullscreenBtn.style.display = 'none';
    if (elements.dragHintPill) elements.dragHintPill.style.display = 'none';
    if (elements.stagePrompt) elements.stagePrompt.textContent = '';

    elements.stageCardItem.className = 'stage-card-item is-deck-stage';
    elements.stageCardItem.style.boxShadow = '';
    elements.stageCardItem.style.borderColor = '';
    elements.stageCardItem.style.borderWidth = '';
    elements.stageCardItem.style.border = '';
    elements.stageCardItem.style.zIndex = '';
    elements.stageCardItem.innerHTML = `
      <div class="deck-3d-wrapper" title="לחצו להתחלת המשחק!">
        <div class="deck-card-layer layer-3"></div>
        <div class="deck-card-layer layer-2"></div>
        <div class="deck-card-layer layer-1"></div>
        <div class="deck-top-card is-instructions">
          <div class="deck-instr-header">
            <span class="deck-instr-icon">📜</span>
            <h3 class="deck-instr-title">איך משחקים?</h3>
          </div>
          <div class="deck-instr-list">
            <div class="deck-instr-item">
              <div class="deck-instr-step">1</div>
              <div class="deck-instr-text"><strong>שולפים קלף</strong> – לוחצים וחושפים זיכרון (תמונה, וידאו, שיר או חידה)</div>
            </div>
            <div class="deck-instr-item">
              <div class="deck-instr-step">2</div>
              <div class="deck-instr-text"><strong>מנחשים את השנה</strong> – מזהים מה היה האירוע ומתי הוא קרה</div>
            </div>
            <div class="deck-instr-item">
              <div class="deck-instr-step">3</div>
              <div class="deck-instr-text"><strong>משבצים בציר הזמן</strong> – בוחרים משבצת ➕ מתאימה לפי השנים</div>
            </div>
          </div>
          <div class="deck-instr-footer">
            <button type="button" class="deck-start-btn" onclick="window.proceedToNextCard(event)">
              <span>התחילו לשחק</span> <span>🚀</span>
            </button>
          </div>
        </div>
      </div>
    `;

    if (elements.nextCardBtn) {
      elements.nextCardBtn.style.display = 'none';
    }

    window.proceedToNextCard = function (e) {
      if (e) e.stopPropagation();
      proceedToNextCard();
    };

    elements.stageCardItem.onclick = function (e) {
      window.proceedToNextCard(e);
    };
  }

  function renderMysteryStageDeckStack() {
    currentCard = null;
    isChecking = false;
    isCardActivated = false;
    stopAudio();

    if (elements.mediaFullscreenBtn) elements.mediaFullscreenBtn.style.display = 'none';
    if (elements.dragHintPill) elements.dragHintPill.style.display = 'none';
    if (elements.stagePrompt) elements.stagePrompt.textContent = '';
    if (elements.stageVerdict) elements.stageVerdict.style.display = 'none';
    if (elements.nextCardBtn) elements.nextCardBtn.style.display = 'none';

    const remaining = drawDeck.length;
    let drawText = '';
    if (remaining === 0) {
      drawText = '🏆 סיום המשחק';
    } else if (activePlayers.length > 1) {
      const nextPlayer = activePlayers[currentTurnIndex];
      drawText = `🃏 שלפו קלף (תור ${nextPlayer.name})`;
    } else {
      drawText = `🃏 שלפו קלף הבא (נותרו ${remaining})`;
    }

    elements.stageCardItem.className = 'stage-card-item is-deck-stage';
    elements.stageCardItem.style.boxShadow = '';
    elements.stageCardItem.style.borderColor = '';
    elements.stageCardItem.style.borderWidth = '';
    elements.stageCardItem.style.border = '';
    elements.stageCardItem.style.zIndex = '';
    elements.stageCardItem.style.cursor = 'pointer';
    elements.stageCardItem.innerHTML = `
      <div class="deck-3d-wrapper" title="לחצו לשליפת הקלף הבא!">
        <div class="deck-card-layer layer-3"></div>
        <div class="deck-card-layer layer-2"></div>
        <div class="deck-card-layer layer-1"></div>
        <div class="deck-top-card is-deck-back">
          <div class="card-back-pattern">
            <div class="card-inner-border">
              <div class="card-center-emblem">
                <span class="deck-emblem-icon">⏳</span>
                <span class="deck-emblem-text">ציר הזמן</span>
                <button type="button" class="deck-draw-action-btn" onclick="window.proceedToNextCard(event)">
                  <span>${drawText}</span>
                  <span>⬅️</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    window.proceedToNextCard = function (e) {
      if (e) e.stopPropagation();
      proceedToNextCard();
    };

    elements.stageCardItem.onclick = function (e) {
      window.proceedToNextCard(e);
    };
  }

  function renderMysteryStageRevealed(card) {
    if (!card) return;
    if (elements.stageVerdict) elements.stageVerdict.style.display = 'none';
    if (elements.nextCardBtn) elements.nextCardBtn.style.display = 'none';
    if (elements.dragHintPill) elements.dragHintPill.style.display = 'none';

    if (elements.stageCategory) {
      elements.stageCategory.style.display = 'none';
    }
    if (elements.stagePrompt) {
      elements.stagePrompt.textContent = '';
      elements.stagePrompt.style.display = 'none';
    }
    elements.stageCardItem.className = 'stage-card-item is-revealed';
    elements.stageCardItem.style.border = '';
    elements.stageCardItem.style.boxShadow = '';
    elements.stageCardItem.style.zIndex = '';
    elements.stageCardItem.onclick = function () {
      window.toggleMediaModalFullscreen();
    };

    const thumb = mediaThumb(card);
    const isModalActive = elements.mediaCinemaModal && elements.mediaCinemaModal.classList.contains('active');

    const isVideo = (card.media_type === 'video') ||
      (card.media_file && (card.media_file.endsWith('.mp4') || card.media_file.includes('video') || card.media_file.startsWith('data:video'))) ||
      (thumb && (thumb.endsWith('.mp4') || thumb.includes('.mp4')));
    const videoSrc = (isVideo && card.media_file) ? card.media_file : thumb;

    if (isVideo && videoSrc) {
      elements.stageCardItem.innerHTML = `
        <video src="${videoSrc}" controls ${isModalActive ? '' : 'autoplay'} playsinline loop style="max-width:100%; max-height:100%; width:auto; height:auto; object-fit:contain; border-radius:14px; box-shadow:0 12px 40px rgba(0,0,0,0.8);"></video>
      `;
    } else if (card.media_type === 'audio' || (thumb && thumb.endsWith('.mp3')) || (card.media_file && card.media_file.endsWith('.mp3'))) {
      elements.stageCardItem.innerHTML = `
        <div class="stage-audio-card-box" style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; width:100%; min-width:280px; max-width:360px; padding:20px 24px; background:radial-gradient(circle at 50% 50%, #1c1524 0%, #0d0814 100%); border-radius:18px; box-sizing:border-box;">
          <div class="vinyl-disc spinning" style="width:130px; height:130px; border-radius:50%; background:#111; border:3px solid #333; position:relative; box-shadow:0 8px 25px rgba(0,0,0,0.85); display:flex; align-items:center; justify-content:center;">
            <div style="position:absolute; inset:20%; border-radius:50%; border:1px solid rgba(255,255,255,0.06);"></div>
            <div style="width:48px; height:48px; border-radius:50%; background:radial-gradient(circle, #f5d061 0%, #d4af37 100%); display:flex; align-items:center; justify-content:center; color:#111; font-size:1.3rem; font-weight:900;">🎵</div>
          </div>
          <span style="font-size:1.05rem; color:var(--gold-light); font-weight:700; margin-top:14px;">רצועת שמע 🎵</span>
          <span style="font-size:0.85rem; color:var(--text-muted); margin-top:4px;">לחצו להגדלה ושליטה</span>
        </div>
      `;
    } else if (thumb) {
      elements.stageCardItem.innerHTML = `
        <img src="${thumb}" alt="קלף מסתורי" style="max-width:100%; max-height:100%; width:auto; height:auto; object-fit:contain; border-radius:14px; box-shadow:0 12px 40px rgba(0,0,0,0.8);">
      `;
    } else {
      elements.stageCardItem.innerHTML = `
        <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; color:var(--gold-light);">
          <span style="font-size:3rem; margin-bottom:8px;">📷</span>
          <span style="font-size:1.1rem; font-weight:700;">קלף מסתורי</span>
        </div>
      `;
    }

    if (elements.stageInstructions) elements.stageInstructions.style.display = 'none';
  }

  function activateCurrentCard() {
    if (!currentCard) return;
    openMediaCinemaModal(currentCard);
  }

  // ==========================================================================
  // Timeline Rendering & Slot Selection
  // ==========================================================================
  function renderTimeline() {
    elements.timelineTrack.innerHTML = '';

    const canPlace = currentCard !== null && isCardActivated && !isChecking;

    const slotCount = timelineCards.length + 1;
    for (let slotIdx = 0; slotIdx < slotCount; slotIdx++) {
      // Slender line slot with + badge - identical, smooth behavior across the entire game
      const slotEl = createSlenderSlotElement(slotIdx, canPlace);
      elements.timelineTrack.appendChild(slotEl);

      if (slotIdx < timelineCards.length) {
        const cardEl = createPlacedCardElement(timelineCards[slotIdx]);
        elements.timelineTrack.appendChild(cardEl);
      }
    }
  }

  function createFirstSlotElement() {
    const slotEl = document.createElement('div');
    slotEl.className = 'timeline-slot slot-first-card';
    slotEl.dataset.slotIndex = 0;
    slotEl.innerHTML = `
      <div class="slot-circle">➕</div>
      <div class="slot-label">התחלת ציר הזמן - שבצו כאן את הקלף הראשון!</div>
    `;
    slotEl.addEventListener('click', () => {
      handleSlotChosen(0);
    });
    return slotEl;
  }

  function createSlenderSlotElement(slotIndex, isActive) {
    const slotEl = document.createElement('div');
    slotEl.className = 'timeline-slot-slender' + (isActive ? '' : ' is-inactive');
    slotEl.dataset.slotIndex = slotIndex;
    const label = getSlotDescription(slotIndex);
    slotEl.innerHTML = `
      <span class="slot-slender-badge">+</span>
      <span class="slot-slender-tooltip">${label}</span>
    `;
    if (isActive) {
      slotEl.title = `שבצו כאן: ${label}`;
      slotEl.addEventListener('click', (e) => {
        e.stopPropagation();
        handleSlotChosen(slotIndex);
      });
    }
    return slotEl;
  }

  function createSlotElement(slotIndex) {
    return createSlenderSlotElement(slotIndex, true);
  }

  function getSlotDescription(index) {
    if (timelineCards.length === 0) return 'קלף ראשון בציר';
    if (index === 0) return `לפני ${timelineCards[0].year || ''}`;
    if (index === timelineCards.length) return `אחרי ${timelineCards[timelineCards.length - 1].year || ''}`;
    return `בין ${timelineCards[index - 1].year || ''} ל-${timelineCards[index].year || ''}`;
  }

  function createPlacedCardElement(card) {
    const cardEl = document.createElement('div');
    cardEl.className = 'timeline-card';

    const owner = card.ownerPlayer;
    let ownerBadge = '';
    if (owner && activePlayers.length > 1) {
      cardEl.classList.add(owner.cardClass);
      ownerBadge = `${owner.icon} ${owner.name}`;
    }

    const yearDisplay = card.year || '----';
    const mediaThumb = card.card_image || card.media_file || '';

    cardEl.innerHTML = `
      <div class="timeline-card-media">
        ${mediaThumb ? `<img src="${mediaThumb}" alt="${card.title || ''}" style="object-fit:cover; width:100%; height:100%;">` : '<div style="display:flex;align-items:center;justify-content:center;height:100%;font-size:2rem;">📷</div>'}
      </div>
      <div class="timeline-card-details">
        <div class="timeline-card-year">${yearDisplay}</div>
        <div class="timeline-card-title">${card.title || ''}</div>
        ${ownerBadge ? `<div class="timeline-card-owner">${ownerBadge}</div>` : ''}
      </div>
    `;

    cardEl.addEventListener('click', () => {
      playCardFlipSound();
      showCardDetailModal(card);
    });

    return cardEl;
  }

  function validatePlacement(card, slotIndex) {
    const cardYear = parseInt(card.year, 10);
    if (isNaN(cardYear)) return true;

    let prevYear = -Infinity;
    for (let i = slotIndex - 1; i >= 0; i--) {
      const y = parseInt(timelineCards[i].year, 10);
      if (!isNaN(y)) { prevYear = y; break; }
    }

    let nextYear = Infinity;
    for (let i = slotIndex; i < timelineCards.length; i++) {
      const y = parseInt(timelineCards[i].year, 10);
      if (!isNaN(y)) { nextYear = y; break; }
    }

    return cardYear >= prevYear && cardYear <= nextYear;
  }

  function handleSlotChosen(slotIndex) {
    if (isChecking) return;

    if (!currentCard) {
      showToast('פתחו קודם את הקלף! 🎴', 'toast-wrong', 2000);
      return;
    }

    isChecking = true;
    playCardFlipSound();

    // Immediately disable clicking on stage card and hide fullscreen button
    // This strictly prevents the card just placed from popping open again!
    if (elements.stageCardItem) {
      elements.stageCardItem.onclick = null;
      elements.stageCardItem.style.cursor = 'default';
    }
    if (elements.mediaFullscreenBtn) {
      elements.mediaFullscreenBtn.style.display = 'none';
    }

    // 1. Visually mark the selected slot so the player sees exactly where they guessed
    const targetSlot = document.querySelector(`.timeline-slot-slender[data-slot-index="${slotIndex}"]`);
    if (targetSlot) {
      targetSlot.classList.add('is-selected');
    }

    const placedCard = currentCard;
    const isCorrect = validatePlacement(placedCard, slotIndex);

    // 2. Reveal the real year and title directly on the central stage card with glowing frame!
    showStageCardReveal(placedCard, isCorrect);

    const curr = activePlayers[currentTurnIndex];

    if (isCorrect) {
      playSuccessChime();
      curr.score++;
      placedCard.ownerPlayer = curr;

      const scoreEl = document.getElementById(`playerScore_${currentTurnIndex}`);
      if (scoreEl) scoreEl.textContent = curr.score;

      // 3. Give 1.5 seconds to clearly see the real year on the card and the green glow
      setTimeout(() => {
        animateCardFlightToSlot(placedCard, targetSlot, slotIndex, () => {
          currentCard = null;
          isChecking = false;
          isCardActivated = false;

          if (activePlayers.length > 1) {
            toggleTeamTurn();
          }

          updateUI();
          renderMysteryStageDeckStack();
        });
      }, 1500);

    } else {
      playErrorBuzz();
      if (elements.stageCardItem) {
        elements.stageCardItem.classList.add('card-shake-wrong');
      }

      // 3. Give 2.0 seconds to see the real year and red glow, then fade out
      setTimeout(() => {
        if (elements.stageCardItem) {
          elements.stageCardItem.classList.add('fading-discard');
        }

        setTimeout(() => {
          discardedCards.push(placedCard);
          currentCard = null;
          isChecking = false;
          isCardActivated = false;

          if (activePlayers.length > 1) {
            toggleTeamTurn();
          }

          updateUI();
          renderTimeline();
          renderMysteryStageDeckStack();
        }, 400);
      }, 2000);
    }
  }

  function animateCardFlightToSlot(card, targetSlot, slotIndex, onComplete) {
    const stageEl = elements.stageCardItem;
    if (!stageEl) {
      timelineCards.splice(slotIndex, 0, card);
      renderTimeline();
      onComplete();
      return;
    }

    // 1. Pre-insert the card into timelineCards and render immediately:
    // This creates the permanent layout with zero shifting or jumping!
    timelineCards.splice(slotIndex, 0, card);
    renderTimeline();

    // 2. Find the target card element that was just created in the timeline
    const timelineCardEls = elements.timelineTrack.querySelectorAll('.timeline-card');
    const targetCardEl = timelineCardEls[slotIndex];

    if (!targetCardEl) {
      onComplete();
      return;
    }

    // Hide target card element momentarily while the flyer is flying towards it
    targetCardEl.style.opacity = '0';
    targetCardEl.style.transition = 'none';

    // 3. Measure start (stage) and destination (timeline) coordinates
    const startRect = stageEl.getBoundingClientRect();
    const destRect = targetCardEl.getBoundingClientRect();

    // 4. Create the traveling flyer clone
    const flyer = document.createElement('div');
    flyer.className = 'flying-card-clone';
    flyer.style.position = 'fixed';
    flyer.style.left = `${startRect.left}px`;
    flyer.style.top = `${startRect.top}px`;
    flyer.style.width = `${startRect.width}px`;
    flyer.style.height = `${startRect.height}px`;
    flyer.style.transformOrigin = 'top left';
    flyer.style.pointerEvents = 'none';
    flyer.style.zIndex = '99999';

    const thumb = mediaThumb(card);
    flyer.innerHTML = `
      <div style="width:100%; height:100%; position:relative; background:#0f172a; display:flex; flex-direction:column; border-radius:14px; overflow:hidden;">
        <div style="width:100%; height:100%; position:relative; overflow:hidden;">
          ${thumb ? `<img src="${thumb}" style="width:100%; height:100%; object-fit:cover;">` : '<div style="display:flex;align-items:center;justify-content:center;height:100%;font-size:3rem;">📷</div>'}
        </div>
        <div class="stage-reveal-overlay" style="padding:10px;">
          <div class="stage-reveal-year-badge" style="font-size:2rem; margin:0;">${card.year || ''}</div>
          <div class="stage-reveal-title" style="font-size:0.95rem;">${card.title || ''}</div>
        </div>
      </div>
    `;

    document.body.appendChild(flyer);

    // Hide verdict & reset tabletop stage underneath
    if (elements.stageVerdict) {
      elements.stageVerdict.style.display = 'none';
    }
    renderMysteryStageDeckStack();

    // Force reflow before GPU transition starts
    void flyer.offsetWidth;

    // 5. Hardware-accelerated GPU translation & scale directly to the slot (zero reflow, silky smooth!)
    const dx = destRect.left - startRect.left;
    const dy = destRect.top - startRect.top;
    const sx = destRect.width / startRect.width;
    const sy = destRect.height / startRect.height;

    flyer.style.transition = 'transform 0.7s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.7s ease';
    flyer.style.transform = `translate3d(${dx}px, ${dy}px, 0) scale(${sx}, ${sy})`;
    flyer.style.boxShadow = '0 10px 35px rgba(245, 208, 97, 0.95)';

    setTimeout(() => {
      flyer.remove();
      targetCardEl.style.transition = 'opacity 0.25s ease';
      targetCardEl.style.opacity = '1';
      targetCardEl.classList.add('just-landed-glow');
      playCardFlipSound();
      onComplete();
    }, 720);
  }

  function showStageCardReveal(card, isCorrect) {
    if (!elements.stageCardItem) return;

    const existingOverlay = elements.stageCardItem.querySelector('.stage-reveal-overlay');
    if (existingOverlay) existingOverlay.remove();

    const overlay = document.createElement('div');
    overlay.className = 'stage-reveal-overlay';
    overlay.innerHTML = `
      <div class="stage-reveal-year-badge">${card.year || '----'}</div>
      <div class="stage-reveal-title">${card.title || ''}</div>
    `;
    elements.stageCardItem.appendChild(overlay);

    // Ensure stage card sits high in stacking context during verification
    elements.stageCardItem.style.position = 'relative';
    elements.stageCardItem.style.zIndex = '35';

    if (isCorrect) {
      elements.stageCardItem.style.border = '4px solid #10b981';
      elements.stageCardItem.style.boxShadow = '0 0 35px rgba(16, 185, 129, 0.9), 0 12px 40px rgba(0,0,0,0.8)';
    } else {
      elements.stageCardItem.style.border = '4px solid #ef4444';
      elements.stageCardItem.style.boxShadow = '0 0 35px rgba(239, 68, 68, 0.9), 0 12px 40px rgba(0,0,0,0.8)';
    }
  }

  function setupNextCardButton() {
    if (elements.nextCardBtn) {
      elements.nextCardBtn.style.display = 'none';
    }
  }

  function proceedToNextCard() {
    clearTimeout(toastTimer);

    // 1. Block if currently checking, revealing, flying or drawing
    if (isChecking || isDrawingCard) return;

    // 2. Protect active card: if user already has an active card, they must place it first
    // This strictly prevents the card from vanishing or skipping on rapid clicks!
    if (currentCard !== null) {
      showToast('שבצו קודם את הקלף הפעיל בציר הזמן! 🎯', 'toast-wrong', 2200);
      return;
    }

    if (drawDeck.length === 0) {
      showVictoryScreen();
      return;
    }

    isDrawingCard = true;
    stopAudio();

    if (elements.stageVerdict) elements.stageVerdict.style.display = 'none';
    if (elements.nextCardBtn) elements.nextCardBtn.style.display = 'none';

    drawNextMysteryCard();

    // Release draw lock after 450ms debounce
    setTimeout(() => {
      isDrawingCard = false;
    }, 450);
  }

  function updateUI() {
    const totalCount = timelineCards.length;
    elements.progressCount.textContent = totalCount;
    elements.targetDisplay.textContent = gameConfig.targetCards;

    const pct = Math.min(100, Math.round((totalCount / gameConfig.targetCards) * 100));
    elements.progressBar.style.width = `${pct}%`;
  }

  // ==========================================================================
  // Victory Screen (Leaderboard)
  // ==========================================================================
  function showVictoryScreen() {
    playVictoryFanfare();
    elements.victoryModal.classList.remove('hidden');

    const sorted = [...activePlayers].sort((a, b) => b.score - a.score);
    const winner = sorted[0];
    const medals = ['🥇', '🥈', '🥉', '4️⃣'];

    const lb = elements.victoryLeaderboard;
    if (lb) {
      if (activePlayers.length > 1) {
        lb.innerHTML = sorted.map((p, idx) => `
          <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.06); padding:12px 18px; border-radius:12px; border:1px solid ${p.color}50;">
            <div style="display:flex; align-items:center; gap:10px;">
              <span style="font-size:1.4rem;">${medals[idx] || '🏅'}</span>
              <span style="font-size:1.2rem;">${p.icon}</span>
              <strong style="color:${p.color}; font-size:1.05rem;">${p.name}</strong>
            </div>
            <div style="font-size:1.2rem; font-weight:800; font-family:Outfit,sans-serif; color:#fff;">
              ${p.score} <span style="font-size:0.8rem; font-weight:400; color:var(--text-muted);">נק'</span>
            </div>
          </div>
        `).join('');
      } else {
        lb.innerHTML = `
          <div style="display:flex; justify-content:center; align-items:center; gap:12px; background:rgba(255,255,255,0.06); padding:16px 24px; border-radius:14px; border:1px solid rgba(245,208,97,0.35);">
            <span style="font-size:2rem;">🏆</span>
            <div style="font-size:1.35rem; font-weight:800; color:#f5d061;">
              סך הכל: ${winner.score} נקודות
            </div>
          </div>
        `;
      }
    }

    if (activePlayers.length > 1) {
      if (sorted.length > 1 && sorted[0].score === sorted[1].score) {
        elements.victoryTitle.textContent = 'תיקו הירואי! 🤝';
        elements.victorySubtitle.textContent = `שוויון מרתק בצמרת עם ${sorted[0].score} נקודות לכל אחד!`;
      } else {
        elements.victoryTitle.textContent = `הניצחון שייך ל${winner.name}! 🏆`;
        elements.victorySubtitle.textContent = `האלופים בציר הזמן עם ${winner.score} נקודות מנצחות!`;
      }
    } else {
      elements.victoryTitle.textContent = 'כל הכבוד! 🌟';
      elements.victorySubtitle.textContent = `השלמת בהצלחה את ציר הזמן עם ${winner.score} נקודות!`;
    }
  }
  window.showVictoryScreen = showVictoryScreen;

  // ==========================================================================
  // Card Detail Modal
  // ==========================================================================
  function showCardDetailModal(card) {
    if (!elements.cardDetailModal) return;
    elements.cardDetailYear.textContent = card.year || '';
    elements.cardDetailTitle.textContent = card.title || '';
    elements.cardDetailDescription.textContent = card.description || '';

    const mediaThumb = card.card_image || card.media_file || '';
    if (elements.cardDetailMedia) {
      if (card.media_type === 'video' || (mediaThumb && mediaThumb.endsWith('.mp4'))) {
        elements.cardDetailMedia.innerHTML = `
          <video src="${mediaThumb}" controls autoplay playsinline loop style="max-height:clamp(400px, 68vh, 780px); max-width:100%; width:auto; height:auto; object-fit:contain; border-radius:14px; box-shadow:0 12px 45px rgba(0,0,0,0.75);"></video>
        `;
      } else if (mediaThumb) {
        elements.cardDetailMedia.innerHTML = `
          <img src="${mediaThumb}" alt="${card.title || 'זיכרון'}" style="max-height:clamp(400px, 68vh, 780px); max-width:100%; width:auto; height:auto; object-fit:contain; border-radius:14px; box-shadow:0 12px 45px rgba(0,0,0,0.75);">
        `;
      } else {
        elements.cardDetailMedia.innerHTML = '';
      }
    }
    elements.cardDetailModal.classList.remove('hidden');
  }

  function closeCardDetailModal() {
    if (elements.cardDetailModal) {
      const vid = elements.cardDetailModal.querySelector('video');
      if (vid) { try { vid.pause(); } catch (e) { } }
      elements.cardDetailModal.classList.add('hidden');
    }
  }
  window.closeCardDetailModal = closeCardDetailModal;

  // ==========================================================================
  // Sound Effects
  // ==========================================================================
  function playCardFlipSound() {
    playBeep(440, 0.08, 'sine');
  }
  function playSuccessChime() {
    playBeep(523.25, 0.1, 'triangle');
    setTimeout(() => playBeep(659.25, 0.15, 'triangle'), 100);
    setTimeout(() => playBeep(783.99, 0.25, 'triangle'), 200);
  }
  function playErrorBuzz() {
    playBeep(180, 0.2, 'sawtooth');
  }
  function playVictoryFanfare() {
    playSuccessChime();
  }

  function playBeep(freq, duration, type = 'sine') {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) { }
  }

  function stopAudio() {
    if (elements.audioElement) {
      try {
        elements.audioElement.pause();
        elements.audioElement.currentTime = 0;
      } catch (e) { }
    }
    // Also pause and stop all audio elements inside cinema modal or stage
    try {
      const allAudios = document.querySelectorAll('audio');
      allAudios.forEach(a => {
        a.pause();
        a.currentTime = 0;
      });
      const allDiscs = document.querySelectorAll('.vinyl-disc');
      allDiscs.forEach(d => d.classList.remove('spinning'));
    } catch (e) { }
    isAudioPlaying = false;
  }

  function showToast(msg, typeClass, duration = 2500) {
    if (!elements.toastVerdict) return;
    clearTimeout(toastTimer);
    elements.toastMessage.textContent = msg;
    elements.toastVerdict.className = `toast-verdict show ${typeClass}`;
    toastTimer = setTimeout(() => {
      elements.toastVerdict.classList.remove('show');
    }, duration);
  }

  function handleKeyNavigation(e) {
    if (e.key === 'Escape') {
      window.closeMediaModal();
    } else if (e.key === 'ArrowRight') {
      elements.timelineTrack.scrollBy({ left: -320, behavior: 'smooth' });
    } else if (e.key === 'ArrowLeft') {
      elements.timelineTrack.scrollBy({ left: 320, behavior: 'smooth' });
    }
  }

  // Run on DOM ready or immediately if already loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGame);
  } else {
    initGame();
  }
})();
