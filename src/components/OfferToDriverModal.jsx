import React, { useState, useEffect } from 'react';
import { getSuitableTransports, offerForDriver } from '../services/api';
import { useStaticData } from '../context/StaticDataContext';
import { showSuccess, showError } from '../utils/toast';

export default function OfferToDriverModal({ isOpen, onClose, cargo }) {
  const { staticData } = useStaticData();
  const [transports, setTransports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [priceInput, setPriceInput] = useState('');
  const [priceError, setPriceError] = useState('');
  const [offeringTransport, setOfferingTransport] = useState(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    if (isOpen && cargo) {
      // Reset state on dialog open
      setTransports([]);
      setPage(0);
      setHasMore(true);
      loadSuitableTransports(0);
      
      // Initialize price input
      if (cargo.priceUzs && cargo.priceUzs > 0) {
        setPriceInput(cargo.priceUzs.toString());
      } else {
        setPriceInput('');
      }
      setPriceError('');
      setOfferingTransport(null);
    }
  }, [isOpen, cargo]);

  const loadSuitableTransports = async (pageNum) => {
    const isFirstPage = pageNum === 0;
    
    if (isFirstPage) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    
    setError(null);
    
    try {
      const filters = {
        fromCountry: cargo.fromLocation?.countryId,
        fromRegion: cargo.fromLocation?.regionId,
        fromCity: cargo.fromLocation?.cityId,
        vehicleType: cargo.vehicleType,
        maxWeight: cargo.weightKg,
        page: pageNum,
      };

      const response = await getSuitableTransports(filters);
      if (response.code === 200) {
        const newTransports = response.result || [];
        
        if (isFirstPage) {
          setTransports(newTransports);
        } else {
          setTransports(prev => [...prev, ...newTransports]);
        }
        
        // Disable pagination if no more results
        if (newTransports.length === 0) {
          setHasMore(false);
        }
      } else {
        setError(response.message || 'Transportlar yuklanmadi');
        setHasMore(false);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Xatolik yuz berdi');
      setHasMore(false);
    } finally {
      if (isFirstPage) {
        setLoading(false);
      } else {
        setLoadingMore(false);
      }
    }
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      loadSuitableTransports(nextPage);
    }
  };

  const getVehicleTypeName = (vehicleTypeId) => {
    if (!vehicleTypeId || !staticData?.vehicleTypes) return '';
    const vehicle = staticData.vehicleTypes.find(v => v.id === vehicleTypeId);
    return vehicle?.name || '';
  };

  const getLocationName = (transport) => {
    // Priority 1: Use loc1 if available
    if (transport.loc1 && transport.loc1.trim()) {
      return transport.loc1;
    }
    
    // Priority 2: Fallback to resolving fromLocation
    if (transport.fromLocation && staticData) {
      const location = transport.fromLocation;
      const parts = [];
      
      if (location.cityId && staticData.cities) {
        const city = staticData.cities.find(c => c.id === location.cityId);
        if (city) parts.push(city.name);
      }
      
      if (location.regionId && staticData.regions) {
        const region = staticData.regions.find(r => r.id === location.regionId);
        if (region) parts.push(region.name);
      }
      
      if (location.countryId && staticData.countries) {
        const country = staticData.countries.find(c => c.id === location.countryId);
        if (country) parts.push(country.name);
      }
      
      if (parts.length > 0) {
        return parts.join(', ');
      }
    }
    
    // No location data available
    return '—';
  };

  const handleOffer = async (transport) => {
    setPriceError('');

    // Validate price
    const price = parseInt(priceInput);
    if (!priceInput || isNaN(price) || price <= 0) {
      setPriceError('Buyurtma narxini kiriting');
      return;
    }

    if (!window.confirm(`${transport.name || 'Haydovchi'}ga taklif yubormoqchimisiz?`)) {
      return;
    }

    setOfferingTransport(transport.chatId);

    try {
      const response = await offerForDriver(transport.chatId, cargo.id, price);
      if (response.code === 200) {
        showSuccess('Taklif muvaffaqiyatli yuborildi!');
        // DO NOT close dialog - keep it open
      } else {
        showError(response.message || 'Taklif yuborishda xatolik');
      }
    } catch (error) {
      showError(error.response?.data?.message || 'Xatolik yuz berdi');
    } finally {
      setOfferingTransport(null);
    }
  };

  if (!isOpen) return null;

  const isPriceDisabled = cargo?.priceUzs && cargo.priceUzs > 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '600px', maxHeight: '80vh', overflow: 'auto' }}
      >
        <div style={{ marginBottom: '20px' }}>
          <h3 className="card-title" style={{ marginBottom: '10px' }}>
            Mos haydovchilar
          </h3>
          <p style={{ fontSize: '14px', color: '#666' }}>
            Yuk: {cargo?.cargoName || `${cargo?.fromCity} → ${cargo?.toCity}`}
          </p>
        </div>

        {/* Price Input */}
        <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>
            Buyurtma narxi (so'm) <span style={{ color: 'red' }}>*</span>
          </label>
          <input
            type="number"
            className="form-input"
            value={priceInput}
            onChange={(e) => setPriceInput(e.target.value)}
            placeholder="Masalan: 500000"
            disabled={isPriceDisabled}
            min="1"
            step="1"
            style={{
              backgroundColor: isPriceDisabled ? '#e9ecef' : '#fff',
              cursor: isPriceDisabled ? 'not-allowed' : 'text'
            }}
          />
          {priceError && (
            <span style={{ display: 'block', marginTop: '5px', color: '#dc3545', fontSize: '13px' }}>
              {priceError}
            </span>
          )}
          {!isPriceDisabled && (
            <span style={{ 
              display: 'block', 
              marginTop: '8px', 
              color: '#856404', 
              backgroundColor: '#fff3cd', 
              padding: '8px', 
              borderRadius: '4px',
              fontSize: '12px'
            }}>
              ⚠️ Narx faqat o'zbek so'mida va raqamlarda kiritiladi
            </span>
          )}
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#666' }}>
            Yuklanmoqda...
          </div>
        )}

        {error && (
          <div style={{ 
            padding: '15px', 
            backgroundColor: '#f8d7da', 
            color: '#721c24', 
            borderRadius: '8px',
            marginBottom: '20px'
          }}>
            {error}
          </div>
        )}

        {!loading && !error && transports.length === 0 && (
          <div style={{ 
            textAlign: 'center', 
            padding: '60px 20px',
            color: '#999'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '15px' }}>🚚</div>
            <p>Mos haydovchilar topilmadi</p>
          </div>
        )}

        {!loading && !error && transports.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <div style={{ 
              display: 'grid', 
              gap: '12px'
            }}>
              {transports.map((transport) => (
                <div
                  key={transport.chatId || transport.id}
                  style={{
                    padding: '15px',
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px',
                    backgroundColor: '#fff'
                  }}
                >
                  <div style={{ marginBottom: '12px' }}>
                    <h4 style={{ 
                      margin: '0 0 8px 0', 
                      fontSize: '16px',
                      fontWeight: '600'
                    }}>
                      {transport.name || 'Noma\'lum'}
                    </h4>
                    <div style={{ fontSize: '13px', color: '#666', lineHeight: '1.6' }}>
                      {transport.stateNumber && (
                        <p style={{ margin: '4px 0' }}>
                          🚗 Davlat raqami: <strong>{transport.stateNumber}</strong>
                        </p>
                      )}
                      {transport.vehicleTypeId && (
                        <p style={{ margin: '4px 0' }}>
                          🚚 Transport: {getVehicleTypeName(transport.vehicleTypeId)}
                        </p>
                      )}
                      {(() => {
                        const locationText = getLocationName(transport);
                        if (locationText) {
                          return (
                            <p style={{ margin: '4px 0' }}>
                              📍 Joylashuv: {locationText}
                            </p>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </div>

                  <button
                    className="btn btn-primary"
                    onClick={() => handleOffer(transport)}
                    disabled={offeringTransport !== null}
                    style={{ width: '100%', fontSize: '14px' }}
                  >
                    {offeringTransport === transport.chatId
                      ? 'Yuborilmoqda...'
                      : '📨 Taklif qilish'}
                  </button>
                </div>
              ))}
            </div>

            {/* Load More Button */}
            {hasMore && (
              <div style={{ marginTop: '20px', textAlign: 'center' }}>
                <button
                  className="btn btn-secondary"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  style={{ minWidth: '150px' }}
                >
                  {loadingMore ? 'Yuklanmoqda...' : 'Yana yuklash'}
                </button>
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
          <button
            className="btn btn-secondary"
            onClick={onClose}
            disabled={offeringTransport !== null}
          >
            Yopish
          </button>
        </div>
      </div>
    </div>
  );
}
