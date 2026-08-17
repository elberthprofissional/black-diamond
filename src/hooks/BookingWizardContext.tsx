import {
  createContext,
  useContext,
  useState,
  useMemo,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
  type RefObject,
  type MouseEvent,
} from 'react';
import { useNavigate, useLocation } from 'react-router';
import { useWizardStep } from './useWizardStep';
import { useBarberContext } from '../contexts/BarberContext';
import { useBarberSettings } from './useBarberSettings';
import { useClientLookup } from './useClientLookup';
import { useBookingSlots } from './useBookingSlots';
import { useBookingPayment } from './useBookingPayment';
import { useBookingLoyalty } from './useBookingLoyalty';
import { useServices } from './useServices';
import { applyCoupon } from '../lib/api';
import { getClientSession, saveClientSession } from '../lib/clientSession';
import type { Service, Barber } from '../types';

interface BookingWizardValue {
  step: number;
  stepTitle: string;
  /** Wizard tem a etapa de escolha de barbeiro? (2+ barbeiros ativos, não-solo) */
  showBarberStep: boolean;
  /** Barbeiros/settings ainda carregando — estrutura de passos ainda não é final. */
  loading: boolean;
  /** Número total de passos do wizard (4 ou 5). */
  totalSteps: number;
  services: Service[];
  selectedServices: Service[];
  selectedDate: string;
  selectedTime: string;
  userInfo: { name: string; phone: string };
  barbers: Barber[];
  selectedBarber: Barber | null;
  onSelectBarber: (barber: Barber) => void;
  totalPrice: number;
  isStepDisabled: boolean;
  isSubmitting: boolean;
  availableSlots: string[];
  existingBookings: { booking_time: string; status: string; total_duration?: number }[];
  /** Duração (min) dos serviços selecionados — usada para ocupação dos slots. */
  slotDuration: number;
  dateContainerRef: RefObject<HTMLDivElement | null>;
  handleMouseDown: (e: MouseEvent) => void;
  handleMouseLeave: () => void;
  handleMouseUp: () => void;
  handleMouseMove: (e: MouseEvent) => void;
  toggleService: (service: Service) => void;
  setSelectedDate: (date: string) => void;
  setSelectedTime: (time: string) => void;
  setUserInfo: (info: { name: string; phone: string }) => void;
  goNext: () => void;
  goBack: () => void;
  navigate: (path: string) => void;
  nextDays: {
    fullDate: string;
    dayName: string;
    dayNumber: number;
    isToday: boolean;
    isPast: boolean;
  }[];
  isMensalista: boolean;
  planName?: string;
  clientLookupLoading: boolean;
  servicesLoading: boolean;
  lastBooking?: { serviceIds: string[]; totalPrice: number } | null;
  onApplyLastBooking?: () => void;
  isOfflineBooking: boolean;
  nextMilestone?: {
    milestone: { visits_required: number; reward_service_id: string };
    progress: number;
    already_claimed: boolean;
  } | null;
  coupon?: {
    coupon_id: string;
    code: string;
    discount_type: string;
    discount_amount: number;
  } | null;
  couponLoading?: boolean;
  couponError?: string;
  originalPrice?: number;
  onCouponValidate?: (code: string) => Promise<void>;
  onCouponRemove?: () => void;
  /** Resultado da confirmação: token + link de gerenciamento (link mágico). */
  bookingResult?: { token: string; manageUrl: string } | null;
}

/* eslint-disable react-refresh/only-export-components */
const BookingWizardContext = createContext<BookingWizardValue | null>(null);

export function BookingWizardProvider({
  children,
  showError,
}: {
  children: ReactNode;
  showError: (msg: string) => void;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { bookableBarbers, loading: barbersLoading } = useBarberContext();
  const { singleBarberMode, loading: settingsLoading } = useBarberSettings();

  // Multi-barbeiro real (2+ ativos, fora do modo solo): o cliente escolhe o
  // barbeiro antes da data → wizard com 5 passos. Modo solo/1 barbeiro: 4.
  // IMPORTANTE: a estrutura de passos só pode ser decidida DEPOIS que barbeiros
  // e settings carregarem — se ela mudar no meio do fluxo (ex.: settings ainda
  // carregando quando o cliente já está na etapa de data/horário), o passo
  // desmonta e a seleção de data/horário some. O consumer (BookingPageContent)
  // renderiza um skeleton enquanto `loading` for true.
  const showBarberStep = !singleBarberMode && bookableBarbers.length > 1;
  const loading = barbersLoading || settingsLoading;

  // ── Step control ──
  const {
    step,
    setStep,
    isStepDisabled,
    stepTitle,
    goNext: wizardGoNext,
    goBack,
  } = useWizardStep(showBarberStep ? 5 : 4);

  // ── Services ──
  const { services: allServices, loading: servicesLoading } = useServices();
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [selectedBarber, setSelectedBarber] = useState<Barber | null>(null);
  const [userInfo, setUserInfo] = useState<{ name: string; phone: string }>(() => {
    // Pre-fill: estado da rota OU sessão do cliente logado (ex.: veio pelo menu).
    const state = location.state as { name?: string; phone?: string } | undefined;
    const session = getClientSession();
    return {
      name: state?.name || session?.name || '',
      phone: state?.phone || session?.phone || '',
    };
  });

  // ── Auto-select: modo solo (sempre o primeiro) ou quando há apenas UM barbeiro ──
  useEffect(() => {
    if (
      !selectedBarber &&
      bookableBarbers.length > 0 &&
      (singleBarberMode || bookableBarbers.length === 1)
    ) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedBarber(bookableBarbers[0] ?? null);
    }
  }, [bookableBarbers, selectedBarber, singleBarberMode]);

  // ── Client lookup ──
  const handleNameFound = useCallback((name: string) => {
    setUserInfo((prev) => ({ ...prev, name }));
  }, []);

  const {
    isMensalista,
    mensalistaPlanId,
    planName: clientPlanName,
    clientLookupLoading,
    clientId,
    lastBooking,
  } = useClientLookup(userInfo.phone, handleNameFound);

  // ── Loyalty ──
  const { nextMilestone } = useBookingLoyalty(clientId);

  // ── Apply last booking ──
  const applyLastBooking = useCallback(() => {
    if (!lastBooking) return;
    const services = allServices.filter((s) => lastBooking.serviceIds.includes(s.id));
    setSelectedServices(services);
    wizardGoNext();
  }, [lastBooking, allServices, wizardGoNext]);

  // ── Slots ──
  // Multi-barbeiro: os horários disponíveis são filtrados pelo barbeiro escolhido.
  // A duração total dos serviços selecionados determina quais slots comportam o
  // agendamento sem sobrepor outro (ex: Corte+Barba = 70min não cabe em 09:00→10:10).
  const slotDuration = useMemo(
    () => selectedServices.reduce((sum, s) => sum + (s.duration || 0), 0),
    [selectedServices]
  );
  const slots = useBookingSlots(showError, selectedBarber?.id, slotDuration);

  // ── Trocar de barbeiro reseta a data/horário escolhidos ──
  const prevBarberIdRef = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    const currentId = selectedBarber?.id;
    if (prevBarberIdRef.current !== undefined && prevBarberIdRef.current !== currentId) {
      slots.setSelectedDate('');
      slots.setSelectedTime('');
    }
    prevBarberIdRef.current = currentId;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBarber?.id]);

  const totalSteps = showBarberStep ? 5 : 4;

  // ── Payment ──
  const {
    coupon,
    couponLoading,
    couponError,
    handleCouponValidate,
    handleCouponRemove,
    calculatedTotalPrice,
    finalPrice,
    isSubmitting,
    handleConfirm: rawConfirm,
  } = useBookingPayment(selectedServices, showError, () => setStep(totalSteps + 1));

  // ── Prefill de cupom vindo da vitrine do cliente (?coupon=CODIGO) ──
  // O cliente resgatou na vitrine e clicou "Usar no agendamento" — o código já
  // vem na URL, valida sozinho (sem digitar) e revalida quando os serviços
  // forem escolhidos.
  const couponPrefillRan = useRef(false);
  useEffect(() => {
    const prefillCode = new URLSearchParams(location.search).get('coupon');
    if (!prefillCode || couponPrefillRan.current) return;
    couponPrefillRan.current = true;
    void handleCouponValidate(prefillCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  // Modo solo: expõe apenas o barbeiro principal (nunca mostra seletor)
  const effectiveBarbers = useMemo(
    () => (singleBarberMode ? bookableBarbers.slice(0, 1) : bookableBarbers),
    [singleBarberMode, bookableBarbers]
  );

  // ── Toggle service ──
  const toggleService = useCallback((service: Service) => {
    setSelectedServices((prev) =>
      prev.find((s) => s.id === service.id)
        ? prev.filter((s) => s.id !== service.id)
        : [...prev, service]
    );
  }, []);

  // ── Confirm booking ──
  const [isOfflineBooking, setIsOfflineBooking] = useState(false);
  const [bookingResult, setBookingResult] = useState<{ token: string; manageUrl: string } | null>(
    null
  );

  const handleConfirm = useCallback(async () => {
    if (isSubmitting) return null;
    const result = await rawConfirm({
      selectedServices,
      selectedDate: slots.selectedDate,
      selectedTime: slots.selectedTime,
      userInfo,
      totalPrice: finalPrice,
      isMensalista,
      couponId: coupon?.coupon_id,
      discountAmount: coupon?.discount_amount,
      barberId: selectedBarber?.id,
      barberUserId: selectedBarber?.user_id,
      barberPhone: selectedBarber?.phone,
    });
    if (result) {
      if (result.queued) {
        setIsOfflineBooking(true);
      } else {
        // Link mágico: guarda o token para a tela de sucesso e salva a sessão
        // do cliente no dispositivo (volta direto ao dashboard na próxima visita).
        if (result.token && result.manageUrl) {
          setBookingResult({ token: result.token, manageUrl: result.manageUrl });
          saveClientSession(userInfo.phone.replace(/\D/g, ''), userInfo.name.trim());
        }
      }
      if (coupon?.coupon_id && !result.queued) {
        applyCoupon(coupon.coupon_id).catch(() => {
          /* não crítica */
        });
      }
    }
    return result;
  }, [
    rawConfirm,
    isSubmitting,
    selectedServices,
    slots.selectedDate,
    slots.selectedTime,
    userInfo,
    finalPrice,
    isMensalista,
    coupon,
    selectedBarber?.id,
    selectedBarber?.user_id,
    selectedBarber?.phone,
  ]);

  const goNext = useCallback(() => {
    wizardGoNext(handleConfirm);
  }, [wizardGoNext, handleConfirm]);

  // ── Validation ──
  const validationInput = useMemo(
    () => ({
      step,
      name: userInfo.name,
      phone: userInfo.phone,
      selectedBarber,
      selectedServices,
      selectedDate: slots.selectedDate,
      selectedTime: slots.selectedTime,
      isSubmitting,
    }),
    [
      step,
      userInfo,
      selectedBarber,
      selectedServices,
      slots.selectedDate,
      slots.selectedTime,
      isSubmitting,
    ]
  );

  const disabled = useMemo(
    () => isStepDisabled(validationInput),
    [isStepDisabled, validationInput]
  );

  const planName = useMemo(() => {
    if (!isMensalista || !mensalistaPlanId) return undefined;
    return clientPlanName || 'Mensalista';
  }, [isMensalista, mensalistaPlanId, clientPlanName]);

  const value = useMemo<BookingWizardValue>(
    () => ({
      step,
      stepTitle,
      loading,
      showBarberStep,
      totalSteps,
      services: allServices,
      selectedServices,
      toggleService,
      selectedDate: slots.selectedDate,
      setSelectedDate: slots.setSelectedDate,
      selectedTime: slots.selectedTime,
      setSelectedTime: slots.setSelectedTime,
      userInfo,
      setUserInfo,
      barbers: effectiveBarbers,
      selectedBarber,
      onSelectBarber: setSelectedBarber,
      isSubmitting,
      existingBookings: slots.existingBookings,
      availableSlots: slots.availableSlots,
      slotDuration: slots.slotDuration,
      dateContainerRef: slots.dateContainerRef,
      handleMouseDown: slots.handleMouseDown,
      handleMouseLeave: slots.handleMouseLeave,
      handleMouseUp: slots.handleMouseUp,
      handleMouseMove: slots.handleMouseMove,
      isStepDisabled: disabled,
      handleConfirm,
      goNext,
      goBack,
      navigate,
      nextDays: slots.nextDays,
      isMensalista,
      planName,
      clientLookupLoading,
      totalPrice: calculatedTotalPrice,
      lastBooking,
      onApplyLastBooking: applyLastBooking,
      isOfflineBooking,
      coupon,
      couponLoading,
      couponError,
      finalPrice,
      onCouponValidate: handleCouponValidate,
      onCouponRemove: handleCouponRemove,
      servicesLoading,
      originalPrice: calculatedTotalPrice,
      nextMilestone,
      bookingResult,
    }),
    [
      step,
      stepTitle,
      loading,
      showBarberStep,
      totalSteps,
      allServices,
      selectedServices,
      toggleService,
      slots.selectedDate,
      slots.setSelectedDate,
      slots.selectedTime,
      slots.setSelectedTime,
      userInfo,
      setUserInfo,
      effectiveBarbers,
      selectedBarber,
      isSubmitting,
      slots.existingBookings,
      slots.availableSlots,
      slots.slotDuration,
      slots.dateContainerRef,
      slots.handleMouseDown,
      slots.handleMouseLeave,
      slots.handleMouseUp,
      slots.handleMouseMove,
      disabled,
      handleConfirm,
      goNext,
      goBack,
      navigate,
      slots.nextDays,
      isMensalista,
      planName,
      clientLookupLoading,
      calculatedTotalPrice,
      lastBooking,
      applyLastBooking,
      isOfflineBooking,
      coupon,
      couponLoading,
      couponError,
      finalPrice,
      handleCouponValidate,
      handleCouponRemove,
      servicesLoading,
      nextMilestone,
      bookingResult,
    ]
  );

  return <BookingWizardContext.Provider value={value}>{children}</BookingWizardContext.Provider>;
}

export function useBookingWizardContext() {
  const ctx = useContext(BookingWizardContext);
  if (!ctx) throw new Error('useBookingWizardContext must be used within BookingWizardProvider');
  return ctx;
}
