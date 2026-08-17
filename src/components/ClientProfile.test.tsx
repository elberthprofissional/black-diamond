import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import ClientProfile from './ClientProfile';

// Mock framer-motion to avoid animation issues in tests
function createMotionComponent<T extends Record<string, unknown>>(tag: string) {
  return ({ children, ...props }: T) => {
    /* eslint-disable @typescript-eslint/no-unused-vars */
    const {
      initial,
      animate,
      exit,
      transition,
      whileTap,
      whileHover,
      whileInView,
      variants,
      layout,
      ...validProps
    } = props as Record<string, unknown>;
    /* eslint-enable @typescript-eslint/no-unused-vars */
    return React.createElement(tag, validProps, children);
  };
}

vi.mock('framer-motion', () => {
  const motion: Record<string, ReturnType<typeof createMotionComponent>> = {};
  ['div', 'button', 'span', 'p'].forEach((tag) => {
    motion[tag] = createMotionComponent(tag);
  });
  return {
    motion,
    AnimatePresence: ({ children }: Record<string, unknown>) => <>{children}</>,
  };
});

import React from 'react';

// Mock API
const mockGetBookingsByPhone = vi.hoisted(() => vi.fn());
const mockGetClientByPhone = vi.hoisted(() => vi.fn());
const mockGetClientDashboard = vi.hoisted(() => vi.fn());
const mockGetAvailableCoupons = vi.hoisted(() => vi.fn());
const mockGetClientCoupons = vi.hoisted(() => vi.fn());
const mockResgatarCupom = vi.hoisted(() => vi.fn());

vi.mock('../lib/api', () => ({
  getBookingsByPhone: mockGetBookingsByPhone,
  getClientByPhone: mockGetClientByPhone,
  cancelBooking: vi.fn(),
  getServices: vi.fn().mockResolvedValue([]),
  getClientDashboard: mockGetClientDashboard,
  getClientMilestonesPublic: vi.fn().mockResolvedValue([]),
  getAvailableCoupons: mockGetAvailableCoupons,
  getClientCoupons: mockGetClientCoupons,
  resgatarCupom: mockResgatarCupom,
}));

vi.mock('../lib/api/mensalista', () => ({
  getMensalistaPlanName: vi.fn().mockResolvedValue(null),
  getMensalistaPlanServices: vi.fn().mockResolvedValue([]),
}));

const mockVerificarSenhaCliente = vi.hoisted(() => vi.fn());
const mockCriarSenhaCliente = vi.hoisted(() => vi.fn());
const mockAtualizarEmailCliente = vi.hoisted(() => vi.fn());
const mockAlterarSenhaCliente = vi.hoisted(() => vi.fn());

vi.mock('../lib/api/clientAuth', () => ({
  verificarSenhaCliente: mockVerificarSenhaCliente,
  criarSenhaCliente: mockCriarSenhaCliente,
  atualizarEmailCliente: mockAtualizarEmailCliente,
  alterarSenhaCliente: mockAlterarSenhaCliente,
}));

vi.mock('../lib/logger', () => ({
  logError: vi.fn(),
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const booking = {
  id: 'b1',
  booking_date: '2026-08-10',
  booking_time: '10:00:00',
  status: 'confirmed',
  total_price: 35,
  total_duration: 40,
  service_ids: ['s1'],
  clients: { name: 'João Silva', phone: '11999999999' },
};

const dashboardStats = {
  stats: {
    historical_visits: 3,
    historical_spent: 105,
    last_visit_date: '2026-07-01',
    is_mensalista: false,
    mensalista_plan_id: null,
    mensalista_expires_at: null,
  },
  history: [],
};

const renderPage = () => {
  return render(
    <MemoryRouter>
      <ClientProfile />
    </MemoryRouter>
  );
};

// Navega até a tela dedicada de Cupons (sidebar desktop + bottom tab mobile)
const goToCouponsTab = async () => {
  const couponButtons = screen.getAllByRole('button', { name: /cupons/i });
  await userEvent.click(couponButtons[0] ?? couponButtons[0]!);
};

describe('ClientProfile (sem código de acesso)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockGetBookingsByPhone.mockResolvedValue([booking]);
    mockGetClientByPhone.mockResolvedValue({ id: 'c1', name: 'João Silva', phone: '11999999999' });
    mockGetClientDashboard.mockResolvedValue(dashboardStats);
    mockVerificarSenhaCliente.mockResolvedValue({ ok: false, needs_password: false });
    mockCriarSenhaCliente.mockResolvedValue({ ok: true });
    mockAtualizarEmailCliente.mockResolvedValue({ ok: true, message: 'E-mail atualizado!' });
    mockAlterarSenhaCliente.mockResolvedValue({ ok: true });
    mockGetAvailableCoupons.mockResolvedValue([]);
    mockGetClientCoupons.mockResolvedValue([]);
    mockResgatarCupom.mockResolvedValue({ ok: true, message: 'Cupom resgatado!' });
  });

  it('mostra a tela de telefone no primeiro acesso', () => {
    renderPage();

    expect(screen.getByText(/Digite seu telefone/)).toBeInTheDocument();
    // Fluxo antigo de código não existe mais
    expect(screen.queryByText(/Código de acesso/)).not.toBeInTheDocument();
  });

  it('telefone válido entra direto no dashboard, sem verificar código', async () => {
    renderPage();

    const phoneInput = screen.getByPlaceholderText('(00) 00000-0000');
    await userEvent.type(phoneInput, '11999999999');
    await userEvent.click(screen.getByText('Entrar'));

    await waitFor(() => {
      expect(screen.getByText('Agendamentos')).toBeInTheDocument();
    });
    // Não deve existir a etapa de digitar código
    expect(screen.queryByText(/Digite o código/)).not.toBeInTheDocument();
    expect(mockGetBookingsByPhone).toHaveBeenCalledWith('11999999999');
  });

  it('desabilita o botão até o telefone ter 11 dígitos', async () => {
    renderPage();

    const phoneInput = screen.getByPlaceholderText('(00) 00000-0000');
    const submitBtn = screen.getByText('Entrar').closest('button');
    expect(submitBtn).toBeDisabled();

    await userEvent.type(phoneInput, '11999');
    expect(submitBtn).toBeDisabled();

    await userEvent.type(phoneInput, '999999');
    expect(submitBtn).not.toBeDisabled();
  });

  it('sessão salva restaura o dashboard direto, sem pedir telefone', async () => {
    localStorage.setItem(
      'bd_client_session',
      JSON.stringify({
        phone: '11988888888',
        name: 'Maria Oliveira',
        expiresAt: Date.now() + 60_000,
      })
    );

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Agendamentos')).toBeInTheDocument();
    });
    expect(mockGetBookingsByPhone).toHaveBeenCalledWith('11988888888');
  });

  it('salva a sessão ao entrar pelo telefone', async () => {
    renderPage();

    const phoneInput = screen.getByPlaceholderText('(00) 00000-0000');
    await userEvent.type(phoneInput, '11999999999');
    await userEvent.click(screen.getByText('Entrar'));

    await waitFor(() => {
      const session = JSON.parse(localStorage.getItem('bd_client_session') || '{}');
      expect(session.phone).toBe('11999999999');
      expect(session.name).toBe('João Silva');
    });
  });

  it('mostra o dashboard com identidade da marca após login', async () => {
    renderPage();

    const phoneInput = screen.getByPlaceholderText('(00) 00000-0000');
    await userEvent.type(phoneInput, '11999999999');
    await userEvent.click(screen.getByText('Entrar'));

    await waitFor(() => {
      expect(screen.getByText('BLACK')).toBeInTheDocument();
      expect(screen.getByText('DIAMOND')).toBeInTheDocument();
    });
  });

  it('resgata cupom da vitrine com 1 clique', async () => {
    mockGetAvailableCoupons.mockResolvedValue([
      {
        id: 'c1',
        code: 'DESCONTO10',
        description: '10% em corte',
        discount_type: 'percentage',
        discount_value: 10,
        valid_from: '2026-01-01',
        valid_until: null,
        max_uses: null,
        current_uses: 0,
        is_active: true,
        applicable_service_ids: [],
      },
    ]);
    mockGetClientCoupons.mockResolvedValueOnce([]).mockResolvedValue([
      {
        id: 'cc1',
        coupon_id: 'c1',
        code: 'DESCONTO10',
        description: '10% em corte',
        discount_type: 'percentage',
        discount_value: 10,
        valid_from: '2026-01-01',
        valid_until: null,
        max_uses: null,
        current_uses: 0,
        is_active: true,
        redeemed_at: '2026-08-01',
        used_at: null,
      },
    ]);
    mockResgatarCupom.mockResolvedValue({
      ok: true,
      message: 'Cupom resgatado!',
      coupon_id: 'c1',
      code: 'DESCONTO10',
    });
    localStorage.setItem(
      'bd_client_session',
      JSON.stringify({
        phone: '11988888888',
        name: 'Maria Oliveira',
        expiresAt: Date.now() + 60_000,
      })
    );

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Agendamentos')).toBeInTheDocument();
    });
    await goToCouponsTab();

    await waitFor(() => {
      expect(screen.getByText('DESCONTO10')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole('button', { name: /resgatar/i }));

    await waitFor(() => {
      expect(mockResgatarCupom).toHaveBeenCalledWith('11988888888', 'DESCONTO10');
    });
    await waitFor(() => {
      // Card da oferta vira "✓ Resgatado" + feedback + cupom na lista de resgatados
      expect(screen.getAllByText(/resgatado/i).length).toBeGreaterThan(0);
      // "Oferta disponível" (card) + "Disponível" (status do resgatado)
      expect(screen.getAllByText(/disponível/i).length).toBeGreaterThan(0);
      expect(
        screen.getByRole('button', { name: /usar cupom|usar no agendamento/i })
      ).toBeInTheDocument();
    });
  });

  it('carrega a vitrine mesmo quando o lookup do cliente falha', async () => {
    mockGetClientByPhone.mockResolvedValue(null); // lookup falha (ex.: rate limit)
    mockGetAvailableCoupons.mockResolvedValue([
      {
        id: 'c1',
        code: 'DESCONTO10',
        description: '10% em corte',
        discount_type: 'percentage',
        discount_value: 10,
        valid_from: '2026-01-01',
        valid_until: null,
        max_uses: null,
        current_uses: 0,
        is_active: true,
        applicable_service_ids: [],
      },
    ]);
    mockGetClientCoupons.mockResolvedValue([]);
    localStorage.setItem(
      'bd_client_session',
      JSON.stringify({
        phone: '11988888888',
        name: 'Maria Oliveira',
        expiresAt: Date.now() + 60_000,
      })
    );

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Agendamentos')).toBeInTheDocument();
    });
    await goToCouponsTab();

    await waitFor(() => {
      expect(screen.getByText('DESCONTO10')).toBeInTheDocument();
    });
  });

  it('exibe o desconto fixo com formatação monetária brasileira (milhar com ponto, centavos com vírgula)', async () => {
    mockGetAvailableCoupons.mockResolvedValue([
      {
        id: 'c1',
        code: 'FIXO111',
        description: 'Corte + barba',
        discount_type: 'fixed',
        discount_value: 111,
        valid_from: '2026-01-01',
        valid_until: null,
        max_uses: null,
        current_uses: 0,
        is_active: true,
        applicable_service_ids: [],
      },
      {
        id: 'c2',
        code: 'FIXO1500',
        description: 'Combo premium',
        discount_type: 'fixed',
        discount_value: 1500,
        valid_from: '2026-01-01',
        valid_until: null,
        max_uses: null,
        current_uses: 0,
        is_active: true,
        applicable_service_ids: [],
      },
      {
        id: 'c3',
        code: 'FIXO1050',
        description: 'Degradê + finalização',
        discount_type: 'fixed',
        discount_value: 10.5,
        valid_from: '2026-01-01',
        valid_until: null,
        max_uses: null,
        current_uses: 0,
        is_active: true,
        applicable_service_ids: [],
      },
    ]);
    mockGetClientCoupons.mockResolvedValue([]);
    localStorage.setItem(
      'bd_client_session',
      JSON.stringify({
        phone: '11988888888',
        name: 'Maria Oliveira',
        expiresAt: Date.now() + 60_000,
      })
    );

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Agendamentos')).toBeInTheDocument();
    });
    await goToCouponsTab();

    await waitFor(() => {
      expect(screen.getByText('R$ 111 OFF')).toBeInTheDocument();
    });
    // Inteiro >= 1000: milhar com ponto (1500 → "R$ 1.500 OFF")
    expect(screen.getByText('R$ 1.500 OFF')).toBeInTheDocument();
    // Com centavos: vírgula decimal (10,50 → "R$ 10,50 OFF")
    expect(screen.getByText('R$ 10,50 OFF')).toBeInTheDocument();
    // Nunca "R$ 1500 OFF" sem ponto de milhar
    expect(screen.queryByText('R$ 1500 OFF')).not.toBeInTheDocument();
  });

  it('mostra estado vazio quando o barbeiro ainda não publicou cupons', async () => {
    mockGetAvailableCoupons.mockResolvedValue([]);
    mockGetClientCoupons.mockResolvedValue([]);
    localStorage.setItem(
      'bd_client_session',
      JSON.stringify({
        phone: '11988888888',
        name: 'Maria Oliveira',
        expiresAt: Date.now() + 60_000,
      })
    );

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Agendamentos')).toBeInTheDocument();
    });
    await goToCouponsTab();

    await waitFor(() => {
      expect(screen.getByText('Nenhum cupom disponível no momento')).toBeInTheDocument();
    });
  });

  it('mostra erro amigável ao tentar resgatar cupom já resgatado', async () => {
    mockGetAvailableCoupons.mockResolvedValue([
      {
        id: 'c1',
        code: 'DESCONTO10',
        description: '10% em corte',
        discount_type: 'percentage',
        discount_value: 10,
        valid_from: '2026-01-01',
        valid_until: null,
        max_uses: null,
        current_uses: 0,
        is_active: true,
        applicable_service_ids: [],
      },
    ]);
    mockResgatarCupom.mockResolvedValue({
      ok: false,
      message: 'Você já resgatou este cupom.',
    });
    localStorage.setItem(
      'bd_client_session',
      JSON.stringify({
        phone: '11988888888',
        name: 'Maria Oliveira',
        expiresAt: Date.now() + 60_000,
      })
    );

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Agendamentos')).toBeInTheDocument();
    });
    await goToCouponsTab();

    await waitFor(() => {
      expect(screen.getByText('DESCONTO10')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole('button', { name: /resgatar/i }));

    await waitFor(() => {
      expect(screen.getByText(/já resgatou este cupom/i)).toBeInTheDocument();
    });
  });

  it('Configurações mobile mostra lista estilo admin (Conta, Segurança, Sair da conta)', async () => {
    localStorage.setItem(
      'bd_client_session',
      JSON.stringify({
        phone: '11988888888',
        name: 'Maria Oliveira',
        expiresAt: Date.now() + 60_000,
      })
    );

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Agendamentos')).toBeInTheDocument();
    });

    // Navega até Configurações (sidebar desktop + bottom tab mobile)
    const settingsBtns = screen.getAllByRole('button', { name: /config/i });
    await userEvent.click(settingsBtns[0] ?? settingsBtns[0]!);

    // Lista de opções estilo admin
    await waitFor(() => {
      expect(screen.getAllByText('Conta').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Segurança').length).toBeGreaterThan(0);
      expect(screen.getAllByRole('button', { name: /sair da conta/i }).length).toBeGreaterThan(0);
    });
  });

  it('Configurações: clicar em Conta abre a seção e voltar retorna à lista', async () => {
    localStorage.setItem(
      'bd_client_session',
      JSON.stringify({
        phone: '11988888888',
        name: 'Maria Oliveira',
        expiresAt: Date.now() + 60_000,
      })
    );

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Agendamentos')).toBeInTheDocument();
    });

    const settingsBtns = screen.getAllByRole('button', { name: /config/i });
    await userEvent.click(settingsBtns[0] ?? settingsBtns[0]!);

    await waitFor(() => {
      expect(screen.getAllByText('Conta').length).toBeGreaterThan(0);
    });
    // Item da lista "Conta" (span) — o primeiro botão com texto exato
    const contaItem = screen.getAllByRole('button', { name: /^conta$/i });
    await userEvent.click(contaItem[0] ?? contaItem[0]!);

    // Seção Conta com os dados do cliente (renderizada no mobile e no desktop)
    await waitFor(() => {
      expect(screen.getAllByText('Nome completo').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Maria Oliveira').length).toBeGreaterThan(0);
    });

    // Botão voltar retorna à lista (mobile)
    await userEvent.click(screen.getByRole('button', { name: /voltar/i }));
    await waitFor(() => {
      expect(screen.getAllByText('Segurança').length).toBeGreaterThan(0);
    });
  });

  it('mostra aviso de confirmação ao clicar em "Sair da conta" (mesmo do admin)', async () => {
    localStorage.setItem(
      'bd_client_session',
      JSON.stringify({
        phone: '11988888888',
        name: 'Maria Oliveira',
        expiresAt: Date.now() + 60_000,
      })
    );

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Agendamentos')).toBeInTheDocument();
    });

    const logoutBtn = screen.getAllByRole('button', { name: /sair da conta/i })[0];
    await userEvent.click(logoutBtn!);

    // Aviso idêntico ao do admin: "Sair da conta?" com botões Sair/Manter
    await waitFor(() => {
      expect(screen.getByText('Sair da conta?')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /^sair$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /manter/i })).toBeInTheDocument();
  });

  it('"Manter" no aviso de logout mantém o cliente no dashboard', async () => {
    localStorage.setItem(
      'bd_client_session',
      JSON.stringify({
        phone: '11988888888',
        name: 'Maria Oliveira',
        expiresAt: Date.now() + 60_000,
      })
    );

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Agendamentos')).toBeInTheDocument();
    });

    await userEvent.click(screen.getAllByRole('button', { name: /sair da conta/i })[0]!);
    await waitFor(() => {
      expect(screen.getByText('Sair da conta?')).toBeInTheDocument();
    });
    await userEvent.click(screen.getByRole('button', { name: /manter/i }));

    // Continua logado no dashboard
    expect(screen.getByText('Agendamentos')).toBeInTheDocument();
    expect(screen.queryByText('Sair da conta?')).not.toBeInTheDocument();
    // Sessão continua salva
    expect(JSON.parse(localStorage.getItem('bd_client_session') || '{}').phone).toBe('11988888888');
  });

  it('"Sair" no aviso de logout desloga e volta para a tela de telefone', async () => {
    localStorage.setItem(
      'bd_client_session',
      JSON.stringify({
        phone: '11988888888',
        name: 'Maria Oliveira',
        expiresAt: Date.now() + 60_000,
      })
    );

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Agendamentos')).toBeInTheDocument();
    });

    await userEvent.click(screen.getAllByRole('button', { name: /sair da conta/i })[0]!);
    await waitFor(() => {
      expect(screen.getByText('Sair da conta?')).toBeInTheDocument();
    });
    await userEvent.click(screen.getByRole('button', { name: /^sair$/i }));

    await waitFor(() => {
      expect(screen.getByText(/Digite seu telefone/)).toBeInTheDocument();
    });
    // Sessão limpa
    expect(localStorage.getItem('bd_client_session')).toBeNull();
  });
});
