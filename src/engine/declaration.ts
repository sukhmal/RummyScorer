/**
 * Declaration validation for the Rummy game engine
 * Validates complete hand declarations according to Indian Rummy rules
 */

import { Card, Meld, HandAnalysis, CARDS_PER_PLAYER } from './types';
import {
  isValidSequence,
  createMeld,
  validateMeld,
} from './meld';
import { calculateDeadwoodPoints, isJoker } from './hand';

/**
 * Declaration requirements for Indian Rummy:
 * 1. All 13 cards must be melded (no deadwood) for valid declaration
 * 2. Must have at least 2 sequences
 * 3. At least one sequence must be pure (no jokers)
 * 4. Remaining cards can be in sets or sequences
 */

export interface DeclarationResult {
  isValid: boolean;
  hasPureSequence: boolean;
  hasMinimumSequences: boolean;
  allCardsMelded: boolean;
  melds: Meld[];
  deadwood: Card[];
  deadwoodPoints: number;
  errors: string[];
}

/**
 * Validate a player's declaration
 * Takes the cards arranged into groups by the player
 */
export const validateDeclaration = (
  melds: Meld[],
  deadwood: Card[] = []
): DeclarationResult => {
  const errors: string[] = [];

  // Validate each meld
  const validMelds: Meld[] = [];
  const invalidCards: Card[] = [];

  for (const meld of melds) {
    if (validateMeld(meld)) {
      validMelds.push(meld);
    } else {
      // Invalid meld - add cards to deadwood
      invalidCards.push(...meld.cards);
      errors.push(`Invalid meld: ${meld.cards.map(c => c.id).join(', ')}`);
    }
  }

  const allDeadwood = [...deadwood, ...invalidCards];
  const deadwoodPoints = calculateDeadwoodPoints(allDeadwood);

  // Count sequences (pure and impure)
  const sequences = validMelds.filter(m => m.type === 'sequence' || m.type === 'pure-sequence');
  const pureSequences = validMelds.filter(m => m.type === 'pure-sequence');

  const hasPureSequence = pureSequences.length >= 1;
  const hasMinimumSequences = sequences.length >= 2;
  const allCardsMelded = allDeadwood.length === 0;

  if (!hasPureSequence) {
    errors.push('Declaration must have at least one pure sequence (without jokers)');
  }

  if (!hasMinimumSequences) {
    errors.push('Declaration must have at least 2 sequences');
  }

  if (!allCardsMelded) {
    errors.push(`${allDeadwood.length} cards are not melded (${deadwoodPoints} points)`);
  }

  // Check total cards
  const totalCards = validMelds.reduce((sum, m) => sum + m.cards.length, 0) + allDeadwood.length;
  if (totalCards !== CARDS_PER_PLAYER) {
    errors.push(`Expected ${CARDS_PER_PLAYER} cards, got ${totalCards}`);
  }

  return {
    isValid: hasPureSequence && hasMinimumSequences && allCardsMelded && errors.length === 0,
    hasPureSequence,
    hasMinimumSequences,
    allCardsMelded,
    melds: validMelds,
    deadwood: allDeadwood,
    deadwoodPoints,
    errors,
  };
};

/**
 * Auto-arrange cards into optimal melds
 * Returns the best possible arrangement of the hand
 */
export const autoArrangeHand = (cards: Card[]): HandAnalysis => {
  // This is a complex optimization problem
  // We use a greedy approach with backtracking

  const jokers = cards.filter(c => isJoker(c));
  const nonJokers = cards.filter(c => !isJoker(c));

  // Find all possible pure sequences first (they're required)
  const pureSequences = findAllPureSequences(nonJokers);

  // Try different combinations
  let bestResult: HandAnalysis = {
    melds: [],
    deadwood: [...cards],
    deadwoodPoints: calculateDeadwoodPoints(cards),
    hasPureSequence: false,
    sequenceCount: 0,
    canDeclare: false,
  };

  // Try each pure sequence as the starting point
  for (const pureSeq of pureSequences) {
    const remaining = excludeCards(nonJokers, pureSeq);
    const result = findBestArrangement(remaining, jokers, [createMeld(pureSeq)!]);

    if (result.deadwoodPoints < bestResult.deadwoodPoints) {
      bestResult = result;
    }

    if (result.canDeclare) {
      return result; // Found valid declaration, return immediately
    }
  }

  // If no pure sequences, still try to make the best arrangement
  if (pureSequences.length === 0) {
    bestResult = findBestArrangement(nonJokers, jokers, []);
  }

  return bestResult;
};

/**
 * Find all possible pure sequences in the cards
 */
const findAllPureSequences = (cards: Card[]): Card[][] => {
  const bySuit: { [suit: string]: Card[] } = {};

  for (const card of cards) {
    if (!bySuit[card.suit]) {
      bySuit[card.suit] = [];
    }
    bySuit[card.suit].push(card);
  }

  const sequences: Card[][] = [];

  for (const suit of Object.keys(bySuit)) {
    const suitCards = bySuit[suit].sort((a, b) => {
      const aIdx = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'].indexOf(a.rank);
      const bIdx = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'].indexOf(b.rank);
      return aIdx - bIdx;
    });

    // Find all consecutive runs of 3+
    findConsecutiveRuns(suitCards, sequences);
  }

  return sequences;
};

/**
 * Find consecutive runs in sorted cards
 */
const findConsecutiveRuns = (sorted: Card[], result: Card[][]): void => {
  if (sorted.length < 3) return;

  const rankOrder = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

  let currentRun: Card[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const prevIdx = rankOrder.indexOf(sorted[i - 1].rank);
    const currIdx = rankOrder.indexOf(sorted[i].rank);

    if (currIdx === prevIdx + 1) {
      currentRun.push(sorted[i]);
    } else {
      if (currentRun.length >= 3) {
        // Add all valid subsequences of length 3+
        addAllSubsequences(currentRun, result);
      }
      currentRun = [sorted[i]];
    }
  }

  if (currentRun.length >= 3) {
    addAllSubsequences(currentRun, result);
  }

  // Check for A-2-3 sequence
  const ace = sorted.find(c => c.rank === 'A');
  const two = sorted.find(c => c.rank === '2');
  const three = sorted.find(c => c.rank === '3');
  if (ace && two && three) {
    result.push([ace, two, three]);
  }
};

/**
 * Add all valid subsequences of a run
 */
const addAllSubsequences = (run: Card[], result: Card[][]): void => {
  // Add the full run
  result.push([...run]);

  // Add smaller valid subsequences
  if (run.length > 3) {
    for (let start = 0; start <= run.length - 3; start++) {
      for (let end = start + 3; end <= run.length; end++) {
        if (end - start !== run.length) {
          // Don't add duplicates
          result.push(run.slice(start, end));
        }
      }
    }
  }
};

/**
 * Remove used cards from array
 */
const excludeCards = (cards: Card[], used: Card[]): Card[] => {
  const usedIds = new Set(used.map(c => c.id));
  return cards.filter(c => !usedIds.has(c.id));
};

/**
 * Find best arrangement of remaining cards
 */
const findBestArrangement = (
  remainingNonJokers: Card[],
  jokers: Card[],
  existingMelds: Meld[]
): HandAnalysis => {
  // Greedy approach: find sets and sequences, use jokers to complete near-melds

  let melds = [...existingMelds];
  let remaining = [...remainingNonJokers];
  let unusedJokers = [...jokers];

  // Find all pure sequences in remaining cards
  const sequences = findAllPureSequences(remaining);
  sequences.sort((a, b) => b.length - a.length); // Prefer longer sequences

  for (const seq of sequences) {
    // Check if these cards are still available
    if (seq.every(c => remaining.some(r => r.id === c.id))) {
      const meld = createMeld(seq);
      if (meld) {
        melds.push(meld);
        remaining = excludeCards(remaining, seq);
      }
    }
  }

  // Find sets
  const sets = findSets(remaining);
  for (const set of sets) {
    const meld = createMeld(set);
    if (meld) {
      melds.push(meld);
      remaining = excludeCards(remaining, set);
    }
  }

  // Try to apply jokers to complete near-melds
  const { newMelds, leftover, usedJokers } = applyJokersToComplete(remaining, unusedJokers);
  melds = [...melds, ...newMelds];
  remaining = leftover;
  unusedJokers = excludeCards(unusedJokers, usedJokers);

  // Remaining cards + unused jokers are deadwood
  const deadwood = [...remaining, ...unusedJokers];
  const deadwoodPoints = calculateDeadwoodPoints(deadwood);

  const pureSequences = melds.filter(m => m.type === 'pure-sequence');
  const allSequences = melds.filter(m => m.type === 'sequence' || m.type === 'pure-sequence');

  return {
    melds,
    deadwood,
    deadwoodPoints,
    hasPureSequence: pureSequences.length > 0,
    sequenceCount: allSequences.length,
    canDeclare: pureSequences.length >= 1 && allSequences.length >= 2 && deadwood.length === 0,
  };
};

/**
 * Find sets in cards
 */
const findSets = (cards: Card[]): Card[][] => {
  const byRank: { [rank: string]: Card[] } = {};

  for (const card of cards) {
    if (!byRank[card.rank]) {
      byRank[card.rank] = [];
    }
    byRank[card.rank].push(card);
  }

  const sets: Card[][] = [];

  for (const rank of Object.keys(byRank)) {
    const rankCards = byRank[rank];
    // Ensure different suits
    const seenSuits = new Set<string>();
    const uniqueSuitCards = rankCards.filter(c => {
      if (seenSuits.has(c.suit)) return false;
      seenSuits.add(c.suit);
      return true;
    });

    if (uniqueSuitCards.length >= 3) {
      sets.push(uniqueSuitCards.slice(0, 4));
    }
  }

  return sets;
};

/**
 * Apply jokers to complete near-melds
 */
const applyJokersToComplete = (
  cards: Card[],
  jokers: Card[]
): { newMelds: Meld[]; leftover: Card[]; usedJokers: Card[] } => {
  const newMelds: Meld[] = [];
  let leftover = [...cards];
  let usedJokers: Card[] = [];
  let availableJokers = [...jokers];

  // Find pairs that can become sets with jokers
  const byRank: { [rank: string]: Card[] } = {};
  for (const card of leftover) {
    if (!byRank[card.rank]) {
      byRank[card.rank] = [];
    }
    byRank[card.rank].push(card);
  }

  for (const rank of Object.keys(byRank)) {
    const rankCards = byRank[rank];
    const seenSuits = new Set<string>();
    const uniqueSuitCards = rankCards.filter(c => {
      if (seenSuits.has(c.suit)) return false;
      seenSuits.add(c.suit);
      return true;
    });

    if (uniqueSuitCards.length === 2 && availableJokers.length >= 1) {
      // Can make a set with 1 joker
      const jokerToUse = availableJokers[0];
      const meld = createMeld([...uniqueSuitCards, jokerToUse]);
      if (meld) {
        newMelds.push(meld);
        leftover = excludeCards(leftover, uniqueSuitCards);
        usedJokers.push(jokerToUse);
        availableJokers = availableJokers.slice(1);
      }
    }
  }

  // Find pairs of consecutive cards that can become sequences with jokers
  const bySuit: { [suit: string]: Card[] } = {};
  for (const card of leftover) {
    if (!bySuit[card.suit]) {
      bySuit[card.suit] = [];
    }
    bySuit[card.suit].push(card);
  }

  for (const suit of Object.keys(bySuit)) {
    const suitCards = bySuit[suit].sort((a, b) => {
      const rankOrder = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
      return rankOrder.indexOf(a.rank) - rankOrder.indexOf(b.rank);
    });

    // Look for pairs with gap of 1 or 2
    for (let i = 0; i < suitCards.length - 1; i++) {
      const rankOrder = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
      const idx1 = rankOrder.indexOf(suitCards[i].rank);
      const idx2 = rankOrder.indexOf(suitCards[i + 1].rank);
      const gap = idx2 - idx1;

      if (gap === 2 && availableJokers.length >= 1) {
        // Gap of 1 card - need 1 joker
        const jokerToUse = availableJokers[0];
        const meld = createMeld([suitCards[i], jokerToUse, suitCards[i + 1]]);
        if (meld && isValidSequence([suitCards[i], jokerToUse, suitCards[i + 1]])) {
          newMelds.push(meld);
          leftover = excludeCards(leftover, [suitCards[i], suitCards[i + 1]]);
          usedJokers.push(jokerToUse);
          availableJokers = availableJokers.slice(1);
        }
      }
    }
  }

  return { newMelds, leftover, usedJokers };
};

/**
 * Check if a declaration would be valid before submitting
 */
export const canDeclare = (cards: Card[]): boolean => {
  if (cards.length !== CARDS_PER_PLAYER) {
    return false;
  }

  const analysis = autoArrangeHand(cards);
  return analysis.canDeclare;
};

/**
 * Get a hint about what's needed for a valid declaration
 */
export const getDeclarationHint = (cards: Card[]): string[] => {
  const analysis = autoArrangeHand(cards);
  const hints: string[] = [];

  if (!analysis.hasPureSequence) {
    hints.push('You need at least one pure sequence (no jokers)');
  }

  if (analysis.sequenceCount < 2) {
    hints.push(`You need at least 2 sequences (you have ${analysis.sequenceCount})`);
  }

  if (analysis.deadwood.length > 0) {
    hints.push(`You have ${analysis.deadwood.length} unmelded cards worth ${analysis.deadwoodPoints} points`);
  }

  return hints;
};
