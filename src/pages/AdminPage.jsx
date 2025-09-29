import React, { useState, useEffect, useRef } from 'react';
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
  serverTimestamp,
  writeBatch,

} from '../firebase';
import CollectionCard from '../components/CollectionCard';
import ProductCard from '../components/ProductCard';
import OrderDetailsModal from '../components/OrderDetailsModal';
import { getPriceForQuantity,getCartItemId} from '../components/CartContext';
import './AdminPage.css';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

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
  const [isCropping, setIsCropping] = useState(false);
  const [imageToCrop, setImageToCrop] = useState(null);
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
  const [productName, setProductName] = useState(''); // New state for product name
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
  const [additionalImages, setAdditionalImages] = useState([]);
  const [productVariations, setProductVariations] = useState([]);
  const [newVariation, setNewVariation] = useState({ color: '', size: '', quantity: '' });


  // New states for Orders and Low Stock Alerts
  const [activeTab, setActiveTab] = useState('collections');
  const [activeSubTab, setActiveSubTab] = useState('collections'); // New state for sub-tabs
  const [orders, setOrders] = useState([]);
  const [isOrderLoading, setIsOrderLoading] = useState(false);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [isLowStockLoading, setIsLowStockLoading] = useState(false);

  // States for modal display
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedLowStockProduct, setSelectedLowStockProduct] = useState(null);

  // NEW: States for order search and date filtering
  const [orderSearchTerm, setOrderSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // New states for User Management
  const [users, setUsers] = useState([]);
  const [isUserLoading, setIsUserLoading] = useState(false);

  // NEW: State for search and filter
  const [productSearchTerm, setProductSearchTerm] = useState('');
 const [groupedOrders, setGroupedOrders] = useState({});
 const [groupedOrdersFromFiltered, setGroupedOrdersFromFiltered] = useState({});

  const [orderReports, setOrderReports] = useState([]);
  const [paymentReports, setPaymentReports] = useState([]);
  const [isReportsLoading, setIsReportsLoading] = useState(false);
  const [productReports, setProductReports] = useState([]);


  // State for Offline Billing
  const [offlineCollections, setOfflineCollections] = useState([]);
  const [selectedOfflineCollectionId, setSelectedOfflineCollectionId] = useState('');
  const [offlineSubcollections, setOfflineSubcollections] = useState([]);
  const [selectedOfflineSubcollectionId, setSelectedOfflineSubcollectionId] = useState('');
  const [offlineProducts, setOfflineProducts] = useState([]);
  const [offlineCart, setOfflineCart] = useState({});
  const [offlinePricingType, setOfflinePricingType] = useState('retail'); // 'retail' or 'wholesaler'
  const [subcollectionsMap, setSubcollectionsMap] = useState({});
  const [isOfflineProductsLoading, setIsOfflineProductsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  // Add this line to your other useState declarations
  const [editedTotal, setEditedTotal] = useState('');
  const [crop, setCrop] = useState();
  const [imageSrc, setImageSrc] = useState(null);
  const [completedCrop, setCompletedCrop] = useState(null);
  const imgRef = useRef(null);
const [sortedDateKeys, setSortedDateKeys] = useState([]);

  const formatOrderDate = (timestamp) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const orderDate = timestamp.toDate();
    
    // Normalize dates to remove time part for comparison
    const orderDay = new Date(orderDate.getFullYear(), orderDate.getMonth(), orderDate.getDate());
    const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const yesterdayDay = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());

    if (orderDay.getTime() === todayDay.getTime()) {
        return "Today";
    }
    if (orderDay.getTime() === yesterdayDay.getTime()) {
        return "Yesterday";
    }
    return orderDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
};

  // Handlers for Tiered Pricing (now for Subcollections)
  const handleAddTier = (type) => {
    setSubcollectionTieredPricing((prevPricing) => ({
      ...prevPricing,
      [type]: [...prevPricing[type], { min_quantity: '', max_quantity: '', price: '' }],
    }));
  };
  const onCropComplete = (crop) => {
    setCompletedCrop(crop);
  };


  const handleRemoveTier = (type, index) => {
    setSubcollectionTieredPricing((prevPricing) => ({
      ...prevPricing,
      [type]: prevPricing[type].filter((_, i) => i !== index),
    }));
  };


 const fetchOrders = async () => {
        try {
            const ordersSnapshot = await getDocs(collection(db, "orders"));
            const ordersList = ordersSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                // Ensure timestamps are handled correctly for sorting
                createdAt: doc.data().createdAt?.toDate() || new Date(),
            }));
            
            // Sort orders by creation date, descending
            ordersList.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
            
            // Group orders by formatted date
            const groups = ordersList.reduce((acc, order) => {
                const dateKey = formatOrderDate(order.createdAt);
                if (!acc[dateKey]) {
                    acc[dateKey] = [];
                }
                acc[dateKey].push(order);
                return acc;
            }, {});
            
            setGroupedOrders(groups);
            setOrders(ordersList);
        } catch (error) {
            console.error("Error fetching orders: ", error);
        }
    };

     useEffect(() => {
        const fetchData = async () => {
            await fetchMainCollections();
            await fetchSubcollections();
            await fetchProducts();
            await fetchOrders();
        };
        fetchData();
    }, []);
   
   const openOrderModal = (order) => {
        setSelectedOrder(order);
        setShowOrderModal(true);
    };

    const closeOrderModal = () => {
        setShowOrderModal(false);
        setSelectedOrder(null);
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

  const handleAdditionalImageChange = (e) => {
    const files = Array.from(e.target.files);
    setAdditionalImages(files.map(file => ({
      file,
      previewUrl: URL.createObjectURL(file),
    })));
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
  // NEW: Filtered orders based on search and date range
  // Updated: Filtered orders based on search, date, and now status
  const filteredOrders = orders.filter((order) => {
    // Search filter logic
    const searchTerm = orderSearchTerm.toLowerCase();
    const matchesSearch =
      order.id.toLowerCase().includes(searchTerm) ||
      (order.billingInfo?.fullName || '').toLowerCase().includes(searchTerm) ||
      (order.billingInfo?.email || '').toLowerCase().includes(searchTerm) ||
      (order.billingInfo?.phoneNumber || '').toLowerCase().includes(searchTerm);

    // Date filter logic
    const orderDate = order.createdAt?.toDate();
    const isAfterStartDate = startDate ? orderDate >= new Date(startDate) : true;
    const isBeforeEndDate = endDate ? orderDate <= new Date(endDate) : true;

    // NEW: Status filter logic
    const matchesStatus = statusFilter === 'All' || order.status === statusFilter;

    return matchesSearch && isAfterStartDate && isBeforeEndDate && matchesStatus;
  });
  useEffect(() => {
    const groups = filteredOrders.reduce((acc, order) => {
        const dateKey = formatOrderDate(order.createdAt);
        if (!acc[dateKey]) {
            acc[dateKey] = [];
        }
        acc[dateKey].push(order);
        return acc;
    }, {});
    setGroupedOrdersFromFiltered(groups);
}, [filteredOrders]);
useEffect(() => {
    // Sort the keys to ensure "Today", "Yesterday", and then other dates
    const keys = Object.keys(groupedOrdersFromFiltered);
    
    keys.sort((a, b) => {
        if (a === "Today") return -1;
        if (b === "Today") return 1;
        if (a === "Yesterday") return -1;
        if (b === "Yesterday") return 1;

        // For all other dates, sort in descending order
        return new Date(b) - new Date(a);
    });

    setSortedDateKeys(keys);
}, [groupedOrdersFromFiltered]);

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
  // useEffect(() => {
  //   if (activeTab === 'orders') {
  //     fetchOrders();
  //   }
  //   if (activeTab === 'users') {
  //     fetchUsers();
  //   }
  //   if (activeTab === 'collections') {
  //     fetchMainCollections();
  //   }
  //   if (activeTab === 'offline-billing') {
  //     fetchMainCollectionsForOffline();
  //   }
  // }, [activeTab]);
  useEffect(() => {
    if (selectedOfflineCollectionId) {
      fetchSubcollectionsForOffline(selectedOfflineCollectionId);
      setOfflineProducts([]); // Clear products when collection changes
      setSelectedOfflineSubcollectionId('');
    }
  }, [selectedOfflineCollectionId]);

  useEffect(() => {
    if (selectedOfflineSubcollectionId) {
      fetchOfflineProducts(selectedOfflineSubcollectionId);
    }
  }, [selectedOfflineSubcollectionId]);

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
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      const products = files.map(file => {
        return {
          productName: '',
          productCode: '',
          quantity: '',
          imageFile: file,
          previewUrl: URL.createObjectURL(file),
        };
      });
      setNewProducts(products);
      setCurrentImageIndex(0);
      setShowProductForm(true); // Directly show the form
    }
  };

  // Opens the cropper with the selected image
  const startCropping = (imageUrl) => {
    setImageToCrop(imageUrl);
    setCrop(undefined);
    setIsCropping(true);
  };

  // Handles the cropping action and updates the product in state
  const getCroppedImage = () => {
    if (!imgRef.current || !completedCrop) {
      return;
    }

    const image = imgRef.current;
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    canvas.width = completedCrop.width;
    canvas.height = completedCrop.height;
    const ctx = canvas.getContext('2d');

    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      completedCrop.width,
      completedCrop.height
    );

    canvas.toBlob((blob) => {
      const croppedFile = new File([blob], 'cropped-image.png', { type: 'image/png' });

      // Create a new array to update the state immutably
      const updatedProducts = [...newProducts];

      // Find the index of the product being edited or the current one being added
      const indexToUpdate = editingProduct ? newProducts.findIndex(p => p.id === editingProduct.id) : currentImageIndex;

      // Update the image file and preview URL for the correct product
      if (indexToUpdate !== -1) {
        updatedProducts[indexToUpdate] = {
          ...updatedProducts[indexToUpdate],
          imageFile: croppedFile,
          previewUrl: URL.createObjectURL(croppedFile),
        };
        setNewProducts(updatedProducts);
      }

      // Hide the cropper and return to the form
      setIsCropping(false);
      setImageToCrop(null);
      setCompletedCrop(null);
    }, 'image/png');
  };
  // Add this function to your component's logic
  const handleDeleteNewImage = (indexToDelete) => {
    // Create a new array without the image to be deleted
    const updatedNewProducts = newProducts.filter((_, index) => index !== indexToDelete);

    // If the deleted image was the last one, reset the form.
    if (updatedNewProducts.length === 0) {
      resetProductForm();
      setShowProductForm(false);
    } else {
      // Update the state with the new array
      setNewProducts(updatedNewProducts);
      // If we deleted an image and there are still images left,
      // we need to make sure the current index is valid.
      // If the last image was deleted, the index should be adjusted.
      if (currentImageIndex >= updatedNewProducts.length) {
        setCurrentImageIndex(updatedNewProducts.length - 1);
      }
    }
  };

  // Handler for new variation input
  const handleNewVariationChange = (e) => {
    const { name, value } = e.target;
    setNewVariation(prev => ({ ...prev, [name]: value }));
  };

  // Handler for adding a variation to the list
  const handleAddVariation = () => {
    // Ensure at least one field has data before adding
    if (newVariation.color || newVariation.size || newVariation.quantity) {
      setProductVariations(prev => [...prev, newVariation]);
      setNewVariation({ color: '', size: '', quantity: '' }); // Reset the input fields
    }
  };

  // Handler for removing a variation
  const handleRemoveVariation = (indexToRemove) => {
    setProductVariations(prev => prev.filter((_, index) => index !== indexToRemove));
  };
  const handleNextProduct = (e) => {
  e.preventDefault();
  
  // Check for product name and code
  if (!productName || !productCode) {
    alert("Please fill out product name and product code.");
    return;
  }

  // Check if either a single quantity or at least one variation has been added
  if (productVariations.length === 0 && productQuantity === '') {
      alert("Please enter a quantity or add at least one variation.");
      return;
  }
  
  const updatedProducts = [...newProducts];
  
  // Create an array of images including the main one and any additional uploads
  const images = [{
    file: updatedProducts[currentImageIndex].imageFile,
    previewUrl: updatedProducts[currentImageIndex].previewUrl,
  }, ...additionalImages];

  updatedProducts[currentImageIndex].productName = productName;
  updatedProducts[currentImageIndex].productCode = productCode;
  
  // Store either the single quantity or the variations
  if (productVariations.length > 0) {
      updatedProducts[currentImageIndex].variations = productVariations;
  } else {
      updatedProducts[currentImageIndex].quantity = Number(productQuantity);
  }
  
  updatedProducts[currentImageIndex].images = images; // Save the array of images
  
  setNewProducts(updatedProducts);
  
  // Reset fields for the next product
  setProductName(''); 
  setProductCode('');
  setProductQuantity('');
  setAdditionalImages([]); 
  
  // Reset the variation-specific states
  setProductVariations([]);
  setNewVariation({ color: '', size: '', quantity: '' });

  setCurrentImageIndex(currentImageIndex + 1);
};
const handleAddAllProducts = async (e) => {
    e.preventDefault();
    setIsProductUploading(true);

    try {
        const productCollectionRef = collection(db, "collections", selectedMainCollectionId, "subcollections", selectedSubcollectionId, "products");

        // Use a batch write for efficiency when saving multiple documents
        const batch = writeBatch(db);

        // Iterate over the `newProducts` array, which holds all the product data
        for (const product of newProducts) {
            // Check if product has necessary details before trying to save
            if (!product.productName || !product.productCode) {
                console.error("Skipping product with missing name or code:", product);
                continue; // Move to the next product if this one is incomplete
            }

            // Step 1: Upload the main product image for the current product in the loop
            let mainImageUrl = '';
            // Make sure the image is available for the current product
            const mainImageFile = product.images.length > 0 ? product.images[0].file : null;
            
            if (mainImageFile) {
                mainImageUrl = await uploadImageAndGetURL(mainImageFile);
            }

            // Step 2: Prepare the variations array
            // Check if the `variations` property exists on the product object
            const finalVariations = product.variations
                ? product.variations.map(v => ({ color: v.color, size: v.size, quantity: Number(v.quantity) }))
                : [{ color: '', size: '', quantity: Number(product.quantity) }];

            // Calculate the total quantity from the final variations array
            const totalQuantity = finalVariations.reduce((sum, v) => sum + v.quantity, 0);

            // Step 3: Prepare the data object for the current product
            const productData = {
                productName: product.productName,
                productCode: product.productCode,
                quantity: totalQuantity,
                image: mainImageUrl,
                variations: finalVariations,
                mainCollection: selectedMainCollectionId,
                timestamp: serverTimestamp(),
            };
            
            console.log("Saving the following product data:", productData);

            // Add the new document to the batch
            const newDocRef = doc(productCollectionRef);
            batch.set(newDocRef, productData);
        }

        // Commit the batch to save all products at once
        await batch.commit();

        console.log("All products added successfully.");
        alert("All products added successfully!");
        fetchProducts();
        resetProductForm();
        setNewProducts([]); // Reset the array after a successful upload
        setProductVariations([]);
        setNewVariation({ color: '', size: '', quantity: '' });
    } catch (err) {
        console.error("Error adding all products:", err);
        alert("Failed to save products.");
    } finally {
        setIsProductUploading(false);
    }
};

const startEditProduct = (product) => {
  console.log("Starting edit for product:", product);
  setEditingProduct(product);
  setProductName(product.productName);
  setProductCode(product.productCode);
  setProductQuantity(product.quantity);
  // Set images for editing, using an empty array if product.images is undefined
  setAdditionalImages((product.images || []).map(url => ({ previewUrl: url })));
  setShowProductForm(true);
};
  const handleUpdateProduct = async (e) => {
    e.preventDefault();
    setIsProductUploading(true);
    try {
      const productDocRef = doc(db, "collections", selectedMainCollectionId, "subcollections", selectedSubcollectionId, "products", editingProduct.id);

      // Filter out existing images from new uploads to avoid re-uploading
      const newImagesToUpload = additionalImages.filter(img => img.file);
      const uploadedUrls = await Promise.all(
        newImagesToUpload.map(img => uploadImageAndGetURL(img.file))
      );

      // Combine existing image URLs with the new ones
      const existingUrls = additionalImages.filter(img => !img.file).map(img => img.previewUrl);
      const allImageUrls = [...existingUrls, ...uploadedUrls];

      const productData = {
        productName: productName,
        productCode: productCode,
        quantity: Number(productQuantity),
        images: allImageUrls,
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


  // NEW: useEffect to fetch reports data
  useEffect(() => {
    const fetchReports = async () => {
      if (activeTab === 'reports') {
        setIsReportsLoading(true);
        try {
          const ordersRef = collection(db, 'orders');
          const ordersSnapshot = await getDocs(ordersRef);
          const ordersData = ordersSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate().toLocaleDateString(),
          }));

          setOrderReports(ordersData);

          const paymentsData = ordersData.map(order => ({
            orderId: order.id,
            totalAmount: order.totalAmount,
            paymentMethod: order.paymentMethod || 'N/A',
            status: order.status,
            date: order.createdAt,
          }));

          setPaymentReports(paymentsData);

          // Fetch all products to generate the product report
          const productsRef = collection(db, 'products');
          const productsSnapshot = await getDocs(productsRef);
          const allProducts = productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

          const productSales = {};
          ordersData.forEach(order => {
            order.items.forEach(item => {
              if (!productSales[item.productCode]) {
                productSales[item.productCode] = { quantity: 0, revenue: 0 };
              }
              productSales[item.productCode].quantity += item.quantity;
              productSales[item.productCode].revenue += item.quantity * item.price;
            });
          });

          const reports = allProducts.map(product => ({
            productName: product.productName,
            productCode: product.productCode,
            quantityInStock: product.quantity,
            totalSales: productSales[product.productCode]?.quantity || 0,
            totalRevenue: productSales[product.productCode]?.revenue || 0,
          }));

          setProductReports(reports);

        } catch (error) {
          console.error("Error fetching reports:", error);
        }
        setIsReportsLoading(false);
      }
    };
    fetchReports();
  }, [activeTab]);

  const resetProductForm = () => {
    setProductName(''); // Reset new field
    setProductCode('');
    setProductQuantity('');
    setEditingProduct(null);
    setShowProductForm(false);
    setNewProducts([]);
    setCurrentImageIndex(0);
  };

  // NEW: Filter products based on search term
  const filteredProducts = products.filter(product => {
    const searchTerm = productSearchTerm.toLowerCase();
    const productNameMatch = (product.productName || '').toLowerCase().includes(searchTerm);
    const productCodeMatch = (product.productCode || '').toLowerCase().includes(searchTerm);
    return productNameMatch || productCodeMatch;
  });
  const fetchMainCollectionsForOffline = async () => {
    setIsOfflineProductsLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'collections'));
      const fetchedCollections = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setMainCollections(fetchedCollections);
    } catch (error) {
      console.error('Error fetching main collections for offline billing:', error);
    }
    setIsOfflineProductsLoading(false);
  };

  // 🔑 IMPORTANT: Use the actual deployed URL you provided
const FIREBASE_CANCEL_ORDER_URL = "https://us-central1-jewellerywholesale-2e57c.cloudfunctions.net/cancelOrder"; 

// Add this function inside your AdminPage component, next to handleUpdateOrderStatus
const handleCancelOrder = async (orderId) => {
    if (!window.confirm(`Are you sure you want to cancel Order ID: ${orderId}? This action will reverse stock quantities.`)) {
        return;
    }

    // Assuming you have a loading state to prevent double-clicks
    // setIsProcessing(true);

    try {
        const response = await fetch(FIREBASE_CANCEL_ORDER_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ orderId: orderId }),
        });

        const result = await response.json();

        if (response.ok) {
            alert(result.message);
            // 🔄 Crucial: Reload the orders list to reflect the status change and stock reversal
            // You must call your main data fetching function here (e.g., fetchOrders)
            // Example:
            // if (typeof fetchOrders === 'function') {
            //     fetchOrders(); 
            // }
            
            // For now, let's just close the modal and trust the next refresh cycle
            setSelectedOrder(null); 
            
        } else {
            alert(`Cancellation Failed: ${result.error || 'An unknown error occurred.'}`);
        }
    } catch (error) {
        console.error("Error cancelling order:", error);
        alert("Network error. Could not connect to the cancellation service.");
    } 
    // finally {
    //    // setIsProcessing(false); 
    // }
};




  const recalculateOfflineCartPrices = (currentCart) => {
    const newCart = { ...currentCart };
    const pricingGroups = {};

    // Group products in the cart by their unique pricing ID
    for (const productId in newCart) {
      const item = newCart[productId];
      // This is the correct way to get the pricing tiers from the subcollection
      const itemPricingTiers = item.tieredPricing?.[offlinePricingType];
      const pricingId = JSON.stringify(itemPricingTiers);

      if (!pricingGroups[pricingId]) {
        pricingGroups[pricingId] = [];
      }
      pricingGroups[pricingId].push(item);
    }

    // Recalculate and update the price for each group
    for (const pricingId in pricingGroups) {
      const groupItems = pricingGroups[pricingId];
      const totalGroupQuantity = groupItems.reduce((total, item) => total + item.quantity, 0);
      const tiers = groupItems[0].tieredPricing?.[offlinePricingType];
      const groupPrice = getPriceForQuantity(tiers, totalGroupQuantity);

      groupItems.forEach(item => {
        newCart[item.id].price = groupPrice;
      });
    }
    return newCart;
  };

  const fetchSubcollectionsForOffline = async (mainCollectionId) => {
    setIsOfflineProductsLoading(true);
    try {
      const subcollectionsRef = collection(db, 'collections', mainCollectionId, 'subcollections');
      const querySnapshot = await getDocs(subcollectionsRef);
      const fetchedSubcollections = [];
      const newSubcollectionsMap = {};

      querySnapshot.docs.forEach(doc => {
        const data = { id: doc.id, ...doc.data() };
        fetchedSubcollections.push(data);
        newSubcollectionsMap[doc.id] = data;
      });

      setOfflineSubcollections(fetchedSubcollections);
      setSubcollectionsMap(newSubcollectionsMap);
    } catch (error) {
      console.error('Error fetching subcollections for offline billing:', error);
    } finally {
      setIsOfflineProductsLoading(false);
    }
  };

  const fetchOfflineProducts = async () => {
    if (selectedOfflineCollectionId && selectedOfflineSubcollectionId && Object.keys(subcollectionsMap).length > 0) {
      setIsOfflineProductsLoading(true);
      try {
        const q = query(
          collection(db, 'collections', selectedOfflineCollectionId, 'subcollections', selectedOfflineSubcollectionId, 'products')
        );
        const querySnapshot = await getDocs(q);
        const products = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          // IMPORTANT: Attach the subcollection's tiered pricing data to the product object
          tieredPricing: subcollectionsMap[selectedOfflineSubcollectionId]?.tieredPricing,
          subcollectionId: selectedOfflineSubcollectionId,
          collectionId: selectedOfflineCollectionId,
        }));
        setOfflineProducts(products);
      } catch (error) {
        console.error('Error fetching offline products:', error);
      } finally {
        setIsOfflineProductsLoading(false);
      }
    }
  };

 const handleOfflineAddToCart = (product, quantity) => {
  setOfflineCart(prevCart => {
      // Use the new getCartItemId to create a unique ID for the product and its variation
      const cartItemId = getCartItemId(product);
      const currentQuantity = prevCart[cartItemId]?.quantity || 0;
      const newCart = {
          ...prevCart,
          [cartItemId]: {
              ...product,
              quantity: currentQuantity + quantity,
          },
      };
      return newCart;
  });
};

  const handleOfflineRemoveFromCart = (cartItemId) => {
    setOfflineCart(prevCart => {
        const newCart = { ...prevCart };
        const newQuantity = (newCart[cartItemId]?.quantity || 0) - 1;
        if (newQuantity <= 0) {
            delete newCart[cartItemId];
        } else {
            newCart[cartItemId].quantity = newQuantity;
        }
        return newCart;
    });
};

  const getOfflineCartTotal = () => {
    return Object.values(offlineCart).reduce((total, item) => total + (item.price * item.quantity), 0);
  };
  const handleFinalizeSale = async () => {
    if (Object.keys(offlineCart).length === 0) {
      alert('The cart is empty. Please add products to finalize the sale.');
      return;
    }

    if (window.confirm('Are you sure you want to finalize this offline sale?')) {
      try {
        // Determine the final total amount based on the edited input or the calculated total
        const finalTotal = editedTotal !== '' ? parseFloat(editedTotal) : getOfflineCartTotal();

        const orderData = {
          userId: 'offline-sale',
          status: 'Delivered',
          createdAt: serverTimestamp(),
          items: Object.values(offlineCart).map(item => ({
            productId: item.id || 'N/A',
            productName: item.productName || 'N/A',
            productCode: item.productCode || 'N/A',
            quantity: item.quantity || 0,
            price: typeof item.price === 'number' ? item.price : 0,
            image: item.image || '',
          })),
          totalAmount: typeof finalTotal === 'number' ? finalTotal : 0,
          subtotal: typeof finalTotal === 'number' ? finalTotal : 0,
          shippingFee: 0,
        };

        await addDoc(collection(db, 'orders'), orderData);
        console.log('Order added to Firestore successfully!');

        const batch = writeBatch(db);
        for (const productId in offlineCart) {
          const item = offlineCart[productId];
          const productRef = doc(db, 'collections', item.collectionId, 'subcollections', item.subcollectionId, 'products', productId);

          const productDoc = await getDoc(productRef);
          if (productDoc.exists()) {
            const currentQuantity = productDoc.data().quantity || 0;
            const newQuantity = currentQuantity - item.quantity;
            batch.update(productRef, { quantity: newQuantity });
          }
        }
        await batch.commit();
        console.log('Stock quantities updated successfully!');

        alert('Offline sale finalized and stock updated successfully!');
        setOfflineCart({});
        setEditedTotal(''); // Clear the edited total after sale
        setSelectedOfflineCollectionId('');
        setSelectedOfflineSubcollectionId('');
        setOfflineProducts([]);
        if (activeTab === 'orders') fetchOrders();
        if (activeSubTab === 'products') fetchProducts(selectedSubcollectionId);
      } catch (error) {
        console.error('Error finalizing offline sale:', error);
        alert('Failed to finalize the sale. Please try again.');
      }
    }
  };
  useEffect(() => {
    if (selectedOfflineCollectionId) {
      fetchSubcollectionsForOffline(selectedOfflineCollectionId);
    } else {
      setOfflineSubcollections([]);
      setSubcollectionsMap({});
    }
  }, [selectedOfflineCollectionId]);

  // This useEffect is critical for updating the products whenever the subcollection changes.
  // It ensures that products are loaded with the correct tiered pricing data.
  useEffect(() => {
    fetchOfflineProducts();
  }, [selectedOfflineSubcollectionId, subcollectionsMap]);

  const filteredOfflineProducts = offlineProducts.filter(product =>
    product && (
      (product.productName && product.productName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (product.productCode && product.productCode.toLowerCase().includes(searchQuery.toLowerCase()))
    )
  );
  return (
    <div className="admin-page">
      <h1>Admin Dashboard</h1>
      <div className="admin-tabs">
        <button
          className={activeTab === 'collections' ? 'active' : ''}
          onClick={() => setActiveTab('collections')}
        >
          Collections
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
          className={activeTab === 'reports' ? 'active' : ''}
          onClick={() => setActiveTab('reports')}
        >
          Reports
        </button>
        <button
          className={activeTab === 'users' ? 'active' : ''}
          onClick={() => setActiveTab('users')}
        >
          User Management
        </button>
        <button
          className={`admin-menu-item ${activeTab === 'offline-billing' ? 'active' : ''}`}
          onClick={() => setActiveTab('offline-billing')}
        >
          Offline Billing
        </button>



      </div>

      <div className="tab-content">
        {/* --- Collections, Subcollections, and Products Tabs --- */}
        {activeTab === 'collections' && (
          <div className="collection-management-container">
            <div className="sub-tabs">
              <button
                className={activeSubTab === 'collections' ? 'active' : ''}
                onClick={() => setActiveSubTab('collections')}
              >
                Collections
              </button>
              <button
                className={activeSubTab === 'subcollections' ? 'active' : ''}
                onClick={() => setActiveSubTab('subcollections')}
              >
                Subcollections
              </button>
              <button
                className={activeSubTab === 'products' ? 'active' : ''}
                onClick={() => setActiveSubTab('products')}
              >
                Products
              </button>
            </div>

            {/* --- Collections Sub-tab Content --- */}
            {activeSubTab === 'collections' && (
              <div className="forms-container">
                <div className="admin-section">
                  <h2>Main Collections</h2>
                  <form onSubmit={editingMainCollection ? handleUpdateMainCollection : handleAddMainCollection} className="add-collection-form">
                    <h3>{editingMainCollection ? 'Edit' : 'Add'} Main Collection</h3>
                    <div className="form-group">
                      <label>Name:</label>
                      <input type="text" value={mainCollectionName} onChange={(e) => setMainCollectionName(e.target.value)} placeholder="Main Collection Name" required />
                    </div>
                    <div className="form-group">
                      <label>Image:</label>
                      <input type="file" onChange={(e) => handleImageChange(e, setMainCollectionImageFile)} required={!editingMainCollection} />
                    </div>
                    <div className="form-group">
                      <label>Show Number:</label>
                      <input type="number" value={mainCollectionShowNumber} onChange={(e) => setMainCollectionShowNumber(e.target.value)} placeholder="Order (e.g., 1, 2)" required />
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

                <div className="admin-section">
                  <div className="current-collections">
                    <h3>Current Main Collections</h3>
                    {isMainCollectionLoading ? (
                      <p>Loading collections...</p>
                    ) : (
                      <div className="collections-grid">
                        {mainCollections.map((item) => (
                          <CollectionCard key={item.id} title={item.title} image={item.image} showNumber={item.showNumber}>
                            <div className="admin-actions">
                              <button onClick={() => startEditMainCollection(item)}>Edit</button>
                              <button onClick={() => handleDeleteMainCollection(item.id, item.image)}>Delete</button>
                            </div>
                          </CollectionCard>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* --- Subcollections Sub-tab Content --- */}
            {activeSubTab === 'subcollections' && (
              <div className="forms-container">
                <div className="admin-section">
                  <h2>Subcollections</h2>
                  <div className="form-group">
                    <label>Select Main Collection:</label>
                    <select onChange={(e) => setSelectedMainCollectionId(e.target.value)} value={selectedMainCollectionId}>
                      <option value="">-- Select a Collection --</option>
                      {mainCollections.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedMainCollectionId && (
                    <form onSubmit={editingSubcollection ? handleUpdateSubcollection : handleAddSubcollection} className="add-collection-form">
                      <h3>{editingSubcollection ? 'Edit' : 'Add'} Subcollection</h3>
                      <div className="form-group">
                        <label>Name:</label>
                        <input type="text" value={subcollectionName} onChange={(e) => setSubcollectionName(e.target.value)} placeholder="Subcollection Name" required />
                      </div>
                      <div className="form-group">
                        <label>Code:</label>
                        <textarea value={subcollectionDescription} onChange={(e) => setSubcollectionDescription(e.target.value)} placeholder="Subcollection productcode"></textarea>
                      </div>
                      <div className="form-group">
                        <label>Image:</label>
                        <input type="file" onChange={(e) => handleImageChange(e, setSubcollectionImageFile)} required={!editingSubcollection} />
                      </div>
                      <div className="form-group">
                        <label>Show Number:</label>
                        <input type="number" value={subcollectionShowNumber} onChange={(e) => setSubcollectionShowNumber(e.target.value)} placeholder="Order (e.g., 1, 2)" required />
                      </div>
                      <div className="form-group">
                        <label>Purchase Rate:</label>
                        <input type="number" step="0.01" value={subcollectionPurchaseRate} onChange={(e) => setSubcollectionPurchaseRate(e.target.value)} placeholder="Purchase Rate (e.g., 0.50)" required />
                      </div>
                      <div className="tiered-pricing-container">
                        <div className="pricing-section">
                          <h4>Retail Pricing</h4>
                          {subcollectionTieredPricing.retail.map((tier, index) => (
                            <div key={index} className="price-tier">
                              <input type="number" placeholder="Min Qty" value={tier.min_quantity} onChange={(e) => handleTierChange('retail', index, 'min_quantity', e.target.value)} required />
                              <input type="number" placeholder="Max Qty" value={tier.max_quantity} onChange={(e) => handleTierChange('retail', index, 'max_quantity', e.target.value)} required />
                              <input type="number" step="0.01" placeholder="Price" value={tier.price} onChange={(e) => handleTierChange('retail', index, 'price', e.target.value)} required />
                              <button type="button" onClick={() => handleRemoveTier('retail', index)} className="remove-tier-button">
                                &times;
                              </button>
                            </div>
                          ))}
                          <button type="button" onClick={() => handleAddTier('retail')} className="add-tier-button">
                            Add Retail Tier
                          </button>
                        </div>
                        <div className="pricing-section">
                          <h4>Wholesale Pricing</h4>
                          {subcollectionTieredPricing.wholesale.map((tier, index) => (
                            <div key={index} className="price-tier">
                              <input type="number" placeholder="Min Qty" value={tier.min_quantity} onChange={(e) => handleTierChange('wholesale', index, 'min_quantity', e.target.value)} required />
                              <input type="number" placeholder="Max Qty" value={tier.max_quantity} onChange={(e) => handleTierChange('wholesale', index, 'max_quantity', e.target.value)} required />
                              <input type="number" step="0.01" placeholder="Price" value={tier.price} onChange={(e) => handleTierChange('wholesale', index, 'price', e.target.value)} required />
                              <button type="button" onClick={() => handleRemoveTier('wholesale', index)} className="remove-tier-button">
                                &times;
                              </button>
                            </div>
                          ))}
                          <button type="button" onClick={() => handleAddTier('wholesale')} className="add-tier-button">
                            Add Wholesale Tier
                          </button>
                        </div>
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
                  )}
                </div>

                <div className="admin-section">
                  <h3>Current Subcollections</h3>
                  {selectedMainCollectionId ? (
                    isSubcollectionLoading ? (
                      <p>Loading subcollections...</p>
                    ) : (
                      <div className="collections-grid">
                        {subcollections.map((item) => (
                          <CollectionCard key={item.id} title={item.name} description={item.description} image={item.image} tieredPricing={item.tieredPricing}>
                            <div className="admin-actions">
                              <button onClick={() => startEditSubcollection(item)}>Edit</button>
                              <button onClick={() => handleDeleteSubcollection(item.id, item.image)}>Delete</button>
                            </div>
                          </CollectionCard>
                        ))}
                      </div>
                    )
                  ) : (
                    <p className="select-prompt">Please select a main collection to view its subcollections.</p>
                  )}
                </div>
              </div>
            )}

            {/* --- Products Sub-tab Content --- */}
            {activeSubTab === 'products' && (
              <div className="forms-container">
                <div className="admin-section">
                  <h2>Products</h2>
                  <div className="form-group">
                    <label>Select Main Collection:</label>
                    <select onChange={(e) => setSelectedMainCollectionId(e.target.value)} value={selectedMainCollectionId}>
                      <option value="">-- Select a Collection --</option>
                      {mainCollections.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Select Subcollection:</label>
                    <select onChange={(e) => setSelectedSubcollectionId(e.target.value)} value={selectedSubcollectionId}>
                      <option value="">-- Select a Subcollection --</option>
                      {subcollections.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  {selectedSubcollectionId && (
                    <div className="add-collection-form">

                      <h3>Add/Edit Products</h3>

                      {isCropping ? (
                        // This block shows the cropper
                        <div className="cropper-container">
                          <ReactCrop
                            crop={crop}
                            onChange={c => setCrop(c)}
                            onComplete={c => setCompletedCrop(c)}
                          >
                            <img src={imageToCrop} ref={imgRef} alt="Product" />
                          </ReactCrop>
                          <div className="cropper-buttons">
                            <button type="button" onClick={getCroppedImage}>Crop Image</button>
                            <button type="button" onClick={() => setIsCropping(false)}>Cancel</button>
                          </div>
                        </div>
                      ) : (
                        // This block shows either the product form or the file input
                        <>
                          {showProductForm ? (
                            <form onSubmit={editingProduct ? handleUpdateProduct : (currentImageIndex < newProducts.length ? handleNextProduct : handleAddAllProducts)} className="bulk-upload-form">
                              {editingProduct ? (
                                <>
                                  <div className="product-form-item">
                                    <img src={editingProduct.image} alt="Product Preview" className="product-preview-image" />
                                    <button type="button" onClick={() => startCropping(editingProduct.image)} className="crop-button">
                                      <span role="img" aria-label="crop icon">✂️</span> Crop
                                    </button>
                                    <div className="product-details-inputs">
                                      <div className="form-group">
                                        <label>Product Name:</label>
                                        <input type="text" value={productName} onChange={(e) => setProductName(e.target.value)} required />
                                      </div>
                                      <div className="form-group">
                                        <label>Product Code:</label>
                                        <input type="text" value={productCode} onChange={(e) => setProductCode(e.target.value)} required />
                                      </div>
                                      <div className="form-group">
                                        <label>Quantity:</label>
                                        <input type="number" value={productQuantity} onChange={(e) => setProductQuantity(e.target.value)} onWheel={(e) => e.preventDefault()} required />
                                      </div>
                                    </div>
                                  </div>
                                </>
                              ) : (
                                <>
                                  {newProducts.length > 0 && currentImageIndex < newProducts.length ? (
                                    <>
                                      <div className="product-form-item">
                                        <img src={newProducts[currentImageIndex].previewUrl} alt="Product Preview" className="product-preview-image" />
                                        <button type="button" onClick={() => startCropping(newProducts[currentImageIndex].previewUrl)} className="crop-button">
                                          <span role="img" aria-label="crop icon">✂️</span> Crop
                                        </button>
                                        <button type="button" onClick={() => handleDeleteNewImage(currentImageIndex)} className="delete-button">
                                          <span role="img" aria-label="delete icon">🗑️</span> Delete
                                        </button>
                                        <div className="product-details-inputs">
                                          {/* Product Name and Code remain here */}
                                          <div className="form-group">
                                            <label>Product Name:</label>
                                            <input type="text" value={productName} onChange={(e) => setProductName(e.target.value)} required />
                                          </div>
                                          <div className="form-group">
                                            <label>Product Code:</label>
                                            <input type="text" value={productCode} onChange={(e) => setProductCode(e.target.value)} required />
                                          </div>

                                          {/* Conditional Rendering: Show Quantity OR Variations */}
                                          {productVariations.length === 0 ? (
                                            // Show the single Quantity input if no variations are added
                                            <div className="form-group">
                                              <label>Quantity:</label>
                                              <input type="number" value={productQuantity} onChange={(e) => setProductQuantity(e.target.value)} required />
                                            </div>
                                          ) : (
                                            // Show the variations list if variations are present
                                            <div className="variation-input-container">
                                              <h4>Add More Variations</h4>
                                              <ul className="variations-list">
                                                {productVariations.map((v, index) => (
                                                  <li key={index} className="variation-item">
                                                    <span>{v.color}, {v.size}, Qty: {v.quantity}</span>
                                                    <button type="button" onClick={() => handleRemoveVariation(index)} className="remove-variation-btn">
                                                      &times;
                                                    </button>
                                                  </li>
                                                ))}
                                              </ul>
                                            </div>
                                          )}

                                          {/* NEW: Always show the variation input fields regardless of whether variations exist or not */}
                                          <div className="variation-input">
                                            <input
                                              type="text"
                                              name="color"
                                              value={newVariation.color}
                                              onChange={handleNewVariationChange}
                                              placeholder="Color (e.g., Red)"
                                            />
                                            <input
                                              type="text"
                                              name="size"
                                              value={newVariation.size}
                                              onChange={handleNewVariationChange}
                                              placeholder="Size (e.g., L)"
                                            />
                                            <input
                                              type="number"
                                              name="quantity"
                                              value={newVariation.quantity}
                                              onChange={handleNewVariationChange}
                                              placeholder="Quantity"
                                            />
                                            <button type="button" onClick={handleAddVariation} className="add-variation-btn">
                                              Add Variation
                                            </button>
                                          </div>

                                          {/* The Upload Additional Product Photos section remains here */}
                                          <div className="form-group">
                                            <label>Upload Additional Product Photos:</label>
                                            <input
                                              type="file"
                                              onChange={handleAdditionalImageChange}
                                              multiple
                                              accept="image/*"
                                            />
                                          </div>
                                        </div>
                                      </div>
                                      <div className="file-info">
                                        Image {currentImageIndex + 1} of {newProducts.length}
                                      </div>

                                    </>
                                  ) : (
                                    <p>All product details filled. Click 'Add All Products' to save.</p>
                                  )}
                                </>
                              )}
                              <button type="submit" disabled={isProductUploading} className="submit-all-button">
                                {isProductUploading ? 'Uploading...' : editingProduct ? 'Update Product' : currentImageIndex < newProducts.length - 1 ? 'Next' : 'Add All Products'}
                              </button>
                              <button type="button" onClick={resetProductForm} className="cancel-button">
                                Cancel
                              </button>
                            </form>
                          ) : (
                            <div className="form-group">
                              <label>Upload Product Photos:</label>
                              <input type="file" onChange={handleProductImageChange} multiple />
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
                <div className="admin-section">
                  <h3>Current Products</h3>
                  {selectedSubcollectionId ? (
                    isProductLoading ? (
                      <p>Loading products...</p>
                    ) : (
                      <>
                        <div className="search-container">
                          <input
                            type="text"
                            placeholder="Search by name or code..."
                            value={productSearchTerm}
                            onChange={(e) => setProductSearchTerm(e.target.value)}
                            className="search-input"
                          />
                        </div>
                        <div className="collections-grid">
                          {filteredProducts.length > 0 ? (
                            filteredProducts.map((product) => (
                              <ProductCard
                                key={product.id}
                                product={product} // This passes the entire product object
                                onEdit={() => startEditProduct(product)}
                                onDelete={() => handleDeleteProduct(product.id, product.image)}
                              />
                            ))
                          ) : (
                            <p>No products found matching your search criteria.</p>
                          )}
                        </div>
                      </>
                    )
                  ) : (
                    <p className="select-prompt">Please select a main collection and a subcollection to view its products.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- Order Management Section --- */}
   {activeTab === 'orders' && (
    <div className="admin-section">
        <h2>Customer Orders</h2>

        {/* Search and Filter Bar */}
        <div className="order-filters">
            <input
                type="text"
                placeholder="Search by ID, name, email, or phone"
                value={orderSearchTerm}
                onChange={(e) => setOrderSearchTerm(e.target.value)}
                className="search-input"
            />
            <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                title="Start Date"
            />
            <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                title="End Date"
            />
            <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="status-select"
            >
                <option value="All">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Processing">Processing</option>
                <option value="Shipped">Shipped</option>
                <option value="Delivered">Delivered</option>
            </select>
            
        </div>

        {isOrderLoading ? (
            <p>Loading orders...</p>
        ) : filteredOrders.length === 0 ? (
            <p>No orders found with the current filters.</p>
        ) : (
            // Now we map over the sortedDateKeys
            sortedDateKeys.length > 0 ? (
                sortedDateKeys.map(dateKey => (
                    <div key={dateKey} className="order-date-group">
                        <h3>{dateKey}</h3>
                        <ul className="orders-list">
                            {groupedOrdersFromFiltered[dateKey].map((order) => (
                                <li key={order.id} onClick={() => setSelectedOrder(order)} className="order-list-item">
                                    <p>Order ID: <strong>{order.id.substring(0, 8)}...</strong></p>
                                    <p>Total: <strong>₹{order.totalAmount.toFixed(2)}</strong></p>
                                    <p>Status: <span className={`order-status status-${order.status ? order.status.toLowerCase() : 'pending'}`}>{order.status}</span></p>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))
            ) : (
                <p>No orders found with the current filters.</p>
            )
        )}
    </div>
)}

        {/* Render Order Details Modal */}
        {selectedOrder && (
          <OrderDetailsModal
            order={selectedOrder}
            onClose={() => setSelectedOrder(null)}
            onUpdateStatus={handleUpdateOrderStatus}
            onCancelOrder={handleCancelOrder} 
          />
        )}
        {/* --- Low Stock Tab --- */}
        {activeTab === 'lowStock' && (
          <div className="admin-section">
            <h2>Low Stock Alerts</h2>
            <div className="low-stock-header">
              <p>The following products have a quantity less than or equal to {LOW_STOCK_THRESHOLD}.</p>
              <button onClick={handleDownloadLowStockImages} disabled={isDownloading || lowStockProducts.length === 0} className="download-all-btn">
                {isDownloading ? 'Downloading...' : 'Download All Images'}
              </button>
            </div>
            {isLowStockLoading ? (
              <p>Scanning for low stock products...</p>
            ) : lowStockProducts.length === 0 ? (
              <p>No products are currently low in stock.</p>
            ) : (
              <div className="collections-grid">
                {lowStockProducts.map((product) => (
                  <ProductCard key={product.id} productName={product.productName} productCode={product.productCode} quantity={product.quantity} image={product.image} />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="admin-section">
            <h2>Financial Reports</h2>
            {isReportsLoading ? (
              <p>Loading reports...</p>
            ) : (
              <div className="reports-container">

                <div className="report-table-container">
                  <h3>Order Report</h3>
                  <table className="report-table">
                    <thead>
                      <tr>
                        <th>Order ID</th>
                        <th>Date</th>
                        <th>Total Amount</th>
                        <th>Status</th>
                        <th>Customer Email</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orderReports.length > 0 ? (
                        orderReports.map(report => (
                          <tr key={report.id}>
                            <td>{report.id.substring(0, 8)}...</td>
                            <td>{report.createdAt}</td>
                            <td>₹{report.totalAmount?.toFixed(2) || '0.00'}</td>
                            <td><span className={`order-status status-${report.status?.toLowerCase() || 'unknown'}`}>{report.status || 'N/A'}</span></td>
                            <td>{report.userEmail || 'N/A'}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="5">No order data found.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="report-table-container">
                  <h3>Payment Report</h3>
                  <table className="report-table">
                    <thead>
                      <tr>
                        <th>Order ID</th>
                        <th>Date</th>
                        <th>Total Amount</th>
                        <th>Payment Method</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paymentReports.length > 0 ? (
                        paymentReports.map((report, index) => (
                          <tr key={index}>
                            <td>{report.orderId.substring(0, 8)}...</td>
                            <td>{report.date}</td>
                            <td>₹{report.totalAmount?.toFixed(2) || '0.00'}</td>
                            <td>{report.paymentMethod}</td>
                            <td><span className={`order-status status-${report.status?.toLowerCase() || 'unknown'}`}>{report.status || 'N/A'}</span></td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="5">No payment data found.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="report-table-container">
                  <h3>Product Report</h3>
                  <table className="report-table">
                    <thead>
                      <tr>
                        <th>Product Code</th>
                        <th>Product Name</th>
                        <th>Quantity in Stock</th>
                        <th>Total Sales</th>
                        <th>Total Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productReports.length > 0 ? (
                        productReports.map((report, index) => (
                          <tr key={index}>
                            <td>{report.productCode}</td>
                            <td>{report.productName}</td>
                            <td>{report.quantityInStock}</td>
                            <td>{report.totalSales}</td>
                            <td>₹{report.totalRevenue.toFixed(2)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="5">No product data found.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
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
        {activeTab === 'offline-billing' && (
          <div className="offline-billing-section">
            <h2>Offline Billing</h2>
            <div className="billing-container">
              <div className="product-selection-panel">
                <h4>Select Products</h4>
                <div className="dropdown-group">
                  <select
                    className="billing-select"
                    value={offlinePricingType}
                    onChange={(e) => setOfflinePricingType(e.target.value)}
                  >
                    <option value="retail">Retail Pricing</option>
                    <option value="wholesale">Wholesale Pricing</option>
                  </select>
                  <select
                    className="billing-select"
                    value={selectedOfflineCollectionId}
                    onChange={(e) => setSelectedOfflineCollectionId(e.target.value)}
                  >
                    <option value="">Select Collection</option>
                    {mainCollections.map((collection) => (
                      <option key={collection.id} value={collection.id}>
                        {collection.title}
                      </option>
                    ))}
                  </select>
                  <select
                    className="billing-select"
                    value={selectedOfflineSubcollectionId}
                    onChange={(e) => setSelectedOfflineSubcollectionId(e.target.value)}
                    disabled={!selectedOfflineCollectionId}
                  >
                    <option value="">Select Subcollection</option>
                    {offlineSubcollections.map((subcollection) => (
                      <option key={subcollection.id} value={subcollection.id}>
                        {subcollection.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Search Input */}
                <input
                  type="text"
                  placeholder="Search products by name or code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="product-search-bar"
                />

                {isOfflineProductsLoading ? (
                  <p className="loading-message">Loading products...</p>
                ) : filteredOfflineProducts.length > 0 ? (
                  <div className="billing-product-list">
                    {filteredOfflineProducts.map(product => {
                      // Get the current price from the cart state
                      const currentPriceInCart = offlineCart[product.id]?.price;
                      const imagesToDisplay = product.images && product.images.length > 0 ? product.images : (product.image ? [product.image] : []);

                      return (
                        <div
                          key={product.id}
                          className="billing-product-item"
                          onClick={() => handleOfflineAddToCart(product)}
                        >
                          <img
                            alt={productName}
                            src={imagesToDisplay[currentImageIndex]}
                            className="product-image"
                          />                          <span className="product-name">{product.productName}</span>
                          <span className="product-code">{product.productCode}</span>
                          <span className="product-quantity">Qty: {product.quantity}</span>
                          {typeof currentPriceInCart === 'number' && (
                            <span className="product-price">₹{currentPriceInCart.toFixed(2)}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="no-products-found">
                    {selectedOfflineSubcollectionId
                      ? 'No products found for your search.'
                      : 'Please select a collection and subcollection to view products.'}
                  </p>
                )}
              </div>
              <div className="billing-cart-panel">
                <h4>Billing Cart</h4>
                {Object.keys(offlineCart).length > 0 ? (
                  <>
                    <ul className="cart-list">
                      {Object.values(offlineCart).map((item) => (
                        <li key={item.id} className="cart-item">
                          <div className="cart-item-details">
                            <span className="cart-item-name">{item.productName}</span>
                            <span className="cart-item-name">{item.productCode}</span>

                            <span className="cart-item-info">
                              {item.quantity} x ₹
                              {typeof item.price === 'number'
                                ? item.price.toFixed(2)
                                : item.price !== undefined && item.price !== null
                                  ? parseFloat(item.price).toFixed(2)
                                  : '0.00'}
                            </span>
                          </div>
                          <div className="cart-item-controls">
                            <button onClick={() => handleOfflineRemoveFromCart(item.id)} className="quantity-btn">-</button>
                            <span className="cart-quantity">{item.quantity}</span>
                            <button onClick={() => handleOfflineAddToCart(item, 1)} className="quantity-btn">+</button>
                          </div>
                        </li>
                      ))}
                    </ul>

                    {/* NEW: Editable Total Input */}
                    <div className="cart-total-info">
                      <p className="calculated-total">Calculated Total: ₹{getOfflineCartTotal().toFixed(2)}</p>
                      <label htmlFor="edited-total-input">Final Total:</label>
                      <input
                        id="edited-total-input"
                        type="number"
                        value={editedTotal}
                        onChange={(e) => setEditedTotal(e.target.value)}
                        placeholder="Enter final total"
                        className="editable-total-input"
                      />
                    </div>

                    <button onClick={handleFinalizeSale} className="finalize-sale-btn">
                      Finalize Sale
                    </button>
                  </>
                ) : (
                  <p>Cart is empty. Add products to start billing.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPage;