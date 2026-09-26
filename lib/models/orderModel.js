import { DataTypes } from "sequelize";
import sequelize from "../db.js";

const Order = sequelize.define(
  "Order",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    order_id: {
      type: DataTypes.STRING,
    },
    txnid: {
      type: DataTypes.STRING,
    },
    product_id: {
      type: DataTypes.INTEGER,
    },

    customer_name: {
      type: DataTypes.STRING,
    },
    email: {
      type: DataTypes.STRING,
    },
    phone: {
      type: DataTypes.STRING,
    },
    address: {
      type: DataTypes.TEXT,
    },
    city: {
      type: DataTypes.STRING,
    },
    state: {
      type: DataTypes.STRING,
    },
    postcode: {
      type: DataTypes.STRING,
    },
    gst_billing: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    firm_name: {
      type: DataTypes.STRING,
    },
    gst_number: {
      type: DataTypes.STRING,
    },

    product_name: {
      type: DataTypes.STRING,
    },

    status: {
      type: DataTypes.STRING,
    },

    qty: {
      type: DataTypes.INTEGER,
    },

    /** JSON string: selected variant id + specs (checkout sends variant_id, selectedVariant, etc.) */
    attributes: {
      type: DataTypes.TEXT,
    },

    rate: {
      type: DataTypes.DECIMAL(10,2),
    },

    mrp: {
      type: DataTypes.DECIMAL(10,2),
    },

    igst: {
      type: DataTypes.DECIMAL(10,2),
    },

    cgst: {
      type: DataTypes.DECIMAL(10,2),
    },

    sgst: {
      type: DataTypes.DECIMAL(10,2),
    },

    payment_mode: {
      type: DataTypes.STRING,
    },
    total_amount: {
      type: DataTypes.DECIMAL(10, 2),
    },

    order_date: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },

    shop_name: {
      type: DataTypes.STRING,
    },
    delivery_date: {
      type: DataTypes.DATE,
    },

    shipping_partner: {
      type: DataTypes.STRING,
    },

    tracking_id: {
      type: DataTypes.STRING,
    },

    tracking_link: {
      type: DataTypes.TEXT,
    },

    invoice_url: {
      type: DataTypes.TEXT,
    },

    shipping_label_url: {
      type: DataTypes.TEXT,
    },
    return_status: {
      type: DataTypes.ENUM(
        "none",
        "requested",
        "approved",
        "rejected",
        "completed"
      ),
      defaultValue: "none",
    },
    return_reason: {
      type: DataTypes.TEXT,
    },

    replacement_status: {
      type: DataTypes.ENUM(
        "none",
        "requested",
        "approved",
        "rejected",
        "shipped",
        "delivered"
      ),
      defaultValue: "none",
    },
    replacement_reason: {
      type: DataTypes.TEXT,
    },
    
    confirmed_date: {
  type: DataTypes.DATE,
},

processing_date: {
  type: DataTypes.DATE,
},

shipped_status_date: {
  type: DataTypes.DATE,
},

return_requested_date: {
  type: DataTypes.DATE,
},

return_approved_date: {
  type: DataTypes.DATE,
},

return_completed_date: {
  type: DataTypes.DATE,
},

replacement_requested_date: {
  type: DataTypes.DATE,
},

replacement_approved_date: {
  type: DataTypes.DATE,
},

replacement_shipped_date: {
  type: DataTypes.DATE,
},

replacement_delivered_date: {
  type: DataTypes.DATE,
},

shipping_date: {
  type: DataTypes.DATE,
},

delivered_date: {
  type: DataTypes.DATE,
},

refund_status: {
  type: DataTypes.ENUM(
    "none",
    "pending",
    "pending_bank_details",
    "processing",
    "refunded",
    "failed",
    "not_required"
  ),
  defaultValue: "none",
},

refund_amount: {
  type: DataTypes.DECIMAL(10,2),
},

refund_method: {
  type: DataTypes.STRING,
},

refund_reason: {
  type: DataTypes.TEXT,
},

refund_reference: {
  type: DataTypes.STRING,
},

refund_requested_at: {
  type: DataTypes.DATE,
},

refund_processed_at: {
  type: DataTypes.DATE,
},

refund_account_holder: {
  type: DataTypes.STRING,
},

refund_account_number: {
  type: DataTypes.STRING,
},

refund_ifsc: {
  type: DataTypes.STRING,
},

refund_upi_id: {
  type: DataTypes.STRING,
},
  },
  {
    tableName: "orders",
    timestamps: false,
  }
);

export default Order;