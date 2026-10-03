import { auth, db, rtdb } from '@/lib/firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  UserCredential
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  serverTimestamp,
  deleteDoc
} from 'firebase/firestore';
import { ref, set, push, update, get, runTransaction } from 'firebase/database';
import { User, WalletData } from '@/lib/types';

/**
 * Sign in user by Email, Username, Phone, or Recovery Token
 */
export async function signInUser(identifier: string, password: string): Promise<UserCredential> {
  const trimmed = identifier.trim();
  let emailToUse = trimmed;

  if (!trimmed.includes('@')) {
    const usersRef = collection(db, 'users');

    const usernameQuery = query(usersRef, where('username', '==', trimmed.toLowerCase()));
    let snap = await getDocs(usernameQuery);

    if (snap.empty) {
      const tokenQuery = query(usersRef, where('recoveryToken', '==', trimmed));
      snap = await getDocs(tokenQuery);
    }

    if (snap.empty) {
      const phoneQuery = query(usersRef, where('phone', '==', trimmed));
      snap = await getDocs(phoneQuery);
    }

    if (!snap.empty) {
      const userData = snap.docs[0].data();
      if (userData.email) {
        emailToUse = userData.email;
      }
    }
  }

  const userCredential = await signInWithEmailAndPassword(auth, emailToUse, password);
  
  try {
    const userDocRef = doc(db, 'users', userCredential.user.uid);
    await updateDoc(userDocRef, {
      lastSeen: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    
    await logActivity(
      { uid: userCredential.user.uid, email: userCredential.user.email || '' },
      'User logged in'
    );
  } catch (e) {
    // Non-blocking
  }

  return userCredential;
}

/**
 * Check if a username is available
 */
export async function checkUsernameAvailability(username: string): Promise<boolean> {
  if (!username || username.length < 3) return false;
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('username', '==', username.toLowerCase()));
  const snapshot = await getDocs(q);
  return snapshot.empty;
}

/**
 * Find user by referral code
 */
export async function findUserByReferralCode(code: string): Promise<User | null> {
  if (!code) return null;
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('referralCode', '==', code.trim().toUpperCase()));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const docData = snapshot.docs[0];
  return { uid: docData.id, ...docData.data() } as User;
}

/**
 * Find user by recovery token
 */
export async function findUserByRecoveryToken(token: string): Promise<User | null> {
  if (!token) return null;
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('recoveryToken', '==', token.trim()));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const docData = snapshot.docs[0];
  return { uid: docData.id, ...docData.data() } as User;
}

/**
 * Send password reset email
 */
export async function sendPasswordReset(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email.trim());
}

/**
 * Generate a referral code
 */
export async function generateAndSaveReferralCode(uid: string, username?: string): Promise<string> {
  const prefix = (username ? username.slice(0, 3).toUpperCase() : 'CW');
  const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
  const newCode = `${prefix}-${randomSuffix}`;

  const userDocRef = doc(db, 'users', uid);
  await updateDoc(userDocRef, {
    referralCode: newCode,
    updatedAt: serverTimestamp(),
  });

  return newCode;
}

/**
 * Get user profile data
 */
export async function getUserData(uid: string): Promise<User | null> {
  const userDocRef = doc(db, 'users', uid);
  const snap = await getDoc(userDocRef);
  if (!snap.exists()) return null;
  return { uid: snap.id, ...snap.data() } as User;
}

/**
 * Sign up with email
 */
export async function signUpWithEmail(values: any, recoveryToken: string): Promise<UserCredential> {
  const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
  const uid = userCredential.user.uid;

  let referrerUser: User | null = null;
  if (values.referralCode) {
    referrerUser = await findUserByReferralCode(values.referralCode);
  }

  const generatedReferralCode = `${values.username.slice(0, 3).toUpperCase()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

  const userPayload: any = {
    uid,
    fullName: values.fullName,
    username: values.username.toLowerCase(),
    email: values.email,
    gender: values.gender === 'Custom' ? values.customGender : values.gender,
    country: values.country === 'Custom' ? values.customCountry : values.country,
    phone: values.phone || '',
    referralCode: generatedReferralCode,
    referrerUid: referrerUser ? referrerUser.uid : null,
    grandReferrerUid: referrerUser?.referrerUid || null,
    recoveryToken: recoveryToken,
    status: 'active',
    role: 'user',
    photoURL: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (values.customGender) userPayload.customGender = values.customGender;
  if (values.customCountry) userPayload.customCountry = values.customCountry;

  await setDoc(doc(db, 'users', uid), userPayload);

  const walletRef = ref(rtdb, `wallets/${uid}`);
  await set(walletRef, {
    balance: 0,
    pendingBalance: 0,
    surveyBalance: 0,
    referralBalance: 0,
    bonusBalance: 0,
    completedTasks: 0,
    isFrozen: false,
  });

  if (referrerUser) {
    try {
      const referrerWalletRef = ref(rtdb, `wallets/${referrerUser.uid}/referralBalance`);
      await runTransaction(referrerWalletRef, (current = 0) => current + 5);
      
      const notifRef = push(ref(rtdb, `notifications/${referrerUser.uid}`));
      await set(notifRef, {
        id: notifRef.key,
        type: 'referral',
        title: '@referrals.alert: New Referral Joined!',
        content: `${values.fullName} (@${values.username}) just signed up with your referral link! You earned a $5 referral credit.`,
        timestamp: new Date().toISOString(),
        read: false,
      });
    } catch (e) {
      console.warn("Could not credit referrer:", e);
    }
  }

  const welcomeNotifRef = push(ref(rtdb, `notifications/${uid}`));
  await set(welcomeNotifRef, {
    id: welcomeNotifRef.key,
    type: 'welcome',
    title: '@system.alert: Welcome to CapWallet!',
    content: `Welcome ${values.fullName}! Your capital wallet is ready. Complete surveys, refer partners, and manage your earnings securely.`,
    timestamp: new Date().toISOString(),
    read: false,
  });

  await logActivity(
    { uid, fullName: values.fullName, email: values.email },
    'User registered account'
  );

  return userCredential;
}

/**
 * Log activity to Realtime Database
 */
export async function logActivity(
  user: { uid: string; fullName?: string; email?: string; photoURL?: string | null },
  activity: string,
  details: any = {}
): Promise<void> {
  try {
    const timestamp = new Date().toISOString();
    const logData = {
      userId: user.uid,
      userFullName: user.fullName || 'User',
      userEmail: user.email || '',
      userPhotoURL: user.photoURL || '',
      activity,
      details,
      timestamp,
    };

    const globalLogsRef = push(ref(rtdb, 'activityLogs'));
    await set(globalLogsRef, logData);

    const userLogRef = push(ref(rtdb, `users/${user.uid}/activityLogs`));
    await set(userLogRef, logData);
  } catch (err) {
    console.error("Failed to log activity:", err);
  }
}

/**
 * Send notification to a specific user
 */
export async function sendNotificationToUser(
  uid: string,
  title: string,
  content: string,
  data: any = {}
): Promise<void> {
  const notifRef = push(ref(rtdb, `notifications/${uid}`));
  await set(notifRef, {
    id: notifRef.key,
    title,
    content,
    timestamp: new Date().toISOString(),
    read: false,
    ...data,
  });
}

/**
 * Admin: Send notification (broadcast or selected users)
 */
export async function sendAdminNotification(formData: {
  target: 'broadcast' | 'select';
  users?: string[];
  senderAlias: string;
  customSender?: string;
  title: string;
  message: string;
  schedule: boolean;
  scheduledAtDate?: Date;
  scheduledAtTime?: string;
}): Promise<void> {
  const senderTitle = formData.senderAlias === 'custom' 
    ? formData.customSender 
    : formData.senderAlias;
  
  const formattedTitle = `${senderTitle}: ${formData.title}`;
  const timestamp = new Date().toISOString();

  let targetUids: string[] = [];

  if (formData.target === 'broadcast') {
    const usersSnap = await getDocs(collection(db, 'users'));
    targetUids = usersSnap.docs.map(d => d.id);
  } else if (formData.users && formData.users.length > 0) {
    targetUids = formData.users;
  }

  const promises = targetUids.map(async (uid) => {
    const userNotifRef = push(ref(rtdb, `notifications/${uid}`));
    await set(userNotifRef, {
      id: userNotifRef.key,
      title: formattedTitle,
      content: formData.message,
      timestamp,
      read: false,
      sender: senderTitle,
    });
  });

  await Promise.all(promises);

  const sentRef = push(ref(rtdb, 'admin/sentNotifications'));
  await set(sentRef, {
    id: sentRef.key,
    title: formattedTitle,
    message: formData.message,
    target: formData.target,
    userCount: targetUids.length,
    timestamp,
  });
}

/**
 * Update user balances
 */
export async function updateUserBalances(
  uid: string,
  balances: Partial<WalletData>,
  reason?: string
): Promise<void> {
  const walletRef = ref(rtdb, `wallets/${uid}`);
  await update(walletRef, balances);

  if (reason) {
    await sendNotificationToUser(
      uid,
      '@transaction.alert: Balance Update',
      `Your account balances were updated by administration. Reason: ${reason}`
    );
  }
}

/**
 * Give user bonus
 */
export async function giveBonus(uid: string, amount: number, reason: string): Promise<void> {
  const walletRef = ref(rtdb, `wallets/${uid}`);
  await runTransaction(walletRef, (current: any) => {
    if (!current) {
      return { balance: amount, bonusBalance: amount, surveyBalance: 0, referralBalance: 0 };
    }
    return {
      ...current,
      balance: (current.balance || 0) + amount,
      bonusBalance: (current.bonusBalance || 0) + amount,
    };
  });

  await sendNotificationToUser(
    uid,
    '@transaction.alert: Bonus Awarded!',
    `You have received a bonus of $${amount.toFixed(2)}! Reason: ${reason}`
  );
}

/**
 * Handle pending earnings approval/rejection
 */
export async function handlePendingEarnings(
  uid: string,
  arg2: number | 'approve' | 'decline' | 'reject',
  arg3?: string | 'approve' | 'decline' | 'reject' | number,
  arg4?: number
): Promise<void> {
  let action: 'approve' | 'decline' | 'reject' = 'approve';
  let amount: number = 0;
  let reason: string | undefined = undefined;

  if (typeof arg2 === 'string') {
    action = arg2 as any;
    if (typeof arg3 === 'string') {
      reason = arg3;
      amount = typeof arg4 === 'number' ? arg4 : 0;
    } else if (typeof arg3 === 'number') {
      amount = arg3;
    }
  } else if (typeof arg2 === 'number') {
    amount = arg2;
    if (typeof arg3 === 'string') {
      action = arg3 as any;
    }
  }

  const walletRef = ref(rtdb, `wallets/${uid}`);
  await runTransaction(walletRef, (current: any) => {
    if (!current) return current;
    const targetAmt = amount > 0 ? amount : (current.pendingBalance || 0);
    const currentPending = Math.max(0, (current.pendingBalance || 0) - targetAmt);
    if (action === 'approve') {
      return {
        ...current,
        pendingBalance: currentPending,
        balance: (current.balance || 0) + targetAmt,
      };
    } else {
      return {
        ...current,
        pendingBalance: currentPending,
      };
    }
  });

  const msg = action === 'approve'
    ? `Your pending earnings of $${amount.toFixed(2)} have been approved and added to your main balance.`
    : `Your pending earnings request was declined.${reason ? ` Reason: ${reason}` : ''}`;

  await sendNotificationToUser(uid, '@transaction.alert: Earnings Update', msg);
}

/**
 * Block user
 */
export async function blockUser(uid: string, reason: string): Promise<void> {
  const userDocRef = doc(db, 'users', uid);
  await updateDoc(userDocRef, {
    status: 'blocked',
    blockReason: reason,
    suspensionLiftDate: null,
    suspensionReason: null,
    updatedAt: serverTimestamp(),
  });
  await sendNotificationToUser(uid, '@security.alert: Account Blocked', `Your account has been blocked: ${reason}`);
}

/**
 * Unblock user
 */
export async function unblockUser(uid: string): Promise<void> {
  const userDocRef = doc(db, 'users', uid);
  await updateDoc(userDocRef, {
    status: 'active',
    blockReason: null,
    updatedAt: serverTimestamp(),
  });
  await sendNotificationToUser(uid, '@security.alert: Account Unblocked', 'Your account access has been restored.');
}

/**
 * Suspend user
 */
export async function suspendUser(uid: string, reason: string, liftDate?: string | null): Promise<void> {
  const userDocRef = doc(db, 'users', uid);
  await updateDoc(userDocRef, {
    status: 'suspended',
    suspensionReason: reason,
    suspensionLiftDate: liftDate || null,
    blockReason: null,
    updatedAt: serverTimestamp(),
  });
  await sendNotificationToUser(
    uid,
    '@security.alert: Account Suspended',
    `Your account has been suspended until ${liftDate || 'further review'}. Reason: ${reason}`
  );
}

/**
 * Unsuspend user
 */
export async function unsuspendUser(uid: string): Promise<void> {
  const userDocRef = doc(db, 'users', uid);
  await updateDoc(userDocRef, {
    status: 'active',
    suspensionReason: null,
    suspensionLiftDate: null,
    updatedAt: serverTimestamp(),
  });
  await sendNotificationToUser(uid, '@security.alert: Suspension Lifted', 'Your account suspension has been lifted.');
}

/**
 * Freeze wallet
 */
export async function freezeWallet(uid: string, reason: string): Promise<void> {
  const walletRef = ref(rtdb, `wallets/${uid}`);
  await update(walletRef, {
    isFrozen: true,
    freezeReason: reason,
    frozenAt: new Date().toISOString(),
  });

  const userDocRef = doc(db, 'users', uid);
  await updateDoc(userDocRef, {
    isWalletFrozen: true,
    walletFreezeReason: reason,
  });

  await sendNotificationToUser(
    uid,
    '@security.alert: Wallet Frozen',
    `Your wallet transactions have been frozen by admin. Reason: ${reason}`
  );
}

/**
 * Unfreeze wallet
 */
export async function unfreezeWallet(uid: string): Promise<void> {
  const walletRef = ref(rtdb, `wallets/${uid}`);
  await update(walletRef, {
    isFrozen: false,
    freezeReason: null,
    frozenAt: null,
  });

  const userDocRef = doc(db, 'users', uid);
  await updateDoc(userDocRef, {
    isWalletFrozen: false,
    walletFreezeReason: null,
  });

  await sendNotificationToUser(
    uid,
    '@security.alert: Wallet Unfrozen',
    'Your wallet has been unfrozen. You may now perform withdrawals and transactions normally.'
  );
}

/**
 * Delete user account
 */
export async function deleteUserAccount(uid: string): Promise<void> {
  await deleteDoc(doc(db, 'users', uid));
  await set(ref(rtdb, `wallets/${uid}`), null);
  await set(ref(rtdb, `notifications/${uid}`), null);
}

/**
 * Change password
 */
export async function changeUserPassword(currentPassword: string, newPassword: string): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser || !currentUser.email) {
    throw new Error('User not logged in');
  }

  const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
  await reauthenticateWithCredential(currentUser, credential);
  await updatePassword(currentUser, newPassword);
}
