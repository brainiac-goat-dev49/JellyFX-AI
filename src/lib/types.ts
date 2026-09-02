export interface User {
  uid: string;
  fullName: string;
  username: string;
  email: string;
  gender?: string;
  country?: string;
  phone?: string;
  referralCode?: string;
  recoveryToken?: string;
  photoURL?: string | null;
  createdAt?: any;
  updatedAt?: any;
}

export interface Transaction {
  id: string;
  type: 'deposit' | 'withdrawal' | 'transfer';
  amount: number;
  currency: string;
  status: 'completed' | 'pending' | 'failed';
  date: string;
  description: string;
}
