(function () {
  'use strict';

  var bar = document.getElementById('podcast-bar');
  var trigger = document.getElementById('podcast-trigger');
  var closeBtn = document.getElementById('podcast-close');
  var playBtn = document.getElementById('podcast-play');
  var sectionEl = document.getElementById('podcast-section');
  var progressEl = document.getElementById('podcast-progress');
  var timeEl = document.getElementById('podcast-time');
  var timelineEl = document.getElementById('podcast-timeline');

  if (!bar || !trigger) return;

  var useElevenLabs = !!(window.ELEVENLABS_API_KEY && window.ELEVENLABS_API_KEY !== 'your-api-key-here');
  var ELEVENLABS_VOICE_ID = 'lWq4KDY8znfkV0DrK8Vb'; // Yasmin Alves - Portuguese (Brazil), clear and natural
  var ELEVENLABS_MODEL = 'eleven_multilingual_v2';

  var segments = [];
  var currentIndex = 0;
  var totalEstimatedDuration = 0;
  var progressInterval = null;
  var segmentStartTime = 0;
  var segmentEstimatedDuration = 0;
  var barClosed = false;
  var audioEl = null;
  var currentBlobUrl = null;

  function stripHtml(html) {
    var div = document.createElement('div');
    div.innerHTML = html;
    return (div.textContent || div.innerText || '').replace(/\s+/g, ' ').trim();
  }

  function getTextNodes(el) {
    return stripHtml(el.innerHTML);
  }

  function wordCount(str) {
    return str ? str.split(/\s+/).filter(Boolean).length : 0;
  }

  function collectSegments() {
    var main = document.querySelector('main.page');
    if (!main) return [];

    var all = [];
    var selector = [
      '.intro__message p',
      '.heading-section',
      '.section-subtitle',
      '.card__title',
      '.card__body',
      '.card-mini__label',
      '.card-row__text',
      '.stat-card',
      '.expense-card__value',
      '.expense-card__category',
      '.expense-card__hint',
      '.tip-box p',
      '.world-card__title',
      '.world-card__body p',
      '.portfolio-desc',
      '.portfolio-desc p',
      '.strategy__body p',
      '.diff-card p',
      '.asset-card__name',
      '.asset-card__desc',
      '.section-quote__text',
      '.closing-greeting',
      '.closing-text p'
    ].join(', ');

    main.querySelectorAll(selector).forEach(function (el) {
      if (el.closest('.hero')) return;
      all.push(el);
    });

    all.sort(function (a, b) {
      return a.compareDocumentPosition(b) & 2 ? -1 : 1;
    });

    var out = [];
    var lastSectionTitle = 'Relatório';
    var seen = new Set();

    function addSegment(title, text) {
      text = (text || '').replace(/\s+/g, ' ').trim();
      if (!text || text.length < 2) return;
      var key = (title + '|' + text).slice(0, 80);
      if (seen.has(key)) return;
      seen.add(key);
      out.push({ title: title || lastSectionTitle, text: text });
    }

    all.forEach(function (el) {
      var text;
      if (el.classList.contains('stat-card')) {
        var val = el.querySelector('.stat-card__value');
        var lab = el.querySelector('.stat-card__label');
        if (val && lab) text = getTextNodes(val) + ' — ' + getTextNodes(lab);
      } else {
        text = getTextNodes(el);
      }
      if (!text) return;

      if (el.classList.contains('heading-section') || el.classList.contains('section-subtitle') || el.classList.contains('card__title') || el.classList.contains('world-card__title')) {
        lastSectionTitle = text;
        addSegment(lastSectionTitle, 'Seção: ' + text);
      } else {
        addSegment(lastSectionTitle, text);
      }
    });

    if (out.length === 0 && main.innerText) {
      out.push({ title: 'Relatório', text: stripHtml(main.innerText).slice(0, 5000) });
    }

    return out;
  }

  function getPortugueseVoice() {
    var voices = speechSynthesis.getVoices();
    var pt = voices.filter(function (v) {
      var lang = (v.lang || '').toLowerCase();
      return lang === 'pt-br' || lang === 'pt_br' || lang.startsWith('pt');
    });
    if (pt.length === 0) return voices[0] || null;

    // Prefer voices that typically sound more natural (neural/premium/human-like)
    var prefer = ['google', 'microsoft', 'luciana', 'daniel', 'maria', 'antônio', 'antonio', 'natural', 'premium', 'neural', 'wavenet', 'felipe', 'ricardo'];
    pt.sort(function (a, b) {
      var nameA = (a.name || '').toLowerCase();
      var nameB = (b.name || '').toLowerCase();
      var scoreA = prefer.findIndex(function (p) { return nameA.indexOf(p) !== -1; });
      var scoreB = prefer.findIndex(function (p) { return nameB.indexOf(p) !== -1; });
      if (scoreA === -1) scoreA = 999;
      if (scoreB === -1) scoreB = 999;
      return scoreA - scoreB;
    });

    return pt[0];
  }

  function formatTime(seconds) {
    var m = Math.floor(seconds / 60);
    var s = Math.floor(seconds % 60);
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  function updateProgress(percent, timeLabel) {
    percent = Math.min(100, Math.max(0, percent));
    if (progressEl) progressEl.style.width = percent + '%';
    if (timelineEl) timelineEl.setAttribute('aria-valuenow', Math.round(percent));
    if (timeEl) timeEl.textContent = timeLabel != null ? timeLabel : timeEl.textContent;
  }

  function stopProgressAnimation() {
    if (progressInterval) {
      clearInterval(progressInterval);
      progressInterval = null;
    }
  }

  function startProgressAnimation() {
    stopProgressAnimation();
    if (currentIndex >= segments.length) return;
    segmentStartTime = Date.now();
    var seg = segments[currentIndex];
    segmentEstimatedDuration = Math.max(5, wordCount(seg.text) / 2.5); // ~2.5 words/sec for pt-BR
    var startPercent = segments.length ? (currentIndex / segments.length) * 100 : 0;
    var endPercent = segments.length ? ((currentIndex + 1) / segments.length) * 100 : 100;

    progressInterval = setInterval(function () {
      var elapsed = (Date.now() - segmentStartTime) / 1000;
      if (elapsed >= segmentEstimatedDuration) {
        stopProgressAnimation();
        updateProgress(endPercent, null);
        return;
      }
      var p = startPercent + (endPercent - startPercent) * (elapsed / segmentEstimatedDuration);
      var totalElapsed = (currentIndex * segmentEstimatedDuration) + elapsed;
      updateProgress(p, formatTime(totalElapsed));
    }, 250);
  }

  function fetchElevenLabsAudio(text, done) {
    var apiKey = window.ELEVENLABS_API_KEY;
    if (!apiKey) return done(new Error('No API key'));

    var url = 'https://api.elevenlabs.io/v1/text-to-speech/' + ELEVENLABS_VOICE_ID + '?output_format=mp3_44100_128';
    var body = JSON.stringify({
      text: text,
      model_id: ELEVENLABS_MODEL
    });

    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
        'Accept': 'audio/mpeg'
      },
      body: body
    })
      .then(function (res) {
        if (!res.ok) return res.text().then(function (t) { throw new Error(t || res.status); });
        return res.blob();
      })
      .then(function (blob) {
        done(null, URL.createObjectURL(blob));
      })
      .catch(function (err) {
        done(err || new Error('Failed to fetch audio'));
      });
  }

  function playNextSegmentElevenLabs() {
    if (barClosed) return;
    stopProgressAnimation();
    if (currentIndex >= segments.length) {
      if (audioEl) audioEl.pause();
      if (playBtn) playBtn.classList.remove('is-playing');
      updateProgress(100, timeEl && totalEstimatedDuration ? formatTime(totalEstimatedDuration) : null);
      if (sectionEl) sectionEl.textContent = 'Concluído';
      stopProgressAnimation();
      return;
    }

    var seg = segments[currentIndex];
    if (sectionEl) sectionEl.textContent = seg.title;

    if (!audioEl) audioEl = new Audio();

    var startPercent = segments.length ? (currentIndex / segments.length) * 100 : 0;
    var endPercent = segments.length ? ((currentIndex + 1) / segments.length) * 100 : 100;

    fetchElevenLabsAudio(seg.text, function (err, blobUrl) {
      if (barClosed) return;
      if (err) {
        if (sectionEl) sectionEl.textContent = 'Erro: ' + (err.message || 'Falha no áudio');
        currentIndex++;
        if (currentIndex < segments.length) playNextSegmentElevenLabs();
        else if (playBtn) playBtn.classList.remove('is-playing');
        return;
      }

      if (currentBlobUrl) URL.revokeObjectURL(currentBlobUrl);
      currentBlobUrl = blobUrl;

      audioEl.src = blobUrl;
      audioEl.onended = function () {
        if (barClosed) return;
        stopProgressAnimation();
        currentIndex++;
        updateProgress(segments.length ? (currentIndex / segments.length) * 100 : 100, null);
        if (currentIndex < segments.length) {
          playNextSegmentElevenLabs();
        } else {
          if (playBtn) playBtn.classList.remove('is-playing');
          if (sectionEl) sectionEl.textContent = 'Concluído';
        }
      };
      audioEl.onerror = function () {
        if (barClosed) return;
        currentIndex++;
        if (currentIndex < segments.length) playNextSegmentElevenLabs();
        else if (playBtn) playBtn.classList.remove('is-playing');
      };
      audioEl.onloadedmetadata = function () {
        if (barClosed) return;
        var dur = audioEl.duration;
        var startP = startPercent;
        var endP = endPercent;
        progressInterval = setInterval(function () {
          if (barClosed || !audioEl.duration) return;
          var p = startP + (audioEl.currentTime / dur) * (endP - startP);
          updateProgress(p, formatTime(audioEl.currentTime + currentIndex * (totalEstimatedDuration / segments.length)));
        }, 250);
      };
      audioEl.play();
    });
  }

  function speakNext() {
    if (barClosed) return;
    if (currentIndex >= segments.length) {
      speechSynthesis.cancel();
      if (playBtn) playBtn.classList.remove('is-playing');
      updateProgress(100, formatTime(totalEstimatedDuration));
      if (sectionEl) sectionEl.textContent = 'Concluído';
      stopProgressAnimation();
      return;
    }

    var seg = segments[currentIndex];
    if (sectionEl) sectionEl.textContent = seg.title;

    var u = new SpeechSynthesisUtterance(seg.text);
    u.lang = 'pt-BR';
    u.rate = 0.88;
    u.pitch = 1;
    var voice = getPortugueseVoice();
    if (voice) u.voice = voice;

    u.onstart = function () {
      if (barClosed) { speechSynthesis.cancel(); return; }
      startProgressAnimation();
    };

    u.onend = function () {
      if (barClosed) return;
      stopProgressAnimation();
      currentIndex++;
      var p = segments.length ? (currentIndex / segments.length) * 100 : 100;
      var totalElapsed = currentIndex * (totalEstimatedDuration / segments.length);
      updateProgress(p, formatTime(totalElapsed));
      if (currentIndex < segments.length) {
        speakNext();
      } else {
        if (playBtn) playBtn.classList.remove('is-playing');
        if (sectionEl) sectionEl.textContent = 'Concluído';
      }
    };

    u.onerror = function () {
      if (barClosed) return;
      currentIndex++;
      if (currentIndex < segments.length) speakNext();
      else if (playBtn) playBtn.classList.remove('is-playing');
    };

    speechSynthesis.speak(u);
  }

  function startPodcast() {
    if (segments.length === 0) {
      segments = collectSegments();
      var totalWords = segments.reduce(function (acc, s) { return acc + wordCount(s.text); }, 0);
      totalEstimatedDuration = totalWords / 2.5;
    }
    currentIndex = 0;
    if (useElevenLabs) {
      if (audioEl) audioEl.pause();
      updateProgress(0, '0:00');
      if (sectionEl) sectionEl.textContent = segments.length ? 'Carregando…' : 'Preparando…';
      if (playBtn) playBtn.classList.add('is-playing');
      playNextSegmentElevenLabs();
    } else {
      speechSynthesis.cancel();
      updateProgress(0, '0:00');
      if (sectionEl) sectionEl.textContent = segments.length ? segments[0].title : 'Preparando…';
      if (playBtn) playBtn.classList.add('is-playing');
      speakNext();
    }
  }

  function togglePlayPause() {
    if (useElevenLabs && audioEl) {
      if (!audioEl.paused) {
        audioEl.pause();
        if (playBtn) playBtn.classList.remove('is-playing');
        stopProgressAnimation();
      } else if (currentIndex < segments.length || audioEl.src) {
        audioEl.play();
        if (playBtn) playBtn.classList.add('is-playing');
        if (audioEl.duration && !isNaN(audioEl.duration)) {
          var startP = segments.length ? (currentIndex / segments.length) * 100 : 0;
          var endP = segments.length ? ((currentIndex + 1) / segments.length) * 100 : 100;
          progressInterval = setInterval(function () {
            if (barClosed || !audioEl.duration) return;
            var p = startP + (audioEl.currentTime / audioEl.duration) * (endP - startP);
            updateProgress(p, null);
          }, 250);
        }
      } else {
        if (currentIndex >= segments.length && segments.length) {
          currentIndex = 0;
          updateProgress(0, '0:00');
        }
        startPodcast();
      }
      return;
    }

    if (speechSynthesis.speaking) {
      speechSynthesis.pause();
      if (playBtn) playBtn.classList.remove('is-playing');
      stopProgressAnimation();
    } else if (speechSynthesis.paused) {
      speechSynthesis.resume();
      if (playBtn) playBtn.classList.add('is-playing');
      startProgressAnimation();
    } else {
      if (currentIndex >= segments.length && segments.length) {
        currentIndex = 0;
        updateProgress(0, '0:00');
      }
      if (currentIndex < segments.length) {
        if (playBtn) playBtn.classList.add('is-playing');
        speakNext();
      } else {
        startPodcast();
      }
    }
  }

  function forceStopSpeech() {
    speechSynthesis.pause();
    speechSynthesis.cancel();
    var empty = new SpeechSynthesisUtterance('\u200B');
    empty.volume = 0;
    empty.rate = 0.01;
    speechSynthesis.speak(empty);
    speechSynthesis.cancel();
    var n = 0;
    var t = setInterval(function () {
      speechSynthesis.pause();
      speechSynthesis.cancel();
      n++;
      if (n >= 20) clearInterval(t);
    }, 50);
  }

  function closeBar() {
    barClosed = true;
    if (useElevenLabs && audioEl) {
      audioEl.pause();
      audioEl.removeAttribute('src');
      audioEl.load();
      if (currentBlobUrl) {
        URL.revokeObjectURL(currentBlobUrl);
        currentBlobUrl = null;
      }
    }
    forceStopSpeech();
    bar.hidden = true;
    document.body.classList.remove('podcast-bar-open');
    if (playBtn) playBtn.classList.remove('is-playing');
    stopProgressAnimation();
  }

  function openBar() {
    barClosed = false;
    bar.hidden = false;
    document.body.classList.add('podcast-bar-open');
    if (segments.length === 0) segments = collectSegments();
    if (sectionEl) sectionEl.textContent = 'Clique em reproduzir para ouvir.';
    updateProgress(0, '0:00');
  }

  trigger.addEventListener('click', function () {
    openBar();
  });

  bar.addEventListener('click', function (e) {
    if (e.target.closest && e.target.closest('.podcast-bar__close')) {
      e.preventDefault();
      e.stopPropagation();
      closeBar();
    }
  });

  playBtn.addEventListener('click', function () {
    if (segments.length === 0) segments = collectSegments();
    if (segments.length === 0) {
      if (sectionEl) sectionEl.textContent = 'Nenhum conteúdo encontrado.';
      return;
    }
    togglePlayPause();
  });

  timelineEl.addEventListener('click', function (e) {
    if (segments.length === 0) return;
    var rect = timelineEl.getBoundingClientRect();
    var x = e.clientX - rect.left;
    var p = (x / rect.width) * 100;
    currentIndex = Math.min(segments.length - 1, Math.floor((p / 100) * segments.length));
    if (useElevenLabs && audioEl) {
      audioEl.pause();
      if (currentBlobUrl) URL.revokeObjectURL(currentBlobUrl);
      currentBlobUrl = null;
    } else {
      speechSynthesis.cancel();
    }
    updateProgress((currentIndex / segments.length) * 100, null);
    if (playBtn) playBtn.classList.add('is-playing');
    if (useElevenLabs) playNextSegmentElevenLabs();
    else speakNext();
  });

  speechSynthesis.onvoiceschanged = function () {
    getPortugueseVoice();
  };
  if (speechSynthesis.getVoices().length) getPortugueseVoice();
})();
