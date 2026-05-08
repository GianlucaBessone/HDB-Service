import { prisma } from './prisma';

interface AuditParams {
  userId?: string;
  userName?: string;
  action: string;
  entity: string;
  entityId?: string;
  oldValue?: any;
  newValue?: any;
  metadata?: any;
}

/**
 * Create an audit log entry for tracking all significant operations.
 */
export async function createAuditLog(params: AuditParams) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId,
        userName: params.userName,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        oldValue: params.oldValue,
        newValue: params.newValue,
        metadata: params.metadata,
      },
    });
  } catch (error) {
    console.error('[Audit] Failed to create audit log:', error);
  }
}
