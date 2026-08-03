const pool = require("../config/db");

// Get All Brands
exports.getBrands = async (req, res) => {
  try {
    const [brands] = await pool.query(
      "SELECT brand_id, brand_name FROM brands WHERE isActive = 1"
    );
    res.json(brands);
  } catch (error) {
    res.status(500).json({ error: "Database error" });
  }
};

// Search New Brand
exports.searchBrand = async (req, res) => {
  try {
    const { brand_name } = req.body;
    if (!brand_name)
      return res.status(400).json({ error: "Brand name is required" });

    const [result] = await pool.query(
      "SELECT `brand_id`, `brand_name` FROM `brands` WHERE `brand_name`=? AND `isActive` = 1",
      [brand_name]
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Database error" });
  }
};

// Add New Brand
exports.addBrand = async (req, res) => {
  try {
    const { brand_name } = req.body;
    if (!brand_name)
      return res.status(400).json({ error: "Brand name is required" });

    const [result] = await pool.query(
      "INSERT INTO brands (brand_name) VALUES (?)",
      [brand_name]
    );
    res.json({
      message: "Brand added successfully",
      brand_id: result.insertId,
    });
  } catch (error) {
    res.status(500).json({ error: "Database error" });
  }
};

// Delete Brand
exports.deleteBrand = async (req, res) => {
  try {
    // const brand_id = req.body.brand_id
    const { brand_id } = req.body;
    if (!brand_id)
      return res.status(400).json({ error: "Brand Id is required" });

    const [result] = await pool.query(
      "UPDATE `brands` SET `isActive` = 0 WHERE `brand_id`=?",
      [brand_id]
    );
    res.json({
      message: "Brand deleted successfully",
      brand_id: result.insertId,
    });
  } catch (error) {
    res.status(500).json({ error: "Database error" });
  }
};

// Edit Brand
exports.editBrand = async (req, res) => {
  try {
    const { brand_id, brand_name } = req.body;

    if (!brand_id) {
      return res.status(400).json({ error: "Brand ID is required" });
    }

    if (!brand_name) {
      return res.status(400).json({ error: "Brand name is required" });
    }

    const sql = "UPDATE brands SET brand_name = ? WHERE brand_id = ?";

    const [result] = await pool.query(sql, [brand_name, brand_id]);
    res.json({
      message: "Brand updated successfully",
      brand_id: result.insertId,
    });
  } catch (error) {
    res.status(500).json({ error: "Database error" });
  }
};
