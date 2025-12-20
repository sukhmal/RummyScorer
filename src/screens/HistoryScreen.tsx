import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
} from 'react-native';
import { useGame } from '../context/GameContext';

const HistoryScreen = ({ navigation }: any) => {
  const { currentGame, resetGame } = useGame();

  if (!currentGame) {
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
    return currentGame.rounds.filter(r => r.winner === playerId).length;
  };

  const sortedPlayers = [...currentGame.players].sort((a, b) => {
    if (a.isEliminated && !b.isEliminated) return 1;
    if (!a.isEliminated && b.isEliminated) return -1;
    return a.score - b.score;
  });

  const winner = currentGame.winner
    ? currentGame.players.find(p => p.id === currentGame.winner)
    : null;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Scoreboard</Text>

        {winner && (
          <View style={styles.winnerBanner}>
            <Text style={styles.winnerTitle}>Winner!</Text>
            <Text style={styles.winnerName}>{winner.name}</Text>
          </View>
        )}

        <View style={styles.gameInfo}>
          <Text style={styles.gameInfoText}>
            {currentGame.config.variant === 'pool'
              ? `Pool ${currentGame.config.poolLimit}`
              : currentGame.config.variant === 'deals'
              ? `Deals Rummy (${currentGame.config.numberOfDeals} deals)`
              : 'Points Rummy'}
          </Text>
          <Text style={styles.gameInfoText}>Rounds played: {currentGame.rounds.length}</Text>
        </View>

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

        {currentGame.rounds.length > 0 && (
          <View style={styles.roundsSection}>
            <Text style={styles.sectionTitle}>Round History</Text>
            {[...currentGame.rounds].reverse().map((round, index) => {
              const roundNumber = currentGame.rounds.length - index;
              const roundWinner = round.winner
                ? currentGame.players.find(p => p.id === round.winner)
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
                    {currentGame.players.map(player => {
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
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#eee',
    textAlign: 'center',
    marginBottom: 20,
  },
  winnerBanner: {
    backgroundColor: '#16213e',
    borderWidth: 3,
    borderColor: '#ffd700',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  winnerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffd700',
    marginBottom: 10,
  },
  winnerName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#eee',
  },
  gameInfo: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
  },
  gameInfoText: {
    color: '#aaa',
    fontSize: 14,
    marginVertical: 3,
  },
  leaderboard: {
    marginBottom: 30,
  },
  leaderboardHeader: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderBottomColor: '#0f3460',
    paddingBottom: 10,
    marginBottom: 10,
  },
  headerText: {
    color: '#aaa',
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
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#16213e',
    alignItems: 'center',
  },
  eliminatedRow: {
    opacity: 0.5,
  },
  rankText: {
    color: '#eee',
    fontSize: 16,
    fontWeight: 'bold',
  },
  playerName: {
    color: '#eee',
    fontSize: 16,
    fontWeight: '500',
  },
  scoreText: {
    color: '#eee',
    fontSize: 18,
    fontWeight: 'bold',
  },
  winsText: {
    color: '#0f3460',
    fontSize: 16,
    fontWeight: '600',
  },
  eliminatedText: {
    textDecorationLine: 'line-through',
  },
  roundsSection: {
    marginTop: 10,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#eee',
    marginBottom: 15,
  },
  roundCard: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
  },
  roundHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#0f3460',
  },
  roundTitle: {
    color: '#eee',
    fontSize: 16,
    fontWeight: 'bold',
  },
  roundWinner: {
    color: '#0f3460',
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
    color: '#aaa',
    fontSize: 14,
  },
  roundPlayerScore: {
    color: '#eee',
    fontSize: 14,
    fontWeight: '600',
  },
  continueButton: {
    backgroundColor: '#16213e',
    borderWidth: 2,
    borderColor: '#0f3460',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  continueButtonText: {
    color: '#eee',
    fontSize: 18,
    fontWeight: '600',
  },
  newGameButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#0f3460',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  newGameButtonText: {
    color: '#0f3460',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default HistoryScreen;
