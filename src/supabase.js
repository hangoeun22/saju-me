import { createClient } from '@supabase/supabase-js'

// .env 의 VITE_SUPABASE_* 값을 읽습니다.
// Vite에서는 import.meta.env.VITE_이름 으로 환경변수를 가져옵니다.
// .env를 수정한 뒤에는 반드시 개발 서버를 재시작해야 반영됩니다.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Supabase 환경변수가 없습니다. .env에 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY를 넣은 뒤, npm run dev를 다시 실행해 주세요.',
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
