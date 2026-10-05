/* =========================================================
   3. 物件の特徴
   ========================================================= */
(function () {
  'use strict';

  /* ---------------------------------------------------------
     間取り図：タップで拡大表示
     （<dialog> 非対応のブラウザでは、リンク先の画像がそのまま開く）
     --------------------------------------------------------- */
  var modal = document.getElementById('planModal');

  if (modal && typeof modal.showModal === 'function') {
    var modalImg = modal.querySelector('.plan-modal__img');
    var modalFloor = modal.querySelector('.plan-modal__floor');
    var root = document.documentElement;

    document.querySelectorAll('.plan__btn').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        modalImg.src = btn.getAttribute('href');
        modalImg.alt = btn.querySelector('img').alt;
        modalFloor.textContent = btn.dataset.planLabel;
        modal.showModal();
        root.classList.add('is-modal-open');
      });
    });

    // 図面以外（背景・×ボタン）をタップしたら閉じる。Escキーでも閉じる
    modal.addEventListener('click', function (e) {
      if (e.target !== modalImg) modal.close();
    });
    modal.addEventListener('close', function () {
      root.classList.remove('is-modal-open');
    });
  }

})();
