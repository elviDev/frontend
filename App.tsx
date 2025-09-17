import React from 'react';
import "./global.css";
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { store } from './src/store/store';
import { AppNavigator } from './src/navigation/AppNavigator';
import { ToastProvider } from './src/contexts/ToastContext';
import { UIProvider } from './src/components/common/UIProvider';

// Voice testing utilities were removed during cleanup

export default function App() {
  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <ToastProvider>
          <UIProvider>
            <AppNavigator />
          </UIProvider>
        </ToastProvider>
      </SafeAreaProvider>
    </Provider>
  );
}