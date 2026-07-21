-- Translate only the calibration quest with a stable system identifier.
-- User-authored submissions, reflections, evidence, feedback, and portfolio prose are untouched.

update public.quests
set title = 'The Courage to Begin',
    summary = 'Prove your willingness to grow through one real result.',
    instructions = 'Inspect a small tabular dataset, build a reproducible baseline, explain the validation method and metric, and record what was and was not completed.',
    acceptance_criteria = '["Identify at least one data-quality issue","Build a baseline and report a validation metric","Explain what was completed, what remains, and the next step"]'::jsonb,
    execution_steps = '["Inspect the dataset","Train a reproducible baseline","Record validation evidence","Reflect on the result"]'::jsonb,
    success_metrics = '["Artifact, metric, and reflection evidence are submitted"]'::jsonb,
    out_of_scope = '["Production deployment"]'::jsonb,
    updated_at = now()
where id = 'quest-courage-challenge';
