/* =========================================================
   1. ファーストビュー
   ========================================================= */
(function () {
  'use strict';

  /* ---------------------------------------------------------
     自動スクロール写真
     - いつもはゆっくり左へ流れる（1周の時間は CSS の --marquee-duration）
     - 指（PCはマウス）で左右に動かせる。離すと少し惰性で進み、少し待ってから自動で流れはじめる
     - タップした写真は拡大表示（横にスワイプして次の写真も見られる。下のギャラリー）
     JS が動かない環境では、CSS のアニメーションだけで流れる
     --------------------------------------------------------- */
  var slider = document.querySelector('.fv__slider');
  var track = slider && slider.querySelector('.fv__track');
  if (!track) return;

  var items = track.children;
  var half = items.length / 2;                         // 2周分並べているうちの1周の枚数
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var RESUME_DELAY = 1500;                             // 指を離してから自動で流れはじめるまで（ミリ秒）

  var loopW = 0;          // 1周の長さ（px）
  var speed = 0;          // 自動で流れる速さ（px/秒）
  var offset = 0;         // 今どれだけ左へ動いているか（px）
  var velocity = 0;       // 指を離したあとの惰性の速さ（px/秒）
  var resumeAt = 0;       // この時刻までは自動で流さない
  var holding = false;    // 指・マウスで押さえている／カーソルが乗っている／拡大表示中
  var visible = true;     // 画面に見えているか
  var lastTime = 0;

  slider.classList.add('is-js');                       // CSS のアニメーションを止めて JS で動かす

  function measure() {
    var oldW = loopW;
    loopW = items[half].offsetLeft - items[0].offsetLeft;
    var duration = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--marquee-duration')) || 60;
    speed = loopW / duration;
    if (oldW && loopW) offset = offset / oldW * loopW;   // 画面幅が変わっても同じ写真のあたりを表示
  }

  function render() {
    if (loopW) offset = ((offset % loopW) + loopW) % loopW;   // 1周したら先頭へ（切れ目なくつながる）
    track.style.transform = 'translate3d(' + (-offset) + 'px,0,0)';
  }

  function tick(now) {
    var dt = lastTime ? Math.min((now - lastTime) / 1000, .05) : 0;
    lastTime = now;
    if (visible && !dragging) {
      if (velocity) {
        offset += velocity * dt;
        velocity *= Math.pow(.94, dt * 60);                // だんだん止まる
        if (Math.abs(velocity) < 8) velocity = 0;
      } else if (!reduced && !holding && now >= resumeAt) {
        offset += speed * dt;
      }
      render();
    }
    requestAnimationFrame(tick);
  }

  // 写真の位置を測るのは最初の描画のあと（起動直後にレイアウトの値を読まない。それまでは帯は最初の位置のまま）
  (window.afterFirstPaint || function (fn) { requestAnimationFrame(function () { setTimeout(fn, 0); }); })(function () {
    measure();
    render();
    requestAnimationFrame(tick);
  });
  window.addEventListener('resize', function () { measure(); render(); });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
    }).observe(slider);
  }

  /* --- 指・マウスで動かす --- */
  var pointerId = null, dragging = false, suppressClick = false;
  var startX = 0, startOffset = 0, lastX = 0, lastT = 0;

  slider.addEventListener('pointerdown', function (e) {
    if (!e.isPrimary || e.button !== 0) return;
    pointerId = e.pointerId;
    startX = lastX = e.clientX;
    lastT = e.timeStamp;
    startOffset = offset;
    velocity = 0;
    dragging = false;
    resumeAt = Infinity;
  });

  slider.addEventListener('pointermove', function (e) {
    if (e.pointerId !== pointerId) return;
    var dx = e.clientX - startX;
    if (!dragging && Math.abs(dx) > 6) {
      dragging = true;
      slider.classList.add('is-dragging');
      try { slider.setPointerCapture(pointerId); } catch (err) { /* 古いブラウザ */ }
    }
    if (!dragging) return;
    var dt = (e.timeStamp - lastT) / 1000;
    if (dt > 0) velocity = -(e.clientX - lastX) / dt;
    lastX = e.clientX;
    lastT = e.timeStamp;
    offset = startOffset - dx;
    render();
  });

  function release(e, cancelled) {
    if (e.pointerId !== pointerId) return;
    pointerId = null;
    if (dragging) {
      dragging = false;
      slider.classList.remove('is-dragging');
      if (cancelled || e.timeStamp - lastT > 80) velocity = 0;   // 止めてから離したときは惰性なし
      velocity = Math.max(-3000, Math.min(3000, velocity));
      suppressClick = true;                                       // ドラッグのあとのクリックで拡大しない
      setTimeout(function () { suppressClick = false; }, 60);
    } else {
      velocity = 0;
    }
    resumeAt = performance.now() + (cancelled ? 0 : RESUME_DELAY);
  }
  slider.addEventListener('pointerup', function (e) { release(e, false); });
  slider.addEventListener('pointercancel', function (e) { release(e, true); });   // 縦スクロールが始まったとき

  // PC：カーソルが乗っている間は止める（押しやすいように）
  slider.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') holding = true; });
  slider.addEventListener('pointerleave', function (e) {
    if (e.pointerType === 'mouse') { holding = false; resumeAt = Math.max(resumeAt === Infinity ? 0 : resumeAt, performance.now() + 300); }
  });

  // キーボードで写真を選んだときは、その写真が見える位置で止める
  // （指・マウスで押したときは動かさない。動かすと押した写真がずれて拡大できなくなる）
  track.addEventListener('focusin', function (e) {
    var li = e.target.closest('li');
    if (!li || !e.target.matches(':focus-visible')) return;
    holding = true;
    offset = li.offsetLeft - items[0].offsetLeft - 20;
    render();
  });
  track.addEventListener('focusout', function () { holding = false; });


  /* ---------------------------------------------------------
     タップした写真を拡大表示（ギャラリー）（2026-10-23 確認用：1枚ずつの拡大から変更）
     - 自動スクロールの写真（1周分）を横に並べたポップアップ。指で横にスワイプ／左右の矢印／キーボードの←→で次の写真へ
     - 写真の下に説明文、いちばん下に「3 / 11」のような番号。端の写真では、その先の矢印は出さない
     - 拡大用の大きい画像は slide_XX_l.jpg（表示している写真と両隣だけ読み込む。読み込むまでは小さい画像）
     - 写真以外（背景・×）をタップすると閉じる。Escキーでも閉じる
     - 見た目（暗い背景・×・説明文）は 3・5 の写真の拡大（#photoModal、js/common.js）と同じ
     --------------------------------------------------------- */
  if (typeof window.HTMLDialogElement !== 'function') return;

  var photos = [];
  for (var p = 0; p < half; p++) {
    var im = items[p].querySelector('img');
    var small = im.getAttribute('data-lsrc') || im.getAttribute('src');   // 最初の描画のあとに読む写真は data-lsrc
    photos.push({
      small: small,
      large: small.replace(/(_\d+)?\.jpg$/, '_l.jpg'),                   // slide_01_540.jpg → slide_01_l.jpg
      w: +im.getAttribute('width'), h: +im.getAttribute('height'),       // 縦横比は元の写真（720px）の大きさで
      alt: im.alt
    });
  }

  var gal = document.createElement('dialog');
  gal.className = 'photo-modal fv-gallery';
  gal.setAttribute('aria-label', '写真の拡大表示');
  gal.innerHTML =
    '<div class="fv-gallery__track" tabindex="-1"></div>' +
    '<button class="fv-gallery__nav fv-gallery__nav--prev" type="button" aria-label="前の写真"></button>' +
    '<button class="fv-gallery__nav fv-gallery__nav--next" type="button" aria-label="次の写真"></button>' +
    '<p class="fv-gallery__count" aria-live="polite"></p>' +
    '<button class="photo-modal__close" type="button" aria-label="閉じる"></button>';
  var gTrack = gal.querySelector('.fv-gallery__track');
  var gPrev = gal.querySelector('.fv-gallery__nav--prev');
  var gNext = gal.querySelector('.fv-gallery__nav--next');
  var gCount = gal.querySelector('.fv-gallery__count');
  var gImgs = photos.map(function (ph) {
    var fig = document.createElement('figure');
    fig.className = 'fv-gallery__slide';
    var img = document.createElement('img');
    img.className = 'fv-gallery__img';
    img.alt = ph.alt;
    img.width = ph.w;
    img.height = ph.h;
    img.decoding = 'async';
    img.draggable = false;
    var cap = document.createElement('figcaption');
    cap.className = 'photo-modal__caption';
    cap.textContent = ph.alt;
    fig.appendChild(img);
    fig.appendChild(cap);
    gTrack.appendChild(fig);
    return img;
  });
  document.body.appendChild(gal);

  var gIndex = 0;

  // それぞれの写真を、画面に収まるいちばん大きいサイズにする（小さい画像→大きい画像に替わっても大きさが変わらない）
  function fitAll() {
    gImgs.forEach(function (img, n) {
      var fig = img.parentNode, cap = img.nextSibling;
      var cs = getComputedStyle(fig);
      var w = fig.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      var h = fig.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom)
            - cap.offsetHeight - parseFloat(getComputedStyle(cap).marginTop);
      var scale = Math.min(w / photos[n].w, h / photos[n].h);
      img.style.width = Math.floor(photos[n].w * scale) + 'px';
      img.style.height = Math.floor(photos[n].h * scale) + 'px';
    });
  }

  function loadLarge(n) {
    var img = gImgs[n];
    if (!img || img.dataset.large) return;
    img.dataset.large = '1';
    var big = new Image();
    big.onload = function () { img.src = photos[n].large; };
    big.src = photos[n].large;
  }

  function update(n) {
    gIndex = Math.max(0, Math.min(photos.length - 1, n));
    gCount.textContent = (gIndex + 1) + ' / ' + photos.length;
    gPrev.classList.toggle('is-hidden', gIndex === 0);
    gNext.classList.toggle('is-hidden', gIndex === photos.length - 1);
    loadLarge(gIndex); loadLarge(gIndex - 1); loadLarge(gIndex + 1);
  }

  function goTo(n, smooth) {
    n = Math.max(0, Math.min(photos.length - 1, n));
    gTrack.scrollTo({ left: n * gTrack.clientWidth, behavior: smooth ? 'smooth' : 'auto' });
    update(n);
  }

  var gTicking = false;
  gTrack.addEventListener('scroll', function () {
    if (gTicking) return;
    gTicking = true;
    requestAnimationFrame(function () {
      gTicking = false;
      if (gTrack.clientWidth) update(Math.round(gTrack.scrollLeft / gTrack.clientWidth));
    });
  }, { passive: true });

  gPrev.addEventListener('click', function () { goTo(gIndex - 1, true); });
  gNext.addEventListener('click', function () { goTo(gIndex + 1, true); });
  gal.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(gIndex - 1, true); }
    if (e.key === 'ArrowRight') { e.preventDefault(); goTo(gIndex + 1, true); }
  });
  gal.addEventListener('click', function (e) {
    if (e.target.closest('.fv-gallery__img, .fv-gallery__nav')) return;
    gal.close();
  });
  window.addEventListener('resize', function () {
    if (!gal.open) return;
    fitAll();
    goTo(gIndex, false);
  });

  function openGallery(n) {
    gImgs.forEach(function (img, k) { if (!img.getAttribute('src')) img.src = photos[k].small; });
    gal.showModal();
    document.documentElement.classList.add('is-modal-open');
    fitAll();
    goTo(n, false);
    gTrack.focus({ preventScroll: true });
  }

  var openedHere = false;   // 自動スクロールの写真から開いたとき（閉じたら自動スクロールを再開）

  track.addEventListener('click', function (e) {
    if (suppressClick) { e.preventDefault(); e.stopPropagation(); return; }
    var btn = e.target.closest('.fv__thumb');
    if (!btn) return;
    var index = Array.prototype.indexOf.call(items, btn.parentElement) % half;   // 2周目の写真は1周目と同じ写真
    holding = true;
    openedHere = true;
    openGallery(index);
  });

  gal.addEventListener('close', function () {
    document.documentElement.classList.remove('is-modal-open');
    if (!openedHere) return;
    openedHere = false;
    holding = false;
    resumeAt = performance.now() + 600;
  });
})();
