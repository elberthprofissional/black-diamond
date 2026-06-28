import { describe, it, expect } from 'vitest'
import { getTimeSlotsForDate, getPeriod, formatPhone, getLocalDateString, getNextDays, isTimeOccupied } from './utils'

describe('getTimeSlotsForDate', () => {
  it('retorna slots de 8h as 19h para dias de semana', () => {
    const slots = getTimeSlotsForDate('2026-06-29') // segunda-feira
    expect(slots[0]).toBe('08:00')
    expect(slots[slots.length - 1]).toBe('18:00')
    expect(slots).toHaveLength(11)
  })

  it('retorna slots de 8h as 18h para sabado', () => {
    const slots = getTimeSlotsForDate('2026-06-27') // sabado
    expect(slots[0]).toBe('08:00')
    expect(slots[slots.length - 1]).toBe('17:00')
    expect(slots).toHaveLength(10)
  })
})

describe('getPeriod', () => {
  it('retorna Manhã para horarios antes do 12', () => {
    expect(getPeriod('08:00')).toBe('Manhã')
    expect(getPeriod('11:59')).toBe('Manhã')
  })

  it('retorna Tarde para horarios entre 12 e 18', () => {
    expect(getPeriod('12:00')).toBe('Tarde')
    expect(getPeriod('17:59')).toBe('Tarde')
  })

  it('retorna Noite para horarios apos 18', () => {
    expect(getPeriod('18:00')).toBe('Noite')
    expect(getPeriod('23:00')).toBe('Noite')
  })

  it('retorna Manhã para string invalida', () => {
    expect(getPeriod('invalid')).toBe('Manhã')
  })
})

describe('formatPhone', () => {
  it('formata numero de 11 digitos', () => {
    expect(formatPhone('31999999999')).toBe('(31) 99999-9999')
  })

  it('formata numero incompleto', () => {
    expect(formatPhone('3199999')).toBe('(31) 99999-')
  })

  it('retorna vazio para null/undefined', () => {
    expect(formatPhone(null)).toBe('')
    expect(formatPhone(undefined)).toBe('')
  })

  it('limita a 11 digitos', () => {
    expect(formatPhone('319999999999999')).toBe('(31) 99999-9999')
  })
})

describe('getLocalDateString', () => {
  it('retorna data no formato YYYY-MM-DD', () => {
    const result = getLocalDateString(new Date(2026, 5, 15))
    expect(result).toBe('2026-06-15')
  })

  it('formata meses e dias com zero a esquerda', () => {
    const result = getLocalDateString(new Date(2026, 0, 5))
    expect(result).toBe('2026-01-05')
  })
})

describe('getNextDays', () => {
  it('retorna 6 dias', () => {
    const days = getNextDays()
    expect(days).toHaveLength(6)
  })

  it('cada dia tem as propriedades obrigatorias', () => {
    const days = getNextDays()
    for (const day of days) {
      expect(day).toHaveProperty('fullDate')
      expect(day).toHaveProperty('dayName')
      expect(day).toHaveProperty('dayNumber')
      expect(day).toHaveProperty('isToday')
      expect(day).toHaveProperty('isPast')
      expect(typeof day.fullDate).toBe('string')
      expect(typeof day.dayName).toBe('string')
      expect(typeof day.dayNumber).toBe('number')
    }
  })
})

describe('isTimeOccupied', () => {
  const bookings = [
    { booking_time: '10:00:00', status: 'confirmed' },
    { booking_time: '11:00:00', status: 'cancelled' },
    { booking_time: '14:00:00', status: 'pending' },
  ]

  it('retorna true para horario ocupado', () => {
    expect(isTimeOccupied('10:00', bookings)).toBe(true)
    expect(isTimeOccupied('14:00', bookings)).toBe(true)
  })

  it('retorna false para horario livre', () => {
    expect(isTimeOccupied('12:00', bookings)).toBe(false)
  })

  it('retorna false para horario cancelado', () => {
    expect(isTimeOccupied('11:00', bookings)).toBe(false)
  })
})
