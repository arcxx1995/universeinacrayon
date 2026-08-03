/* ============================================================
   Universe in a Crayon — script.js
   ============================================================ */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasGSAP = typeof window.gsap !== 'undefined';
  if (hasGSAP && window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

  // Content is visible by default; only hide it for the reveal once we know
  // an animation will actually run to bring it back. A missing CDN, a thrown
  // error or a frozen ticker must never leave a section permanently blank.
  if (hasGSAP && window.ScrollTrigger && !reduced) {
    document.documentElement.classList.add('js-anim');
  }

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------------------------------------------------------
     1. Preloader — stroke fills L→R, overlay fades, video plays
     --------------------------------------------------------- */
  var preloader = $('#preloader');
  var heroVideo = $('#heroVideo');

  function startVideo() {
    if (!heroVideo) return;
    var p = heroVideo.play();
    if (p && p.catch) p.catch(function () { /* autoplay blocked — poster stays */ });
  }

  function killPreloader() {
    if (preloader && preloader.parentNode) preloader.remove();
    document.body.classList.remove('loading');
    startVideo();
  }

  function runPreloader() {
    if (reduced || !hasGSAP) {
      killPreloader();
      return initScroll();
    }
    document.body.classList.add('loading');
    gsap.timeline()
      .to('#preloaderWord', { backgroundPosition: '0% 0', duration: 1.2, ease: 'power2.inOut' })
      .to(preloader, {
        autoAlpha: 0, duration: 0.5, ease: 'power2.out',
        onStart: startVideo,
        onComplete: killPreloader
      }, '+=0.1');
    // rAF is throttled in background tabs, so the timeline can stall forever.
    // Hard-stop the overlay regardless of how far the animation got.
    setTimeout(killPreloader, 3000);
    initScroll();
  }

  /* ---------------------------------------------------------
     1b. Volume toggle
     Autoplay only survives while muted, so the video always
     starts muted and this button is the opt-in for sound.
     --------------------------------------------------------- */
  var volumeBtn = $('#volumeBtn');

  function setMuted(muted) {
    heroVideo.muted = muted;
    volumeBtn.setAttribute('aria-pressed', String(!muted));
    volumeBtn.setAttribute('aria-label', muted ? 'Unmute video' : 'Mute video');
  }

  volumeBtn.addEventListener('click', function () {
    setMuted(!heroVideo.muted);
    if (!heroVideo.muted && heroVideo.paused) startVideo();
  });

  // Pause audio when the hero scrolls away; restore it on return.
  var wasUnmuted = false;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      var visible = entries[0].isIntersecting;
      if (!visible && !heroVideo.muted) { wasUnmuted = true; setMuted(true); }
      else if (visible && wasUnmuted) { wasUnmuted = false; setMuted(false); }
    }, { threshold: 0.25 }).observe($('#hero'));
  }

  /* ---------------------------------------------------------
     2. Header — solid background after 80px
     --------------------------------------------------------- */
  var header = $('#header');
  function onScroll() {
    header.classList.toggle('is-stuck', window.scrollY > 80);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------------------------------------------------------
     3. Menu overlay
     --------------------------------------------------------- */
  var menu = $('#menu');
  var burger = $('#burger');
  var menuItems = $$('.mitem, .mitem2', menu);

  function openMenu() {
    menu.classList.add('is-open');
    menu.setAttribute('aria-hidden', 'false');
    burger.classList.add('is-open');
    burger.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    $('.menu__left').scrollTop = 0;
    if (hasGSAP && !reduced) {
      gsap.fromTo(menuItems,
        { y: 40, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, ease: 'power2.out', stagger: 0.06, delay: 0.25 });
    }
  }
  function closeMenu() {
    menu.classList.remove('is-open');
    menu.setAttribute('aria-hidden', 'true');
    burger.classList.remove('is-open');
    burger.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  burger.addEventListener('click', function () {
    menu.classList.contains('is-open') ? closeMenu() : openMenu();
  });
  $('#menuClose').addEventListener('click', closeMenu);
  $$('a', menu).forEach(function (a) { a.addEventListener('click', closeMenu); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && menu.classList.contains('is-open')) closeMenu();
  });

  /* ---------------------------------------------------------
     4. Signup form — posts to Formspree
     Submitted over fetch rather than a plain form POST so the
     visitor stays on the page and gets the inline message.
     The form's action attribute is the endpoint, so if JS fails
     the browser still submits it the ordinary way.
     --------------------------------------------------------- */
  // Bound per form, not per id — the #signup section and the subscribe
  // drawer both post to the same endpoint and share this handler.
  $$('.form').forEach(function (form) {
    var submitBtn = $('.form__submit', form);
    var msg = $('.form__msg', form);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.checkValidity()) {
        msg.textContent = 'Please complete every field and accept the policy.';
        return;
      }
      msg.textContent = 'Sending…';
      submitBtn.disabled = true;
      fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' }
      })
        .then(function (res) {
          if (!res.ok) throw new Error(res.status);
          msg.textContent = 'Thanks — you are on the list.';
          form.reset();
        })
        .catch(function () {
          msg.textContent = 'Something went wrong. Please try again, or email us at universeinacrayon@gmail.com.';
        })
        .then(function () { submitBtn.disabled = false; });
    });
  });

  /* ---------------------------------------------------------
     4a. Subscribe drawer — Subscribe opens the signup panel
     --------------------------------------------------------- */
  var drawer = $('#subscribeDrawer');

  function openDrawer() {
    drawer.hidden = false;
    drawer.setAttribute('aria-hidden', 'false');
    // Reflow, not requestAnimationFrame: rAF is throttled in background tabs,
    // which would leave the panel unhidden but never slid in.
    void drawer.offsetWidth;
    drawer.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }
  function closeDrawer() {
    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    setTimeout(function () { drawer.hidden = true; }, 450); // matches the CSS transition
  }

  $('#subscribeBtn').addEventListener('click', function (e) {
    e.preventDefault();
    openDrawer();
  });
  $('#drawerClose').addEventListener('click', closeDrawer);
  $('.drawer__scrim').addEventListener('click', closeDrawer);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && drawer.classList.contains('is-open')) closeDrawer();
  });

  /* ---------------------------------------------------------
     4b. Strands — flowing colour ribbons behind the embed.
     WebGL2 port of the React <Strands/> shader (ogl version),
     minus the React/ogl wrapper and the unused glass pass.
     --------------------------------------------------------- */
  var STRANDS = {
    colors: ['#F97316', '#7C3AED', '#06B6D4'],
    // amplitude is high because the Spotify iframe is opaque and parks itself
    // over the centre — the ribbons have to swing clear of it to be seen.
    count: 4, speed: 0.5, amplitude: 2.4, waviness: 1, thickness: 0.7,
    glow: 2.6, taper: 3, spread: 1, intensity: 0.6, saturation: 2,
    opacity: 0.75, scale: 1.5, hueShift: 0
  };

  var MAX_STRANDS = 12, MAX_COLORS = 8;

  var STRANDS_VERT =
    '#version 300 es\n' +
    'in vec2 position;\n' +
    'void main(){ gl_Position = vec4(position, 0.0, 1.0); }\n';

  var STRANDS_FRAG =
    '#version 300 es\n' +
    'precision highp float;\n' +
    'uniform float uTime;\n' +
    'uniform vec2 uResolution;\n' +
    'uniform vec3 uColors[' + MAX_COLORS + '];\n' +
    'uniform int uColorCount;\n' +
    'uniform int uStrandCount;\n' +
    'uniform float uSpeed, uAmplitude, uWaviness, uThickness, uGlow, uTaper;\n' +
    'uniform float uSpread, uHueShift, uIntensity, uOpacity, uScale, uSaturation;\n' +
    'out vec4 fragColor;\n' +
    'const float PI = 3.14159265;\n' +
    'vec3 spectrum(float t){ return 0.5 + 0.5 * cos(2.0 * PI * (t + vec3(0.00, 0.33, 0.67))); }\n' +
    'vec3 samplePalette(float t){\n' +
    '  t = fract(t);\n' +
    '  float scaled = t * float(uColorCount);\n' +
    '  int idx = int(floor(scaled));\n' +
    '  float blend = fract(scaled);\n' +
    '  int nextIdx = idx + 1;\n' +
    '  if (nextIdx >= uColorCount) nextIdx = 0;\n' +
    '  return mix(uColors[idx], uColors[nextIdx], blend);\n' +
    '}\n' +
    'vec3 strandColor(float t){ if (uColorCount > 0) return samplePalette(t); return spectrum(t); }\n' +
    'void main(){\n' +
    '  vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution) / uResolution.y;\n' +
    '  uv /= max(uScale, 0.0001);\n' +
    '  float e = 0.06 + uIntensity * 0.94;\n' +
    '  float env = pow(max(cos(uv.x * PI * 1.3), 0.0), uTaper);\n' +
    '  vec3 col = vec3(0.0);\n' +
    '  for (int i = 0; i < ' + MAX_STRANDS + '; i++) {\n' +
    '    if (i >= uStrandCount) break;\n' +
    '    float fi = float(i);\n' +
    '    float ph = fi * 1.7 * uSpread;\n' +
    '    float freq = (2.0 + fi * 0.35) * uWaviness;\n' +
    '    float spd = 1.4 + fi * 1.2;\n' +
    '    float tt = uTime * uSpeed;\n' +
    '    float w = sin(uv.x * freq + tt * spd + ph) * 0.60\n' +
    '            + sin(uv.x * freq * 1.1 - tt * spd * 0.7 + ph * 1.7) * 0.40;\n' +
    '    float amp = (0.1 + 0.02 * e) * env * uAmplitude;\n' +
    '    float y = w * amp;\n' +
    '    float d = abs(uv.y - y);\n' +
    '    float thick = (0.001 + 0.05 * e) * (0.35 + env) * uThickness;\n' +
    '    float g = thick / (d + thick * 0.45);\n' +
    '    g = g * g;\n' +
    '    float h = fi / float(uStrandCount) + uv.x * 0.30 + uTime * 0.04 + uHueShift;\n' +
    '    col += strandColor(h) * g * env;\n' +
    '  }\n' +
    '  col *= 0.45 + 0.7 * e;\n' +
    '  col = 1.0 - exp(-col * uGlow);\n' +
    '  float gray = dot(col, vec3(0.2126, 0.7152, 0.0722));\n' +
    '  col = max(mix(vec3(gray), col, uSaturation), 0.0);\n' +
    '  float lum = max(max(col.r, col.g), col.b);\n' +
    '  float alpha = clamp(lum, 0.0, 1.0) * uOpacity;\n' +
    '  fragColor = vec4(col * uOpacity, alpha);\n' +
    '}\n';

  // '#rrggbb' -> linear-ish [r,g,b] in 0..1 (ogl Color does plain /255)
  function hexRGB(hex) {
    var n = parseInt(hex.slice(1), 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  }

  function initStrands() {
    var cv = $('#strands');
    if (!cv) return;

    var gl = cv.getContext('webgl2', {
      alpha: true, premultipliedAlpha: true, antialias: true, depth: false
    });
    if (!gl) { cv.style.display = 'none'; return; }   // no WebGL2 — section just goes flat black

    function compile(type, src) {
      var sh = gl.createShader(type);
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.warn('strands shader:', gl.getShaderInfoLog(sh));
        return null;
      }
      return sh;
    }

    var vs = compile(gl.VERTEX_SHADER, STRANDS_VERT);
    var fs = compile(gl.FRAGMENT_SHADER, STRANDS_FRAG);
    if (!vs || !fs) { cv.style.display = 'none'; return; }

    var prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.bindAttribLocation(prog, 0, 'position');
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.warn('strands link:', gl.getProgramInfoLog(prog));
      cv.style.display = 'none';
      return;
    }
    gl.useProgram(prog);

    // one oversized triangle covers the clip-space quad
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    var u = function (name) { return gl.getUniformLocation(prog, name); };
    var S = STRANDS;

    // palette padded to MAX_COLORS, flattened for uniform3fv
    var palette = new Float32Array(MAX_COLORS * 3);
    for (var i = 0; i < MAX_COLORS; i++) {
      var c = hexRGB(S.colors[i] || S.colors[S.colors.length - 1]);
      palette[i * 3] = c[0]; palette[i * 3 + 1] = c[1]; palette[i * 3 + 2] = c[2];
    }

    // everything except uTime/uResolution is constant — set once
    gl.uniform3fv(u('uColors'), palette);
    gl.uniform1i(u('uColorCount'), Math.min(S.colors.length, MAX_COLORS));
    gl.uniform1i(u('uStrandCount'), Math.min(Math.max(Math.round(S.count), 1), MAX_STRANDS));
    gl.uniform1f(u('uSpeed'), S.speed);
    gl.uniform1f(u('uAmplitude'), S.amplitude);
    gl.uniform1f(u('uWaviness'), S.waviness);
    gl.uniform1f(u('uThickness'), S.thickness);
    gl.uniform1f(u('uGlow'), S.glow);
    gl.uniform1f(u('uTaper'), S.taper);
    gl.uniform1f(u('uSpread'), S.spread);
    gl.uniform1f(u('uHueShift'), S.hueShift);
    gl.uniform1f(u('uIntensity'), S.intensity);
    gl.uniform1f(u('uOpacity'), S.opacity);
    gl.uniform1f(u('uScale'), S.scale);
    gl.uniform1f(u('uSaturation'), S.saturation);

    var uTime = u('uTime'), uRes = u('uResolution');

    gl.clearColor(0, 0, 0, 0);

    function resize() {
      var r = cv.getBoundingClientRect();
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var w = Math.max(1, Math.round(r.width * dpr));
      var h = Math.max(1, Math.round(r.height * dpr));
      if (w === cv.width && h === cv.height) return;
      cv.width = w; cv.height = h;
      gl.viewport(0, 0, w, h);
      gl.uniform2f(uRes, w, h);
    }

    function frame(t) {
      gl.uniform1f(uTime, t);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    resize();
    window.addEventListener('resize', resize);

    frame(0);                            // paint once up front; rAF is throttled in hidden tabs
    if (reduced) return;                 // reduced motion keeps that single static frame

    var start = null, running = true;
    function loop(now) {
      if (start === null) start = now;
      if (running) { resize(); frame((now - start) / 1000); }
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);

    // Don't burn cycles painting a section nobody is looking at.
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (e) { running = e[0].isIntersecting; })
        .observe($('#listen'));
    }
  }
  initStrands();

  /* ---------------------------------------------------------
     5. Scroll animation
     --------------------------------------------------------- */
  function initScroll() {
    if (reduced || !hasGSAP || !window.ScrollTrigger) {
      document.documentElement.classList.add('no-motion');
      return;
    }

    // generic reveals
    $$('.reveal').forEach(function (el) {
      gsap.fromTo(el, { opacity: 0, y: 50 }, {
        opacity: 1, y: 0, duration: 0.8, ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 80%', once: true }
      });
    });

    // show rows, staggered
    var rows = $$('.reveal-row');
    if (rows.length) {
      gsap.fromTo(rows, { opacity: 0, y: 50 }, {
        opacity: 1, y: 0, duration: 0.8, ease: 'power2.out', stagger: 0.05,
        scrollTrigger: { trigger: rows[0], start: 'top 80%', once: true }
      });
    }

    // hero parallax: video scales, headline drifts up
    gsap.to('#heroMedia', {
      scale: 1.1, ease: 'none',
      scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true }
    });
    gsap.to('#heroTitle', {
      yPercent: -15, ease: 'none',
      scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true }
    });

    // album fan tilts as it enters (desktop only)
    if (window.matchMedia('(min-width:901px)').matches) {
      gsap.fromTo('#fan', { rotate: -4, y: 60, opacity: 0 }, {
        rotate: 0, y: 0, opacity: 1, duration: 1, ease: 'power2.out',
        scrollTrigger: { trigger: '#fan', start: 'top 85%', once: true }
      });
    }

    // scattered photo parallax
    $$('.drift').forEach(function (img) {
      var speed = parseFloat(img.dataset.speed) || 0.1;
      gsap.to(img, {
        yPercent: speed * 100 * 3, ease: 'none',
        scrollTrigger: { trigger: '#signup', start: 'top bottom', end: 'bottom top', scrub: true }
      });
    });
  }

  /* ---------------------------------------------------------
     Vinyl overlay — click an album, record slides out and spins
     --------------------------------------------------------- */
  var vinyl = $('#vinyl-overlay');
  if (vinyl) {
    var vinylTitle = $('#vinyl-title');
    var vinylLink = $('#vinyl-spotify');
    var lastFocus = null;

    // Spotify's iframe API loads async, so a click can land before the controller
    // exists. Stash the track and start it the moment the controller shows up.
    var spotify = null;
    var pendingTrack = null;

    function playTrack(id) {
      if (!id) return;
      if (!spotify) { pendingTrack = id; return; }
      spotify.loadUri('spotify:track:' + id);
      spotify.play();
    }

    window.onSpotifyIframeApiReady = function (IFrameAPI) {
      IFrameAPI.createController(
        $('#vinyl-player'),
        { uri: 'spotify:track:' + (pendingTrack || '4dsU7CXaoMzzugHOByrdyT'), width: 300, height: 80 },
        function (controller) {
          spotify = controller;
          if (pendingTrack) { playTrack(pendingTrack); pendingTrack = null; }
        }
      );
    };

    function closeVinyl() {
      vinyl.classList.remove('is-open');
      setTimeout(function () { vinyl.hidden = true; }, 350);
      document.body.style.overflow = '';
      pendingTrack = null;
      if (spotify) spotify.pause();
      if (lastFocus) lastFocus.focus();
    }

    $$('.fan__card').forEach(function (card) {
      card.addEventListener('click', function () {
        var img = $('img', card);
        lastFocus = card;
        vinyl.style.setProperty('--art', 'url("' + img.getAttribute('src') + '")');
        vinylTitle.textContent = card.dataset.title || img.alt;
        vinylLink.href = 'https://open.spotify.com/album/' + card.dataset.album;
        vinyl.hidden = false;
        document.body.style.overflow = 'hidden';
        // force a reflow so the transition runs — rAF is throttled in background tabs
        void vinyl.offsetWidth;
        vinyl.classList.add('is-open');
        $('#vinyl-close').focus();
        playTrack(card.dataset.track);
      });
    });

    $('#vinyl-close').addEventListener('click', closeVinyl);
    vinyl.addEventListener('click', function (e) { if (e.target === vinyl) closeVinyl(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !vinyl.hidden) closeVinyl();
    });
  }

  /* ---------------------------------------------------------
     boot
     --------------------------------------------------------- */
  if (document.readyState === 'complete') runPreloader();
  else window.addEventListener('load', runPreloader);
})();
