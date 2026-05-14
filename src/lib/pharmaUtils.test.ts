import { describe, it, expect } from 'vitest';
import { calculateMgDose, calculateMlVolume, isPediatric } from './pharmaUtils';

describe('pharmaUtils', () => {
  describe('calculateMgDose', () => {
    it('should correctly calculate dose for standard weight', () => {
      expect(calculateMgDose(10, 15)).toBe(150);
    });

    it('should return 0 for non-positive values', () => {
      expect(calculateMgDose(-5, 10)).toBe(0);
      expect(calculateMgDose(10, 0)).toBe(0);
    });
  });

  describe('calculateMlVolume', () => {
    it('should correctly calculate volume for standard concentration', () => {
      // 150mg total / (250mg / 5mL) = 3mL
      expect(calculateMlVolume(150, 250, 5)).toBe(3);
    });

    it('should return 0 for non-positive values', () => {
      expect(calculateMlVolume(0, 100, 1)).toBe(0);
      expect(calculateMlVolume(100, 0, 1)).toBe(0);
      expect(calculateMlVolume(100, 100, -1)).toBe(0);
    });
  });

  describe('isPediatric', () => {
    it('should return true for age < 18', () => {
      expect(isPediatric(5)).toBe(true);
      expect(isPediatric(17)).toBe(true);
    });

    it('should return false for age >= 18', () => {
      expect(isPediatric(18)).toBe(false);
      expect(isPediatric(45)).toBe(false);
    });
  });
});
