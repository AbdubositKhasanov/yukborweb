import React from 'react';

const STYLES = {
  cargo_owner: {
    background: '#d4edda',
    color: '#155724',
    border: '1px solid #c3e6cb',
    label: 'Yuk egasi',
  },
  logist: {
    background: '#fff3cd',
    color: '#856404',
    border: '1px solid #ffeeba',
    label: 'Logist',
  },
};

export default function SenderTypeBadge({ senderType, size = 'sm' }) {
  const style = STYLES[senderType];
  if (!style) return null;

  const padding = size === 'sm' ? '2px 8px' : '4px 10px';
  const fontSize = size === 'sm' ? '11px' : '12px';

  return (
    <span
      style={{
        display: 'inline-block',
        padding,
        fontSize,
        fontWeight: 600,
        borderRadius: '10px',
        background: style.background,
        color: style.color,
        border: style.border,
        whiteSpace: 'nowrap',
        flexShrink: 0,
      }}
    >
      {style.label}
    </span>
  );
}
