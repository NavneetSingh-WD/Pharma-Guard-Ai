/**
 * Calculates the total dose in mg based on patient weight and target dose (mg/kg).
 */
export function calculateMgDose(weightKg: number, targetDoseMgKg: number): number {
  if (weightKg <= 0 || targetDoseMgKg <= 0) return 0;
  return weightKg * targetDoseMgKg;
}

/**
 * Calculates the required volume in mL based on the total dose and concentration.
 */
export function calculateMlVolume(totalMg: number, concentrationMg: number, concentrationMl: number): number {
  if (totalMg <= 0 || concentrationMg <= 0 || concentrationMl <= 0) return 0;
  return (totalMg / concentrationMg) * concentrationMl;
}

/**
 * Checks if a patient is considered pediatric based on age.
 */
export function isPediatric(age: number): boolean {
  return age < 18;
}
