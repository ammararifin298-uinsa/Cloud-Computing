import { getRequestId, requestContext } from "../core/logger.js";

/**
 * Observer Pattern: DomainEventBus with transactional AuditLogObserver.
 */
export class DomainEventBus {
  constructor() {
    this.handlers = [];
  }

  subscribe(handler) {
    this.handlers.push(handler);
  }

  async publish(client, event) {
    for (const handler of this.handlers) {
      await handler(client, event);
    }
  }
}

export async function writeAuditLogObserver(client, event) {
  const ip = event.ipAddress ?? requestContext.getStore()?.ip ?? null;
  await client.query(
    `INSERT INTO audit_log (actor_id, action, target_type, target_id, before_data, after_data, request_id, ip_address)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7, $8)`,
    [
      event.actorId ?? null,
      event.action,
      event.targetType,
      String(event.targetId),
      event.beforeData !== undefined ? JSON.stringify(event.beforeData) : null,
      event.afterData !== undefined ? JSON.stringify(event.afterData) : null,
      getRequestId(),
      ip,
    ]
  );
}

export const auditBus = new DomainEventBus();
auditBus.subscribe(writeAuditLogObserver);
