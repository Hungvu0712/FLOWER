-- Bỏ tồn kho khỏi products — hoa tươi làm theo đơn/theo mẫu, không phải hàng lưu kho theo SKU cố định.
ALTER TABLE "products" DROP COLUMN "stock";
