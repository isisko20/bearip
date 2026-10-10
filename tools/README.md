# 운영 도구

모두 `firebase` CLI가 로그인된 PC에서 실행해요 (`firebase login`). PowerShell이 `firebase`를 못 찾으면
도구가 알아서 `npx.cmd firebase-tools`로 대신 실행해요.

## 백업 / 복구

```
node tools/backup-db.js                       # ~/bearip-backup/ 에 날짜가 붙은 JSON으로 저장
node tools/restore-db.js 백업.json /publicIPs         # 무엇이 바뀔지 확인만 (드라이런)
node tools/restore-db.js 백업.json /publicIPs --yes   # 실제 복구 (그 경로를 통째로 교체)
```

- 백업 파일에는 작품·쪽지·알림·계정(PIN 해시)이 들어 있어요. **공개 저장소에 올리지 마세요.**
- 복구는 항상 직전 상태를 `before_restore_*.json`으로 먼저 저장해서, 잘못 복구해도 되돌릴 수 있어요.
- `/` 전체 복구는 `--all`이 필요해요. 가능하면 경로를 좁혀서(예: `/ipDetails/ip_123`) 복구하세요.
- 위험한 작업(규칙 변경, 대량 삭제) 전에는 백업을 한 번 받아두세요.
- Firebase 콘솔의 자동 일일 백업(Realtime Database → 백업 탭)을 켜두면 매일 자동으로도 받아져요.

## 소유자 전용 쓰기 규칙 (준비만 되어 있고 아직 꺼져 있어요)

`database.rules.json`이 **지금 라이브에 적용된 규칙**이고, `database.rules.next.json`이 "내 IP·댓글·좋아요 등을
본인만 고칠 수 있게" 강화한 규칙이에요. 켜는 방법:

1. 친구들이 PIN을 설정했는지 확인해요 (`firebase database:get /accounts --shallow`). PIN이 없는 계정은 켠 뒤
   서버에 저장할 수 없어요 (읽기는 그대로 돼요).
2. 소유자 기록이 없는 옛 IP는 GM만 고칠 수 있어요. 주인을 알면 `allIPs/<id>/ownerNickname`,
   `publicIPs/<id>/ownerNickname`, `ipDetails/<id>/owner`, `ipMaterials/<id>/owner`를 채워주세요.
3. `node tools/backup-db.js` 로 백업을 받고, `database.rules.next.json` 내용을 `database.rules.json`에
   덮어쓴 뒤 `firebase deploy --only database`.
4. 문제가 생기면 이전 `database.rules.json`(git)을 다시 배포하면 즉시 원래대로 돌아와요.

`tools/gen-ownership-rules.js`는 `database.rules.json`에서 `database.rules.next.json`을 만들어요
(`node tools/gen-ownership-rules.js database.rules.json database.rules.next.json GM`).

## 앱 아이콘

```
node tools/make-icons.js     # assets/icons/ 의 앱 아이콘(PNG)을 다시 만들어요
```

색이나 모양을 바꾸고 싶으면 `tools/make-icons.js` 위쪽의 색 값과 T 모양을 고친 뒤 다시 실행하세요.

## 서비스 워커 / 오류 기록

- `sw.js`는 일부러 "항상 네트워크 먼저"예요(캐시에서 옛 코드를 내주지 않게). 코드를 크게 바꿔서 옛 사본이 남지 않게 하고
  싶을 때만 `sw.js`의 `VERSION`을 올리세요.
- 친구들 화면의 오류는 `app-boot.js`가 `clientErrors`에 모아요. GM 화면(제작요청 관리)의 "앱 오류 기록"에서 보거나,
  `firebase database:get /clientErrors` 로 읽을 수 있어요. 규칙을 켠 직후에는 `denied`(저장 거부) 종류가 어디서 나는지 보세요.

## 의뢰하기 1차 검토 (requestTriage)

- 사용자 화면의 "의뢰하기"는 대기열(`productionRequests`/`ipReviews`)에 `triage: 'queued'`로 들어가고, 본인 브라우저가
  서버 함수 `requestTriage`를 불러요. 글로 처리할 수 있는 항목(시나리오·설정·세계관 등)이면 결과를 바로 기록하고
  알림을 보내고(`handledBy: 'auto'`), 아니면 `triage: 'handoff'`와 사유(`triageNote`)를 남긴 채 평소처럼 GM 대기열에 둬요.
  어떤 이유로든 실패하면 의뢰는 그대로 대기열에 남아요.
- GM 화면(제작요청 관리, IP 심사)에는 "자동 처리됨 / 직접 확인 필요" 표시가 보여요 (사용자 화면에는 안 보여요).
  "AI 시나리오 도우미 설정"에서 의뢰 자동 처리를 끄거나 하루 한도를 바꿀 수 있어요.
- 자동 처리 대상 판단(글 항목만)은 `functions/lib.js`의 `isTextWork`예요. 항목 이름을 바꾸면 `functions/test.js`가 알려줘요.
- 배포 없이 로직 검증: `cd functions && npm test` (가짜 DB·가짜 AI 응답으로 실제 `index.js`를 돌려요).
- 배포: `functions/`를 구글드라이브 밖 폴더에 복사해서 `firebase deploy --only functions:requestTriage,functions:aiAssist,functions:aiAdmin`.

## 자료 분석 (analyzeMaterial)

- MY DNA의 "작성 완성도"와 "띵킷 분석"이 쓰는 서버 함수예요. `kind: 'check'`는 올린 자료마다 매뉴얼의 필수 요소가 들어 있는지
  점검해서 빠진 요소의 이름만 돌려주고(`entry.analysis`에 저장), `kind: 'score'`는 글 항목별 준비도 점수만 돌려줘요.
- 필수 요소 목록은 `functions/lib.js`의 `CHECKLISTS`(시나리오·캐릭터 설정·세계관)예요. 항목 이름으로 대상을 가리는 규칙
  (`checklistCategory`)은 `storage.js`의 `bearipChecklistCategory`와 반드시 같아야 해요.
- 목표 수량을 0으로 두면 "필요 없는 단계"라서 작성 완성도 평균에서 빠져요.
- GM 화면의 AI 설정에서 의뢰 자동 처리와 별개로 하루 한도(`aiConfig/checkDaily`, `analyzeDaily`)를 조정할 수 있어요
  (`analysisEnabled`로 끌 수도 있어요).
- 배포할 함수 목록에 `functions:analyzeMaterial`도 넣어주세요.
