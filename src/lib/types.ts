export interface User {
  uid: string;
  fullName: string;
  username: string;
  email: string;
  gender?: string;
  customGender?: string;
  country?: string;
  customCountry?: string;
  phone?: string;
  referralCode?: string;
  referrerUid?: string | null;
  grandReferrerUid?: string | null;
  recoveryToken?: string;
  photoURL?: string | null;
  status?: 'active' | 'suspended' | 'blocked' | string;
  role?: 'admin' | 'user' | string;
  blockReason?: string | null;
  suspensionReason?: string | null;
  suspensionLiftDate?: string | Date | null;
  createdAt?: any;
  updatedAt?: any;
  lastSeen?: string | any;
  isWalletFrozen?: boolean;
  walletFreezeReason?: string | null;
}

export interface UserWithWallet extends User {
  totalEarnings?: number;
  lastSeen?: string;
}

export interface Transaction {
  id: string;
  type: 'deposit' | 'withdrawal' | 'transfer' | 'bonus' | 'survey' | 'referral';
  amount: number;
  currency: string;
  status: 'completed' | 'pending' | 'failed';
  date: string;
  description: string;
}

export interface WalletData {
  balance: number;
  surveyBalance: number;
  referralBalance: number;
  bonusBalance: number;
  pendingBalance?: number;
  pendingEarnings?: number;
  completedTasks?: number;
  isFrozen?: boolean;
  freezeReason?: string | null;
  frozenAt?: string | null;
}

export interface SurveyQuestionOption {
  text: string;
  nextQuestionId?: string;
}

export interface SurveyQuestion {
  id: string;
  text: string;
  type: 'multiple-choice' | 'text' | 'button' | 'link' | 'image' | 'video' | 'image_grid';
  isRequired: boolean;
  options?: SurveyQuestionOption[];
  url?: string;
  label?: string;
  images?: { src: string; alt: string }[];
  answerInputs?: {
    text?: boolean;
    upload?: boolean;
    calendar?: boolean;
    rating?: boolean;
  };
}

export interface Survey {
  id: string;
  title: string;
  description: string;
  reward: number;
  durationInMinutes: number;
  terms: string;
  requirements: string[];
  questions: SurveyQuestion[];
  status?: 'available' | 'ongoing' | 'completed' | 'paused' | 'draft' | 'ready' | 'soon' | string;
  progress?: number;
  isPausable?: boolean;
  createdAt?: string | any;
  updatedAt?: string | any;
  category?: string;
  participantsCount?: number;
}

export interface SurveyHistoryItem {
  id: string;
  title: string;
  status: 'Completed' | 'Pending' | 'Rejected' | 'Failed' | string;
  date: string;
  earnings: number;
  completionPercentage?: number;
  reviewNotes?: string;
}

export interface NotificationItem {
  id: string;
  type?: string;
  title: string;
  content: string;
  timestamp: string;
  read: boolean;
  sender?: string;
  data?: {
    button?: {
      text: string;
      link: string;
    };
    [key: string]: any;
  };
}
