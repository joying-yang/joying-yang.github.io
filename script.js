(function () {
  'use strict';

  var SECTIONS = ['education', 'work', 'projects', 'skills'];
  var LABELS = {
    education: 'Education',
    work: 'Work',
    projects: 'Projects',
    skills: 'Skills',
  };

  var body = document.body;
  var gate = document.getElementById('entry-gate');
  var experience = document.getElementById('experience');
  var main = document.getElementById('portfolio-main');
  var viewTitle = document.getElementById('view-title');
  var liveRegion = document.getElementById('live-region');
  var capabilityNote = document.getElementById('capability-note');
  var enterButton = document.getElementById('enter-button');
  var skip2dButton = document.getElementById('skip-2d-button');
  var modeToggle = document.getElementById('mode-toggle');
  var motionToggle = document.getElementById('motion-toggle');
  var previousButton = document.getElementById('previous-section');
  var nextButton = document.getElementById('next-section');
  var levelNumber = document.getElementById('level-number');
  var dialog = document.getElementById('project-dialog');
  var dialogContent = document.getElementById('dialog-content');
  var dialogClose = document.getElementById('dialog-close');
  var sectionElements = Array.prototype.slice.call(document.querySelectorAll('[data-section]'));
  var sectionLinks = Array.prototype.slice.call(document.querySelectorAll('[data-section-link]'));
  var rootUrl = new URL('./', window.location.href);
  var documentUrl = new URL(window.location.href);
  documentUrl.hash = '';
  var sectionBaseUrl = window.location.protocol === 'file:' ? documentUrl : rootUrl;
  var motionMedia = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };

  var storedMode = readPreference('liminal-mode');
  var storedMotion = readPreference('liminal-motion');
  var queryMode = new URL(window.location.href).searchParams.get('mode');
  var initialHash = parseSection(window.location.hash);

  var state = {
    entered: false,
    active: initialHash || 'education',
    settled: initialHash || 'education',
    displayed: initialHash || 'education',
    mode: queryMode === '2d' || storedMode === '2d' ? '2d' : '3d',
    reducedMotion: storedMotion === 'reduced' || (storedMotion !== 'full' && motionMedia.matches),
    phase: 'gate',
    transitionId: 0,
    sceneReady: false,
    sceneRetryNeeded: false,
    selectedEducationPage: 0,
    selectedProjectPage: 0,
    selectedSkillPage: 0,
    returnFocus: null,
    dialogClosePending: false,
  };

  var sceneController = null;
  var sceneAttempted = false;
  var sceneLoadState = 'idle';
  var sceneLoadCallbacks = [];
  var wheelAmount = 0;
  var wheelReset = 0;
  var wheelCooldownUntil = 0;
  var touchStart = null;
  var sectionObserver = null;
  var spatialProjectionActive = false;
  var spatialSizeKey = '';
  var spatialSizes = {};

  boot();

  function boot() {
    document.documentElement.classList.replace('no-js', 'js');
    experience.inert = true;
    experience.setAttribute('aria-hidden', 'true');
    viewTitle.hidden = true;
    applyMotionPreference();
    setMode(state.mode, false, true);
    bindEvents();
    startClock();
    updateNestedContent();

    window.requestAnimationFrame(function () {
      if (state.mode === '3d') {
        loadScene(function (loaded) {
          if (loaded && state.mode === '3d') ensureScene();
        });
      }
    });

    if (initialHash || queryMode === '2d') {
      revealExperience({ immediate: true, focus: false });
    } else {
      updateInterface(false);
    }

  }

  function bindEvents() {
    enterButton.addEventListener('click', enterGallery);
    skip2dButton.addEventListener('click', function () {
      setMode('2d', true);
      revealExperience({ immediate: true, focus: true });
    });

    var skipLink = document.querySelector('.skip-link');
    skipLink.addEventListener('click', function (event) {
      if (!state.entered) {
        event.preventDefault();
        setMode('2d', true);
        revealExperience({ immediate: true, focus: true });
      }
    });

    sectionLinks.forEach(function (link) {
      link.addEventListener('click', function (event) {
        event.preventDefault();
        if (!state.entered) revealExperience({ immediate: true, focus: false });
        goToSection(link.dataset.sectionLink, 'navigation', true);
      });
    });

    previousButton.addEventListener('click', function () { stepSection(-1, 'button'); });
    nextButton.addEventListener('click', function () { stepSection(1, 'button'); });

    modeToggle.addEventListener('click', function () {
      setMode(state.mode === '3d' ? '2d' : '3d', true);
    });

    motionToggle.addEventListener('click', function () {
      state.reducedMotion = !state.reducedMotion;
      writePreference('liminal-motion', state.reducedMotion ? 'reduced' : 'full');
      applyMotionPreference();
      announce(state.reducedMotion ? 'Reduced motion enabled' : 'Full motion enabled');
    });

    document.addEventListener('keydown', handleGlobalKeydown);
    window.addEventListener('wheel', handleWheel, { passive: false });
    experience.addEventListener('touchstart', handleTouchStart, { passive: true });
    experience.addEventListener('touchend', handleTouchEnd, { passive: true });
    experience.addEventListener('touchcancel', function () { touchStart = null; }, { passive: true });
    window.addEventListener('popstate', handleHistory);

    document.querySelectorAll('[data-education-page-action]').forEach(function (button) {
      button.addEventListener('click', function () {
        cycleEducationPage(button.dataset.educationPageAction === 'next' ? 1 : -1, false);
      });
      button.addEventListener('keydown', function (event) {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault();
          event.stopPropagation();
          cycleEducationPage(event.key === 'ArrowDown' ? 1 : -1, false);
        }
      });
    });

    var educationPageStage = document.getElementById('education-page-stage');
    educationPageStage.tabIndex = state.mode === '3d' ? 0 : -1;
    educationPageStage.setAttribute('aria-label', 'Education pages. Use up and down arrows to change page.');
    educationPageStage.addEventListener('keydown', function (event) {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        event.stopPropagation();
        cycleEducationPage(event.key === 'ArrowDown' ? 1 : -1, false);
      }
    });

    bindWorkStops();

    document.querySelectorAll('[data-project-action]').forEach(function (button) {
      button.addEventListener('click', function () {
        cycleProjectPage(button.dataset.projectAction === 'next' ? 1 : -1, false);
      });
      button.addEventListener('keydown', function (event) {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault();
          event.stopPropagation();
          cycleProjectPage(event.key === 'ArrowDown' ? 1 : -1, false);
        }
      });
    });

    var projectStage = document.getElementById('project-stage');
    var hasMultipleProjectPages = document.querySelectorAll('[data-project-page-index]').length > 1;
    projectStage.tabIndex = state.mode === '3d' && hasMultipleProjectPages ? 0 : -1;
    projectStage.setAttribute('aria-label', hasMultipleProjectPages ? 'Project pages. Use up and down arrows to change page.' : 'Selected project cards.');
    projectStage.addEventListener('keydown', function (event) {
      if (event.target !== projectStage) return;
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        event.stopPropagation();
        cycleProjectPage(event.key === 'ArrowDown' ? 1 : -1, false);
      }
    });
    bindProjectCards();

    document.querySelectorAll('[data-skill-page-action]').forEach(function (button) {
      button.addEventListener('click', function () {
        cycleSkillPage(button.dataset.skillPageAction === 'next' ? 1 : -1, false);
      });
      button.addEventListener('keydown', function (event) {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault();
          event.stopPropagation();
          cycleSkillPage(event.key === 'ArrowDown' ? 1 : -1, false);
        }
      });
    });

    var skillPageStage = document.getElementById('skill-page-stage');
    if (skillPageStage) {
      var hasMultipleSkillPages = document.querySelectorAll('[data-skill-page-index]').length > 1;
      skillPageStage.tabIndex = state.mode === '3d' && hasMultipleSkillPages ? 0 : -1;
      skillPageStage.setAttribute('aria-label', hasMultipleSkillPages ? 'Skills pages. Use up and down arrows to change page.' : 'Technology skills.');
      if (hasMultipleSkillPages) {
        skillPageStage.addEventListener('keydown', function (event) {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            event.stopPropagation();
            cycleSkillPage(event.key === 'ArrowDown' ? 1 : -1, false);
          }
        });
      }
    }

    document.querySelectorAll('[data-open-project]').forEach(function (link) {
      link.addEventListener('click', function (event) {
        if (!dialog || typeof dialog.showModal !== 'function') return;
        if (!window.PORTFOLIO_PROJECTS || !window.PORTFOLIO_PROJECTS[link.dataset.openProject]) return;
        event.preventDefault();
        openProject(link.dataset.openProject, link, true);
      });
    });

    dialogClose.addEventListener('click', requestDialogClose);
    dialog.addEventListener('cancel', function (event) {
      event.preventDefault();
      requestDialogClose();
    });
    dialog.addEventListener('click', function (event) {
      if (event.target === dialog) requestDialogClose();
    });

    if (motionMedia.addEventListener) {
      motionMedia.addEventListener('change', function (event) {
        if (readPreference('liminal-motion')) return;
        state.reducedMotion = event.matches;
        applyMotionPreference();
      });
    }
  }

  function ensureScene() {
    if (sceneController || sceneAttempted) return sceneController;
    if (!window.LiminalScene) {
      loadScene();
      if (sceneLoadState === 'failed') sceneAttempted = true;
      state.sceneReady = false;
      return null;
    }
    sceneAttempted = true;
    var canvas = document.getElementById('scene');

    sceneController = window.LiminalScene.create(canvas, {
      onReady: function () {
        state.sceneReady = true;
        state.sceneRetryNeeded = false;
        capabilityNote.innerHTML = '<span aria-hidden="true">SYS</span> Spatial layer ready';
        updateInterface(false);
      },
      onError: function () {
        state.sceneReady = false;
        capabilityNote.innerHTML = '<span aria-hidden="true">SYS</span> 2D presentation ready';
      },
      onLost: function () {
        state.sceneReady = false;
        state.sceneRetryNeeded = true;
        try { sceneController && sceneController.destroy(); } catch (error) { /* The lost context is already inert. */ }
        sceneController = null;
        sceneAttempted = false;
        var oldCanvas = document.getElementById('scene');
        if (oldCanvas && oldCanvas.parentNode) {
          var replacement = oldCanvas.cloneNode(false);
          replacement.removeAttribute('data-ready');
          oldCanvas.parentNode.replaceChild(replacement, oldCanvas);
        }
        capabilityNote.innerHTML = '<span aria-hidden="true">SYS</span> Spatial context paused; the 2D portfolio is ready';
        setMode('2d', false);
        if (state.phase === 'entering') {
          state.transitionId += 1;
          finishEntry(true);
        }
        announce('The spatial layer paused. The complete 2D portfolio remains available.');
      },
      onProjection: applySceneProjection,
    });

    if (sceneController) {
      sceneController.setReducedMotion(state.reducedMotion);
      if (state.entered) sceneController.setActive(state.active);
    }
    return sceneController;
  }

  function loadScene(callback) {
    if (callback) sceneLoadCallbacks.push(callback);
    if (window.LiminalScene) {
      sceneLoadState = 'loaded';
      flushSceneLoadCallbacks(true);
      return;
    }
    if (sceneLoadState === 'loading') return;
    if (sceneLoadState === 'failed') {
      flushSceneLoadCallbacks(false);
      return;
    }

    sceneLoadState = 'loading';
    var script = document.createElement('script');
    script.src = new URL('scene.js', rootUrl).href;
    script.async = true;
    script.onload = function () {
      var loaded = Boolean(window.LiminalScene);
      sceneLoadState = loaded ? 'loaded' : 'failed';
      if (!loaded) {
        sceneAttempted = true;
        capabilityNote.innerHTML = '<span aria-hidden="true">SYS</span> 2D presentation ready';
        if (state.mode === '3d') setMode('2d', false);
      }
      flushSceneLoadCallbacks(loaded);
    };
    script.onerror = function () {
      sceneLoadState = 'failed';
      sceneAttempted = true;
      capabilityNote.innerHTML = '<span aria-hidden="true">SYS</span> 2D presentation ready';
      if (state.mode === '3d') setMode('2d', false);
      flushSceneLoadCallbacks(false);
    };
    document.head.appendChild(script);
  }

  function flushSceneLoadCallbacks(loaded) {
    var callbacks = sceneLoadCallbacks.slice();
    sceneLoadCallbacks.length = 0;
    callbacks.forEach(function (callback) { callback(loaded); });
  }

  function enterGallery() {
    if (state.phase !== 'gate') return;
    state.phase = 'entering';
    body.dataset.state = 'entering';
    body.dataset.travelPhase = 'depart';
    gate.inert = true;
    gate.setAttribute('aria-hidden', 'true');
    experience.inert = false;
    experience.removeAttribute('aria-hidden');
    main.inert = true;
    viewTitle.hidden = false;

    if (state.mode === '2d' || state.reducedMotion) {
      if (state.mode === '3d' && state.reducedMotion) {
        loadScene(function (loaded) { if (loaded && state.mode === '3d') ensureScene(); });
      }
      window.setTimeout(function () { finishEntry(true); }, state.reducedMotion ? 0 : 120);
      return;
    }

    var entryId = ++state.transitionId;
    var fallbackTimer = window.setTimeout(function () {
      if (state.phase !== 'entering' || entryId !== state.transitionId) return;
      setMode('2d', false);
      capabilityNote.innerHTML = '<span aria-hidden="true">SYS</span> Spatial layer is taking a moment; content is ready';
      finishEntry(true);
    }, 1200);

    loadScene(function (loaded) {
      if (entryId !== state.transitionId || state.phase !== 'entering') return;
      var controller = loaded ? ensureScene() : null;
      if (!controller) {
        window.clearTimeout(fallbackTimer);
        setMode('2d', false);
        capabilityNote.innerHTML = '<span aria-hidden="true">SYS</span> Showing the complete 2D presentation';
        finishEntry(true);
        return;
      }
      controller.enter(function () {
        window.clearTimeout(fallbackTimer);
        if (entryId !== state.transitionId || state.mode !== '3d') return;
        finishEntry(false);
      });
    });
  }

  function revealExperience(options) {
    options = options || {};
    state.entered = true;
    state.phase = 'idle';
    state.transitionId += 1;
    body.dataset.state = 'browsing';
    gate.hidden = true;
    gate.inert = true;
    gate.setAttribute('aria-hidden', 'true');
    experience.inert = false;
    experience.removeAttribute('aria-hidden');
    main.inert = false;
    viewTitle.hidden = false;
    state.settled = state.active;
    showSection(state.active);
    if (sceneController) sceneController.setActive(state.active);
    updateInterface(true);
    setSectionUrl(state.active, false);
    positionInitial2dSection();
    if (options.focus) focusSection(state.active);
  }

  function finishEntry(fromFallback) {
    state.entered = true;
    state.phase = 'idle';
    body.dataset.state = 'browsing';
    gate.hidden = true;
    gate.inert = true;
    gate.setAttribute('aria-hidden', 'true');
    experience.inert = false;
    experience.removeAttribute('aria-hidden');
    main.inert = false;
    viewTitle.hidden = false;
    state.settled = state.active;
    showSection(state.active);
    if (state.mode === '3d' && sceneController) sceneController.setActive(state.active);
    updateInterface(true);
    setSectionUrl(state.active, false);
    positionInitial2dSection();
    focusSection(state.active);
    announce((fromFallback && state.mode === '2d' ? '2D presentation. ' : '') + sectionAnnouncement(state.active));
  }

  function goToSection(id, source, pushHistory) {
    if (SECTIONS.indexOf(id) === -1) return;
    if (!state.entered) {
      state.active = id;
      revealExperience({ immediate: true, focus: false });
    }

    if (state.mode === '2d') {
      state.active = id;
      state.settled = id;
      body.dataset.active = id;
      updateInterface(true);
      if (pushHistory) setSectionUrl(id, true);
      var section = document.getElementById(id);
      section.scrollIntoView({ behavior: state.reducedMotion ? 'auto' : 'smooth', block: 'start' });
      if (source !== 'scroll') window.setTimeout(function () { focusSection(id); }, state.reducedMotion ? 0 : 260);
      announce(sectionAnnouncement(id));
      return;
    }

    if (state.phase === 'transitioning') return;

    if (id === state.settled && state.phase === 'idle') {
      if (source === 'navigation' || source === 'button') focusSection(id);
      return;
    }

    var transitionId = ++state.transitionId;
    state.phase = 'transitioning';
    state.active = id;
    body.dataset.active = id;
    body.classList.add('is-transitioning');
    main.inert = true;
    updateInterface(false);
    if (pushHistory) setSectionUrl(id, true);

    function settle() {
      if (transitionId !== state.transitionId) return;
      state.phase = 'idle';
      state.settled = id;
      showSection(id);
      body.classList.remove('is-transitioning');
      main.inert = false;
      updateInterface(true);
      focusSection(id);
      announce(sectionAnnouncement(id));
    }

    if (sceneController) {
      sceneController.goTo(id, settle);
    } else {
      window.setTimeout(settle, state.reducedMotion ? 0 : 320);
    }
  }

  function showSection(id) {
    state.displayed = id;
    var spatialShells = state.mode === '3d' && body.classList.contains('has-scene-projection') && window.innerWidth >= 768;
    sectionElements.forEach(function (section) {
      var isActive = section.dataset.section === id;
      if (state.mode === '2d') {
        section.hidden = false;
        section.classList.toggle('is-active', isActive);
        section.inert = false;
        section.removeAttribute('aria-hidden');
      } else if (spatialShells) {
        section.hidden = false;
        section.classList.toggle('is-active', isActive);
        section.inert = !isActive;
        if (isActive) section.removeAttribute('aria-hidden');
        else section.setAttribute('aria-hidden', 'true');
      } else {
        section.hidden = !isActive;
        section.classList.toggle('is-active', isActive);
        section.inert = !isActive;
        if (isActive) section.removeAttribute('aria-hidden');
        else section.setAttribute('aria-hidden', 'true');
      }
    });
  }

  function applySceneProjection(payload) {
    var forcedColors = window.matchMedia && window.matchMedia('(forced-colors: active)').matches;
    if (!payload || state.mode !== '3d' || payload.quality === 'mobile' || !payload.frames || forcedColors) {
      clearSceneProjection();
      return;
    }

    if (!spatialProjectionActive) {
      spatialProjectionActive = true;
      body.classList.add('has-scene-projection');
      showSection(state.displayed);
    }

    var nextSizeKey = payload.width + 'x' + payload.height;
    if (spatialSizeKey !== nextSizeKey) {
      spatialSizeKey = nextSizeKey;
      spatialSizes = {};
      sectionElements.forEach(function (section) {
        var computed = window.getComputedStyle(section);
        var projectedSource = payload.panelSourceSize || {};
        var canonicalWidth = parseFloat(projectedSource.width) || parseFloat(computed.getPropertyValue('--spatial-panel-width'));
        var canonicalHeight = parseFloat(projectedSource.height) || parseFloat(computed.getPropertyValue('--spatial-panel-height'));
        spatialSizes[section.dataset.section] = {
          width: canonicalWidth || section.offsetWidth || 620,
          height: canonicalHeight || section.offsetHeight || 680,
        };
        section.style.setProperty('--spatial-panel-width', spatialSizes[section.dataset.section].width + 'px');
        section.style.setProperty('--spatial-panel-height', spatialSizes[section.dataset.section].height + 'px');
      });
    }

    var raw = clamp(payload.raw == null ? 1 : payload.raw, 0, 1);
    var canonicalRaw = clamp(payload.canonicalRaw == null ? (payload.reverse ? 1 - raw : raw) : payload.canonicalRaw, 0, 1);
    var isTraveling = payload.phase === 'transitioning' || payload.phase === 'entering';
    var isGateVista = payload.phase === 'gate' && body.dataset.state === 'gate';
    var travelPhase = isGateVista ? 'vista' : !isTraveling ? 'idle' : raw < 0.22 ? 'depart' : raw < 0.66 ? 'traverse' : 'approach';
    body.dataset.travelPhase = travelPhase;
    if (isTraveling) body.dataset.travelDirection = payload.reverse ? 'backward' : 'forward';
    else delete body.dataset.travelDirection;

    var swapPoint = payload.reverse ? 0.16 : 0.84;
    if (payload.phase === 'transitioning' && state.phase === 'transitioning' && payload.to === state.active && raw >= swapPoint && state.displayed !== payload.to) {
      showSection(payload.to);
    }

    sectionElements.forEach(function (section, index) {
      var id = section.dataset.section;
      var frame = payload.frames[id];
      var size = spatialSizes[id];
      var matrix = frame && frame.visible ? quadMatrix(frame.corners, size.width, size.height) : null;
      var isFrom = id === payload.from;
      var isTo = id === payload.to;
      var isCanonicalLower = id === payload.lower;
      var isCanonicalUpper = id === payload.upper;
      var isDisplayed = id === state.displayed;
      var alpha = 0;

      if (matrix) {
        var gateAlpha = clamp(0.9 - frame.depth * 0.009, 0.55, 0.8);
        if (isGateVista) {
          alpha = gateAlpha;
        } else if (!isTraveling) {
          alpha = isDisplayed ? 1 : clamp(frame.emphasis * 1.45, 0.08, 0.42);
        } else if (payload.phase === 'entering') {
          var destinationDistance = Math.abs(index - SECTIONS.indexOf(payload.to));
          var destinationAlpha = destinationDistance === 0 ? 1 : destinationDistance === 1 ? 0.319 : 0.094;
          alpha = mix(gateAlpha, destinationAlpha, smoothstep(0.04, 0.92, raw));
        } else if (isCanonicalLower) {
          alpha = mix(1, 0.12, smoothstep(0.22, 0.62, canonicalRaw));
        } else if (isCanonicalUpper) {
          alpha = mix(0.34, 1, smoothstep(0.42, 0.92, canonicalRaw));
        } else {
          alpha = clamp(frame.emphasis * 1.5, 0.07, 0.38);
        }
        alpha *= smoothstep(1.35, 3.25, frame.depth);
        if (payload.quality === 'tablet' && Math.abs(index - payload.route) > 1.25 && !isFrom && !isTo) alpha = 0;
      }

      var detailOpacity = 0;
      if (isGateVista) {
        detailOpacity = 0;
      } else if (!isTraveling) {
        detailOpacity = isDisplayed ? 1 : 0;
      } else if (payload.phase === 'entering') {
        detailOpacity = isDisplayed ? smoothstep(0.68, 0.98, raw) : 0;
      } else if (isDisplayed && isCanonicalLower) {
        detailOpacity = 1 - smoothstep(0.06, 0.34, canonicalRaw);
      } else if (isDisplayed && isCanonicalUpper) {
        detailOpacity = smoothstep(0.84, 0.97, canonicalRaw);
      }

      var destinationFill = isDisplayed ? mix(isTraveling ? 0.4 : 0.18, 0.78, detailOpacity) : 0.09;
      var fillOpacity = isGateVista
        ? 0.035
        : payload.phase === 'entering'
          ? mix(0.035, destinationFill, smoothstep(0.04, 0.5, raw))
          : destinationFill;
      var destinationTeaser = isDisplayed ? 0 : clamp(alpha * 1.45, 0, 0.72);
      var teaserOpacity = isGateVista
        ? 0.94
        : payload.phase === 'entering'
          ? raw < 0.22
            ? mix(0.94, 0, smoothstep(0.02, 0.18, raw))
            : mix(0, destinationTeaser, smoothstep(0.24, 0.5, raw))
          : destinationTeaser;

      var nativeFocused = Boolean(matrix && payload.phase === 'idle' && isDisplayed && isAxisAlignedQuad(frame.corners));
      applyProjectedPanel(section, matrix, size);
      if (nativeFocused) applyNativeFocusedPanel(section, frame.corners, size);
      else clearNativeFocusedPanel(section);
      section.style.opacity = String(alpha);
      section.style.visibility = alpha > 0.015 ? 'visible' : 'hidden';
      section.style.zIndex = isGateVista ? String(Math.max(1, 100 - Math.round((frame && frame.depth) || 90))) : isDisplayed ? '5' : String(Math.max(1, 4 - Math.round((frame && frame.depth) || 3)));
      section.style.setProperty('--detail-opacity', detailOpacity.toFixed(3));
      section.style.setProperty('--teaser-opacity', teaserOpacity.toFixed(3));
      section.style.setProperty('--plane-fill', fillOpacity.toFixed(3));
    });
  }

  function clearSceneProjection() {
    if (!spatialProjectionActive) return;
    spatialProjectionActive = false;
    spatialSizeKey = '';
    spatialSizes = {};
    body.classList.remove('has-scene-projection');
    delete body.dataset.travelPhase;
    delete body.dataset.travelDirection;
    sectionElements.forEach(function (section) {
      section.style.removeProperty('transform');
      section.style.removeProperty('left');
      section.style.removeProperty('top');
      section.style.removeProperty('width');
      section.style.removeProperty('height');
      section.style.removeProperty('opacity');
      section.style.removeProperty('visibility');
      section.style.removeProperty('z-index');
      section.style.removeProperty('--detail-opacity');
      section.style.removeProperty('--teaser-opacity');
      section.style.removeProperty('--plane-fill');
      section.style.removeProperty('--spatial-panel-width');
      section.style.removeProperty('--spatial-panel-height');
      clearNativeFocusedPanel(section);
    });
    showSection(state.displayed);
  }

  function applyNativeFocusedPanel(section, corners, size) {
    var xs = corners.map(function (corner) { return corner[0]; });
    var ys = corners.map(function (corner) { return corner[1]; });
    var left = snapToDevicePixel(Math.min.apply(Math, xs));
    var right = snapToDevicePixel(Math.max.apply(Math, xs));
    var top = snapToDevicePixel(Math.min.apply(Math, ys));
    var bottom = snapToDevicePixel(Math.max.apply(Math, ys));
    var width = Math.max(1, right - left);
    var height = Math.max(1, bottom - top);
    var contentScale = width / size.width;

    section.classList.add('is-native-focused');
    section.style.setProperty('--native-focus-left', left + 'px');
    section.style.setProperty('--native-focus-top', top + 'px');
    section.style.setProperty('--native-focus-width', width + 'px');
    section.style.setProperty('--native-focus-height', height + 'px');
    section.style.setProperty('--native-focus-scale', contentScale.toFixed(6));
    section.style.setProperty('--native-focus-content-height', (height / contentScale) + 'px');
  }

  function applyProjectedPanel(section, matrix, size) {
    section.style.left = '0px';
    section.style.top = '0px';
    section.style.width = size.width + 'px';
    section.style.height = size.height + 'px';
    if (matrix) section.style.transform = matrix;
  }

  function clearNativeFocusedPanel(section) {
    section.classList.remove('is-native-focused');
    section.style.removeProperty('--native-focus-left');
    section.style.removeProperty('--native-focus-top');
    section.style.removeProperty('--native-focus-width');
    section.style.removeProperty('--native-focus-height');
    section.style.removeProperty('--native-focus-scale');
    section.style.removeProperty('--native-focus-content-height');
  }

  function isAxisAlignedQuad(corners) {
    if (!corners || corners.length !== 4) return false;
    var tolerance = 0.75;
    return Math.abs(corners[0][1] - corners[1][1]) <= tolerance &&
      Math.abs(corners[1][0] - corners[2][0]) <= tolerance &&
      Math.abs(corners[2][1] - corners[3][1]) <= tolerance &&
      Math.abs(corners[3][0] - corners[0][0]) <= tolerance;
  }

  function snapToDevicePixel(value) {
    var dpr = window.devicePixelRatio || 1;
    return Math.round(value * dpr) / dpr;
  }

  function quadMatrix(corners, width, height) {
    if (!corners || corners.length !== 4 || width <= 0 || height <= 0) return null;
    var x0 = corners[0][0]; var y0 = corners[0][1];
    var x1 = corners[1][0]; var y1 = corners[1][1];
    var x2 = corners[2][0]; var y2 = corners[2][1];
    var x3 = corners[3][0]; var y3 = corners[3][1];
    var dx1 = x1 - x2; var dx2 = x3 - x2; var dx3 = x0 - x1 + x2 - x3;
    var dy1 = y1 - y2; var dy2 = y3 - y2; var dy3 = y0 - y1 + y2 - y3;
    var projectX = 0;
    var projectY = 0;
    var determinant = dx1 * dy2 - dx2 * dy1;

    if (Math.abs(dx3) > 0.0001 || Math.abs(dy3) > 0.0001) {
      if (Math.abs(determinant) < 0.000001) return null;
      projectX = (dx3 * dy2 - dx2 * dy3) / determinant;
      projectY = (dx1 * dy3 - dx3 * dy1) / determinant;
    }

    var scaleX = x1 - x0 + projectX * x1;
    var shearX = x3 - x0 + projectY * x3;
    var scaleY = y1 - y0 + projectX * y1;
    var shearY = y3 - y0 + projectY * y3;
    var values = [
      scaleX / width, scaleY / width, 0, projectX / width,
      shearX / height, shearY / height, 0, projectY / height,
      0, 0, 1, 0,
      x0, y0, 0, 1,
    ];
    if (!values.every(function (value) { return isFinite(value); })) return null;
    return 'matrix3d(' + values.map(function (value) { return Math.abs(value) < 0.0000001 ? '0' : value.toFixed(8); }).join(',') + ')';
  }

  function stepSection(direction, source) {
    if (state.phase !== 'idle') return;
    var current = SECTIONS.indexOf(state.settled);
    var next = Math.max(0, Math.min(SECTIONS.length - 1, current + direction));
    if (next !== current) goToSection(SECTIONS[next], source || 'button', true);
  }

  function updateInterface(updateDocumentTitle) {
    var index = Math.max(0, SECTIONS.indexOf(state.active));
    sectionLinks.forEach(function (link) {
      if (link.dataset.sectionLink === state.active) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
      if (state.phase === 'transitioning') link.setAttribute('aria-disabled', 'true');
      else link.removeAttribute('aria-disabled');
    });
    levelNumber.textContent = pad(index + 1);
    previousButton.disabled = state.phase === 'transitioning' || index === 0;
    nextButton.disabled = state.phase === 'transitioning' || index === SECTIONS.length - 1;
    body.dataset.active = state.active;
    viewTitle.textContent = LABELS[state.active] + ' — Joy In';
    if (updateDocumentTitle) document.title = LABELS[state.active] + ' — Joy In';

    var modeLabel = modeToggle.querySelector('span:last-child');
    modeLabel.textContent = state.mode === '3d' ? 'Use 2D mode' : state.sceneRetryNeeded ? 'Retry spatial mode' : 'Use spatial mode';
    var motionLabel = motionToggle.querySelector('span:last-child');
    motionLabel.textContent = state.reducedMotion ? 'Motion: reduced' : 'Motion: full';
  }

  function setMode(mode, explicit, initial) {
    if (mode !== '2d' && mode !== '3d') return;
    if (mode === '3d') {
      body.dataset.mode = '3d';
      if (!window.LiminalScene) {
        loadScene(function (loaded) {
          if (!loaded || state.mode !== '3d') return;
          sceneAttempted = false;
          var controller = ensureScene();
          if (!controller) {
            capabilityNote.innerHTML = '<span aria-hidden="true">SYS</span> Spatial mode is unavailable; 2D remains active';
            setMode('2d', false);
            return;
          }
          if (state.entered) controller.setActive(state.active);
        });
      }
      ensureScene();
      if (sceneAttempted && !sceneController) {
        mode = '2d';
        capabilityNote.innerHTML = '<span aria-hidden="true">SYS</span> Spatial mode is unavailable; 2D remains active';
      }
    }

    if (mode === '2d') clearSceneProjection();
    state.mode = mode;
    body.dataset.mode = mode;
    updateEducationPages(true);
    updateProjectPages(true);
    updateSkillPages(true);
    var educationPageStage = document.getElementById('education-page-stage');
    if (educationPageStage) educationPageStage.tabIndex = mode === '3d' ? 0 : -1;
    var projectStage = document.getElementById('project-stage');
    if (projectStage) {
      var hasMultipleProjectPages = document.querySelectorAll('[data-project-page-index]').length > 1;
      projectStage.tabIndex = mode === '3d' && hasMultipleProjectPages ? 0 : -1;
    }
    var skillPageStage = document.getElementById('skill-page-stage');
    if (skillPageStage) {
      var hasMultipleSkillPages = document.querySelectorAll('[data-skill-page-index]').length > 1;
      skillPageStage.tabIndex = mode === '3d' && hasMultipleSkillPages ? 0 : -1;
    }
    if (explicit) writePreference('liminal-mode', mode);
    if (state.entered) {
      if (state.phase === 'transitioning') {
        state.transitionId += 1;
        state.phase = 'idle';
        state.settled = state.active;
        body.classList.remove('is-transitioning');
        main.inert = false;
      }
      showSection(state.active);
      if (mode === '3d' && sceneController) sceneController.setActive(state.active);
    }
    updateInterface(false);
    if (state.entered && mode === '2d') positionInitial2dSection();
    else setup2dObserver();

    if (!initial && explicit) {
      var url = new URL(window.location.href);
      if (mode === '2d') url.searchParams.set('mode', '2d');
      else url.searchParams.delete('mode');
      if (state.entered) url.hash = state.active;
      var nextHistoryState = Object.assign({}, window.history.state || {}, { mode: mode, section: state.active });
      try { window.history.replaceState(nextHistoryState, '', url.href); } catch (error) { /* The visible mode still changes on restrictive file origins. */ }
      announce(mode === '2d' ? '2D presentation enabled' : 'Spatial presentation enabled');
    }
  }

  function applyMotionPreference() {
    body.classList.toggle('reduce-motion', state.reducedMotion);
    if (state.reducedMotion) {
      document.querySelectorAll('[data-work-stop]').forEach(function (stop) {
        setWorkStop(stop, Boolean(stop._workStopTarget), true);
      });
    }
    if (sceneController) sceneController.setReducedMotion(state.reducedMotion);
    updateInterface(false);
  }

  function setup2dObserver() {
    if (sectionObserver) {
      sectionObserver.disconnect();
      sectionObserver = null;
    }
    if (!state.entered || state.mode !== '2d' || !('IntersectionObserver' in window)) return;

    sectionObserver = new IntersectionObserver(function (entries) {
      var visible = entries
        .filter(function (entry) { return entry.isIntersecting; })
        .sort(function (a, b) { return b.intersectionRatio - a.intersectionRatio; });
      if (!visible.length) return;
      var id = visible[0].target.dataset.section;
      if (id === state.active || SECTIONS.indexOf(id) === -1) return;
      state.active = id;
      state.settled = id;
      updateInterface(true);
      setSectionUrl(id, false);
    }, { rootMargin: '-18% 0px -55% 0px', threshold: [0.08, 0.25, 0.5] });

    sectionElements.forEach(function (section) { sectionObserver.observe(section); });
  }

  function positionInitial2dSection() {
    if (state.mode !== '2d') {
      setup2dObserver();
      return;
    }
    window.requestAnimationFrame(function () {
      var target = document.getElementById(state.active);
      if (target && state.active !== 'education') target.scrollIntoView({ behavior: 'auto', block: 'start' });
      window.requestAnimationFrame(setup2dObserver);
    });
  }

  function handleGlobalKeydown(event) {
    if (!state.entered || state.phase === 'project' || isEditable(event.target)) return;
    if (state.mode !== '3d') return;
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      stepSection(-1, 'keyboard');
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      stepSection(1, 'keyboard');
    } else if (event.key === 'Home') {
      event.preventDefault();
      goToSection(SECTIONS[0], 'keyboard', true);
    } else if (event.key === 'End') {
      event.preventDefault();
      goToSection(SECTIONS[SECTIONS.length - 1], 'keyboard', true);
    }
  }

  function handleWheel(event) {
    if (!state.entered || state.mode !== '3d' || state.phase !== 'idle' || dialog.open) return;
    if (event.ctrlKey) return;
    if (Date.now() < wheelCooldownUntil || panelCanScroll(event.target, event.deltaY)) return;
    var delta = event.deltaY;
    if (event.deltaMode === 1) delta *= 16;
    if (event.deltaMode === 2) delta *= window.innerHeight;
    if (Math.abs(delta) < 1) return;
    event.preventDefault();
    wheelAmount += delta;
    window.clearTimeout(wheelReset);
    wheelReset = window.setTimeout(function () { wheelAmount = 0; }, 180);
    if (Math.abs(wheelAmount) >= 100) {
      var direction = wheelAmount > 0 ? 1 : -1;
      wheelAmount = 0;
      wheelCooldownUntil = Date.now() + 760;
      stepSection(direction, 'wheel');
    }
  }

  function handleTouchStart(event) {
    if (!state.entered || state.mode !== '3d' || state.phase !== 'idle' || dialog.open) return;
    if (event.touches.length !== 1) {
      touchStart = null;
      return;
    }
    var touch = event.changedTouches[0];
    touchStart = { x: touch.clientX, y: touch.clientY, id: touch.identifier, time: Date.now() };
  }

  function handleTouchEnd(event) {
    if (!touchStart || state.mode !== '3d' || state.phase !== 'idle') return;
    var touch = Array.prototype.slice.call(event.changedTouches).filter(function (item) { return item.identifier === touchStart.id; })[0];
    if (!touch) return;
    var dx = touch.clientX - touchStart.x;
    var dy = touch.clientY - touchStart.y;
    touchStart = null;
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.25) return;
    stepSection(dx < 0 ? 1 : -1, 'touch');
  }

  function panelCanScroll(target, delta) {
    var panel = target && target.closest ? target.closest('.panel-scroll') : null;
    if (!panel || panel.scrollHeight <= panel.clientHeight + 1) return false;
    var overflowY = window.getComputedStyle(panel).overflowY;
    if (overflowY !== 'auto' && overflowY !== 'scroll') return false;
    if (delta > 0) return panel.scrollTop + panel.clientHeight < panel.scrollHeight - 1;
    if (delta < 0) return panel.scrollTop > 1;
    return false;
  }

  function cycleEducationPage(direction, silent) {
    var pages = Array.prototype.slice.call(document.querySelectorAll('[data-education-page-index]'));
    if (!pages.length) return;
    var previousPage = state.selectedEducationPage;
    state.selectedEducationPage = Math.max(0, Math.min(pages.length - 1, state.selectedEducationPage + direction));
    updateEducationPages(silent || previousPage === state.selectedEducationPage);
  }

  function updateEducationPages(silent) {
    var pages = Array.prototype.slice.call(document.querySelectorAll('[data-education-page-index]'));
    if (!pages.length) return;
    state.selectedEducationPage = Math.max(0, Math.min(pages.length - 1, state.selectedEducationPage));
    var expanded = state.mode === '2d';

    pages.forEach(function (page, index) {
      var selected = index === state.selectedEducationPage;
      page.hidden = !expanded && !selected;
      page.inert = !expanded && !selected;
      page.classList.toggle('is-selected', selected);
    });

    var counter = document.getElementById('education-page-count');
    if (counter) counter.textContent = pad(state.selectedEducationPage + 1) + ' / ' + pad(pages.length);
    var previousButton = document.querySelector('[data-education-page-action="previous"]');
    var nextButton = document.querySelector('[data-education-page-action="next"]');
    if (previousButton) previousButton.disabled = state.selectedEducationPage === 0;
    if (nextButton) nextButton.disabled = state.selectedEducationPage === pages.length - 1;

    if (!silent) {
      var selectedPage = pages[state.selectedEducationPage];
      announce((selectedPage.dataset.pageLabel || 'Education page') + ', page ' + (state.selectedEducationPage + 1) + ' of ' + pages.length);
    }
  }

  function cycleSkillPage(direction, silent) {
    var pages = Array.prototype.slice.call(document.querySelectorAll('[data-skill-page-index]'));
    if (!pages.length) return;
    var previousPage = state.selectedSkillPage;
    state.selectedSkillPage = Math.max(0, Math.min(pages.length - 1, state.selectedSkillPage + direction));
    updateSkillPages(silent || previousPage === state.selectedSkillPage);
  }

  function updateSkillPages(silent) {
    var pages = Array.prototype.slice.call(document.querySelectorAll('[data-skill-page-index]'));
    if (!pages.length) return;
    state.selectedSkillPage = Math.max(0, Math.min(pages.length - 1, state.selectedSkillPage));
    var expanded = state.mode === '2d';

    pages.forEach(function (page, index) {
      var selected = index === state.selectedSkillPage;
      page.hidden = !expanded && !selected;
      page.inert = !expanded && !selected;
      page.classList.toggle('is-selected', selected);
    });

    var counter = document.getElementById('skill-page-count');
    if (counter) counter.textContent = pad(state.selectedSkillPage + 1) + ' / ' + pad(pages.length);
    var previousButton = document.querySelector('[data-skill-page-action="previous"]');
    var nextButton = document.querySelector('[data-skill-page-action="next"]');
    var controls = document.querySelector('.skill-page-controls');
    if (controls) controls.hidden = pages.length < 2;
    if (previousButton) previousButton.disabled = state.selectedSkillPage === 0;
    if (nextButton) nextButton.disabled = state.selectedSkillPage === pages.length - 1;

    if (!silent) {
      var selectedPage = pages[state.selectedSkillPage];
      announce((selectedPage.dataset.pageLabel || 'Skills page') + ', page ' + (state.selectedSkillPage + 1) + ' of ' + pages.length);
    }
  }

  function bindWorkStops() {
    var timeline = document.getElementById('work-timeline');
    if (!timeline) return;
    var stops = Array.prototype.slice.call(timeline.querySelectorAll('[data-work-stop]'));

    stops.forEach(function (stop) {
      var trigger = stop.querySelector('[data-work-stop-trigger]');
      var closeButton = stop.querySelector('[data-work-stop-close]');
      if (!trigger) return;
      setWorkStop(stop, false, true);
      trigger.addEventListener('click', function () {
        var willOpen = !stop._workStopTarget;
        if (willOpen) closeWorkStops(stop, false);
        setWorkStop(stop, willOpen, false);
      });
      if (closeButton) {
        closeButton.addEventListener('click', function () {
          setWorkStop(stop, false, false);
          trigger.focus({ preventScroll: true });
        });
      }
    });

    timeline.addEventListener('keydown', function (event) {
      if (event.key !== 'Escape') return;
      var openStop = stops.filter(function (stop) { return stop._workStopTarget; })[0];
      if (!openStop) return;
      event.preventDefault();
      event.stopPropagation();
      var trigger = openStop.querySelector('[data-work-stop-trigger]');
      setWorkStop(openStop, false, false);
      if (trigger) trigger.focus({ preventScroll: true });
    });

    document.addEventListener('pointerdown', function (event) {
      if (event.target.closest && event.target.closest('[data-work-stop]')) return;
      closeWorkStops(null, false);
    });
  }

  function closeWorkStops(except, immediate) {
    document.querySelectorAll('[data-work-stop]').forEach(function (stop) {
      if (stop !== except && stop._workStopTarget) setWorkStop(stop, false, immediate);
    });
  }

  function setWorkStop(stop, open, immediate) {
    var trigger = stop.querySelector('[data-work-stop-trigger]');
    var panel = stop.querySelector('[data-work-stop-panel]');
    if (!trigger || !panel) return;

    var token = (stop._workStopToken || 0) + 1;
    stop._workStopToken = token;
    stop._workStopTarget = open;
    panel.getAnimations().forEach(function (animation) { animation.cancel(); });
    panel.style.opacity = '';
    panel.style.transform = '';
    stop.classList.remove('is-animating');
    trigger.setAttribute('aria-expanded', String(open));
    var stopLabel = stop.dataset.workLabel || ((stop.dataset.workCompany || 'work') + ' experience details');
    trigger.setAttribute('aria-label', (open ? 'Hide ' : 'Show ') + stopLabel);

    if (open) {
      panel.hidden = false;
      panel.inert = false;
      panel.setAttribute('aria-hidden', 'false');
      stop.classList.add('is-open');
    } else {
      stop.classList.remove('is-open');
      panel.inert = true;
      panel.setAttribute('aria-hidden', 'true');
    }

    if (immediate || state.reducedMotion || typeof panel.animate !== 'function') {
      panel.hidden = !open;
      stop._workStopOpen = open;
      return;
    }

    stop.classList.add('is-animating');
    var animation = panel.animate(open ? [
      { opacity: 0, transform: 'translateY(9px) scale(.975)' },
      { opacity: 1, transform: 'none' },
    ] : [
      { opacity: 1, transform: 'none' },
      { opacity: 0, transform: 'translateY(7px) scale(.985)' },
    ], {
      duration: open ? 210 : 150,
      easing: open ? 'cubic-bezier(.18, .72, .22, 1)' : 'cubic-bezier(.55, .05, .72, .46)',
      fill: 'both',
    });

    animation.finished.then(function () {
      if (stop._workStopToken !== token) return;
      animation.cancel();
      panel.style.opacity = '';
      panel.style.transform = '';
      panel.hidden = !open;
      stop._workStopOpen = open;
      stop.classList.remove('is-animating');
    }).catch(function () {
      /* A newer stop request intentionally cancels this transition. */
    });
  }

  function cycleProjectPage(direction, silent) {
    var pages = Array.prototype.slice.call(document.querySelectorAll('[data-project-page-index]'));
    if (!pages.length) return;
    var previousPage = state.selectedProjectPage;
    state.selectedProjectPage = Math.max(0, Math.min(pages.length - 1, state.selectedProjectPage + direction));
    updateProjectPages(silent || previousPage === state.selectedProjectPage);
  }

  /* Project cards use two short half-turns instead of leaving either face
     permanently transformed. The surface therefore settles at transform:none,
     which keeps browser-rendered text as sharp as the rest of the interface. */
  function bindProjectCards() {
    var hoverMedia = window.matchMedia ? window.matchMedia('(hover: hover) and (pointer: fine)') : { matches: false };
    var cards = Array.prototype.slice.call(document.querySelectorAll('[data-project-card]'));

    cards.forEach(function (card) {
      var toggle = card.querySelector('[data-project-flip]');
      var back = card.querySelector('.project-card__face--back');
      if (!toggle || !back) return;

      card._projectPointerInside = false;
      requestProjectCardFace(card, false, true);

      card.addEventListener('pointerenter', function () {
        if (!hoverMedia.matches) return;
        card._projectPointerInside = true;
        requestProjectCardFace(card, true, false);
      });

      card.addEventListener('pointerleave', function () {
        if (!hoverMedia.matches) return;
        card._projectPointerInside = false;
        if (!card.contains(document.activeElement)) requestProjectCardFace(card, false, false);
      });

      card.addEventListener('focusin', function (event) {
        if (back.contains(event.target)) requestProjectCardFace(card, true, false);
      });

      card.addEventListener('focusout', function (event) {
        if (event.relatedTarget && card.contains(event.relatedTarget)) return;
        if (!card._projectPointerInside) requestProjectCardFace(card, false, false);
      });

      card.addEventListener('keydown', function (event) {
        if (event.key !== 'Escape' || !card._projectTargetFlipped) return;
        event.preventDefault();
        event.stopPropagation();
        toggle.focus();
        requestProjectCardFace(card, false, false);
      });

      toggle.addEventListener('click', function () {
        requestProjectCardFace(card, !card._projectTargetFlipped, false);
      });
    });
  }

  function setProjectCardFace(card, flipped) {
    var front = card.querySelector('.project-card__face--front');
    var back = card.querySelector('.project-card__face--back');
    var toggle = card.querySelector('[data-project-flip]');
    var toggleCopy = card.querySelector('[data-project-flip-copy]');
    var title = card.dataset.projectTitle || 'project';
    if (!front || !back || !toggle) return;

    card._projectFlipped = flipped;
    card.classList.toggle('is-flipped', flipped);
    front.hidden = flipped;
    front.inert = flipped;
    front.setAttribute('aria-hidden', String(flipped));
    back.hidden = !flipped;
    back.inert = !flipped;
    back.setAttribute('aria-hidden', String(!flipped));
    toggle.setAttribute('aria-expanded', String(flipped));
    toggle.setAttribute('aria-label', (flipped ? 'Show project overview for ' : 'Show technical details for ') + title);
    if (toggleCopy) toggleCopy.textContent = flipped ? 'Front' : 'Details';
  }

  function requestProjectCardFace(card, flipped, immediate) {
    var surface = card.querySelector('.project-card__surface');
    if (!surface) return;

    var token = (card._projectFlipToken || 0) + 1;
    card._projectFlipToken = token;
    card._projectTargetFlipped = flipped;
    surface.getAnimations().forEach(function (animation) { animation.cancel(); });
    surface.style.transform = '';
    surface.style.opacity = '';
    card.classList.remove('is-flipping');

    if (immediate || state.reducedMotion || typeof surface.animate !== 'function' || card._projectFlipped === flipped) {
      setProjectCardFace(card, flipped);
      return;
    }

    var direction = flipped ? 1 : -1;
    card.classList.add('is-flipping');
    var outgoing = surface.animate([
      { transform: 'rotateY(0deg)', opacity: 1 },
      { transform: 'rotateY(' + (90 * direction) + 'deg)', opacity: 0.68 },
    ], {
      duration: 170,
      easing: 'cubic-bezier(.55, .05, .72, .46)',
      fill: 'both',
    });

    outgoing.finished.then(function () {
      if (card._projectFlipToken !== token) return null;
      setProjectCardFace(card, flipped);
      var incoming = surface.animate([
        { transform: 'rotateY(' + (-90 * direction) + 'deg)', opacity: 0.68 },
        { transform: 'rotateY(0deg)', opacity: 1 },
      ], {
        duration: 210,
        easing: 'cubic-bezier(.18, .72, .22, 1)',
        fill: 'both',
      });
      outgoing.cancel();
      return incoming.finished;
    }).then(function () {
      if (card._projectFlipToken !== token) return;
      surface.getAnimations().forEach(function (animation) { animation.cancel(); });
      surface.style.transform = '';
      surface.style.opacity = '';
      card.classList.remove('is-flipping');
    }).catch(function () {
      /* A newer pointer or keyboard request intentionally cancels this turn. */
    });
  }

  function updateProjectPages(silent) {
    var pages = Array.prototype.slice.call(document.querySelectorAll('[data-project-page-index]'));
    if (!pages.length) return;
    state.selectedProjectPage = Math.max(0, Math.min(pages.length - 1, state.selectedProjectPage));
    var expanded = state.mode === '2d';
    pages.forEach(function (page, index) {
      var selected = index === state.selectedProjectPage;
      page.hidden = expanded ? false : !selected;
      page.inert = !expanded && !selected;
      page.classList.toggle('is-selected', selected);
      if (!expanded && !selected) {
        page.querySelectorAll('[data-project-card]').forEach(function (card) {
          requestProjectCardFace(card, false, true);
        });
      }
    });
    document.getElementById('project-index').textContent = pad(state.selectedProjectPage + 1) + ' / ' + pad(pages.length);
    var previousButton = document.querySelector('[data-project-action="previous"]');
    var nextButton = document.querySelector('[data-project-action="next"]');
    if (previousButton) previousButton.disabled = state.selectedProjectPage === 0;
    if (nextButton) nextButton.disabled = state.selectedProjectPage === pages.length - 1;
    if (!silent) {
      var selectedPage = pages[state.selectedProjectPage];
      announce((selectedPage.dataset.pageLabel || 'Projects') + ', page ' + (state.selectedProjectPage + 1) + ' of ' + pages.length);
    }
  }

  function updateNestedContent() {
    updateEducationPages(true);
    updateSkillPages(true);
    updateProjectPages(true);
  }

  function openProject(slug, trigger, pushHistory) {
    var project = window.PORTFOLIO_PROJECTS && window.PORTFOLIO_PROJECTS[slug];
    if (!project) return;
    state.phase = 'project';
    state.dialogClosePending = false;
    state.returnFocus = trigger || state.returnFocus;
    dialogContent.innerHTML = renderCaseStudy(project, false);
    if (!dialog.open) dialog.showModal();
    document.title = project.title + ' — Joy In';
    if (pushHistory) {
      var projectUrl = new URL('projects/' + project.slug + '/', rootUrl);
      try {
        window.history.pushState({ project: project.slug, section: state.active }, '', projectUrl.href);
      } catch (error) {
        window.location.href = new URL('projects/' + project.slug + '/index.html', rootUrl).href;
      }
    }
    window.setTimeout(function () { dialogClose.focus(); }, 0);
  }

  function requestDialogClose() {
    if (state.dialogClosePending) return;
    if (window.history.state && window.history.state.project) {
      state.dialogClosePending = true;
      window.history.back();
    } else {
      closeProject();
    }
  }

  function closeProject() {
    if (dialog.open) dialog.close();
    state.phase = 'idle';
    state.dialogClosePending = false;
    dialogContent.innerHTML = '';
    document.title = LABELS[state.active] + ' — Joy In';
    var target = state.returnFocus;
    state.returnFocus = null;
    if (target && document.contains(target)) window.setTimeout(function () { target.focus(); }, 0);
  }

  function renderCaseStudy(project, standalone) {
    var heading = standalone ? 'h1' : 'h2';
    return [
      '<article class="case-study">',
      '<p class="panel-index"><span>', escapeHtml(project.year), ' / CASE STUDY</span><span>SELECTED WORK</span></p>',
      '<', heading, standalone ? '' : ' id="dialog-title"', '>', escapeHtml(project.title), '</', heading, '>',
      '<div class="case-meta"><span>', escapeHtml(project.role), '</span><span>', project.tech.map(escapeHtml).join(' · '), '</span></div>',
      '<p class="case-intro">', escapeHtml(project.summary), '</p>',
      '<div class="case-grid">',
      '<section><h3>Context</h3><p>', escapeHtml(project.context), '</p></section>',
      '<section><h3>Constraints</h3><ul>', project.constraints.map(function (item) { return '<li>' + escapeHtml(item) + '</li>'; }).join(''), '</ul></section>',
      '<section><h3>Role</h3><p>', escapeHtml(project.role), '</p></section>',
      '<section><h3>Key decisions</h3><ul>', project.decisions.map(function (item) { return '<li>' + escapeHtml(item) + '</li>'; }).join(''), '</ul></section>',
      '<section><h3>Process</h3><p>', escapeHtml(project.process), '</p></section>',
      '</div>',
      '<div class="case-result"><span>Result</span><p>', escapeHtml(project.result), '</p></div>',
      '</article>',
    ].join('');
  }

  function handleHistory() {
    var slugMatch = window.location.pathname.match(/\/projects\/([^/]+)\/?$/);
    if (slugMatch && window.PORTFOLIO_PROJECTS[decodeURIComponent(slugMatch[1])]) {
      if (!dialog.open) openProject(decodeURIComponent(slugMatch[1]), state.returnFocus, false);
      return;
    }
    if (dialog.open) closeProject();
    var historyMode = new URL(window.location.href).searchParams.get('mode') === '2d' ? '2d' : '3d';
    if (historyMode !== state.mode) setMode(historyMode, false);
    var section = parseSection(window.location.hash) || 'education';
    if (!state.entered) {
      state.active = section;
      revealExperience({ immediate: true, focus: false });
    } else if (section !== state.active) {
      goToSection(section, 'history', false);
    }
  }

  function focusSection(id) {
    var heading = document.querySelector('#' + id + ' h2');
    if (heading && heading.classList.contains('sr-only') && id === 'projects' && state.mode === '3d') {
      heading = document.querySelector('#' + id + ' .project-page.is-selected .project-card h3') || heading;
    }
    if (!heading) return;
    try {
      heading.focus({ preventScroll: state.mode === '3d' });
    } catch (error) {
      heading.focus();
    }
  }

  function setSectionUrl(id, push) {
    var url = new URL(sectionBaseUrl.href);
    if (state.mode === '2d') url.searchParams.set('mode', '2d');
    else url.searchParams.delete('mode');
    url.hash = id;
    var historyState = { section: id, mode: state.mode };
    try {
      if (push) window.history.pushState(historyState, '', url.href);
      else window.history.replaceState(historyState, '', url.href);
    } catch (error) {
      try {
        if (push) window.location.hash = id;
        else window.location.replace('#' + id);
      } catch (ignored) { /* Navigation state remains usable even if URL writes are blocked. */ }
    }
  }

  function parseSection(hash) {
    var value = String(hash || '').replace(/^#/, '').toLowerCase();
    return SECTIONS.indexOf(value) === -1 ? null : value;
  }

  function sectionAnnouncement(id) {
    return LABELS[id] + ' section, ' + (SECTIONS.indexOf(id) + 1) + ' of ' + SECTIONS.length;
  }

  function announce(message) {
    liveRegion.textContent = '';
    window.setTimeout(function () { liveRegion.textContent = message; }, 20);
  }

  function startClock() {
    var clock = document.getElementById('system-clock');
    function update() {
      var now = new Date();
      clock.textContent = 'LOCAL ' + pad(now.getHours()) + ':' + pad(now.getMinutes()) + ':' + pad(now.getSeconds());
    }
    update();
    window.setInterval(update, 1000);
  }

  function readPreference(key) {
    try { return window.localStorage.getItem(key); } catch (error) { return null; }
  }

  function writePreference(key, value) {
    try { window.localStorage.setItem(key, value); } catch (error) { /* Preferences remain in-memory. */ }
  }

  function isEditable(target) {
    if (!target) return false;
    var name = target.tagName && target.tagName.toLowerCase();
    return name === 'input' || name === 'textarea' || name === 'select' || target.isContentEditable;
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function clamp(value, minimum, maximum) {
    return Math.max(minimum, Math.min(maximum, value));
  }

  function mix(start, end, amount) {
    return start + (end - start) * amount;
  }

  function smoothstep(edgeA, edgeB, value) {
    var amount = clamp((value - edgeA) / (edgeB - edgeA), 0, 1);
    return amount * amount * (3 - 2 * amount);
  }

  function pad(value) {
    return String(value).padStart(2, '0');
  }
})();
