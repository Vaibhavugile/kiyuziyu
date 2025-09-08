// src/components/OrderTrackingCard.jsx

import React from 'react';
import './OrderTrackingCard.css';

const OrderTrackingCard = ({ order }) => {
  const orderDate = order.createdAt?.toDate().toLocaleString();

  // Define the order status timeline
  const orderTimeline = ['Pending', 'Processing', 'Shipped', 'Delivered'];
  const currentStatusIndex = orderTimeline.indexOf(order.status);

  return (
    <div className="order-tracking-card">
      <div className="order-header">
        <h4 className="order-id">Order ID: {order.id.substring(0, 8)}...</h4>
        <p className={`order-status status-${order.status.toLowerCase()}`}>
          {order.status}
        </p>
      </div>
      <p className="order-date">Date: {orderDate}</p>
      <p className="order-total">Total: ₹{order.totalAmount.toFixed(2)}</p>

      <div className="order-timeline">
        {orderTimeline.map((status, index) => (
          <div
            key={status}
            className={`timeline-step ${index <= currentStatusIndex ? 'completed' : ''}`}
          >
            <div className="timeline-circle"></div>
            <p className="timeline-status-text">{status}</p>
          </div>
        ))}
      </div>

      <div className="order-items-summary">
        <h5>Items:</h5>
        <ul>
          {order.items.map((item, index) => (
            <li key={index}>
              <img src={item.image} alt={item.productCode} className="item-image" />
              <p>{item.productCode} x {item.quantity}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default OrderTrackingCard;