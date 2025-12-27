import React, { useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGame } from '../context/GameContext';
import { useTheme } from '../context/ThemeContext';
import { ScoreInput } from '../types/game';
import FireworksModal from '../components/FireworksModal';
import Icon from '../components/Icon';
import { ThemeColors, Spacing, TapTargets, IconSize } from '../theme';

// States: 0 = default (25 drop), 1 = winner (0), 2 = custom score, 3 = invalid declaration (80)
type PlayerState = 0 | 1 | 2 | 3;

const GameScreen = ({ navigation }: any) => {
  const { currentGame, addRound } = useGame();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [playerStates, setPlayerStates] = useState<{ [playerId: string]: PlayerState }>({});
  const [customScores, setCustomScores] = useState<{ [playerId: string]: number }>({});
  const [showFireworks, setShowFireworks] = useState(false);
  const [gameWinnerName, setGameWinnerName] = useState('');
  const inputRefs = useRef<{ [playerId: string]: TextInput | null }>({});

  if (!currentGame) {
    navigation.navigate('Home');
    return null;
  }

  const hasWinner = Object.values(playerStates).includes(1);
  const hasInvalidDeclaration = Object.values(playerStates).includes(3);
  const roundStarter = hasWinner || hasInvalidDeclaration;

  const cyclePlayerState = (playerId: string) => {
    const currentState = playerStates[playerId] || 0;
    const newStates = { ...playerStates };

    // Check if THIS player is the current winner or invalid
    const isRoundStarter = currentState === 1 || currentState === 3;

    if (isRoundStarter) {
      // Tapping the winner/invalid cycles: Winner -> Invalid -> Clear
      if (currentState === 1) {
        newStates[playerId] = 3; // Winner -> Invalid
      } else {
        newStates[playerId] = 0; // Invalid -> Clear
      }
    } else if (!roundStarter) {
      // No winner/invalid yet - first tap sets winner
      newStates[playerId] = 1;
    } else {
      // Cycle losers: 0 (drop 25) -> 2 (custom) -> 0
      const loserCycle: PlayerState[] = [0, 2];
      const currentIndex = loserCycle.indexOf(currentState);
      const nextIndex = (currentIndex + 1) % loserCycle.length;
      newStates[playerId] = loserCycle[nextIndex];

      // Focus the input when entering custom state
      if (loserCycle[nextIndex] === 2) {
        setTimeout(() => {
          inputRefs.current[playerId]?.focus();
        }, 100);
      }
    }

    setPlayerStates(newStates);
  };

  const updateCustomScore = (playerId: string, points: string) => {
    // Only allow digits, limit to 2 characters
    const digitsOnly = points.replace(/[^0-9]/g, '').slice(0, 2);
    // Allow empty for typing, but clamp when there's a value
    if (digitsOnly === '') {
      setCustomScores({ ...customScores, [playerId]: 0 });
      return;
    }
    const value = parseInt(digitsOnly, 10) || 0;
    // Clamp to max 80 while typing
    const clampedValue = Math.min(value, 80);
    setCustomScores({
      ...customScores,
      [playerId]: clampedValue,
    });
  };

  const enforceMinScore = (playerId: string) => {
    // Enforce minimum of 2 when user finishes typing
    const score = customScores[playerId] ?? 0;
    if (score < 2) {
      setCustomScores({ ...customScores, [playerId]: 2 });
    }
  };

  const getPlayerScore = (playerId: string): number => {
    const state = playerStates[playerId] || 0;
    switch (state) {
      case 0: return 25; // Drop
      case 1: return 0;  // Winner
      case 2: {
        // Custom score: enforce valid range 2-80
        const score = customScores[playerId] ?? 0;
        return score < 2 ? 2 : score;
      }
      case 3: return 80; // Invalid declaration
      default: return 25;
    }
  };

  const getStateLabel = (state: PlayerState): string => {
    switch (state) {
      case 0: return 'Drop';
      case 1: return 'Winner';
      case 2: return 'Custom';
      case 3: return 'Invalid';
      default: return 'Drop';
    }
  };

  const submitRound = () => {
    // Enforce minimum scores for all custom entries before submitting
    const updatedScores = { ...customScores };
    let scoresUpdated = false;
    currentGame.players.forEach(p => {
      if (playerStates[p.id] === 2 && (customScores[p.id] ?? 0) < 2) {
        updatedScores[p.id] = 2;
        scoresUpdated = true;
      }
    });
    if (scoresUpdated) {
      setCustomScores(updatedScores);
    }

    const scores: ScoreInput[] = currentGame.players
      .filter(p => !p.isEliminated)
      .map(p => ({
        playerId: p.id,
        points: playerStates[p.id] === 2
          ? Math.max(2, updatedScores[p.id] ?? 2)
          : getPlayerScore(p.id),
        isDeclared: playerStates[p.id] === 1,
        hasInvalidDeclaration: playerStates[p.id] === 3,
      }));

    const declaredCount = scores.filter(s => s.isDeclared).length;
    const invalidDeclarationCount = scores.filter(s => s.hasInvalidDeclaration).length;

    if (declaredCount === 0 && invalidDeclarationCount === 0) {
      Alert.alert('Error', 'Please mark a winner (tap player name)');
      return;
    }

    if (declaredCount > 1) {
      Alert.alert('Error', 'Only one player can be the winner');
      return;
    }

    // Check if this round will end the game (for pool rummy)
    // Player is eliminated when score > poolLimit (survives at exactly the limit)
    let winnerName: string | null = null;
    if (currentGame.config.variant === 'pool' && currentGame.config.poolLimit) {
      const playersAfterRound = currentGame.players
        .filter(p => !p.isEliminated)
        .map(p => ({
          ...p,
          newScore: p.score + getPlayerScore(p.id),
        }))
        .filter(p => p.newScore <= currentGame.config.poolLimit!);

      if (playersAfterRound.length === 1) {
        winnerName = playersAfterRound[0].name;
      }
    }

    addRound(scores);
    setPlayerStates({});
    setCustomScores({});

    if (winnerName || currentGame.winner) {
      const winner = winnerName || currentGame.players.find(p => p.id === currentGame.winner)?.name;
      setGameWinnerName(winner || 'Unknown');
      setShowFireworks(true);
    }
  };

  const handleFireworksClose = () => {
    setShowFireworks(false);
    navigation.navigate('History');
  };

  const activePlayers = currentGame.players.filter(p => !p.isEliminated);

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title}>
            {currentGame.config.variant === 'pool'
              ? `Pool ${currentGame.config.poolLimit}`
              : currentGame.config.variant === 'deals'
              ? `Deal ${currentGame.currentDeal}/${currentGame.config.numberOfDeals}`
              : 'Points Rummy'}
          </Text>
          <Text style={styles.subtitle}>Round {currentGame.rounds.length + 1}</Text>
        </View>

        <View style={styles.scoreTable}>
          <Text style={styles.tableHint}>
            {roundStarter ? 'Tap to cycle: Drop → Custom' : 'Tap to select: Winner → Invalid'}
          </Text>
          <View style={styles.tableHeader}>
            <Text style={[styles.headerText, styles.nameColumn]}>Player</Text>
            <Text style={[styles.headerText, styles.stateColumn]}>Status</Text>
            <Text style={[styles.headerText, styles.scoreColumn]}>Total</Text>
            <Text style={[styles.headerText, styles.inputColumn]}>Pts</Text>
          </View>

          {activePlayers.map(player => {
            const state = playerStates[player.id] || 0;
            return (
              <TouchableOpacity
                key={player.id}
                style={[
                  styles.playerRow,
                  state === 1 && styles.playerRowWinner,
                  state === 3 && styles.playerRowInvalid,
                ]}
                onPress={() => cyclePlayerState(player.id)}>
                <View style={styles.nameColumn}>
                  <Text style={[
                    styles.playerName,
                    state === 1 && styles.playerNameWinner,
                    state === 3 && styles.playerNameInvalid,
                  ]}>
                    {player.name}
                  </Text>
                </View>
                <View style={styles.stateColumn}>
                  {state === 1 && (
                    <Icon name="checkmark.circle.fill" size={IconSize.small} color={colors.success} weight="medium" />
                  )}
                  {state === 3 && (
                    <Icon name="exclamationmark.triangle.fill" size={IconSize.small} color={colors.destructive} weight="medium" />
                  )}
                  <Text style={[
                    styles.stateText,
                    state === 1 && styles.stateTextWinner,
                    state === 3 && styles.stateTextInvalid,
                  ]}>
                    {getStateLabel(state)}
                  </Text>
                </View>
                <View style={styles.scoreColumn}>
                  <Text style={styles.totalScore}>{player.score}</Text>
                </View>
                <View style={styles.inputColumn}>
                  {state === 2 ? (
                    <TextInput
                      ref={ref => { inputRefs.current[player.id] = ref; }}
                      style={styles.scoreInput}
                      value={customScores[player.id]?.toString() || ''}
                      onChangeText={text => updateCustomScore(player.id, text)}
                      onBlur={() => enforceMinScore(player.id)}
                      keyboardType="numeric"
                      placeholder="2"
                      placeholderTextColor={colors.placeholder}
                    />
                  ) : (
                    <Text style={styles.pointsDisplay}>{getPlayerScore(player.id)}</Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity style={styles.submitButton} onPress={submitRound}>
          <Text style={styles.submitButtonText}>Submit Round</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.viewHistoryButton}
          onPress={() => navigation.navigate('History')}>
          <Text style={styles.viewHistoryButtonText}>View Scoreboard</Text>
        </TouchableOpacity>
        </ScrollView>

        <FireworksModal
          visible={showFireworks}
          winnerName={gameWinnerName}
          onClose={handleFireworksClose}
        />
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
};

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: Spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.labelLight,
  },
  subtitle: {
    fontSize: 16,
    color: colors.secondaryLabel,
    marginTop: 5,
  },
  scoreTable: {
    marginBottom: Spacing.xl,
  },
  tableHint: {
    color: colors.placeholder,
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderBottomColor: colors.accent,
    paddingBottom: 10,
    marginBottom: 10,
  },
  headerText: {
    color: colors.secondaryLabel,
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  nameColumn: {
    flex: 2,
  },
  stateColumn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  scoreColumn: {
    flex: 0.8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputColumn: {
    flex: 0.8,
    alignItems: 'center',
  },
  playerRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBackground,
    borderRadius: 8,
  },
  playerRowWinner: {
    backgroundColor: colors.winnerBackground,
  },
  playerRowInvalid: {
    backgroundColor: colors.invalidBackground,
  },
  playerName: {
    color: colors.labelLight,
    fontSize: 16,
    fontWeight: '500',
  },
  playerNameWinner: {
    color: colors.winnerText,
    fontWeight: 'bold',
  },
  playerNameInvalid: {
    color: colors.invalidText,
    fontWeight: 'bold',
  },
  stateText: {
    color: colors.secondaryLabel,
    fontSize: 12,
    fontWeight: '600',
  },
  stateTextWinner: {
    color: colors.winnerText,
  },
  stateTextInvalid: {
    color: colors.invalidText,
  },
  pointsDisplay: {
    color: colors.labelLight,
    fontSize: 16,
    fontWeight: 'bold',
  },
  totalScore: {
    color: colors.labelLight,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  scoreInput: {
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 8,
    padding: 8,
    width: 60,
    color: colors.labelLight,
    fontSize: 16,
    textAlign: 'center',
  },
  submitButton: {
    backgroundColor: colors.tint,
    padding: Spacing.lg,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    minHeight: TapTargets.comfortable,
    justifyContent: 'center',
  },
  submitButtonText: {
    color: colors.label,
    fontSize: 18,
    fontWeight: '600',
  },
  viewHistoryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.accent,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  viewHistoryButtonText: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default GameScreen;
