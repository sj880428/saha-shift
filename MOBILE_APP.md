# 사하의집 근무표 모바일 앱

현재 GitHub Pages 웹앱을 Capacitor로 감싸 iOS와 Android에서 실행하는 시험용 앱 프로젝트입니다.

## 기본 정보

- 앱 이름: 사하의집 근무표
- 앱 ID: `io.github.sj880428.sahashift`
- 웹 자산 폴더: `mobile-web` (자동 생성, Git 제외)

## 개발 명령

```bash
pnpm install
pnpm mobile:sync
pnpm ios:open
pnpm android:open
```

`prepare:web`가 기존 정적 웹 파일을 `mobile-web`에 복사하고, `cap sync`가 이를 각 네이티브 프로젝트에 반영합니다.

## 출시 전 확인 사항

- Supabase RLS 및 직원별 접근 권한 검토
- 개인정보 처리방침 URL 준비
- 앱스토어 심사용 계정 준비
- 푸시 알림 등 네이티브 기능 추가
- 정식 Bundle ID 확정
