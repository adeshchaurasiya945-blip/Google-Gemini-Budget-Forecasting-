/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AppProvider } from './context/AppContext';
import { ThemeProvider } from './context/ThemeContext';
import Layout from './components/Layout';
import LandingPage from './components/LandingPage';
import Dashboard from './components/Dashboard';

export default function App() {
  const [started, setStarted] = useState(false);

  return (
    <ThemeProvider>
      <AppProvider>
        {!started ? (
          <LandingPage onStart={() => setStarted(true)} />
        ) : (
          <Layout>
            <Dashboard />
          </Layout>
        )}
      </AppProvider>
    </ThemeProvider>
  );
}
