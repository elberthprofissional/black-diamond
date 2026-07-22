import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatPhone } from '../lib/utils';
import { useWizardStep } from './useWizardStep';
import { useClientLookup } from './useClientLookup';
import { useBookingSlots } from './useBookingSlots';
import { useBookingPayment } from './useBookingPayment';
import { useBookingLoyalty } from './useBookingLoyalty';
import type { Service, MensalistaPlan, Barber } from '../types';
import { useServices } from './useServices';
import { getMensalistaPlans, applyCoupon } from '../lib/api';
import { useMensalistaFilter } from './useMensalistaFilter';

export function useBookingWizard(showError: (msg: string) => void) {
  const navigate = useNavigate();

  // Step control
  const {
    step,
    setStep,
    isStepDisabled,
    stepTitle,
    goNext: wizardGoNext,
    goBack,
  } = useWizardStep();

  // Services
  const { services: allServices, loading: servicesLoading } = useServices();
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [userInfo, setUserInfo] = useState({ name: '', phone: '' });
  const [selectedBarber, setSelectedBarber] = useState<Barber | null>(null);

  // Mensalista plans
  const [allPlans, setAllPlans] = useState<MensalistaPlan[]>([]);

  useEffect(() => {
    getMensalistaPlans(true)
      .then(setAllPlans)
      .catch(() => {
        // Planos mensalistas indisponíveis — silencioso
      });
  }, []);

  // Client lookup
  const handleNameFound = useCallback((name: string) => {
    setUserInfo((prev) => ({ ...prev, name }));
  }, []);
  const { isMensalista, mensalistaPlanId, clientLookupLoading, clientId, lastBooking } =
    useClientLookup(userInfo.phone, handleNameFound);

  // Loyalty (extracted hook)
  const { nextMilestone } = useBookingLoyalty(clientId);

  // Apply last booking services
  const applyLastBooking = useCallback(() => {
    if (!lastBooking) return;
    const services = allServices.filter((s) => lastBooking.serviceIds.includes(s.id));
    setSelectedServices(services);
    wizardGoNext();
  }, [lastBooking, allServices, wizardGoNext]);

  // Current plan
  const currentPlan = useMemo(
    () => allPlans.find((p) => p.id === mensalistaPlanId) || null,
    [allPlans, mensalistaPlanId]
  );

  // Date & time slots
  const slots = useBookingSlots(showError);

  // Payment (coupon + submit merged)
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

  // Mensalista filter (shared hook)
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

  // Apply days filter
  const filteredNextDays = useMemo(
    () => filterDaysForMensalista(slots.nextDays),
    [filterDaysForMensalista, slots.nextDays]
  );

  // Toggle service
  const toggleService = useCallback((service: Service) => {
    setSelectedServices((prev) =>
      prev.find((s) => s.id === service.id)
        ? prev.filter((s) => s.id !== service.id)
        : [...prev, service]
    );
  }, []);

  const [manageUrl, setManageUrl] = useState('');
  const [token, setToken] = useState('');
  const [isOfflineBooking, setIsOfflineBooking] = useState(false);

  // Confirm with full params
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
      if (result.queued) {
        setIsOfflineBooking(true);
      }
      // Apply coupon usage after successful booking
      if (coupon?.coupon_id && !result.queued) {
        applyCoupon(coupon.coupon_id).catch(() => {
          // Falha ao registrar uso do cupom — não crítica, o booking já foi criado
        });
      }
    }
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

  // Wrap wizardGoNext to pass handleConfirm for the last step
  const goNext = useCallback(() => {
    wizardGoNext(handleConfirm);
  }, [wizardGoNext, handleConfirm]);

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
