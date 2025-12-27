import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SegmentedControl from '@react-native-segmented-control/segmented-control';
import { useGame } from '../context/GameContext';
import { useTheme } from '../context/ThemeContext';
import { GameVariant, GameConfig, Player, PoolType } from '../types/game';
import Icon from '../components/Icon';
import { ThemeColors, Spacing, TapTargets, IconSize } from '../theme';

const PRESET_POOL_LIMITS = [101, 201, 250] as const;

const GameSetupScreen = ({ navigation }: any) => {
  const { createGame, resetGame } = useGame();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [gameName, setGameName] = useState<string>('');
  const [variant, setVariant] = useState<GameVariant>('pool');
  const [poolLimit, setPoolLimit] = useState<PoolType>(250);
  const [isCustomPoolLimit, setIsCustomPoolLimit] = useState(false);
  const [customPoolLimitText, setCustomPoolLimitText] = useState('');
  const [pointValue, setPointValue] = useState<number>(1);
  const [numberOfDeals, setNumberOfDeals] = useState<number>(2);
  const [players, setPlayers] = useState<Player[]>([
    { id: '1', name: '', score: 0 },
    { id: '2', name: '', score: 0 },
  ]);

  const addPlayer = () => {
    if (players.length < 11) {
      setPlayers([
        ...players,
        { id: Date.now().toString(), name: '', score: 0 },
      ]);
    }
  };

  const removePlayer = (id: string) => {
    if (players.length > 2) {
      setPlayers(players.filter(p => p.id !== id));
    }
  };

  const updatePlayerName = (id: string, name: string) => {
    setPlayers(players.map(p => (p.id === id ? { ...p, name } : p)));
  };

  const startGame = () => {
    const validPlayers = players.filter(p => p.name.trim() !== '');

    if (validPlayers.length < 2) {
      Alert.alert('Error', 'Please add at least 2 players with names');
      return;
    }

    const config: GameConfig = {
      variant,
      ...(variant === 'pool' && { poolLimit }),
      ...(variant === 'points' && { pointValue }),
      ...(variant === 'deals' && { numberOfDeals }),
    };

    resetGame();
    createGame(config, validPlayers, gameName.trim() || undefined);
    navigation.navigate('Game');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Game Setup</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Game Name (Optional)</Text>
          <TextInput
            style={styles.input}
            value={gameName}
            onChangeText={setGameName}
            placeholder="e.g., Friday Night Rummy"
            placeholderTextColor={colors.placeholder}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Game Variant</Text>
          <View style={styles.variantButtons}>
            <TouchableOpacity
              style={[
                styles.variantButton,
                variant === 'pool' && styles.variantButtonActive,
              ]}
              onPress={() => setVariant('pool')}>
              <Text
                style={[
                  styles.variantButtonText,
                  variant === 'pool' && styles.variantButtonTextActive,
                ]}>
                Pool
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.variantButton,
                variant === 'points' && styles.variantButtonActive,
              ]}
              onPress={() => setVariant('points')}>
              <Text
                style={[
                  styles.variantButtonText,
                  variant === 'points' && styles.variantButtonTextActive,
                ]}>
                Points
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.variantButton,
                variant === 'deals' && styles.variantButtonActive,
              ]}
              onPress={() => setVariant('deals')}>
              <Text
                style={[
                  styles.variantButtonText,
                  variant === 'deals' && styles.variantButtonTextActive,
                ]}>
                Deals
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {variant === 'pool' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pool Limit</Text>
            <SegmentedControl
              values={['101', '201', '250', 'Custom']}
              selectedIndex={
                isCustomPoolLimit
                  ? 3
                  : PRESET_POOL_LIMITS.indexOf(poolLimit as 101 | 201 | 250)
              }
              onChange={event => {
                const index = event.nativeEvent.selectedSegmentIndex;
                if (index === 3) {
                  setIsCustomPoolLimit(true);
                } else {
                  setIsCustomPoolLimit(false);
                  setCustomPoolLimitText('');
                  setPoolLimit(PRESET_POOL_LIMITS[index]);
                }
              }}
              style={styles.segmentedControl}
              tintColor={colors.accent}
              fontStyle={styles.segmentedControlFont}
              activeFontStyle={styles.segmentedControlActiveFont}
            />
            {isCustomPoolLimit && (
              <TextInput
                style={[styles.input, styles.customPoolInput]}
                value={customPoolLimitText}
                onChangeText={text => {
                  setCustomPoolLimitText(text);
                  const parsed = parseInt(text, 10);
                  if (parsed > 0) {
                    setPoolLimit(parsed);
                  }
                }}
                keyboardType="numeric"
                placeholder="Enter custom pool limit"
                placeholderTextColor={colors.placeholder}
                autoFocus
              />
            )}
          </View>
        )}

        {variant === 'points' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Point Value</Text>
            <TextInput
              style={styles.input}
              value={pointValue.toString()}
              onChangeText={text => setPointValue(parseInt(text, 10) || 1)}
              keyboardType="numeric"
              placeholder="Enter point value"
              placeholderTextColor={colors.placeholder}
            />
          </View>
        )}

        {variant === 'deals' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Number of Deals</Text>
            <TextInput
              style={styles.input}
              value={numberOfDeals.toString()}
              onChangeText={text => setNumberOfDeals(parseInt(text, 10) || 2)}
              keyboardType="numeric"
              placeholder="Enter number of deals"
              placeholderTextColor={colors.placeholder}
            />
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Players ({players.length}/11)</Text>
          {players.map((player, index) => (
            <View key={player.id} style={styles.playerRow}>
              <TextInput
                style={styles.playerInput}
                value={player.name}
                onChangeText={text => updatePlayerName(player.id, text)}
                placeholder={`Player ${index + 1} name`}
                placeholderTextColor={colors.placeholder}
              />
              {players.length > 2 && (
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removePlayer(player.id)}
                  accessibilityLabel={`Remove ${player.name || 'player'}`}
                  accessibilityRole="button"
                >
                  <Icon name="xmark.circle.fill" size={IconSize.medium} color={colors.accent} weight="medium" />
                </TouchableOpacity>
              )}
            </View>
          ))}
          {players.length < 11 && (
            <TouchableOpacity
              style={styles.addButton}
              onPress={addPlayer}
              accessibilityLabel="Add another player"
              accessibilityRole="button"
            >
              <Icon name="plus.circle.fill" size={IconSize.medium} color={colors.accent} weight="medium" />
              <Text style={styles.addButtonText}>Add Player</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity style={styles.startButton} onPress={startGame}>
          <Text style={styles.startButtonText}>Start Game</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
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
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.labelLight,
    marginBottom: Spacing.xl,
    textAlign: 'center',
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.labelLight,
    marginBottom: Spacing.md,
  },
  variantButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  variantButton: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.accent,
    alignItems: 'center',
  },
  variantButtonActive: {
    backgroundColor: colors.accent,
  },
  variantButtonText: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: '600',
  },
  variantButtonTextActive: {
    color: colors.labelLight,
  },
  input: {
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 8,
    padding: Spacing.md,
    color: colors.labelLight,
    fontSize: 16,
  },
  customPoolInput: {
    marginTop: Spacing.md,
  },
  segmentedControl: {
    height: 40,
  },
  segmentedControlFont: {
    color: colors.secondaryLabel,
  },
  segmentedControlActiveFont: {
    color: colors.label,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  playerInput: {
    flex: 1,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 8,
    padding: Spacing.md,
    color: colors.labelLight,
    fontSize: 16,
  },
  removeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButton: {
    flexDirection: 'row',
    padding: Spacing.md,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.accent,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    minHeight: TapTargets.minimum,
  },
  addButtonText: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: '600',
  },
  startButton: {
    backgroundColor: colors.cardBackground,
    borderWidth: 2,
    borderColor: colors.accent,
    padding: Spacing.lg,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  startButtonText: {
    color: colors.labelLight,
    fontSize: 18,
    fontWeight: '600',
  },
});

export default GameSetupScreen;
