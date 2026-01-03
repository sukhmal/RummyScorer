/**
 * PracticeGameScreen
 *
 * Main game screen for practice mode.
 * Shows player hands, piles, and game actions.
 */

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Orientation from 'react-native-orientation-locker';
import { useTheme } from '../../context/ThemeContext';
import { usePracticeGame } from '../../context/PracticeGameContext';
import { Card as CardType } from '../../engine/types';
import { smartSortWithGroups, CardWithGroup } from '../../engine/cardSorting';
import { ThemeColors, Typography, Spacing, BorderRadius } from '../../theme';
import Icon from '../../components/Icon';
import { DraggableHand, ActionBar, DeclarationModal, TableView } from '../../components/practice';

const PracticeGameScreen = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const {
    gameState,
    drawCard,
    discardCard,
    declare,
    drop,
    isBotTurn,
    executeBotTurn,
    getPlayerHand,
    getCurrentPlayer,
    getTopDiscard,
    canDraw,
    canDiscard,
  } = usePracticeGame();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const [showDeclarationModal, setShowDeclarationModal] = useState(false);
  const [orderedCards, setOrderedCards] = useState<CardWithGroup[]>([]); // Custom card ordering with meld groups

  // Lock to landscape orientation
  useEffect(() => {
    Orientation.lockToLandscape();
    return () => {
      Orientation.unlockAllOrientations();
    };
  }, []);

  const currentPlayer = getCurrentPlayer();
  const isMyTurn = currentPlayer?.id === 'human';
  const rawHand = getPlayerHand('human');
  const topDiscard = getTopDiscard();

  // Reset card order when starting a new round (hand is dealt fresh)
  useEffect(() => {
    if (gameState?.currentRound?.roundNumber) {
      setOrderedCards([]);
      setSelectedCardIds([]);
    }
  }, [gameState?.currentRound?.roundNumber]);

  // Apply custom card ordering if set, otherwise use raw hand
  const myHand = useMemo((): CardWithGroup[] => {
    if (orderedCards.length === 0) {
      return rawHand.map(c => ({ ...c, groupIndex: -1 }));
    }

    // Build a map of rawHand cards by ID for quick lookup
    const rawHandMap = new Map<string, CardType>();
    rawHand.forEach(card => {
      rawHandMap.set(card.id, card);
    });

    // Reorder cards based on orderedCards, using only cards that exist in rawHand
    const result: CardWithGroup[] = [];
    const usedIds = new Set<string>();

    orderedCards.forEach(ordered => {
      // Skip if already used (prevents duplicates)
      if (usedIds.has(ordered.id)) return;

      const card = rawHandMap.get(ordered.id);
      if (card) {
        result.push({ ...card, groupIndex: ordered.groupIndex });
        usedIds.add(ordered.id);
      }
    });

    // Add any new cards (drawn) at the end - no group
    rawHand.forEach(card => {
      if (!usedIds.has(card.id)) {
        result.push({ ...card, groupIndex: -1 });
        usedIds.add(card.id);
      }
    });

    // Safety check: if something went wrong, return rawHand
    if (result.length !== rawHand.length) {
      console.warn(`Card order mismatch: expected ${rawHand.length}, got ${result.length}`);
      return rawHand.map(c => ({ ...c, groupIndex: -1 }));
    }

    return result;
  }, [rawHand, orderedCards]);

  // Handle smart sort
  const handleSmartSort = useCallback(() => {
    const sorted = smartSortWithGroups(rawHand);
    setOrderedCards(sorted);
    setSelectedCardIds([]);
  }, [rawHand]);

  // Execute bot turn when it's a bot's turn
  useEffect(() => {
    if (isBotTurn() && gameState?.currentRound?.phase === 'playing') {
      executeBotTurn();
    }
  }, [isBotTurn, executeBotTurn, gameState?.currentRound?.currentPlayerIndex, gameState?.currentRound?.turnPhase, gameState?.currentRound?.phase]);

  // Handle game end
  useEffect(() => {
    if (gameState?.gamePhase === 'ended') {
      navigation.replace('PracticeHistory');
    }
  }, [gameState?.gamePhase, navigation]);

  // Handle round end
  useEffect(() => {
    if (gameState?.currentRound?.phase === 'ended' && gameState?.gamePhase === 'playing') {
      // Show round result and start new round
      const lastResult = gameState.roundResults[gameState.roundResults.length - 1];
      Alert.alert(
        'Round Complete',
        `${lastResult.winnerName} ${lastResult.declarationType === 'valid' ? 'declared' : 'dropped/invalid'}`,
        [
          {
            text: 'Next Round',
            onPress: () => {
              // Start next round would be called here
            },
          },
        ]
      );
    }
  }, [gameState?.currentRound?.phase, gameState?.gamePhase, gameState?.roundResults]);

  const handleCardPress = useCallback((card: CardType, _index: number) => {
    // Toggle card selection (works anytime for grouping, restricted for discard)
    setSelectedCardIds(prev =>
      prev.includes(card.id)
        ? prev.filter(id => id !== card.id)
        : [...prev, card.id]
    );
  }, []);

  // Group selected cards into a new meld
  const handleGroupCards = useCallback(() => {
    if (selectedCardIds.length < 2) return;

    // Find the next available group index
    const existingGroups = new Set(orderedCards.map(c => c.groupIndex).filter(g => g >= 0));
    const newGroupIndex = existingGroups.size > 0 ? Math.max(...existingGroups) + 1 : 0;

    // Update ordered cards: selected cards get new group, move them together
    const selectedSet = new Set(selectedCardIds);
    const selectedCards = myHand.filter(c => selectedSet.has(c.id));
    const otherCards = myHand.filter(c => !selectedSet.has(c.id));

    // Place grouped cards at the position of the first selected card
    const firstSelectedIndex = myHand.findIndex(c => selectedSet.has(c.id));
    const newOrder: CardWithGroup[] = [];

    let insertedGroup = false;
    otherCards.forEach((card) => {
      // Find original position
      const originalIdx = myHand.findIndex(c => c.id === card.id);
      if (!insertedGroup && originalIdx > firstSelectedIndex) {
        // Insert the new group here
        selectedCards.forEach(sc => {
          newOrder.push({ ...sc, groupIndex: newGroupIndex });
        });
        insertedGroup = true;
      }
      newOrder.push(card);
    });

    // If group wasn't inserted (selected cards were at the end), add now
    if (!insertedGroup) {
      selectedCards.forEach(sc => {
        newOrder.push({ ...sc, groupIndex: newGroupIndex });
      });
    }

    setOrderedCards(newOrder);
    setSelectedCardIds([]);
  }, [selectedCardIds, orderedCards, myHand]);

  const handleAction = useCallback(async (action: string) => {
    switch (action) {
      case 'draw-deck':
        if (canDraw()) {
          await drawCard('deck');
        }
        break;
      case 'draw-discard':
        if (canDraw() && topDiscard) {
          await drawCard('discard');
        }
        break;
      case 'discard':
        if (canDiscard() && selectedCardIds.length === 1) {
          const card = myHand.find(c => c.id === selectedCardIds[0]);
          if (card) {
            await discardCard(card);
            setSelectedCardIds([]);
          }
        }
        break;
      case 'declare':
        setShowDeclarationModal(true);
        break;
      case 'drop':
        // Drop penalty: 25 points if human hasn't drawn yet, 50 points otherwise
        const dropPenalty = gameState?.currentRound?.humanHasDrawn ? 50 : 25;
        Alert.alert(
          'Drop',
          `Are you sure you want to drop? You will receive ${dropPenalty} points.`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Drop', style: 'destructive', onPress: () => drop() },
          ]
        );
        break;
      case 'group':
        handleGroupCards();
        break;
      case 'sort':
        handleSmartSort();
        setSelectedCardIds([]);
        break;
    }
  }, [canDraw, canDiscard, drawCard, discardCard, drop, selectedCardIds, myHand, topDiscard, handleSmartSort, handleGroupCards, gameState?.currentRound?.humanHasDrawn]);

  const handleDeclare = useCallback(async (melds: any[]) => {
    setShowDeclarationModal(false);
    await declare(melds);
  }, [declare]);

  if (!gameState?.currentRound) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading game...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const round = gameState.currentRound;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Virtual Table with Players - Full Screen */}
      <View style={styles.tableContainer}>
        <TableView
          players={gameState.players}
          humanPlayerId="human"
          currentPlayerIndex={round.currentPlayerIndex}
          dealerIndex={round.dealerIndex}
          scores={gameState.scores}
          hands={round.hands}
          drawPile={round.drawPile}
          discardPile={round.discardPile}
          topDiscard={topDiscard}
          wildJokerCard={round.wildJokerCard}
          turnPhase={round.turnPhase}
          currentPlayerName={currentPlayer?.name || ''}
          isHumanTurn={isMyTurn}
          onDrawFromDeck={() => handleAction('draw-deck')}
          onDrawFromDiscard={() => handleAction('draw-discard')}
        />
      </View>

      {/* Player's Hand with Avatar Badge */}
      <View style={styles.handContainer}>
        {/* Compact player badge - top left */}
        <View style={styles.playerBadge}>
          <View style={[styles.avatarSmall, isMyTurn && styles.avatarActive]}>
            <Icon name="person.fill" size={14} color={colors.label} weight="medium" />
          </View>
          <View style={styles.badgeInfo}>
            <Text style={styles.badgeName}>You</Text>
            <Text style={styles.badgeScore}>{gameState.scores.human || 0}</Text>
          </View>
        </View>

        <DraggableHand
          cards={myHand}
          selectedCardIds={selectedCardIds}
          onCardPress={handleCardPress}
          onCardsReordered={(newCards) => {
            // Keep existing group indices, only moved card loses its group
            // Ensure all cards have groupIndex (default to -1 if undefined)
            const cardsWithGroup = newCards.map(c => ({
              ...c,
              groupIndex: c.groupIndex ?? -1,
            }));
            setOrderedCards(cardsWithGroup);
          }}
          selectionMode="multiple"
          isDisabled={false}
          cardSize="medium"
        />
      </View>

      {/* Action Bar */}
      <ActionBar
        turnPhase={isMyTurn ? round.turnPhase : 'draw'}
        canDeclare={canDiscard() && myHand.length === 14}
        canDrop={true}
        hasDiscardCard={!!topDiscard}
        selectedCardCount={selectedCardIds.length}
        onAction={handleAction}
        isDisabled={!isMyTurn}
      />

      {/* Declaration Modal */}
      <DeclarationModal
        visible={showDeclarationModal}
        cards={myHand}
        onDeclare={handleDeclare}
        onCancel={() => setShowDeclarationModal(false)}
      />
    </SafeAreaView>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      ...Typography.body,
      color: colors.secondaryLabel,
    },
    tableContainer: {
      flex: 1,
    },
    handContainer: {
      backgroundColor: colors.cardBackground,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.separator,
    },
    playerBadge: {
      position: 'absolute',
      top: Spacing.xs,
      left: Spacing.sm,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.background,
      borderRadius: BorderRadius.medium,
      padding: Spacing.xs,
      paddingRight: Spacing.sm,
      zIndex: 10,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.separator,
    },
    avatarSmall: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.cardBackground,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: colors.separator,
    },
    avatarActive: {
      borderColor: colors.warning,
      shadowColor: colors.warning,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.5,
      shadowRadius: 4,
    },
    badgeInfo: {
      marginLeft: Spacing.xs,
    },
    badgeName: {
      ...Typography.caption2,
      color: colors.label,
      fontWeight: '600',
    },
    badgeScore: {
      ...Typography.caption2,
      color: colors.secondaryLabel,
    },
  });

export default PracticeGameScreen;
