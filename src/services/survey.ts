import { rtdb } from '@/lib/firebase';
import { ref, set, push, remove, get } from 'firebase/database';
import { Survey } from '@/lib/types';

/**
 * Publish survey to Realtime Database
 */
export async function publishSurvey(surveyData: Partial<Survey>): Promise<string> {
  const surveyId = surveyData.id || `srv-${Date.now()}`;
  const surveyRef = ref(rtdb, `surveys/available/${surveyId}`);

  const payload: Survey = {
    id: surveyId,
    title: surveyData.title || 'Untitled Survey',
    description: surveyData.description || '',
    reward: surveyData.reward || 1.0,
    durationInMinutes: surveyData.durationInMinutes || 5,
    terms: surveyData.terms || 'Standard CapWallet Survey Terms apply.',
    requirements: surveyData.requirements || ['Must provide thoughtful answers'],
    questions: surveyData.questions || [],
    status: surveyData.status || 'available',
    isPausable: surveyData.isPausable ?? false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    category: surveyData.category || 'General',
  };

  await set(surveyRef, payload);
  return surveyId;
}

/**
 * Delete a survey
 */
export async function deleteSurvey(surveyId: string): Promise<void> {
  const surveyRef = ref(rtdb, `surveys/available/${surveyId}`);
  await remove(surveyRef);
}

/**
 * Get all available surveys
 */
export async function getSurveys(): Promise<Survey[]> {
  const surveysRef = ref(rtdb, 'surveys/available');
  const snapshot = await get(surveysRef);
  if (!snapshot.exists()) return [];
  const val = snapshot.val();
  return Object.keys(val).map((key) => ({
    id: key,
    ...val[key],
  }));
}
