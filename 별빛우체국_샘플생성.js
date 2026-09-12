// 별빛 우체국 — 발표 영상용 샘플 프로젝트 (영상 목표) 생성 스크립트
// isisko20.github.io/bearip 배포가 끝난 뒤에만 정상 동작합니다 (전문가 검토
// 시스템이 반영된 버전이 필요해요).
// 사용법:
//   1) https://isisko20.github.io/bearip/ 아무 페이지나 열기
//   2) F12 -> Console 탭
//   3) 이 파일 내용 전체를 복사해서 붙여넣고 Enter
//   4) 완료 알림 후 자동으로 MY DNA로 이동합니다.
(function () {
  if (typeof bearipAddIP !== 'function' || typeof bearipBuildRoadmap !== 'function') {
    alert('이 스크립트는 isisko20.github.io/bearip 사이트에서만 동작해요.');
    return;
  }
  if (typeof bearipAddIpReview !== 'function') {
    alert('이 사이트에는 아직 전문가 검토 기능이 반영되지 않았어요. 잠시 후 다시 시도해주세요.');
    return;
  }

  bearipSetUser({ nickname: '모루', bio: '' });
  bearipAddCredits(100);

  const roadmap = bearipBuildRoadmap('video', null);
  const byKey = (key) => roadmap.find((s) => s.key === key);
  const nowIso = new Date().toISOString();

  function setStep(key, patch) {
    const step = byKey(key);
    if (!step) return;
    Object.assign(step, {
      submission: null,
      reviewStatus: null,
      adminProgress: null,
      adminComment: null,
      needsRevision: false,
      adminReviewedAt: null,
      mode: 'self',
    }, patch);
  }

  // 시나리오 — 준비 완료
  setStep('story', {
    submission: { note: '오프닝부터 결말까지 정리한 30분 분량 시나리오', imageData: null, fileName: null, fileSize: null, mime: null },
    reviewStatus: 'reviewed',
    adminProgress: 80,
    adminComment: '기승전결이 탄탄해요. 바로 촬영 들어가도 좋겠어요.',
    needsRevision: false,
    adminReviewedAt: nowIso,
  });

  // 캐릭터/컨셉 디자인 — 보완 필요
  setStep('character', {
    submission: { note: '주인공 우체부 캐릭터 설정 및 러프 스케치', imageData: null, fileName: null, fileSize: null, mime: null },
    reviewStatus: 'reviewed',
    adminProgress: 36,
    adminComment: '기본 설정은 좋은데, 표정과 의상 배리에이션이 더 필요해요.',
    needsRevision: true,
    adminReviewedAt: nowIso,
  });

  // 스토리보드 — 검토 중 (아직 담당 매니저가 확인 전)
  setStep('storyboard', {
    submission: { note: '주요 장면 8컷 스토리보드 초안', imageData: null, fileName: null, fileSize: null, mime: null },
    reviewStatus: 'requested',
  });

  // 촬영/제작, 편집/사운드 — 미등록 (그대로 둠)

  // 업로드/공개 — 작성 중 (자료는 있지만 아직 검토 요청 전)
  setStep('upload', {
    submission: { note: '업로드 채널 및 공개 일정 초안', imageData: null, fileName: null, fileSize: null, mime: null },
  });

  const filledCount = roadmap.filter((s) => !!s.submission).length;
  const reviewedSteps = roadmap.filter((s) => s.reviewStatus === 'reviewed' && s.adminProgress != null);
  const readinessScore = reviewedSteps.length
    ? Math.round(reviewedSteps.reduce((sum, s) => sum + s.adminProgress, 0) / reviewedSteps.length)
    : 0;

  const ip = {
    id: 'ip_' + Date.now(),
    title: '별빛 우체국',
    goal: 'video',
    genres: ['드라마', '판타지'],
    logline: '사라진 편지들이 도착하는 곳, 별빛 우체국.',
    synopsis: '마감 직전의 우체국에 매일 밤 도착하지 못한 편지들이 흘러든다. 신입 우체부는 그 편지들을 진짜 주인에게 전해주며, 편지에 얽힌 사람들의 사연을 하나씩 풀어간다.',
    coverImage: undefined,
    visibility: 'public',
    createdAt: new Date().toISOString(),
    dnaScore: roadmap.length ? Math.round((filledCount / roadmap.length) * 100) : 0,
    dnaBreakdown: { concept: 0, world: 0, character: 0, story: 0, visual: 0, assets: 0 },
    readinessScore,
    productionProgress: null,
    overallReviewComment: '캐릭터 디자인에 보완 의견이 도착했어요. 표정과 의상 배리에이션을 조금 더 준비해주세요. 스토리보드는 아직 검토 중이에요.',
    roadmap,
    assets: [],
    discussion: [],
    views: 0,
    likes: 0,
  };
  bearipAddIP(ip);

  // 시나리오/캐릭터는 이미 심사까지 끝난 상태로 바로 심사 이력에 등록,
  // 스토리보드는 검토 대기 상태로 등록 — ip-reviews.html에서 그대로 보여요.
  bearipAddIpReview({
    id: 'ipreview_' + Date.now() + '_1',
    ipId: ip.id,
    ipTitle: ip.title,
    stepKey: 'story',
    stepLabel: '시나리오',
    submission: byKey('story').submission,
    requestedAt: nowIso,
    status: 'reviewed',
    adminProgress: 80,
    adminComment: '기승전결이 탄탄해요. 바로 촬영 들어가도 좋겠어요.',
    needsRevision: false,
    reviewedAt: nowIso,
  });
  bearipAddIpReview({
    id: 'ipreview_' + Date.now() + '_2',
    ipId: ip.id,
    ipTitle: ip.title,
    stepKey: 'character',
    stepLabel: '캐릭터/ 컨셉 디자인',
    submission: byKey('character').submission,
    requestedAt: nowIso,
    status: 'reviewed',
    adminProgress: 36,
    adminComment: '기본 설정은 좋은데, 표정과 의상 배리에이션이 더 필요해요.',
    needsRevision: true,
    reviewedAt: nowIso,
  });
  bearipAddIpReview({
    id: 'ipreview_' + Date.now() + '_3',
    ipId: ip.id,
    ipTitle: ip.title,
    stepKey: 'storyboard',
    stepLabel: '스토리보드',
    submission: byKey('storyboard').submission,
    requestedAt: nowIso,
    status: 'pending',
    adminProgress: null,
    adminComment: null,
    needsRevision: false,
    reviewedAt: null,
  });

  bearipAddNotification({
    type: 'ip',
    title: '전문가 검토 결과가 도착했어요',
    message: `'${ip.title}'의 '캐릭터/ 컨셉 디자인' 항목이 36%로 진단됐어요. 보완이 필요해요. "기본 설정은 좋은데, 표정과 의상 배리에이션이 더 필요해요."`,
    link: 'my-dna.html',
  });

  alert('별빛 우체국 샘플 프로젝트를 만들었어요! MY DNA로 이동할게요.');
  window.location.href = 'https://isisko20.github.io/bearip/my-dna.html';
})();
