import React, { useState, useEffect, useMemo } from 'react';
import {
  IconPlus,
  IconEdit,
  IconTrash,
  IconSearch,
  IconX,
  IconUpload,
  IconEye,
  IconEyeOff,
  IconGift,
  IconMinus,
  IconCheck,
} from '@tabler/icons-react';
import toast from 'react-hot-toast';
import { combosAPI, menuAPI } from '../../utils/api';
import './Combos.css';

const Combos = () => {
  const [combos, setCombos] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedCombo, setSelectedCombo] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [itemSearchTerm, setItemSearchTerm] = useState('');

  const [imagePreview, setImagePreview] = useState(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image: '',
    price: '',
    isAvailable: true,
    isFeatured: false,
    preparationTime: '15',
  });

  // [{ menuItemId, name, price, quantity }]
  const [selectedItems, setSelectedItems] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [combosRes, menuRes] = await Promise.all([
        combosAPI.getAll(),
        menuAPI.getAll(),
      ]);

      if (combosRes.data.success) setCombos(combosRes.data.data);
      if (menuRes.data.success) {
        // Combo banane ke liye sirf normal items (khud combo nahi) select karne denge
        setMenuItems(menuRes.data.data.filter((item) => !item.isCombo));
      }
    } catch (error) {
      console.error('Error fetching combos data:', error);
      toast.error('Failed to load combos / menu items');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      image: '',
      price: '',
      isAvailable: true,
      isFeatured: false,
      preparationTime: '15',
    });
    setSelectedItems([]);
    setImagePreview(null);
    setSelectedCombo(null);
    setItemSearchTerm('');
  };

  const closeModal = () => {
    setShowAddModal(false);
    setShowEditModal(false);
    resetForm();
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
      setFormData((prev) => ({ ...prev, image: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  // ---------- Item picker ----------
  const filteredMenuItems = useMemo(() => {
    return menuItems.filter((item) =>
      item.name.toLowerCase().includes(itemSearchTerm.toLowerCase())
    );
  }, [menuItems, itemSearchTerm]);

  const isSelected = (menuItemId) =>
    selectedItems.some((i) => i.menuItemId === menuItemId);

  const toggleItemSelection = (item) => {
    setSelectedItems((prev) => {
      if (prev.some((i) => i.menuItemId === item._id)) {
        return prev.filter((i) => i.menuItemId !== item._id);
      }
      return [
        ...prev,
        {
          menuItemId: item._id,
          name: item.name,
          price: item.price,
          quantity: 1,
        },
      ];
    });
  };

  const changeItemQty = (menuItemId, delta) => {
    setSelectedItems((prev) =>
      prev.map((i) =>
        i.menuItemId === menuItemId
          ? { ...i, quantity: Math.max(1, i.quantity + delta) }
          : i
      )
    );
  };

  const originalTotal = useMemo(
    () => selectedItems.reduce((sum, i) => sum + i.price * i.quantity, 0),
    [selectedItems]
  );

  const comboPrice = Number(formData.price) || 0;
  const savings = Math.max(originalTotal - comboPrice, 0);
  const savingsPercent =
    originalTotal > 0 ? Math.round((savings / originalTotal) * 100) : 0;

  // ---------- Submit ----------
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Combo name is required');
      return;
    }
    if (selectedItems.length < 2) {
      toast.error('Combo me kam se kam 2 items select karo');
      return;
    }
    if (!formData.price || isNaN(formData.price) || Number(formData.price) < 0) {
      toast.error('Valid combo price daalo');
      return;
    }
    if (Number(formData.price) > originalTotal) {
      toast.error(
        `Combo price (₹${formData.price}) items ki total price (₹${originalTotal}) se zyada nahi ho sakta`
      );
      return;
    }

    try {
      setSaving(true);

      const payload = {
        name: formData.name.trim(),
        description: formData.description,
        image: formData.image,
        price: Number(formData.price),
        isAvailable: formData.isAvailable,
        isFeatured: formData.isFeatured,
        preparationTime: parseInt(formData.preparationTime) || 15,
        items: selectedItems.map((i) => ({
          menuItemId: i.menuItemId,
          quantity: i.quantity,
        })),
      };

      const response = showEditModal
        ? await combosAPI.update(selectedCombo._id, payload)
        : await combosAPI.create(payload);

      if (response.data.success) {
        toast.success(
          showEditModal ? 'Combo updated successfully' : 'Combo created successfully'
        );
        if (showEditModal) {
          setCombos(
            combos.map((c) => (c._id === selectedCombo._id ? response.data.data : c))
          );
        } else {
          setCombos([...combos, response.data.data]);
        }
        closeModal();
      }
    } catch (error) {
      const msg =
        error.response?.data?.message || error.message || 'Failed to save combo';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleEditClick = (combo) => {
    setSelectedCombo(combo);
    setFormData({
      name: combo.name,
      description: combo.description || '',
      image: combo.image || '',
      price: combo.price.toString(),
      isAvailable: combo.isAvailable,
      isFeatured: combo.isFeatured,
      preparationTime: combo.preparationTime?.toString() || '15',
    });
    setSelectedItems(
      (combo.comboItems || []).map((ci) => ({
        menuItemId: ci.itemId,
        name: ci.itemName,
        price: ci.price,
        quantity: ci.quantity,
      }))
    );
    setImagePreview(combo.image || null);
    setShowEditModal(true);
  };

  const handleDelete = async (comboId) => {
    if (!window.confirm('Is combo ko delete karna hai?')) return;

    try {
      const response = await combosAPI.delete(comboId);
      if (response.data.success) {
        toast.success('Combo deleted');
        setCombos(combos.filter((c) => c._id !== comboId));
      }
    } catch (error) {
      toast.error('Failed to delete combo');
    }
  };

  const handleToggleAvailability = async (combo) => {
    try {
      const response = await combosAPI.toggleAvailability(combo._id, !combo.isAvailable);
      if (response.data.success) {
        toast.success(response.data.message);
        setCombos(combos.map((c) => (c._id === combo._id ? response.data.data : c)));
      }
    } catch (error) {
      toast.error('Failed to update availability');
    }
  };

  const filteredCombos = combos.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="combos-page loading">
        <div className="spinner"></div>
        <p>Loading combos...</p>
      </div>
    );
  }

  return (
    <div className="combos-page">
      <div className="section-header">
        <div>
          <h1>
            <IconGift size={24} /> Combo Management
          </h1>
          <p>Bundle multiple menu items to make a discounted combo</p>
        </div>
        <button className="btn-primary" onClick={() => setShowAddModal(true)}>
          <IconPlus size={18} /> Add New Combo
        </button>
      </div>

      <div className="combos-controls">
        <div className="Combo-search-box">
          <IconSearch size={20} />
          <input
            type="text"
            placeholder="Search combos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {filteredCombos.length === 0 ? (
        <div className="empty-state">
          <IconGift size={40} />
          <p>No Combos Created yet</p>
          <button className="btn-primary" onClick={() => setShowAddModal(true)}>
            <IconPlus size={18} /> Create Your First Combo
          </button>
        </div>
      ) : (
        <div className="combos-grid">
          {filteredCombos.map((combo) => {
            const save = Math.max((combo.originalTotalPrice || 0) - combo.price, 0);
            const savePct =
              combo.originalTotalPrice > 0
                ? Math.round((save / combo.originalTotalPrice) * 100)
                : 0;

            return (
              <div key={combo._id} className="combo-card">
                <div className="combo-card-img-wrap">
                  {combo.image ? (
                    <img src={combo.image} alt={combo.name} />
                  ) : (
                    <div className="combo-card-img-placeholder">
                      <IconGift size={28} />
                    </div>
                  )}
                  {save > 0 && (
                    <span className="combo-save-badge">Save {savePct}%</span>
                  )}
                  <span
                    className={`combo-status-badge ${combo.isAvailable ? 'available' : 'unavailable'}`}
                  >
                    {combo.isAvailable ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="combo-card-body">
                  <h3>{combo.name}</h3>

                  <div className="combo-items-list">
                    {combo.comboItems?.map((ci, idx) => (
                      <span key={idx} className="combo-item-badge">
                        {ci.quantity}× {ci.itemName}
                      </span>
                    ))}
                  </div>

                  <div className="combo-price-row">
                    {combo.originalTotalPrice > combo.price && (
                      <span className="combo-original-price">
                        ₹{combo.originalTotalPrice}
                      </span>
                    )}
                    <span className="combo-final-price">₹{combo.price}</span>
                  </div>
                  {save > 0 && (
                    <p className="combo-savings-text">You save ₹{save.toFixed(2)}</p>
                  )}
                </div>

                <div className="combo-card-actions">
                  <button
                    onClick={() => handleToggleAvailability(combo)}
                    title={combo.isAvailable ? 'Mark Inactive' : 'Mark Active'}
                  >
                    {combo.isAvailable ? <IconEye size={16} /> : <IconEyeOff size={16} />}
                  </button>
                  <button onClick={() => handleEditClick(combo)} title="Edit">
                    <IconEdit size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(combo._id)}
                    title="Delete"
                    className="danger"
                  >
                    <IconTrash size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ===== Add/Edit Modal ===== */}
      {(showAddModal || showEditModal) && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content large-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{showEditModal ? 'Edit Combo' : 'Create New Combo'}</h2>
              <button className="close-btn" onClick={closeModal}>
                <IconX size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="combo-form">
              <div className="form-section">
                <h3>Combo Details</h3>

                <div className="comboform-group">
                  <label>Combo Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Family Feast Combo"
                    required
                  />
                </div>

                <div className="comboform-group">
                  <label>Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Combo ke baare me batao..."
                    rows="2"
                  />
                </div>

                <div className="Combo-image-upload-section">
                  <label className="Combo-image-upload-label">
                    <IconUpload size={22} />
                    <span>Click to upload combo image</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      style={{ display: 'none' }}
                    />
                  </label>
                  {imagePreview && (
                    <div className="image-preview">
                      <img src={imagePreview} alt="Preview" />
                      <button
                        type="button"
                        className="remove-image"
                        onClick={() => {
                          setImagePreview(null);
                          setFormData({ ...formData, image: '' });
                        }}
                      >
                        <IconX size={16} />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="form-section">
                <h3>Select Items ({selectedItems.length} selected)</h3>

                <div className="search-box combo-item-search">
                  <IconSearch size={16} />
                  <input
                    type="text"
                    placeholder="Search menu items..."
                    value={itemSearchTerm}
                    onChange={(e) => setItemSearchTerm(e.target.value)}
                  />
                </div>

                <div className="combo-item-picker">
                  {filteredMenuItems.length === 0 ? (
                    <p className="combo-item-picker-empty">No menu items found</p>
                  ) : (
                    filteredMenuItems.map((item) => (
                      <div
                        key={item._id}
                        className={`combo-item-picker-row ${isSelected(item._id) ? 'selected' : ''}`}
                        onClick={() => toggleItemSelection(item)}
                      >
                        <div className="combo-item-picker-check">
                          {isSelected(item._id) && <IconCheck size={14} />}
                        </div>
                        <span className="combo-item-picker-name">{item.name}</span>
                        <span className="combo-item-picker-price">₹{item.price}</span>
                      </div>
                    ))
                  )}
                </div>

                {selectedItems.length > 0 && (
                  <div className="combo-selected-items">
                    {selectedItems.map((item) => (
                      <div key={item.menuItemId} className="combo-selected-row">
                        <span className="combo-selected-name">{item.name}</span>
                        <span className="combo-selected-price">₹{item.price}</span>
                        <div className="combo-selected-qty">
                          <button
                            type="button"
                            onClick={() => changeItemQty(item.menuItemId, -1)}
                          >
                            <IconMinus size={12} />
                          </button>
                          <span>{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => changeItemQty(item.menuItemId, 1)}
                          >
                            <IconPlus size={12} />
                          </button>
                        </div>
                        <span className="combo-selected-subtotal">
                          ₹{(item.price * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="form-section">
                <h3>Pricing</h3>

                <div className="combo-price-summary">
                  <div className="combo-price-summary-row">
                    <span>Items Total (Original)</span>
                    <span>₹{originalTotal.toFixed(2)}</span>
                  </div>
                  <div className="comboform-group">
                    <label>Combo Price *</label>
                    <div className="input-with-prefix">
                      <span className="combo-prefix">₹</span>
                      <input
                        type="number"
                        value={formData.price}
                        onChange={(e) =>
                          setFormData({ ...formData, price: e.target.value })
                        }
                        placeholder="e.g., 399"
                        min="0"
                        step="0.01"
                        required
                      />
                    </div>
                  </div>
                  {originalTotal > 0 && comboPrice > 0 && (
                    <div className="combo-price-summary-row savings">
                      <span>Customer Saves</span>
                      <span>
                        ₹{savings.toFixed(2)} ({savingsPercent}% off)
                      </span>
                    </div>
                  )}
                </div>

                <div className="form-row">
                  <div className="comboform-group checkbox">
                    <input
                      type="checkbox"
                      id="comboFeatured"
                      checked={formData.isFeatured}
                      onChange={(e) =>
                        setFormData({ ...formData, isFeatured: e.target.checked })
                      }
                    />
                    <label htmlFor="comboFeatured">Featured Combo</label>
                  </div>

                  <div className="comboform-group checkbox">
                    <input
                      type="checkbox"
                      id="comboAvailable"
                      checked={formData.isAvailable}
                      onChange={(e) =>
                        setFormData({ ...formData, isAvailable: e.target.checked })
                      }
                    />
                    <label htmlFor="comboAvailable">Available</label>
                  </div>
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving
                    ? 'Saving...'
                    : showEditModal
                    ? 'Update Combo'
                    : 'Create Combo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Combos;