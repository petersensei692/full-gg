import { ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';

/** Each entry is e.g. { slUpdate1: 1.1425 } — dynamic keys, numeric values (whitelist-safe). */
@ValidatorConstraint({ name: 'isSlEvolutionEntry', async: false })
export class IsSlEvolutionEntryConstraint implements ValidatorConstraintInterface {
  validate(obj: unknown): boolean {
    if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) return false;
    const vals = Object.values(obj as Record<string, unknown>);
    if (vals.length < 1) return false;
    return vals.every((v) => typeof v === 'number' && Number.isFinite(v));
  }

  defaultMessage(): string {
    return 'Each SL evolution item must be an object with one or more finite numeric prices.';
  }
}
