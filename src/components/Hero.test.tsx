import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Hero from '../components/Hero'

const renderWithRouter = (ui: React.ReactElement) => {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

describe('Hero', () => {
  it('renderiza o titulo BLACK DIAMOND', () => {
    renderWithRouter(<Hero onBookingClick={vi.fn()} />)
    expect(screen.getByText('BLACK')).toBeInTheDocument()
    expect(screen.getByText('DIAMOND')).toBeInTheDocument()
  })

  it('renderiza a descricao', () => {
    renderWithRouter(<Hero onBookingClick={vi.fn()} />)
    expect(screen.getByText(/Onde o cuidado pessoal encontra a excelência/)).toBeInTheDocument()
  })

  it('renderiza botao de agendamento', () => {
    renderWithRouter(<Hero onBookingClick={vi.fn()} />)
    expect(screen.getByText('Agende seu horário')).toBeInTheDocument()
  })

  it('chama onBookingClick ao clicar no botao', async () => {
    const handleClick = vi.fn()
    renderWithRouter(<Hero onBookingClick={handleClick} />)

    const button = screen.getByText('Agende seu horário')
    button.click()

    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('renderiza a imagem de fundo', () => {
    renderWithRouter(<Hero onBookingClick={vi.fn()} />)
    const img = screen.getByAltText('Black Diamond')
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute('src', '/assets/hero-bg.webp')
  })
})
