import { memo, type RefObject, type MouseEvent, type FC } from 'react';
import { useIsDesktop } from '../../hooks/useIsDesktop';
import BookingPageDesktop from './BookingPageDesktop';
import BookingPageMobile from './BookingPageMobile';
import type { Service, Barber } from '../../types';

interface BookingPageViewProps {
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
  token?: string;
  manageUrl?: string;
  servicesLoading?: boolean;
  lastBooking?: { serviceIds: string[]; totalPrice: number } | null;
  onApplyLastBooking?: () => void;
  isOfflineBooking?: boolean;
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

const BookingPageView: FC<BookingPageViewProps> = memo(
  ({
    step,
    stepTitle,
    services,
    selectedServices,
    selectedDate,
    selectedTime,
    userInfo,
    selectedBarber,
    onSelectBarber,
    totalPrice,
    isStepDisabled,
    isSubmitting,
    availableSlots,
    existingBookings,
    dateContainerRef,
    handleMouseDown,
    handleMouseLeave,
    handleMouseUp,
    handleMouseMove,
    toggleService,
    setSelectedDate,
    setSelectedTime,
    setUserInfo,
    goNext,
    goBack,
    navigate,
    nextDays,
    isMensalista,
    planName,
    clientLookupLoading,
    servicesLoading = false,
    lastBooking,
    onApplyLastBooking,
    isOfflineBooking = false,
    nextMilestone,
    coupon,
    couponLoading,
    couponError,
    originalPrice,
    onCouponValidate,
    onCouponRemove,
  }) => {
    const isDesktop = useIsDesktop();

    const common = {
      step,
      stepTitle,
      services,
      selectedServices,
      selectedDate,
      selectedTime,
      userInfo,
      selectedBarber,
      onSelectBarber,
      totalPrice,
      isStepDisabled,
      isSubmitting,
      availableSlots,
      existingBookings,
      toggleService,
      setSelectedDate,
      setSelectedTime,
      setUserInfo,
      goNext,
      goBack,
      navigate,
      nextDays,
      isMensalista,
      planName,
      clientLookupLoading,
      servicesLoading,
      lastBooking,
      onApplyLastBooking,
      isOfflineBooking,
      nextMilestone,
      coupon,
      couponLoading,
      couponError,
      originalPrice,
      onCouponValidate,
      onCouponRemove,
    };

    return isDesktop ? (
      <BookingPageDesktop {...common} />
    ) : (
      <BookingPageMobile
        {...common}
        dateContainerRef={dateContainerRef}
        handleMouseDown={handleMouseDown}
        handleMouseLeave={handleMouseLeave}
        handleMouseUp={handleMouseUp}
        handleMouseMove={handleMouseMove}
      />
    );
  }
);

BookingPageView.displayName = 'BookingPageView';

export default BookingPageView;
