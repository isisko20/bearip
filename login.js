// 로그인 = 닉네임 + PIN, 확인은 서버가 해요 (storage.js의 서버 로그인 함수들 참고).
// 이미 잠긴(PIN이 정해진) 닉네임은 PIN을 맞춰야 들어오고, 처음 쓰는 닉네임은 PIN을 두 번
// 입력받아 그 PIN으로 잠가요. 서버에 닿지 못하면 로그인시키지 않아요 — 실패를 "계정 없음"으로
// 착각해서 남의 닉네임을 새로 잠그는 일이 없도록 안전한 쪽으로 막아요.
document.addEventListener('DOMContentLoaded', () => {
  const existing = bearipGetUser();
  if (existing) {
    document.getElementById('lgNickname').value = existing.nickname || '';
    document.getElementById('lgBio').value = existing.bio || '';
  }

  const nicknameInput = document.getElementById('lgNickname');
  const pinInput = document.getElementById('lgPin');
  const confirmField = document.getElementById('lgPinConfirmField');
  const confirmInput = document.getElementById('lgPinConfirm');
  const submitBtn = document.getElementById('lgSubmitBtn');
  const nicknameError = document.getElementById('lgNicknameError');
  const pinError = document.getElementById('lgPinError');
  const confirmError = document.getElementById('lgPinConfirmError');

  function showError(el, input, message) {
    if (message) el.textContent = message;
    el.classList.add('show');
    input.classList.add('error-field');
  }
  function clearErrors() {
    [nicknameError, pinError, confirmError].forEach((el) => el.classList.remove('show'));
    [nicknameInput, pinInput, confirmInput].forEach((el) => el.classList.remove('error-field'));
  }
  // 닉네임을 바꾸면 "처음 쓰는 닉네임" 확인 단계도 처음부터 다시 해요.
  function resetConfirmStep() {
    confirmField.style.display = 'none';
    confirmInput.value = '';
    submitBtn.textContent = '시작하기';
  }
  nicknameInput.addEventListener('input', resetConfirmStep);

  async function submit() {
    clearErrors();
    const nickname = nicknameInput.value.trim();
    const pin = pinInput.value;

    if (!nickname) {
      showError(nicknameError, nicknameInput);
      nicknameInput.focus();
      return;
    }
    if (pin.length < BEARIP_PIN_MIN_LENGTH) {
      showError(pinError, pinInput, `PIN은 ${BEARIP_PIN_MIN_LENGTH}자 이상 입력해주세요.`);
      pinInput.focus();
      return;
    }

    submitBtn.disabled = true;
    const label = submitBtn.textContent;
    submitBtn.textContent = '확인 중...';
    try {
      const exists = await bearipAuthExists(nickname);

      if (exists) {
        // 서버가 PIN을 확인하고, 맞으면 이 닉네임 본인이라는 증표로 로그인시켜요.
        await bearipAuthSignIn('login', nickname, pin);
      } else if (confirmField.style.display === 'none') {
        // 처음 쓰는 닉네임 — 오타로 스스로 잠기지 않게 한 번 더 확인받아요.
        confirmField.style.display = '';
        showError(confirmError, confirmInput, '처음 쓰는 닉네임이에요. 이 PIN으로 잠그려면 한 번 더 입력해주세요.');
        confirmInput.focus();
        submitBtn.textContent = 'PIN 설정하고 시작하기';
        return;
      } else {
        if (confirmInput.value !== pin) {
          showError(confirmError, confirmInput, 'PIN이 서로 달라요. 다시 입력해주세요.');
          confirmInput.focus();
          return;
        }
        try {
          await bearipAuthSignIn('register', nickname, pin);
        } catch (e) {
          if (e.code === 'nickname_taken') {
            // 그 사이 다른 사람이 먼저 잠갔어요 — 확인 단계를 닫고 처음부터.
            resetConfirmStep();
            showError(nicknameError, nicknameInput, '방금 다른 분이 이 닉네임을 사용했어요. 다른 닉네임을 써주세요.');
            return;
          }
          throw e;
        }
      }
    } catch (e) {
      if (e.code === 'bad_pin') {
        showError(pinError, pinInput, 'PIN이 맞지 않아요. 이미 다른 분이 쓰고 있는 닉네임일 수 있어요.');
        pinInput.focus();
      } else if (e.code === 'nickname_taken') {
        showError(nicknameError, nicknameInput, e.message);
      } else {
        // 잠금(locked), 서버 연결 실패 등 서버가 준 안내를 그대로 보여줘요.
        showError(pinError, pinInput, e.message || '서버에 연결하지 못했어요. 잠시 후 다시 시도해주세요.');
      }
      return;
    } finally {
      submitBtn.disabled = false;
      if (submitBtn.textContent === '확인 중...') submitBtn.textContent = label;
    }

    const isFirstSignup = !existing;
    const bio = document.getElementById('lgBio').value.trim();
    bearipSetUser({
      nickname,
      bio,
      // 다른 닉네임으로 다시 로그인하는 경우 이전 계정의 가입일을 물려받지 않아요.
      joinedAt: existing && existing.nickname === nickname ? existing.joinedAt : new Date().toISOString(),
      pinVerified: true,
    });

    const next = sessionStorage.getItem('bearip_login_next');
    sessionStorage.removeItem('bearip_login_next');
    // Only allow relative same-site targets — never follow an absolute/external URL.
    const safeNext = next && !/^https?:\/\//i.test(next) ? next : 'profile.html';

    // First-ever signup on this browser gets offered a quick guided tour
    // (tour.js) instead of going straight where they were headed — the tour
    // currently lives entirely on create.html, so that's where this sends
    // them; a returning login (or a skip) goes to safeNext as before.
    if (isFirstSignup) {
      sessionStorage.setItem('bearip_tour_offer', '1');
      location.href = 'create.html';
    } else {
      location.href = safeNext;
    }
  }

  submitBtn.addEventListener('click', submit);
  [nicknameInput, pinInput, confirmInput].forEach((el) =>
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submit();
    })
  );
});
