import { z } from "zod";

import { SKILL_KEYS } from "@/domain/training/constants";
import {
  ArtifactTypeSchema,
  DifficultySchema,
  EvidenceTypeSchema,
} from "@/domain/training/schemas";

const TextSchema = z.string().trim().min(1).max(800);
const SkillWeightsSchema = z.strictObject(
  Object.fromEntries(SKILL_KEYS.map((key) => [key, z.number().min(0).max(1)])) as Record<
    (typeof SKILL_KEYS)[number],
    z.ZodNumber
  >,
);

const GeneratedEvidenceRequirementSchema = z.strictObject({
  id: z.string().trim().min(1).max(80),
  type: EvidenceTypeSchema,
  required: z.boolean(),
  acceptedHosts: z.array(z.string().trim().min(1).max(120)).max(5).optional(),
});

export const GeneratedDailyQuestProposalSchema = z.strictObject({
  title: z.string().trim().min(1).max(120),
  summary: TextSchema,
  instructions: z.string().trim().min(1).max(2_000),
  questType: z.enum([
    "dataPractice",
    "modelExperiment",
    "evaluationPractice",
    "engineeringBuild",
    "researchReview",
    "productExercise",
    "communicationExercise",
  ]),
  difficulty: DifficultySchema,
  estimatedMinutes: z.number().int().min(1).max(60),
  executionSteps: z.array(TextSchema).min(3).max(5),
  acceptanceCriteria: z.array(TextSchema).min(3).max(5),
  successMetrics: z.array(TextSchema).min(1).max(3),
  evidenceRequirements: z
    .array(GeneratedEvidenceRequirementSchema)
    .min(1)
    .max(3)
    .refine((requirements) => requirements.some((requirement) => requirement.required), {
      message: "At least one evidence requirement must be required",
    }),
  skillWeights: SkillWeightsSchema,
  expectedArtifactType: ArtifactTypeSchema,
  resourceIds: z.array(z.string().trim().min(1).max(120)).max(3),
  outOfScope: z.array(TextSchema).min(1).max(3),
});

export type GeneratedDailyQuestProposal = z.infer<
  typeof GeneratedDailyQuestProposalSchema
>;
