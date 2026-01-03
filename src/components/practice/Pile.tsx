/**
 * Pile Component
 *
 * Displays draw pile (face-down) or discard pile (face-up).
 * Shows card count and supports tap to draw.
 * Includes visual feedback when tappable.
 */

import React, { useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
  Animated,
  Easing,
} from 'react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { useTheme } from '../../context/ThemeContext';
import { Card as CardType } from '../../engine/types';
import { ThemeColors, Spacing, BorderRadius, Typography } from '../../theme';
import Card from './Card';

const hapticOptions = {
  enableVibrateFallback: true,
  ignoreAndroidSystemSettings: false,
};

interface PileProps {
  type: 'draw' | 'discard';
  cards: CardType[];
  topCard?: CardType | null;
  onPress?: () => void;
  isDisabled?: boolean;
  showCount?: boolean;
  label?: string;
  style?: ViewStyle;
}

const Pile: React.FC<PileProps> = ({
  type,
  cards,
  topCard,
  onPress,
  isDisabled = false,
  showCount = true,
  label,
  style,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const cardCount = cards.length;
  const displayCard = type === 'discard' ? topCard : null;
  const canTap = !isDisabled && !!onPress;

  // Pulsing animation for tappable piles
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (canTap) {
      // Single looping animation for both pulse and glow
      // Use JS driver since shadowOpacity doesn't support native driver
      const animation = Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(pulseAnim, {
              toValue: 1.05,
              duration: 800,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: false,
            }),
            Animated.timing(glowAnim, {
              toValue: 1,
              duration: 800,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: false,
            }),
          ]),
          Animated.parallel([
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 800,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: false,
            }),
            Animated.timing(glowAnim, {
              toValue: 0.3,
              duration: 800,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: false,
            }),
          ]),
        ])
      );

      animation.start();

      return () => {
        animation.stop();
      };
    } else {
      pulseAnim.setValue(1);
      glowAnim.setValue(0);
    }
  }, [canTap, pulseAnim, glowAnim]);

  const handlePress = () => {
    if (onPress) {
      ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
      onPress();
    }
  };

  const glowStyle = canTap ? {
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: glowAnim,
    shadowRadius: 12,
  } : {};

  const renderPileStack = () => {
    // Show stacked card effect for draw pile
    if (type === 'draw') {
      const stackDepth = Math.min(3, Math.floor(cardCount / 10) + 1);

      return (
        <View style={styles.stackContainer}>
          {Array.from({ length: stackDepth }).map((_, index) => (
            <View
              key={index}
              style={[
                styles.stackCard,
                {
                  bottom: index * 2,
                  left: index * 1,
                  zIndex: stackDepth - index,
                },
              ]}
            >
              <Card
                card={cards[0] || { id: 'placeholder', suit: 'spades', rank: 'A', jokerType: null, value: 0 }}
                isFaceDown
                size="medium"
              />
            </View>
          ))}
        </View>
      );
    }

    // Discard pile - show top card face up
    if (displayCard) {
      return (
        <Card
          card={displayCard}
          size="medium"
        />
      );
    }

    // Empty discard pile
    return (
      <View style={styles.emptyPile}>
        <Text style={styles.emptyText}>Empty</Text>
      </View>
    );
  };

  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={handlePress}
      disabled={!canTap}
      activeOpacity={0.7}
      accessibilityLabel={`${label || type} pile${cardCount > 0 ? `, ${cardCount} cards` : ', empty'}${canTap ? ', tap to draw' : ''}`}
      accessibilityRole="button"
      accessibilityState={{ disabled: !canTap }}
    >
      <Animated.View
        style={[
          styles.pileWrapper,
          { transform: [{ scale: pulseAnim }] },
          glowStyle,
        ]}
      >
        {renderPileStack()}

        {/* Tap indicator when active */}
        {canTap && (
          <View style={styles.tapIndicator}>
            <Text style={styles.tapText}>TAP</Text>
          </View>
        )}
      </Animated.View>

      {label && (
        <Text style={[styles.label, canTap && styles.labelActive]}>{label}</Text>
      )}

      {showCount && (
        <View style={[styles.countBadge, canTap && styles.countBadgeActive]}>
          <Text style={styles.countText}>{cardCount}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      alignItems: 'center',
    },
    pileWrapper: {
      width: 70,
      height: 94,
      justifyContent: 'center',
      alignItems: 'center',
    },
    stackContainer: {
      width: 60,
      height: 84,
      position: 'relative',
    },
    stackCard: {
      position: 'absolute',
    },
    emptyPile: {
      width: 60,
      height: 84,
      borderRadius: BorderRadius.small,
      borderWidth: 2,
      borderStyle: 'dashed',
      borderColor: colors.separator,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.cardBackground,
    },
    emptyText: {
      ...Typography.caption2,
      color: colors.tertiaryLabel,
    },
    label: {
      ...Typography.caption1,
      color: colors.secondaryLabel,
      marginTop: Spacing.xs,
    },
    countBadge: {
      position: 'absolute',
      top: -8,
      right: -8,
      minWidth: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: colors.accent,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: Spacing.xs,
    },
    countText: {
      ...Typography.caption2,
      color: '#FFFFFF',
      fontWeight: '700',
    },
    countBadgeActive: {
      backgroundColor: colors.success,
    },
    labelActive: {
      color: colors.accent,
      fontWeight: '600',
    },
    tapIndicator: {
      position: 'absolute',
      bottom: -4,
      alignSelf: 'center',
      backgroundColor: colors.success,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    tapText: {
      fontSize: 9,
      fontWeight: '800',
      color: '#FFFFFF',
      letterSpacing: 0.5,
    },
  });

export default Pile;
