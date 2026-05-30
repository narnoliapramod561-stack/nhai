import React from 'react';
import { AppProvider } from '~/context/AppProvider';
import { RootNavigator } from '~/navigation/RootNavigator';

const App = () => {
  return (
    <AppProvider>
      <RootNavigator />
    </AppProvider>
  );
};

export default App;
