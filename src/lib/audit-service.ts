import { db } from "@/db";
import { auditLogs } from "@/db/schema";

export async function recordAuditLog(data: {
  actorId?: number;
  action: string;
  targetType: "user" | "venue" | "event" | "booking" | "system";
  targetId: string | number;
  details?: Record<string, any>;
  ipAddress?: string;
}) {
  try {
    const [log] = await db
      .insert(auditLogs)
      .values({
        actorId: data.actorId,
        action: data.action,
        targetType: data.targetType,
        targetId: data.targetId.toString(),
        details: data.details ? JSON.stringify(data.details) : null,
        ipAddress: data.ipAddress,
      })
      .returning();
    return log;
  } catch (err) {
    console.error("Failed to record audit log:", err);
    return null;
  }
}
