import { expect, type Page } from '@playwright/test';

/**
 * Helpers do fluxo de agendamento.
 *
 * A ordem do wizard varia conforme a versão deployada:
 *  - Deploy atual (prod):  Dados → Barbeiro → Serviços → Data → Revisar
 *  - Versão nova (local):  Dados → Serviços → Barbeiro → Data → Revisar
 * Em modo solo (1 barbeiro) o passo de barbeiro não existe (4 passos).
 *
 * Os helpers são resilientes à ordem: verificam se o card de barbeiro está
 * presente e o selecionam quando necessário.
 */

/**
 * Seleciona o primeiro barbeiro e avança, se a etapa estiver presente.
 * Compatível com o deploy atual (card sem data-testid, mas com aria-pressed)
 * e com a versão nova (data-testid="barber-card"). Só age quando o título
 * "Escolha o barbeiro" está visível — os service-cards também têm aria-pressed.
 */
export async function selectBarberIfPresent(page: Page) {
  const barberHeading = page.locator('h2:has-text("Escolha o barbeiro")').first();
  if (!(await barberHeading.isVisible({ timeout: 2000 }).catch(() => false))) return;
  const barberCard = page.locator('[data-testid="barber-card"], button[aria-pressed]').first();
  await barberCard.click();
  await page.click('[data-testid="next-step"]');
}

/**
 * A partir da etapa de dados, avança até a etapa de serviços (atravessando a
 * etapa de barbeiro quando ela vier ANTES dos serviços — ordem do deploy atual).
 */
export async function advanceToServices(page: Page) {
  await page.click('[data-testid="next-step"]');
  await selectBarberIfPresent(page);
  await expect(page.locator('[data-testid="service-card"]').first()).toBeVisible({
    timeout: 10000,
  });
}

/**
 * Fluxo completo até a revisão: dados → serviços (seleciona o 1º) → barbeiro
 * (se vier depois) → data/horário. Ao final a etapa de revisão está visível.
 * @param slotIndex índice do horário a selecionar (0 = primeiro disponível).
 */
export async function selectFirstServiceAndDateTime(page: Page, slotIndex = 0) {
  await advanceToServices(page);
  await page.click('[data-testid="service-card"]:first-child');
  await page.click('[data-testid="next-step"]');
  await selectBarberIfPresent(page);
  await selectDateTime(page, slotIndex);
}

/**
 * Seleciona data e horário na etapa de agenda.
 * @param slotIndex índice do horário a selecionar (0 = primeiro disponível).
 */
async function selectDateTime(page: Page, slotIndex = 0) {
  const dateButtons = page.locator('[data-testid="date-picker"]');
  await expect(dateButtons.first()).toBeVisible({ timeout: 10000 });

  // A agenda pode ter dias cheios (bookings de teste acumulados): procura a
  // primeira data com horário livre em vez de travar na primeira do calendário.
  // O primeiro fetch do dia é lento (cold start da conexão) e cada clique
  // dispara 2 RPCs públicos rate-limited (10/min por IP) — então a primeira
  // data espera até 12s (quase sempre é a livre) e as seguintes 4s, com pausa.
  // Clicar rápido demais estoura o rate limit e a lista de horários some.
  const dayCount = Math.min(await dateButtons.count(), 7);
  for (let i = 0; i < dayCount; i++) {
    await dateButtons.nth(i).click();
    const firstSlot = page.locator('[data-testid="time-slot"]').first();
    const probeMs = i === 0 ? 12000 : 4000;
    if (await firstSlot.isVisible({ timeout: probeMs }).catch(() => false)) break;
    await page.waitForTimeout(300);
  }

  const slot = page.locator('[data-testid="time-slot"]').nth(slotIndex);
  await expect(slot).toBeVisible({ timeout: 10000 });

  // A lista de horários pode re-renderizar logo após carregar (fetch assíncrono
  // de slots/agendamentos), desconectando o botão no meio do clique (erro
  // "element was detached from the DOM"). Aguarda estabilizar e tenta de novo.
  await page.waitForTimeout(400);
  await slot.click({ timeout: 8000 }).catch(async () => {
    await slot.waitFor({ state: 'visible', timeout: 10000 });
    await slot.click({ timeout: 8000 });
  });
  await page.click('[data-testid="next-step"]');
}

/** Confirma o agendamento na última etapa e espera a tela de sucesso. */
export async function confirmBooking(page: Page) {
  await expect(page.locator('[data-testid="confirm-booking"]').first()).toBeVisible({
    timeout: 10000,
  });
  await page.click('[data-testid="confirm-booking"]:visible');
  await expect(
    page
      .locator('text=horário foi agendado')
      .or(page.locator('text=agendamento foi salvo'))
      .or(page.locator('text=agendamento confirmado'))
      .first()
  ).toBeVisible({ timeout: 20000 });
}
