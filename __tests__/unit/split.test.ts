import { calculateSplits } from '@/lib/split';

describe('calculateSplits', () => {
  const participants = [
    { id: 'p1' },
    { id: 'p2' },
    { id: 'p3' },
  ];

  describe('equal split', () => {
    it('divides evenly among all participants', () => {
      const splits = calculateSplits({ title: 'Dinner', amount: 90, paidById: 'p1', splitType: 'equal', participants });
      expect(splits).toHaveLength(3);
      expect(splits[0].amount).toBe(30);
      expect(splits[1].amount).toBe(30);
      expect(splits[2].amount).toBe(30);
    });

    it('rounds to 2 decimal places', () => {
      const splits = calculateSplits({ title: 'Taxi', amount: 100, paidById: 'p1', splitType: 'equal', participants });
      const total = splits.reduce((s, p) => s + p.amount, 0);
      expect(total).toBeCloseTo(100, 1);
    });

    it('sets percentage correctly', () => {
      const splits = calculateSplits({ title: 'Lunch', amount: 60, paidById: 'p1', splitType: 'equal', participants });
      splits.forEach((s) => expect(s.percentage).toBeCloseTo(33.33, 1));
    });
  });

  describe('percentage split', () => {
    it('calculates amounts from percentages', () => {
      const ps = [
        { id: 'p1', percentage: 50 },
        { id: 'p2', percentage: 30 },
        { id: 'p3', percentage: 20 },
      ];
      const splits = calculateSplits({ title: 'Hotel', amount: 200, paidById: 'p1', splitType: 'percentage', participants: ps });
      expect(splits[0].amount).toBe(100);
      expect(splits[1].amount).toBe(60);
      expect(splits[2].amount).toBe(40);
    });

    it('throws when percentages do not sum to 100', () => {
      const ps = [{ id: 'p1', percentage: 60 }, { id: 'p2', percentage: 20 }];
      expect(() =>
        calculateSplits({ title: 'X', amount: 100, paidById: 'p1', splitType: 'percentage', participants: ps })
      ).toThrow(/100/);
    });
  });
});
