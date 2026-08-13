# saju-me

생년월일로 사주를 풀고, Google 로그인으로 **내 프로필과 해석 기록**을 저장하는 웹 서비스입니다.

👉 [https://saju-me-nine.vercel.app/](https://saju-me-nine.vercel.app/)

로그인 없이도 바로 볼 수 있고, 게스트에게는 해석의 앞부분만 보여 준 뒤 Google 로그인으로 전체 결과와 저장 기능을 엽니다.

## 기능

- 이름, 생년월일, 태어난 시간(모름 가능), 성별, 양력/음력 입력
- Gemini(`gemini-3.6-flash`)로 사주 명식·성격·기질·재능 해석
- 마크다운으로 읽기 쉬운 결과 표시
- 게스트 미리보기: 결과 일부를 가리고 로그인 유도
- Google 로그인 (Supabase Auth)
- 회원 프로필 저장, 다음 해석 시 자동 입력
- 해석 기록 저장 / 다시 보기 / 수정 / 삭제 (사이드바)
- 공유 링크 `/result/:id` 로 결과 페이지 열기
- 결과 복사, 네이티브 공유 또는 링크 복사
- 지금까지 생성된 사주 수 표시
- SEO·Open Graph·PWA 아이콘

## 기술 스택

- React 19 + Vite 8
- `@google/genai` (Gemini Interactions API)
- `@supabase/supabase-js` (Google 로그인, 프로필·해석 저장)
- `react-markdown` (결과 렌더링)
- Vercel (SPA 배포)
- Google Analytics

## 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

`.env.example`을 참고해 프로젝트 루트에 `.env` 파일을 만듭니다.

```bash
VITE_GEMINI_API_KEY=여기에_발급받은_키를_넣으세요
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=여기에_anon_또는_publishable_키를_넣으세요
```

| 변수 | 설명 |
| --- | --- |
| `VITE_GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com/apikey)에서 발급 |
| `VITE_SUPABASE_URL` | Supabase 프로젝트 URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon / publishable 키 |

Google 로그인을 쓰려면 Supabase Dashboard에서 다음도 맞춰 주세요.

- **Authentication → Providers → Google** 활성화 (Client ID / Secret)
- **Authentication → URL Configuration**
  - Site URL: `http://localhost:5173` (배포 시에는 배포 URL)
  - Redirect URLs: `http://localhost:5173/**` 및 배포 URL
- Google Cloud Console 클라이언트의 Authorized JavaScript origins / redirect URI

> `.env`는 GitHub에 올라가지 않습니다. 키는 절대 커밋하지 마세요.

### 3. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 표시되는 주소(보통 `http://localhost:5173`)로 접속합니다.

## 사용 방법

1. 이름과 생년월일 등을 입력하고 **사주 보기**를 누릅니다.
2. 게스트는 해석 미리보기만 볼 수 있습니다. **Google로 계속하기**로 로그인하면 전체 결과가 열립니다.
3. 로그인 후 프로필을 등록하면 기록이 저장되고, 사이드바에서 다시 꺼내 볼 수 있습니다.
4. 저장된 결과는 **공유하기**로 링크를 보낼 수 있습니다.

## 스크립트

| 명령어 | 설명 |
| --- | --- |
| `npm run dev` | 개발 서버 실행 |
| `npm run build` | 프로덕션 빌드 |
| `npm run preview` | 빌드 결과 미리보기 |
| `npm run lint` | Oxlint 실행 |

## 프로젝트 구조

```text
src/
  App.jsx                 # 메인 화면 (입력 · 결과 · 사이드바)
  Root.jsx                # / 와 /result/:id 라우팅
  pages/ResultPage.jsx    # 공유된 사주 페이지
  hooks/                  # 인증, 워크스페이스, 토스트
  lib/                    # Gemini, Supabase, 공유·게스트 로직
  components/
    common/               # 마스코트, 토스트, 생년월일 필드
    form/                 # 사주 입력 폼
    layout/               # 헤더, 사이드바, 게스트 상단바
    profile/              # 프로필 칩 · 모달
    result/               # 결과 카드, 게스트 게이트, 마크다운
  styles/app.css
```

## 배포

Vercel로 배포하며, `vercel.json`에서 SPA 라우팅(`/result/:id` 포함)을 `index.html`로 넘깁니다. 배포 환경에도 위 `VITE_*` 변수를 동일하게 넣어야 합니다.
