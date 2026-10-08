// 현재 규칙(database.rules.json)에서 "소유자만 쓰기" 규칙을 만들어 database.rules.next.json 으로 저장해요.
const fs = require('fs');
const [, , srcPath, outPath, gmName] = process.argv;
const GM = gmName || 'GM';
const rules = JSON.parse(fs.readFileSync(srcPath, 'utf8')).rules;

const isGm = `auth.token.nk == '${GM}'`;
const signedIn = 'auth.token.nick != null';
// 이 IP의 소유자인가 (allIPs에 기록된 ownerNickname 기준 — 소유자가 없는 옛 IP는 GM만)
const ipOwner = (v) => `root.child('allIPs').child(${v}).child('ownerNickname').val() == auth.token.nick`;
// 기록에 적힌 소유자 필드가 나인가 (새로 만들 땐 새 값, 이미 있으면 기존 값) + 소유자는 바꿀 수 없어요
const ownedBy = (field) =>
  `(data.exists() ? data.child('${field}').val() == auth.token.nick : newData.child('${field}').val() == auth.token.nick) && (!newData.exists() || newData.child('${field}').val() == auth.token.nick)`;

// 원래 없는 것을 지우는 요청은 아무 일도 아니므로 허용해요 (예: 비어 있는 자료실 문서 정리)
const noop = '(!data.exists() && !newData.exists())';
const set = (node, expr) => { node['.write'] = noop + ' || (' + expr + ')'; };

// IP 본문·상세·자료실·모집글·제작요청·검토: 소유자(또는 GM)만
set(rules.publicIPs.$ipId, `${signedIn} && (${isGm} || (${ownedBy('ownerNickname')}))`);
set(rules.allIPs.$ipId, `${signedIn} && (${isGm} || (${ownedBy('ownerNickname')}))`);
set(rules.ipDetails.$ipId, `${signedIn} && (${isGm} || (${ownedBy('owner')}))`);
set(rules.ipMaterials.$ipId, `${signedIn} && (${isGm} || (${ownedBy('owner')}))`);
set(rules.positions.$posId, `${signedIn} && (${isGm} || (${ownedBy('ownerNickname')}))`);
set(rules.productionRequests.$reqId, `${signedIn} && (${isGm} || (${ownedBy('requesterNickname')}))`);
set(rules.ipReviews.$reviewId, `${signedIn} && (${isGm} || (${ownedBy('requesterNickname')}))`);
// 종합 코멘트: GM이 쓰고, IP를 지울 때 소유자가 정리
set(rules.ipOverallComments.$ipId, `${signedIn} && (${isGm} || ${ipOwner('$ipId')})`);
// 크리에이터 프로필: 본인만
set(rules.publicCreators.$nickname, `auth.token.nk != null && (${isGm} || auth.token.nk == $nickname)`);

// 닉네임 키 기록(팔로우·조회·응원·좋아요): 본인 기록만 쓰고, IP 소유자는 지우기만 (IP를 지울 때 정리)
const ownKeyOrOwnerDelete = (ipVar, keyVar) =>
  `auth.token.nk != null && (${isGm} || auth.token.nk == ${keyVar} || (${ipOwner(ipVar)} && !newData.exists()))`;
set(rules.ipFollowers.$ipId.$nickname, ownKeyOrOwnerDelete('$ipId', '$nickname'));
set(rules.ipViews.$ipId.$nickname, ownKeyOrOwnerDelete('$ipId', '$nickname'));
set(rules.ipCheers.$ipId.$nickname, ownKeyOrOwnerDelete('$ipId', '$nickname'));
set(rules.episodeLikes.$ipId.$episodeId.$nickname, ownKeyOrOwnerDelete('$ipId', '$nickname'));
set(rules.episodeViews.$ipId.$episodeId.$nickname, ownKeyOrOwnerDelete('$ipId', '$nickname'));

// 댓글·크루 채팅: 쓴 사람 본인만 쓰고 지우고, IP 소유자는 지우기만, 이름은 위조 불가
const authored = (ipVar) =>
  `${signedIn} && (${isGm} || (${ipOwner(ipVar)} && !newData.exists()) || (${ownedBy('name')}))`;
set(rules.episodeComments.$ipId.$episodeId.$commentId, authored('$ipId'));
set(rules.crewChat.$ipId.$msgId, authored('$ipId'));

// 참여 신청 / 모집글 지원: 신청자는 자기 기록을 "대기" 상태로만 쓰고 지울 수 있고, 승인·거절은 소유자(또는 GM)만
const applicant = (ownerExpr, keyVar) =>
  `${signedIn} && (${isGm} || ${ownerExpr} || (${keyVar} == auth.token.nk && (!newData.exists() || newData.child('status').val() == 'pending')))`;
set(rules.ipJoinRequests.$ipId.$reqId, applicant(ipOwner('$ipId'), '$reqId'));
set(rules.positionApplicants.$posId.$appId, applicant(`root.child('positions').child($posId).child('ownerNickname').val() == auth.token.nick`, '$appId'));

fs.writeFileSync(outPath, JSON.stringify({ rules }, null, 2));
const changed = Object.keys(rules).filter((k) => !k.startsWith('.'));
console.log('저장:', outPath, '| 경로 수:', changed.length);
