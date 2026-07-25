import {
  createContext,
  useContext,
  useState,
  useMemo,
  useCallback,
  type ReactNode,
  type RefObject,
  type MouseEvent,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { useWizardStep } from './useWizardStep';
import { useClientLookup } from './useClientLookup';
import { useBookingSlots } from './useBookingSlots';
import { useBookingPayment } from './useBookingPayment';
import { useBookingLoyalty } from './useBookingLoyalty';
import { useServices } from './useServices';
import { applyCoupon } from '../lib/api';
import type { Service, Barber } from '../types';

interface BookingWizardValue {
  step: number;
  stepTitle: string;
  services: Service[];
  selectedServices: Service[];
  selectedDate: string;
  selectedTime: string;
  userInfo: { name: string; phone: string };
  selectedBarber: Barber | null;
  onSelectBarber: (barber: Barber) => void;
  totalPrice: number;
  isStepDisabled: boolean;
  isSubmitting: boolean;
  availableSlots: string[];
  existingBookings: { booking_time: string; status: string }[];
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

  // ── Step control ──
  const {
    step,
    setStep,
    isStepDisabled,
    stepTitle,
    goNext: wizardGoNext,
    goBack,
  } = useWizardStep();

  // ── Services ──
  const { services: allServices, loading: servicesLoading } = useServices();
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [selectedBarber, setSelectedBarber] = useState<Barber | null>(null);
  const [userInfo, setUserInfo] = useState({ name: '', phone: '' });

  // ── Client lookup ──
  const handleNameFound = useCallback((name: string) => {
    setUserInfo((prev) => ({ ...prev, name }));
  }, []);

  const { isMensalista, mensalistaPlanId, clientLookupLoading, clientId, lastBooking } =
    useClientLookup(userInfo.phone, handleNameFound);

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
  const slots = useBookingSlots(showError, selectedBarber?.id);

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
  } = useBookingPayment(selectedServices, showError, () => setStep(5));

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
      barberPhone: selectedBarber?.phone,
    });
    if (result) {
      if (result.queued) setIsOfflineBooking(true);
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
    return 'Mensalista';
  }, [isMensalista, mensalistaPlanId]);

  const value = useMemo<BookingWizardValue>(
    () => ({
      step,
      stepTitle,
      services: allServices,
      selectedServices,
      toggleService,
      selectedDate: slots.selectedDate,
      setSelectedDate: slots.setSelectedDate,
      selectedTime: slots.selectedTime,
      setSelectedTime: slots.setSelectedTime,
      userInfo,
      setUserInfo,
      selectedBarber,
      onSelectBarber: setSelectedBarber,
      isSubmitting,
      existingBookings: slots.existingBookings,
      availableSlots: slots.availableSlots,
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
    }),
    [
      step,
      stepTitle,
      allServices,
      selectedServices,
      toggleService,
      slots.selectedDate,
      slots.setSelectedDate,
      slots.selectedTime,
      slots.setSelectedTime,
      userInfo,
      setUserInfo,
      selectedBarber,
      isSubmitting,
      slots.existingBookings,
      slots.availableSlots,
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
    ]
  );

  return <BookingWizardContext.Provider value={value}>{children}</BookingWizardContext.Provider>;
}

export function useBookingWizardContext() {
  const ctx = useContext(BookingWizardContext);
  if (!ctx) throw new Error('useBookingWizardContext must be used within BookingWizardProvider');
  return ctx;
}
