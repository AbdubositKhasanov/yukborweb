import React, { useState } from 'react';
import { adminUploadMedia } from '../services/api';
import { showError, showSuccess } from '../utils/toast';

const typeMeta = {
  PHOTO: {
    label: 'Rasm',
    accept: 'image/*',
    maxBytes: 10 * 1024 * 1024,
    hint: 'JPG/PNG/WebP, 10 MB gacha',
  },
  VIDEO: {
    label: 'Video',
    accept: 'video/*',
    maxBytes: 50 * 1024 * 1024,
    hint: 'MP4/MOV, 50 MB gacha',
  },
  ANIMATION: {
    label: 'GIF',
    accept: 'image/gif,video/mp4',
    maxBytes: 50 * 1024 * 1024,
    hint: 'GIF yoki qisqa MP4, 50 MB gacha',
  },
  VOICE: {
    label: 'Ovozli xabar',
    accept: 'audio/*',
    maxBytes: 50 * 1024 * 1024,
    hint: 'OGG/MP3 audio, 50 MB gacha',
  },
};

function formatBytes(bytes) {
  if (!bytes) return '';
  const mb = bytes / 1024 / 1024;
  return `${mb.toFixed(mb >= 10 ? 0 : 1)} MB`;
}

export default function AdminMediaUpload({
  type = 'PHOTO',
  value = '',
  label = 'Media',
  description = 'Fayl admin Telegram chatiga preview uchun yuboriladi va file_id avtomatik olinadi.',
  accept,
  disabled = false,
  successMessage = 'Media yuklandi',
  onManualChange,
  onUploaded,
}) {
  const [uploading, setUploading] = useState(false);
  const meta = typeMeta[type] || typeMeta.PHOTO;

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || disabled || uploading) return;

    if (file.size > meta.maxBytes) {
      showError(`${meta.label} hajmi ${formatBytes(meta.maxBytes)} dan oshmasligi kerak.`);
      return;
    }

    setUploading(true);
    try {
      const response = await adminUploadMedia(file, type);
      if (response.code === 200 && response.result?.fileId) {
        await onUploaded?.(response.result);
        if (successMessage) showSuccess(successMessage);
      } else {
        showError(response.message || 'Media yuklanmadi');
      }
    } catch (e) {
      showError(e.response?.data?.message || e.message || 'Media yuklanmadi');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={wrapStyle}>
      <div style={topRowStyle}>
        <div>
          <div style={titleStyle}>{label}: {meta.label}</div>
          <div style={hintStyle}>{description}</div>
          <div style={hintStyle}>{meta.hint}</div>
        </div>
        <label style={{ ...uploadBtnStyle, opacity: disabled || uploading ? 0.6 : 1 }}>
          {uploading ? 'Yuklanmoqda...' : 'Fayl tanlash'}
          <input
            type="file"
            accept={accept || meta.accept}
            onChange={handleFile}
            disabled={disabled || uploading}
            style={{ display: 'none' }}
          />
        </label>
      </div>

      <label style={manualLabelStyle}>
        file_id
        <input
          value={value || ''}
          onChange={(e) => onManualChange?.(e.target.value)}
          placeholder="Agar kerak bo'lsa file_id ni qo'lda kiriting"
          style={inputStyle}
          disabled={disabled || uploading}
        />
      </label>
    </div>
  );
}

const wrapStyle = {
  border: '1px solid #dbe7f5',
  background: '#f8fbff',
  borderRadius: 10,
  padding: 12,
  display: 'grid',
  gap: 10,
};

const topRowStyle = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: 12,
  flexWrap: 'wrap',
};

const titleStyle = {
  fontWeight: 800,
  color: '#172033',
};

const hintStyle = {
  color: '#64748b',
  fontSize: 12,
  marginTop: 3,
};

const uploadBtnStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: 38,
  padding: '0 14px',
  borderRadius: 8,
  background: '#1769d1',
  color: '#fff',
  fontWeight: 800,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
};

const manualLabelStyle = {
  display: 'grid',
  gap: 6,
  fontSize: 13,
  color: '#334155',
  fontWeight: 700,
};

const inputStyle = {
  padding: '10px 11px',
  border: '1px solid #d7dce3',
  borderRadius: 8,
  fontSize: 14,
  fontFamily: 'monospace',
  width: '100%',
  boxSizing: 'border-box',
};
