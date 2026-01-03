/**
 * DraggableHand Component
 *
 * Displays the player's cards with drag-to-reorder functionality.
 * Uses react-native-gesture-handler for smooth drag interactions.
 * Shows visual gaps between meld groups when sorted.
 * Cards within melds overlap significantly (half visible).
 */

import React, { useMemo, useCallback, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
  useWindowDimensions,
  LayoutChangeEvent,
} from 'react-native';
import {
  PanGestureHandler,
  PanGestureHandlerGestureEvent,
  State,
  TapGestureHandler,
  TapGestureHandlerStateChangeEvent,
} from 'react-native-gesture-handler';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { useTheme } from '../../context/ThemeContext';
import { Card as CardType } from '../../engine/types';
import { getMeldType } from '../../engine/meld';
import { ThemeColors, Spacing, Typography, BorderRadius } from '../../theme';
import Card from './Card';

interface CardWithMeta extends CardType {
  groupIndex?: number;
}

interface DraggableHandProps {
  cards: CardWithMeta[];
  selectedCardIds?: string[];
  onCardPress?: (card: CardType, index: number) => void;
  onCardLongPress?: (card: CardType, index: number) => void;
  onCardsReordered?: (newOrder: CardWithMeta[]) => void;
  onCardSelect?: (cardIds: string[]) => void;
  selectionMode?: 'single' | 'multiple' | 'none';
  isDisabled?: boolean;
  cardSize?: 'small' | 'medium' | 'large';
  style?: ViewStyle;
}

const hapticOptions = {
  enableVibrateFallback: true,
  ignoreAndroidSystemSettings: false,
};

const MELD_GAP = 24; // Gap between meld groups in pixels (more visible)
const CARD_OVERLAP = 0.5; // Cards overlap by 50% (half visible)

// Meld type labels and colors
const MELD_TYPE_INFO: Record<string, { label: string; colorKey: 'success' | 'accent' | 'warning' }> = {
  'pure-sequence': { label: 'Pure', colorKey: 'success' },
  'sequence': { label: 'Seq', colorKey: 'accent' },
  'set': { label: 'Set', colorKey: 'warning' },
};

const DraggableHand: React.FC<DraggableHandProps> = ({
  cards,
  selectedCardIds = [],
  onCardPress,
  onCardsReordered,
  onCardSelect,
  selectionMode = 'none',
  isDisabled = false,
  cardSize = 'medium',
  style,
}) => {
  const { colors } = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);
  const cardPositionsRef = useRef<number[]>([]);

  // Reset drag states when cards change
  React.useEffect(() => {
    setDraggingIndex(null);
    setDragOffset({ x: 0, y: 0 });
    setDropTargetIndex(null);
  }, [cards.length]);

  // Card dimensions
  const cardWidth = cardSize === 'small' ? 42 : cardSize === 'large' ? 78 : 60;
  const visibleCardWidth = cardWidth * CARD_OVERLAP; // Half of card is visible

  // Calculate meld info for each group
  const meldGroupInfo = useMemo(() => {
    const groups: { [key: number]: CardWithMeta[] } = {};
    cards.forEach(card => {
      const gi = card.groupIndex ?? -1;
      if (gi >= 0) {
        if (!groups[gi]) groups[gi] = [];
        groups[gi].push(card);
      }
    });

    const info: { [key: number]: { type: string | null; label: string; colorKey: 'success' | 'accent' | 'warning' | 'tertiaryLabel' } } = {};
    Object.keys(groups).forEach(key => {
      const groupIndex = parseInt(key, 10);
      const groupCards = groups[groupIndex];
      if (groupCards.length >= 3) {
        const meldType = getMeldType(groupCards);
        if (meldType && MELD_TYPE_INFO[meldType]) {
          info[groupIndex] = { type: meldType, ...MELD_TYPE_INFO[meldType] };
        } else {
          info[groupIndex] = { type: null, label: 'Invalid', colorKey: 'tertiaryLabel' };
        }
      }
    });
    return info;
  }, [cards]);

  // Count meld gaps
  const meldGapsCount = countMeldGaps(cards);
  const totalGapsWidth = meldGapsCount * MELD_GAP;

  // Calculate total content width
  const contentWidth = cards.length > 0
    ? visibleCardWidth * (cards.length - 1) + cardWidth + totalGapsWidth
    : 0;

  // Calculate padding for centering
  const availableWidth = screenWidth;
  const paddingForCenter = Math.max(Spacing.sm, (availableWidth - contentWidth) / 2);

  // Calculate card positions for drop detection
  const getCardPositions = useCallback((): number[] => {
    const positions: number[] = [];
    let currentX = paddingForCenter;

    for (let i = 0; i < cards.length; i++) {
      positions.push(currentX);

      // Check if next card is in a different meld group
      const currentGroup = cards[i]?.groupIndex;
      const nextGroup = cards[i + 1]?.groupIndex;
      const hasGapAfter = i < cards.length - 1 &&
        currentGroup !== undefined &&
        currentGroup >= 0 &&
        nextGroup !== undefined &&
        nextGroup >= 0 &&
        currentGroup !== nextGroup;

      currentX += visibleCardWidth + (hasGapAfter ? MELD_GAP : 0);
    }

    return positions;
  }, [cards, paddingForCenter, visibleCardWidth]);

  // Find drop index based on drag position
  const findDropIndex = useCallback((dragX: number, currentIndex: number): number => {
    const positions = cardPositionsRef.current;
    if (positions.length === 0) return currentIndex;

    const currentCardX = positions[currentIndex] + dragX;

    for (let i = 0; i < positions.length; i++) {
      if (i === currentIndex) continue;

      const targetCenter = positions[i] + cardWidth / 2;

      if (currentIndex < i) {
        // Dragging right
        if (currentCardX + cardWidth / 2 > targetCenter) {
          return i;
        }
      } else {
        // Dragging left
        if (currentCardX + cardWidth / 2 < targetCenter) {
          return i;
        }
      }
    }

    return currentIndex;
  }, [cardWidth]);

  const handleCardPress = useCallback((card: CardType, index: number) => {
    if (isDisabled) return;

    ReactNativeHapticFeedback.trigger('selection', hapticOptions);

    if (onCardPress) {
      onCardPress(card, index);
      return;
    }

    if (selectionMode === 'none') return;

    let newSelection: string[];
    if (selectionMode === 'single') {
      newSelection = selectedCardIds.includes(card.id) ? [] : [card.id];
    } else {
      newSelection = selectedCardIds.includes(card.id)
        ? selectedCardIds.filter(id => id !== card.id)
        : [...selectedCardIds, card.id];
    }

    if (onCardSelect) {
      onCardSelect(newSelection);
    }
  }, [isDisabled, onCardPress, selectionMode, selectedCardIds, onCardSelect]);

  const handlePanGesture = useCallback((index: number) => (event: PanGestureHandlerGestureEvent) => {
    const { translationX, translationY, state } = event.nativeEvent;

    if (state === State.BEGAN) {
      cardPositionsRef.current = getCardPositions();
      setDraggingIndex(index);
      ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
    } else if (state === State.ACTIVE) {
      setDragOffset({ x: translationX, y: translationY });
      const newDropIndex = findDropIndex(translationX, index);
      if (newDropIndex !== dropTargetIndex) {
        setDropTargetIndex(newDropIndex);
        if (newDropIndex !== index) {
          ReactNativeHapticFeedback.trigger('selection', hapticOptions);
        }
      }
    } else if (state === State.END || state === State.CANCELLED || state === State.FAILED) {
      if (state === State.END && draggingIndex !== null && dropTargetIndex !== null && dropTargetIndex !== draggingIndex && onCardsReordered) {
        const newCards = [...cards];
        const [removed] = newCards.splice(draggingIndex, 1);
        // Only clear the moved card's group index, keep others intact
        const movedCard = { ...removed, groupIndex: -1 };
        newCards.splice(dropTargetIndex, 0, movedCard);
        onCardsReordered(newCards);
        ReactNativeHapticFeedback.trigger('impactLight', hapticOptions);
      }
      setDraggingIndex(null);
      setDragOffset({ x: 0, y: 0 });
      setDropTargetIndex(null);
    }
  }, [cards, draggingIndex, dropTargetIndex, findDropIndex, getCardPositions, onCardsReordered]);

  const handleTapStateChange = useCallback((card: CardType, index: number) => (event: TapGestureHandlerStateChangeEvent) => {
    if (event.nativeEvent.state === State.END) {
      handleCardPress(card, index);
    }
  }, [handleCardPress]);

  // Update positions on layout
  const handleLayout = useCallback((_event: LayoutChangeEvent) => {
    cardPositionsRef.current = getCardPositions();
  }, [getCardPositions]);

  // Check if this is the last card in a meld group
  const isLastInGroup = useCallback((index: number): boolean => {
    const card = cards[index];
    const nextCard = cards[index + 1];
    if (card.groupIndex === undefined || card.groupIndex < 0) return false;
    if (!nextCard) return true; // Last card in array
    return nextCard.groupIndex !== card.groupIndex;
  }, [cards]);

  return (
    <View style={[styles.container, style]} onLayout={handleLayout}>
      <View style={styles.cardsContainer}>
        {cards.map((card, index) => {
          const isSelected = selectedCardIds.includes(card.id);
          const isDragging = draggingIndex === index;
          const isDropTarget = dropTargetIndex === index && draggingIndex !== null && draggingIndex !== index;

          // Check if we need a gap before this card (different meld group than previous)
          const prevCard = index > 0 ? cards[index - 1] : null;
          const cardGroup = card.groupIndex ?? -1;
          const prevGroup = prevCard?.groupIndex ?? -1;
          // Show gap when: both are valid groups and different, OR one is grouped and other is not
          const showGap = prevCard && (
            (cardGroup >= 0 && prevGroup >= 0 && cardGroup !== prevGroup) ||
            (cardGroup >= 0 && prevGroup < 0) ||
            (cardGroup < 0 && prevGroup >= 0)
          );

          const marginLeft = index === 0
            ? paddingForCenter
            : showGap
              ? MELD_GAP - (cardWidth - visibleCardWidth)
              : -(cardWidth - visibleCardWidth);

          // Check if this is the last card in a meld group and we should show banner
          const groupIdx = card.groupIndex ?? -1;
          const showMeldBanner = isLastInGroup(index) && groupIdx >= 0;
          const meldInfo = showMeldBanner ? meldGroupInfo[groupIdx] : null;

          return (
            <PanGestureHandler
              key={card.id}
              onGestureEvent={handlePanGesture(index)}
              onHandlerStateChange={handlePanGesture(index)}
              enabled={!!onCardsReordered}
              activeOffsetX={[-10, 10]}
              failOffsetY={[-20, 20]}
            >
              <View
                // eslint-disable-next-line react-native/no-inline-styles
                style={[
                  styles.cardWrapper,
                  {
                    marginLeft,
                    zIndex: isDragging ? 1000 : index,
                    transform: isDragging ? [
                      { translateX: dragOffset.x },
                      { translateY: dragOffset.y - 15 },
                      { scale: 1.08 },
                    ] : isDropTarget ? [
                      { scale: 0.95 },
                    ] : [],
                  },
                  isDragging && styles.draggingCard,
                ]}
              >
                <TapGestureHandler
                  onHandlerStateChange={handleTapStateChange(card, index)}
                  enabled={!isDisabled}
                >
                  <View>
                    <Card
                      card={card}
                      isSelected={isSelected || isDragging}
                      isDisabled={isDisabled && !isDragging}
                      size={cardSize}
                    />
                    {/* Meld type banner */}
                    {meldInfo && (
                      <View style={[styles.meldBanner, { backgroundColor: colors[meldInfo.colorKey as keyof ThemeColors] as string }]}>
                        <Text style={styles.meldBannerText}>{meldInfo.label}</Text>
                      </View>
                    )}
                  </View>
                </TapGestureHandler>
              </View>
            </PanGestureHandler>
          );
        })}
      </View>
    </View>
  );
};

// Count number of meld group transitions (gaps needed)
const countMeldGaps = (cards: CardWithMeta[]): number => {
  let gaps = 0;
  for (let i = 1; i < cards.length; i++) {
    const currentGroup = cards[i]?.groupIndex ?? -1;
    const prevGroup = cards[i - 1]?.groupIndex ?? -1;
    // Count gap when: both are valid groups and different, OR one is grouped and other is not
    if (
      (currentGroup >= 0 && prevGroup >= 0 && currentGroup !== prevGroup) ||
      (currentGroup >= 0 && prevGroup < 0) ||
      (currentGroup < 0 && prevGroup >= 0)
    ) {
      gaps++;
    }
  }
  return gaps;
};

const createStyles = (_colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      width: '100%',
    },
    cardsContainer: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      paddingVertical: Spacing.xs,
    },
    cardWrapper: {
      // Individual card wrapper for positioning
    },
    draggingCard: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 8,
    },
    meldBanner: {
      position: 'absolute',
      bottom: -10,
      right: -2,
      paddingHorizontal: 4,
      paddingVertical: 1,
      borderRadius: BorderRadius.small,
    },
    meldBannerText: {
      ...Typography.caption2,
      fontSize: 9,
      fontWeight: '700',
      color: '#FFFFFF',
    },
  });

export default DraggableHand;
