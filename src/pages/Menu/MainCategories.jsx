import React, { useState, useEffect } from 'react';
import {
    IconPlus, IconEdit, IconTrash, IconX, IconArrowUp, IconArrowDown,
    IconEye, IconEyeOff, IconSparkles, IconSearch, IconChevronLeft, IconChevronRight,
} from '@tabler/icons-react';
import toast from 'react-hot-toast';
import { mainCategoriesAPI } from '../../utils/api';
import { ICON_OPTIONS, resolveIcon } from '../../utils/mainCategoryIcons';
import './Menu.css';
import './MainCategories.css';

const DEFAULT_CATEGORIES = [
    { label: 'Veg', tag: 'Veg', icon: 'IconLeaf' },
    { label: 'Non-Veg', tag: 'Non-Veg', icon: 'IconMeat' },
    { label: 'Spicy', tag: 'Spicy', icon: 'IconFlame' },
    { label: 'Fast Food', tag: 'Fast Food', icon: 'IconBurger' },
    { label: 'Coffee', tag: 'Coffee', icon: 'IconCoffee' },
    { label: 'Shakes & Mojitos', tag: 'Shakes & Mojitos', icon: 'IconGlassCocktail' },
    { label: 'Ice Crusher', tag: 'Ice Crusher', icon: 'IconSnowflake' },
    { label: 'Desserts', tag: 'Desserts', icon: 'IconIceCream' },
];

const ITEMS_PER_PAGE = 6;

const MainCategories = () => {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [seeding, setSeeding] = useState(false);

    const [formData, setFormData] = useState({ label: '', tag: '', icon: 'IconTag', isActive: true });

    // ---------- Search & Pagination ----------
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        try {
            setLoading(true);
            const res = await mainCategoriesAPI.getAll();
            if (res.data.success) {
                setCategories(res.data.data.sort((a, b) => a.displayOrder - b.displayOrder));
            }
        } catch (error) {
            console.error('Error fetching main categories:', error);
            toast.error('Failed to load categories');
        } finally {
            setLoading(false);
        }
    };

    const openAddModal = () => {
        setEditingItem(null);
        setFormData({ label: '', tag: '', icon: 'IconTag', isActive: true });
        setShowModal(true);
    };

    const openEditModal = (cat) => {
        setEditingItem(cat);
        setFormData({ label: cat.label, tag: cat.tag, icon: cat.icon, isActive: cat.isActive });
        setShowModal(true);
    };

    // Label type karte hi tag auto-suggest ho jaye (customer side isi tag se match karta hai)
    const handleLabelChange = (label) => {
        setFormData(prev => ({
            ...prev,
            label,
            tag: editingItem ? prev.tag : label, // edit mode me tag ko auto-overwrite mat karo
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.label.trim() || !formData.tag.trim()) {
            toast.error('Naam bharna zaroori hai');
            return;
        }

        try {
            if (editingItem) {
                const res = await mainCategoriesAPI.update(editingItem._id, formData);
                if (res.data.success) {
                    toast.success('Category updated');
                    setCategories(prev => prev.map(c => c._id === editingItem._id ? res.data.data : c));
                }
            } else {
                const res = await mainCategoriesAPI.create(formData);
                if (res.data.success) {
                    toast.success('Category added');
                    setCategories(prev => [...prev, res.data.data]);
                }
            }
            setShowModal(false);
        } catch (error) {
            console.error('Error saving category:', error);
            toast.error(error.response?.data?.message || 'Failed to save category');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Ye category delete karni hai? Isse jude items menu me rahenge, bas landing screen se hat jayegi.')) return;
        try {
            const res = await mainCategoriesAPI.delete(id);
            if (res.data.success) {
                toast.success('Category deleted');
                setCategories(prev => prev.filter(c => c._id !== id));
            }
        } catch (error) {
            console.error('Error deleting category:', error);
            toast.error('Failed to delete category');
        }
    };

    const toggleActive = async (cat) => {
        try {
            const res = await mainCategoriesAPI.update(cat._id, { ...cat, isActive: !cat.isActive });
            if (res.data.success) {
                setCategories(prev => prev.map(c => c._id === cat._id ? res.data.data : c));
            }
        } catch (error) {
            toast.error('Failed to update status');
        }
    };

    const moveCategory = async (index, direction) => {
        const newIndex = index + direction;
        if (newIndex < 0 || newIndex >= categories.length) return;

        const reordered = [...categories];
        [reordered[index], reordered[newIndex]] = [reordered[newIndex], reordered[index]];
        setCategories(reordered);

        try {
            await mainCategoriesAPI.reorder(reordered.map(c => c._id));
        } catch (error) {
            toast.error('Failed to save order');
            fetchCategories(); // rollback
        }
    };

    // Naye restaurant ke liye ek-click me purani 8 default categories load kar do
    const loadDefaults = async () => {
        setSeeding(true);
        try {
            const existingTags = new Set(categories.map(c => c.tag));
            const toAdd = DEFAULT_CATEGORIES.filter(d => !existingTags.has(d.tag));

            if (toAdd.length === 0) {
                toast('Ye sab categories pehle se hain', { icon: 'ℹ️' });
                return;
            }

            const added = [];
            for (const cat of toAdd) {
                const res = await mainCategoriesAPI.create(cat);
                if (res.data.success) added.push(res.data.data);
            }
            setCategories(prev => [...prev, ...added]);
            toast.success(`${added.length} default categories add ho gayi`);
        } catch (error) {
            toast.error('Failed to load defaults');
        } finally {
            setSeeding(false);
        }
    };

    // ---------- Search filtering ----------
    const isSearching = searchTerm.trim().length > 0;

    const filteredCategories = categories.filter(cat => {
        const q = searchTerm.trim().toLowerCase();
        if (!q) return true;
        return cat.label.toLowerCase().includes(q) || cat.tag.toLowerCase().includes(q);
    });

    // ---------- Pagination ----------
    const totalPages = Math.max(1, Math.ceil(filteredCategories.length / ITEMS_PER_PAGE));

    useEffect(() => {
        // search badalte hi pehle page pe wapas aa jao
        setCurrentPage(1);
    }, [searchTerm]);

    useEffect(() => {
        // agar current page ab exist hi nahi karta (item delete hone ke baad), to adjust karo
        if (currentPage > totalPages) setCurrentPage(totalPages);
    }, [totalPages, currentPage]);

    const paginatedCategories = filteredCategories.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    const goToPage = (page) => {
        if (page < 1 || page > totalPages) return;
        setCurrentPage(page);
    };

    return (
        <div className="main-categories-page">
            <div className="section-header">
                <div>
                    <h1>Main Categories</h1>
                    <p>These categories will be shown on the customer app's landing screen (Veg, Sweets, Cold Drink, etc.)</p>
                </div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {categories.length === 0 && (
                        <button className="btn-secondary" onClick={loadDefaults} disabled={seeding}>
                            <IconSparkles size={18} /> {seeding ? 'Adding...' : 'Load Default Categories'}
                        </button>
                    )}
                    <button className="btn-primary" onClick={openAddModal}>
                        <IconPlus size={18} /> Add Category
                    </button>
                </div>
            </div>

            {!loading && categories.length > 0 && (
                <div className="mc-search-bar">
                    <div className="mc-search-input-wrapper">
                        <IconSearch size={17} stroke={2} />
                        <input
                            type="text"
                            placeholder="Search by name or tag..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        {searchTerm && (
                            <button className="mc-search-clear" onClick={() => setSearchTerm('')} aria-label="Clear search">
                                <IconX size={15} />
                            </button>
                        )}
                    </div>
                    {isSearching && (
                        <span className="mc-search-result-count">
                            {filteredCategories.length} result{filteredCategories.length !== 1 ? 's' : ''}
                        </span>
                    )}
                </div>
            )}

            {loading ? (
                <div className="loading-state"><p>Loading...</p></div>
            ) : categories.length === 0 ? (
                <div className="empty-state">
                    <p>Abhi koi main category nahi banayi hai</p>
                    <p style={{ fontSize: '13px', color: 'var(--muted, #93816f)' }}>
                        Jab tak koi category nahi hogi, customer app pe default 8 categories dikhengi.
                    </p>
                    <button className="btn-primary" onClick={openAddModal}>
                        <IconPlus size={18} /> Pehli category add karein
                    </button>
                </div>
            ) : filteredCategories.length === 0 ? (
                <div className="empty-state">
                    <p>Koi category "{searchTerm}" se match nahi hui</p>
                    <button className="btn-secondary" onClick={() => setSearchTerm('')}>
                        Clear search
                    </button>
                </div>
            ) : (
                <>
                    <div className="main-categories-list">
                        {paginatedCategories.map((cat) => {
                            const idx = categories.findIndex(c => c._id === cat._id);
                            const Icon = resolveIcon(cat.icon);
                            return (
                                <div key={cat._id} className={`main-category-row ${!cat.isActive ? 'inactive' : ''}`}>
                                    <div className="reorder-btns">
                                        <button
                                            disabled={isSearching || idx === 0}
                                            onClick={() => moveCategory(idx, -1)}
                                            title={isSearching ? 'Reorder disabled while searching' : 'Move up'}
                                        >
                                            <IconArrowUp size={14} />
                                        </button>
                                        <button
                                            disabled={isSearching || idx === categories.length - 1}
                                            onClick={() => moveCategory(idx, 1)}
                                            title={isSearching ? 'Reorder disabled while searching' : 'Move down'}
                                        >
                                            <IconArrowDown size={14} />
                                        </button>
                                    </div>

                                    <span className="main-category-icon"><Icon size={22} stroke={1.8} /></span>

                                    <div className="main-category-info">
                                        <strong>{cat.label}</strong>
                                        <span className="main-category-tag">tag: {cat.tag}</span>
                                    </div>

                                    <div className="main-category-actions">
                                        <button className="action-btn" onClick={() => toggleActive(cat)} title={cat.isActive ? 'Hide from customers' : 'Show to customers'}>
                                            {cat.isActive ? <IconEye size={18} /> : <IconEyeOff size={18} />}
                                        </button>
                                        <button className="action-btn edit-btn" onClick={() => openEditModal(cat)} title="Edit">
                                            <IconEdit size={18} />
                                        </button>
                                        <button className="action-btn delete-btn" onClick={() => handleDelete(cat._id)} title="Delete">
                                            <IconTrash size={18} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {totalPages > 1 && (
                        <div className="mc-pagination">
                            <button
                                className="mc-page-btn"
                                onClick={() => goToPage(currentPage - 1)}
                                disabled={currentPage === 1}
                            >
                                <IconChevronLeft size={16} /> Prev
                            </button>

                            <div className="mc-page-numbers">
                                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                    <button
                                        key={page}
                                        className={`mc-page-number ${currentPage === page ? 'active' : ''}`}
                                        onClick={() => goToPage(page)}
                                    >
                                        {page}
                                    </button>
                                ))}
                            </div>

                            <button
                                className="mc-page-btn"
                                onClick={() => goToPage(currentPage + 1)}
                                disabled={currentPage === totalPages}
                            >
                                Next <IconChevronRight size={16} />
                            </button>
                        </div>
                    )}
                </>
            )}

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="main-category-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editingItem ? 'Edit Category' : 'Add Main Category'}</h2>
                            <button className="close-btn" onClick={() => setShowModal(false)}>
                                <IconX size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="main-category-form">
                            <div className="menu-form-group">
                                <label>Category Name *</label>
                                <input
                                    type="text"
                                    value={formData.label}
                                    onChange={(e) => handleLabelChange(e.target.value)}
                                    placeholder="e.g., Sweets, Cold Drink, Water Bottle"
                                    required
                                />
                            </div>

                            <div className="menu-form-group">
                                <label>Tag (dish add karte waqt yehi tag select hoga) *</label>
                                <input
                                    type="text"
                                    value={formData.tag}
                                    onChange={(e) => setFormData({ ...formData, tag: e.target.value })}
                                    placeholder="e.g., Sweets"
                                    required
                                />
                                <small>Ye har category ke liye unique hona chahiye</small>
                            </div>

                            <div className="menu-form-group">
                                <label>Icon</label>
                                <div className="icon-picker-grid">
                                    {ICON_OPTIONS.map(opt => (
                                        <button
                                            type="button"
                                            key={opt.key}
                                            className={`icon-picker-btn ${formData.icon === opt.key ? 'active' : ''}`}
                                            onClick={() => setFormData({ ...formData, icon: opt.key })}
                                            title={opt.label}
                                        >
                                            <opt.Icon size={20} stroke={1.8} />
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="menu-form-group checkbox">
                                <input
                                    type="checkbox"
                                    id="mc-active"
                                    checked={formData.isActive}
                                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                />
                                <label htmlFor="mc-active">Active (customer app pe dikhegi)</label>
                            </div>

                            <div className="modal-actions">
                                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn-primary">
                                    {editingItem ? 'Update' : 'Add'} Category
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MainCategories;