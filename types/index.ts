export type SplitType = 'equal' | 'percentage';

export interface SettlementEntry {
  from: string;
  fromId: string;
  to: string;
  toId: string;
  amount: number;
}

export interface ParticipantBalance {
  id: string;
  name: string;
  paid: number;
  owed: number;
  net: number;
}

export interface TransactionWithSplits {
  id: string;
  title: string;
  amount: number;
  paidById: string;
  paidBy: { id: string; name: string };
  splits: Array<{
    id: string;
    participantId: string;
    participant: { id: string; name: string };
    amount: number;
    percentage?: number | null;
  }>;
  createdAt: Date;
}

export interface CreateTransactionInput {
  title: string;
  amount: number;
  paidById: string;
  splitType: SplitType;
  participants: Array<{ id: string; percentage?: number }>;
}
