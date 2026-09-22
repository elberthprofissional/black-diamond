import { Ban, Scissors, Users } from "lucide-react";
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
import { useToast } from "../../hooks/useToast";
import {
  ApiError,
  bookAppointment,
  checkCoupon,
  fetchAvailableSlots,
  fetchPublicShop,
  getClientLastService,
  listBusinessHours,
  toErrorMessage,
} from "../../services/api";
import type { BookResult, PublicShop } from "../../services/api";
import type { BusinessHour, CouponValidation } from "../../types";
import {
  activeWeekStartISO,
  addDaysISO,
  formatDatePt,
  lastOpenOfWeek,
  pad,
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

  const [businessHours, setBusinessHours] = useState<BusinessHour[]>([]);

  const [step, setStep] = useState(1);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [lastServiceId, setLastServiceId] = useState<string | null>(null);
  const [repeatBusy, setRepeatBusy] = useState(false);
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

  const [couponInput, setCouponInput] = useState("");
  const [couponValid, setCouponValid] = useState<CouponValidation | null>(null);
  const [couponBusy, setCouponBusy] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);

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
        const hours = await listBusinessHours(s.barbershop.id).catch(() => [] as BusinessHour[]);
        setBusinessHours(hours);
        return s;
      })
      .then(setShop)
      .catch((e) => setShopError(toErrorMessage(e instanceof ApiError ? e : { message: e.message })));
  }, [slug]);

  // Dá uma limpeza nos dados de agendamento ao trocar de barbearia.
  useEffect(() => {
    setServiceId(null);
    setMemberId(null);
    setDate(null);
    setSlot(null);
    setName("");
    setWhatsapp("");
    setStepErrors({});
    setSubmitError(null);
    setLastServiceId(null);
  }, [slug]);

  const openWeekdays = useMemo(
    () =>
      businessHours
        .filter((h) => !h.is_closed && h.open_time && h.close_time)
        .map((h) => h.weekday),
    [businessHours]
  );

  const hoursByWeekday = useMemo(() => {
    const map = new Map<number, { open: string; close: string }>();
    for (const h of businessHours) {
      if (!h.is_closed && h.open_time && h.close_time) map.set(h.weekday, { open: h.open_time, close: h.close_time });
    }
    return map;
  }, [businessHours]);

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

  // Serviço do último agendamento (para oferecer "repetir") — só se ainda estiver ativo.
  const repeatService = useMemo(
    () => (lastServiceId ? (shop?.services.find((s) => s.id === lastServiceId) ?? null) : null),
    [shop, lastServiceId]
  );
  const firstName = name.trim().split(/\s+/)[0] ?? "";

  const today = todayISO();
  const weekStart = activeWeekStartISO(today, openWeekdays);
  const maxDate = lastOpenOfWeek(weekStart, openWeekdays);

  // Os 7 dias (seg–dom) da semana ativa, exibidos na faixa de datas.
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDaysISO(weekStart, i));
  }, [weekStart]);

  const slotTime = useMemo(() => {
    if (!slot) return null;
    return new Date(slot).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [slot]);

  // Grade completa de horários do dia (de 1 em 1 hora, como no servidor),
  // marcando os que restaram livres vs. os já ocupados.
  const slotGrid = useMemo(() => {
    if (!date || !selectedService) return null;
    const bh = hoursByWeekday.get(weekdayOf(date));
    if (!bh) return [];

    const [oh, om] = bh.open.split(":").map(Number);
    const [ch, cm] = bh.close.split(":").map(Number);
    const openMin = oh * 60 + om;
    const closeMin = ch * 60 + cm;
    const duration = selectedService.duration_minutes || 30;

    const byTime = new Map<string, string>();
    for (const sl of slots) {
      const d = new Date(sl);
      byTime.set(`${pad(d.getHours())}:${pad(d.getMinutes())}`, sl);
    }

    const items: { time: string; iso?: string; available: boolean }[] = [];
    for (let m = openMin; m + duration <= closeMin; m += 60) {
      const time = `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
      const iso = byTime.get(time);
      items.push({ time, iso, available: Boolean(iso) });
    }
    return items;
  }, [date, hoursByWeekday, selectedService, slots]);

  const couponDiscount = useMemo(() => {
    if (!couponValid?.is_valid || !selectedService) return 0;
    if (couponValid.discount_type === "percent") {
      return Math.round((selectedService.price * (couponValid.discount_value ?? 0)) / 100 * 100) / 100;
    }
    return Math.min(couponValid.discount_value ?? 0, selectedService.price);
  }, [couponValid, selectedService]);

  const totalPrice = Math.max(0, (selectedService?.price ?? 0) - couponDiscount);

  const applyCoupon = async () => {
    if (!shop) return;
    const code = couponInput.trim();
    if (!code) {
      setCouponError("Digite o código do cupom.");
      return;
    }
    setCouponBusy(true);
    setCouponError(null);
    try {
      const v = await checkCoupon(shop.barbershop.id, code);
      if (v?.is_valid) {
        setCouponValid(v);
        setCouponInput(v.code ?? code);
      } else {
        setCouponValid(null);
        setCouponError(v?.reason ?? "Cupom inválido.");
      }
    } catch (e) {
      setCouponError(toErrorMessage(e));
    } finally {
      setCouponBusy(false);
    }
  };

  const removeCoupon = () => {
    setCouponValid(null);
    setCouponInput("");
    setCouponError(null);
  };

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

  const goNextFromData = async () => {
    const errs: typeof stepErrors = {};
    if (!isValidName(name)) errs.name = "Informe seu nome.";
    if (!isValidWhatsapp(whatsapp)) errs.whatsapp = "Informe um WhatsApp válido com DDD.";
    setStepErrors(errs);
    if (Object.keys(errs).length || !shop) return;
    // Procura o último serviço do cliente para oferecer repetir. Erro aqui não
    // pode travar ninguém: segue direto pro fluxo normal de serviço.
    setRepeatBusy(true);
    try {
      const last = await getClientLastService(shop.barbershop.id, whatsapp);
      setLastServiceId(last?.serviceId ?? null);
    } catch {
      setLastServiceId(null);
    } finally {
      setRepeatBusy(false);
      setStep(2);
    }
  };

  const goToReview = () => {
    const errs: typeof stepErrors = {};
    if (!isValidName(name)) errs.name = "Informe seu nome.";
    if (!isValidWhatsapp(whatsapp)) errs.whatsapp = "Informe um WhatsApp válido com DDD.";
    setStepErrors(errs);
    if (Object.keys(errs).length) return;
    setStep(5);
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
    setLastServiceId(null);
    removeCoupon();
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
        couponCode: couponValid?.is_valid ? couponValid.code ?? couponInput.trim() : null,
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
    { label: "Confirmação" },
  ];
  const stepName = stepItems[step - 1]?.label ?? "";

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
        <div className="booking-layout">
          <div className="booking-col">
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
                <div className="booking-step__head">
                  <h2 className="booking-step__title">Vamos começar.</h2>
                  <p className="booking-step__sub">Como podemos chamar você?</p>
                </div>
                <div className="booking-form booking-form--lead">
                  <Input
                    label="Nome"
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
                  <Button onClick={goNextFromData} className="booking-continue" loading={repeatBusy}>
                    Continuar <Icon name="arrowRight" size={16} />
                  </Button>
                </div>
              </section>
            ) : null}

            {step === 2 ? (
              repeatService ? (
                <section className="booking-step">
                  <div className="booking-step__head">
                    <BackButton onClick={() => setStep(1)} />
                    <h2 className="booking-step__title">
                      Bem-vindo de volta{firstName ? `, ${firstName}` : ""}!
                    </h2>
                    <p className="booking-step__sub">Quer repetir seu último agendamento?</p>
                  </div>
                  <div className="card">
                    <div className="card__head">
                      <h3>
                        {repeatService.name}{" "}
                        <span className="muted">
                          · {repeatService.duration_minutes} min · {formatCurrency(repeatService.price)}
                        </span>
                      </h3>
                    </div>
                    <div className="form-stack">
                      <p className="text-muted">
                        Mesmo serviço de antes — você só escolhe o barbeiro, o dia e o horário.
                      </p>
                      <div className="btn-row">
                        <Button onClick={() => pickService(repeatService.id)}>
                          Sim, repetir <Icon name="arrowRight" size={16} />
                        </Button>
                        <Button variant="ghost" onClick={() => setLastServiceId(null)}>
                          Não, escolher outro
                        </Button>
                      </div>
                    </div>
                  </div>
                </section>
              ) : (
                <section className="booking-step">
                  <div className="booking-step__head">
                    <BackButton onClick={() => setStep(1)} />
                    <h2 className="booking-step__title">Escolha seu serviço.</h2>
                    <p className="booking-step__sub">Selecione o cuidado que você deseja hoje.</p>
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
                    <EmptyState icon={<Scissors size={22} strokeWidth={1.5} />} title="Sem serviços disponíveis" description="Nenhum serviço ativo no momento." />
                  ) : null}
                </section>
              )
            ) : null}

            {step === 3 ? (
              <section className="booking-step">
                <div className="booking-step__head">
                  <BackButton onClick={() => setStep(2)} />
                  <h2 className="booking-step__title">Escolha seu barbeiro.</h2>
                  <p className="booking-step__sub">Quem vai cuidar do seu atendimento?</p>
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
                  <EmptyState icon={<Users size={22} strokeWidth={1.5} />} title="Sem profissionais disponíveis" description="Volte em breve." />
                ) : null}
              </section>
            ) : null}

            {step === 4 ? (
              <section className="booking-step">
                <div className="booking-step__head">
                  <BackButton onClick={() => setStep(3)} />
                  <h2 className="booking-step__title">Escolha seu horário.</h2>
                  <p className="booking-step__sub">Encontre o melhor momento para você.</p>
                </div>

                <div className="booking-days" role="listbox" aria-label="Escolha o dia">
                  {weekDays.map((d) => {
                    const dow = weekdayOf(d);
                    const blocked = !openWeekdays.includes(dow) || d > maxDate;
                    const past = d < today;
                    const off = blocked || past;
                    const sel = d === date;
                    return (
                      <button
                        key={d}
                        type="button"
                        role="option"
                        aria-selected={sel}
                        className={`booking-day ${sel ? "is-selected" : ""} ${off ? "is-off" : ""} ${
                          d === today && !off ? "is-today" : ""
                        }`}
                        disabled={off}
                        onClick={() => {
                          setDate(d);
                          setSlot(null);
                        }}
                      >
                        <span className="booking-day__dow">{WEEKDAYS_SHORT[dow]}</span>
                        <span className="booking-day__num">{Number(d.slice(8))}</span>
                        {blocked && !past ? <span className="booking-day__badge">Fechado</span> : null}
                      </button>
                    );
                  })}
                </div>

                <div className="booking-slots">
                  {!date ? (
                    <EmptyState
                      icon="◆"
                      title="Escolha um dia"
                      description="Toque em um dia acima para ver os horários disponíveis."
                    />
                  ) : slotsLoading ? (
                    <Loading label="Buscando horários..." />
                  ) : slotGrid === null ? null : slotGrid.length === 0 ? (
                    <EmptyState
                      icon={<Ban size={22} strokeWidth={1.5} />}
                      title="Sem horários disponíveis"
                      description={`Não há horários nesta data. Tente outro dia.`}
                    />
                  ) : (
                    <>
                      <div className="booking-slots__head">
                        <p className="section-label">Horários disponíveis</p>
                        <span className="booking-slots__date">
                          {WEEKDAYS_SHORT[weekdayOf(date)]} · {formatDatePt(date)}
                        </span>
                      </div>
                      <div className="slot-legend" aria-hidden="true">
                        <span>
                          <span className="slot-legend__dot is-ok" /> Disponíveis
                        </span>
                        <span>
                          <span className="slot-legend__dot is-off" /> Ocupados
                        </span>
                      </div>
                      <div className="slot-grid">
                        {slotGrid.map((it) => (
                          <button
                            key={it.time}
                            type="button"
                            disabled={!it.available}
                            aria-pressed={it.available && slot === it.iso}
                            className={`slot-btn ${!it.available ? "is-occupied" : ""} ${
                              it.available && slot === it.iso ? "is-selected" : ""
                            }`}
                            onClick={() => setSlot(it.iso ?? null)}
                          >
                            {it.time}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

{slot ? (
                  <div className="booking-cta">
                    <Button onClick={goToReview}>Próximo</Button>
                  </div>
                ) : null}
              </section>
            ) : null}

            {step === 5 ? (
              <section className="booking-step">
                <div className="booking-step__head">
                  <BackButton onClick={() => setStep(4)} />
                  <h2 className="booking-step__title">Confirmação.</h2>
                  <p className="booking-step__sub">Revise tudo antes de garantir seu horário.</p>
                </div>

                <div className="booking-review">
                  <div className="booking-review__row">
                    <span>Cliente</span>
                    <strong>{name}</strong>
                  </div>
                  <div className="booking-review__row">
                    <span>WhatsApp</span>
                    <strong>{whatsapp}</strong>
                  </div>
                  <div className="booking-review__row">
                    <span>Serviço</span>
                    <strong>
                      {selectedService?.name}{" "}
                      <span className="booking-review__price">{formatCurrency(selectedService?.price ?? 0)}</span>
                    </strong>
                  </div>
                  <div className="booking-review__row">
                    <span>Profissional</span>
                    <strong>{selectedBarber?.full_name}</strong>
                  </div>
                  <div className="booking-review__row">
                    <span>Data e horário</span>
                    <strong>
                      {formatDatePt(date ?? "")} · {slotTime}
                    </strong>
                  </div>

                  <div className="booking-review__divider" />

                  <div className="coupon">
                    {couponValid?.is_valid ? (
                      <div className="coupon__applied">
                        <span className="coupon__diamond">◆</span>
                        <div className="coupon__meta">
                          <strong className="coupon__code">{couponValid.code}</strong>
                          {couponValid.title ? <span className="coupon__title">{couponValid.title}</span> : null}
                        </div>
                        {couponDiscount > 0 ? <span className="coupon__value">−{formatCurrency(couponDiscount)}</span> : null}
                        <button
                          type="button"
                          className="coupon__remove"
                          aria-label="Remover cupom"
                          onClick={removeCoupon}
                        >
                          <Icon name="x" size={14} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="coupon__row">
                          <input
                            className={`coupon__input ${couponError ? "has-error" : ""}`}
                            value={couponInput}
                            placeholder="Código do cupom"
                            maxLength={40}
                            disabled={couponBusy}
                            onChange={(e) => {
                              setCouponInput(e.target.value);
                              setCouponError(null);
                              setCouponValid(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                void applyCoupon();
                              }
                            }}
                          />
                          <Button variant="ghost" size="sm" onClick={applyCoupon} loading={couponBusy}>
                            Aplicar
                          </Button>
                        </div>
                        {couponError ? <p className="coupon__msg is-error">{couponError}</p> : null}
                      </>
                    )}
                  </div>

                  <div className="booking-review__total">
                    <span>Total</span>
                    <strong>
                      {couponDiscount > 0 ? (
                        <span className="booking-review__orig">{formatCurrency(selectedService?.price ?? 0)}</span>
                      ) : null}
                      <span>{formatCurrency(totalPrice)}</span>
                    </strong>
                  </div>

                  {submitError ? <p className="form-error">{submitError}</p> : null}

                  <Button onClick={handleConfirm} loading={bookingBusy} className="booking-review__cta">
                    Confirmar agendamento
                  </Button>
                  <p className="booking-review__note">
                    Você receberá o link de confirmação via WhatsApp depois de confirmar.
                  </p>
                </div>
              </section>
            ) : null}
          </div>

          <aside className="booking-rail">
            <h3 className="booking-rail__title">Seu agendamento</h3>
            <dl className="booking-summary">
              <div>
                <dt>Serviço</dt>
                <dd>
                  {selectedService ? (
                    <>
                      {selectedService.name} <span className="booking-summary__price">{formatCurrency(selectedService.price)}</span>
                    </>
                  ) : (
                    <span className="booking-summary__empty">—</span>
                  )}
                </dd>
              </div>
              <div>
                <dt>Profissional</dt>
                <dd>{selectedBarber ? selectedBarber.full_name : <span className="booking-summary__empty">—</span>}</dd>
              </div>
              <div>
                <dt>Data</dt>
                <dd>{date ? formatDatePt(date) : <span className="booking-summary__empty">—</span>}</dd>
              </div>
              <div>
                <dt>Horário</dt>
                <dd>{slotTime ?? <span className="booking-summary__empty">—</span>}</dd>
              </div>
              {couponDiscount > 0 ? (
                <div className="booking-summary__discount">
                  <dt>Cupom</dt>
                  <dd className="booking-summary__price">−{formatCurrency(couponDiscount)}</dd>
                </div>
              ) : null}
            </dl>
            <div className="booking-rail__total">
              <span>Total</span>
              <strong>
                {selectedService ? (
                  <>
                    {couponDiscount > 0 ? (
                      <span className="booking-rail__orig">{formatCurrency(selectedService.price)}</span>
                    ) : null}
                    <span className={couponDiscount > 0 ? "booking-rail__paid" : ""}>{formatCurrency(totalPrice)}</span>
                  </>
                ) : (
                  <span className="booking-summary__empty">—</span>
                )}
              </strong>
            </div>
            <p className="booking-rail__note">
              Etapa {step} de 4 — <strong>{stepName}</strong>
            </p>
            {slot && step === 4 ? (
              <Button onClick={goToReview}>Próximo</Button>
            ) : null}
            {slot && step === 5 ? (
              <Button onClick={handleConfirm} loading={bookingBusy}>
                Confirmar agendamento
              </Button>
            ) : null}
          </aside>
        </div>
      </main>

      <BookingFooter b={shop.barbershop} s={shop.barbershop.settings} />
    </div>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="link-btn booking-back" onClick={onClick}>
      <Icon name="chevronLeft" size={14} /> Voltar
    </button>
  );
}

export function BookingNavbar({ slug }: { slug?: string }) {
  return (
    <header className="booking-nav">
      <Link to={`/agendar/${slug ?? ""}`} className="booking-nav__brand">
        <span className="booking-nav__mark">◆</span>
        <strong>
          BLACK <span className="sidebar__brand-gold">DIAMOND</span>
        </strong>
      </Link>
      <div className="booking-nav__right">
        {slug ? (
          <Link to={`/gerenciar/${slug}`} className="booking-nav__manage">
            Cancelar ou reagendar
          </Link>
        ) : null}
        <Link to="/login" className="booking-nav__cta">
          Painel
        </Link>
      </div>
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
        <span className="booking-hero__eyebrow">Agendamento</span>
        <div className="booking-hero__brand">
          {b.logo_url ? (
            <img src={b.logo_url} alt={b.name} className="booking-hero__logo" />
          ) : (
            <span className="booking-hero__mark">◆</span>
          )}
          <h1>{b.name}</h1>
        </div>
        <p className="booking-hero__tagline">Reserve seu horário e deixe o resto com a gente.</p>
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
    ...(result.discount > 0 ? [`Desconto: −${formatCurrency(result.discount)}`] : []),
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
        {result.discount > 0 ? (
          <div>
            <dt>Cupom</dt>
            <dd className="accent">−{formatCurrency(result.discount)}</dd>
          </div>
        ) : null}
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