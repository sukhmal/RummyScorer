import React from 'react';
import { StatusBar, TouchableOpacity, StyleSheet } from 'react-native';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GameProvider } from './src/context/GameContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import Icon from './src/components/Icon';
import { TapTargets, IconSize } from './src/theme';

import HomeScreen from './src/screens/HomeScreen';
import GameSetupScreen from './src/screens/GameSetupScreen';
import GameScreen from './src/screens/GameScreen';
import HistoryScreen from './src/screens/HistoryScreen';

const Stack = createNativeStackNavigator();

const HomeButton = () => {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      onPress={() => navigation.navigate('Home')}
      style={styles.homeButton}
      accessibilityLabel="Go to home screen"
      accessibilityRole="button"
    >
      <Icon name="house.fill" size={IconSize.medium} color={colors.labelLight} weight="medium" />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  homeButton: {
    width: TapTargets.minimum,
    height: TapTargets.minimum,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

const AppNavigator = () => {
  const { colors, themeName } = useTheme();
  const isLightTheme = themeName === 'light';

  return (
    <>
      <StatusBar
        barStyle={isLightTheme ? 'dark-content' : 'light-content'}
        backgroundColor={colors.background}
      />
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTintColor: colors.labelLight,
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
          options={{
            title: 'Setup Game',
            headerLeft: HomeButton,
          }}
        />
        <Stack.Screen
          name="Game"
          component={GameScreen}
          options={{
            title: 'Game',
            headerLeft: HomeButton,
          }}
        />
        <Stack.Screen
          name="History"
          component={HistoryScreen}
          options={{
            title: 'Scoreboard',
            headerLeft: HomeButton,
          }}
        />
      </Stack.Navigator>
    </>
  );
};

function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <GameProvider>
          <NavigationContainer>
            <AppNavigator />
          </NavigationContainer>
        </GameProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

export default App;
