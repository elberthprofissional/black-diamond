import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import ErrorBoundary from './ErrorBoundary'

const ThrowError = () => {
  throw new Error('Erro de teste')
}

describe('ErrorBoundary', () => {
  it('renderiza children quando nao ha erro', () => {
    render(
      <ErrorBoundary>
        <div>Conteudo normal</div>
      </ErrorBoundary>
    )
    expect(screen.getByText('Conteudo normal')).toBeInTheDocument()
  })

  it('renderiza UI de erro quando child lanca erro', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    )
    
    expect(screen.getByText('Algo deu errado')).toBeInTheDocument()
    expect(screen.getByText(/Ocorreu um erro inesperado/)).toBeInTheDocument()
    consoleSpy.mockRestore()
  })

  it('renderiza botao de recarregar', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    )
    
    expect(screen.getByText('Recarregar')).toBeInTheDocument()
    consoleSpy.mockRestore()
  })

  it('tem role=alert para acessibilidade', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    )
    
    expect(screen.getByRole('alert')).toBeInTheDocument()
    consoleSpy.mockRestore()
  })

  it('tem aria-live assertive', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    )
    
    const alertElement = screen.getByRole('alert')
    expect(alertElement).toHaveAttribute('aria-live', 'assertive')
    consoleSpy.mockRestore()
  })
})
