// "회차 관리" — MY DNA tab for the real episodes readers actually see (IP
// 상세의 회차 목록, Content Room). Separate from the roadmap's own
// "업로드/연재" step, which turned out to mean "prove you published
// elsewhere" (see its hint text in storage.js), not host the content itself.
// Episodes live on the IP object (currentIP.episodes) — bearipUpdateIP
// already re-syncs the full IP to publicIPs/allIPs on every save, so a
// published IP's episodes reach readers on other devices without a separate
// collection for the content. Likes/comments DO need one (storage.js's
// episodeLikes/episodeComments) since a reader has no local copy of this IP
// to write onto.

const MD_EPISODE_THUMBS = ['thumb-1', 'thumb-2', 'thumb-3', 'thumb-4', 'thumb-5', 'thumb-6', 'thumb-7', 'thumb-8'];

function mdEpisodeCardHtml(ep, index) {
  const esc = bearipEscapeHtml;
  const likeCount = typeof bearipEpisodeLikeCount === 'function' ? bearipEpisodeLikeCount(currentIP.id, ep.id) : 0;
  const commentCount = typeof bearipGetEpisodeComments === 'function' ? bearipGetEpisodeComments(currentIP.id, ep.id).length : 0;
  const thumbStyle = ep.imageData ? ` style="background-image:url('${ep.imageData}')"` : '';
  const thumbClass = ep.imageData ? '' : MD_EPISODE_THUMBS[index % MD_EPISODE_THUMBS.length];
  const preview = (ep.body || ep.note || '').slice(0, 60);
  return `
    <div class="md-episode-card" data-episode-id="${esc(ep.id)}">
      <div class="md-episode-thumb ${thumbClass}"${thumbStyle}></div>
      <div class="md-episode-info">
        <div class="md-episode-title">${esc(ep.title || '제목 없음')}</div>
        ${preview ? `<div class="md-episode-preview">${esc(preview)}</div>` : ''}
        <div class="md-episode-meta">${mdFormatRelativeTime(ep.createdAt)} · 좋아요 ${likeCount} · 댓글 ${commentCount}</div>
      </div>
      <div class="md-episode-actions">
        <button type="button" class="md-episode-edit-btn" data-episode-id="${esc(ep.id)}">수정</button>
        <button type="button" class="md-episode-delete-btn" data-episode-id="${esc(ep.id)}">삭제</button>
      </div>
    </div>
  `;
}

function mdRenderEpisodes() {
  const list = document.getElementById('mdEpisodeList');
  if (!list || typeof currentIP === 'undefined' || !currentIP) return;
  const episodes = currentIP.episodes || [];
  list.innerHTML = episodes.length
    ? episodes.map(mdEpisodeCardHtml).join('')
    : '<div class="md-episode-empty">아직 등록된 회차가 없어요. "+ 새 회차 올리기"로 첫 화를 올려보세요.</div>';

  const hint = document.getElementById('mdEpisodeVisHint');
  if (hint) hint.style.display = currentIP.visibility === 'public' ? 'none' : 'block';
}

// ---- Editor overlay (add/edit) ----
let mdEpisodeEditId = null; // null = creating a new episode
let mdEpisodeWorking = null;

function mdEnsureEpisodeEditorOverlay() {
  let overlay = document.getElementById('mdEpisodeEditorOverlay');
  if (overlay) return overlay;

  overlay = document.createElement('div');
  overlay.className = 'md-road-edit-overlay';
  overlay.id = 'mdEpisodeEditorOverlay';
  overlay.style.display = 'none';
  overlay.innerHTML = `
    <div class="md-road-edit-box md-episode-editor-box">
      <div class="md-road-edit-head">
        <span id="mdEpisodeEditorHeadTitle">새 회차 올리기</span>
        <button type="button" class="md-road-edit-close" id="mdEpisodeEditorClose">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
        </button>
      </div>
      <input type="text" id="mdEpisodeTitleInput" class="md-episode-title-input" placeholder="예: 1화 - 시작" maxlength="60">
      <div class="md-episode-upload" id="mdEpisodeUploadZone">
        <input type="file" style="display:none" accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.mp3,.wav,.mp4,.mov,.webm">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="14" rx="2"/><path d="M3 15l5-5 4 4 4-4 5 5"/><circle cx="8" cy="9" r="1.4"/></svg>
        <div class="t">클릭해서 표지/이미지/영상/파일 업로드</div>
        <div class="d">웹툰이면 이미지, 영상이면 영상(또는 아래 링크), 웹소설은 비워두고 본문만 적어도 돼요</div>
      </div>
      <textarea id="mdEpisodeBodyInput" class="md-episode-body-input" placeholder="본문 (웹소설이라면 여기에 회차 내용을 적어주세요)" maxlength="50000"></textarea>
      <input type="text" id="mdEpisodeLinkInput" class="md-episode-link-input" placeholder="외부 링크 (선택 — 용량이 큰 영상은 유튜브 등 링크로)" maxlength="300">
      <textarea id="mdEpisodeNoteInput" class="md-episode-note-input" placeholder="작가의 말 (선택)" maxlength="300"></textarea>
      <button type="button" class="md-episode-save-btn" id="mdEpisodeSaveBtn">저장</button>
    </div>
  `;
  (document.querySelector('.dna-app') || document.body).appendChild(overlay);

  const close = () => {
    overlay.style.display = 'none';
    mdEpisodeEditId = null;
    mdEpisodeWorking = null;
  };
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay || e.target.closest('#mdEpisodeEditorClose')) close();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.style.display !== 'none') close();
  });

  const uploadZone = document.getElementById('mdEpisodeUploadZone');
  uploadZone.addEventListener('click', () => uploadZone.querySelector('input[type="file"]').click());
  if (typeof bearipEnableFileDropDelegated === 'function') {
    bearipEnableFileDropDelegated(overlay.querySelector('.md-episode-editor-box'), '.md-episode-upload');
  }

  uploadZone.addEventListener('change', async (e) => {
    const input = e.target.closest('input[type="file"]');
    if (!input) return;
    const file = input.files[0];
    if (!file) return;

    mdEpisodeWorking.imageData = null;
    mdEpisodeWorking.fileData = null;
    mdEpisodeWorking.fileName = null;
    mdEpisodeWorking.fileSize = null;
    mdEpisodeWorking.mime = null;

    if (file.type.startsWith('image/')) {
      try {
        mdEpisodeWorking.imageData = await bearipResizeImageToDataUrl(file, 1080, 0.85);
      } catch (err) {
        uploadZone.classList.add('error');
        uploadZone.querySelector('.d').textContent = err.message || '이미지를 불러오지 못했어요';
        return;
      }
    } else if (typeof bearipIsInlineAttachmentFile === 'function' && bearipIsInlineAttachmentFile(file)) {
      if (file.size > BEARIP_MAX_INLINE_FILE_BYTES) {
        uploadZone.classList.add('error');
        uploadZone.querySelector('.d').textContent = '이 파일 형식은 최대 5MB까지예요. 큰 영상은 아래 링크를 이용해주세요.';
        return;
      }
      try {
        mdEpisodeWorking.fileData = await bearipReadFileAsDataUrl(file);
      } catch (err) {
        uploadZone.classList.add('error');
        uploadZone.querySelector('.d').textContent = err.message || '파일을 불러오지 못했어요';
        return;
      }
    } else {
      uploadZone.classList.add('error');
      uploadZone.querySelector('.d').textContent = '지원하지 않는 파일 형식이에요.';
      return;
    }
    mdEpisodeWorking.fileName = file.name;
    mdEpisodeWorking.fileSize = file.size;
    mdEpisodeWorking.mime = file.type;

    uploadZone.classList.remove('error');
    uploadZone.classList.add('has-file');
    uploadZone.style.backgroundImage = mdEpisodeWorking.imageData ? `url('${mdEpisodeWorking.imageData}')` : '';
    uploadZone.querySelector('.t').textContent = file.name;
    uploadZone.querySelector('.d').textContent = '다른 파일을 선택하려면 클릭하세요';
  });

  document.getElementById('mdEpisodeSaveBtn').addEventListener('click', () => {
    const title = document.getElementById('mdEpisodeTitleInput').value.trim();
    if (!title) {
      bearipShowToast('회차 제목을 입력해주세요');
      document.getElementById('mdEpisodeTitleInput').focus();
      return;
    }
    const patch = Object.assign({}, mdEpisodeWorking, {
      title,
      body: document.getElementById('mdEpisodeBodyInput').value.trim(),
      link: document.getElementById('mdEpisodeLinkInput').value.trim(),
      note: document.getElementById('mdEpisodeNoteInput').value.trim(),
    });
    delete patch.id;

    if (mdEpisodeEditId) {
      bearipUpdateEpisode(currentIP, mdEpisodeEditId, patch);
    } else {
      bearipAddEpisode(currentIP, patch);
    }
    close();
    mdRenderEpisodes();
    bearipShowToast(mdEpisodeEditId ? '회차를 수정했어요' : '회차를 올렸어요');
  });

  return overlay;
}

function mdResetEpisodeEditorForm() {
  document.getElementById('mdEpisodeTitleInput').value = mdEpisodeWorking.title || '';
  document.getElementById('mdEpisodeBodyInput').value = mdEpisodeWorking.body || '';
  document.getElementById('mdEpisodeLinkInput').value = mdEpisodeWorking.link || '';
  document.getElementById('mdEpisodeNoteInput').value = mdEpisodeWorking.note || '';
  const uploadZone = document.getElementById('mdEpisodeUploadZone');
  uploadZone.classList.remove('error');
  const hasFile = !!(mdEpisodeWorking.imageData || mdEpisodeWorking.fileName);
  uploadZone.classList.toggle('has-file', hasFile);
  uploadZone.style.backgroundImage = mdEpisodeWorking.imageData ? `url('${mdEpisodeWorking.imageData}')` : '';
  uploadZone.querySelector('.t').textContent = hasFile ? mdEpisodeWorking.fileName || '파일 첨부됨' : '클릭해서 표지/이미지/영상/파일 업로드';
  uploadZone.querySelector('.d').textContent = hasFile
    ? '다른 파일을 선택하려면 클릭하세요'
    : '웹툰이면 이미지, 영상이면 영상(또는 아래 링크), 웹소설은 비워두고 본문만 적어도 돼요';
}

function mdOpenEpisodeEditor(episodeId) {
  const overlay = mdEnsureEpisodeEditorOverlay();
  mdEpisodeEditId = episodeId || null;
  const existing = episodeId ? (currentIP.episodes || []).find((e) => e.id === episodeId) : null;
  mdEpisodeWorking = existing
    ? Object.assign({}, existing)
    : { imageData: null, fileData: null, fileName: null, fileSize: null, mime: null, link: '', note: '' };
  document.getElementById('mdEpisodeEditorHeadTitle').textContent = episodeId ? '회차 수정' : '새 회차 올리기';
  mdResetEpisodeEditorForm();
  overlay.style.display = 'flex';
}

// Same reasoning as production-requests.js's prConfirmPurge — a native
// confirm() can be blocked outright in this prototype's embedded contexts.
function mdConfirmDeleteEpisode(episodeId) {
  const ep = (currentIP.episodes || []).find((e) => e.id === episodeId);
  if (!ep) return;
  const overlay = document.createElement('div');
  overlay.className = 'md-road-edit-overlay';
  overlay.innerHTML = `
    <div class="md-road-edit-box" style="max-width:320px; text-align:center;">
      <div style="font-size:14px; font-weight:800; color:var(--dr-ink); margin-bottom:8px;">'${bearipEscapeHtml(ep.title)}'를 삭제할까요?</div>
      <div style="font-size:12px; color:var(--dr-ink-soft); margin-bottom:16px;">좋아요와 댓글도 함께 삭제돼요. 되돌릴 수 없어요.</div>
      <div style="display:flex; gap:8px;">
        <button type="button" class="md-episode-del-cancel" style="flex:1; padding:10px; border-radius:10px; border:1px solid var(--dr-border); background:var(--dr-bg); color:var(--dr-ink); cursor:pointer; font-family:inherit;">취소</button>
        <button type="button" class="md-episode-del-confirm" style="flex:1; padding:10px; border-radius:10px; border:none; background:#d64545; color:#fff; cursor:pointer; font-family:inherit; font-weight:700;">삭제</button>
      </div>
    </div>
  `;
  (document.querySelector('.dna-app') || document.body).appendChild(overlay);
  const close = () => overlay.remove();
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });
  overlay.querySelector('.md-episode-del-cancel').addEventListener('click', close);
  overlay.querySelector('.md-episode-del-confirm').addEventListener('click', () => {
    close();
    bearipDeleteEpisode(currentIP, episodeId);
    mdRenderEpisodes();
    bearipShowToast('회차를 삭제했어요');
  });
}

document.addEventListener('DOMContentLoaded', () => {
  mdRenderEpisodes();
  if (typeof bearipOnDataChange === 'function') {
    bearipOnDataChange('episodeLikes', mdRenderEpisodes);
    bearipOnDataChange('episodeComments', mdRenderEpisodes);
  }

  const addBtn = document.getElementById('mdEpisodeAddBtn');
  if (addBtn) addBtn.addEventListener('click', () => mdOpenEpisodeEditor(null));

  const list = document.getElementById('mdEpisodeList');
  if (list) {
    list.addEventListener('click', (e) => {
      const editBtn = e.target.closest('.md-episode-edit-btn');
      if (editBtn) {
        mdOpenEpisodeEditor(editBtn.dataset.episodeId);
        return;
      }
      const delBtn = e.target.closest('.md-episode-delete-btn');
      if (delBtn) mdConfirmDeleteEpisode(delBtn.dataset.episodeId);
    });
  }
});
