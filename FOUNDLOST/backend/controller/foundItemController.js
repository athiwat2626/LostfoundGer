const db = require("../db");
const { validateItem } = require("../validation");
const { sendLineNotification } = require("../services/lineNotification");

const createFoundItems = async (req, res) => {
  const validation = validateItem(req.body, "found_date", "found_location");
  if (validation.error) {
    return res.status(400).json({ error: validation.error });
  }

  const {
    found_date,
    item_name,
    category,
    item_color,
    found_location,
    description,
    deposit_location,
  } = validation.value;
  
  const student_id = req.body.student_id?.trim() || null;
  const image_url = req.file ? `/assets/foundUploads/${req.file.filename}` : null;

  try {
    const result = await db.query(
      `INSERT INTO found_items (student_id, image_url, found_date, item_name, category, item_color, found_location, description, deposit_location)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING item_id`,
      [
        student_id,
        image_url,
        found_date,
        item_name,
        category,
        item_color,
        found_location,
        description,
        deposit_location,
      ],
    );

    sendLineNotification(
      `แจ้งเตือน: มีผู้รายงานพบของใหม่\nสิ่งของ: ${item_name}\nสถานที่พบ: ${found_location}`,
    ).catch((notificationError) => {
      console.error("LINE notification failed:", notificationError.message);
    });

    res.status(201).json({ item_id: result.rows[0].item_id });
  } catch (error) {
    console.error("Error inserting found item:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getFoundItems = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM found_items ORDER BY item_id DESC `
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error fetching found items:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = { createFoundItems, getFoundItems };
