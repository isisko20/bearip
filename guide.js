document.querySelectorAll('.gd-faq-item .gd-faq-q').forEach((btn) => {
  btn.addEventListener('click', () => {
    btn.closest('.gd-faq-item').classList.toggle('open');
  });
});

// "무엇이든 물어보세요" — not a real LLM (that needs a server to hide an API
// key, which this static site doesn't have — see the FAQ list itself for
// the plan there later). This is honest keyword search over the FAQ items
// already on this page, phrased like a question box so it's actually
// useful without needing any backend. Reads the FAQ DOM directly instead of
// a separate hardcoded list, so editing a FAQ answer here automatically
// keeps this in sync.
function gdBuildFaqIndex() {
  return [...document.querySelectorAll('.gd-faq-item')].map((item) => {
    const q = item.querySelector('.gd-faq-q').childNodes[0].textContent.trim();
    const a = item.querySelector('.gd-faq-a').textContent.trim();
    return { item, q, a, qLower: q.toLowerCase(), text: (q + ' ' + a).toLowerCase() };
  });
}

// Korean words don't reliably split on whitespace alone (e.g. "저장은
// 어디에" is one run), so this also scores 2-character substrings of the
// query with spaces stripped — catches a spacing mismatch like "직접완료"
// vs. the FAQ's "직접 완료". Kept separate from the whitespace words (not
// merged into one set) because a bigram is often just a fragment of a real
// word cut in a meaningless place (e.g. "완료가" → "료가" happens to also
// sit inside an unrelated "자료가") — treated as a much weaker signal than
// an actual whole-word match, so a couple of coincidental bigram hits can't
// outweigh the one entry that genuinely contains the query's real words.
function gdQueryTokens(query) {
  const words = new Set(
    query
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean)
  );
  const compact = query.toLowerCase().replace(/\s+/g, '');
  const bigrams = new Set();
  for (let i = 0; i + 2 <= compact.length; i++) bigrams.add(compact.slice(i, i + 2));
  return { words: [...words], bigrams: [...bigrams] };
}

function gdAsk(query) {
  const q = query.trim();
  const results = document.getElementById('gdAskResults');
  if (!q) {
    results.hidden = true;
    return;
  }
  const index = gdBuildFaqIndex();
  const { words, bigrams } = gdQueryTokens(q);

  // A generic token that shows up in most FAQ entries ("완료", "단계")
  // carries almost no information about which one the user actually means
  // — weight each token by how RARE it is across this FAQ set (classic
  // IDF idea) rather than counting every hit equally, or a long answer
  // that happens to contain lots of common words wins on volume alone
  // over the one entry that's actually specific to the query.
  const docFreq = {};
  [...words, ...bigrams].forEach((t) => {
    docFreq[t] = index.filter((e) => e.text.includes(t)).length;
  });

  const scored = index
    .map((entry) => {
      let score = 0;
      words.forEach((t) => {
        const rarity = 1 / (docFreq[t] || 1);
        if (entry.qLower.includes(t)) score += rarity * 4;
        else if (entry.text.includes(t)) score += rarity * 2;
      });
      bigrams.forEach((t) => {
        const rarity = 1 / (docFreq[t] || 1);
        if (entry.qLower.includes(t)) score += rarity * 0.6;
        else if (entry.text.includes(t)) score += rarity * 0.3;
      });
      return { entry, score };
    })
    // A low score here almost always means the only overlap was a couple of
    // generic bigrams that happen to appear everywhere — not a real match.
    // Requiring a real showing (roughly: one whole-word hit, or several
    // rarer bigram hits) keeps unrelated/gibberish input landing on the
    // honest "couldn't find it" message instead of a confident-looking but
    // wrong answer.
    .filter((r) => r.score >= 1)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  results.hidden = false;
  if (!scored.length) {
    results.innerHTML = `
      <div class="gd-ask-empty">
        딱 맞는 답을 못 찾았어요. 아래 FAQ를 직접 훑어보시거나, 크루원에게 물어봐주세요.
      </div>
    `;
    return;
  }
  results.innerHTML = scored
    .map(
      ({ entry }) => `
      <button type="button" class="gd-ask-result" data-q="${escapeHtmlAttr(entry.q)}">
        <div class="gd-ask-result-q">${entry.q}</div>
        <div class="gd-ask-result-a">${entry.a}</div>
      </button>
    `
    )
    .join('');
  results.querySelectorAll('.gd-ask-result').forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = [...document.querySelectorAll('.gd-faq-item')].find(
        (item) => item.querySelector('.gd-faq-q').childNodes[0].textContent.trim() === btn.dataset.q
      );
      if (!target) return;
      target.classList.add('open');
      target.scrollIntoView({ block: 'center', behavior: 'smooth' });
    });
  });
}

function escapeHtmlAttr(s) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

const gdAskInput = document.getElementById('gdAskInput');
const gdAskBtn = document.getElementById('gdAskBtn');
if (gdAskInput && gdAskBtn) {
  gdAskBtn.addEventListener('click', () => gdAsk(gdAskInput.value));
  gdAskInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') gdAsk(gdAskInput.value);
  });
}
