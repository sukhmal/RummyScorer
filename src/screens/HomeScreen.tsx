import React, { useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGame } from '../context/GameContext';
import { useTheme } from '../context/ThemeContext';
import { Game } from '../types/game';
import Icon from '../components/Icon';
import { ThemeColors, Typography, Spacing, TapTargets, IconSize, themeNames, ThemeName } from '../theme';

const HomeScreen = ({ navigation }: any) => {
  const { currentGame, gameHistory, loadGame } = useGame();
  const { colors, themeName, setTheme } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  useEffect(() => {
    loadGame();
  }, [loadGame]);

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getGameSummary = (game: Game) => {
    const winnerPlayer = game.players.find(p => p.id === game.winner);
    const variant = game.config.variant === 'pool'
      ? `Pool ${game.config.poolLimit}`
      : game.config.variant === 'deals'
      ? `Deals ${game.config.numberOfDeals}`
      : 'Points';
    return {
      winner: winnerPlayer?.name || 'Unknown',
      variant,
      players: game.players.length,
      rounds: game.rounds.length,
    };
  };

  const themeOptions: ThemeName[] = ['midnight', 'light', 'ocean', 'forest', 'royal'];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Rummy Scorer</Text>
        <Text style={styles.subtitle}>Track your game scores</Text>

        {currentGame && !currentGame.winner ? (
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={() => navigation.navigate('Game')}>
            <Text style={styles.buttonText}>Continue Game</Text>
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={() => navigation.navigate('GameSetup')}>
          <Text style={styles.buttonText}>New Game</Text>
        </TouchableOpacity>

        {/* Theme Picker */}
        <View style={styles.themeSection}>
          <View style={styles.themeTitleRow}>
            <Icon name="paintpalette.fill" size={IconSize.medium} color={colors.secondaryLabel} weight="medium" />
            <Text style={styles.themeTitle}>Theme</Text>
          </View>
          <View style={styles.themeOptions}>
            {themeOptions.map((theme) => (
              <TouchableOpacity
                key={theme}
                style={[
                  styles.themeButton,
                  themeName === theme && styles.themeButtonActive,
                ]}
                onPress={() => setTheme(theme)}
                accessibilityLabel={`Select ${themeNames[theme]} theme`}
                accessibilityRole="button">
                <Text
                  style={[
                    styles.themeButtonText,
                    themeName === theme && styles.themeButtonTextActive,
                  ]}>
                  {themeNames[theme]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {gameHistory.length > 0 && (
          <View style={styles.historySection}>
            <View style={styles.historyTitleRow}>
              <Icon name="clock.arrow.circlepath" size={IconSize.medium} color={colors.secondaryLabel} weight="medium" />
              <Text style={styles.historyTitle}>Past Games</Text>
            </View>
            {gameHistory.map(game => {
              const summary = getGameSummary(game);
              return (
                <TouchableOpacity
                  key={game.id}
                  style={styles.historyCard}
                  onPress={() => navigation.navigate('History', { gameId: game.id })}>
                  <View style={styles.historyCardHeader}>
                    <Text style={styles.historyVariant}>
                      {game.name || summary.variant}
                    </Text>
                    <Text style={styles.historyDate}>
                      {formatDate(game.completedAt || game.startedAt)}
                    </Text>
                  </View>
                  {game.name && (
                    <Text style={styles.historyVariantSmall}>{summary.variant}</Text>
                  )}
                  <Text style={styles.historyWinner}>Winner: {summary.winner}</Text>
                  <Text style={styles.historyDetails}>
                    {summary.players} players • {summary.rounds} rounds
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
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
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  title: {
    ...Typography.largeTitle,
    fontSize: 42,
    color: colors.label,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    ...Typography.headline,
    color: colors.secondaryLabel,
    marginBottom: Spacing.xxl,
  },
  button: {
    width: '80%',
    padding: Spacing.lg,
    borderRadius: 12,
    alignItems: 'center',
    marginVertical: Spacing.sm,
    minHeight: TapTargets.comfortable,
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: colors.cardBackground,
    borderWidth: 2,
    borderColor: colors.accent,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.accent,
  },
  buttonText: {
    color: colors.labelLight,
    fontSize: 18,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: colors.accent,
    fontSize: 18,
    fontWeight: '600',
  },
  themeSection: {
    width: '100%',
    marginTop: Spacing.xl,
  },
  themeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  themeTitle: {
    ...Typography.title3,
    color: colors.label,
  },
  themeOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  themeButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.accent,
    backgroundColor: 'transparent',
  },
  themeButtonActive: {
    backgroundColor: colors.accent,
  },
  themeButtonText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '600',
  },
  themeButtonTextActive: {
    color: colors.labelLight,
  },
  historySection: {
    width: '100%',
    marginTop: Spacing.xl,
  },
  historyTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  historyTitle: {
    ...Typography.title3,
    color: colors.label,
  },
  historyCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  historyCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  historyVariant: {
    color: colors.success,
    fontSize: 14,
    fontWeight: '600',
  },
  historyDate: {
    color: colors.secondaryLabel,
    fontSize: 12,
  },
  historyWinner: {
    color: colors.labelLight,
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  historyDetails: {
    color: colors.secondaryLabel,
    fontSize: 12,
  },
  historyVariantSmall: {
    color: colors.secondaryLabel,
    fontSize: 12,
    marginBottom: 4,
  },
});

export default HomeScreen;
