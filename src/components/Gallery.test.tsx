import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Gallery from './Gallery'

describe('Gallery', () => {
  it('renderiza o titulo Galeria', () => {
    render(<Gallery />)
    expect(screen.getByText('Galeria')).toBeInTheDocument()
  })

  it('renderiza o subtitulo Meus Trabalhos', () => {
    render(<Gallery />)
    expect(screen.getByText(/MEUS/)).toBeInTheDocument()
    expect(screen.getByText(/TRABALHOS/)).toBeInTheDocument()
  })

  it('renderiza as imagens da galeria', () => {
    render(<Gallery />)
    const images = screen.getAllByRole('img')
    expect(images.length).toBeGreaterThan(0)
  })

  it('tem role=region para acessibilidade', () => {
    render(<Gallery />)
    const region = screen.getByRole('region', { name: /galeria de trabalhos/i })
    expect(region).toBeInTheDocument()
  })

  it('imagens tem role=group e aria-roledescription=slide', () => {
    render(<Gallery />)
    const slides = screen.getAllByRole('group')
    expect(slides.length).toBeGreaterThan(0)
    slides.forEach(slide => {
      expect(slide).toHaveAttribute('aria-roledescription', 'slide')
    })
  })

  it('link para Instagram esta presente', () => {
    render(<Gallery />)
    expect(screen.getByText(/siga no Instagram/)).toBeInTheDocument()
  })

  it('tem secao com id=galeria para navegacao', () => {
    render(<Gallery />)
    const section = document.getElementById('galeria')
    expect(section).toBeInTheDocument()
  })
})
