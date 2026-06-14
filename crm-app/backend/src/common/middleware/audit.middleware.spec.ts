import { auditMiddleware } from '../../prisma/middleware/audit.middleware';
import { requestContext } from '../context/async-local-storage';

describe('auditMiddleware', () => {
  let auditCreate: jest.Mock;
  let middleware: ReturnType<typeof auditMiddleware>;

  beforeEach(() => {
    auditCreate = jest.fn().mockResolvedValue({});
    middleware = auditMiddleware(auditCreate);
  });

  function fakeParams(action: string, model: string, args: object = {}): any {
    return { action, model, args };
  }

  const next = jest.fn().mockResolvedValue({ id: 'resource-1' });

  beforeEach(() => {
    next.mockClear();
    auditCreate.mockClear();
  });

  it('creates an audit log entry for create operations', async () => {
    const params = fakeParams('create', 'Customer');
    await middleware(params, next);
    expect(auditCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'RECORD_CREATED',
        resourceType: 'Customer',
      }),
    );
  });

  it('creates an audit log entry for update operations', async () => {
    const params = fakeParams('update', 'Customer', {
      where: { id: 'c-1' },
      data: {},
    });
    await middleware(params, next);
    expect(auditCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'RECORD_UPDATED',
        resourceType: 'Customer',
      }),
    );
  });

  it('creates an audit log entry for delete operations', async () => {
    const params = fakeParams('delete', 'Customer', { where: { id: 'c-1' } });
    await middleware(params, next);
    expect(auditCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'RECORD_DELETED',
        resourceType: 'Customer',
      }),
    );
  });

  it('does NOT create audit log for non-auditable models', async () => {
    const params = fakeParams('create', 'AuditLog');
    await middleware(params, next);
    expect(auditCreate).not.toHaveBeenCalled();
  });

  it('does NOT create audit log for non-write operations (findMany)', async () => {
    const params = fakeParams('findMany', 'Customer');
    next.mockResolvedValueOnce([]);
    await middleware(params, next);
    expect(auditCreate).not.toHaveBeenCalled();
  });

  it('includes actorId and traceId from request context', () => {
    const store = {
      actorId: 'actor-1',
      traceId: 'trace-1',
      ipAddress: '127.0.0.1',
    };
    requestContext.run(store, async () => {
      const params = fakeParams('create', 'Customer');
      await middleware(params, next);
      expect(auditCreate).toHaveBeenCalledWith(
        expect.objectContaining({ actorId: 'actor-1', traceId: 'trace-1' }),
      );
    });
  });
});
