"""
Email (Resend) and Slack integration endpoints.
"""
import logging
import httpx
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import User, UserSettings, SavedEmail
from app.auth import get_current_user
from app.config import settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/share", tags=["integrations"])


@router.post("/email")
async def send_email(
    body: dict,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Send summary via email using Resend API."""
    recipients = body.get("recipients", [])
    subject = body.get("subject", "VoiceScribe — Session Summary")
    summary_text = body.get("summary", "")
    session_title = body.get("session_title", "Untitled Session")

    if not recipients:
        raise HTTPException(status_code=400, detail="No recipients provided")
    if not summary_text.strip():
        raise HTTPException(status_code=400, detail="No summary content")

    if not settings.RESEND_API_KEY:
        raise HTTPException(status_code=503, detail="Email service not configured (RESEND_API_KEY missing)")

    # Build HTML email
    html_body = f"""
    <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
        <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #7c3aed; margin: 0;">🎙️ VoiceScribe</h1>
            <p style="color: #6b7280; margin: 4px 0 0;">Real-Time Transcription & AI Summarization</p>
        </div>
        <div style="background: #f9fafb; border-radius: 12px; padding: 20px; border: 1px solid #e5e7eb;">
            <h2 style="color: #1f2937; margin: 0 0 8px;">{session_title}</h2>
            <p style="color: #6b7280; font-size: 0.85em; margin: 0 0 16px;">Shared by {user.name} ({user.email})</p>
            <div style="white-space: pre-wrap; color: #374151; line-height: 1.6; font-size: 0.95em;">
{summary_text}
            </div>
        </div>
        <p style="color: #9ca3af; font-size: 0.8em; text-align: center; margin-top: 20px;">
            Sent via VoiceScribe
        </p>
    </div>
    """

    try:
        async with httpx.AsyncClient() as client:
            res = await client.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {settings.RESEND_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "from": "VoiceScribe <onboarding@resend.dev>",
                    "to": recipients,
                    "subject": subject,
                    "html": html_body,
                },
                timeout=15,
            )
            if res.status_code not in (200, 201):
                logger.error(f"Resend API error: {res.status_code} {res.text}")
                raise HTTPException(status_code=502, detail=f"Email API error: {res.text}")

        logger.info(f"Email sent to {recipients} by user {user.id}")
        return {"status": "sent", "recipients": recipients}
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Email service timeout")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Email send error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/slack")
async def send_slack(
    body: dict,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Post summary to Slack via Incoming Webhook."""
    summary_text = body.get("summary", "")
    session_title = body.get("session_title", "Untitled Session")
    webhook_url = body.get("webhook_url", "")

    # If no webhook provided in request, check user settings
    if not webhook_url:
        result = await db.execute(
            select(UserSettings).where(UserSettings.user_id == user.id)
        )
        user_settings = result.scalar_one_or_none()
        if user_settings and user_settings.slack_webhook_url:
            webhook_url = user_settings.slack_webhook_url

    if not webhook_url:
        raise HTTPException(status_code=400, detail="No Slack webhook URL configured")
    if not summary_text.strip():
        raise HTTPException(status_code=400, detail="No summary content")

    slack_payload = {
        "blocks": [
            {
                "type": "header",
                "text": {"type": "plain_text", "text": f"🎙️ VoiceScribe — {session_title}", "emoji": True}
            },
            {"type": "divider"},
            {
                "type": "section",
                "text": {"type": "mrkdwn", "text": summary_text[:3000]}
            },
            {"type": "divider"},
            {
                "type": "context",
                "elements": [
                    {"type": "mrkdwn", "text": f"Shared by *{user.name}* ({user.email})"}
                ]
            }
        ]
    }

    try:
        async with httpx.AsyncClient() as client:
            res = await client.post(webhook_url, json=slack_payload, timeout=10)
            if res.status_code != 200:
                logger.error(f"Slack webhook error: {res.status_code} {res.text}")
                raise HTTPException(status_code=502, detail=f"Slack error: {res.text}")

        logger.info(f"Slack message sent by user {user.id}")
        return {"status": "sent"}
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Slack webhook timeout")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Slack send error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ── Saved Emails CRUD ──

@router.get("/emails")
async def get_saved_emails(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(SavedEmail).where(SavedEmail.user_id == user.id)
    )
    emails = result.scalars().all()
    return [{"id": e.id, "email": e.email} for e in emails]


@router.post("/emails")
async def save_email(
    body: dict,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    email = body.get("email", "").strip()
    if not email:
        raise HTTPException(status_code=400, detail="No email provided")

    # Check for duplicate
    existing = await db.execute(
        select(SavedEmail).where(SavedEmail.user_id == user.id, SavedEmail.email == email)
    )
    if existing.scalar_one_or_none():
        return {"status": "already_saved"}

    saved = SavedEmail(user_id=user.id, email=email)
    db.add(saved)
    await db.commit()
    return {"status": "saved", "id": saved.id, "email": email}


@router.delete("/emails/{email_id}")
async def delete_saved_email(
    email_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(SavedEmail).where(SavedEmail.id == email_id, SavedEmail.user_id == user.id)
    )
    saved = result.scalar_one_or_none()
    if not saved:
        raise HTTPException(status_code=404, detail="Email not found")

    await db.delete(saved)
    await db.commit()
    return {"status": "deleted"}


# ── User Integration Settings ──

@router.get("/settings")
async def get_integration_settings(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(UserSettings).where(UserSettings.user_id == user.id)
    )
    s = result.scalar_one_or_none()
    return {"slack_webhook_url": s.slack_webhook_url if s else ""}


@router.put("/settings")
async def update_integration_settings(
    body: dict,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(UserSettings).where(UserSettings.user_id == user.id)
    )
    s = result.scalar_one_or_none()
    if not s:
        s = UserSettings(user_id=user.id)
        db.add(s)

    if "slack_webhook_url" in body:
        s.slack_webhook_url = body["slack_webhook_url"]

    await db.commit()
    return {"status": "updated"}
