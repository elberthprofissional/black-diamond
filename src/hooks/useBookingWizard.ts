import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatPhone } from '../lib/utils';
import { useWizardStep } from './useWizardStep';
import { useClientLookup } from './useClientLookup';
import { useBookingSlots } from './useBookingSlots';
import { useBookingSubmit } from './useBookingSubmit';
import type { Service, MensalistaPlan } from '../types';
import { MENSALISTA_EXCLUDED_SERVICES } from '../lib/constants';
import { useServices } from './useServices';
import { getMensalistaPlans } from '../lib/api';

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
  const { services: allServices } = useServices();
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [userInfo, setUserInfo] = useState({ name: '', phone: '' });

  // Mensalista plans
  const [allPlans, setAllPlans] = useState<MensalistaPlan[]>([]);

  useEffect(() => {
    getMensalistaPlans(true)
      .then(setAllPlans)
      .catch(() => {
        // Plans failed to load — fallback to hardcoded excluded services
      });
  }, []);

  // Client lookup
  const handleNameFound = useCallback((name: string) => {
    setUserInfo((prev) => ({ ...prev, name }));
  }, []);
  const { isMensalista, mensalistaPlanId, clientLookupLoading } = useClientLookup(
    userInfo.phone,
    handleNameFound
  );

  // Current plan
  const currentPlan = useMemo(
    () => allPlans.find((p) => p.id === mensalistaPlanId) || null,
    [allPlans, mensalistaPlanId]
  );

  // Date & time slots
  const slots = useBookingSlots(showError);

  // Submit
  const { isSubmitting, handleConfirm: rawConfirm } = useBookingSubmit(showError, () => setStep(5));

  // Filter services for mensalista — use plan's included_service_ids if available
  const filteredServices = useMemo(() => {
    if (!isMensalista) return allServices;

    // If client has a specific plan, exclude services included in the plan
    if (currentPlan && currentPlan.included_service_ids?.length > 0) {
      return allServices.filter((s) => !currentPlan.included_service_ids.includes(s.id));
    }

    // Fallback: use hardcoded excluded services
    return allServices.filter((s) => !MENSALISTA_EXCLUDED_SERVICES.includes(s.name));
  }, [allServices, isMensalista, currentPlan]);

  // Filter days for mensalista (MON-THU only)
  const filteredNextDays = useMemo(() => {
    if (!isMensalista) return slots.nextDays;
    return slots.nextDays.filter((d) => {
      const dow = new Date(d.fullDate + 'T12:00:00').getDay();
      return dow >= 1 && dow <= 4;
    });
  }, [slots.nextDays, isMensalista]);

  // Reset selected services when mensalista status changes
  useEffect(() => {
    if (isMensalista && selectedServices.length > 0) {
      let allowed: Service[];
      if (currentPlan && currentPlan.included_service_ids?.length > 0) {
        allowed = selectedServices.filter((s) => !currentPlan.included_service_ids.includes(s.id));
      } else {
        allowed = selectedServices.filter((s) => !MENSALISTA_EXCLUDED_SERVICES.includes(s.name));
      }
      if (allowed.length !== selectedServices.length) {
        setSelectedServices(allowed);
      }
    }
  }, [isMensalista, selectedServices, currentPlan]);

  // Toggle service
  const toggleService = useCallback((service: Service) => {
    setSelectedServices((prev) =>
      prev.find((s) => s.id === service.id)
        ? prev.filter((s) => s.id !== service.id)
        : [...prev, service]
    );
  }, []);

  // Total price
  const [totalPrice, setTotalPrice] = useState(0);
  const [manageUrl, setManageUrl] = useState('');
  const [token, setToken] = useState('');

  // Calculate total price
  const calculatedTotalPrice = useMemo(
    () => selectedServices.reduce((sum, s) => sum + Number(s.price), 0),
    [selectedServices]
  );

  // Confirm with full params
  const handleConfirm = useCallback(async () => {
    const result = await rawConfirm({
      selectedServices,
      selectedDate: slots.selectedDate,
      selectedTime: slots.selectedTime,
      userInfo,
      totalPrice: calculatedTotalPrice,
      isMensalista,
    });
    if (result) {
      setToken(result.token);
      setManageUrl(result.manageUrl);
    }
  }, [
    rawConfirm,
    selectedServices,
    slots.selectedDate,
    slots.selectedTime,
    userInfo,
    calculatedTotalPrice,
    isMensalista,
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
    totalPrice,
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
  };
}
