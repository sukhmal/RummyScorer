import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
} from 'react-native';
import { useGame } from '../context/GameContext';
import { ScoreInput } from '../types/game';

const GameScreen = ({ navigation }: any) => {
  const { currentGame, addRound } = useGame();
  const [roundScores, setRoundScores] = useState<{
    [playerId: string]: { points: number; isDeclared: boolean; hasInvalidDeclaration: boolean };
  }>({});

  if (!currentGame) {
    navigation.navigate('Home');
    return null;
  }

  const updateScore = (playerId: string, points: string) => {
    setRoundScores({
      ...roundScores,
      [playerId]: {
        ...roundScores[playerId],
        points: parseInt(points) || 0,
      },
    });
  };

  const toggleDeclared = (playerId: string) => {
    setRoundScores({
      ...roundScores,
      [playerId]: {
        ...roundScores[playerId],
        isDeclared: !roundScores[playerId]?.isDeclared,
        hasInvalidDeclaration: false,
      },
    });
  };

  const toggleInvalidDeclaration = (playerId: string) => {
    setRoundScores({
      ...roundScores,
      [playerId]: {
        ...roundScores[playerId],
        hasInvalidDeclaration: !roundScores[playerId]?.hasInvalidDeclaration,
        isDeclared: roundScores[playerId]?.hasInvalidDeclaration ? false : roundScores[playerId]?.isDeclared,
      },
    });
  };

  const submitRound = () => {
    const scores: ScoreInput[] = currentGame.players
      .filter(p => !p.isEliminated)
      .map(p => ({
        playerId: p.id,
        points: roundScores[p.id]?.points || 0,
        isDeclared: roundScores[p.id]?.isDeclared || false,
        hasInvalidDeclaration: roundScores[p.id]?.hasInvalidDeclaration || false,
      }));

    const declaredCount = scores.filter(s => s.isDeclared).length;
    const invalidDeclarationCount = scores.filter(s => s.hasInvalidDeclaration).length;

    if (declaredCount === 0 && invalidDeclarationCount === 0) {
      Alert.alert('Error', 'Please mark the winner or an invalid declaration');
      return;
    }

    if (declaredCount > 1) {
      Alert.alert('Error', 'Only one player can be the winner');
      return;
    }

    addRound(scores);
    setRoundScores({});

    if (currentGame.winner) {
      Alert.alert('Game Over!', 'Check the results screen', [
        { text: 'View Results', onPress: () => navigation.navigate('History') },
      ]);
    }
  };

  const activePlayers = currentGame.players.filter(p => !p.isEliminated);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
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
          <View style={styles.tableHeader}>
            <Text style={[styles.headerText, styles.nameColumn]}>Player</Text>
            <Text style={[styles.headerText, styles.scoreColumn]}>Total</Text>
            <Text style={[styles.headerText, styles.inputColumn]}>Points</Text>
          </View>

          {activePlayers.map(player => (
            <View key={player.id} style={styles.playerRow}>
              <View style={styles.nameColumn}>
                <Text style={styles.playerName}>{player.name}</Text>
              </View>
              <View style={styles.scoreColumn}>
                <Text style={styles.totalScore}>{player.score}</Text>
              </View>
              <View style={styles.inputColumn}>
                <TextInput
                  style={styles.scoreInput}
                  value={roundScores[player.id]?.points?.toString() || ''}
                  onChangeText={text => updateScore(player.id, text)}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#666"
                />
              </View>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mark Winner</Text>
          <View style={styles.playerButtons}>
            {activePlayers.map(player => (
              <TouchableOpacity
                key={player.id}
                style={[
                  styles.playerButton,
                  roundScores[player.id]?.isDeclared && styles.playerButtonActive,
                ]}
                onPress={() => toggleDeclared(player.id)}>
                <Text
                  style={[
                    styles.playerButtonText,
                    roundScores[player.id]?.isDeclared && styles.playerButtonTextActive,
                  ]}>
                  {player.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Invalid Declaration (80 pts)</Text>
          <View style={styles.playerButtons}>
            {activePlayers.map(player => (
              <TouchableOpacity
                key={player.id}
                style={[
                  styles.playerButton,
                  styles.invalidButton,
                  roundScores[player.id]?.hasInvalidDeclaration && styles.invalidButtonActive,
                ]}
                onPress={() => toggleInvalidDeclaration(player.id)}>
                <Text
                  style={[
                    styles.playerButtonText,
                    roundScores[player.id]?.hasInvalidDeclaration && styles.invalidButtonTextActive,
                  ]}>
                  {player.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
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
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#eee',
  },
  subtitle: {
    fontSize: 16,
    color: '#aaa',
    marginTop: 5,
  },
  scoreTable: {
    marginBottom: 30,
  },
  tableHeader: {
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
  nameColumn: {
    flex: 2,
  },
  scoreColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputColumn: {
    flex: 1,
    alignItems: 'center',
  },
  playerRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#16213e',
  },
  playerName: {
    color: '#eee',
    fontSize: 16,
    fontWeight: '500',
  },
  totalScore: {
    color: '#eee',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  scoreInput: {
    backgroundColor: '#16213e',
    borderWidth: 1,
    borderColor: '#0f3460',
    borderRadius: 8,
    padding: 8,
    width: 60,
    color: '#eee',
    fontSize: 16,
    textAlign: 'center',
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#eee',
    marginBottom: 12,
  },
  playerButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  playerButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#0f3460',
  },
  playerButtonActive: {
    backgroundColor: '#0f3460',
  },
  invalidButton: {
    borderColor: '#d32f2f',
  },
  invalidButtonActive: {
    backgroundColor: '#d32f2f',
  },
  playerButtonText: {
    color: '#0f3460',
    fontSize: 14,
    fontWeight: '600',
  },
  playerButtonTextActive: {
    color: '#eee',
  },
  invalidButtonTextActive: {
    color: '#fff',
  },
  submitButton: {
    backgroundColor: '#16213e',
    borderWidth: 2,
    borderColor: '#0f3460',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  submitButtonText: {
    color: '#eee',
    fontSize: 18,
    fontWeight: '600',
  },
  viewHistoryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#0f3460',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  viewHistoryButtonText: {
    color: '#0f3460',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default GameScreen;
