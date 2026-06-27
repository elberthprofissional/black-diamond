import { describe, it, expect } from 'vitest'
import {
  getPeriod,
  formatPhone,
  getLocalDateString,
  getNextDays,
  isTimeOccupied,
} from '../lib/utils'

describe('getPeriod', () => {
  it('retorna "Manhã" para horários antes do 12', () => {
    expect(getPeriod('08:00')).toBe('Manhã')
    expect(getPeriod('11:59')).toBe('Manhã')
  })

  it('retorna "Tarde" para horários entre 12 e 18', () => {
    expect(getPeriod('12:00')).toBe('Tarde')
    expect(getPeriod('17:59')).toBe('Tarde')
  })

  it('retorna "Noite" para horários a partir das 18', () => {
    expect(getPeriod('18:00')).toBe('Noite')
    expect(getPeriod('20:00')).toBe('Noite')
  })
})

describe('formatPhone', () => {
  it('retorna string vazia para input null/undefined', () => {
    expect(formatPhone(null)).toBe('')
    expect(formatPhone(undefined)).toBe('')
  })

  it('retorna digitos sem formatacao para 2 ou menos', () => {
    expect(formatPhone('31')).toBe('31')
  })

  it('formata DDD com parenteses quando tem 3 digitos', () => {
    expect(formatPhone('319')).toBe('(31) 9')
  })

  it('formata telefone com 10 digitos (fixo)', () => {
    expect(formatPhone('3199999999')).toBe('(31) 99999-999')
  })

  it('formata telefone com 11 digitos (celular)', () => {
    expect(formatPhone('31999999999')).toBe('(31) 99999-9999')
  })

  it('remove caracteres nao numericos', () => {
    expect(formatPhone('(31) 9.9999-9999')).toBe('(31) 99999-9999')
  })

  it('trunca em 11 digitos', () => {
    expect(formatPhone('319999999999')).toBe('(31) 99999-9999')
  })
})

describe('getLocalDateString', () => {
  it('retorna data no formato YYYY-MM-DD', () => {
    const result = getLocalDateString(new Date(2026, 0, 15))
    expect(result).toBe('2026-01-15')
  })

  it('preenche meses e dias com zero a esquerda', () => {
    const result = getLocalDateString(new Date(2026, 2, 5))
    expect(result).toBe('2026-03-05')
  })

  it('usa a data atual por padrao', () => {
    const result = getLocalDateString()
    const now = new Date()
    const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    expect(result).toBe(expected)
  })
})

describe('getNextDays', () => {
  it('retorna exatamente 6 dias', () => {
    const days = getNextDays()
    expect(days).toHaveLength(6)
  })

  it('cada dia tem as propriedades corretas', () => {
    const days = getNextDays()
    days.forEach(day => {
      expect(day).toHaveProperty('fullDate')
      expect(day).toHaveProperty('dayName')
      expect(day).toHaveProperty('dayNumber')
      expect(day).toHaveProperty('isToday')
      expect(day).toHaveProperty('isPast')
      expect(day.fullDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(day.dayName).toMatch(/^[A-ZÀ-Ú]{3}$/)
      expect(typeof day.dayNumber).toBe('number')
      expect(typeof day.isToday).toBe('boolean')
      expect(typeof day.isPast).toBe('boolean')
    })
  })

  it('o primeiro dia e segunda-feira', () => {
    const days = getNextDays()
    const firstDate = new Date(days[0].fullDate + 'T00:00:00')
    expect(firstDate.getDay()).toBe(1) // Monday
  })
})

describe('isTimeOccupied', () => {
  const mockBookings = [
    { booking_time: '09:00:00', status: 'confirmed' },
    { booking_time: '10:00:00', status: 'pending' },
    { booking_time: '14:00:00', status: 'cancelled' },
  ]

  it('retorna true para horario ocupado', () => {
    expect(isTimeOccupied('09:00', mockBookings)).toBe(true)
  })

  it('retorna false para horario livre', () => {
    expect(isTimeOccupied('11:00', mockBookings)).toBe(false)
  })

  it('ignora agendamentos cancelados', () => {
    expect(isTimeOccupied('14:00', mockBookings)).toBe(false)
  })

  it('retorna false para lista vazia', () => {
    expect(isTimeOccupied('09:00', [])).toBe(false)
  })
})
