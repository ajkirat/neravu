-- Fewer expense categories: move expenses from merged categories into the category that replaced them.
-- Mirrors CATEGORY_MERGED in src/lib/format.ts. Bills still waiting for Yes/No are mapped in code.
UPDATE "Expense" SET "category" = 'Water' WHERE "category" IN ('Water tanker', 'Drinking water cans');
UPDATE "Expense" SET "category" = 'Daily fresh' WHERE "category" IN ('Vegetables & fruits', 'Milk & dairy', 'Meat, fish & eggs');
UPDATE "Expense" SET "category" = 'Internet & TV' WHERE "category" IN ('Internet', 'TV / DTH');
UPDATE "Expense" SET "category" = 'Repairs & maintenance' WHERE "category" IN ('Maintenance', 'Plumbing', 'Electrical repairs', 'Appliance repair', 'Painting & civil work');
UPDATE "Expense" SET "category" = 'Furniture & bedding' WHERE "category" IN ('Furniture & fittings', 'Bedding & linen');
UPDATE "Expense" SET "category" = 'Cleaning & housekeeping' WHERE "category" IN ('Cleaning', 'Cleaning supplies', 'Laundry', 'Pest control', 'Garbage collection');
UPDATE "Expense" SET "category" = 'Staff salary' WHERE "category" IN ('Security guard');
UPDATE "Expense" SET "category" = 'Other' WHERE "category" IN ('Property tax & licences', 'Bank charges', 'Advertising', 'Transport', 'Stationery & printing', 'Medical / first aid');
