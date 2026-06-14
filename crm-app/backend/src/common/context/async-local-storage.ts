import { AsyncLocalStorage } from 'async_hooks';

export interface RequestContext {
  actorId: string | null;
  traceId: string;
  ipAddress: string;
}

export const requestContext = new AsyncLocalStorage<RequestContext>();
