/* =========================================================
   7. プリンシパルホームについて
   ========================================================= */
(function () {
  'use strict';

  /* ---------------------------------------------------------
     施工事例のポップアップ
     - [data-modal-open="id"] をタップすると <dialog id="id"> を開く
     - ×ボタン・背景のタップ・Escキーで閉じる
     - 開くたびに写真は1枚目から表示する
     --------------------------------------------------------- */
  var root = document.documentElement;

  document.querySelectorAll('[data-modal-open]').forEach(function (btn) {
    var modal = document.getElementById(btn.dataset.modalOpen);
    if (!modal || typeof modal.showModal !== 'function') return;

    btn.addEventListener('click', function () {
      modal.showModal();
      root.classList.add('is-modal-open');
      var slider = modal.querySelector('[data-slider]');
      if (slider && slider.sliderGoTo) slider.sliderGoTo(0, false);
    });
  });

  document.querySelectorAll('.work-modal').forEach(function (modal) {
    modal.querySelectorAll('[data-modal-close]').forEach(function (b) {
      b.addEventListener('click', function () { modal.close(); });
    });
    // パネルの外側（暗い背景）をタップしたら閉じる
    modal.addEventListener('click', function (e) {
      if (e.target === modal) modal.close();
    });
    modal.addEventListener('close', function () {
      root.classList.remove('is-modal-open');
    });
  });
})();
