// src/pages/MyCollectedRewardsPage.tsx
// This page is temporarily disabled to prevent compilation errors
// due to incomplete "Rewards Store" functionality.

import React from 'react';
import { PageContainer, PageHeader, PageBody } from '../components/layout';

const MyCollectedRewardsPage: React.FC = () => {
  return (
    <PageContainer>
      <PageHeader title="My Collected Rewards" />
      <PageBody>
        <div className="text-center text-slate-400">
          <p className="text-body">This feature is currently under construction.</p>
        </div>
      </PageBody>
    </PageContainer>
  );
};

export default MyCollectedRewardsPage;
