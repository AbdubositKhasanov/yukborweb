import React, { useEffect, useState } from 'react';
import ClubMembershipModal from './ClubMembershipModal';
import { inferPremiumFeature, PREMIUM_UPGRADE_EVENT } from '../utils/premiumUpgrade';

export default function PremiumUpgradeListener() {
  const [state, setState] = useState({ open: false });

  useEffect(() => {
    const handleUpgrade = (event) => {
      const detail = event.detail || {};
      setState({
        open: true,
        featureKey: detail.featureKey || inferPremiumFeature(detail.message || detail.reason || ''),
        message: detail.message || detail.reason || '',
        title: detail.title,
        currentLimit: detail.currentLimit,
      });
    };

    window.addEventListener(PREMIUM_UPGRADE_EVENT, handleUpgrade);
    return () => window.removeEventListener(PREMIUM_UPGRADE_EVENT, handleUpgrade);
  }, []);

  return (
    <ClubMembershipModal
      isOpen={state.open}
      onClose={() => setState({ open: false })}
      featureKey={state.featureKey}
      title={state.title}
      message={state.message}
      currentLimit={state.currentLimit}
    />
  );
}
