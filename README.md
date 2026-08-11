# saju-me

생년월일 정보를 입력하면 **Gemini API**로 사주를 해석해 주는 웹 서비스입니다.

## 기능

- 이름, 생년월일, 태어난 시간, 성별, 양력/음력 입력
- Gemini(`gemini-3.6-flash`)로 사주 해석 요청
- 마크다운 형식의 해석 결과를 읽기 쉽게 표시

## 기술 스택

- React + Vite
- `@google/genai` (Gemini Interactions API)
- `react-markdown` (결과 렌더링)

## 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

`.env.example`을 참고해 프로젝트 루트에 `.env` 파일을 만듭니다.

```bash
VITE_GEMINI_API_KEY=여기에_발급받은_키를_넣으세요
```

API 키는 [Google AI Studio](https://aistudio.google.com/apikey)에서 발급받을 수 있습니다.

> `.env`는 GitHub에 올라가지 않습니다. 키는 절대 커밋하지 마세요.

### 3. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 표시되는 주소(보통 `http://localhost:5173`)로 접속합니다.

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
  App.jsx        # 입력 폼 + 결과 화면
  gemini.js      # Gemini API 호출
  sajuPrompt.js  # 사주 해석 시스템 프롬프트
  App.css        # 스타일
```

## 사용 방법

1. 이름, 생년월일, 성별 등 정보를 입력합니다.
2. **사주 보기**를 누릅니다.
3. 잠시 후 아래에 사주 해석 결과가 표시됩니다.
