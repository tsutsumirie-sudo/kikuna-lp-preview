/* 菊名LP（ラグジュアリー版）
   FVの写真は、表示される前（透明のあいだ）にブラウザが画像の展開を後回しにすることがあり、
   切り替わりの瞬間に一瞬暗くなるのを防ぐため、読み込み後に4枚とも先に展開しておく */
(function () {
  'use strict';
  function decodeSlides() {
    document.querySelectorAll('.fv__slide img').forEach(function (img) {
      if (img.decode) img.decode().catch(function () {});
    });
  }
  if (document.readyState === 'complete') decodeSlides();
  else window.addEventListener('load', decodeSlides);
})();
