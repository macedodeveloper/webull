(function () {
  'use strict';

  var overlay = document.getElementById('slides-overlay');
  var trigger = document.getElementById('slides-trigger');
  var closeBtn = document.getElementById('slides-close');
  var prevBtn = document.getElementById('slides-prev');
  var nextBtn = document.getElementById('slides-next');
  var currentEl = document.getElementById('slides-current');
  var counterEl = document.getElementById('slides-counter');

  if (!overlay || !trigger || !currentEl) return;

  var slides = [];
  var currentIndex = 0;

  function stripHtml(html) {
    var div = document.createElement('div');
    div.innerHTML = html;
    return (div.textContent || div.innerText || '').replace(/\s+/g, ' ').trim();
  }

  function getText(el) {
    return el ? stripHtml(el.innerHTML) : '';
  }

  /** Turn long paragraph into deck-style bullets (max 6). */
  function toBullets(text) {
    if (!text || text.length < 10) return [];
    var s = text
      .replace(/\s+/g, ' ')
      .replace(/\.\s+/g, '.|')
      .replace(/\;\s+/g, ';|')
      .replace(/\—\s+/g, '—|')
      .replace(/\n/g, '|')
      .trim();
    var parts = s.split('|').map(function (p) { return p.trim(); }).filter(Boolean);
    var out = [];
    for (var i = 0; i < parts.length && out.length < 6; i++) {
      var p = parts[i];
      if (p.length > 8) {
        if (p[p.length - 1] === '.') p = p.slice(0, -1);
        out.push(p);
      }
    }
    if (out.length === 0 && text.length > 20) out.push(text.slice(0, 200) + (text.length > 200 ? '…' : ''));
    return out;
  }

  function collectSlides() {
    var main = document.querySelector('main.page');
    if (!main) return [];

    var out = [];

    out.push({ type: 'title', title: 'Raio-X · Iasmim Souza' });

    var intro = main.querySelector('.intro__message');
    if (intro) {
      intro.querySelectorAll('p').forEach(function (p) {
        var text = getText(p);
        if (!text || text.indexOf('– Nicolas') !== -1) return;
        var bullets = toBullets(text);
        if (bullets.length > 0) {
          out.push({ type: 'content', title: 'Introdução', bullets: bullets });
        } else if (text.length > 5) {
          out.push({ type: 'content', title: 'Introdução', body: text.slice(0, 400) });
        }
      });
    }

    var sectionTitles = main.querySelectorAll('.heading-section, .section-subtitle');
    var cards = main.querySelectorAll('.card, .world-card, .diff-card, .stat-card, .expense-card, .asset-card, .portfolio-card');
    var blocks = [];

    main.querySelectorAll('section').forEach(function (section) {
      if (section.classList.contains('hero')) return;
      var titleEl = section.querySelector('.heading-section');
      var sectionTitle = titleEl ? getText(titleEl).replace(/\s+/g, ' ') : '';

      if (sectionTitle) {
        blocks.push({ type: 'section', title: sectionTitle });
      }

      section.querySelectorAll('.card').forEach(function (card) {
        var t = card.querySelector('.card__title');
        var b = card.querySelector('.card__body');
        var title = t ? getText(t) : '';
        var body = b ? getText(b) : '';
        if (title || body) {
          var bullets = toBullets(body);
          if (bullets.length > 0) {
            blocks.push({ type: 'content', title: title, bullets: bullets });
          } else if (body.length > 10) {
            blocks.push({ type: 'content', title: title, body: body.slice(0, 350) });
          } else if (title) {
            blocks.push({ type: 'content', title: title, body: body || '' });
          }
        }
      });

      section.querySelectorAll('.world-card').forEach(function (card) {
        var t = card.querySelector('.world-card__title');
        var b = card.querySelector('.world-card__body');
        var title = t ? getText(t) : '';
        var body = b ? getText(b) : '';
        if (title || body) {
          var bullets = toBullets(body);
          if (bullets.length > 0) {
            blocks.push({ type: 'content', title: title, bullets: bullets });
          } else {
            blocks.push({ type: 'content', title: title, body: body.slice(0, 300) });
          }
        }
      });

      if (section.classList.contains('section-financas')) {
        section.querySelectorAll('.section-subtitle').forEach(function (el) {
          blocks.push({ type: 'section', title: getText(el) });
        });
        var statCards = section.querySelectorAll('.stat-card');
        if (statCards.length > 0) {
          var statLines = [];
          statCards.forEach(function (card) {
            var v = card.querySelector('.stat-card__value');
            var l = card.querySelector('.stat-card__label');
            if (v && l) statLines.push(getText(v) + ' — ' + getText(l));
          });
          if (statLines.length > 0) {
            blocks.push({ type: 'content', title: 'Perfil financeiro', bullets: statLines.slice(0, 8) });
          }
        }
        section.querySelectorAll('.month-grid').forEach(function (grid) {
          var prevTitle = grid.previousElementSibling;
          var sectionTitle = prevTitle && prevTitle.classList.contains('section-subtitle') ? getText(prevTitle) : 'Melhor / Pior mês';
          var cardsInGrid = grid.querySelectorAll('.stat-card');
          var lines = [];
          cardsInGrid.forEach(function (card) {
            var val = card.querySelector('.stat-card__value');
            var lab = card.querySelector('.stat-card__label');
            if (val && lab) lines.push(getText(val) + ' — ' + getText(lab));
            else {
              var body = card.querySelector('.card__body');
              if (body) lines.push(getText(body).slice(0, 120));
            }
          });
          if (lines.length > 0) blocks.push({ type: 'content', title: sectionTitle, bullets: lines });
        });
        var expenseCards = section.querySelectorAll('.expense-card');
        if (expenseCards.length > 0) {
          var expenseLines = [];
          expenseCards.forEach(function (card) {
            var v = card.querySelector('.expense-card__value');
            var c = card.querySelector('.expense-card__category');
            var h = card.querySelector('.expense-card__hint');
            if (v && c) expenseLines.push(getText(v) + ' — ' + getText(c));
            if (h) expenseLines.push(getText(h).slice(0, 80));
          });
          if (expenseLines.length > 0) {
            blocks.push({ type: 'content', title: 'Maiores gastos recorrentes', bullets: expenseLines.slice(0, 6) });
          }
        }
        var tip = section.querySelector('.tip-box p');
        if (tip) {
          blocks.push({ type: 'content', title: 'Dica', body: getText(tip).slice(0, 280) });
        }
      }

      if (section.classList.contains('section-portfolio')) {
        section.querySelectorAll('.portfolio-desc, .portfolio-desc p').forEach(function (el) {
          var text = getText(el);
          if (text.length > 15) {
            var bullets = toBullets(text);
            if (bullets.length > 0) blocks.push({ type: 'content', title: 'Portfólio', bullets: bullets });
            else blocks.push({ type: 'content', title: 'Portfólio', body: text.slice(0, 300) });
          }
        });
      }

      if (section.classList.contains('section-strategy')) {
        var stratTitle = section.querySelector('.strategy__title');
        if (stratTitle) blocks.push({ type: 'section', title: getText(stratTitle) });
        section.querySelectorAll('.strategy__body p').forEach(function (p) {
          var text = getText(p);
          if (text.length > 20) {
            var bullets = toBullets(text);
            if (bullets.length > 0) blocks.push({ type: 'content', title: 'Estratégia WeBull', bullets: bullets });
            else blocks.push({ type: 'content', title: 'Estratégia WeBull', body: text.slice(0, 320) });
          }
        });
      }

      if (section.classList.contains('section-differences')) {
        section.querySelectorAll('.diff-card p').forEach(function (p) {
          var text = getText(p);
          if (text.length > 30) {
            var bullets = toBullets(text);
            if (bullets.length > 0) blocks.push({ type: 'content', title: 'Diferenças', bullets: bullets.slice(0, 5) });
            else blocks.push({ type: 'content', title: 'Diferenças', body: text.slice(0, 300) });
          }
        });
      }

      if (section.classList.contains('section-assets')) {
        section.querySelectorAll('.asset-card').forEach(function (card) {
          var name = card.querySelector('.asset-card__name');
          var desc = card.querySelector('.asset-card__desc');
          if (name) {
            blocks.push({ type: 'content', title: getText(name), body: desc ? getText(desc).slice(0, 150) : '' });
          }
        });
      }

      if (section.classList.contains('section-quote')) {
        var q = section.querySelector('.section-quote__text');
        if (q) blocks.push({ type: 'content', title: 'Citação', body: getText(q).slice(0, 350) });
      }

      if (section.classList.contains('section-closing')) {
        section.querySelectorAll('.closing-text p').forEach(function (p) {
          var text = getText(p);
          if (text.length > 25) {
            var bullets = toBullets(text);
            if (bullets.length > 0) blocks.push({ type: 'content', title: 'Mensagem final', bullets: bullets.slice(0, 4) });
            else blocks.push({ type: 'content', title: 'Mensagem final', body: text.slice(0, 300) });
          }
        });
      }
    });

    blocks.forEach(function (b) {
      if (b.type === 'section') {
        out.push({ type: 'title', title: b.title });
      } else {
        out.push(b);
      }
    });

    return out;
  }

  function escapeHtml(s) {
    if (!s) return '';
    var div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function renderSlide(slide) {
    if (!slide) return;
    var isTitle = slide.type === 'title';
    currentEl.className = 'slides-overlay__slide' + (isTitle ? ' slides-overlay__slide--title' : '');
    var html = '';
    if (isTitle) {
      html = '<h2>' + escapeHtml(slide.title) + '</h2>';
    } else {
      html = '<h2>' + escapeHtml(slide.title) + '</h2>';
      if (slide.bullets && slide.bullets.length > 0) {
        html += '<ul>';
        slide.bullets.forEach(function (b) {
          html += '<li>' + escapeHtml(b) + '</li>';
        });
        html += '</ul>';
      } else if (slide.body) {
        html += '<p>' + escapeHtml(slide.body) + '</p>';
      }
    }
    currentEl.innerHTML = html;
  }

  function updateCounter() {
    if (counterEl) counterEl.textContent = (currentIndex + 1) + ' / ' + slides.length;
  }

  function goTo(index) {
    if (index < 0 || index >= slides.length) return;
    currentIndex = index;
    renderSlide(slides[currentIndex]);
    updateCounter();
  }

  function next() {
    if (currentIndex < slides.length - 1) goTo(currentIndex + 1);
  }

  function prev() {
    if (currentIndex > 0) goTo(currentIndex - 1);
  }

  function openDeck() {
    slides = collectSlides();
    if (slides.length === 0) return;
    currentIndex = 0;
    overlay.hidden = false;
    document.body.style.overflow = 'hidden';
    renderSlide(slides[0]);
    updateCounter();
  }

  function closeDeck() {
    overlay.hidden = true;
    document.body.style.overflow = '';
  }

  trigger.addEventListener('click', openDeck);

  overlay.addEventListener('click', function (e) {
    if (e.target.closest && e.target.closest('.slides-overlay__close')) {
      closeDeck();
      return;
    }
    if (e.target.closest && e.target.closest('.slides-overlay__nav--prev')) {
      prev();
      return;
    }
    if (e.target.closest && e.target.closest('.slides-overlay__nav--next')) {
      next();
      return;
    }
    if (e.target.closest && e.target.closest('.slides-overlay__stage')) {
      next();
    }
  });

  document.addEventListener('keydown', function (e) {
    if (overlay.hidden) return;
    if (e.key === 'Escape') {
      closeDeck();
      e.preventDefault();
    } else if (e.key === 'ArrowRight' || e.key === ' ') {
      next();
      e.preventDefault();
    } else if (e.key === 'ArrowLeft') {
      prev();
      e.preventDefault();
    }
  });
})();
