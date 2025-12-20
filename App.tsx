import React from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GameProvider } from './src/context/GameContext';

import HomeScreen from './src/screens/HomeScreen';
import GameSetupScreen from './src/screens/GameSetupScreen';
import GameScreen from './src/screens/GameScreen';
import HistoryScreen from './src/screens/HistoryScreen';

const Stack = createNativeStackNavigator();

function App() {
  return (
    <GameProvider>
      <NavigationContainer>
        <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />
        <Stack.Navigator
          initialRouteName="Home"
          screenOptions={{
            headerStyle: {
              backgroundColor: '#1a1a2e',
            },
            headerTintColor: '#eee',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          }}>
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="GameSetup"
            component={GameSetupScreen}
            options={{ title: 'Setup Game' }}
          />
          <Stack.Screen
            name="Game"
            component={GameScreen}
            options={{ title: 'Game' }}
          />
          <Stack.Screen
            name="History"
            component={HistoryScreen}
            options={{ title: 'Scoreboard' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </GameProvider>
  );
}

export default App;
