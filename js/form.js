/* =========================================================
   見学会予約フォーム（ポップアップ）
   LP量産キット（体験あり）のポップアップフォームを移植したもの。
   入力 → 確認 → 送信 → サンクス画面 まで、ページ内で完結する。

   ・href="#form" のリンク（予約ボタン）を押すとフォームが開く
   ・閉じるのは右上の×だけ（背景のタップ・Escでは閉じない＝誤って閉じないように）
   ・送信は見えない iframe に向けて https://pr-h.net/reserve-thanks/ へ POST
     （担当者へメールが届く）。送信の項目名は buildReservePayload() で
     予約システムの仕様に合わせて作る。★項目名は絶対に変えないこと

   ★公開したら必ず1件テスト送信して、担当者にメールが届くか確認する
     （画面に「ありがとうございます」が出ても、送信できたとは限らないため）
     テスト送信のときは、お名前「シートなし　テスト」、
     ご要望欄「フォームの動作確認テストです。ご対応は不要です。」と入れる
   ========================================================= */
(function () {
  'use strict';

  /* ---------------------------------------------------------
     ★ 設定（物件ごとに変わるところはここだけ）
     --------------------------------------------------------- */
  var SETTINGS = {
    // 予約システムの識別値：会社サイトの菊名モデルハウスのページ（pr-h.net/modelhouse/6058/）の番号
    id: '3564',
    // 自動返信メールに入るイベント名（会社サイトが id=3564 と一緒に送っている名前）
    freeContentsName: '横浜市港北区菊名（期間限定）',
    // 物件名・ご予約するイベント（フォームに表示）・流入元
    property: '菊名',
    event: '横浜市港北区菊名【期間限定】',
    from: 'instagram_kikuna',
    // アクセス解析（Googleタグマネージャー）用のLP名
    lpName: 'kikuna',
    // 見学会の最終日。決まっていなければ null（明日から12か月先まで選べる）
    // 例）EVENT_END: '2026-12-27'  → その日までしか選べず、注意書きも自動で出る
    EVENT_END: null,
    // 定休日（0=日 1=月 2=火 3=水 4=木 5=金 6=土）
    CLOSED_DAYS: [2, 3],
    // 受付時間（サンクス画面に表示）
    hours: '9:30-18:00'
  };

  var DAY_LABEL = ['日', '月', '火', '水', '木', '金', '土'];
  var TIMES = ['10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];
  var root = document.documentElement;

  /* ---------------------------------------------------------
     フォームのHTML（どのセクションのページからでも開けるよう、ここで作って差し込む）
     --------------------------------------------------------- */
  function attr(s) { return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;'); }

  function datePicker(n, label) {
    return '' +
      '<div class="form-group">' +
        '<label class="form-label" for="f-date' + n + '">' + label + '日 <span class="form-required">必須</span></label>' +
        '<div class="dp" data-input="f-date' + n + '">' +
          '<input type="text" id="f-date' + n + '" name="date' + n + '" class="form-input dp-input" readonly placeholder="日付を選択" autocomplete="off" required>' +
          '<div class="dp-panel" hidden>' +
            '<div class="dp-head">' +
              '<button type="button" class="dp-nav dp-prev" aria-label="前の月">&#8249;</button>' +
              '<span class="dp-title"></span>' +
              '<button type="button" class="dp-nav dp-next" aria-label="次の月">&#8250;</button>' +
            '</div>' +
            '<div class="dp-week"><span>日</span><span>月</span><span>火</span><span>水</span><span>木</span><span>金</span><span>土</span></div>' +
            '<div class="dp-grid"></div>' +
            '<p class="dp-note"><span class="dp-note-closed"></span><span class="dp-note-period" hidden></span></p>' +
          '</div>' +
        '</div>' +
      '</div>';
  }
  function timeSelect(n, label) {
    return '' +
      '<div class="form-group">' +
        '<label class="form-label" for="f-time' + n + '">' + label + '時間 <span class="form-required">必須</span></label>' +
        '<select id="f-time' + n + '" name="time' + n + '" class="form-select" required>' +
          '<option value="" disabled selected>時間を選択</option>' +
          TIMES.map(function (t) { return '<option value="' + t + '">' + t + '</option>'; }).join('') +
        '</select>' +
      '</div>';
  }

  var MARKUP = '' +
    '<div class="form-popup" id="formPopup" role="dialog" aria-modal="true" aria-labelledby="formPopupTitle">' +
      '<div class="form-popup__box">' +
        '<button class="form-popup__close" id="formPopupClose" type="button" aria-label="閉じる"></button>' +

        /* ステップ1：入力 */
        '<div class="form-popup__step is-active" id="formStepInput">' +
          '<h2 class="form-popup__title" id="formPopupTitle">見学会予約フォーム</h2>' +
          '<p class="form-popup__lead">ご入力いただいた内容を確認後、<br>担当スタッフより3営業日以内に<br>ご連絡いたします。</p>' +
          '<form class="reserve-form" id="reserveForm" novalidate>' +
            '<input type="hidden" name="property" value="' + attr(SETTINGS.property) + '">' +
            '<input type="hidden" name="from" value="' + attr(SETTINGS.from) + '">' +
            '<input type="hidden" name="id" value="' + attr(SETTINGS.id) + '">' +
            '<input type="hidden" name="free_contents_name" value="' + attr(SETTINGS.freeContentsName) + '">' +
            '<input type="hidden" name="event" value="' + attr(SETTINGS.event) + '">' +

            '<div class="form-group">' +
              '<p class="form-label">ご予約するイベント</p>' +
              '<p class="form-event">' + attr(SETTINGS.event) + '</p>' +
            '</div>' +

            '<hr class="form-divider">' +
            '<p class="form-heading">ご希望の見学日時</p>' +
            '<div class="form-row">' + datePicker(1, '第一希望') + timeSelect(1, '第一希望') + '</div>' +
            '<div class="form-row">' + datePicker(2, '第二希望') + timeSelect(2, '第二希望') + '</div>' +
            '<div class="form-notice">' +
              '<p>※翌日以降の日付をご指定ください<br>※当日のご予約は、お電話にてお申込み下さい<br><a href="tel:0120021541">0120-021-541</a></p>' +
              '<p class="form-notice__closed">※毎週' + SETTINGS.CLOSED_DAYS.map(function (n) { return DAY_LABEL[n]; }).join('・') + '曜日定休</p>' +
            '</div>' +

            '<hr class="form-divider">' +
            '<div class="form-row">' +
              '<div class="form-group">' +
                '<label class="form-label" for="f-lastname">姓 <span class="form-required">必須</span></label>' +
                '<input type="text" id="f-lastname" name="lastname" class="form-input" placeholder="例：家好" autocomplete="family-name" required>' +
              '</div>' +
              '<div class="form-group">' +
                '<label class="form-label" for="f-firstname">名 <span class="form-required">必須</span></label>' +
                '<input type="text" id="f-firstname" name="firstname" class="form-input" placeholder="例：太郎" autocomplete="given-name" required>' +
              '</div>' +
            '</div>' +
            '<div class="form-group">' +
              '<label class="form-label" for="f-furigana">ふりがな <span class="form-optional">任意</span></label>' +
              '<input type="text" id="f-furigana" name="furigana" class="form-input" placeholder="例：いえすき たろう">' +
            '</div>' +
            '<div class="form-group">' +
              '<label class="form-label" for="f-tel">電話番号 <span class="form-required">必須</span></label>' +
              '<input type="tel" id="f-tel" name="tel" class="form-input" placeholder="例：090-0000-0000" autocomplete="tel" required>' +
              '<p class="form-help">※市外局番からご入力ください</p>' +
            '</div>' +
            '<div class="form-group">' +
              '<label class="form-label" for="f-email">メールアドレス <span class="form-required">必須</span></label>' +
              '<input type="email" id="f-email" name="email" class="form-input" placeholder="例：example@email.com" autocomplete="email" required>' +
            '</div>' +
            '<div class="form-group">' +
              '<label class="form-label" for="f-email2">メールアドレス（確認用） <span class="form-required">必須</span></label>' +
              '<input type="email" id="f-email2" name="email_confirm" class="form-input" placeholder="もう一度ご入力ください" autocomplete="off" required>' +
            '</div>' +
            '<div class="form-group">' +
              '<label class="form-label" for="f-msg">その他のご質問・ご要望 <span class="form-optional">任意</span></label>' +
              '<textarea id="f-msg" name="message" class="form-textarea" rows="5" placeholder="ご不明な点やご要望があればお気軽にどうぞ。（例：お車でのアクセス確認、など）"></textarea>' +
            '</div>' +
            '<div class="form-notice">' +
              '<p>※ご予約確認後、3営業日以内に担当スタッフよりお電話またはメールにてご連絡いたします。</p>' +
            '</div>' +
            '<div class="form-agree">' +
              '<label class="form-check-label">' +
                '<input type="checkbox" id="f-agree" name="agree" class="form-check" required>' +
                '<span><a href="https://pr-h.net/privacypolicy/" target="_blank" rel="noopener">個人情報の取り扱い</a>に同意します</span>' +
              '</label>' +
            '</div>' +
            '<div class="form-submit-wrap">' +
              '<button type="submit" id="f-submit" class="cta-btn cta-btn--orange form-btn">確認画面へ進む</button>' +
              '<p class="form-submit-note">※見学・ご相談はすべて無料です</p>' +
            '</div>' +
          '</form>' +
        '</div>' +

        /* ステップ2：確認 */
        '<div class="form-popup__step" id="formStepConfirm">' +
          '<h2 class="form-popup__title">入力内容の確認</h2>' +
          '<p class="form-popup__lead">以下の内容でご予約を申し込みます。<br>内容をご確認の上、<br>「予約を申し込む」ボタンを押してください。</p>' +
          '<table class="popup-confirm-table" id="popupConfirmTable"></table>' +
          '<div class="popup-confirm-actions">' +
            '<button type="button" class="cta-btn cta-btn--orange form-btn is-ready" id="popupSubmitBtn">予約を申し込む</button>' +
            '<button type="button" class="popup-back-btn" id="popupBackBtn">&larr; 入力画面に戻る</button>' +
            '<p class="form-submit-note">※見学・ご相談はすべて無料です</p>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>' +

    /* サンクス画面（送信と同時に全画面で表示） */
    '<div class="thankyou-page" id="thankyouPage" role="dialog" aria-modal="true" aria-labelledby="thankyouTitle">' +
      '<div class="thankyou-content">' +
        '<div class="thankyou-icon"><svg viewBox="0 0 24 24" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg></div>' +
        '<h2 class="thankyou-title" id="thankyouTitle">ご予約<br>ありがとうございます</h2>' +
        '<p class="thankyou-body">お申し込み内容を確認後、<br>3営業日以内に担当スタッフより<br>お電話またはメールにてご連絡いたします。<br><span class="thankyou-note" id="thankyouClosedNote"></span></p>' +
        '<p class="thankyou-tel">お急ぎの方・当日のご予約はお電話ください<a href="tel:0120021541">0120-021-541</a><span>受付 ' + attr(SETTINGS.hours) + '</span></p>' +
        '<button type="button" class="thankyou-back" id="thankyouBack">トップページに戻る</button>' +
      '</div>' +
    '</div>' +

    /* 送信用の見えない iframe */
    '<iframe id="formSubmitFrame" name="formSubmitFrame" title="送信用" hidden aria-hidden="true"></iframe>';

  // ページに1つだけ差し込む（全セクションをつなげたページでも二重にならない）
  if (document.getElementById('formPopup')) return;
  var holder = document.createElement('div');
  holder.innerHTML = MARKUP;
  while (holder.firstChild) document.body.appendChild(holder.firstChild);

  var popup = document.getElementById('formPopup');
  var stepInput = document.getElementById('formStepInput');
  var stepConfirm = document.getElementById('formStepConfirm');
  var thanks = document.getElementById('thankyouPage');
  var form = document.getElementById('reserveForm');

  /* ---------------------------------------------------------
     開く・閉じる
     --------------------------------------------------------- */
  function openFormPopup() {
    stepInput.classList.add('is-active');
    stepConfirm.classList.remove('is-active');
    popup.classList.add('is-open');
    root.classList.add('is-modal-open');
    popup.scrollTop = 0;
  }
  function closeFormPopup() {
    popup.classList.remove('is-open');
    root.classList.remove('is-modal-open');
  }
  window.openFormPopup = openFormPopup;
  window.closeFormPopup = closeFormPopup;

  // href="#form" のリンク（予約ボタン）はすべてフォームを開く
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href="#form"]');
    if (!a) return;
    e.preventDefault();
    openFormPopup();
  });
  // URLに #form が付いた状態で開かれたら、そのままフォームを開く
  if (location.hash === '#form') openFormPopup();

  // 閉じるのは×だけ（背景のタップ・Escでは閉じない）
  document.getElementById('formPopupClose').addEventListener('click', closeFormPopup);
  popup.addEventListener('keydown', function (e) { if (e.key === 'Escape') e.preventDefault(); });

  // サンクス画面の「トップページに戻る」
  document.getElementById('thankyouBack').addEventListener('click', function () {
    thanks.classList.remove('is-active');
    root.classList.remove('is-modal-open');
    form.reset();
    updateBtn();
    window.scrollTo(0, 0);
  });

  /* ---------------------------------------------------------
     日付（明日〜最終日。定休日は選べない）
     --------------------------------------------------------- */
  var EVENT_END = SETTINGS.EVENT_END;
  var CLOSED_DAYS = SETTINGS.CLOSED_DAYS;

  function fmt(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  var tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  var minDate = fmt(tomorrow);
  var maxDate = EVENT_END;
  if (!maxDate) {
    var far = new Date();
    far.setMonth(far.getMonth() + 12);
    maxDate = fmt(far);
  }
  var d1 = document.getElementById('f-date1');
  var d2 = document.getElementById('f-date2');

  function isClosedDay(dateStr) {
    if (!dateStr) return false;
    var d = new Date(dateStr + 'T12:00:00');
    return CLOSED_DAYS.indexOf(d.getDay()) >= 0;
  }
  function closedDaysLabel() {
    return CLOSED_DAYS.map(function (n) { return DAY_LABEL[n] + '曜'; }).join('・');
  }

  // カレンダー（定休日・受付期間外は最初からグレーで押せない）
  (function () {
    function parse(s) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
    var MIN = parse(minDate), MAX = parse(maxDate);
    function isClosed(dt) { return CLOSED_DAYS.indexOf(dt.getDay()) >= 0; }
    function selectable(dt) { return dt >= MIN && dt <= MAX && !isClosed(dt); }

    // カレンダー下の注意書き（定休日／受付期間）を自動で作る
    var closedText = '※<b>' + closedDaysLabel() + 'は定休日</b>のためご予約いただけません';
    var periodText = '';
    if (EVENT_END) {
      var e = parse(EVENT_END);
      periodText = '<br>※見学会は<b>' + (e.getMonth() + 1) + '/' + e.getDate() + '(' + DAY_LABEL[e.getDay()] + ')まで</b>となります';
    }
    popup.querySelectorAll('.dp-note-closed').forEach(function (el) { el.innerHTML = closedText; });
    popup.querySelectorAll('.dp-note-period').forEach(function (el) {
      if (periodText) { el.innerHTML = periodText; el.hidden = false; }
    });

    popup.querySelectorAll('.dp').forEach(function (dp) {
      var input = document.getElementById(dp.getAttribute('data-input'));
      var panel = dp.querySelector('.dp-panel');
      var grid = dp.querySelector('.dp-grid');
      var title = dp.querySelector('.dp-title');
      var prev = dp.querySelector('.dp-prev');
      var next = dp.querySelector('.dp-next');
      if (!input || !panel) return;

      var view = new Date(MIN.getFullYear(), MIN.getMonth(), 1);

      function render() {
        var y = view.getFullYear(), m = view.getMonth();
        title.textContent = y + '年' + (m + 1) + '月';
        grid.innerHTML = '';
        var first = new Date(y, m, 1);
        var days = new Date(y, m + 1, 0).getDate();
        for (var i = 0; i < first.getDay(); i++) {
          var pad = document.createElement('span');
          pad.className = 'dp-day is-empty';
          grid.appendChild(pad);
        }
        for (var d = 1; d <= days; d++) {
          var dt = new Date(y, m, d);
          var btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'dp-day';
          btn.textContent = d;
          var val = fmt(dt);
          if (!selectable(dt)) {
            btn.disabled = true;
            btn.classList.add('is-off');
            btn.setAttribute('aria-disabled', 'true');
            btn.title = isClosed(dt) ? ('定休日（' + closedDaysLabel() + '）') : '受付期間外';
          } else {
            btn.setAttribute('data-date', val);
            if (input.value === val) btn.classList.add('is-selected');
          }
          grid.appendChild(btn);
        }
        prev.disabled = (new Date(y, m, 1) <= new Date(MIN.getFullYear(), MIN.getMonth(), 1));
        next.disabled = (new Date(y, m, 1) >= new Date(MAX.getFullYear(), MAX.getMonth(), 1));
      }
      function open() {
        if (input.value) {
          var sel = parse(input.value);
          if (!isNaN(sel)) view = new Date(sel.getFullYear(), sel.getMonth(), 1);
        }
        popup.querySelectorAll('.dp-panel').forEach(function (p) { if (p !== panel) p.hidden = true; });
        render();
        panel.hidden = false;
      }
      function close() { panel.hidden = true; }

      // タップ・クリックでは開閉、キーボード（Tab）で入ったときは開く
      // （タップすると focus → click の順に起きるので、focus で開いた直後に click で閉じないようにする）
      var byPointer = false;
      input.addEventListener('pointerdown', function () { byPointer = true; });
      input.addEventListener('focus', function () { if (!byPointer) open(); });
      input.addEventListener('click', function (e) {
        e.preventDefault();
        byPointer = false;
        panel.hidden ? open() : close();
      });
      input.addEventListener('keydown', function (e) { if (e.key !== 'Tab') e.preventDefault(); });
      prev.addEventListener('click', function () { view.setMonth(view.getMonth() - 1); render(); });
      next.addEventListener('click', function () { view.setMonth(view.getMonth() + 1); render(); });
      grid.addEventListener('click', function (e) {
        var btn = e.target.closest('.dp-day');
        if (!btn || btn.disabled || !btn.getAttribute('data-date')) return;
        input.value = btn.getAttribute('data-date');
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        close();
      });
      document.addEventListener('click', function (e) { if (!dp.contains(e.target)) close(); });
    });
  })();

  // サンクス画面の定休日の注記（CLOSED_DAYS から自動で作る）
  document.getElementById('thankyouClosedNote').textContent = '※' + closedDaysLabel() + 'は定休日となります';

  // 念のため（値が直接入った場合も定休日なら弾く）
  [d1, d2].forEach(function (inp) {
    inp.addEventListener('change', function () {
      if (isClosedDay(inp.value)) {
        alert(closedDaysLabel() + 'は定休日のためご予約いただけません。別の日付をお選びください。');
        inp.value = '';
        updateBtn();
      }
    });
  });

  /* ---------------------------------------------------------
     「確認画面へ進む」ボタン：必須項目と同意チェックがそろうと押せる
     --------------------------------------------------------- */
  var submitBtn = document.getElementById('f-submit');
  var requiredIds = ['f-date1', 'f-time1', 'f-date2', 'f-time2', 'f-lastname', 'f-firstname', 'f-tel', 'f-email', 'f-email2'];
  var agreeChk = document.getElementById('f-agree');

  function updateBtn() {
    var filled = requiredIds.every(function (id) {
      var el = document.getElementById(id);
      return el && el.value.trim() !== '';
    });
    submitBtn.classList.toggle('is-ready', filled && agreeChk.checked);
  }
  requiredIds.forEach(function (id) {
    var el = document.getElementById(id);
    el.addEventListener('input', updateBtn);
    el.addEventListener('change', updateBtn);
  });
  agreeChk.addEventListener('change', updateBtn);
  updateBtn();

  /* ---------------------------------------------------------
     入力 → 確認画面
     --------------------------------------------------------- */
  var confirmTable = document.getElementById('popupConfirmTable');

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    if (isClosedDay(d1.value)) {
      alert('第一希望日が定休日です。別の日付をお選びください。');
      d1.value = '';
      updateBtn();
      return;
    }
    var email = document.getElementById('f-email').value.trim();
    var email2 = document.getElementById('f-email2').value.trim();
    if (email !== email2) {
      alert('メールアドレスが一致していません。ご確認ください。');
      document.getElementById('f-email2').focus();
      return;
    }
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    var data = {};
    new FormData(form).forEach(function (v, k) { if (v) data[k] = v; });

    var fields = [
      { key: 'event',     label: 'ご予約イベント' },
      { key: 'date1',     label: '第一希望日' },
      { key: 'time1',     label: '第一希望時間' },
      { key: 'date2',     label: '第二希望日',     optional: true },
      { key: 'time2',     label: '第二希望時間',   optional: true },
      { key: 'lastname',  label: '姓' },
      { key: 'firstname', label: '名' },
      { key: 'furigana',  label: 'ふりがな',       optional: true },
      { key: 'tel',       label: '電話番号' },
      { key: 'email',     label: 'メールアドレス' },
      { key: 'message',   label: 'ご質問・ご要望', optional: true }
    ];
    var html = '';
    fields.forEach(function (f) {
      var val = data[f.key] || '';
      if (!val && f.optional) return;
      html += '<tr><th>' + escHtml(f.label) + '</th><td>' + escHtml(val) + '</td></tr>';
    });
    confirmTable.innerHTML = html;

    stepInput.classList.remove('is-active');
    stepConfirm.classList.add('is-active');
    popup.scrollTop = 0;
    popup._formData = data;
  });

  // 入力画面に戻る
  document.getElementById('popupBackBtn').addEventListener('click', function () {
    stepConfirm.classList.remove('is-active');
    stepInput.classList.add('is-active');
    popup.scrollTop = 0;
  });

  /* ---------------------------------------------------------
     送信（見えない iframe に向けて POST）→ サンクス画面
     --------------------------------------------------------- */
  document.getElementById('popupSubmitBtn').addEventListener('click', function () {
    var data = popup._formData;
    if (!data) return;

    // 確認用ページ（window.LP_PREVIEW = true）では送信しない。サンクス画面だけ表示する
    if (window.LP_PREVIEW) {
      document.getElementById('thankyouClosedNote').textContent =
        '※確認用のページのため、実際には送信されていません';
    } else {
      var payload = buildReservePayload(data);
      var tempForm = document.createElement('form');
      tempForm.method = 'POST';
      tempForm.action = 'https://pr-h.net/reserve-thanks/';
      tempForm.target = 'formSubmitFrame';
      tempForm.style.display = 'none';
      Object.keys(payload).forEach(function (k) {
        var inp = document.createElement('input');
        inp.type = 'hidden';
        inp.name = k;
        inp.value = payload[k];
        tempForm.appendChild(inp);
      });
      document.body.appendChild(tempForm);
      tempForm.submit();
      document.body.removeChild(tempForm);

      // Googleタグマネージャー用
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ 'event': 'form_submit', 'lpName': SETTINGS.lpName });
    }

    popup.classList.remove('is-open');
    thanks.classList.add('is-active');
    root.classList.add('is-modal-open');
    thanks.scrollTop = 0;
  });

  /* ---------------------------------------------------------
     ★ 予約システム用の送信データ（LP量産キットのまま。変更しないこと）
     pr-h.net の予約システム(/reserve-thanks/)が要求する項目名に変換する。
     ここを変えると担当者へのメールが正しく届かなくなる。
     --------------------------------------------------------- */
  function buildReservePayload(d){
    // 電話番号を3分割（090-1234-5678 / 09012345678 の双方に対応）
    var t1='', t2='', t3='';
    var raw = (d.tel || '').trim();
    var m = raw.match(/^(\d{2,4})[-‐－ー\s]+(\d{1,4})[-‐－ー\s]+(\d{3,4})$/);
    if(m){
      t1 = m[1]; t2 = m[2]; t3 = m[3];
    } else {
      var n = raw.replace(/[^0-9]/g, '');
      if(/^(070|080|090|050)/.test(n) && n.length >= 11){
        t1 = n.slice(0,3); t2 = n.slice(3,7); t3 = n.slice(7,11);
      } else if(n.length === 10){
        t1 = n.slice(0,3); t2 = n.slice(3,6); t3 = n.slice(6,10);
      } else if(n.length > 6){
        t1 = n.slice(0,3); t2 = n.slice(3,7); t3 = n.slice(7);
      } else {
        t1 = n;
      }
    }

    // ふりがなを姓／名に分割（空白区切り。区切りが無ければ姓へ）
    var kana = (d.furigana || '').trim().split(/[\s　]+/).filter(Boolean);
    var k1 = kana[0] || '';
    var k2 = kana.slice(1).join(' ');

    // 送信日時（yyyymmddhhmmss）
    var now = new Date();
    var p2 = function(v){ return String(v).padStart(2,'0'); };
    var stamp = now.getFullYear() + p2(now.getMonth()+1) + p2(now.getDate())
              + p2(now.getHours()) + p2(now.getMinutes()) + p2(now.getSeconds());

    var out = {
      // 予約システム識別値（フォームのhiddenから引き継ぐ）
      id:                 d.id || '',
      free_contents_name: d.free_contents_name || '',
      property:           d.property || '',
      event:              d.event || '',
      from:               d.from || '',
      input_datetime:     stamp,
      // 予約内容
      hope1_day:  d.date1 || '',
      hope1_time: d.time1 || '',
      hope2_day:  d.date2 || '',
      hope2_time: d.time2 || '',
      name1: d.lastname  || '',
      name2: d.firstname || '',
      kana1: k1,
      kana2: k2,
      tel1: t1, tel2: t2, tel3: t3,
      email:         d.email || '',
      email_confirm: d.email_confirm || d.email || '',
      message: d.message || ''
    };

    // 空の項目は送信しない
    Object.keys(out).forEach(function(k){ if(!out[k]) delete out[k]; });
    return out;
  }

  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
})();
