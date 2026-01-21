import React, { useState } from 'react';

export default function PriceInputModal({ isOpen, onClose, onSubmit, cargoName, offering = false, offerError = null }) {
  const [priceInput, setPriceInput] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    setError('');

    // Validate price
    const price = parseInt(priceInput);
    if (!priceInput || isNaN(price) || price <= 0) {
      setError('Narxni kiriting');
      return;
    }

    // Call parent submit handler with the price
    onSubmit(price);
  };

  const handleClose = () => {
    if (offering) return; // Don't allow closing during offer submission
    setPriceInput('');
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '500px' }}
      >
        <h3 className="card-title" style={{ marginBottom: '15px' }}>
          Buyurtma narxini kiriting
        </h3>

        {cargoName && (
          <p style={{ fontSize: '14px', color: '#666', marginBottom: '20px' }}>
            Yuk: {cargoName}
          </p>
        )}

        <div style={{ marginBottom: '20px' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '8px', 
            fontWeight: '600', 
            fontSize: '14px' 
          }}>
            Buyurtma narxi (so'm) <span style={{ color: 'red' }}>*</span>
          </label>
          <input
            type="number"
            className="form-input"
            value={priceInput}
            onChange={(e) => setPriceInput(e.target.value)}
            placeholder="Masalan: 500000"
            min="1"
            step="1"
            autoFocus
            disabled={offering}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !offering) {
                handleSubmit();
              }
            }}
          />
          {error && (
            <span style={{ 
              display: 'block', 
              marginTop: '5px', 
              color: '#dc3545', 
              fontSize: '13px' 
            }}>
              {error}
            </span>
          )}
          {offerError && (
            <span style={{ 
              display: 'block', 
              marginTop: '5px', 
              color: '#dc3545', 
              fontSize: '13px' 
            }}>
              {offerError}
            </span>
          )}
          <span style={{ 
            display: 'block', 
            marginTop: '8px', 
            color: '#856404', 
            backgroundColor: '#fff3cd', 
            padding: '8px', 
            borderRadius: '4px',
            fontSize: '12px'
          }}>
            ⚠️ Narxni faqat o'zbek so'mida va raqamlarda kiriting
          </span>
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button
            className="btn btn-secondary"
            onClick={handleClose}
            disabled={offering}
          >
            Bekor qilish
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={offering}
          >
            {offering ? 'Yuborilmoqda...' : 'Tasdiqlash'}
          </button>
        </div>
      </div>
    </div>
  );
}
