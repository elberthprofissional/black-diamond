import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import About from './About'

vi.mock('../contexts/BarberSettingsContext', () => ({
  useBarberSettings: () => ({
    barberName: '',
    barberPhone: '',
    barberPhoto: '',
    barberBio: '',
    loading: false,
  }),
}))

describe('About', () => {
  it('renderiza o titulo Sobre Mim', () => {
    render(<About />)
    expect(screen.getByText('Sobre Mim')).toBeInTheDocument()
  })

  it('renderiza o nome Tato', () => {
    render(<About />)
    expect(screen.getByText('TATO.')).toBeInTheDocument()
  })

  it('renderiza a descricao', () => {
    render(<About />)
    expect(screen.getByText(/Acredito que a barbearia/)).toBeInTheDocument()
  })

  it('renderiza a frase de efeito', () => {
    render(<About />)
    expect(screen.getByText(/Não sou o melhor, mas sou o melhor para você/)).toBeInTheDocument()
  })

  it('renderiza a imagem do barbeiro', () => {
    render(<About />)
    const images = screen.getAllByAltText('TATO - Barbeiro')
    expect(images.length).toBeGreaterThan(0)
  })

  it('tem secao com id=sobre para navegacao', () => {
    render(<About />)
    const section = document.getElementById('sobre')
    expect(section).toBeInTheDocument()
  })
})
