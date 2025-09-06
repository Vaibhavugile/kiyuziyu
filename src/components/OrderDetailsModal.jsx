import React from 'react';
import './Modal.css';

const OrderDetailsModal = ({ order, onClose, onUpdateStatus }) => {
  if (!order) return null;

  const orderDate = order.createdAt?.toDate().toLocaleString();

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
          
          <div className="order-info-group">
            <h4>Billing Information</h4>
            <p><strong>Name:</strong> {order.billingInfo?.fullName}</p>
            <p><strong>Email:</strong> {order.billingInfo?.email}</p>
            <p><strong>Phone:</strong> {order.billingInfo?.phoneNumber}</p>
          </div>

          <div className="order-info-group">
            <h4>Shipping Information</h4>
            <p><strong>Address:</strong> {order.billingInfo?.address}</p>
          </div>

          <div className="order-info-group">
            <h4>Items</h4>
            <ul className="order-items-list">
              {order.items.map((item, index) => (
                <li key={index}>
                  <img src={item.image} alt={item.productCode} />
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