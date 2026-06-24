import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Navbar from '../components/Navbar'

const renderWithRouter = (ui: React.ReactElement) => {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

describe('Navbar', () => {
  it('renderiza o logo e nome', () => {
    renderWithRouter(<Navbar onBookingClick={vi.fn()} />)
    expect(screen.getByText('BLACK')).toBeInTheDocument()
    expect(screen.getByText('DIAMOND')).toBeInTheDocument()
  })

  it('renderiza links de navegacao', () => {
    renderWithRouter(<Navbar onBookingClick={vi.fn()} />)
    expect(screen.getByText('SOBRE MIM')).toBeInTheDocument()
    expect(screen.getByText('SERVIÇOS')).toBeInTheDocument()
    expect(screen.getByText('GALERIA')).toBeInTheDocument()
    expect(screen.getByText('ONDE ESTAMOS')).toBeInTheDocument()
  })

  it('renderiza botao de agendar', () => {
    renderWithRouter(<Navbar onBookingClick={vi.fn()} />)
    expect(screen.getByText('Agendar')).toBeInTheDocument()
  })

  it('chama onBookingClick ao clicar em Agendar', () => {
    const handleClick = vi.fn()
    renderWithRouter(<Navbar onBookingClick={handleClick} />)

    screen.getByText('Agendar').click()
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('renderiza imagem do logo', () => {
    renderWithRouter(<Navbar onBookingClick={vi.fn()} />)
    const logo = screen.getByAltText('Black Diamond')
    expect(logo).toHaveAttribute('src', '/assets/logo.webp')
  })

  it('tem aria-label no botao de agendamento', () => {
    renderWithRouter(<Navbar onBookingClick={vi.fn()} />)
    const button = screen.getByLabelText('Abrir formulário de agendamento online')
    expect(button).toBeInTheDocument()
  })
})
