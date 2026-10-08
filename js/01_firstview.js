/* =========================================================
   1. ファーストビュー
   ========================================================= */
(function () {
  'use strict';

  /* ---------------------------------------------------------
     自動スクロール写真
     - いつもはゆっくり左へ流れる（1周の時間は CSS の --marquee-duration）
     - 指（PCはマウス）で左右に動かせる。離すと少し惰性で進み、少し待ってから自動で流れはじめる
     - タップした写真は拡大表示（#fvPhotoModal）
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

  measure();
  render();
  requestAnimationFrame(tick);
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
     タップした写真を拡大表示
     （拡大用の大きい画像は slide_XX_l.jpg。読み込むまでは小さい画像を表示）
     --------------------------------------------------------- */
  var modal = document.getElementById('fvPhotoModal');
  if (!modal || typeof modal.showModal !== 'function') return;
  var inner = modal.querySelector('.photo-modal__inner');
  var modalImg = modal.querySelector('.photo-modal__img');
  var caption = modal.querySelector('.photo-modal__caption');
  var root = document.documentElement;
  var loading = null;
  var natW = 0, natH = 0;   // 写真の縦横比（小さい画像から取る）

  // 画面に収まるいちばん大きいサイズにする（小さい画像→大きい画像に替わっても大きさが変わらないよう、先に決める）
  function fit() {
    if (!modal.open || !natW) return;
    var cs = getComputedStyle(inner);
    var w = inner.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    var h = inner.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom)
          - caption.offsetHeight - parseFloat(getComputedStyle(caption).marginTop);
    var scale = Math.min(w / natW, h / natH);
    modalImg.style.width = Math.floor(natW * scale) + 'px';
    modalImg.style.height = Math.floor(natH * scale) + 'px';
  }
  window.addEventListener('resize', fit);

  track.addEventListener('click', function (e) {
    if (suppressClick) { e.preventDefault(); e.stopPropagation(); return; }
    var btn = e.target.closest('.fv__thumb');
    if (!btn) return;
    var li = btn.parentElement;
    var index = Array.prototype.indexOf.call(items, li) % half;   // 2周目の写真も1周目と同じ説明文
    var img = btn.querySelector('img');
    var text = items[index].querySelector('img').alt;
    var large = img.getAttribute('src').replace(/\.jpg$/, '_l.jpg');

    modalImg.src = img.currentSrc || img.src;
    modalImg.alt = text;
    caption.textContent = text;
    loading = new Image();
    loading.onload = function () { if (this === loading && modal.open) modalImg.src = large; };
    loading.src = large;

    natW = img.naturalWidth || +img.getAttribute('width');
    natH = img.naturalHeight || +img.getAttribute('height');

    holding = true;
    modal.showModal();
    root.classList.add('is-modal-open');
    fit();
  });

  // 写真以外（背景・×ボタン）をタップしたら閉じる。Escキーでも閉じる
  modal.addEventListener('click', function (e) {
    if (e.target !== modalImg) modal.close();
  });
  modal.addEventListener('close', function () {
    root.classList.remove('is-modal-open');
    loading = null;
    holding = false;
    resumeAt = performance.now() + 600;
  });
})();
