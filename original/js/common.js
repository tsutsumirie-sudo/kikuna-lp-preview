/* =========================================================
   菊名 完成見学会 LP 共通
   ========================================================= */
(function () {
  'use strict';

  /* ---------------------------------------------------------
     1. 手動スライダー（写真を横にスワイプ／左右ボタンで切り替え）
     - [data-slider]       … 全体（data-start で最初に表示する枚目を指定）
     - [data-slider-track] … 横スクロールする部分（CSS の scroll-snap）
     - [data-slider-prev] / [data-slider-next] … 左右ボタン
     端まで行ったら反対側へ戻る。
     ポップアップを開いたときなどに、el.sliderGoTo(番号, アニメするか) で移動できる。
     --------------------------------------------------------- */
  document.querySelectorAll('[data-slider]').forEach(function (slider) {
    var track = slider.querySelector('[data-slider-track]');
    if (!track) return;
    var count = track.children.length;
    var index = Math.min(Math.max((parseInt(slider.dataset.start, 10) || 1) - 1, 0), count - 1);

    function goTo(i, smooth) {
      index = (i + count) % count;
      track.scrollTo({ left: track.clientWidth * index, behavior: smooth ? 'smooth' : 'auto' });
    }
    slider.sliderGoTo = goTo;

    // 最初の表示位置（アニメーションなしで移動）
    goTo(index, false);

    track.addEventListener('scroll', function () {
      if (track.clientWidth) index = Math.round(track.scrollLeft / track.clientWidth);
    }, { passive: true });

    var prev = slider.querySelector('[data-slider-prev]');
    var next = slider.querySelector('[data-slider-next]');
    if (prev) prev.addEventListener('click', function () { goTo(index - 1, true); });
    if (next) next.addEventListener('click', function () { goTo(index + 1, true); });

    // 画面幅が変わっても同じ写真を表示し続ける
    window.addEventListener('resize', function () { goTo(index, false); });
  });

  /* ---------------------------------------------------------
     ふわふわ浮いている予約ボタン：×を押すと消える
     --------------------------------------------------------- */
  document.querySelectorAll('[data-float-cta]').forEach(function (box) {
    var close = box.querySelector('[data-float-cta-close]');
    if (close) close.addEventListener('click', function () {
      box.classList.add('is-closed');
      armStickyCta();
    });
  });

  /* ---------------------------------------------------------
     画面下に追従する予約ボタン：ふわふわボタンを×で閉じたあと、
     そこから1画面ぶんくらいスクロールすると下から出てくる（出たあとはずっと表示）
     --------------------------------------------------------- */
  var stickyCta = document.querySelector('[data-sticky-cta]');

  function armStickyCta() {
    if (!stickyCta) return;
    var startY = window.scrollY;
    function check() {
      if (Math.abs(window.scrollY - startY) < window.innerHeight) return;
      stickyCta.classList.add('is-shown');
      stickyCta.removeAttribute('aria-hidden');
      stickyCta.removeAttribute('tabindex');
      document.body.classList.add('has-sticky-cta');   // いちばん下のフッターが隠れないよう、ボタンの高さぶん余白を足す
      window.removeEventListener('scroll', check);
    }
    window.addEventListener('scroll', check, { passive: true });
  }

  /* ---------------------------------------------------------
     TOPへ戻る：1画面ぶんスクロールすると右下に出る（LP量産キットと同じ）
     --------------------------------------------------------- */
  var backTop = document.querySelector('[data-back-top]');
  if (backTop) {
    var toggleBackTop = function () {
      backTop.classList.toggle('is-visible', window.scrollY > window.innerHeight);
    };
    window.addEventListener('scroll', toggleBackTop, { passive: true });
    toggleBackTop();
    backTop.addEventListener('click', function () {
      var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    });
  }

  /* ---------------------------------------------------------
     写真の拡大表示（#photoModal）
     1 の自動スクロール写真（js/01_firstview.js）と 3・5 の小さい写真で共通。
     photoModal.openPhoto(img, { large, alt, caption }) で開く。
     - img     … タップした写真（縦横比と、大きい画像を読み込むまでの仮の画像に使う）
     - large   … 拡大用の大きい画像（読み込めたら差し替える）
     - caption … 写真の下に出す説明文（無ければ出さない）。
                 行の配列で渡すと、行の切れ目でだけ折り返す（1行に入る分はつなげて表示）
     写真以外（背景・×ボタン）をタップしたら閉じる。Escキーでも閉じる
     --------------------------------------------------------- */
  var photoModal = document.getElementById('photoModal');

  if (photoModal && typeof photoModal.showModal === 'function') {
    var pmInner = photoModal.querySelector('.photo-modal__inner');
    var pmImg = photoModal.querySelector('.photo-modal__img');
    var pmCaption = photoModal.querySelector('.photo-modal__caption');
    var pmLoading = null;
    var pmW = 0, pmH = 0;   // 写真の縦横比

    // 画面に収まるいちばん大きいサイズにする（小さい画像→大きい画像に替わっても大きさが変わらないよう、先に決める）
    var fitPhoto = function () {
      if (!photoModal.open || !pmW) return;
      var cs = getComputedStyle(pmInner);
      var w = pmInner.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      var h = pmInner.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
      if (!pmCaption.hidden) h -= pmCaption.offsetHeight + parseFloat(getComputedStyle(pmCaption).marginTop);
      var scale = Math.min(w / pmW, h / pmH);
      pmImg.style.width = Math.floor(pmW * scale) + 'px';
      pmImg.style.height = Math.floor(pmH * scale) + 'px';
    };
    window.addEventListener('resize', fitPhoto);

    photoModal.openPhoto = function (img, opt) {
      opt = opt || {};
      var large = opt.large;
      pmImg.src = img.currentSrc || img.src;
      pmImg.alt = opt.alt != null ? opt.alt : img.alt;
      var cap = opt.caption;
      pmCaption.textContent = '';
      if (Array.isArray(cap)) {
        cap.forEach(function (line) {
          var span = document.createElement('span');
          span.textContent = line;
          pmCaption.appendChild(span);
        });
      } else {
        pmCaption.textContent = cap || '';
      }
      pmCaption.hidden = !pmCaption.textContent;
      pmLoading = null;
      if (large) {
        pmLoading = new Image();
        pmLoading.onload = function () { if (this === pmLoading && photoModal.open) pmImg.src = large; };
        pmLoading.src = large;
      }
      pmW = img.naturalWidth || +img.getAttribute('width');
      pmH = img.naturalHeight || +img.getAttribute('height');

      photoModal.showModal();
      document.documentElement.classList.add('is-modal-open');
      fitPhoto();
    };

    photoModal.addEventListener('click', function (e) {
      if (e.target !== pmImg) photoModal.close();
    });
    photoModal.addEventListener('close', function () {
      document.documentElement.classList.remove('is-modal-open');
      pmLoading = null;
    });

    // 3・5 の小さい写真：タップで拡大（説明文は写真の横・下にあるものを、その改行の位置で区切って使う）
    document.querySelectorAll('.pop__btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var note = btn.closest('.js-pop') && btn.closest('.js-pop').querySelector('.pop__note');
        var lines = [''];
        if (note) note.childNodes.forEach(function (n) {
          if (n.nodeName === 'BR') lines.push('');
          else lines[lines.length - 1] += n.textContent.trim();
        });
        photoModal.openPhoto(btn.querySelector('img'), {
          large: btn.dataset.zoom,
          caption: lines.filter(Boolean)
        });
      });
    });
  }

  /* ---------------------------------------------------------
     2. 小さい写真：本来の位置が画面の下から23%のところまで来たら登場
     （.js-pop に is-show を付けると、CSS で回転しながら表示される）
     --------------------------------------------------------- */
  var pops = document.querySelectorAll('.js-pop');

  if (!('IntersectionObserver' in window)) {
    pops.forEach(function (el) { el.classList.add('is-show'); });
    return;
  }

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-show');
        observer.unobserve(entry.target);
      }
    });
  }, { rootMargin: '0px 0px -23% 0px', threshold: 0 });

  pops.forEach(function (el) { observer.observe(el); });
})();
