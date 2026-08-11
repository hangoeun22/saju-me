import { GoogleGenAI } from '@google/genai/web'
import { SAJU_SYSTEM_INSTRUCTION } from './sajuPrompt'

// .env 파일의 VITE_GEMINI_API_KEY를 읽습니다.
// Vite에서는 import.meta.env.VITE_이름 으로 환경변수를 가져옵니다.
const apiKey = import.meta.env.VITE_GEMINI_API_KEY

// Gemini 클라이언트 생성
const ai = new GoogleGenAI({ apiKey })

/**
 * 입력한 생년월일 정보로 Gemini에게 사주 해석을 요청합니다.
 * @param {{ name: string, birthDate: string, birthTime: string, gender: string, calendarType: string }} form
 * @returns {Promise<string>} 한국어 해석 결과 텍스트
 */
export async function analyzeSaju(form) {
  if (!apiKey) {
    throw new Error('VITE_GEMINI_API_KEY가 없습니다. .env 파일을 확인해 주세요.')
  }

  const genderLabel = form.gender === 'male' ? '남성' : form.gender === 'female' ? '여성' : '미선택'
  const calendarLabel = form.calendarType === 'lunar' ? '음력' : '양력'

  // 아직 사주 명식(년주/월주 등)을 직접 계산하는 코드는 없으므로,
  // Gemini에게 생년월일 정보로 사주를 산출한 뒤 해석하라고 요청합니다.
  const userInput = `
아래 출생 정보를 바탕으로 사주 명식을 먼저 산출한 뒤,
성격·기질·재능을 해석해 주세요.

[출생 정보]
- 이름: ${form.name}
- 성별: ${genderLabel}
- 생년월일: ${form.birthDate}
- 태어난 시간: ${form.birthTime || '모름'}
- 달력: ${calendarLabel}

가능하면 아래 항목도 함께 정리한 뒤 해석에 반영하세요.
- 사주 원국은 반드시 아래처럼 네 주를 각각 구분해서 적으세요.
  년주: (천간지지)
  월주: (천간지지)
  일주: (천간지지)
  시주: (천간지지)
  ※ 한 줄에 뭉뚱그려 쓰지 말고, 년주/월주/일주/시주를 줄마다 따로 표기하세요.
- 오행 분포
- 십신 / 지장간 등 핵심 근거
`.trim()

  // Interactions API로 요청 (문서 권장 방식)
  // temperature 같은 예전 옵션은 gemini-3.6-flash에서 쓰지 않습니다.
  const interaction = await ai.interactions.create({
    model: 'gemini-3.6-flash',
    system_instruction: SAJU_SYSTEM_INSTRUCTION,
    input: userInput,
  })

  // output_text = 모델이 답한 글자
  const text = interaction.output_text?.trim()
  if (!text) {
    throw new Error('Gemini 응답이 비어 있습니다. 잠시 후 다시 시도해 주세요.')
  }

  return text
}
