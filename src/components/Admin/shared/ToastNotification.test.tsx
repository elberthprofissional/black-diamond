import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ToastNotification from './ToastNotification'

describe('ToastNotification', () => {
  it('nao renderiza nada quando toast e null', () => {
    const { container } = render(<ToastNotification toast={null} />)
    const liveRegion = container.querySelector('[aria-live]')
    expect(liveRegion).toBeEmptyDOMElement()
  })

  it('renderiza mensagem de sucesso', () => {
    render(<ToastNotification toast={{ message: 'Agendamento criado!', type: 'success' }} />)
    expect(screen.getByText('Agendamento criado!')).toBeInTheDocument()
  })

  it('renderiza mensagem de erro', () => {
    render(<ToastNotification toast={{ message: 'Erro ao salvar', type: 'error' }} />)
    expect(screen.getByText('Erro ao salvar')).toBeInTheDocument()
  })

  it('tem role=alert para acessibilidade', () => {
    render(<ToastNotification toast={{ message: 'Teste', type: 'success' }} />)
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('tem aria-live assertive', () => {
    render(<ToastNotification toast={{ message: 'Teste', type: 'success' }} />)
    const liveRegion = screen.getByRole('alert').closest('[aria-live]')
    expect(liveRegion).toHaveAttribute('aria-live', 'assertive')
  })

  it('mostra indicador verde para sucesso', () => {
    const { container } = render(<ToastNotification toast={{ message: 'Ok', type: 'success' }} />)
    const dot = container.querySelector('.bg-\\[\\#C5A059\\]')
    expect(dot).toBeInTheDocument()
  })

  it('mostra indicador vermelho para erro', () => {
    const { container } = render(<ToastNotification toast={{ message: 'Erro', type: 'error' }} />)
    const dot = container.querySelector('.bg-red-500')
    expect(dot).toBeInTheDocument()
  })
})
