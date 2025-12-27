import React, { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LineChart } from 'react-native-chart-kit';
import { useGame } from '../context/GameContext';
import { useTheme } from '../context/ThemeContext';
import Icon from '../components/Icon';
import { ThemeColors, Spacing, IconSize } from '../theme';

const screenWidth = Dimensions.get('window').width;

const HistoryScreen = ({ navigation, route }: any) => {
  const { currentGame, gameHistory, resetGame } = useGame();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Check if viewing a past game from history
  const gameId = route?.params?.gameId;
  const viewingHistoricalGame = gameId && gameId !== currentGame?.id;
  const historicalGame = viewingHistoricalGame
    ? gameHistory.find(g => g.id === gameId)
    : null;

  const displayGame = historicalGame || currentGame;

  if (!displayGame) {
    navigation.navigate('Home');
    return null;
  }

  const handleNewGame = () => {
    Alert.alert(
      'Start New Game',
      'This will clear the current game. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes',
          onPress: () => {
            resetGame();
            navigation.navigate('Home');
          },
        },
      ]
    );
  };

  const getPlayerWins = (playerId: string) => {
    return displayGame.rounds.filter(r => r.winner === playerId).length;
  };

  const sortedPlayers = [...displayGame.players].sort((a, b) => {
    if (a.isEliminated && !b.isEliminated) return 1;
    if (!a.isEliminated && b.isEliminated) return -1;
    return a.score - b.score;
  });

  const winner = displayGame.winner
    ? displayGame.players.find(p => p.id === displayGame.winner)
    : null;

  // Calculate cumulative scores for the chart
  const getChartData = () => {
    if (displayGame.rounds.length === 0) return null;

    const datasets = displayGame.players.map((player, index) => {
      let cumulative = 0;
      const data = [0]; // Start at 0
      displayGame.rounds.forEach(round => {
        cumulative += round.scores[player.id] || 0;
        data.push(cumulative);
      });
      return {
        data,
        color: () => colors.chartColors[index % colors.chartColors.length],
        strokeWidth: 2,
      };
    });

    const labels = ['0', ...displayGame.rounds.map((_, i) => `${i + 1}`)];

    return {
      labels,
      datasets,
      legend: displayGame.players.map(p => p.name),
    };
  };

  const chartData = getChartData();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Scoreboard</Text>

        {winner && (
          <View style={styles.winnerBanner}>
            <Icon name="trophy.fill" size={IconSize.xlarge} color={colors.gold} weight="medium" />
            <Text style={styles.winnerTitle}>Winner!</Text>
            <Text style={styles.winnerName}>{winner.name}</Text>
          </View>
        )}

        <View style={styles.gameInfo}>
          {displayGame.name && (
            <Text style={styles.gameNameText}>{displayGame.name}</Text>
          )}
          <Text style={styles.gameInfoText}>
            {displayGame.config.variant === 'pool'
              ? `Pool ${displayGame.config.poolLimit}`
              : displayGame.config.variant === 'deals'
              ? `Deals Rummy (${displayGame.config.numberOfDeals} deals)`
              : 'Points Rummy'}
          </Text>
          <Text style={styles.gameInfoText}>Rounds played: {displayGame.rounds.length}</Text>
        </View>

        {chartData && (
          <View style={styles.chartSection}>
            <View style={styles.sectionHeader}>
              <Icon name="chart.line.uptrend.xyaxis" size={IconSize.medium} color={colors.secondaryLabel} weight="medium" />
              <Text style={styles.sectionTitle}>Score Progression</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <LineChart
                data={chartData}
                width={Math.max(screenWidth - 40, displayGame.rounds.length * 50 + 80)}
                height={220}
                chartConfig={{
                  backgroundColor: colors.cardBackground,
                  backgroundGradientFrom: colors.cardBackground,
                  backgroundGradientTo: colors.cardBackground,
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(235, 235, 245, ${opacity * 0.6})`,
                  style: {
                    borderRadius: 12,
                  },
                  propsForDots: {
                    r: '4',
                    strokeWidth: '2',
                  },
                }}
                bezier
                style={styles.chart}
                withInnerLines={false}
                withOuterLines={true}
                fromZero={true}
              />
            </ScrollView>
            <View style={styles.legendContainer}>
              {displayGame.players.map((player, index) => {
                return (
                  <View key={player.id} style={styles.legendItem}>
                    <View style={[styles.legendColor, { backgroundColor: colors.chartColors[index % colors.chartColors.length] }]} />
                    <Text style={styles.legendText}>{player.name}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        <View style={styles.leaderboard}>
          <View style={styles.leaderboardHeader}>
            <Text style={[styles.headerText, styles.rankColumn]}>Rank</Text>
            <Text style={[styles.headerText, styles.nameColumn]}>Player</Text>
            <Text style={[styles.headerText, styles.scoreColumn]}>Score</Text>
            <Text style={[styles.headerText, styles.winsColumn]}>Wins</Text>
          </View>

          {sortedPlayers.map((player, index) => (
            <View
              key={player.id}
              style={[
                styles.playerRow,
                player.isEliminated && styles.eliminatedRow,
              ]}>
              <Text style={[styles.rankText, styles.rankColumn]}>
                {index + 1}
              </Text>
              <Text
                style={[
                  styles.playerName,
                  styles.nameColumn,
                  player.isEliminated && styles.eliminatedText,
                ]}>
                {player.name}
                {player.isEliminated && ' (Out)'}
              </Text>
              <Text
                style={[
                  styles.scoreText,
                  styles.scoreColumn,
                  player.isEliminated && styles.eliminatedText,
                ]}>
                {player.score}
              </Text>
              <Text style={[styles.winsText, styles.winsColumn]}>
                {getPlayerWins(player.id)}
              </Text>
            </View>
          ))}
        </View>

        {displayGame.rounds.length > 0 && (
          <View style={styles.roundsSection}>
            <View style={styles.sectionHeader}>
              <Icon name="clock.arrow.circlepath" size={IconSize.medium} color={colors.secondaryLabel} weight="medium" />
              <Text style={styles.sectionTitle}>Round History</Text>
            </View>
            {[...displayGame.rounds].reverse().map((round, index) => {
              const roundNumber = displayGame.rounds.length - index;
              const roundWinner = round.winner
                ? displayGame.players.find(p => p.id === round.winner)
                : null;

              return (
                <View key={round.id} style={styles.roundCard}>
                  <View style={styles.roundHeader}>
                    <Text style={styles.roundTitle}>Round {roundNumber}</Text>
                    {roundWinner && (
                      <Text style={styles.roundWinner}>
                        Winner: {roundWinner.name}
                      </Text>
                    )}
                  </View>
                  <View style={styles.roundScores}>
                    {displayGame.players.map(player => {
                      const score = round.scores[player.id] || 0;
                      return (
                        <View key={player.id} style={styles.roundScoreRow}>
                          <Text style={styles.roundPlayerName}>
                            {player.name}
                          </Text>
                          <Text style={styles.roundPlayerScore}>
                            {score > 0 ? `+${score}` : score}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {viewingHistoricalGame ? (
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.navigate('Home')}>
            <Text style={styles.backButtonText}>Back to Home</Text>
          </TouchableOpacity>
        ) : (
          <>
            {!winner && (
              <TouchableOpacity
                style={styles.continueButton}
                onPress={() => navigation.navigate('Game')}>
                <Text style={styles.continueButtonText}>Continue Game</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.newGameButton} onPress={handleNewGame}>
              <Text style={styles.newGameButtonText}>New Game</Text>
            </TouchableOpacity>
          </>
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
    padding: Spacing.lg,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.labelLight,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  winnerBanner: {
    backgroundColor: colors.cardBackground,
    borderWidth: 3,
    borderColor: colors.gold,
    borderRadius: 12,
    padding: Spacing.lg,
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  winnerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.gold,
    marginBottom: Spacing.sm,
  },
  winnerName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.labelLight,
  },
  gameInfo: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  gameNameText: {
    color: colors.labelLight,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 5,
  },
  gameInfoText: {
    color: colors.secondaryLabel,
    fontSize: 14,
    marginVertical: 3,
  },
  chartSection: {
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  chart: {
    borderRadius: 12,
  },
  legendContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 5,
  },
  legendText: {
    color: colors.secondaryLabel,
    fontSize: 12,
  },
  leaderboard: {
    marginBottom: Spacing.xl,
  },
  leaderboardHeader: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderBottomColor: colors.accent,
    paddingBottom: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  headerText: {
    color: colors.secondaryLabel,
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  rankColumn: {
    width: 50,
    textAlign: 'center',
  },
  nameColumn: {
    flex: 2,
  },
  scoreColumn: {
    flex: 1,
    textAlign: 'center',
  },
  winsColumn: {
    flex: 1,
    textAlign: 'center',
  },
  playerRow: {
    flexDirection: 'row',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBackground,
    alignItems: 'center',
  },
  eliminatedRow: {
    opacity: 0.5,
  },
  rankText: {
    color: colors.labelLight,
    fontSize: 16,
    fontWeight: 'bold',
  },
  playerName: {
    color: colors.labelLight,
    fontSize: 16,
    fontWeight: '500',
  },
  scoreText: {
    color: colors.labelLight,
    fontSize: 18,
    fontWeight: 'bold',
  },
  winsText: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: '600',
  },
  eliminatedText: {
    textDecorationLine: 'line-through',
  },
  roundsSection: {
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.labelLight,
  },
  roundCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  roundHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.accent,
  },
  roundTitle: {
    color: colors.labelLight,
    fontSize: 16,
    fontWeight: 'bold',
  },
  roundWinner: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '600',
  },
  roundScores: {
    gap: 5,
  },
  roundScoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  roundPlayerName: {
    color: colors.secondaryLabel,
    fontSize: 14,
  },
  roundPlayerScore: {
    color: colors.labelLight,
    fontSize: 14,
    fontWeight: '600',
  },
  continueButton: {
    backgroundColor: colors.cardBackground,
    borderWidth: 2,
    borderColor: colors.accent,
    padding: Spacing.lg,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  continueButtonText: {
    color: colors.labelLight,
    fontSize: 18,
    fontWeight: '600',
  },
  newGameButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.accent,
    padding: Spacing.md,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  newGameButtonText: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    backgroundColor: colors.cardBackground,
    borderWidth: 2,
    borderColor: colors.accent,
    padding: Spacing.lg,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  backButtonText: {
    color: colors.labelLight,
    fontSize: 18,
    fontWeight: '600',
  },
});

export default HistoryScreen;
