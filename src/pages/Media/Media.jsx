import React, { useState, useEffect } from 'react';
import {
    IconPlus,
    IconEdit,
    IconTrash,
    IconX,
    IconUpload,
    IconEye,
    IconEyeOff,
    IconArrowUp,
    IconArrowDown,
    IconPhoto,
    IconCalendarTime,
} from '@tabler/icons-react';
import toast from 'react-hot-toast';
import { mediaAPI } from '../../utils/api';
import './Media.css';

const CATEGORIES = ['Appetizers', 'Main Course', 'Desserts', 'Beverages', 'Combo', 'Side Dishes', 'Other'];

const emptyForm = {
    title: '', image: '', linkedCategory: '', startDate: '', endDate: '', isActive: true,
};

const Media = () => {
    const [banners, setBanners] = useState([]);
    const [loading, setLoading] = useState(true);

    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedBanner, setSelectedBanner] = useState(null);
    const [formData, setFormData] = useState(emptyForm);
    const [imagePreview, setImagePreview] = useState(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchBanners();
    }, []);

    const fetchBanners = async () => {
        try {
            setLoading(true);
            const response = await mediaAPI.getAll();
            if (response.data.success) setBanners(response.data.data);
        } catch (error) {
            console.error('Error fetching banners:', error);
            toast.error('Failed to load banners');
        } finally {
            setLoading(false);
        }
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

    const resetForm = () => {
        setFormData(emptyForm);
        setImagePreview(null);
        setSelectedBanner(null);
    };

    const closeModal = () => {
        setShowAddModal(false);
        setShowEditModal(false);
        resetForm();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.image) {
            toast.error('Banner image daalna zaroori hai');
            return;
        }

        try {
            setSaving(true);
            const payload = {
                title: formData.title,
                image: formData.image,
                linkedCategory: formData.linkedCategory || null,
                startDate: formData.startDate || null,
                endDate: formData.endDate || null,
                isActive: formData.isActive,
            };

            const response = showEditModal
                ? await mediaAPI.update(selectedBanner._id, payload)
                : await mediaAPI.create(payload);

            if (response.data.success) {
                toast.success(showEditModal ? 'Banner updated' : 'Banner added');
                closeModal();
                fetchBanners();
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to save banner');
        } finally {
            setSaving(false);
        }
    };

    const handleEditClick = (banner) => {
        setSelectedBanner(banner);
        setFormData({
            title: banner.title || '',
            image: banner.image,
            linkedCategory: banner.linkedCategory || '',
            startDate: banner.startDate ? banner.startDate.substring(0, 10) : '',
            endDate: banner.endDate ? banner.endDate.substring(0, 10) : '',
            isActive: banner.isActive,
        });
        setImagePreview(banner.image);
        setShowEditModal(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Ye banner delete karna hai?')) return;
        try {
            const response = await mediaAPI.delete(id);
            if (response.data.success) {
                toast.success('Banner deleted');
                setBanners(banners.filter((b) => b._id !== id));
            }
        } catch (error) {
            toast.error('Failed to delete banner');
        }
    };

    const handleToggle = async (banner) => {
        try {
            const response = await mediaAPI.toggle(banner._id, !banner.isActive);
            if (response.data.success) {
                toast.success(response.data.message);
                setBanners(banners.map((b) => (b._id === banner._id ? response.data.data : b)));
            }
        } catch (error) {
            toast.error('Failed to update banner');
        }
    };

    const moveOrder = async (index, direction) => {
        const newIndex = index + direction;
        if (newIndex < 0 || newIndex >= banners.length) return;

        const reordered = [...banners];
        [reordered[index], reordered[newIndex]] = [reordered[newIndex], reordered[index]];

        const orderPayload = reordered.map((b, i) => ({ id: b._id, displayOrder: i }));

        setBanners(reordered); // optimistic update
        try {
            await mediaAPI.reorder(orderPayload);
        } catch (error) {
            toast.error('Failed to reorder');
            fetchBanners();
        }
    };

    if (loading) {
        return (
            <div className="media-page loading">
                <div className="spinner"></div>
                <p>Loading banners...</p>
            </div>
        );
    }

    return (
        <div className="media-page">
            <div className="section-header">
                <div>
                    <h1><IconPhoto size={24} /> Media / Offer Banners</h1>
                    <p>Upload sales offer posters — they will appear in the slider at the top of the customer menu page</p>
                </div>
                <button className="btn-primary" onClick={() => setShowAddModal(true)}>
                    <IconPlus size={18} /> Add Banner
                </button>
            </div>

            {banners.length === 0 ? (
                <div className="empty-state">
                    <IconPhoto size={40} />
                    <p>Koi banner nahi hai abhi tak</p>
                    <button className="btn-primary" onClick={() => setShowAddModal(true)}>
                        <IconPlus size={18} /> Pehla Banner Add Karo
                    </button>
                </div>
            ) : (
                <div className="media-list">
                    {banners.map((banner, index) => (
                        <div key={banner._id} className="media-row">
                            <div className="media-row-order">
                                <button disabled={index === 0} onClick={() => moveOrder(index, -1)}>
                                    <IconArrowUp size={14} />
                                </button>
                                <button disabled={index === banners.length - 1} onClick={() => moveOrder(index, 1)}>
                                    <IconArrowDown size={14} />
                                </button>
                            </div>

                            <img src={banner.image} alt={banner.title} className="media-row-img" />

                            <div className="media-row-info">
                                <p className="media-row-title">{banner.title || 'Untitled Banner'}</p>
                                <div className="media-row-meta">
                                    {banner.linkedCategory && (
                                        <span className="media-tag">→ {banner.linkedCategory}</span>
                                    )}
                                    {(banner.startDate || banner.endDate) && (
                                        <span className="media-tag schedule">
                                            <IconCalendarTime size={12} />
                                            {banner.startDate ? new Date(banner.startDate).toLocaleDateString('en-GB') : 'Now'}
                                            {' → '}
                                            {banner.endDate ? new Date(banner.endDate).toLocaleDateString('en-GB') : 'No end'}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <span className={`media-status-badge ${banner.isActive ? 'active' : 'inactive'}`}>
                                {banner.isActive ? 'Live' : 'Hidden'}
                            </span>

                            <div className="media-row-actions">
                                <button onClick={() => handleToggle(banner)} title={banner.isActive ? 'Hide' : 'Show'}>
                                    {banner.isActive ? <IconEye size={16} /> : <IconEyeOff size={16} />}
                                </button>
                                <button onClick={() => handleEditClick(banner)} title="Edit">
                                    <IconEdit size={16} />
                                </button>
                                <button onClick={() => handleDelete(banner._id)} title="Delete" className="danger">
                                    <IconTrash size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ===== Add/Edit Modal ===== */}
            {(showAddModal || showEditModal) && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{showEditModal ? 'Edit Banner' : 'Add New Banner'}</h2>
                            <button className="close-btn" onClick={closeModal}><IconX size={22} /></button>
                        </div>

                        <form onSubmit={handleSubmit} className="media-form">
                            <div className="image-upload-section">
                                <label className="image-upload-label">
                                    <IconUpload size={22} />
                                    <span>Click to upload banner image</span>
                                    <small>Recommended: wide landscape image (e.g. 1200×400px)</small>
                                    <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
                                </label>
                                {imagePreview && (
                                    <div className="image-preview-wide">
                                        <img src={imagePreview} alt="Preview" />
                                        <button
                                            type="button"
                                            className="remove-image"
                                            onClick={() => { setImagePreview(null); setFormData({ ...formData, image: '' }); }}
                                        >
                                            <IconX size={16} />
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="Mediaform-group">
                                <label>Title (optional, internal reference)</label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    placeholder="e.g., Diwali Combo Offer"
                                />
                            </div>

                            <div className="Mediaform-group">
                                <label>Link to Category (optional)</label>
                                <select
                                    value={formData.linkedCategory}
                                    onChange={(e) => setFormData({ ...formData, linkedCategory: e.target.value })}
                                >
                                    <option value="">No link — decorative only</option>
                                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                                </select>
                                <small className="media-hint">Banner tap karne par customer menu is category pe jump ho jaayega</small>
                            </div>

                            <div className="form-row">
                                <div className="Mediaform-group">
                                    <label>Show From (optional)</label>
                                    <input
                                        type="date"
                                        value={formData.startDate}
                                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                    />
                                </div>
                                <div className="Mediaform-group">
                                    <label>Show Until (optional)</label>
                                    <input
                                        type="date"
                                        value={formData.endDate}
                                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="Mediaform-group checkbox">
                                <input
                                    type="checkbox"
                                    id="bannerActive"
                                    checked={formData.isActive}
                                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                />
                                <label htmlFor="bannerActive">Live (customer page pe abhi dikhna chahiye)</label>
                            </div>

                            <div className="modal-actions">
                                <button type="button" className="btn-secondary" onClick={closeModal}>Cancel</button>
                                <button type="submit" className="btn-primary" disabled={saving}>
                                    {saving ? 'Saving...' : showEditModal ? 'Update Banner' : 'Add Banner'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Media;