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
  lastOpenOfWeek,
  todayISO,
  WEEKDAYS_SHORT,
  weekdayOf,
} from "../../utils/date";
import { buildWhatsappLink, formatCurrency, formatShortAddress, formatWhatsapp } from "../../utils/format";
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

  // Busca horários livres sempre que serviço/profissional/data mudarem.
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
  const maxDate = lastOpenOfWeek(weekStart, openWeekdays);

  const pickService = (id: string) => {
    setServiceId(id);
    setMemberId(null);
    setDate(null);
    setSlot(null);
    setStep(3);
  };

  const pickBarber = (id: string) => {
    setMemberId(id);
    setDate(null);
    setSlot(null);
    setStep(4);
  };

  const goNextFromData = () => {
    const errs: typeof stepErrors = {};
    if (!isValidName(name)) errs.name = "Informe seu nome.";
    if (!isValidWhatsapp(whatsapp)) errs.whatsapp = "Informe um WhatsApp válido com DDD.";
    setStepErrors(errs);
    if (Object.keys(errs).length) return;
    setStep(2);
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
    if (!isValidWhatsapp(whatsapp)) errs.whatsapp = "Informe um WhatsApp válido com DDD.";
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
      showToast("Horário agendado!", "success");
    } catch (e) {
      setSubmitError(toErrorMessage(e));
    } finally {
      setBookingBusy(false);
    }
  };

  const stepItems = [
    { label: "Seus dados" },
    { label: "Serviço" },
    { label: "Profissional" },
    { label: "Data e horário" },
  ];

  if (shopError) {
    return (
      <div className="booking-page">
        <BookingNavbar slug={slug} />
        <div className="booking-page__body">
          <EmptyState
            icon="◆"
            title="Barbearia não encontrada"
            description="Confira o endereço (slug) da página ou verifique se a barbearia está ativa."
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
            {stepItems.map((item, i) => {
              const n = i + 1;
              const done = step > n;
              const active = step === n;
              return (
                <li key={item.label} className={`${done ? "is-done" : ""} ${active ? "is-active" : ""}`}>
                  <span className="steps__dia">
                    <span className="steps__num">{done ? <Icon name="check" size={11} /> : `0${n}`}</span>
                  </span>
                  <span className="steps__label">{item.label}</span>
                </li>
              );
            })}
          </ol>

          {step === 1 ? (
            <section className="booking-step">
              <h2>
                <span className="booking-step__idx">01</span> Seus dados
              </h2>
              <div className="booking-form booking-form--lead">
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
                <p className="field__hint">
                  Sem conta e sem senha — só isto para guardar o seu horário.
                </p>
                <Button onClick={goNextFromData} className="w-full">
                  Continuar
                </Button>
              </div>
            </section>
          ) : null}

          {step === 2 ? (
            <section className="booking-step">
              <div className="booking-step__head">
                <BackButton onClick={() => setStep(1)} />
                <h2>
                  <span className="booking-step__idx">02</span> Escolha o serviço
                </h2>
              </div>
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
                <EmptyState icon="✂️" title="Sem serviços disponíveis" description="Nenhum serviço ativo no momento." />
              ) : null}
            </section>
          ) : null}

          {step === 3 ? (
            <section className="booking-step">
              <div className="booking-step__head">
                <BackButton onClick={() => setStep(2)} />
                <h2>
                  <span className="booking-step__idx">03</span> Escolha o profissional
                </h2>
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
                <EmptyState icon="💈" title="Sem profissionais disponíveis" description="Volte em breve." />
              ) : null}
            </section>
          ) : null}

          {step === 4 ? (
            <section className="booking-step">
              <div className="booking-step__head">
                <BackButton onClick={() => setStep(3)} />
                <h2>
                  <span className="booking-step__idx">04</span> Data e horário
                </h2>
              </div>
              <p className="muted">A agenda abre por semana: toque no dia e em seguida escolha o horário.</p>
              <div className="booking-date-layout">
                <Calendar
                  value={date ?? today}
                  onChange={(d) => {
                    setDate(d);
                    setSlot(null);
                  }}
                  min={today}
                  max={maxDate}
                  enabledWeekdays={openWeekdays.length ? openWeekdays : undefined}
                />
                <div className="slot-panel">
                  {!date ? (
                    <EmptyState
                      icon="🕒"
                      title="Escolha um dia"
                      description="Selecione o dia no calendário para ver os horários."
                    />
                  ) : slotsLoading ? (
                    <Loading label="Buscando horários..." />
                  ) : slots.length === 0 ? (
                    <EmptyState
                      icon="⛔"
                      title="Sem horários disponíveis"
                      description={`Não há horários livres em ${formatDatePt(date)} para este serviço e profissional. Tente outro dia.`}
                    />
                  ) : (
                    <>
                      <p className="section-label">
                        Horários em {formatDatePt(date)} · {WEEKDAYS_SHORT[weekdayOf(date)]}
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
              {submitError ? <p className="form-error">{submitError}</p> : null}
              {slot ? (
                <div className="booking-cta">
                  <span>
                    {selectedService?.name} · {selectedBarber?.full_name}
                  </span>
                  <Button onClick={handleConfirm} loading={bookingBusy}>
                    Confirmar agendamento
                  </Button>
                </div>
              ) : null}
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
        <span className="booking-nav__mark">◆</span>
        <strong>
          BLACK <span className="sidebar__brand-gold">DIAMOND</span>
        </strong>
      </Link>
      <Link to="/login" className="booking-nav__cta">
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
        <span className="booking-hero__eyebrow">Agendamento online</span>
        <div className="booking-hero__brand">
          {b.logo_url ? (
            <img src={b.logo_url} alt={b.name} className="booking-hero__logo" />
          ) : (
            <span className="booking-hero__mark">◆</span>
          )}
          <div>
            <h1>{b.name}</h1>
            <p>{b.description ?? "Barbearia"}</p>
          </div>
        </div>
        {b.about ? <p className="booking-hero__about">{b.about}</p> : null}
        <ul className="booking-hero__meta">
          {s.show_address && b.address ? <li>{formatShortAddress(b.address)}</li> : null}
          {s.show_whatsapp && b.whatsapp ? (
            <li>
              <a href={buildWhatsappLink(b.whatsapp, "Olá! Gostaria de saber mais.")} target="_blank" rel="noreferrer">
                {formatWhatsapp(b.whatsapp)}
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
    `*${shop.name}* — Agendamento realizado`,
    "",
    `Cliente: ${result.client_name}`,
    `Serviço: ${result.service_name}`,
    `Barbeiro: ${result.member_name}`,
    `Data: ${formatDatePt(result.start_at.slice(0, 10))}`,
    `Horário: ${time}`,
    `Valor: ${formatCurrency(result.service_price)}`,
    "Status: Agendado",
    "",
    "Venho confirmar meu horário.",
  ].join("\n");

  return (
    <div className="booking-success">
      <div className="booking-success__icon">
        <Icon name="check" size={24} />
      </div>
      <h2>Horário garantido!</h2>
      <p className="text-muted">Seu agendamento foi registrado. Confira os dados:</p>

      <dl className="booking-success__list">
        <div>
          <dt>Cliente</dt>
          <dd>{result.client_name}</dd>
        </div>
        <div>
          <dt>Serviço</dt>
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
          <dt>Horário</dt>
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
          <a href={buildWhatsappLink(b.whatsapp, "Olá!")} target="_blank" rel="noreferrer">
            WhatsApp
          </a>
        ) : null}
        {s.show_instagram && b.instagram ? (
          <a href={`https://instagram.com/${b.instagram.replace("@", "")}`} target="_blank" rel="noreferrer">
            Instagram
          </a>
        ) : null}
        {s.show_address && b.address ? <span>{formatShortAddress(b.address)}</span> : null}
        {s.show_credits ? (
          <span className="booking-footer__credit">{s.credits_text || b.name}</span>
        ) : null}
      </div>
    </footer>
  );
}

/** Cor de texto legível sobre a cor de destaque (contraste). */
export function readableInk(hex: string): string {
  const clean = hex.replace("#", "");
  if (clean.length < 6) return "#16130c";
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? "#16130c" : "#ffffff";
}