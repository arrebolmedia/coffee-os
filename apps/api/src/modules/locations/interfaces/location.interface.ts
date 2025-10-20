export enum LocationStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  COMING_SOON = 'coming_soon',
  TEMPORARILY_CLOSED = 'temporarily_closed',
  PERMANENTLY_CLOSED = 'permanently_closed',
}

export enum LocationType {
  FLAGSHIP = 'flagship',
  STANDARD = 'standard',
  KIOSK = 'kiosk',
  FOOD_TRUCK = 'food_truck',
  POPUP = 'popup',
}

export interface LocationHours {
  day_of_week: number; // 0 = Sunday, 6 = Saturday
  open_time: string; // HH:mm format
  close_time: string; // HH:mm format
  is_closed: boolean;
}

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
}

export interface Location {
  id: string;
  organization_id: string;
  code: string;
  name: string;
  type: LocationType;
  status: LocationStatus;
  
  // Address
  address: string;
  address_line_2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  
  // Contact
  phone?: string;
  email?: string;
  
  // GPS
  coordinates?: LocationCoordinates;
  
  // Hours
  hours?: LocationHours[];
  timezone?: string;
  
  // Capacity
  seating_capacity?: number;
  max_occupancy?: number;
  
  // Operational
  manager_id?: string;
  opening_date?: Date;
  
  // Settings
  allow_online_orders: boolean;
  allow_delivery: boolean;
  allow_pickup: boolean;
  allow_dine_in: boolean;
  
  // Images
  image_url?: string;
  
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

export interface LocationStats {
  total_locations: number;
  by_status: Record<LocationStatus, number>;
  by_type: Record<LocationType, number>;
  active_count: number;
}
