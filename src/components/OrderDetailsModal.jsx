import React from 'react';
import './Modal.css';

const OrderDetailsModal = ({ order, onClose, onUpdateStatus }) => {
  if (!order) return null;

  const orderDate = order.createdAt?.toDate().toLocaleString();

  const handlePrint = (printType) => {
    // Hide elements not needed for printing
    document.body.classList.add('printing');
    
    // Hide all info groups by default
    const infoGroups = document.querySelectorAll('.order-info-group');
    infoGroups.forEach(group => {
      group.style.display = 'none';
    });

    // Show the relevant info groups based on printType
    if (printType === 'order') {
      infoGroups.forEach(group => {
        group.style.display = 'block';
      });
    } else if (printType === 'shipping') {
      const billingGroup = document.querySelector('.billing-info-group');
      const shippingGroup = document.querySelector('.shipping-info-group');
      if (billingGroup) billingGroup.style.display = 'block';
      if (shippingGroup) shippingGroup.style.display = 'block';
    }

    window.print();

    // Restore the normal view after printing
    document.body.classList.remove('printing');
    infoGroups.forEach(group => {
      group.style.display = '';
    });
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Order Details - {order.id.substring(0, 8)}...</h3>
          <button onClick={onClose} className="modal-close-btn">&times;</button>
        </div>
        <div className="modal-body">
          <div className="order-info-group">
            <p><strong>Status:</strong> <span className={`order-status status-${order.status.toLowerCase()}`}>{order.status}</span></p>
            <p><strong>Date:</strong> {orderDate}</p>
            <p><strong>Total Amount:</strong> ₹{order.totalAmount.toFixed(2)}</p>
          </div>
          
          <div className="order-info-group billing-info-group">
            <h4>Billing Information</h4>
            <p><strong>Name:</strong> {order.billingInfo?.fullName}</p>
            <p><strong>Email:</strong> {order.billingInfo?.email}</p>
            <p><strong>Phone:</strong> {order.billingInfo?.phoneNumber}</p>
          </div>

          <div className="order-info-group shipping-info-group">
  <h4>Shipping Information</h4>
  <p><strong>Address:</strong>
    {order.billingInfo ? (
      <>
        <br />
        {order.billingInfo.addressLine1}
        {order.billingInfo.addressLine2 ? <>, {order.billingInfo.addressLine2}</> : ''}
        <br />
        {order.billingInfo.city}, {order.billingInfo.state}
        <br />
        Pincode: {order.billingInfo.pincode}
      </>
    ) : (
      'N/A'
    )}
  </p>
</div>

         <div className="order-info-group">
  <h4>Items</h4>
  <ul className="order-items-list">
    {order.items.map((item, index) => (
      <li key={index}>
        {item.image ? (
          <img src={item.image} alt={item.productCode} />
        ) : (
          <div className="image-placeholder">No Image</div>
        )}
        <div>
          <p><strong>Code:</strong> {item.productCode}</p>
          <p><strong>Quantity:</strong> {item.quantity}</p>
          <p><strong>Price:</strong> ₹{item.price}</p>
        </div>
      </li>
    ))}
  </ul>
</div>
        </div>
        <div className="modal-footer">
          <button onClick={() => handlePrint('order')} className="print-btn">Print Order Details</button>
          <button onClick={() => handlePrint('shipping')} className="print-btn">Print Shipping Label</button>
          <select
            value={order.status}
            onChange={(e) => onUpdateStatus(order.id, e.target.value)}
          >
            <option value="Pending">Pending</option>
            <option value="Processing">Processing</option>
            <option value="Shipped">Shipped</option>
            <option value="Delivered">Delivered</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailsModal;