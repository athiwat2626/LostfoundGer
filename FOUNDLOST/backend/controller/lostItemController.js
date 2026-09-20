const db = require("../db");
const { validateItem } = require("../validation");
const { sendLineNotification } = require("../services/lineNotification");

// เพิ่มข้อมูล Lost Item ลงในฐานข้อมูล
const createLostItems = async (req, res) => {
  const validation = validateItem(req.body, "lost_date", "lost_location");
  if (validation.error) {
    return res.status(400).json({ error: validation.error });
  }

  const {
    lost_date,
    item_name,
    category,
    item_color,
    lost_location,
    description,
    deposit_location,
  } = validation.value;
  
  const student_id = req.body.student_id?.trim() || null;
  const image_url = req.file
    ? `/assets/lostUploads/${req.file.filename}`
    : null;

  try {
    const result = await db.query(
      `INSERT INTO lost_items (student_id, image_url, lost_date, item_name, category, item_color, lost_location, description, deposit_location)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING item_id`,
      [
        student_id,
        image_url,
        lost_date,
        item_name,
        category,
        item_color,
        lost_location,
        description,
        deposit_location,
      ],
    );

    sendLineNotification(
      `แจ้งเตือน: มีผู้รายงานของหายใหม่\nสิ่งของ: ${item_name}\nสถานที่หาย: ${lost_location}`,
    ).catch((notificationError) => {
      console.error("LINE notification failed:", notificationError.message);
    });

    res.status(201).json({ item_id: result.rows[0].item_id });
  } catch (error) {
    console.error("Error inserting lost item:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// เรียกดูข้อมูล Lost Items ทั้งหมดจากฐานข้อมูล
const getLostItems = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM lost_items ORDER BY item_id DESC `,
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error fetching lost items:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
module.exports = { createLostItems, getLostItems };
