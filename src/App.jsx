import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import './App.css'
import { analyzeSaju } from './gemini'

function App() {
  // 입력 상태
  const [name, setName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [birthTime, setBirthTime] = useState('')
  const [gender, setGender] = useState('')
  const [calendarType, setCalendarType] = useState('solar')

  // API 관련 상태
  const [loading, setLoading] = useState(false) // 요청 중인지
  const [result, setResult] = useState('') // Gemini 해석 결과
  const [error, setError] = useState('') // 에러 메시지

  // 버튼 클릭 → Gemini API 호출
  async function handleAnalyze() {
    // 필수 값 간단 검사
    if (!name || !birthDate || !gender) {
      setError('이름, 생년월일, 성별은 꼭 입력해 주세요.')
      return
    }

    setLoading(true)
    setError('')
    setResult('')

    try {
      const text = await analyzeSaju({
        name,
        birthDate,
        birthTime,
        gender,
        calendarType,
      })
      setResult(text)
    } catch (err) {
      // 초보자용: 에러 객체의 message를 화면에 보여줌
      console.error(err)
      setError(err.message || '사주 해석 중 오류가 발생했습니다.')
    } finally {
      // 성공/실패와 관계없이 로딩 종료
      setLoading(false)
    }
  }

  return (
    <div className="app">
      <p className="brand">saju-me</p>
      <h1>사주 입력</h1>
      <p className="lede">사주 계산에 필요한 기본 정보를 입력해 주세요.</p>

      <div className="form-block">
        <div className="field">
          <label htmlFor="name">이름</label>
          <input
            id="name"
            type="text"
            placeholder="예: 홍길동"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="birthDate">생년월일</label>
          <input
            id="birthDate"
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="birthTime">태어난 시간</label>
          <input
            id="birthTime"
            type="time"
            value={birthTime}
            onChange={(e) => setBirthTime(e.target.value)}
          />
        </div>

        <div className="field">
          <span className="label">성별</span>
          <div className="options">
            <label>
              <input
                type="radio"
                name="gender"
                value="male"
                checked={gender === 'male'}
                onChange={(e) => setGender(e.target.value)}
              />
              남성
            </label>
            <label>
              <input
                type="radio"
                name="gender"
                value="female"
                checked={gender === 'female'}
                onChange={(e) => setGender(e.target.value)}
              />
              여성
            </label>
          </div>
        </div>

        <div className="field">
          <span className="label">양력 / 음력</span>
          <div className="options">
            <label>
              <input
                type="radio"
                name="calendarType"
                value="solar"
                checked={calendarType === 'solar'}
                onChange={(e) => setCalendarType(e.target.value)}
              />
              양력
            </label>
            <label>
              <input
                type="radio"
                name="calendarType"
                value="lunar"
                checked={calendarType === 'lunar'}
                onChange={(e) => setCalendarType(e.target.value)}
              />
              음력
            </label>
          </div>
        </div>

        {/* 사주 보기 버튼 */}
        <button
          type="button"
          className="analyze-btn"
          onClick={handleAnalyze}
          disabled={loading}
        >
          {loading ? (
            <span className="loading-label">
              <span className="walker" aria-hidden="true">
                <span className="walker-body" />
              </span>
              풀이중...
            </span>
          ) : (
            '사주 보기'
          )}
        </button>
      </div>

      {error && <p className="error">{error}</p>}

      {result && (
        <div className="result">
          <p className="result-eyebrow">RESULT</p>
          <h2>사주 해석</h2>
          {/* Gemini가 ### / ** 같은 마크다운으로 주면 제목·강조로 예쁘게 보여줌 */}
          <div className="result-text">
            <ReactMarkdown
              components={{
                // **텍스트** → 형광펜 강조 스타일
                strong: ({ children }) => (
                  <span className="result-mark">{children}</span>
                ),
              }}
            >
              {result}
            </ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
