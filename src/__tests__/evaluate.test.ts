import { createEvaluate } from '../evaluate';

describe('createEvaluate', () => {
  describe('value()', () => {
    it('should return the lowercase value', () => {
      expect(createEvaluate('ON').value()).toBe('on');
      expect(createEvaluate('Off').value()).toBe('off');
      expect(createEvaluate('variant-A').value()).toBe('variant-a');
    });
  });

  describe('is()', () => {
    it('should compare case-insensitively', () => {
      const evaluate = createEvaluate('VariantA');
      expect(evaluate.is('varianta')).toBe(true);
      expect(evaluate.is('VARIANTA')).toBe(true);
      expect(evaluate.is('variantA')).toBe(true);
      expect(evaluate.is('variantB')).toBe(false);
    });
  });

  describe('isOn()', () => {
    it('should return true for "on" value', () => {
      expect(createEvaluate('on').isOn()).toBe(true);
      expect(createEvaluate('ON').isOn()).toBe(true);
      expect(createEvaluate('On').isOn()).toBe(true);
    });

    it('should return false for non-"on" values', () => {
      expect(createEvaluate('off').isOn()).toBe(false);
      expect(createEvaluate('variant').isOn()).toBe(false);
    });
  });

  describe('isOff()', () => {
    it('should return true for "off" value', () => {
      expect(createEvaluate('off').isOff()).toBe(true);
      expect(createEvaluate('OFF').isOff()).toBe(true);
      expect(createEvaluate('Off').isOff()).toBe(true);
    });

    it('should return false for non-"off" values', () => {
      expect(createEvaluate('on').isOff()).toBe(false);
      expect(createEvaluate('variant').isOff()).toBe(false);
    });
  });
});

