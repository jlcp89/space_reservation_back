export interface PersonAttributes {
  id?: number;
  email: string;
  role: string;
}

export interface SpaceAttributes {
  id?: number;
  name: string;
  location: string;
  capacity: number;
  description?: string | null;
}

export interface ReservationAttributes {
  id?: number;
  personId: number;
  spaceId: number;
  reservationDate: string; // YYYY-MM-DD format
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
}

export interface PaginationQuery {
  page?: number;
  pageSize?: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}