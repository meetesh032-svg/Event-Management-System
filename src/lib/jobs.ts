/**
 * Background Jobs & Asynchronous Worker Queue
 * Executes deferred tasks off the critical HTTP request path.
 */

export type JobType =
  | "send_email"
  | "send_push"
  | "audit_log"
  | "release_stale_seat_holds"
  | "generate_ticket_pdf";

export interface JobPayload {
  type: JobType;
  data: Record<string, any>;
  createdAt: number;
}

class BackgroundJobQueue {
  private queue: JobPayload[] = [];
  private isProcessing = false;

  /**
   * Dispatch a task asynchronously without awaiting completion
   */
  dispatch(type: JobType, data: Record<string, any>): void {
    this.queue.push({
      type,
      data,
      createdAt: Date.now(),
    });

    // Fire processing non-blockingly
    if (!this.isProcessing) {
      setTimeout(() => this.processNext(), 0);
    }
  }

  private async processNext(): Promise<void> {
    if (this.queue.length === 0) {
      this.isProcessing = false;
      return;
    }

    this.isProcessing = true;
    const job = this.queue.shift();

    if (job) {
      try {
        await this.handleJob(job);
      } catch (err) {
        console.error(`Background job failed (${job.type}):`, err);
      }
    }

    // Schedule next
    setTimeout(() => this.processNext(), 10);
  }

  private async handleJob(job: JobPayload): Promise<void> {
    switch (job.type) {
      case "send_email":
        // Offloaded email dispatch
        if (job.data.userId && job.data.title && job.data.message) {
          const { sendNotification } = await import("./notification-service");
          await sendNotification({
            userId: job.data.userId,
            channel: "email",
            type: "ticket_update",
            title: job.data.title,
            message: job.data.message,
            recipientEmail: job.data.recipientEmail,
          });
        }
        break;

      case "audit_log":
        // Offloaded audit logging
        if (job.data.action && job.data.targetType) {
          const { recordAuditLog } = await import("./audit-service");
          await recordAuditLog({
            actorId: job.data.actorId,
            action: job.data.action,
            targetType: job.data.targetType,
            targetId: String(job.data.targetId),
            details: job.data.details,
            ipAddress: job.data.ipAddress,
          });
        }
        break;

      case "release_stale_seat_holds":
        // Release expired holds in seatReservations
        try {
          const { db } = await import("@/db");
          const { seatReservations } = await import("@/db/schema");
          const { and, eq, lt } = await import("drizzle-orm");
          await db
            .delete(seatReservations)
            .where(
              and(
                eq(seatReservations.status, "held"),
                lt(seatReservations.heldUntil, new Date())
              )
            );
        } catch (e) {
          console.error("Failed to release expired seat reservations:", e);
        }
        break;

      default:
        break;
    }
  }
}

export const jobQueue = new BackgroundJobQueue();
