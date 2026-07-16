import { z } from "zod";

import { TrainingStateSchema } from "@/domain/training/schemas";
import type { TrainingState } from "@/domain/training/types";

export const STORAGE_KEY = "mlevelup:phase1:v1";

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const StorageEnvelopeSchema = z.strictObject({
  schemaVersion: z.literal(1),
  seedVersion: z.string().min(1),
  savedAt: z.iso.datetime(),
  state: TrainingStateSchema,
});

export class LocalTrainingStorage {
  constructor(
    private readonly storage: StorageLike,
    private readonly expectedSeedVersion: string,
  ) {}

  load(fallback: () => TrainingState): TrainingState {
    try {
      const raw = this.storage.getItem(STORAGE_KEY);
      if (!raw) return TrainingStateSchema.parse(fallback());

      const envelope = StorageEnvelopeSchema.parse(JSON.parse(raw) as unknown);
      if (
        envelope.seedVersion !== this.expectedSeedVersion ||
        envelope.state.seedVersion !== this.expectedSeedVersion
      ) {
        return TrainingStateSchema.parse(fallback());
      }
      return envelope.state;
    } catch {
      return TrainingStateSchema.parse(fallback());
    }
  }

  save(state: TrainingState, savedAt: string): void {
    const validated = TrainingStateSchema.parse(state);
    if (validated.seedVersion !== this.expectedSeedVersion) {
      throw new Error("Cannot persist an unexpected seed version");
    }

    const envelope = StorageEnvelopeSchema.parse({
      schemaVersion: 1,
      seedVersion: this.expectedSeedVersion,
      savedAt,
      state: validated,
    });
    this.storage.setItem(STORAGE_KEY, JSON.stringify(envelope));
  }

  reset(): void {
    this.storage.removeItem(STORAGE_KEY);
  }
}
