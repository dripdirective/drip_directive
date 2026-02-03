import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createURL } from 'expo-linking';
import { AuthProvider, useAuth } from './context/AuthContext';
import ErrorBoundary from './utils/ErrorBoundary';
import LoginScreen from './screens/LoginScreen';
import SignupScreen from './screens/SignupScreen';
import ForgotPasswordScreen from './screens/ForgotPasswordScreen';
import ResetPasswordScreen from './screens/ResetPasswordScreen';
import ProfileScreen from './screens/ProfileScreen';
import UserImagesScreen from './screens/UserImagesScreen';
import MeScreen from './screens/MeScreen';
import WardrobeScreen from './screens/WardrobeScreen';
import RecommendationsScreen from './screens/RecommendationsScreen';

import { ActivityIndicator, View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { COLORS } from './theme/colors';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Enable proper browser back/forward on web by using URL-based linking.
const linking = {
  prefixes: [createURL('/')],
  config: {
    screens: {
      Login: '',
      Signup: 'signup',
      Main: {
        screens: {
          Me: 'me',
          Wardrobe: 'wardrobe',
          Recommendations: 'style-ai',

        },
      },
    },
  },
};

// Tab Bar Icon Component
const TabIcon = ({ icon, focused }) => (
  <View style={[styles.tabIconContainer, focused && styles.tabIconContainerActive]}>
    <Text style={[styles.tabIcon, focused && styles.tabIconActive]}>{icon}</Text>
  </View>
);

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarLabelStyle: styles.tabBarLabel,
      }}
    >
      <Tab.Screen
        name="Me"
        component={MeScreen}
        options={{
          title: 'Me',
          tabBarIcon: ({ focused }) => <TabIcon icon="🧑" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Wardrobe"
        component={WardrobeScreen}
        options={{
          title: 'Wardrobe',
          tabBarIcon: ({ focused }) => <TabIcon icon="👗" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Recommendations"
        component={RecommendationsScreen}
        options={{
          title: 'Style Studio',
          tabBarIcon: ({ focused }) => <TabIcon icon="✨" focused={focused} />,
        }}
      />

    </Tab.Navigator>
  );
}

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Login">
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
    </Stack.Navigator>
  );
}

function AppNavigator() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingCard}>
          <Image
            source={require('./assets/dripdirective_logo.jpg')}
            style={styles.loadingLogo}
            resizeMode="contain"
            accessibilityLabel="Dripdirective logo"
          />
          <Text style={styles.loadingTitle}>Dripdirective</Text>
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 20 }} />
          <Text style={styles.loadingText}>Loading your style...</Text>
        </View>
      </View>
    );
  }

  return (
    <NavigationContainer
      linking={linking}
      documentTitle={{
        enabled: true,
        formatter: () => 'Dripdirective',
      }}
    >
      {isAuthenticated ? (
        <Stack.Navigator>
          <Stack.Screen
            name="Main"
            component={MainTabs}
            options={{
              headerTitle: () => (
                <View style={styles.headerTitleContainer}>
                  <Image
                    source={require('./assets/dripdirective_logo.jpg')}
                    style={styles.headerLogo}
                    resizeMode="contain"
                    accessibilityLabel="Dripdirective logo"
                  />
                  <Text style={styles.headerTitle}>Dripdirective</Text>
                </View>
              ),
              headerStyle: styles.header,
              headerTintColor: COLORS.textPrimary,
            }}
          />
        </Stack.Navigator>
      ) : (
        <AuthStack />
      )}
    </NavigationContainer>
  );
}

import { API_BASE_URL } from './config/api';

if (typeof __DEV__ !== 'undefined' && __DEV__) {
  console.log("--------------- DEBUG API -------------");
  console.log("Current API Base URL:", API_BASE_URL);
  console.log("---------------------------------------");
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppNavigator />
      </AuthProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  // Loading Screen
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingCard: {
    alignItems: 'center',
    padding: 40,
  },
  loadingLogo: {
    width: 120,
    height: 120,
    marginBottom: 14,
  },
  loadingTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: COLORS.textSecondary,
  },

  // Header
  header: {
    backgroundColor: COLORS.backgroundLight,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    elevation: 0,
    shadowOpacity: 0,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerLogo: {
    width: 28,
    height: 28,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },


  // Tab Bar
  tabBar: {
    backgroundColor: COLORS.backgroundLight,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    height: 70,
    paddingTop: 8,
    paddingBottom: 12,
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  tabIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  tabIconContainerActive: {
    backgroundColor: COLORS.primary + '25',
    borderWidth: 1,
    borderColor: COLORS.primary + '80',
    transform: [{ scale: 1.08 }],
  },
  tabIcon: {
    fontSize: 22,
    opacity: 0.6,
  },
  tabIconActive: {
    opacity: 1,
  },
});
