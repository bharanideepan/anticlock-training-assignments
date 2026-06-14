import { Prisma } from '@prisma/client';
import { requestContext } from '../../common/context/async-local-storage';

const AUDITABLE_MODELS = [
  'User',
  'Team',
  'Customer',
  'Contact',
  'Activity',
  'PipelineStage',
  'Opportunity',
  'Task',
];

const ACTION_MAP: Record<string, string> = {
  create: 'RECORD_CREATED',
  update: 'RECORD_UPDATED',
  delete: 'RECORD_DELETED',
};

export function auditMiddleware(
  prismaCreate: (data: Prisma.AuditLogCreateInput) => Promise<unknown>,
): Prisma.Middleware {
  return async (params, next) => {
    const result = await next(params);

    const action = ACTION_MAP[params.action ?? ''];
    if (!action || !AUDITABLE_MODELS.includes(params.model ?? '')) {
      return result;
    }

    const ctx = requestContext.getStore();
    const resourceId =
      (result as { id?: string })?.id ?? params.args?.where?.id;

    prismaCreate({
      actorId: ctx?.actorId ?? null,
      action: action as Prisma.AuditLogCreateInput['action'],
      resourceType: params.model ?? '',
      resourceId: resourceId ?? null,
      previousValue:
        params.action === 'update' ? params.args?.where : undefined,
      newValue: params.action !== 'delete' ? (result as object) : undefined,
      traceId: ctx?.traceId,
      ipAddress: ctx?.ipAddress,
    }).catch(() => {
      // Audit failures must not break the primary operation
    });

    return result;
  };
}
