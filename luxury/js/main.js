/* 菊名LP（ラグジュアリー版） */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------
     1. FV：写真は表示される前（透明のあいだ）にブラウザが展開を後回しにすることがあり、
        切り替わりの瞬間に一瞬暗くなるのを防ぐため、読み込み後に4枚とも先に展開しておく
     --------------------------------------------------------- */
  function decodeSlides() {
    document.querySelectorAll('.fv__slide img').forEach(function (img) {
      if (img.decode) img.decode().catch(function () {});
    });
  }
  if (document.readyState === 'complete') decodeSlides();
  else window.addEventListener('load', decodeSlides);

  /* ---------------------------------------------------------
     4. 間取り図の拡大（<dialog>。×・背景のタップ・Escで閉じる）
     --------------------------------------------------------- */
  var zoom = document.getElementById('zoom');
  if (zoom && zoom.showModal) {
    var zoomImg = zoom.querySelector('.zoom__img');
    document.querySelectorAll('[data-zoom]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var src = btn.querySelector('img');
        zoomImg.src = btn.getAttribute('data-zoom');
        zoomImg.width = +btn.getAttribute('data-zoom-w');
        zoomImg.height = +btn.getAttribute('data-zoom-h');
        zoomImg.alt = src ? src.alt : '';
        zoom.showModal();
      });
    });
    zoom.querySelector('.zoom__close').addEventListener('click', function () { zoom.close(); });
    zoom.addEventListener('click', function (e) { if (e.target === zoom) zoom.close(); });
  }

  /* ---------------------------------------------------------
     5. ギャラリー（美しが丘LPと同じ形：1枚が84%・となりが少し見える・点と矢印・端から端へ切れ目なく続く）
        ＋ 4秒ごとに自動で次へ。画面に見えている間だけ動き、指・矢印で操作したら6秒は止める
     --------------------------------------------------------- */
  var slider = document.querySelector('[data-gallery]');
  if (slider) {
    var track = slider.querySelector('.gal__track');
    var real = Array.prototype.slice.call(track.children);
    var n = real.length;
    if (n > 1) {
      // 最後の1枚を先頭に、最初の1枚を末尾に複製（端に来たら同じ見た目の本物へ瞬間移動する）
      var headClone = real[n - 1].cloneNode(true);
      var tailClone = real[0].cloneNode(true);
      [headClone, tailClone].forEach(function (c) {
        c.setAttribute('aria-hidden', 'true');
        var img = c.querySelector('img'); if (img) img.alt = '';
      });
      track.insertBefore(headClone, real[0]);
      track.appendChild(tailClone);
      var all = Array.prototype.slice.call(track.children);
      var current = 1;

      // 点
      var dotsWrap = document.createElement('div');
      dotsWrap.className = 'gal__dots';
      real.forEach(function (_, i) {
        var d = document.createElement('button');
        d.type = 'button';
        d.className = 'gal__dot' + (i === 0 ? ' is-active' : '');
        d.setAttribute('aria-label', (i + 1) + '枚目の写真へ');
        d.addEventListener('click', function () { touched(); goTo(i + 1); });
        dotsWrap.appendChild(d);
      });
      slider.parentNode.insertBefore(dotsWrap, slider.nextSibling);
      var dots = Array.prototype.slice.call(dotsWrap.children);

      function setDot(idx) {
        var r = ((idx - 1) % n + n) % n;
        dots.forEach(function (d, i) { d.classList.toggle('is-active', i === r); });
      }
      // その写真が列のまん中に来る位置へ（ページはスクロールさせない）
      function goTo(idx, instant) {
        current = idx;
        var s = all[idx];
        var left = s.getBoundingClientRect().left - track.getBoundingClientRect().left + track.scrollLeft
                 - (track.clientWidth - s.clientWidth) / 2;
        track.scrollTo({ left: left, behavior: instant ? 'auto' : 'smooth' });
        setDot(idx);
      }
      // スクロールが止まったら、まん中の写真を「いまの写真」にする。複製なら本物へ瞬間移動
      var settleTimer;
      function settle() {
        var mid = track.getBoundingClientRect().left + track.clientWidth / 2;
        var best = 0, bestD = Infinity;
        all.forEach(function (s, i) {
          var r = s.getBoundingClientRect();
          var d = Math.abs(r.left + r.width / 2 - mid);
          if (d < bestD) { bestD = d; best = i; }
        });
        if (best === 0) goTo(n, true);
        else if (best === all.length - 1) goTo(1, true);
        else { current = best; setDot(best); }
      }
      track.addEventListener('scroll', function () {
        clearTimeout(settleTimer);
        settleTimer = setTimeout(settle, 140);
      }, { passive: true });

      // 指・ホイール・矢印で動かしたら、しばらく自動送りを止める
      var lastTouch = 0;
      function touched() { lastTouch = Date.now(); }
      ['pointerdown', 'touchstart', 'wheel'].forEach(function (ev) {
        track.addEventListener(ev, touched, { passive: true });
      });
      slider.querySelector('.gal__arrow--prev').addEventListener('click', function () { touched(); goTo(current - 1); });
      slider.querySelector('.gal__arrow--next').addEventListener('click', function () { touched(); goTo(current + 1); });

      // 自動送り（動きを減らす設定の人には自動では動かさない）
      var visible = false;
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }, { threshold: .3 }).observe(slider);
      }
      if (!reduceMotion) {
        setInterval(function () {
          if (!visible || document.hidden || Date.now() - lastTouch < 6000) return;
          goTo(current + 1);
        }, 4000);
      }

      // 画面の幅が変わったら、いまの写真をまん中に戻す
      var resizeTimer;
      window.addEventListener('resize', function () {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function () { goTo(current, true); }, 150);
      });

      goTo(1, true);
    }
  }
})();
