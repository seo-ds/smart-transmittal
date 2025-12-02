import { supabase } from './supabaseClient';

export interface TransmittalSequence {
  id: string;
  user_id: string;
  year: number;
  current_sequence: number;
  user_code: string;
  created_at: string;
  updated_at: string;
}

function generateUserCode(fullName: string): string {
  if (!fullName || fullName.trim() === '') {
    return 'USR';
  }

  const words = fullName.trim().split(/\s+/);

  if (words.length === 1) {
    const name = words[0].toUpperCase();
    return name.substring(0, 3).padEnd(3, 'X');
  }

  if (words.length === 2) {
    const [first, last] = words;
    const initials = (first[0] + last[0] + last[1]).toUpperCase();
    return initials.padEnd(3, 'X');
  }

  const initials = words.slice(0, 3).map(w => w[0]).join('').toUpperCase();
  return initials.padEnd(3, 'X');
}

export async function getNextTransmittalNumber(userId: string, userFullName: string): Promise<string> {
  const currentYear = new Date().getFullYear();
  const today = new Date().toISOString().split('T')[0].replace(/-/g, '');

  const userCode = generateUserCode(userFullName);

  const { data: existingSequence, error: fetchError } = await supabase
    .from('transmittal_sequences')
    .select('*')
    .eq('user_id', userId)
    .eq('year', currentYear)
    .maybeSingle();

  if (fetchError) {
    console.error('Error fetching sequence:', fetchError);
    throw fetchError;
  }

  let nextSequence = 1;

  if (existingSequence) {
    nextSequence = existingSequence.current_sequence + 1;

    const { error: updateError } = await supabase
      .from('transmittal_sequences')
      .update({
        current_sequence: nextSequence,
        user_code: userCode
      })
      .eq('id', existingSequence.id);

    if (updateError) {
      console.error('Error updating sequence:', updateError);
      throw updateError;
    }
  } else {
    const { error: insertError } = await supabase
      .from('transmittal_sequences')
      .insert({
        user_id: userId,
        year: currentYear,
        current_sequence: nextSequence,
        user_code: userCode
      });

    if (insertError) {
      console.error('Error creating sequence:', insertError);
      throw insertError;
    }
  }

  const sequenceStr = nextSequence.toString().padStart(4, '0');

  return `TR-FP-${today}-${sequenceStr}-${userCode}`;
}

export async function getCurrentSequence(userId: string): Promise<number> {
  const currentYear = new Date().getFullYear();

  const { data, error } = await supabase
    .from('transmittal_sequences')
    .select('current_sequence')
    .eq('user_id', userId)
    .eq('year', currentYear)
    .maybeSingle();

  if (error) {
    console.error('Error fetching current sequence:', error);
    return 0;
  }

  return data?.current_sequence || 0;
}
