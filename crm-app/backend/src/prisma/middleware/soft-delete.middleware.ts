import { Prisma } from '@prisma/client';

const SOFT_DELETE_MODELS = [
  'User',
  'Team',
  'Customer',
  'Contact',
  'Activity',
  'PipelineStage',
  'Opportunity',
  'Task',
  'File',
];

export function softDeleteMiddleware(): Prisma.Middleware {
  return async (params, next) => {
    if (!SOFT_DELETE_MODELS.includes(params.model ?? '')) {
      return next(params);
    }

    if (params.action === 'delete') {
      params.action = 'update';
      params.args.data = { deletedAt: new Date() };
    }

    if (params.action === 'deleteMany') {
      params.action = 'updateMany';
      params.args.data = { deletedAt: new Date() };
    }

    if (
      ['findFirst', 'findMany', 'findUnique', 'count', 'aggregate'].includes(
        params.action,
      )
    ) {
      params.args = params.args ?? {};
      params.args.where = params.args.where ?? {};
      if (params.args.where.deletedAt === undefined) {
        params.args.where.deletedAt = null;
      }
    }

    return next(params);
  };
}
