export function profileToForm(profile) {
  const hasTime = Boolean(profile?.birth_time)
  return {
    name: profile?.name ?? '',
    birthDate: profile?.birth_date ?? '',
    birthTime: hasTime ? String(profile.birth_time).slice(0, 5) : '',
    timeUnknown: profile ? !hasTime : false,
    gender: profile?.gender ?? '',
    calendarType: profile?.calendar_type ?? 'solar',
  }
}

export function formToProfilePayload({ name, birthDate, birthTime, timeUnknown, gender, calendarType }) {
  return {
    name: String(name ?? '').trim(),
    birth_date: birthDate,
    birth_time: timeUnknown || !birthTime ? null : birthTime,
    gender,
    calendar_type: calendarType ?? 'solar',
  }
}
