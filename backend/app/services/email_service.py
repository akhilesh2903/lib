import os
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
from typing import Optional
from app.database.connection import get_db
from app.utils.helpers import generate_unique_id

logger = logging.getLogger("lms.email")

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM_EMAIL = os.getenv("SMTP_FROM_EMAIL", "library@aster.edu")
SMTP_FROM_NAME = os.getenv("SMTP_FROM_NAME", "Aster Central Library")
SMTP_ENABLED = os.getenv("SMTP_ENABLED", "False").lower() in ("true", "1", "yes")


def send_system_notification(
    recipient_email: str,
    subject: str,
    message: str,
    recipient_id: Optional[str] = None,
    recipient_role: Optional[str] = "student",
    notif_type: str = "system"
) -> bool:
    """
    Saves in-app notification in the database and dispatches SMTP email if configured.
    """
    db = get_db()
    # 1. Save in-app notification
    try:
        db["notifications"].insert_one({
            "notification_id": generate_unique_id("NOTIF"),
            "recipient_id": recipient_id or recipient_email,
            "recipient_email": recipient_email,
            "recipient_role": recipient_role,
            "title": subject,
            "message": message,
            "type": notif_type,
            "is_read": False,
            "created_at": datetime.utcnow().isoformat()
        })
    except Exception as e:
        logger.error(f"Failed to record in-app notification: {e}")

    # 2. Check if SMTP email is enabled
    if not SMTP_ENABLED or not SMTP_USER or not SMTP_PASSWORD:
        logger.info(f"[Mock SMTP Dispatch] To: {recipient_email} | Subject: '{subject}' | Message: {message[:60]}...")
        return True

    # 3. Deliver via SMTP
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"[{SMTP_FROM_NAME}] {subject}"
        msg["From"] = f"{SMTP_FROM_NAME} <{SMTP_FROM_EMAIL}>"
        msg["To"] = recipient_email

        html_content = f"""
        <html>
          <body style="font-family: Arial, sans-serif; color: #1e293b; background-color: #f8fafc; padding: 20px;">
            <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; padding: 24px;">
              <h2 style="color: #059669; margin-top: 0;">Aster Central Library</h2>
              <h3 style="color: #0f172a; margin-bottom: 16px;">{subject}</h3>
              <p style="font-size: 15px; line-height: 1.6;">{message}</p>
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
              <p style="font-size: 12px; color: #64748b;">This is an automated notification from the Aster Library Management System.</p>
            </div>
          </body>
        </html>
        """
        msg.attach(MIMEText(message, "plain"))
        msg.attach(MIMEText(html_content, "html"))

        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(SMTP_FROM_EMAIL, recipient_email, msg.as_string())
        logger.info(f"Email successfully delivered to {recipient_email}")
        return True
    except Exception as e:
        logger.warning(f"SMTP sending failed ({e}), in-app notification remains accessible.")
        return False
