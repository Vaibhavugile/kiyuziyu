import React, { useState, useEffect } from 'react';
import {
  db,
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  storage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  getDoc,
  query,
  where,
} from '../firebase';
import CollectionCard from '../components/CollectionCard';
import ProductCard from '../components/ProductCard';
import OrderDetailsModal from '../components/OrderDetailsModal';
import './AdminPage.css';

// Low stock threshold constant
const LOW_STOCK_THRESHOLD = 10;

const AdminPage = () => {
  // State for Main Collections
  const [mainCollections, setMainCollections] = useState([]);
  const [mainCollectionName, setMainCollectionName] = useState('');
  const [mainCollectionImageFile, setMainCollectionImageFile] = useState(null);
  const [mainCollectionShowNumber, setMainCollectionShowNumber] = useState('');
  const [isMainCollectionLoading, setIsMainCollectionLoading] = useState(true);
  const [isMainCollectionUploading, setIsMainCollectionUploading] = useState(false);
  const [editingMainCollection, setEditingMainCollection] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);
  // State for Subcollections
  const [selectedMainCollectionId, setSelectedMainCollectionId] = useState('');
  const [subcollections, setSubcollections] = useState([]);
  const [subcollectionName, setSubcollectionName] = useState('');
  const [subcollectionDescription, setSubcollectionDescription] = useState('');
  const [subcollectionImageFile, setSubcollectionImageFile] = useState(null);
  const [subcollectionShowNumber, setSubcollectionShowNumber] = useState('');
  const [subcollectionPurchaseRate, setSubcollectionPurchaseRate] = useState('');
  const [isSubcollectionLoading, setIsSubcollectionLoading] = useState(false);
  const [isSubcollectionUploading, setIsSubcollectionUploading] = useState(false);
  const [editingSubcollection, setEditingSubcollection] = useState(null);
  const [subcollectionTieredPricing, setSubcollectionTieredPricing] = useState({
    retail: [],
    wholesale: [],
  });

  // State for Products
  const [selectedSubcollectionId, setSelectedSubcollectionId] = useState('');
  const [products, setProducts] = useState([]);
  const [productCode, setProductCode] = useState('');
  const [productQuantity, setProductQuantity] = useState('');
  const [editingProduct, setEditingProduct] = useState(null);
  const [isProductLoading, setIsProductLoading] = useState(false);
  const [isProductUploading, setIsProductUploading] = useState(false);
  const [showProductForm, setShowProductForm] = useState(false);
  const [selectedSubcollectionData, setSelectedSubcollectionData] = useState(null);

  // New state for multi-photo product upload
  const [newProducts, setNewProducts] = useState([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // New states for Orders and Low Stock Alerts
  const [activeTab, setActiveTab] = useState('collections');
  const [orders, setOrders] = useState([]);
  const [isOrderLoading, setIsOrderLoading] = useState(false);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [isLowStockLoading, setIsLowStockLoading] = useState(false);

  // States for modal display
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedLowStockProduct, setSelectedLowStockProduct] = useState(null);

  // New states for User Management
  const [users, setUsers] = useState([]);
  const [isUserLoading, setIsUserLoading] = useState(false);


  // Handlers for Tiered Pricing (now for Subcollections)
  const handleAddTier = (type) => {
    setSubcollectionTieredPricing((prevPricing) => ({
      ...prevPricing,
      [type]: [...prevPricing[type], { min_quantity: '', max_quantity: '', price: '' }],
    }));
  };

  const handleRemoveTier = (type, index) => {
    setSubcollectionTieredPricing((prevPricing) => ({
      ...prevPricing,
      [type]: prevPricing[type].filter((_, i) => i !== index),
    }));
  };

  const handleTierChange = (type, index, field, value) => {
    setSubcollectionTieredPricing((prevPricing) => {
      const updatedTiers = [...prevPricing[type]];
      updatedTiers[index] = { ...updatedTiers[index], [field]: value };
      return { ...prevPricing, [type]: updatedTiers };
    });
  };

  // --- Utility Functions ---
  const handleImageChange = (e, setImageFile) => {
    if (e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  };

  const uploadImageAndGetURL = async (imageFile) => {
    if (!imageFile) return null;
    const storageRef = ref(storage, `images/${Date.now()}-${imageFile.name}`);
    const snapshot = await uploadBytes(storageRef, imageFile);
    return await getDownloadURL(snapshot.ref);
  };

  const deleteImageFromStorage = async (imageUrl) => {
    if (!imageUrl) return;
    try {
      const imageRef = ref(storage, imageUrl);
      await deleteObject(imageRef);
    } catch (error) {
      console.error('Error deleting image from storage:', error);
    }
  };

  // --- Fetch Main Collections ---
  const fetchMainCollections = async () => {
    setIsMainCollectionLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'collections'));
      const fetched = querySnapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      }));
      setMainCollections(fetched.sort((a, b) => a.showNumber - b.showNumber));
    } catch (error) {
      console.error('Error fetching main collections:', error);
    }
    setIsMainCollectionLoading(false);
  };

  // --- Fetch Subcollections for Selected Main Collection ---
  const fetchSubcollections = async () => {
    if (!selectedMainCollectionId) {
      setSubcollections([]);
      return;
    }
    setIsSubcollectionLoading(true);
    try {
      const subcollectionRef = collection(db, 'collections', selectedMainCollectionId, 'subcollections');
      const querySnapshot = await getDocs(subcollectionRef);
      const fetched = querySnapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      }));
      setSubcollections(fetched.sort((a, b) => a.showNumber - b.showNumber));
    } catch (error) {
      console.error('Error fetching subcollections:', error);
    }
    setIsSubcollectionLoading(false);
  };

  // --- Fetch Products for Selected Subcollection ---
  const fetchProducts = async () => {
    if (!selectedMainCollectionId || !selectedSubcollectionId) {
      setProducts([]);
      setSelectedSubcollectionData(null);
      return;
    }
    setIsProductLoading(true);
    try {
      const subcollectionDocRef = doc(db, 'collections', selectedMainCollectionId, 'subcollections', selectedSubcollectionId);
      const subcollectionDocSnap = await getDoc(subcollectionDocRef);
      if (subcollectionDocSnap.exists()) {
        setSelectedSubcollectionData({ id: subcollectionDocSnap.id, ...subcollectionDocSnap.data() });
      } else {
        setSelectedSubcollectionData(null);
      }

      const productsRef = collection(db, 'collections', selectedMainCollectionId, 'subcollections', selectedSubcollectionId, 'products');
      const querySnapshot = await getDocs(productsRef);
      const fetched = querySnapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      }));
      setProducts(fetched);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
    setIsProductLoading(false);
  };

  // UseEffects to trigger data fetching on dependency changes
  useEffect(() => {
    fetchMainCollections();
  }, []);

  useEffect(() => {
    fetchSubcollections();
    setSelectedSubcollectionId('');
  }, [selectedMainCollectionId]);

  useEffect(() => {
    fetchProducts();
  }, [selectedSubcollectionId, selectedMainCollectionId]);

  // New: Fetches all orders
  useEffect(() => {
    const fetchOrders = async () => {
      if (activeTab === 'orders') {
        setIsOrderLoading(true);
        const ordersCollectionRef = collection(db, 'orders');
        const querySnapshot = await getDocs(ordersCollectionRef);
        const fetchedOrders = querySnapshot.docs.map((doc) => ({
          ...doc.data(),
          id: doc.id,
        }));
        setOrders(fetchedOrders);
        setIsOrderLoading(false);
      }
    };
    fetchOrders();
  }, [activeTab]);

  // New: Fetches low stock products
  useEffect(() => {
    const fetchLowStockProducts = async () => {
      if (activeTab === 'lowStock') {
        setIsLowStockLoading(true);
        const allLowStockProducts = [];

        // Loop through all main collections and subcollections to find products
        for (const mainCol of mainCollections) {
          const subcollectionRef = collection(db, "collections", mainCol.id, "subcollections");
          const subcollectionSnapshot = await getDocs(subcollectionRef);

          for (const subCol of subcollectionSnapshot.docs) {
            const productsRef = collection(db, "collections", mainCol.id, "subcollections", subCol.id, "products");
            // Use a query to filter for low stock items
            const q = query(productsRef, where("quantity", "<=", LOW_STOCK_THRESHOLD));
            const productsSnapshot = await getDocs(q);

            productsSnapshot.forEach(productDoc => {
                allLowStockProducts.push({
                    ...productDoc.data(),
                    id: productDoc.id,
                    mainCollectionName: mainCol.name,
                    subcollectionName: subCol.data().name,
                });
            });
          }
        }
        setLowStockProducts(allLowStockProducts);
        setIsLowStockLoading(false);
      }
    };
    fetchLowStockProducts();
  }, [activeTab, mainCollections]);
  
  // New: Fetches all users for admin management
  const fetchUsers = async () => {
    if (activeTab === 'users') {
      setIsUserLoading(true);
      try {
        const querySnapshot = await getDocs(collection(db, 'users'));
        const fetchedUsers = querySnapshot.docs.map((doc) => ({
          ...doc.data(),
          id: doc.id,
        }));
        setUsers(fetchedUsers);
      } catch (error) {
        console.error('Error fetching users:', error);
      }
      setIsUserLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [activeTab]);

  const handleDownloadLowStockImages = async () => {
    setIsDownloading(true);
    try {
        for (const product of lowStockProducts) {
            if (product.image) {
                const response = await fetch(product.image);
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = `low_stock_${product.productCode}.jpg`; // Customize filename
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            }
        }
    } catch (error) {
        console.error("Error downloading images:", error);
        alert("Failed to download one or more images.");
    } finally {
        setIsDownloading(false);
    }
};


  // New: Function to handle updating order status
  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, {
        status: newStatus,
      });
      setOrders(prevOrders => prevOrders.map(order => 
        order.id === orderId ? { ...order, status: newStatus } : order
      ));
      alert("Order status updated successfully!");
    } catch (error) {
      console.error("Error updating order status:", error);
      alert("Failed to update order status.");
    }
  };

  // New: Function to update a user's role
  const handleUpdateUserRole = async (userId, newRole) => {
    if (window.confirm(`Are you sure you want to change this user's role to '${newRole}'?`)) {
      try {
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, { role: newRole });
        fetchUsers(); // Refresh the user list
        alert('User role updated successfully!');
      } catch (error) {
        console.error('Error updating user role:', error);
        alert('Failed to update user role.');
      }
    }
  };

  // New: Function to delete a user
  const handleDeleteUser = async (userId) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        // You would typically use Firebase Admin SDK to delete the user from Authentication
        // For now, we'll just delete the document from Firestore.
        await deleteDoc(doc(db, 'users', userId));
        fetchUsers(); // Refresh the user list
        alert('User deleted successfully!');
      } catch (error) {
        console.error('Error deleting user:', error);
        alert('Failed to delete user.');
      }
    }
  };

  // --- Main Collection Handlers ---
  const handleAddMainCollection = async (e) => {
    e.preventDefault();
    if (!mainCollectionName || !mainCollectionImageFile || !mainCollectionShowNumber) {
      alert('Please fill out all fields.');
      return;
    }
    setIsMainCollectionUploading(true);
    try {
      const imageUrl = await uploadImageAndGetURL(mainCollectionImageFile);
      const newDoc = await addDoc(collection(db, 'collections'), {
        title: mainCollectionName,
        image: imageUrl,
        showNumber: parseInt(mainCollectionShowNumber),
      });
      console.log('Main Collection added with ID: ', newDoc.id);
      fetchMainCollections();
    } catch (error) {
      console.error('Error adding main collection:', error);
    }
    setIsMainCollectionUploading(false);
    resetMainCollectionForm();
  };

  const startEditMainCollection = (item) => {
    setEditingMainCollection(item);
    setMainCollectionName(item.title);
    setMainCollectionShowNumber(item.showNumber);
  };

  const handleUpdateMainCollection = async (e) => {
    e.preventDefault();
    if (!editingMainCollection) return;
    setIsMainCollectionUploading(true);
    let imageUrl = editingMainCollection.image;
    if (mainCollectionImageFile) {
      await deleteImageFromStorage(editingMainCollection.image);
      imageUrl = await uploadImageAndGetURL(mainCollectionImageFile);
    }
    try {
      const docRef = doc(db, 'collections', editingMainCollection.id);
      await updateDoc(docRef, {
        title: mainCollectionName,
        image: imageUrl,
        showNumber: parseInt(mainCollectionShowNumber),
      });
      console.log('Main Collection updated successfully');
      fetchMainCollections();
    } catch (error) {
      console.error('Error updating main collection:', error);
    }
    setIsMainCollectionUploading(false);
    resetMainCollectionForm();
  };

  const handleDeleteMainCollection = async (id, imageUrl) => {
    if (window.confirm('Are you sure you want to delete this main collection and all its subcollections and products?')) {
      try {
        await deleteImageFromStorage(imageUrl);
        await deleteDoc(doc(db, 'collections', id));
        fetchMainCollections();
      } catch (error) {
      }
    }
  };

  const resetMainCollectionForm = () => {
    setMainCollectionName('');
    setMainCollectionImageFile(null);
    setMainCollectionShowNumber('');
    setEditingMainCollection(null);
  };

  // --- Subcollection Handlers ---
  const handleAddSubcollection = async (e) => {
    e.preventDefault();
    if (!selectedMainCollectionId || !subcollectionName || !subcollectionPurchaseRate || !subcollectionImageFile || !subcollectionShowNumber || subcollectionTieredPricing.retail.length === 0 || subcollectionTieredPricing.wholesale.length === 0) {
      alert('Please fill out all fields and add at least one pricing tier for both retail and wholesale.');
      return;
    }
    setIsSubcollectionUploading(true);
    try {
      const imageUrl = await uploadImageAndGetURL(subcollectionImageFile);
      const subcollectionRef = collection(db, 'collections', selectedMainCollectionId, 'subcollections');
      const newDoc = await addDoc(subcollectionRef, {
        name: subcollectionName,
        description: subcollectionDescription,
        image: imageUrl,
        showNumber: parseInt(subcollectionShowNumber),
        purchaseRate: parseFloat(subcollectionPurchaseRate), // Add this line
        tieredPricing: subcollectionTieredPricing,
      });
      console.log('Subcollection added with ID: ', newDoc.id);
      fetchSubcollections();
    } catch (error) {
      console.error('Error adding subcollection:', error);
    }
    setIsSubcollectionUploading(false);
    resetSubcollectionForm();
  };

  const startEditSubcollection = (item) => {
    setEditingSubcollection(item);
    setSubcollectionName(item.name);
    setSubcollectionDescription(item.description);
    setSubcollectionShowNumber(item.showNumber);
    setSubcollectionPurchaseRate(item.purchaseRate || ''); // Add this line
    setSubcollectionTieredPricing(item.tieredPricing || { retail: [], wholesale: [] });
  };

  const handleUpdateSubcollection = async (e) => {
    e.preventDefault();
    if (!editingSubcollection) return;
    setIsSubcollectionUploading(true);
    let imageUrl = editingSubcollection.image;
    if (subcollectionImageFile) {
      await deleteImageFromStorage(editingSubcollection.image);
      imageUrl = await uploadImageAndGetURL(subcollectionImageFile);
    }
    try {
      const docRef = doc(db, 'collections', selectedMainCollectionId, 'subcollections', editingSubcollection.id);
      await updateDoc(docRef, {
        name: subcollectionName,
        description: subcollectionDescription,
        image: imageUrl,
        showNumber: parseInt(subcollectionShowNumber),
        purchaseRate: parseFloat(subcollectionPurchaseRate),
        tieredPricing: subcollectionTieredPricing,
      });
      console.log('Subcollection updated successfully');
      fetchSubcollections();
    } catch (error) {
      console.error('Error updating subcollection:', error);
    }
    setIsSubcollectionUploading(false);
    resetSubcollectionForm();
  };

  const handleDeleteSubcollection = async (id, imageUrl) => {
    if (window.confirm('Are you sure you want to delete this subcollection and all its products?')) {
      try {
        await deleteImageFromStorage(imageUrl);
        const docRef = doc(db, 'collections', selectedMainCollectionId, 'subcollections', id);
        await deleteDoc(docRef);
        fetchSubcollections();
      } catch (error) {
        console.error('Error deleting subcollection:', error);
      }
    }
  };

  const resetSubcollectionForm = () => {
    setSubcollectionName('');
    setSubcollectionDescription('');
    setSubcollectionImageFile(null);
    setSubcollectionShowNumber('');
    setSubcollectionTieredPricing({ retail: [], wholesale: [] });
    setEditingSubcollection(null);
    setSubcollectionPurchaseRate(''); // Add this line
  };

  // --- Product Handlers ---

  const handleProductImageChange = (e) => {
    const files = Array.from(e.target.files);
    const initialProducts = files.map((file) => ({
      productCode: '',
      quantity: '',
      imageFile: file,
      previewUrl: URL.createObjectURL(file),
    }));
    setNewProducts(initialProducts);
    setCurrentImageIndex(0);
    setShowProductForm(true);
  };

  const handleNextProduct = (e) => {
    e.preventDefault();
    if (!productCode || !productQuantity) {
      alert("Please fill out both product code and quantity.");
      return;
    }

    const updatedProducts = [...newProducts];
    updatedProducts[currentImageIndex].productCode = productCode;
    updatedProducts[currentImageIndex].quantity = Number(productQuantity);

    setNewProducts(updatedProducts);
    setProductCode('');
    setProductQuantity('');
    setCurrentImageIndex(currentImageIndex + 1);
  };

  const handleAddAllProducts = async (e) => {
    e.preventDefault();
    setIsProductUploading(true);

    // Save the last product's details
    const finalProducts = [...newProducts];
    if (currentImageIndex < finalProducts.length) {
      finalProducts[currentImageIndex].productCode = productCode;
      finalProducts[currentImageIndex].quantity = Number(productQuantity);
    }

    try {
      const productCollectionRef = collection(db, "collections", selectedMainCollectionId, "subcollections", selectedSubcollectionId, "products");
      const uploadPromises = finalProducts.map(async (product) => {
        const imageUrl = await uploadImageAndGetURL(product.imageFile);
        const productData = {
          productCode: product.productCode,
          quantity: product.quantity,
          image: imageUrl,
        };
        await addDoc(productCollectionRef, productData);
      });

      await Promise.all(uploadPromises);
      console.log("All products added successfully.");
      fetchProducts();
      resetProductForm();
    } catch (err) {
      console.error("Error adding products:", err);
      alert("Failed to save products.");
    } finally {
      setIsProductUploading(false);
    }
  };

  const startEditProduct = (product) => {
    setEditingProduct(product);
    setProductCode(product.productCode);
    setProductQuantity(product.quantity);
    setShowProductForm(true);
  };

  const handleUpdateProduct = async (e) => {
    e.preventDefault();
    setIsProductUploading(true);
    try {
      const productDocRef = doc(db, "collections", selectedMainCollectionId, "subcollections", selectedSubcollectionId, "products", editingProduct.id);
      const productData = {
        productCode: productCode,
        quantity: Number(productQuantity),
      };
      await updateDoc(productDocRef, productData);
      fetchProducts();
      resetProductForm();
    } catch (err) {
      console.error("Error updating product:", err);
      alert("Failed to update product data.");
    } finally {
      setIsProductUploading(false);
    }
  };

  const handleDeleteProduct = async (productId, imageUrl) => {
    if (window.confirm("Are you sure you want to delete this product?")) {
      try {
        if (imageUrl) {
          const imageRef = ref(storage, imageUrl);
          await deleteObject(imageRef);
        }
        const productDocRef = doc(db, "collections", selectedMainCollectionId, "subcollections", selectedSubcollectionId, "products", productId);
        await deleteDoc(productDocRef);
        fetchProducts();
      } catch (err) {
        console.error("Error deleting product:", err);
        alert("Failed to delete product.");
      }
    }
  };

  const resetProductForm = () => {
    setProductCode('');
    setProductQuantity('');
    setEditingProduct(null);
    setShowProductForm(false);
    setNewProducts([]);
    setCurrentImageIndex(0);
  };

  return (
    <div className="admin-page">
      <h1>Admin Dashboard</h1>
      <div className="admin-tabs">
        <button
          className={activeTab === 'collections' ? 'active' : ''}
          onClick={() => setActiveTab('collections')}
        >
          Collections & Products
        </button>
        <button
          className={activeTab === 'orders' ? 'active' : ''}
          onClick={() => setActiveTab('orders')}
        >
          Orders
        </button>
        <button
          className={activeTab === 'lowStock' ? 'active' : ''}
          onClick={() => setActiveTab('lowStock')}
        >
          Low Stock Alerts ({lowStockProducts.length})
        </button>
        <button
          className={activeTab === 'users' ? 'active' : ''}
          onClick={() => setActiveTab('users')}
        >
          User Management
        </button>
      </div>

      <div className="tab-content">
        {/* --- Collections & Products Tab --- */}
        {activeTab === 'collections' && (
          <div className="forms-container">
            {/* Main Collections Section */}
            <div className="admin-section">
              <h2>Main Collections</h2>
              <div className="forms-container">
                <form onSubmit={editingMainCollection ? handleUpdateMainCollection : handleAddMainCollection} className="add-collection-form">
                  <h3>{editingMainCollection ? 'Edit' : 'Add'} Main Collection</h3>
                  <div className="form-group">
                    <label>Name:</label>
                    <input
                      type="text"
                      value={mainCollectionName}
                      onChange={(e) => setMainCollectionName(e.target.value)}
                      placeholder="Main Collection Name"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Image:</label>
                    <input
                      type="file"
                      onChange={(e) => handleImageChange(e, setMainCollectionImageFile)}
                      required={!editingMainCollection}
                    />
                  </div>
                  <div className="form-group">
                    <label>Show Number:</label>
                    <input
                      type="number"
                      value={mainCollectionShowNumber}
                      onChange={(e) => setMainCollectionShowNumber(e.target.value)}
                      placeholder="Order (e.g., 1, 2)"
                      required
                    />
                  </div>
                  <button type="submit" disabled={isMainCollectionUploading}>
                    {isMainCollectionUploading ? 'Processing...' : editingMainCollection ? 'Update Collection' : 'Add Collection'}
                  </button>
                  {editingMainCollection && (
                    <button type="button" onClick={resetMainCollectionForm} className="cancel-button">
                      Cancel Edit
                    </button>
                  )}
                </form>
              </div>
              <div className="current-collections">
                <h3>Current Main Collections</h3>
                {isMainCollectionLoading ? (
                  <p>Loading collections...</p>
                ) : (
                  <div className="collections-grid">
                    {mainCollections.map((item) => (
                      <CollectionCard
                        key={item.id}
                        title={`${item.title} (#${item.showNumber})`}
                        image={item.image}
                      >
                        <div className="admin-actions">
                          <button onClick={() => {
                            setSelectedMainCollectionId(item.id);
                            setSelectedSubcollectionId('');
                          }}>Select</button>
                          <button onClick={() => startEditMainCollection(item)}>Edit</button>
                          <button onClick={() => handleDeleteMainCollection(item.id, item.image)}>Delete</button>
                        </div>
                      </CollectionCard>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Subcollections Section */}
            <div className="admin-section">
              <h2>Subcollections</h2>
              {selectedMainCollectionId ? (
                <>
                  <form onSubmit={editingSubcollection ? handleUpdateSubcollection : handleAddSubcollection} className="add-collection-form">
                    <h3>{editingSubcollection ? 'Edit' : 'Add'} Subcollection</h3>
                    <div className="form-group">
                      <label>Name:</label>
                      <input
                        type="text"
                        value={subcollectionName}
                        onChange={(e) => setSubcollectionName(e.target.value)}
                        placeholder="Subcollection Name"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Description:</label>
                      <input
                        type="text"
                        value={subcollectionDescription}
                        onChange={(e) => setSubcollectionDescription(e.target.value)}
                        placeholder="Description"
                      />
                    </div>
                    <div className="form-group">
                      <label>Purchase Rate:</label>
                      <input
                        type="number"
                        value={subcollectionPurchaseRate}
                        onChange={(e) => setSubcollectionPurchaseRate(e.target.value)}
                        placeholder="Purchase Rate (e.g., 50)"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Image:</label>
                      <input
                        type="file"
                        onChange={(e) => handleImageChange(e, setSubcollectionImageFile)}
                        required={!editingSubcollection}
                      />
                    </div>
                    <div className="form-group">
                      <label>Show Number:</label>
                      <input
                        type="number"
                        value={subcollectionShowNumber}
                        onChange={(e) => setSubcollectionShowNumber(e.target.value)}
                        placeholder="Order (e.g., 1, 2)"
                        required
                      />
                    </div>
                    {/* Tiered Pricing Sections */}
                    <div className="tiered-pricing-container">
                      {['retail', 'wholesale'].map(type => (
                        <div key={type} className="pricing-section">
                          <h4>{type.charAt(0).toUpperCase() + type.slice(1)} Pricing</h4>
                          {subcollectionTieredPricing[type].map((tier, index) => (
                            <div key={index} className="price-tier">
                              <input
                                type="number"
                                value={tier.min_quantity}
                                onChange={(e) => handleTierChange(type, index, 'min_quantity', e.target.value)}
                                placeholder="Min Qty"
                                required
                              />
                              <input
                                type="number"
                                value={tier.max_quantity}
                                onChange={(e) => handleTierChange(type, index, 'max_quantity', e.target.value)}
                                placeholder="Max Qty"

                              />
                              <input
                                type="number"
                                value={tier.price}
                                onChange={(e) => handleTierChange(type, index, 'price', e.target.value)}
                                placeholder="Price"
                                required
                              />
                              <button type="button" onClick={() => handleRemoveTier(type, index)} className="remove-tier-button">
                                -
                              </button>
                            </div>
                          ))}
                          <button type="button" onClick={() => handleAddTier(type)} className="add-tier-button">
                            + Add {type.charAt(0).toUpperCase() + type.slice(1)} Tier
                          </button>
                        </div>
                      ))}
                    </div>
                    <button type="submit" disabled={isSubcollectionUploading}>
                      {isSubcollectionUploading ? 'Processing...' : editingSubcollection ? 'Update Subcollection' : 'Add Subcollection'}
                    </button>
                    {editingSubcollection && (
                      <button type="button" onClick={resetSubcollectionForm} className="cancel-button">
                        Cancel Edit
                      </button>
                    )}
                  </form>
                  <div className="current-collections">
                    <h3>Current Subcollections</h3>
                    {isSubcollectionLoading ? (
                      <p>Loading subcollections...</p>
                    ) : (
                      <div className="collections-grid">
                        {subcollections.map((item) => (
                          <CollectionCard
                            key={item.id}
                            title={`${item.name} (#${item.showNumber})`}
                            description={item.description}
                            tieredPricing={item.tieredPricing}
                            image={item.image}
                          >
                            <div className="admin-actions">
                              <button onClick={() => {
                                setSelectedSubcollectionId(item.id);
                              }}>Select</button>
                              <button onClick={() => startEditSubcollection(item)}>Edit</button>
                              <button onClick={() => handleDeleteSubcollection(item.id, item.image)}>Delete</button>
                            </div>
                          </CollectionCard>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <p className="select-prompt">Please select a Main Collection to view/add Subcollections.</p>
              )}
            </div>

            {/* Products Section */}
            <div className="admin-section product-section">
              <h2>Products</h2>
              {selectedSubcollectionId && (
                <>
                  {/* Product Image Selection */}
                  {!showProductForm && (
                    <div className="image-select-form">
                      <h3>Select Product Images</h3>
                      <input
                        type="file"
                        multiple
                        onChange={handleProductImageChange}
                        accept="image/*"
                      />
                      <p className="instruction">Select one or more images to add new products.</p>
                    </div>
                  )}

                  {/* Multi-step product form */}
                  {showProductForm && newProducts.length > 0 && currentImageIndex < newProducts.length && (
                    <form onSubmit={handleNextProduct} className="add-product-form">
                      <h3>
                        Add Product {currentImageIndex + 1} of {newProducts.length}
                      </h3>
                      <div className="product-form-content">
                        <img src={newProducts[currentImageIndex].previewUrl} alt="Product Preview" className="product-preview-image" />
                        <div className="product-details-inputs">
                          <input
                            type="text"
                            value={productCode}
                            onChange={(e) => setProductCode(e.target.value)}
                            placeholder="Product Code"
                            required
                          />
                          <input
                            type="number"
                            value={productQuantity}
                            onChange={(e) => setProductQuantity(e.target.value)}
                            placeholder="Quantity"
                            required
                          />
                        </div>
                      </div>
                      <div className="form-actions">
                        <button type="submit" disabled={isProductUploading || !productCode || !productQuantity}>
                          Next
                        </button>
                        <button type="button" onClick={resetProductForm}>
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}

                  {/* "Submit All" form for final step */}
                  {showProductForm && currentImageIndex === newProducts.length && (
                    <form onSubmit={handleAddAllProducts} className="add-product-form">
                      <h3>Ready to Save Products?</h3>
                      <div className="summary-list">
                        {newProducts.map((product, index) => (
                          <div key={index} className="product-summary-item">
                            <img src={product.previewUrl} alt={`Product ${index + 1}`} className="product-preview-image" />
                            <span>{product.productCode} - Qty: {product.quantity}</span>
                          </div>
                        ))}
                      </div>
                      <div className="form-actions">
                        <button type="submit" className="submit-all-button" disabled={isProductUploading}>
                          {isProductUploading ? 'Uploading...' : 'Submit All Products'}
                        </button>
                        <button type="button" onClick={resetProductForm}>
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}
                </>
              )}

              {/* Display Products section remains the same */}
              {selectedSubcollectionId && (
                <div className="current-collections">
                  <h3>Products</h3>
                  {isProductLoading ? (
                    <p>Loading products...</p>
                  ) : products.length === 0 ? (
                    <p>No products found in this subcollection.</p>
                  ) : (
                    <div className="collections-grid">
                      {products.map((product) => (
                        <ProductCard
                          key={product.id}
                          productCode={product.productCode}
                          quantity={product.quantity}
                          image={product.image}
                        >
                          <div className="admin-actions">
                            <button onClick={() => startEditProduct(product)}>Edit</button>
                            <button onClick={() => handleDeleteProduct(product.id, product.image)}>Delete</button>
                          </div>
                        </ProductCard>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- Orders Tab --- */}
        {activeTab === 'orders' && (
          <div className="admin-section">
            <h2>Customer Orders</h2>
            {isOrderLoading ? (
              <p>Loading orders...</p>
            ) : orders.length === 0 ? (
              <p>No orders have been placed yet.</p>
            ) : (
              <ul className="orders-list">
                {orders.map((order) => (
                  <li key={order.id} onClick={() => setSelectedOrder(order)} className="order-list-item">
                    <p>Order ID: <strong>{order.id.substring(0, 8)}...</strong></p>
                    <p>Total: <strong>₹{order.totalAmount.toFixed(2)}</strong></p>
                    <p>Status: <span className={`order-status status-${order.status.toLowerCase()}`}>{order.status}</span></p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        
        {/* Render Order Details Modal */}
        {selectedOrder && (
          <OrderDetailsModal
            order={selectedOrder}
            onClose={() => setSelectedOrder(null)}
            onUpdateStatus={handleUpdateOrderStatus}
          />
        )}

        {/* --- Low Stock Alerts Tab --- */}
       {activeTab === 'lowStock' && (
    <div className="admin-section">
        <h2>Low Stock Alerts</h2>
        <button
            onClick={handleDownloadLowStockImages}
            disabled={isLowStockLoading || isDownloading || lowStockProducts.length === 0}
            className="download-button"
        >
            {isDownloading ? 'Downloading...' : 'Download All Low Stock Images'}
        </button>
        {isLowStockLoading ? (
            <p>Checking inventory...</p>
        ) : lowStockProducts.length === 0 ? (
            <p>All products are in stock. No alerts to show.</p>
        ) : (
            <ul className="low-stock-list">
                {lowStockProducts.map((product) => (
                    <li key={product.id} className="low-stock-list-item">
                        <p>Product Code: <strong>{product.productCode}</strong></p>
                        <p>Current Stock: <span className="low-stock-count">{product.quantity}</span></p>
                        <p>Location: {product.mainCollectionName} / {product.subcollectionName}</p>
                    </li>
                ))}
            </ul>
        )}
    </div>
)}

        {/* --- User Management Tab --- */}
        {activeTab === 'users' && (
          <div className="admin-section">
            <h2>User Management</h2>
            {isUserLoading ? (
              <p>Loading users...</p>
            ) : users.length === 0 ? (
              <p>No users found.</p>
            ) : (
              <ul className="user-list">
                {users.map((user) => (
                  <li key={user.id} className="user-list-item">
                    {Object.entries(user).map(([key, value]) => {
                      if (key === 'id') return null; // Don't show the user ID in the list
                      return (
                        <p key={key}>
                          <strong>{key}:</strong> {String(value)}
                        </p>
                      );
                    })}
                    <div className="user-actions">
                      {user.role === 'retailer' && (
                        <button onClick={() => handleUpdateUserRole(user.id, 'wholesaler')}>
                          Change to Wholesaler
                        </button>
                      )}
                      {user.role === 'wholesaler' && (
                        <button onClick={() => handleUpdateUserRole(user.id, 'retailer')}>
                          Change to Retailer
                        </button>
                      )}
                      <button onClick={() => handleDeleteUser(user.id)} className="delete-user-button">
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPage;