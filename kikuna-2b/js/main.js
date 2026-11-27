/* 菊名LP（ラグジュアリー版） */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------
     1. FV：写真のスライドショー（4枚 × 8秒。1.6秒かけて重ねて切り替える）
        写真は画面より大きく置き、横や縦へゆっくり動かす（ズームだけでなく、横にスライドする視点で広さを見せる）。
        動きは index.html の data-over / data-fx→data-tx / data-fy→data-ty で指定（0＝左端・上端、1＝右端・下端）
        ※CSSアニメだけで切り替えていたとき、ブラウザによっては全部透明のままになることがあったため、JSで切り替える。
          JSが動かなくても、1枚目は最初から表示（is-on）してある
     --------------------------------------------------------- */
  var fv = document.querySelector('.fv__slides');
  if (fv) {
    var slides = Array.prototype.slice.call(fv.querySelectorAll('.fv__slide'));
    var bars = Array.prototype.slice.call(document.querySelectorAll('.fv__bar'));
    var SHOW = 8000, FADE = 1600, idx = 0, zTop = 1, fvTimer;
    var isWide = function () { return window.matchMedia('(min-width: 768px)').matches; };

    // 写真の大きさ・動く位置を決める（写真が読み込まれていないときは false）
    function layout(slide) {
      var img = slide.querySelector('img');
      if (!img || !img.naturalWidth) return false;
      var cw = fv.clientWidth, ch = fv.clientHeight;
      var r = img.naturalWidth / img.naturalHeight;
      var over = parseFloat((isWide() && slide.getAttribute('data-over-pc')) || slide.getAttribute('data-over') || '1');
      var w = Math.max(cw * over, ch * r), h = w / r;
      img.style.width = w + 'px'; img.style.height = h + 'px';
      var ex = w - cw, ey = h - ch;
      var g = function (k, d) { var v = parseFloat(slide.getAttribute(k)); return isNaN(v) ? d : v; };
      slide._m = { x0: -ex * g('data-fx', .5), x1: -ex * g('data-tx', .5), y0: -ey * g('data-fy', .5), y1: -ey * g('data-ty', .5),
                   s0: g('data-s0', 1), s1: g('data-s1', 1), cx: cw / 2, cy: ch / 2 };
      slide.classList.add('is-ready');
      return true;
    }
    function play(slide) {
      var m = slide._m, img = slide.querySelector('img');
      if (!m) return;
      // 位置（x, y）と拡大率 k。拡大は画面の中心を軸にする
      var at = function (x, y, k) {
        k = k || 1;
        var tx = m.cx * (1 - k) + k * x, ty = m.cy * (1 - k) + k * y;
        return 'translate3d(' + tx.toFixed(1) + 'px,' + ty.toFixed(1) + 'px,0) scale(' + k.toFixed(4) + ')';
      };
      if (slide._anim) { slide._anim.cancel(); slide._anim = null; }
      if (reduceMotion || !img.animate) { img.style.transform = at((m.x0 + m.x1) / 2, (m.y0 + m.y1) / 2, (m.s0 + m.s1) / 2); return; }
      img.style.transform = at(m.x0, m.y0, m.s0);
      slide._anim = img.animate([{ transform: at(m.x0, m.y0, m.s0) }, { transform: at(m.x1, m.y1, m.s1) }],
                                { duration: SHOW + FADE, easing: 'linear', fill: 'forwards' });
    }
    function ready(slide, fn) {
      var img = slide.querySelector('img');
      if (img.complete && img.naturalWidth) fn();
      else {
        img.addEventListener('load', fn, { once: true });
        img.addEventListener('error', function () { clearTimeout(fvTimer); fvTimer = setTimeout(tick, 0); }, { once: true });
      }
    }
    function show(i) {
      var s = slides[i];
      layout(s); play(s);
      if (i !== 0 || s._shown) s.style.zIndex = ++zTop;     // あとの写真は、いまの写真の上に重ねてあらわす
      s._shown = true;
      s.classList.add('is-on');
      bars.forEach(function (b) { b.classList.remove('is-on'); });
      if (bars[i]) { void bars[i].offsetWidth; bars[i].classList.add('is-on'); }
      setTimeout(function () {                                 // 重なり終えたら、前の写真を消す
        slides.forEach(function (o) { if (o !== s) o.classList.remove('is-on'); });
      }, FADE + 100);
    }
    function tick() {
      loadRest();                                              // 読み込み完了より先に切り替えの時間が来たとき
      idx = (idx + 1) % slides.length;
      ready(slides[idx], function () {
        show(idx);
        clearTimeout(fvTimer); fvTimer = setTimeout(tick, SHOW);
      });
    }
    ready(slides[0], function () {
      show(0);
      fvTimer = setTimeout(tick, SHOW);
    });
    // 2〜4枚目は、ページの読み込みが終わってから読み込む（最初に4枚を同時に読むと1枚目の表示が遅れるため。
    // index.html では data-src / data-srcset にしてある）。切り替わる瞬間に暗くならないよう、読み込んだら先に展開しておく
    var restLoaded = false;
    function loadRest() {
      if (restLoaded) return;
      restLoaded = true;
      slides.forEach(function (sl) {
        sl.querySelectorAll('source[data-srcset]').forEach(function (so) { so.srcset = so.getAttribute('data-srcset'); so.removeAttribute('data-srcset'); });
        var im = sl.querySelector('img');
        if (im.hasAttribute('data-srcset')) { im.srcset = im.getAttribute('data-srcset'); im.removeAttribute('data-srcset'); }
        if (im.hasAttribute('data-src')) { im.src = im.getAttribute('data-src'); im.removeAttribute('data-src'); }
        if (im.decode) im.decode().catch(function () {});
      });
    }
    if (document.readyState === 'complete') loadRest();
    else window.addEventListener('load', loadRest);
    // 画面の幅が変わったら大きさを計算し直す（高さだけの変化＝スマホのバーの出入りでは動かさない）
    var lastW = fv.clientWidth, rt;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(function () {
        if (fv.clientWidth === lastW) return;
        lastW = fv.clientWidth;
        slides.forEach(function (sl) { if (sl._m) { layout(sl); if (sl.classList.contains('is-on')) play(sl); } });
      }, 200);
    });
  }

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
     写真の拡大（どのギャラリーでも共通。開いたギャラリーの写真を順に見られる）
     --------------------------------------------------------- */
  var gview = document.getElementById('gview');
  var viewer = null;
  if (gview && gview.showModal) {
    var gimg = gview.querySelector('.gview__img'), gen = gview.querySelector('.gview__en'),
        gjp = gview.querySelector('.gview__jp'), gcount = gview.querySelector('.gview__count');
    var vlist = [], gcur = 0, vclose = null;
    var fullSrc = function (f) {
      return f.getAttribute('data-full') || f.querySelector('img').getAttribute('src').replace('_800.', '_1600.');
    };
    var openAt = function (i) {
      var m = vlist.length;
      gcur = ((i % m) + m) % m;
      var f = vlist[gcur];
      gimg.src = fullSrc(f);
      gimg.alt = f.querySelector('img').alt;
      gen.textContent = f.getAttribute('data-en');
      gjp.textContent = f.getAttribute('data-jp');
      var note = f.getAttribute('data-note');
      if (note) { var sm = document.createElement('small'); sm.textContent = note; gjp.appendChild(sm); }
      gcount.textContent = (gcur + 1) + ' / ' + m;
      if (!gview.open) gview.showModal();
      // 次の写真を先に読み込んでおく
      [gcur + 1, gcur - 1].forEach(function (k) { var pi = new Image(); pi.src = fullSrc(vlist[((k % m) + m) % m]); });
    };
    viewer = { open: function (list, i, onClose) { vlist = list; vclose = onClose; openAt(i); } };
    gview.querySelector('.gview__close').addEventListener('click', function () { gview.close(); });
    gview.querySelector('.gview__nav--prev').addEventListener('click', function () { openAt(gcur - 1); });
    gview.querySelector('.gview__nav--next').addEventListener('click', function () { openAt(gcur + 1); });
    gview.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') openAt(gcur - 1);
      if (e.key === 'ArrowRight') openAt(gcur + 1);
    });
    gview.addEventListener('click', function (e) { if (e.target === gview) gview.close(); });
    gview.addEventListener('close', function () { if (vclose) vclose(gcur); });
  }

  /* ---------------------------------------------------------
     5. ギャラリー（美しが丘LPと同じ形：1枚が84%・となりが少し見える・点と矢印・端から端へ切れ目なく続く）
        ＋ 4秒ごとに自動で次へ。画面に見えている間だけ動き、指・矢印で操作したら6秒は止める
     --------------------------------------------------------- */
  function initGallery(slider) {
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
      [headClone, tailClone].forEach(function (c) { c.setAttribute('tabindex', '-1'); });
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

      // タップで拡大（説明は拡大したときに出す）。閉じたら、見ていた写真の位置に戻す
      if (viewer) {
        var show = function (f) {
          viewer.open(real, +f.getAttribute('data-i'), function (i) { touched(); goTo(i + 1, true); });
        };
        track.addEventListener('click', function (e) {
          var f = e.target.closest('.gal__slide');
          if (f) show(f);
        });
        track.addEventListener('keydown', function (e) {
          var f = e.target.closest('.gal__slide');
          if (f && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); show(f); }
        });
      }

      // 自動送り（動きを減らす設定の人には自動では動かさない）
      var visible = false;
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }, { threshold: .3 }).observe(slider);
      }
      if (!reduceMotion) {
        setInterval(function () {
          if (!visible || document.hidden || Date.now() - lastTouch < 6000 || (gview && gview.open)) return;
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
  Array.prototype.forEach.call(document.querySelectorAll('[data-gallery]'), initGallery);

  /* ---------------------------------------------------------
     追従するヘッダー・予約ボタンと「先頭へ戻る」
     ヘッダーは少しでもスクロールしたら黒い背景。予約ボタンは最初の画面を少し過ぎたら出して、いちばん下まで出たままにする
     --------------------------------------------------------- */
  var bar = document.querySelector('[data-stick]'), totop = document.querySelector('[data-totop]'), header = document.querySelector('[data-header]');
  if (bar && totop) {
    var ticking = false;
    var update = function () {
      ticking = false;
      var h = window.innerHeight, y = window.pageYOffset;
      bar.classList.toggle('is-show', y > h * .6);
      if (header) header.classList.toggle('is-solid', y > 10);
      var up = y > h * 2;
      totop.classList.toggle('is-show', up);
      totop.tabIndex = up ? 0 : -1;
    };
    var request = function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
    window.addEventListener('scroll', request, { passive: true });
    window.addEventListener('resize', request);
    totop.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' }); });
    update();
  }
})();
