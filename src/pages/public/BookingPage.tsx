import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { Link, useParams } from "react-router-dom";
import { BarberCard } from "../../components/BarberCard";
import { ServiceCard } from "../../components/ServiceCard";
import { EmptyState } from "../../components/ui/EmptyState";
import { Icon } from "../../components/ui/Icon";
import { Input } from "../../components/ui/Input";
import { Loading } from "../../components/ui/Loading";
import { Button } from "../../components/ui/Button";
import { Calendar } from "../../components/ui/Calendar";
import { useToast } from "../../hooks/useToast";
import {
  ApiError,
  bookAppointment,
  fetchAvailableSlots,
  fetchPublicShop,
  listBusinessHours,
  toErrorMessage,
} from "../../services/api";
import type { BookResult, PublicShop } from "../../services/api";
import {
  activeWeekStartISO,
  formatDatePt,
  sundayOfWeek,
  todayISO,
  WEEKDAYS_SHORT,
  weekdayOf,
} from "../../utils/date";
import { buildWhatsappLink, formatCurrency } from "../../utils/format";
import { isValidName, isValidWhatsapp } from "../../utils/validation";

export function BookingPage() {
  const { slug } = useParams<{ slug: string }>();
  const { showToast } = useToast();

  const [shop, setShop] = useState<PublicShop | null>(null);
  const [shopError, setShopError] = useState<string | null>(null);
  const [openWeekdays, setOpenWeekdays] = useState<number[]>([]);

  const [step, setStep] = useState(1);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [memberId, setMemberId] = useState<string | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [slot, setSlot] = useState<string | null>(null);

  const [slots, setSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);

  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [stepErrors, setStepErrors] = useState<{ name?: string; whatsapp?: string }>({});

  const [booking, setBooking] = useState<BookResult | null>(null);
  const [bookingBusy, setBookingBusy] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

useEffect(() => {
    setShop(null);
    setShopError(null);
    setBooking(null);
    if (!slug) {
      setShopError("Barbearia não encontrada.");
      return;
    }
    fetchPublicShop(slug)
      .then(async (s) => {
        const hours = await listBusinessHours(s.barbershop.id).catch(() => []);
        setOpenWeekdays(
          hours
            .filter((h) => !h.is_closed && h.open_time && h.close_time)
            .map((h) => h.weekday),
        );
        return s;
      })
      .then(setShop)
      .catch((e) => setShopError(toErrorMessage(e instanceof ApiError ? e : { message: e.message })));
  }, [slug]);

  // Busca horÃ¡rios livres sempre que serviÃ§o/profissional/data mudarem.
  useEffect(() => {
    setSlots([]);
    setSlot(null);
    if (!shop || !serviceId || !memberId || !date) return;
    setSlotsLoading(true);
    fetchAvailableSlots(shop.barbershop.id, serviceId, memberId, date)
      .then(setSlots)
      .catch(() => setSlots([]))
      .finally(() => setSlotsLoading(false));
  }, [shop, serviceId, memberId, date]);

  const selectedService = useMemo(
    () => shop?.services.find((s) => s.id === serviceId) ?? null,
    [shop, serviceId]
  );
  const selectedBarber = useMemo(
    () => shop?.barbers.find((b) => b.id === memberId) ?? null,
    [shop, memberId]
  );

  const today = todayISO();
  const weekStart = activeWeekStartISO(today, openWeekdays);
  const maxDate = sundayOfWeek(weekStart);

  const pickService = (id: string) => {
    setServiceId(id);
    setMemberId(null);
    setDate(null);
    setSlot(null);
    setStep(2);
  };

  const pickBarber = (id: string) => {
    setMemberId(id);
    setDate(null);
    setSlot(null);
    setStep(3);
  };

  const resetToPublic = () => {
    setStep(1);
    setServiceId(null);
    setMemberId(null);
    setDate(null);
    setSlot(null);
    setBooking(null);
    setSubmitError(null);
    setName("");
    setWhatsapp("");
  };

  const handleConfirm = async () => {
    if (!shop || !serviceId || !memberId || !date || !slot) return;

    const errs: typeof stepErrors = {};
    if (!isValidName(name)) errs.name = "Informe seu nome.";
    if (!isValidWhatsapp(whatsapp)) errs.whatsapp = "Informe um WhatsApp vÃ¡lido com DDD.";
    setStepErrors(errs);
    if (Object.keys(errs).length) return;

    setBookingBusy(true);
    setSubmitError(null);
    try {
      const result = await bookAppointment({
        barbershopId: shop.barbershop.id,
        serviceId,
        memberId,
        startAt: slot,
        clientName: name,
        clientWhatsapp: whatsapp,
      });
      setBooking(result);
      setStep(5);
      showToast("HorÃ¡rio agendado!", "success");
    } catch (e) {
      setSubmitError(toErrorMessage(e));
    } finally {
      setBookingBusy(false);
    }
  };

  if (shopError) {
    return (
      <div className="booking-page">
        <BookingNavbar slug={slug} />
        <div className="booking-page__body">
          <EmptyState
            icon="â—†"
            title="Barbearia nÃ£o encontrada"
            description="Confira o endereÃ§o (slug) da pÃ¡gina ou verifique se a barbearia estÃ¡ ativa."
          />
        </div>
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="booking-page">
        <BookingNavbar slug={slug} />
        <div className="booking-page__body">
          <Loading label="Carregando a barbearia..." />
        </div>
      </div>
    );
  }

  if (booking) {
    return (
      <div className="booking-page">
        <BookingNavbar slug={slug} />
        <main className="booking-page__body">
          <SuccessPanel result={booking} shop={shop.barbershop} onRestart={resetToPublic} />
        </main>
        <BookingFooter b={shop.barbershop} s={shop.barbershop.settings} />
      </div>
    );
  }

  return (
    <div className="booking-page">
      <BookingNavbar slug={slug} />
      <BookingHero shop={shop} />

      <main className="booking-page__body">
        <div className="booking-flow">
          <ol className="steps">
            <li className={step >= 1 ? "is-done" : ""}>ServiÃ§o</li>
            <li className={step >= 2 ? "is-done" : ""}>Profissional</li>
            <li className={step >= 3 ? "is-done" : ""}>Data e horÃ¡rio</li>
            <li className={step >= 4 ? "is-done" : ""}>ConfirmaÃ§Ã£o</li>
          </ol>

          {step === 1 ? (
            <section className="booking-step">
              <h2>Escolha o serviÃ§o</h2>
              <div className="card-grid-2">
                {shop.services.map((svc) => (
                  <ServiceCard
                    key={svc.id}
                    service={svc}
                    selected={svc.id === serviceId}
                    onClick={() => pickService(svc.id)}
                  />
                ))}
              </div>
              {shop.services.length === 0 ? (
                <EmptyState icon="âœ‚ï¸" title="Sem serviÃ§os disponÃ­veis" description="Nenhum serviÃ§o ativo no momento." />
              ) : null}
            </section>
          ) : null}

          {step === 2 ? (
            <section className="booking-step">
              <div className="booking-step__head">
                <BackButton onClick={() => setStep(1)} />
                <h2>Escolha o profissional</h2>
              </div>
              <div className="card-grid-3">
                {shop.barbers.map((m) => (
                  <BarberCard
                    key={m.id}
                    barber={m}
                    selected={m.id === memberId}
                    onClick={() => pickBarber(m.id)}
                  />
                ))}
              </div>
              {shop.barbers.length === 0 ? (
                <EmptyState icon="ðŸ’ˆ" title="Sem profissionais disponÃ­veis" description="Volte em breve." />
              ) : null}
            </section>
          ) : null}

{step === 3 ? (
            <section className="booking-step">
              <div className="booking-step__head">
                <BackButton onClick={() => setStep(2)} />
                <h2>Data e horário</h2>
              </div>
              <p className="muted">
                A agenda abre por semana: escolha um dia da semana em curso.
              </p>
              <div className="booking-slot-layout">
                <Calendar
                  value={date ?? today}
                  onChange={(d) => {
                    setDate(d);
                    setSlot(null);
                  }}
                  min={today}
                  max={maxDate}
                />
                <div className="slot-panel">
                  {!date ? (
                    <EmptyState icon="ðŸ“…" title="Escolha uma data" description="Selecione o dia no calendÃ¡rio." />
                  ) : slotsLoading ? (
                    <Loading label="Buscando horÃ¡rios..." />
                  ) : slots.length === 0 ? (
                    <EmptyState
                      icon="â›”"
                      title="Sem horÃ¡rios disponÃ­veis"
                      description={`NÃ£o hÃ¡ horÃ¡rios livres em ${formatDatePt(date)} para este serviÃ§o e profissional. Tente outro dia.`}
                    />
                  ) : (
                    <>
                      <p className="section-label">
                        HorÃ¡rios em {formatDatePt(date)} Â· {WEEKDAYS_SHORT[weekdayOf(date)]}
                      </p>
                      <div className="slot-list">
                        {slots.map((sl) => (
                          <button
                            key={sl}
                            type="button"
                            className={`slot-btn ${slot === sl ? "is-selected" : ""}`}
                            onClick={() => setSlot(sl)}
                          >
                            {new Date(sl).toLocaleTimeString("pt-BR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
              {slot ? (
                <div className="booking-cta">
                  <span>
                    {selectedService?.name} Â· {selectedBarber?.full_name}
                  </span>
                  <Button onClick={() => setStep(4)}>Continuar</Button>
                </div>
              ) : null}
            </section>
          ) : null}

          {step === 4 ? (
            <section className="booking-step">
              <div className="booking-step__head">
                <BackButton onClick={() => setStep(3)} />
                <h2>ConfirmaÃ§Ã£o</h2>
              </div>

              <div className="booking-review">
                <dl>
                  <div>
                    <dt>ServiÃ§o</dt>
                    <dd>{selectedService?.name}</dd>
                  </div>
                  <div>
                    <dt>Profissional</dt>
                    <dd>{selectedBarber?.full_name}</dd>
                  </div>
                  <div>
                    <dt>Data</dt>
                    <dd>{slot ? formatDatePt(slot.slice(0, 10)) : "â€”"}</dd>
                  </div>
                  <div>
                    <dt>HorÃ¡rio</dt>
                    <dd>
                      {slot
                        ? new Date(slot).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
                        : "â€”"}
                    </dd>
                  </div>
                  <div>
                    <dt>Valor</dt>
                    <dd className="accent">{formatCurrency(selectedService?.price ?? 0)}</dd>
                  </div>
                </dl>
              </div>

              <div className="booking-form">
                <Input
                  label="Seu nome"
                  name="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  error={stepErrors.name}
                  placeholder="Como o barbeiro deve te chamar"
                  autoComplete="name"
                />
                <Input
                  label="WhatsApp"
                  name="whatsapp"
                  inputMode="tel"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  error={stepErrors.whatsapp}
                  placeholder="(11) 99999-0000"
                  autoComplete="tel"
                />
                {submitError ? <p className="form-error">{submitError}</p> : null}
                <p className="field__hint">
                  VocÃª nÃ£o precisa criar conta. O horÃ¡rio Ã© reservado apenas depois da confirmaÃ§Ã£o.
                </p>
                <Button onClick={handleConfirm} loading={bookingBusy} className="w-full">
                  Confirmar agendamento
                </Button>
                <button type="button" className="link-btn w-full" onClick={() => setStep(3)}>
                  <Icon name="chevronLeft" size={14} /> Voltar para os horÃ¡rios
                </button>
              </div>
            </section>
          ) : null}
        </div>
      </main>

      <BookingFooter b={shop.barbershop} s={shop.barbershop.settings} />
    </div>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="link-btn" onClick={onClick}>
      <Icon name="chevronLeft" size={14} /> Voltar
    </button>
  );
}

function BookingNavbar({ slug }: { slug?: string }) {
  return (
    <header className="booking-nav">
      <Link to={`/agendar/${slug ?? ""}`} className="booking-nav__brand">
        <span className="booking-nav__mark">â—†</span>
        <strong>BLACK DIAMOND</strong>
      </Link>
      <Link to="/login" className="link-btn">
        Painel
      </Link>
    </header>
  );
}

function BookingHero({ shop }: { shop: PublicShop }) {
  const b = shop.barbershop;
  const s = b.settings;
  return (
    <section
      className="booking-hero"
      style={{ "--accent": b.primary_color, "--accent-ink": readableInk(b.primary_color) } as CSSProperties}
    >
      <div className="booking-hero__inner">
        <div className="booking-hero__brand">
          {b.logo_url ? (
            <img src={b.logo_url} alt={b.name} className="booking-hero__logo" />
          ) : (
            <span className="booking-hero__mark">â—†</span>
          )}
          <div>
            <h1>{b.name}</h1>
            <p>{b.description ?? "Barbearia"}</p>
          </div>
        </div>
        {b.about ? <p className="booking-hero__about">{b.about}</p> : null}
        <ul className="booking-hero__meta">
          {s.show_address && b.address ? <li>{b.address}</li> : null}
          {s.show_whatsapp && b.whatsapp ? (
            <li>
              <a href={buildWhatsappLink(b.whatsapp, "OlÃ¡! Gostaria de saber mais.")} target="_blank" rel="noreferrer">
                {b.whatsapp}
              </a>
            </li>
          ) : null}
          {s.show_instagram && b.instagram ? (
            <li>
              <a href={`https://instagram.com/${b.instagram.replace("@", "")}`} target="_blank" rel="noreferrer">
                @{b.instagram.replace("@", "")}
              </a>
            </li>
          ) : null}
        </ul>
      </div>
    </section>
  );
}

function SuccessPanel({
  result,
  shop,
  onRestart,
}: {
  result: BookResult;
  shop: { name: string; whatsapp: string | null; primary_color: string };
  onRestart: () => void;
}) {
  const time = new Date(result.start_at).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const waText = [
    `*${shop.name}* â€” Agendamento realizado`,
    "",
    `Cliente: ${result.client_name}`,
    `ServiÃ§o: ${result.service_name}`,
    `Barbeiro: ${result.member_name}`,
    `Data: ${formatDatePt(result.start_at.slice(0, 10))}`,
    `HorÃ¡rio: ${time}`,
    `Valor: ${formatCurrency(result.service_price)}`,
    "Status: Agendado",
    "",
    "Venho confirmar meu horÃ¡rio.",
  ].join("\n");

  return (
    <div className="booking-success">
      <div className="booking-success__icon">
        <Icon name="check" size={26} />
      </div>
      <h2>HorÃ¡rio garantido!</h2>
      <p className="text-muted">Seu agendamento foi registrado. Confira os dados:</p>

      <dl className="booking-success__list">
        <div>
          <dt>Cliente</dt>
          <dd>{result.client_name}</dd>
        </div>
        <div>
          <dt>ServiÃ§o</dt>
          <dd>{result.service_name}</dd>
        </div>
        <div>
          <dt>Barbeiro</dt>
          <dd>{result.member_name}</dd>
        </div>
        <div>
          <dt>Data</dt>
          <dd>{formatDatePt(result.start_at.slice(0, 10))}</dd>
        </div>
        <div>
          <dt>HorÃ¡rio</dt>
          <dd>{time}</dd>
        </div>
        <div>
          <dt>Valor</dt>
          <dd className="accent">{formatCurrency(result.service_price)}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>Agendado</dd>
        </div>
      </dl>

      <a
        className="btn btn--primary w-full"
        href={buildWhatsappLink(shop.whatsapp, waText)}
        target="_blank"
        rel="noreferrer"
      >
        <Icon name="phone" size={16} />
        Confirmar pelo WhatsApp
      </a>

      <button type="button" className="btn btn--ghost w-full" onClick={onRestart}>
        Fazer outro agendamento
      </button>
    </div>
  );
}

export function BookingFooter({
  b,
  s,
}: {
  b: { name: string; address: string | null; whatsapp: string | null; instagram: string | null };
  s: {
    show_address: boolean;
    show_instagram: boolean;
    show_whatsapp: boolean;
    show_credits: boolean;
    credits_text: string;
    barberflow_branding: boolean;
  };
}) {
  return (
    <footer className="booking-footer">
      <div className="booking-footer__inner">
        {s.show_whatsapp && b.whatsapp ? (
          <a href={buildWhatsappLink(b.whatsapp, "OlÃ¡!")} target="_blank" rel="noreferrer">
            WhatsApp
          </a>
        ) : null}
        {s.show_instagram && b.instagram ? (
          <a href={`https://instagram.com/${b.instagram.replace("@", "")}`} target="_blank" rel="noreferrer">
            Instagram
          </a>
        ) : null}
        {s.show_address && b.address ? <span>{b.address}</span> : null}
{s.show_credits ? (
          <span className="booking-footer__credit">{s.credits_text || b.name}</span>
        ) : null}
      </div>
    </footer>
  );
}

/** Cor de texto legÃ­vel sobre a cor de destaque (contraste). */
export function readableInk(hex: string): string {
  const clean = hex.replace("#", "");
  if (clean.length < 6) return "#16130c";
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? "#16130c" : "#ffffff";
}
