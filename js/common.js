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
    if (close) close.addEventListener('click', function () { box.classList.add('is-closed'); });
  });

  /* ---------------------------------------------------------
     2. 小さい写真：本来の位置が画面の下から20%のところまで来たら登場
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
  }, { rootMargin: '0px 0px -20% 0px', threshold: 0 });

  pops.forEach(function (el) { observer.observe(el); });
})();
