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
