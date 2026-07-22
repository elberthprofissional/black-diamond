import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatPhone } from '../lib/utils';
import { useWizardStep } from './useWizardStep';
import { useClientLookup } from './useClientLookup';
import { useBookingSlots } from './useBookingSlots';
import { useBookingPayment } from './useBookingPayment';
import { useBookingLoyalty } from './useBookingLoyalty';
import { useServices } from './useServices';
import { useMensalistaFilter } from './useMensalistaFilter';
import { getMensalistaPlans, applyCoupon } from '../lib/api';
import type { Service, MensalistaPlan, Barber } from '../types';

/**
 * Combines booking wizard state: steps, services, client data, slots, payment, loyalty, mensalista.
 *
 * Composition approach: each concern is delegated to a dedicated sub-hook.
 * The wizard orchestrates them and exposes a unified API to the UI layer.
 */
export function useBookingWizard(showError: (msg: string) => void) {
  const navigate = useNavigate();

  // ── Step control ──────────────────────────────────────────────────────
  const {
    step,
    setStep,
    isStepDisabled,
    stepTitle,
    goNext: wizardGoNext,
    goBack,
  } = useWizardStep();

  // ── Services ──────────────────────────────────────────────────────────
  const { services: allServices, loading: servicesLoading } = useServices();
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [selectedBarber, setSelectedBarber] = useState<Barber | null>(null);
  const [userInfo, setUserInfo] = useState({ name: '', phone: '' });

  // ── Client lookup (debounced, auto-fills name) ────────────────────────
  const handleNameFound = useCallback((name: string) => {
    setUserInfo((prev) => ({ ...prev, name }));
  }, []);

  const { isMensalista, mensalistaPlanId, clientLookupLoading, clientId, lastBooking } =
    useClientLookup(userInfo.phone, handleNameFound);

  // ── Mensalista plans ──────────────────────────────────────────────────
  const [allPlans, setAllPlans] = useState<MensalistaPlan[]>([]);
  useEffect(() => {
    getMensalistaPlans(true)
      .then(setAllPlans)
      .catch(() => {
        /* silencioso */
      });
  }, []);

  const currentPlan = useMemo(
    () => allPlans.find((p) => p.id === mensalistaPlanId) || null,
    [allPlans, mensalistaPlanId]
  );

  // ── Loyalty ───────────────────────────────────────────────────────────
  const { nextMilestone } = useBookingLoyalty(clientId);

  // ── Apply last booking (quick repeat) ─────────────────────────────────
  const applyLastBooking = useCallback(() => {
    if (!lastBooking) return;
    const services = allServices.filter((s) => lastBooking.serviceIds.includes(s.id));
    setSelectedServices(services);
    wizardGoNext();
  }, [lastBooking, allServices, wizardGoNext]);

  // ── Date & time slots ─────────────────────────────────────────────────
  const slots = useBookingSlots(showError);

  // ── Payment: coupon + submit ──────────────────────────────────────────
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

  // ── Mensalista filter (services + days) ───────────────────────────────
  const handleServicesChange = useCallback((services: Service[]) => {
    setSelectedServices(services);
  }, []);

  const { filteredServices, filterDaysForMensalista } = useMensalistaFilter({
    isMensalista,
    currentPlan,
    allServices,
    selectedServices,
    onServicesChange: handleServicesChange,
  });

  const filteredNextDays = useMemo(
    () => filterDaysForMensalista(slots.nextDays),
    [filterDaysForMensalista, slots.nextDays]
  );

  // ── Toggle service selection ──────────────────────────────────────────
  const toggleService = useCallback((service: Service) => {
    setSelectedServices((prev) =>
      prev.find((s) => s.id === service.id)
        ? prev.filter((s) => s.id !== service.id)
        : [...prev, service]
    );
  }, []);

  // ── Confirm booking (wraps rawConfirm with wizard state) ──────────────
  const [token, setToken] = useState('');
  const [manageUrl, setManageUrl] = useState('');
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
      setToken(result.token);
      setManageUrl(result.manageUrl);
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

  // ── Validation ────────────────────────────────────────────────────────
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

  // ── Return unified API ────────────────────────────────────────────────
  return {
    step,
    setStep,
    services: filteredServices,
    selectedServices,
    toggleService,
    selectedDate: slots.selectedDate,
    setSelectedDate: slots.setSelectedDate,
    selectedTime: slots.selectedTime,
    setSelectedTime: slots.setSelectedTime,
    userInfo,
    setUserInfo,
    selectedBarber,
    setSelectedBarber,
    isSubmitting,
    existingBookings: slots.existingBookings,
    availableSlots: slots.availableSlots,
    dateContainerRef: slots.dateContainerRef,
    handleMouseDown: slots.handleMouseDown,
    handleMouseLeave: slots.handleMouseLeave,
    handleMouseUp: slots.handleMouseUp,
    handleMouseMove: slots.handleMouseMove,
    isStepDisabled: disabled,
    stepTitle,
    handleConfirm,
    goNext,
    goBack,
    navigate,
    nextDays: filteredNextDays,
    formatPhoneValue: formatPhone,
    isMensalista,
    currentPlan,
    clientLookupLoading,
    token,
    manageUrl,
    totalPrice: calculatedTotalPrice,
    lastBooking,
    applyLastBooking,
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
  };
}
