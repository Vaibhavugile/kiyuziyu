import React from 'react';
import './Modal.css';

const OrderDetailsModal = ({ order, onClose, onUpdateStatus }) => {
  if (!order) return null;

  const orderDate = order.createdAt?.toDate().toLocaleString();

  // New function to handle printing the Server-Generated PDF Invoice
  const handlePrintInvoicePDF = async () => {
    try {
      // 🎯 UPDATED: Using the provided Firebase Function URL
      const functionUrl = 'https://us-central1-jewellerywholesale-2e57c.cloudfunctions.net/generateInvoiceForPrint';
      
      const response = await fetch(`${functionUrl}?orderId=${order.id}`); //

      if (!response.ok) {
        throw new Error(`PDF generation failed: ${response.statusText}`);
      }

      // Open the PDF in a new browser tab for viewing/printing
      const blob = await response.blob();
      const pdfUrl = window.URL.createObjectURL(blob);
      window.open(pdfUrl, '_blank');
      window.URL.revokeObjectURL(pdfUrl); // Clean up the object URL
      
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Error generating or opening PDF invoice:", error);
      alert("Could not generate the invoice. Please try again.");
    }
  };
  
  // 🔄 Existing handlePrint function for client-side printing (e.g., Shipping Label)
  const handlePrintClientSide = (printType) => {
    // 1. Get the element to be printed
    const contentToPrint = document.getElementById('printable-order-content'); //
    if (!contentToPrint) {
      // eslint-disable-next-line no-console
      console.error("Printable content element not found.");
      return;
    }

    // 2. Add a class to the element (e.g., 'print-type-shipping')
    contentToPrint.classList.add(printType); //

    // 3. Trigger the print dialog
    window.print(); //

    // 4. Remove the class after printing is done (or the dialog is closed)
    contentToPrint.classList.remove(printType); //
  };
  // The original handlePrint for 'print-type-order' is removed, replaced by PDF function

  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Order Details</h2>
          <button onClick={onClose} className="modal-close-btn">&times;</button>
        </div>
        
        {/* This div is the target for client-side printing (e.g., shipping label) */}
        <div className="modal-body" id="printable-order-content">
          <div className="order-info-group">
            <p><strong>Order ID:</strong> {order.id}</p>
            <p><strong>Order Date:</strong> {orderDate}</p>
            <p><strong>Status:</strong> {order.status}</p>
            <p><strong>Total Amount:</strong> ₹{order.totalAmount.toFixed(2)}</p>
          </div>

          {order.shippingInfo && (
            <div className="order-info-group shipping-info-group">
              <h4>Shipping Info</h4>
              <p><strong>Name:</strong> {order.shippingInfo.fullName}</p>
              <p><strong>Phone:</strong> {order.shippingInfo.phoneNumber}</p>
              <p><strong>Address:</strong> {order.shippingInfo.addressLine1}, {order.shippingInfo.addressLine2}, {order.shippingInfo.city}, {order.shippingInfo.state} - {order.shippingInfo.pincode}</p>
            </div>
          )}

          {order.billingInfo && (
            <div className="order-info-group billing-info-group">
              <h4>Billing Info</h4>
              <p><strong>Name:</strong> {order.billingInfo.fullName}</p>
              <p><strong>Email:</strong> {order.billingInfo.email}</p>
              <p><strong>Address:</strong> {order.billingInfo.addressLine1}, {order.billingInfo.addressLine2}, {order.billingInfo.city}, {order.billingInfo.state} - {order.billingInfo.pincode}</p>
            </div>
          )}

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
                    <p><strong>Product:</strong> {item.productName}</p>
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
          {/* New button to print the server-generated PDF INVOICE */}
          <button onClick={handlePrintInvoicePDF} className="print-btn">
            Print PDF Invoice 📜
          </button>
          {/* Calls the existing client-side print function for shipping label */}
          <button onClick={() => handlePrintClientSide('print-type-shipping')} className="print-btn">
            Print Shipping Label 🏷️
          </button>
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