import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { useGame } from '../context/GameContext';

const HomeScreen = ({ navigation }: any) => {
  const { currentGame, loadGame } = useGame();

  useEffect(() => {
    loadGame();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
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

        {currentGame && currentGame.rounds.length > 0 ? (
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={() => navigation.navigate('History')}>
            <Text style={styles.secondaryButtonText}>View History</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#eee',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: '#aaa',
    marginBottom: 60,
  },
  button: {
    width: '80%',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginVertical: 10,
  },
  primaryButton: {
    backgroundColor: '#16213e',
    borderWidth: 2,
    borderColor: '#0f3460',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#0f3460',
  },
  buttonText: {
    color: '#eee',
    fontSize: 18,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#0f3460',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default HomeScreen;
