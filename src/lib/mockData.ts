import type { Service, Booking } from '../types';

export const SERVICES: Service[] = [
  {
    id: '1',
    name: 'Corte de Cabelo',
    price: 35.00,
    duration: 40,
    description: 'Corte moderno e personalizado.'
  },
  {
    id: '2',
    name: 'Barba',
    price: 27.00,
    duration: 20,
    description: 'Aparação e modelagem de barba.'
  },
  {
    id: '3',
    name: 'Barba com Toalha Quente',
    price: 30.00,
    duration: 30,
    description: 'Experiência relaxante com toalha quente.'
  },
  {
    id: '4',
    name: 'Sobrancelha',
    price: 15.00,
    duration: 10,
    description: 'Limpeza e design de sobrancelha.'
  },
  {
    id: '5',
    name: 'Pezinho',
    price: 15.00,
    duration: 10,
    description: 'Acabamento perfeito.'
  }
];

export const MOCK_BOOKINGS: (Booking & { client_name: string; client_phone: string })[] = [
  {
    id: 'b1',
    client_id: 'c1',
    client_name: 'João Silva',
    client_phone: '(48) 99999-1111',
    service_ids: ['1'],
    booking_date: '2026-06-12',
    booking_time: '14:00',
    status: 'confirmed',
    total_price: 35.00,
    total_duration: 40,
    created_at: '2026-06-10T10:00:00Z'
  },
  {
    id: 'b2',
    client_id: 'c2',
    client_name: 'Ricardo Souza',
    client_phone: '(48) 98888-2222',
    service_ids: ['1', '2'],
    booking_date: '2026-06-12',
    booking_time: '15:30',
    status: 'confirmed',
    total_price: 62.00,
    total_duration: 60,
    created_at: '2026-06-11T14:30:00Z'
  },
  {
    id: 'b3',
    client_id: 'c3',
    client_name: 'Mateus Oliveira',
    client_phone: '(48) 97777-3333',
    service_ids: ['3', '4'],
    booking_date: '2026-06-13',
    booking_time: '10:00',
    status: 'pending',
    total_price: 45.00,
    total_duration: 40,
    created_at: '2026-06-12T09:00:00Z'
  }
];
