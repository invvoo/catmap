// Utility: resolve display name for cats using community name votes
// - Cats with an owner keep their given name unless a vote winner exists
// - Stray/unknown cats always use the winning vote name if available
import { getSupabase } from './supabase';

/**
 * Given an array of cat IDs, returns a map of catId → winning voted name.
 * Only returns entries where there is at least one vote.
 */
export async function fetchTopVotedNames(catIds: string[]): Promise<Record<string, string>> {
  if (!catIds.length) return {};
  const supabase = getSupabase();
  const { data } = await supabase
    .from('name_votes')
    .select('cat_id, suggested_name')
    .in('cat_id', catIds);

  const tally: Record<string, Record<string, number>> = {};
  for (const row of data || []) {
    if (!tally[row.cat_id]) tally[row.cat_id] = {};
    tally[row.cat_id][row.suggested_name] = (tally[row.cat_id][row.suggested_name] || 0) + 1;
  }

  const top: Record<string, string> = {};
  for (const [catId, names] of Object.entries(tally)) {
    const winner = Object.entries(names).sort((a, b) => b[1] - a[1])[0];
    if (winner) top[catId] = winner[0];
  }
  return top;
}

/**
 * Resolve the display name for a single cat given the vote map.
 * Rules:
 *   - If there's a winning community vote, it wins.
 *   - Otherwise fall back to cat.name.
 *   - Otherwise 'Unknown'.
 */
export function resolveDisplayName(
  cat: { id: string; name?: string | null },
  topVoted: Record<string, string>
): string {
  return topVoted[cat.id] || cat.name || 'Unknown';
}
