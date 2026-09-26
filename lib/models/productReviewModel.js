import { DataTypes } from "sequelize";
import sequelize from "../db.js";

const ProductReview = sequelize.define(
  "ProductReview",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    product_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    reviewer_name: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    rating: {
      type: DataTypes.TINYINT,
      allowNull: false,
      validate: {
        min: 1,
        max: 5
      }
    },
    comment: {
      type: DataTypes.TEXT,
      allowNull: true
    },

    /** JSON array of paths e.g. ["/uploads/123-photo.jpg"] */
    images: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const raw = this.getDataValue("images");
        if (!raw) return [];
        try {
          const p = JSON.parse(raw);
          return Array.isArray(p) ? p : [];
        } catch {
          return [];
        }
      },
      set(val) {
        if (val == null || (Array.isArray(val) && val.length === 0)) {
          this.setDataValue("images", null);
        } else if (typeof val === "string") {
          this.setDataValue("images", val);
        } else if (Array.isArray(val)) {
          this.setDataValue("images", JSON.stringify(val));
        } else {
          this.setDataValue("images", null);
        }
      }
    },

    /** Shown date (backdate supported for admin / trusted flows) */
    reviewed_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  },
  {
    tableName: "product_reviews",
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ["user_id", "product_id"]
      }
    ]
  }
);

export default ProductReview;
