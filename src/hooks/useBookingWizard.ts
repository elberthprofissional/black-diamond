import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatPhone } from '../lib/utils';
import { useWizardStep } from './useWizardStep';
import { useClientLookup } from './useClientLookup';
import { useBookingSlots } from './useBookingSlots';
import { useBookingSubmit } from './useBookingSubmit';
import type { Service, MensalistaPlan, MilestoneProgress } from '../types';
import { useServices } from './useServices';
import { getMensalistaPlans, validateCoupon, applyCoupon } from '../lib/api';
import { getClientMilestonesPublic } from '../lib/api/loyalty';
import { useMensalistaFilter } from './useMensalistaFilter';

export function useBookingWizard(
  showError: (msg: string) => void,
  showSuccess?: (msg: string) => void
) {
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

  // Milestone progress for loyalty banner
  const [milestoneProgress, setMilestoneProgress] = useState<MilestoneProgress[]>([]);
  useEffect(() => {
    if (clientId) {
      getClientMilestonesPublic(clientId)
        .then(setMilestoneProgress)
        .catch(() => setMilestoneProgress([]));
    } else {
      setMilestoneProgress([]);
    }
  }, [clientId]);

  // Find next milestone for customer-facing message
  const nextMilestone = useMemo(() => {
    if (!milestoneProgress || milestoneProgress.length === 0) return null;
    const unclaimed = milestoneProgress.filter((m) => !m.already_claimed);
    if (unclaimed.length === 0) return null;
    return unclaimed[0];
  }, [milestoneProgress]);

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

  // Submit
  const { isSubmitting, handleConfirm: rawConfirm } = useBookingSubmit(
    showError,
    () => setStep(5),
    showSuccess
  );

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

  // Coupon state
  const [coupon, setCoupon] = useState<{
    coupon_id: string;
    code: string;
    discount_type: string;
    discount_amount: number;
  } | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState('');
  const [couponCode, setCouponCode] = useState('');

  // Calculate total price
  const calculatedTotalPrice = useMemo(
    () => selectedServices.reduce((sum, s) => sum + Number(s.price), 0),
    [selectedServices]
  );

  // Final price after coupon discount
  const finalPrice = useMemo(
    () => Math.max(0, calculatedTotalPrice - (coupon?.discount_amount || 0)),
    [calculatedTotalPrice, coupon]
  );

  // Validate coupon code
  const handleCouponValidate = useCallback(
    async (code: string) => {
      if (!code.trim()) {
        setCouponError('Informe um código.');
        return;
      }
      setCouponLoading(true);
      setCouponError('');
      try {
        const result = await validateCoupon(
          code,
          selectedServices.map((s) => s.id)
        );
        if (result.valid) {
          setCouponCode(code.trim().toUpperCase());
          setCoupon({
            coupon_id: result.coupon_id || '',
            code: result.code || '',
            discount_type: result.discount_type || '',
            discount_amount: result.discount_amount || 0,
          });
        } else {
          setCoupon(null);
          setCouponCode('');
          setCouponError(result.error || 'Cupom inválido.');
        }
      } catch {
        setCoupon(null);
        setCouponCode('');
        setCouponError('Erro ao validar cupom.');
      } finally {
        setCouponLoading(false);
      }
    },
    [selectedServices]
  );

  // Remove applied coupon
  const handleCouponRemove = useCallback(() => {
    setCoupon(null);
    setCouponError('');
    setCouponCode('');
  }, []);

  // Re-validate coupon when services change (to recalculate discount)
  useEffect(() => {
    if (!couponCode || selectedServices.length === 0) return;

    let cancelled = false;
    setCouponLoading(true);

    validateCoupon(
      couponCode,
      selectedServices.map((s) => s.id)
    )
      .then((result) => {
        if (cancelled) return;
        if (result.valid) {
          setCoupon({
            coupon_id: result.coupon_id || '',
            code: result.code || '',
            discount_type: result.discount_type || '',
            discount_amount: result.discount_amount || 0,
          });
        } else {
          setCoupon(null);
          setCouponCode('');
          setCouponError(result.error || 'Cupom inválido para os serviços selecionados.');
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCoupon(null);
          setCouponCode('');
        }
      })
      .finally(() => {
        if (!cancelled) setCouponLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [couponCode, selectedServices]);

  // Confirm with full params
  const handleConfirm = useCallback(async () => {
    const result = await rawConfirm({
      selectedServices,
      selectedDate: slots.selectedDate,
      selectedTime: slots.selectedTime,
      userInfo,
      totalPrice: finalPrice,
      isMensalista,
      couponId: coupon?.coupon_id,
      discountAmount: coupon?.discount_amount,
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
    selectedServices,
    slots.selectedDate,
    slots.selectedTime,
    userInfo,
    finalPrice,
    isMensalista,
    coupon,
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
      selectedServices,
      selectedDate: slots.selectedDate,
      selectedTime: slots.selectedTime,
      isSubmitting,
    }),
    [step, userInfo, selectedServices, slots.selectedDate, slots.selectedTime, isSubmitting]
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
