import { Ban } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { EmptyState } from "../../components/ui/EmptyState";
import { Icon } from "../../components/ui/Icon";
import { Input } from "../../components/ui/Input";
import { Loading } from "../../components/ui/Loading";
import { Button } from "../../components/ui/Button";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { useToast } from "../../hooks/useToast";
import {
  ApiError,
  cancelAppointment,
  fetchAvailableSlots,
  fetchPublicShop,
  getClientAppointments,
  listBusinessHours,
  rescheduleAppointment,
  toErrorMessage,
} from "../../services/api";
import type { PublicShop } from "../../services/api";
import { BookingFooter, BookingNavbar } from "./BookingPage";
import type { BusinessHour, ClientAppointment, RescheduleResult } from "../../types";
import {
  activeWeekStartISO,
  addDaysISO,
  formatDatePt,
  lastOpenOfWeek,
  todayISO,
  WEEKDAYS_FULL,
  WEEKDAYS_SHORT,
  weekdayOf,
} from "../../utils/date";
import { formatCurrency } from "../../utils/format";
import { isValidName, isValidWhatsapp } from "../../utils/validation";

export function ManagePage() {
  const { slug } = useParams<{ slug: string }>();
  const { showToast } = useToast();

  const [shop, setShop] = useState<PublicShop | null>(null);
  const [shopError, setShopError] = useState<string | null>(null);
  const [businessHours, setBusinessHours] = useState<BusinessHour[]>([]);

  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [formErrors, setFormErrors] = useState<{ name?: string; whatsapp?: string }>({});

  const [appts, setAppts] = useState<ClientAppointment[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [target, setTarget] = useState<ClientAppointment | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [slot, setSlot] = useState<string | null>(null);
  const [slots, setSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);

  const [cancelId, setCancelId] = useState<string | null>(null);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [rescheduleBusy, setRescheduleBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [moved, setMoved] = useState<RescheduleResult | null>(null);

  useEffect(() => {
    setShop(null);
    setShopError(null);
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

  const openWeekdays = useMemo(
    () =>
      businessHours
        .filter((h) => !h.is_closed && h.open_time && h.close_time)
        .map((h) => h.weekday),
    [businessHours]
  );

  const today = todayISO();
  const weekStart = activeWeekStartISO(today, openWeekdays);
  const maxDate = lastOpenOfWeek(weekStart, openWeekdays);

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDaysISO(weekStart, i)),
    [weekStart]
  );

  useEffect(() => {
    setDate(null);
    setSlot(null);
    setSlots([]);
  }, [target]);

  useEffect(() => {
    if (!target || !date) {
      setSlots([]);
      setSlot(null);
      return;
    }
    setSlotsLoading(true);
    fetchAvailableSlots(shop!.barbershop.id, target.service_id, target.member_id, date)
      .then(setSlots)
      .catch(() => setSlots([]))
      .finally(() => setSlotsLoading(false));
    // fetchAvailableSlots só é chamado com shop carregado (a lista só existe após buscar).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, date]);

  const search = async () => {
    const errs: typeof formErrors = {};
    if (!isValidName(name)) errs.name = "Informe seu nome.";
    if (!isValidWhatsapp(whatsapp)) errs.whatsapp = "Informe um WhatsApp válido com DDD.";
    setFormErrors(errs);
    if (Object.keys(errs).length) return;

    setSearching(true);
    setSearchError(null);
    setMoved(null);
    setTarget(null);
    try {
      const list = await getClientAppointments(shop!.barbershop.id, name, whatsapp);
      setAppts(list);
    } catch (e) {
      setAppts([]);
      setSearchError(toErrorMessage(e));
    } finally {
      setSearching(false);
    }
  };

  const resetSearch = () => {
    setAppts(null);
    setSearchError(null);
    setTarget(null);
    setMoved(null);
  };

  const startReschedule = (a: ClientAppointment) => {
    setTarget(a);
    setDate(null);
    setSlot(null);
    setActionError(null);
  };

  const confirmCancel = async () => {
    if (!shop || !cancelId) return;
    setCancelBusy(true);
    setActionError(null);
    try {
      await cancelAppointment(shop.barbershop.id, cancelId, name, whatsapp);
      showToast("Agendamento cancelado!", "info");
      setCancelId(null);
      setAppts((prev) => (prev ?? []).filter((a) => a.id !== cancelId));
    } catch (e) {
      setActionError(toErrorMessage(e));
      setCancelId(null);
    } finally {
      setCancelBusy(false);
    }
  };

  const confirmReschedule = async () => {
    if (!shop || !target || !slot) return;
    setRescheduleBusy(true);
    setActionError(null);
    try {
      const result = await rescheduleAppointment(shop.barbershop.id, target.id, name, whatsapp, slot);
      showToast("Horário trocado!", "success");
      setMoved(result);
      setTarget(null);
      setSlot(null);
      setDate(null);
      setAppts((prev) =>
        (prev ?? [])
          .map((a) =>
            a.id === target.id
              ? {
                  ...a,
                  id: result.id,
                  start_at: result.start_at,
                  end_at: result.end_at,
                  status: result.status,
                }
              : a
          )
          .sort((x, y) => x.start_at.localeCompare(y.start_at))
      );
    } catch (e) {
      setActionError(toErrorMessage(e));
    } finally {
      setRescheduleBusy(false);
    }
  };

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

  return (
    <div className="booking-page">
      <BookingNavbar slug={slug} />
      <section className="manage-hero">
        <div className="manage-hero__inner">
          <span className="booking-hero__eyebrow">Gerenciamento</span>
          <h1>Cancelar ou trocar de horário</h1>
          <p>Informe o mesmo nome e WhatsApp usados no agendamento.</p>
        </div>
      </section>

      <main className="booking-page__body">
        {appts === null ? (
          <section className="booking-step">
            <div className="booking-step__head">
              <h2 className="booking-step__title">Identifique-se.</h2>
              <p className="booking-step__sub">É só o que precisamos para achar seus agendamentos.</p>
            </div>
            <div className="booking-form booking-form--lead">
              <Input
                label="Nome"
                name="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                error={formErrors.name}
                placeholder="Como você agendou"
                autoComplete="name"
              />
              <Input
                label="WhatsApp"
                name="whatsapp"
                inputMode="tel"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                error={formErrors.whatsapp}
                placeholder="(11) 99999-0000"
                autoComplete="tel"
              />
              <Button onClick={search} loading={searching} className="booking-continue">
                Buscar agendamentos <Icon name="arrowRight" size={16} />
              </Button>
            </div>
          </section>
        ) : searching ? (
          <Loading label="Buscando seus agendamentos..." />
        ) : (
          <section className="manage-results">
            <div className="booking-step__head">
              <button type="button" className="link-btn booking-back" onClick={resetSearch}>
                <Icon name="chevronLeft" size={14} /> Trocar nome/WhatsApp
              </button>
              <h2 className="booking-step__title">Seus agendamentos.</h2>
              <p className="booking-step__sub">
                {searchError
                  ? "Não foi possível buscar agora."
                  : appts.length === 0
                    ? "Nenhum agendamento futuro com esses dados."
                    : `${appts.length} ${appts.length === 1 ? "agendamento" : "agendamentos"} encontrados.`}
              </p>
            </div>

            {searchError ? <p className="form-error manage-results__error">{searchError}</p> : null}

            {moved ? (
              <div className="manage-moved">
                <div className="manage-moved__icon">
                  <Icon name="check" size={18} />
                </div>
                <div>
                  <strong className="manage-moved__title">Novo horário confirmado</strong>
                  <p>
                    {moved.service_name} com {moved.member_name} em{" "}
                    {formatAppointmentDate(moved.start_at)}.
                  </p>
                  <p className="manage-moved__hint">O horário antigo foi cancelado automaticamente.</p>
                </div>
                <button type="button" className="manage-moved__close" aria-label="Fechar" onClick={() => setMoved(null)}>
                  <Icon name="x" size={14} />
                </button>
              </div>
            ) : null}

            {actionError ? <p className="form-error manage-results__error">{actionError}</p> : null}

            {target ? (
              <section className="booking-step">
                <div className="booking-step__head">
                  <button type="button" className="link-btn booking-back" onClick={() => setTarget(null)}>
                    <Icon name="chevronLeft" size={14} /> Voltar aos agendamentos
                  </button>
                  <h2 className="booking-step__title">Troca de horário.</h2>
                  <p className="booking-step__sub">
                    {target.service_name} · {target.member_name} — para quando quer ir?
                  </p>
                </div>

                <div className="booking-days" role="listbox" aria-label="Escolha o dia">
                  {weekDays.map((d) => {
                    const dow = weekdayOf(d);
                    const blocked = !openWeekdays.includes(dow) || d > maxDate;
                    const off = blocked || d < today;
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
                        {blocked && !off ? <span className="booking-day__badge">Fechado</span> : null}
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
                  ) : slots.length === 0 ? (
                    <EmptyState
                      icon={<Ban size={22} strokeWidth={1.5} />}
                      title="Sem horários disponíveis"
                      description="Não há horários nesta data. Tente outro dia."
                    />
                  ) : (
                    <>
                      <div className="booking-slots__head">
                        <p className="section-label">Horários livres</p>
                        <span className="booking-slots__date">
                          {WEEKDAYS_SHORT[weekdayOf(date)]} · {formatDatePt(date)}
                        </span>
                      </div>
                      <div className="slot-grid">
                        {slots.map((sl) => {
                          const time = new Date(sl).toLocaleTimeString("pt-BR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          });
                          return (
                            <button
                              key={sl}
                              type="button"
                              aria-pressed={slot === sl}
                              className={`slot-btn ${slot === sl ? "is-selected" : ""}`}
                              onClick={() => setSlot(sl)}
                            >
                              {time}
                            </button>
                          );
                        })}
                      </div>

                      {slot ? (
                        <div className="booking-cta">
                          <Button onClick={confirmReschedule} loading={rescheduleBusy}>
                            Confirmar troca
                          </Button>
                        </div>
                      ) : null}
                    </>
                  )}
                </div>
              </section>
            ) : appts.length === 0 ? (
              <EmptyState
                icon="⏳"
                title="Nada encontrado"
                description="Não há agendamentos futuros com este nome e WhatsApp."
              />
            ) : (
              <div className="manage-list">
                {appts.map((a) => (
                  <div key={a.id} className="manage-card">
                    <div className="manage-card__meta">
                      <span className="manage-card__service">{a.service_name}</span>
                      <span className="manage-card__price">{formatCurrency(a.price)}</span>
                    </div>
                    <div className="manage-card__info">
                      <span>
                        <Icon name="user" size={13} /> {a.member_name}
                      </span>
                      <span>
                        <Icon name="calendar" size={13} /> {formatAppointmentDate(a.start_at)}
                      </span>
                      {a.status === "confirmado" ? (
                        <span className="manage-card__status">Confirmado</span>
                      ) : null}
                    </div>
                    <div className="manage-card__actions">
                      <Button variant="ghost" size="sm" onClick={() => startReschedule(a)}>
                        Trocar horário
                      </Button>
                      <Button variant="ghost" size="sm" className="manage-card__cancel" onClick={() => setCancelId(a.id)}>
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </main>

      <ConfirmDialog
        open={Boolean(cancelId)}
        title="Cancelar agendamento?"
        description="Esse horário ficará livre para outra pessoa. Não é possível desfazer."
        confirmLabel="Cancelar agendamento"
        cancelLabel="Manter"
        danger
        busy={cancelBusy}
        onConfirm={confirmCancel}
        onCancel={() => setCancelId(null)}
      />

      <BookingFooter b={shop.barbershop} s={shop.barbershop.settings} />
    </div>
  );
}

function formatAppointmentDate(iso: string): string {
  const d = new Date(iso);
  const dow = d.getDay();
  const time = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return `${WEEKDAYS_FULL[dow]}, ${formatDatePt(iso.slice(0, 10))} às ${time}`;
}