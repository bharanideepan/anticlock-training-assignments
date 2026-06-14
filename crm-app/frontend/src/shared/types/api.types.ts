export interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface ApiResponse<T> {
  data: T;
}

export interface ApiError {
  error: { code: string; message: string };
  path: string;
  timestamp: string;
}

export type UserStatus = 'ACTIVE' | 'INACTIVE';
export type RoleName =
  | 'SYSTEM_ADMINISTRATOR'
  | 'SALES_MANAGER'
  | 'SALES_REPRESENTATIVE'
  | 'SUPPORT_REPRESENTATIVE'
  | 'READ_ONLY';
export type CustomerStatus = 'PROSPECT' | 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
export type ActivityType = 'PHONE_CALL' | 'MEETING' | 'EMAIL' | 'NOTE' | 'FOLLOW_UP';
export type TaskType = 'FOLLOW_UP' | 'CALL' | 'MEETING' | 'EMAIL' | 'INTERNAL_ACTION';
export type TaskStatus = 'OPEN' | 'COMPLETED' | 'CANCELLED';
export type NotificationType =
  | 'TASK_ASSIGNED'
  | 'OPPORTUNITY_ASSIGNED'
  | 'DUE_DATE_REMINDER'
  | 'OVERDUE_TASK'
  | 'CUSTOMER_UPDATED';
export type ResourceType = 'CUSTOMER' | 'OPPORTUNITY' | 'ACTIVITY';
export type AuditAction =
  | 'LOGIN' | 'LOGOUT' | 'LOGIN_FAILED' | 'PASSWORD_RESET'
  | 'RECORD_CREATED' | 'RECORD_UPDATED' | 'RECORD_DELETED'
  | 'STATUS_CHANGED' | 'OWNERSHIP_CHANGED' | 'ROLE_CHANGED' | 'IMPORT_COMPLETED';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  jobTitle?: string;
  status: UserStatus;
  role: { id: string; name: RoleName };
  teams?: { id: string; name: string }[];
  createdAt: string;
  updatedAt?: string;
}

export interface Customer {
  id: string;
  companyName: string;
  industry?: string;
  website?: string;
  revenueRange?: string;
  status: CustomerStatus;
  owner?: Pick<User, 'id' | 'firstName' | 'lastName' | 'email'> | null;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  designation?: string;
  department?: string;
  notes?: string;
  customerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Activity {
  id: string;
  type: ActivityType;
  subject: string;
  description?: string;
  scheduledAt?: string;
  durationMinutes?: number;
  customerId: string;
  contactId?: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface PipelineStage {
  id: string;
  name: string;
  displayOrder: number;
  isDefault: boolean;
  isTerminal: boolean;
  terminalOutcome?: 'WON' | 'LOST';
}

export interface Opportunity {
  id: string;
  name: string;
  customerId: string;
  contactId?: string;
  owner: Pick<User, 'id' | 'firstName' | 'lastName'>;
  stage: PipelineStage;
  expectedRevenue?: string;
  probability?: number;
  expectedCloseDate?: string;
  actualCloseDate?: string;
  closeNote?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  type: TaskType;
  title: string;
  description?: string;
  status: TaskStatus;
  dueDate: string;
  isOverdue: boolean;
  completedAt?: string;
  cancelledAt?: string;
  assignee: Pick<User, 'id' | 'firstName' | 'lastName'>;
  createdById: string;
  customerId?: string;
  opportunityId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  resourceType?: string;
  resourceId?: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

export interface FileRecord {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  resourceType: ResourceType;
  resourceId: string;
  uploadedBy: Pick<User, 'id' | 'firstName' | 'lastName'>;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  action: AuditAction;
  resourceType: string;
  resourceId?: string;
  actor?: Pick<User, 'id' | 'firstName' | 'lastName' | 'email'>;
  previousValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  ipAddress?: string;
  traceId?: string;
  createdAt: string;
}
