import React, { useState, useEffect, useRef } from 'react';
import {
    IconPlus,
    IconEdit,
    IconTrash,
    IconSearch,
    IconDownload,
    IconStar,
    IconX,
    IconUpload,
    IconEye,
    IconEyeOff,
    IconPackage,
    IconPackageOff,
    IconFileSpreadsheet,
    IconLoader2,
    IconChevronLeft,
    IconChevronRight,
    IconFlame,
    IconFlameOff,
    IconToolsKitchen2,
    IconTags,
    IconPhoto,
    IconInfoCircle,
    IconSparkles,
} from '@tabler/icons-react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { menuAPI, mainCategoriesAPI } from '../../utils/api';
import './Menu.css';

// ---------- Excel helpers ----------

const normalizeRow = (row) => {
    const normalized = {};
    Object.keys(row).forEach((key) => {
        normalized[key.toString().trim().toLowerCase()] = row[key];
    });
    return normalized;
};

const pick = (row, keys, fallback = '') => {
    for (const k of keys) {
        const val = row[k];
        if (val !== undefined && val !== null && val.toString().trim() !== '') {
            return val;
        }
    }
    return fallback;
};

// "Yes/No", "True/False", "1/0" jaisi values ko boolean me convert karta hai.
const parseBool = (val, defaultVal = false) => {
    if (val === undefined || val === null || val.toString().trim() === '') return defaultVal;
    const s = val.toString().trim().toLowerCase();
    return ['yes', 'y', 'true', '1'].includes(s);
};

const MenuManagement = () => {
    const [menuItems, setMenuItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState('All');
    const [imagePreview, setImagePreview] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [mainCategories, setMainCategories] = useState([]);

    //  Excel import ke liye
    const [importing, setImporting] = useState(false);
    const fileInputRef = useRef(null);
    //  Pagination ke liye
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    //  Category filter auto-scroll ke liye
    const categoryFilterContainerRef = useRef(null);
    const filterBtnRefs = useRef({});

    //  AI description generate ke liye
    const [generatingDesc, setGeneratingDesc] = useState(false);

    const categories = ['All', ...new Set(menuItems.map(item => item.category).filter(Boolean))];

    const tags = ['Veg', 'Non-Veg', 'Spicy', 'Fast Food', 'Coffee', 'Shakes & Mojitos', 'Ice Crusher', 'Desserts'];

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        price: '',
        discountPrice: '',
        category: '',
        image: '',
        imagePublicId: null,
        quantity: '',
        isAvailable: true,
        isOutOfStock: false,
        isSpicyLevel: false,
        hasHalfFull: false,
        halfPrice: '',
        tags: [],
        preparationTime: '15',
        ingredients: '',
        allergens: '',
        isFeatured: false,
        customizations: [],
    });

    useEffect(() => {
        fetchMenuItems();
    }, []);

    useEffect(() => {
        mainCategoriesAPI.getAll().then(res => {
            if (res.data.success) setMainCategories(res.data.data);
        });
    }, []);

    // Search ya category filter badalte hi pehle page par wapas
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filterCategory, itemsPerPage]);

    // 👇 Active category filter button ko horizontally center karke scroll karo
    useEffect(() => {
        const container = categoryFilterContainerRef.current;
        const el = filterBtnRefs.current[filterCategory];
        if (!container || !el) return;

        const containerRect = container.getBoundingClientRect();
        const elRect = el.getBoundingClientRect();

        const offset = (elRect.left + elRect.width / 2) - (containerRect.left + containerRect.width / 2);

        container.scrollBy({ left: offset, behavior: 'smooth' });
    }, [filterCategory, categories.length]);

    const fetchMenuItems = async () => {
        try {
            setLoading(true);
            const response = await menuAPI.getAll();
            if (response.data.success) {
                setMenuItems(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching menu:', error);
            toast.error('Failed to load menu items');
        } finally {
            setLoading(false);
        }
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        try {
            // Pehle preview turant dikhado (local, fast)
            const reader = new FileReader();
            reader.onloadend = () => setImagePreview(reader.result);
            reader.readAsDataURL(file);

            // Cloudinary pe actual upload
            const uploadFormData = new FormData();
            uploadFormData.append('image', file);

            const response = await menuAPI.uploadImage(uploadFormData);
            console.log('upload response:', response.data);
            if (response.data.success) {
                setFormData(prev => ({
                    ...prev,
                    image: response.data.data.url,
                    imagePublicId: response.data.data.publicId,
                }));
                toast.success('Image uploaded');
            }
        } catch (error) {
            console.error(error);
            toast.error('Failed to upload image');
            setImagePreview(null);
        } finally {
            setUploading(false);
        }
    };

    //  AI se description generate karta hai — name, category aur tags ke basis par
    const handleGenerateDescription = async () => {
        if (!formData.name) {
            toast.error('Pehle item name daalein');
            return;
        }
        setGeneratingDesc(true);
        try {
            const response = await menuAPI.generateDescription({
                name: formData.name,
                category: formData.category,
                tags: formData.tags,
            });
            if (response.data.success) {
                setFormData(prev => ({ ...prev, description: response.data.data.description }));
                toast.success('Description generate ho gaya');
            }
        } catch (error) {
            console.error('Error generating description:', error);
            toast.error('AI se description generate nahi ho paya');
        } finally {
            setGeneratingDesc(false);
        }
    };

    const handleAddItem = async (e) => {
        e.preventDefault();
        if (uploading) {
            toast.error('Image abhi upload ho rahi hai, thoda wait karein');
            return;
        }
        if (!formData.name || !formData.price || !formData.category) {
            toast.error('Please fill all required fields');
            return;
        }
        if (formData.hasHalfFull && !formData.halfPrice) {
            toast.error('Please enter Half price');
            return;
        }

        try {
            const data = {
                name: formData.name,
                description: formData.description,
                price: parseFloat(formData.price),
                discountPrice: formData.discountPrice ? parseFloat(formData.discountPrice) : null,
                category: formData.category,
                image: formData.image,
                imagePublicId: formData.imagePublicId,
                quantity: formData.quantity ? parseInt(formData.quantity) : null,
                isAvailable: formData.isAvailable,
                isOutOfStock: formData.isOutOfStock,
                isSpicyLevel: formData.isSpicyLevel,
                hasHalfFull: formData.hasHalfFull,
                halfPrice: formData.hasHalfFull && formData.halfPrice ? parseFloat(formData.halfPrice) : null,
                tags: formData.tags,
                preparationTime: parseInt(formData.preparationTime),
                // rating LINE REMOVED — customer ratings se hi banega ab
                ingredients: formData.ingredients.split(',').map(i => i.trim()).filter(i => i),
                allergens: formData.allergens.split(',').map(a => a.trim()).filter(a => a),
                isFeatured: formData.isFeatured,
                customizations: formData.customizations,
            };

            const response = await menuAPI.create(data);
            if (response.data.success) {
                toast.success('Menu item added successfully');
                setMenuItems([...menuItems, response.data.data]);
                resetForm();
                setShowAddModal(false);
            }
        } catch (error) {
            console.error('Error adding item:', error);
            toast.error(error.response?.data?.message || 'Failed to add item');
        }
    };

    const handleUpdateItem = async (e) => {
        e.preventDefault();
        if (formData.hasHalfFull && !formData.halfPrice) {
            toast.error('Please enter Half price');
            return;
        }
        try {
            const data = {
                name: formData.name,
                description: formData.description,
                price: parseFloat(formData.price),
                discountPrice: formData.discountPrice ? parseFloat(formData.discountPrice) : null,
                category: formData.category,
                image: formData.image,
                imagePublicId: formData.imagePublicId,
                quantity: formData.quantity ? parseInt(formData.quantity) : null,
                isAvailable: formData.isAvailable,
                isOutOfStock: formData.isOutOfStock,
                isSpicyLevel: formData.isSpicyLevel,
                hasHalfFull: formData.hasHalfFull,
                halfPrice: formData.hasHalfFull && formData.halfPrice ? parseFloat(formData.halfPrice) : null,
                tags: formData.tags,
                preparationTime: parseInt(formData.preparationTime),
                // rating LINE REMOVED
                ingredients: formData.ingredients.split(',').map(i => i.trim()).filter(i => i),
                allergens: formData.allergens.split(',').map(a => a.trim()).filter(a => a),
                isFeatured: formData.isFeatured,
                customizations: formData.customizations,
            };

            const response = await menuAPI.update(selectedItem._id, data);
            if (response.data.success) {
                toast.success('Menu item updated successfully');
                setMenuItems(
                    menuItems.map(item => (item._id === selectedItem._id ? response.data.data : item))
                );
                resetForm();
                setShowEditModal(false);
            }
        } catch (error) {
            console.error('Error updating item:', error);
            toast.error('Failed to update item');
        }
    };

    const handleDeleteItem = async (itemId) => {
        if (!window.confirm('Are you sure you want to delete this item?')) return;

        try {
            const response = await menuAPI.delete(itemId);
            if (response.data.success) {
                toast.success('Menu item deleted');
                setMenuItems(menuItems.filter(item => item._id !== itemId));
            }
        } catch (error) {
            console.error('Error deleting item:', error);
            toast.error('Failed to delete item');
        }
    };


    const handleToggleAvailability = async (item) => {
        try {
            const response = await menuAPI.toggleAvailability(item._id, !item.isAvailable);
            if (response.data.success) {
                toast.success(response.data.message);
                setMenuItems(menuItems.map(i => (i._id === item._id ? response.data.data : i)));
            }
        } catch (error) {
            console.error('Error toggling availability:', error);
            toast.error('Failed to update availability');
        }
    };

    // 👇 Quick toggle — In Stock / Out of Stock (availability se independent)
    const handleToggleStock = async (item) => {
        try {
            const response = await menuAPI.toggleStock(item._id, !item.isOutOfStock);
            if (response.data.success) {
                toast.success(response.data.message);
                setMenuItems(menuItems.map(i => (i._id === item._id ? response.data.data : i)));
            }
        } catch (error) {
            console.error('Error toggling stock:', error);
            toast.error('Failed to update stock status');
        }
    };

    const handleToggleSpicyLevel = async (item) => {
        try {
            const response = await menuAPI.toggleSpicyLevel(item._id, !item.isSpicyLevel);
            if (response.data.success) {
                toast.success(response.data.message);
                setMenuItems(menuItems.map(i => (i._id === item._id ? response.data.data : i)));
            }
        } catch (error) {
            console.error('Error toggle Spicy Level:', error)
            toast.error('Failed to Update Spicy Level')
        }
    }


    const handleExcelFileSelect = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setImporting(true);
        try {
            const buffer = await file.arrayBuffer();
            const workbook = XLSX.read(buffer, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

            if (rows.length === 0) {
                toast.error('Excel file me koi data nahi mila');
                return;
            }

            let successCount = 0;
            let failCount = 0;
            const failedRows = [];
            const addedItems = [];

            for (let i = 0; i < rows.length; i++) {
                const row = normalizeRow(rows[i]);

                const name = pick(row, ['item name', 'name']);
                const priceRaw = pick(row, ['price']);

                // Name aur valid price zaroori hai, warna row skip
                if (!name || priceRaw === '' || isNaN(parseFloat(priceRaw))) {
                    failCount++;
                    failedRows.push(i + 2);
                    continue;
                }

                const discountRaw = pick(row, ['discount price', 'discountprice']);
                const quantityRaw = pick(row, ['quantity', 'stock', 'qty']);
                const tagsRaw = pick(row, ['tags']);
                const ingredientsRaw = pick(row, ['ingredients']);
                const allergensRaw = pick(row, ['allergens']);
                const halfPriceRaw = pick(row, ['half price', 'halfprice']);

                const data = {
                    name: name.toString().trim(),
                    description: pick(row, ['description']).toString(),
                    price: parseFloat(priceRaw),
                    discountPrice: discountRaw !== '' && !isNaN(parseFloat(discountRaw))
                        ? parseFloat(discountRaw)
                        : null,
                    category: pick(row, ['category'], '').toString(),
                    image: '',
                    quantity: quantityRaw !== '' && !isNaN(parseInt(quantityRaw))
                        ? parseInt(quantityRaw)
                        : null,
                    isAvailable: parseBool(pick(row, ['available', 'isavailable']), true),
                    isOutOfStock: parseBool(pick(row, ['out of stock', 'isoutofstock']), false),
                    isSpicyLevel: parseBool(pick(row, ['spicy', 'spicy off', 'isspicylevel']), false),
                    hasHalfFull: halfPriceRaw !== '' && !isNaN(parseFloat(halfPriceRaw)),
                    halfPrice: halfPriceRaw !== '' && !isNaN(parseFloat(halfPriceRaw))
                        ? parseFloat(halfPriceRaw)
                        : null,
                    tags: tagsRaw ? tagsRaw.toString().split(',').map(t => t.trim()).filter(t => t) : [],
                    preparationTime: parseInt(pick(row, ['preparation time', 'preparationtime'], '15')) || 15,
                    ingredients: ingredientsRaw ? ingredientsRaw.toString().split(',').map(i => i.trim()).filter(i => i) : [],
                    allergens: allergensRaw ? allergensRaw.toString().split(',').map(a => a.trim()).filter(a => a) : [],
                    isFeatured: parseBool(pick(row, ['featured', 'isfeatured']), false),
                    customizations: [],
                };

                try {
                    const response = await menuAPI.create(data);
                    if (response.data.success) {
                        successCount++;
                        addedItems.push(response.data.data);
                    } else {
                        failCount++;
                        failedRows.push(i + 2);
                    }
                } catch (err) {
                    failCount++;
                    failedRows.push(i + 2);
                }
            }



            if (addedItems.length > 0) {
                setMenuItems(prev => [...prev, ...addedItems]);
            }

            if (successCount > 0) {
                toast.success(`${successCount} item(s) menu me import ho gaye`);
            }
            if (failCount > 0) {
                toast.error(`${failCount} row(s) skip ho gaye (row: ${failedRows.join(', ')})`);
            }
        } catch (error) {
            console.error('Error importing excel:', error);
            toast.error('Excel file read nahi ho payi. Format check karke dobara try karein.');
        } finally {
            setImporting(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    // Sample template download — user ko pata chale ki columns kaunse chahiye
    const downloadMenuTemplate = () => {
        const sampleData = [
            {
                'Item Name': 'Chicken Biryani',
                'Category': 'Biriyani',
                'Description': 'Aromatic basmati rice cooked with tender chicken and spices',
                'Price': 250,
                'Discount Price': 220,
                'Half Price': 150,
                'Quantity': 50,
                'Available': 'Yes',
                'Out Of Stock': 'No',
                'Spicy': 'Yes',
                'Tags': 'Non-Veg Spicy',
                'Preparation Time': 20,
                'Rating': 4.5,
                'Ingredients': 'Chicken, Rice, Spices',
                'Allergens': '',
                'Featured': 'Yes',
            },
        ];
        const ws = XLSX.utils.json_to_sheet(sampleData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Menu Items');
        XLSX.writeFile(wb, 'menu_items_template.xlsx');
    };

    const handleEditClick = async (item) => {
        setSelectedItem(item);
        setFormData({
            name: item.name,
            description: item.description || '',
            price: item.price.toString(),
            discountPrice: item.discountPrice?.toString() || '',
            category: item.category,
            image: item.image || '',
            imagePublicId: item.imagePublicId || null,
            quantity: item.quantity?.toString() || '',
            isAvailable: item.isAvailable,
            isOutOfStock: item.isOutOfStock,
            isSpicyLevel: item.isSpicyLevel,
            hasHalfFull: item.hasHalfFull || false,
            halfPrice: item.halfPrice?.toString() || '',
            tags: item.tags || [],
            preparationTime: item.preparationTime?.toString() || '15',
            ingredients: item.ingredients?.join(', ') || '',
            allergens: item.allergens?.join(', ') || '',
            isFeatured: item.isFeatured,
            customizations: item.customizations || [],
        });
        setImagePreview(item.image || null);
        setShowEditModal(true);

        try {
            const response = await menuAPI.getById(item._id);
            if (response.data.success) {
                setSelectedItem(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching latest item details:', error);
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            description: '',
            price: '',
            discountPrice: '',
            category: '',
            image: '',
            imagePublicId: null,
            quantity: '',
            isAvailable: true,
            isOutOfStock: false,
            isSpicyLevel: false,
            hasHalfFull: false,
            halfPrice: '',
            tags: [],
            preparationTime: '15',
            rating: '0',
            ingredients: '',
            allergens: '',
            isFeatured: false,
            customizations: [],
        });
        setImagePreview(null);
        setSelectedItem(null);
    };

    const filteredItems = menuItems.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.description?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = filterCategory === 'All' || item.category === filterCategory;
        return matchesSearch && matchesCategory;
    });

    // 👇 Pagination slice
    const totalPages = Math.max(1, Math.ceil(filteredItems.length / itemsPerPage));
    const paginatedItems = filteredItems.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const goToPage = (page) => {
        setCurrentPage(Math.min(Math.max(1, page), totalPages));
    };

    const toggleTag = (tag) => {
        setFormData(prev => ({
            ...prev,
            tags: prev.tags.includes(tag)
                ? prev.tags.filter(t => t !== tag)
                : [...prev.tags, tag]
        }));
    };

    return (
        <div className="menu-management">
            {/* Header */}
            <div className="section-header">
                <div>
                    <h1>Menu Management</h1>
                    <p>Add, edit, and manage your restaurant menu items</p>
                </div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button className="btn-secondary" type="button" onClick={downloadMenuTemplate}>
                        <IconFileSpreadsheet size={18} /> Sample Template
                    </button>
                    <button
                        className="btn-secondary"
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={importing}
                    >
                        {importing ? <IconLoader2 size={18} /> : <IconUpload size={18} />}
                        {importing ? 'Importing...' : 'Import Excel'}
                    </button>
                    <input
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        ref={fileInputRef}
                        onChange={handleExcelFileSelect}
                        style={{ display: 'none' }}
                    />
                    <button className="btn-primary" onClick={() => { resetForm(); setShowAddModal(true); }}>
                        <IconPlus size={18} /> Add New Item
                    </button>
                </div>
            </div>

            {/* Search & Filter */}
            <div className="menu-controls">
                <div className="search-box">
                    <IconSearch size={20} />
                    <input
                        type="text"
                        placeholder="Search menu items..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="category-filter-scroll" ref={categoryFilterContainerRef}>
                    <div className="category-filter">
                        {categories.map(cat => (
                            <button
                                key={cat}
                                ref={(el) => { filterBtnRefs.current[cat] = el; }}
                                className={`filter-btn ${filterCategory === cat ? 'active' : ''}`}
                                onClick={() => setFilterCategory(cat)}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Menu Items Table */}
            {loading ? (
                <div className="loading-state">
                    <p>Loading menu items...</p>
                </div>
            ) : filteredItems.length === 0 ? (
                <div className="empty-state">
                    {/* <IconImage size={48} /> */}
                    <p>No menu items found</p>
                    <button className="btn-primary" onClick={() => { resetForm(); setShowAddModal(true); }}>
                        <IconPlus size={18} /> Add Your First Item
                    </button>
                </div>
            ) : (
                <div className="menu-table-wrapper">
                    <table className="menu-table">
                        <thead>
                            <tr>
                                <th>Item Name</th>
                                <th>Category</th>
                                <th>Price</th>
                                <th>Stock</th>
                                <th>Tags</th>
                                <th>Rating</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedItems.map(item => (
                                <tr key={item._id}>
                                    <td className="item-name">
                                        {item.image && (
                                            <img src={item.image} alt={item.name} className="item-thumb" />
                                        )}
                                        <div>
                                            <p className="name">{item.name}</p>
                                            {item.isCombo && item.comboItems?.length > 0 ? (
                                                <div className="combo-items-inline">
                                                    {item.comboItems.map((ci, i) => (
                                                        <span key={i} className="combo-chip">
                                                            {ci.quantity}× {ci.itemName}
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="desc">{item.description?.substring(0, 40)}...</p>
                                            )}
                                        </div>
                                    </td>
                                    <td>
                                        <span className="badge category-badge">{item.category}</span>
                                    </td>
                                    <td>
                                        <div className="price-cell">
                                            {item.isCombo && item.originalTotalPrice > item.price && (
                                                <span className="discount" style={{ textDecoration: 'line-through' }}>
                                                    ₹{item.originalTotalPrice}
                                                </span>
                                            )}
                                            <span className="price">₹{item.price}</span>
                                            {!item.isCombo && item.discountPrice && (
                                                <span className="discount">₹{item.discountPrice}</span>
                                            )}
                                            {item.hasHalfFull && item.halfPrice && (
                                                <span className="badge category-badge" style={{ marginLeft: 4 }}>
                                                    Half ₹{item.halfPrice}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            {item.isOutOfStock ? (
                                                <span
                                                    className="status-badge"
                                                    style={{ background: '#fff3cd', color: '#8a6d00', width: 'fit-content' }}
                                                >
                                                    ⚠ Out of Stock
                                                </span>
                                            ) : item.quantity ? (
                                                <span className={item.quantity > 10 ? 'stock-high' : item.quantity > 0 ? 'stock-medium' : 'stock-low'}>
                                                    {item.quantity} pcs
                                                </span>
                                            ) : (
                                                <span className="stock-unlimited">Unlimited</span>
                                            )}
                                        </div>
                                    </td>
                                    <td>
                                        <div className="tags-cell">
                                            {item.tags?.map(tag => (
                                                <span key={tag} className="tag-badge">{tag}</span>
                                            ))}
                                        </div>
                                    </td>
                                    <td>
                                        <div className="rating">
                                            <IconStar size={16} />
                                            <span>{item.rating > 0 ? item.rating.toFixed(1) : '—'}</span>
                                            {item.totalReviews > 0 && <small style={{ marginLeft: 4, color: '#888' }}>({item.totalReviews})</small>}
                                        </div>
                                    </td>
                                    <td>
                                        <span className={`status-badge ${item.isAvailable ? 'available' : 'unavailable'}`}>
                                            {item.isAvailable ? 'Available' : 'Unavailable'}
                                        </span>
                                        <span className={`status-badge ${item.isSpicyLevel ? 'available' : 'unavailable'}`}>
                                            {item.isSpicyLevel ? 'Spicy On' : 'Spicy Off'}
                                        </span>
                                    </td>
                                    <td className="actions">
                                        <button
                                            className="action-btn"
                                            onClick={() => handleToggleAvailability(item)}
                                            title={item.isAvailable ? 'Mark Unavailable' : 'Mark Available'}
                                        >
                                            {item.isAvailable ? <IconEye size={18} /> : <IconEyeOff size={18} />}
                                        </button>

                                        <button className='action-btn'
                                            onClick={() => handleToggleSpicyLevel(item)}
                                            title={item.isSpicyLevel ? 'Mark Spicy Off' : 'Mark Spicy On'}
                                        >
                                            {item.isSpicyLevel ? <IconFlame size={18} /> : <IconFlameOff size={18} />}

                                        </button>
                                        <button
                                            className="action-btn"
                                            onClick={() => handleToggleStock(item)}
                                            title={item.isOutOfStock ? 'Mark In Stock' : 'Mark Out of Stock'}
                                        >
                                            {item.isOutOfStock ? <IconPackageOff size={18} /> : <IconPackage size={18} />}
                                        </button>
                                        <button
                                            className="action-btn edit-btn"
                                            onClick={() => handleEditClick(item)}
                                            title="Edit"
                                        >
                                            <IconEdit size={18} />
                                        </button>
                                        <button
                                            className="action-btn delete-btn"
                                            onClick={() => handleDeleteItem(item._id)}
                                            title="Delete"
                                        >
                                            <IconTrash size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {totalPages > 1 && (
                        <div className="pagination-bar">
                            <div className="pagination-info">
                                Showing {(currentPage - 1) * itemsPerPage + 1}
                                –{Math.min(currentPage * itemsPerPage, filteredItems.length)} of {filteredItems.length} items
                            </div>

                            <div className="pagination-controls">
                                <button
                                    className="pagination-btn"
                                    onClick={() => goToPage(currentPage - 1)}
                                    disabled={currentPage === 1}
                                >
                                    <IconChevronLeft size={16} />
                                </button>

                                {Array.from({ length: totalPages }, (_, i) => i + 1)
                                    .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                                    .reduce((acc, p, idx, arr) => {
                                        if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...');
                                        acc.push(p);
                                        return acc;
                                    }, [])
                                    .map((p, idx) =>
                                        p === '...' ? (
                                            <span key={`dots-${idx}`} className="pagination-dots">…</span>
                                        ) : (
                                            <button
                                                key={p}
                                                className={`pagination-btn ${currentPage === p ? 'active' : ''}`}
                                                onClick={() => goToPage(p)}
                                            >
                                                {p}
                                            </button>
                                        )
                                    )}

                                <button
                                    className="pagination-btn"
                                    onClick={() => goToPage(currentPage + 1)}
                                    disabled={currentPage === totalPages}
                                >
                                    <IconChevronRight size={16} />
                                </button>
                            </div>

                            <select
                                className="pagination-page-size"
                                value={itemsPerPage}
                                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                            >
                                <option value={10}>10 / page</option>
                                <option value={25}>25 / page</option>
                                <option value={50}>50 / page</option>
                                <option value={100}>100 / page</option>
                            </select>
                        </div>
                    )}
                </div>
            )}

            {/* Add/Edit Modal */}
            {(showAddModal || showEditModal) && (
                <div className="modal-overlay" onClick={() => {
                    setShowAddModal(false);
                    setShowEditModal(false);
                    resetForm();
                }}>
                    <div className="menu-modal-content large-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <div className="modal-header-text">
                                <h2>{showEditModal ? 'Edit Menu Item' : 'Add New Menu Item'}</h2>
                                <p>{showEditModal ? 'Update the details of this dish' : 'Fill in the details to add a new dish to your menu'}</p>
                            </div>
                            <button
                                className="close-btn"
                                onClick={() => {
                                    setShowAddModal(false);
                                    setShowEditModal(false);
                                    resetForm();
                                }}
                            >
                                <IconX size={22} />
                            </button>
                        </div>

                        <form onSubmit={showEditModal ? handleUpdateItem : handleAddItem} className="menu-form">
                            {/* Basic Info Section */}
                            <div className="form-section">
                                <h3><IconToolsKitchen2 size={17} stroke={2} /> Basic Information</h3>

                                <div className="form-row">
                                    <div className="menu-form-group">
                                        <label>Item Name *</label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                            placeholder="e.g., Chicken Biryani"
                                            required
                                        />
                                    </div>

                                    <div className="menu-form-group">
                                        <label>Category *</label>
                                        <input
                                            type="text"
                                            list="category-suggestions"
                                            value={formData.category}
                                            onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                                            placeholder="e.g., Biryani, Roti, Dal, Rice"
                                            required
                                        />
                                        <datalist id="category-suggestions">
                                            {[...new Set(menuItems.map(item => item.category).filter(Boolean))].map(cat => (
                                                <option key={cat} value={cat} />
                                            ))}
                                        </datalist>
                                    </div>
                                </div>

                                <div className="menu-form-group">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <label>Description</label>
                                        <button
                                            type="button"
                                            className="btn-secondary ai-generate-btn"
                                            onClick={handleGenerateDescription}
                                            disabled={generatingDesc || !formData.name}
                                            title={!formData.name ? 'Pehle item name daalein' : 'AI se description generate karein'}
                                        >
                                            {generatingDesc ? (
                                                <IconLoader2 size={14} className="spin" />
                                            ) : (
                                                <IconSparkles size={14} />
                                            )}
                                            {generatingDesc ? ' Generating...' : ' Generate with AI'}
                                        </button>
                                    </div>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                        placeholder="Describe your item..."
                                        rows="3"
                                        maxLength="500"
                                    />
                                    <small>{formData.description.length}/500</small>
                                </div>
                            </div>

                            {/* Pricing Section */}
                            <div className="form-section">
                                <h3>💰 Pricing & Stock</h3>

                                <div className="form-row">
                                    <div className="menu-form-group">
                                        <label>Price *</label>
                                        <div className="input-with-prefix">
                                            <span className="prefix">₹</span>
                                            <input
                                                type="number"
                                                value={formData.price}
                                                onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                                                placeholder="250"
                                                min="0"
                                                step="0.01"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="menu-form-group">
                                        <label>Discount Price</label>
                                        <div className="input-with-prefix">
                                            <span className="prefix">₹</span>
                                            <input
                                                type="number"
                                                value={formData.discountPrice}
                                                onChange={(e) => setFormData(prev => ({ ...prev, discountPrice: e.target.value }))}
                                                placeholder="200"
                                                min="0"
                                                step="0.01"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="menu-form-group checkbox">
                                        <input
                                            type="checkbox"
                                            id="hasHalfFull"
                                            checked={formData.hasHalfFull}
                                            onChange={(e) => setFormData(prev => ({ ...prev, hasHalfFull: e.target.checked }))}
                                        />
                                        <label htmlFor="hasHalfFull">Half / Full Available</label>
                                    </div>
                                </div>

                                {formData.hasHalfFull && (
                                    <div className="menu-form-group">
                                        <label>Half Price *</label>
                                        <div className="input-with-prefix">
                                            <span className="prefix">₹</span>
                                            <input
                                                type="number"
                                                value={formData.halfPrice}
                                                onChange={(e) => setFormData(prev => ({ ...prev, halfPrice: e.target.value }))}
                                                placeholder="150"
                                                min="0"
                                                step="0.01"
                                                required={formData.hasHalfFull}
                                            />
                                        </div>
                                        <small>Full price upar wala "Price" field se hi aayega</small>
                                    </div>
                                )}

                                <div className="form-row">
                                    <div className="menu-form-group">
                                        <label>Quantity</label>
                                        <input
                                            type="number"
                                            value={formData.quantity}
                                            onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                                            placeholder="Leave empty for unlimited"
                                            min="0"
                                        />
                                    </div>

                                    <div className="menu-form-group">
                                        <label>Preparation Time (mins)</label>
                                        <input
                                            type="number"
                                            value={formData.preparationTime}
                                            onChange={(e) => setFormData(prev => ({ ...prev, preparationTime: e.target.value }))}
                                            min="1"
                                        />
                                    </div>
                                </div>

                                {/* Out of Stock checkbox */}
                                <div className="form-row">
                                    <div className="menu-form-group checkbox">
                                        <input
                                            type="checkbox"
                                            id="outOfStock"
                                            checked={formData.isOutOfStock}
                                            onChange={(e) => setFormData(prev => ({ ...prev, isOutOfStock: e.target.checked }))}
                                        />
                                        <label htmlFor="outOfStock">Out of Stock (temporarily)</label>
                                    </div>
                                </div>
                            </div>

                            {/* Image Section */}
                            <div className="form-section">
                                <h3><IconPhoto size={17} stroke={2} /> Image</h3>

                                <div className="image-upload-section">
                                    <label className="image-upload-label">
                                        <IconUpload size={24} />
                                        <span>Click to upload image</span>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleImageUpload}
                                            disabled={uploading}
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
                                                    setFormData(prev => ({ ...prev, image: '', imagePublicId: null }));
                                                }}
                                            >
                                                <IconX size={18} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Tags Section */}
                            <div className="form-section">
                                <h3><IconTags size={17} stroke={2} /> Tags & Features</h3>

                                <div className="tags-selection">
                                    {mainCategories.filter(c => c.isActive).map(cat => (
                                        <label key={cat.tag} className="tag-checkbox">
                                            <input
                                                type="checkbox"
                                                checked={formData.tags.includes(cat.tag)}
                                                onChange={() => toggleTag(cat.tag)}
                                            />
                                            <span>{cat.label}</span>
                                        </label>
                                    ))}
                                </div>

                                <div className="form-row">
                                    <div className="menu-form-group checkbox">
                                        <input
                                            type="checkbox"
                                            id="featured"
                                            checked={formData.isFeatured}
                                            onChange={(e) => setFormData(prev => ({ ...prev, isFeatured: e.target.checked }))}
                                        />
                                        <label htmlFor="featured">Featured Item</label>
                                    </div>

                                    <div className="menu-form-group checkbox">
                                        <input
                                            type="checkbox"
                                            id="available"
                                            checked={formData.isAvailable}
                                            onChange={(e) => setFormData(prev => ({ ...prev, isAvailable: e.target.checked }))}
                                        />
                                        <label htmlFor="available">Available</label>
                                    </div>
                                </div>
                            </div>

                            {/* Additional Info */}
                            <div className="form-section">
                                <h3><IconInfoCircle size={17} stroke={2} /> Additional Information</h3>

                                <div className="menu-form-group">
                                    <label>Ingredients (comma separated)</label>
                                    <input
                                        type="text"
                                        value={formData.ingredients}
                                        onChange={(e) => setFormData(prev => ({ ...prev, ingredients: e.target.value }))}
                                        placeholder="Chicken, Rice, Spices"
                                    />
                                </div>

                                <div className="menu-form-group">
                                    <label>Allergens (comma separated)</label>
                                    <input
                                        type="text"
                                        value={formData.allergens}
                                        onChange={(e) => setFormData(prev => ({ ...prev, allergens: e.target.value }))}
                                        placeholder="Nuts, Dairy, Gluten"
                                    />
                                </div>
                            </div>

                            {showEditModal && (
                                <div className="form-section">
                                    <h3><IconStar size={17} stroke={2} /> Customer Rating</h3>
                                    <div className="menu-form-group">
                                        <p style={{ margin: 0, color: '#666' }}>
                                            {selectedItem?.totalReviews > 0
                                                ? `⭐ ${selectedItem.rating?.toFixed(1)} average from ${selectedItem.totalReviews} customer rating(s)`
                                                : 'Abhi tak koi customer rating nahi aayi hai'}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Form Actions */}
                            <div className="modal-actions">
                                <button
                                    type="button"
                                    className="btn-secondary"
                                    onClick={() => {
                                        setShowAddModal(false);
                                        setShowEditModal(false);
                                        resetForm();
                                    }}
                                >
                                    Cancel
                                </button>
                                <button type="submit" className="btn-primary" disabled={uploading}>
                                    {uploading ? 'Uploading Image...' : (showEditModal ? 'Update Item' : 'Add Item')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MenuManagement;