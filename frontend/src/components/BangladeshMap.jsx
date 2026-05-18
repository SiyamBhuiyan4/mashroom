import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';

// Delete default leaflet icon configurations to avoid asset-loading issues
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Color mapping meta for dynamic leaflet pins
export const getRatingColor = (rating) => {
  const val = Number(rating || 5);
  if (val >= 9) return { color: '#fbbf24', text: '⭐ Premium', bg: 'linear-gradient(135deg, #fbbf24, #d97706)' };
  if (val >= 7) return { color: '#22c55e', text: '🟢 Trusted', bg: '#22c55e' };
  if (val >= 5) return { color: '#eab308', text: '🟡 Average', bg: '#eab308' };
  if (val >= 3) return { color: '#f97316', text: '🟠 Below Average', bg: '#f97316' };
  return { color: '#ef4444', text: '🔴 High Risk', bg: '#ef4444' };
};

// Create drop-pin shape using CSS rotate
const getMarkerIcon = (rating, type = 'main_farm') => {
  const ratingVal = Number(rating || 5);
  const colorMeta = getRatingColor(ratingVal);
  
  let emoji = '🍄';
  if (type === 'main_farm') emoji = '🏠';
  else if (type === 'secondary_farm') emoji = '🚜';
  else if (type === 'hatchery') emoji = '🔬';
  else if (type === 'warehouse') emoji = '📦';
  else if (type === 'distribution_point') emoji = '🚚';

  return L.divIcon({
    className: 'custom-leaflet-marker',
    html: `
      <div style="
        background: ${colorMeta.bg};
        color: #fff;
        width: 32px;
        height: 32px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px solid #ffffff;
        box-shadow: 0 4px 8px rgba(0,0,0,0.4);
      ">
        <div style="transform: rotate(45deg); font-size: 14px; display: flex; align-items: center; justify-content: center;">
          ${ratingVal === 9 ? '⭐' : emoji}
        </div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
  });
};

const ClickHandler = ({ onMapClick }) => {
  useMapEvents({ click: (e) => onMapClick && onMapClick(e.latlng) });
  return null;
};

const BangladeshMap = ({ 
  onLocationPick, 
  pickMode = false, 
  adminMode = false,
  onSelectPreferredSeller = null,
  selectedPreferredSellerId = null,
  height = '480px' 
}) => {
  const [markers, setMarkers] = useState([]);
  const [sellersList, setSellersList] = useState([]);
  const [pickedPos, setPickedPos] = useState(null);
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [showMsg, setShowMsg] = useState('');
  
  // Admin Editing Modal
  const [isEditing, setIsEditing] = useState(false);
  const [sellerFilterTerm, setSellerFilterTerm] = useState('');
  const [editForm, setEditForm] = useState({
    id: null,
    sellerId: '',
    lat: '',
    lng: '',
    type: 'main_farm',
    label: '',
    notes: ''
  });

  const loadData = async () => {
    try {
      const res = await axios.get('/api/map/markers');
      setMarkers(res.data);
      // Load all farmers for dropdowns
      const uRes = await axios.get('/api/admin/users');
      const farmers = uRes.data.filter(u => u.role === 'farmer');
      setSellersList(farmers);
    } catch (e) {
      console.error('Failed to load map data', e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleMapClick = (latlng) => {
    if (pickMode) {
      setPickedPos(latlng);
      if (onLocationPick) onLocationPick(latlng.lat, latlng.lng);
    } else if (adminMode) {
      // Open add marker form
      setPickedPos(latlng);
      setEditForm({
        id: null,
        sellerId: '',
        lat: latlng.lat.toFixed(6),
        lng: latlng.lng.toFixed(6),
        type: 'main_farm',
        label: 'New Farm Node',
        notes: ''
      });
      setIsEditing(true);
    }
  };

  const handleMarkerClick = (m) => {
    setSelectedMarker(m);
  };

  const handleSaveMarker = async (e) => {
    e.preventDefault();
    try {
      if (editForm.id) {
        await axios.put(`/api/map/admin/markers/${editForm.id}`, editForm);
        setShowMsg('✅ Marker updated successfully!');
      } else {
        await axios.post('/api/map/admin/markers', editForm);
        setShowMsg('✅ Marker created successfully!');
      }
      setIsEditing(false);
      setPickedPos(null);
      loadData();
      setTimeout(() => setShowMsg(''), 3000);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save marker');
    }
  };

  const handleDeleteMarker = async (id) => {
    if (!window.confirm('Are you sure you want to delete this marker node?')) return;
    try {
      await axios.delete(`/api/map/admin/markers/${id}`);
      setShowMsg('🗑️ Marker deleted.');
      setIsEditing(false);
      setSelectedMarker(null);
      loadData();
      setTimeout(() => setShowMsg(''), 3000);
    } catch {
      alert('Delete failed');
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {/* Alert Banner */}
      {showMsg && (
        <div style={{ 
          position: 'absolute', top: '10px', left: '50%', transform: 'translateX(-50%)', 
          background: 'rgba(7,26,14,0.9)', border: '1px solid var(--color-primary)', 
          color: 'var(--color-primary)', padding: '0.6rem 1.2rem', borderRadius: '30px', 
          zIndex: 1000, fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem',
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
        }}>
          {showMsg}
        </div>
      )}

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        {/* Main Map Container */}
        <div style={{ flex: '1 1 500px', position: 'relative' }}>
          
          {/* Permanent Floating Legend Overlay Card */}
          <div style={{
            position: 'absolute', top: '12px', right: '12px', zIndex: 100,
            background: 'rgba(7,26,14,0.85)', backdropFilter: 'blur(8px)',
            border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)',
            padding: '0.75rem', width: '190px', fontSize: '0.78rem',
            boxShadow: '0 4px 12px rgba(0,0,0,0.4)', color: 'var(--text-main)'
          }}>
            <div style={{ fontWeight: 700, marginBottom: '0.4rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.2rem' }}>
              🗺️ Farm Rating Legend
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ fontSize: '10px' }}>⭐</span>
                <strong style={{ color: '#fbbf24' }}>9.0</strong>
                <span style={{ color: 'var(--text-muted)' }}>Premium Seller</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ fontSize: '10px' }}>🟢</span>
                <strong style={{ color: '#22c55e' }}>7.0 – 8.0</strong>
                <span style={{ color: 'var(--text-muted)' }}>Trusted Seller</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ fontSize: '10px' }}>🟡</span>
                <strong style={{ color: '#eab308' }}>5.0 – 6.0</strong>
                <span style={{ color: 'var(--text-muted)' }}>Average</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ fontSize: '10px' }}>🟠</span>
                <strong style={{ color: '#f97316' }}>3.0 – 4.0</strong>
                <span style={{ color: 'var(--text-muted)' }}>Below Average</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ fontSize: '10px' }}>🔴</span>
                <strong style={{ color: '#ef4444' }}>1.0 – 2.0</strong>
                <span style={{ color: 'var(--text-muted)' }}>High Risk</span>
              </div>
            </div>
          </div>

          <MapContainer
            center={[23.6850, 90.3563]}
            zoom={7}
            style={{ height, width: '100%', borderRadius: 'var(--radius-lg)', zIndex: 1 }}
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            <ClickHandler onMapClick={handleMapClick} />

            {/* Render Multi-Markers */}
            {markers.map(m => {
              const rating = m.seller?.rating || 5;
              const isSelected = selectedPreferredSellerId && m.sellerId === selectedPreferredSellerId;
              
              return (
                <Marker 
                  key={m._id} 
                  position={[m.lat, m.lng]} 
                  icon={getMarkerIcon(rating, m.type)}
                  eventHandlers={{
                    click: () => handleMarkerClick(m)
                  }}
                >
                  <Popup>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                      {m.label} {isSelected && '🏆 (Your Choice)'}
                    </div>
                  </Popup>
                </Marker>
              );
            })}

            {/* Clicked location pointer */}
            {pickedPos && (
              <Marker position={[pickedPos.lat, pickedPos.lng]}>
                <Popup>Picked coordinates</Popup>
              </Marker>
            )}
          </MapContainer>
        </div>

        {/* Sliding Details Showcase & Control Drawer Panel */}
        <AnimatePresence>
          {(selectedMarker || isEditing) && (
            <motion.div 
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              className="glass-panel" 
              style={{ 
                flex: '1 1 320px', padding: '1.5rem', 
                minWidth: '300px', display: 'flex', flexDirection: 'column', gap: '1rem',
                borderColor: 'rgba(255,255,255,0.08)', maxHeight: height, overflowY: 'auto'
              }}
            >
              {/* Form editing trigger */}
              {isEditing ? (
                <form onSubmit={handleSaveMarker} style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                  <h4 style={{ margin: 0, color: 'var(--color-primary)' }}>
                    {editForm.id ? '✏️ Edit Map Marker' : '📍 Drop Map Marker'}
                  </h4>
                  
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Coordinates</label>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', padding: '0.4rem', background: 'rgba(255,255,255,0.03)', borderRadius: '4px' }}>
                      Lat: {editForm.lat} · Lng: {editForm.lng}
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Search Seller (by Name or ID)</label>
                    <input 
                      className="input-field" 
                      type="text" 
                      placeholder="Type name, farm or ID to filter..." 
                      value={sellerFilterTerm} 
                      onChange={e => setSellerFilterTerm(e.target.value)} 
                      style={{ marginBottom: '0.5rem', padding: '0.35rem 0.5rem', fontSize: '0.82rem' }}
                    />
                    <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Assign Seller</label>
                    <select className="input-field" value={editForm.sellerId} onChange={e => setEditForm({ ...editForm, sellerId: e.target.value })}>
                      <option value="">-- No Seller (Unassigned Point) --</option>
                      {sellersList.filter(s => {
                        const term = sellerFilterTerm.toLowerCase();
                        return (
                          s.name?.toLowerCase().includes(term) ||
                          s.farmName?.toLowerCase().includes(term) ||
                          s._id?.toLowerCase().includes(term) ||
                          s.phone?.includes(term)
                        );
                      }).map(s => (
                        <option key={s._id} value={s._id}>
                          {s.farmName || s.name} ({s.phone}) [ID: {s._id.substring(0,6)}...]
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Marker Type</label>
                      <select className="input-field" value={editForm.type} onChange={e => setEditForm({ ...editForm, type: e.target.value })}>
                        <option value="main_farm">🏠 Main Farm</option>
                        <option value="secondary_farm">🚜 Secondary Farm</option>
                        <option value="hatchery">🔬 Hatchery</option>
                        <option value="warehouse">📦 Warehouse</option>
                        <option value="distribution_point">🚚 Distribution Point</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Label Name</label>
                      <input className="input-field" value={editForm.label} onChange={e => setEditForm({ ...editForm, label: e.target.value })} required placeholder="e.g. Main Barn" />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Notes</label>
                    <textarea className="input-field" rows={2} value={editForm.notes} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} placeholder="Logistics notes..." style={{ resize: 'vertical' }} />
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <button type="submit" className="btn btn-primary btn-sm" style={{ flex: 1 }}>Save Node</button>
                    {editForm.id && (
                      <button type="button" className="btn btn-outline btn-sm" onClick={() => handleDeleteMarker(editForm.id)} style={{ color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}>Delete</button>
                    )}
                    <button type="button" className="btn btn-outline btn-sm" onClick={() => { setIsEditing(false); setPickedPos(null); }}>Cancel</button>
                  </div>
                </form>
              ) : (
                /* Showcase detailed preview */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="badge badge-yellow" style={{ fontSize: '0.7rem' }}>
                      {selectedMarker.type.replace('_', ' ').toUpperCase()}
                    </span>
                    <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem' }} onClick={() => setSelectedMarker(null)}>✕</button>
                  </div>

                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)' }}>
                    {selectedMarker.label}
                  </h3>

                  {selectedMarker.seller ? (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0' }}>
                        <div style={{ width: '44px', height: '44px', borderRadius: '8px', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', fontSize: '1.5rem', color: '#fff' }}>
                          🍄
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{selectedMarker.seller.farmName || selectedMarker.seller.name}</div>
                          <div className="star-rating" style={{ fontSize: '0.8rem', color: '#fbbf24' }}>
                            {'★'.repeat(selectedMarker.seller.rating || 5)}{'☆'.repeat(9 - (selectedMarker.seller.rating || 5))}
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: '4px' }}>({selectedMarker.seller.rating || 5}/9)</span>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', margin: '0.2rem 0' }}>
                        <span style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }}>📍 {selectedMarker.seller.district}</span>
                        <span style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }}>🏷️ {selectedMarker.seller.mushroomType}</span>
                      </div>

                      <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
                        {selectedMarker.seller.bio || 'Verified farm providing top-tier organic yield for MashroomMagic.'}
                      </p>

                      {/* Showcase photos */}
                      {selectedMarker.seller.gallery?.length > 0 && (
                        <div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>Farm Gallery</div>
                          <div style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', paddingBottom: '4px' }}>
                            {selectedMarker.seller.gallery.map((img, idx) => (
                              <img key={idx} src={img} alt="Showcase" style={{ width: '56px', height: '56px', borderRadius: '4px', objectFit: 'cover', flexShrink: 0 }} />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Buyer Preferred Farmer Trigger */}
                      {onSelectPreferredSeller && (
                        <button 
                          className="btn btn-primary"
                          onClick={() => {
                            onSelectPreferredSeller(selectedMarker.seller);
                            setShowMsg(`🎯 Preference set: ${selectedMarker.seller.farmName || selectedMarker.seller.name}`);
                            setTimeout(() => setShowMsg(''), 3000);
                          }}
                          style={{
                            marginTop: '0.5rem',
                            background: selectedPreferredSellerId === selectedMarker.sellerId ? 'rgba(34,197,94,0.1)' : 'linear-gradient(135deg,#f97316,#ea580c)',
                            color: selectedPreferredSellerId === selectedMarker.sellerId ? 'var(--color-primary)' : '#fff',
                            border: selectedPreferredSellerId === selectedMarker.sellerId ? '1px solid var(--color-primary)' : 'none',
                            fontWeight: 700
                          }}
                        >
                          {selectedPreferredSellerId === selectedMarker.sellerId ? '🏆 Currently Preferred Seller' : '🎯 Choose as Preferred Seller'}
                        </button>
                      )}
                    </>
                  ) : (
                    <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '6px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      ℹ️ This marker point is an unassigned logistics node or hub.
                    </div>
                  )}

                  {selectedMarker.notes && (
                    <div style={{ marginTop: '0.5rem', padding: '0.6rem 0.8rem', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', fontSize: '0.78rem', color: 'var(--text-muted)', borderLeft: '3px solid var(--color-accent)' }}>
                      <strong>Admin note:</strong> {selectedMarker.notes}
                    </div>
                  )}

                  {/* Admin edit controls */}
                  {adminMode && (
                    <button 
                      className="btn btn-outline btn-sm" 
                      onClick={() => {
                        setEditForm({
                          id: selectedMarker._id,
                          sellerId: selectedMarker.sellerId || '',
                          lat: selectedMarker.lat,
                          lng: selectedMarker.lng,
                          type: selectedMarker.type,
                          label: selectedMarker.label,
                          notes: selectedMarker.notes || ''
                        });
                        setIsEditing(true);
                      }}
                      style={{ marginTop: '0.5rem' }}
                    >
                      ✏️ Edit Marker Details
                    </button>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default BangladeshMap;
